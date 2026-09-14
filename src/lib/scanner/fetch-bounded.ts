/**
 * Bounded remote-body reader for the scanner.
 *
 * Slicing a fully-buffered string (`(await res.text()).slice(0, N)`) bounds
 * the analyzed output but NOT the allocation: the whole remote body already
 * sits in memory. Every scanner fetch must go through this module so a
 * single oversized response cannot grow the worker past its budget.
 *
 * The budget is counted in decoded bytes as chunks arrive (what the runtime
 * hands the reader after transparent decompression), so a small compressed
 * transfer expanding into a large body trips the same gate. Multi-byte UTF-8
 * sequences split across chunks are reassembled with a streaming decoder and
 * never analyzed partially.
 */

export class ResponseTooLargeError extends Error {
  readonly code = "response_too_large";
  constructor(readonly maxBytes: number) {
    super(`Remote body exceeded the ${maxBytes} byte budget`);
    this.name = "ResponseTooLargeError";
  }
}

/**
 * Fast pre-check: reject without reading when Content-Length already exceeds
 * the budget. Missing/lying headers still hit the streaming gate below.
 */
export function checkContentLength(res: Response, maxBytes: number): void {
  const raw = res.headers?.get("content-length");
  if (raw == null) return;
  const length = Number(raw);
  if (Number.isFinite(length) && length > maxBytes) {
    throw new ResponseTooLargeError(maxBytes);
  }
}

/**
 * Read the whole body, aborting the moment the decoded budget is exceeded.
 * Resolves with the full text when it fits; throws ResponseTooLargeError
 * otherwise. Never resolves with a truncated body — callers must not analyze
 * partial content as if it were complete.
 */
export async function readBoundedText(res: Response, maxBytes: number): Promise<string> {
  checkContentLength(res, maxBytes);
  const reader = res.body?.getReader();
  if (!reader) {
    // No stream (e.g. mocked empty body) — fall back to a single read and
    // enforce the budget on the result.
    const text = await res.text();
    if (text.length > maxBytes) throw new ResponseTooLargeError(maxBytes);
    return text;
  }
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new ResponseTooLargeError(maxBytes);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}
