import { describe, expect, it } from "vitest";
import {
  ResponseTooLargeError,
  checkContentLength,
  readBoundedText,
} from "./fetch-bounded";

function streamedResponse(chunks: string[], headers?: Record<string, string>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { headers });
}

describe("readBoundedText", () => {
  it("resolves small bodies intact", async () => {
    const res = streamedResponse(["<html>", "<body>hi</body></html>"]);
    await expect(readBoundedText(res, 1_000)).resolves.toBe("<html><body>hi</body></html>");
  });

  it("aborts once the decoded budget is exceeded", async () => {
    const res = streamedResponse(["a".repeat(600), "b".repeat(600)]);
    await expect(readBoundedText(res, 1_000)).rejects.toBeInstanceOf(ResponseTooLargeError);
  });

  it("reassembles multi-byte characters split across chunks", async () => {
    const encoder = new TextEncoder();
    const full = encoder.encode("héllo wörld");
    const mid = Math.floor(full.length / 2);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(full.slice(0, mid));
        controller.enqueue(full.slice(mid));
        controller.close();
      },
    });
    const text = await readBoundedText(new Response(stream), 1_000);
    expect(text).toBe("héllo wörld");
  });

  it("falls back to a single read when no stream exists", async () => {
    const res = { body: null, text: async () => "tiny", headers: new Headers() } as unknown as Response;
    await expect(readBoundedText(res, 1_000)).resolves.toBe("tiny");
  });
});

describe("checkContentLength", () => {
  it("rejects upfront when Content-Length exceeds the budget", () => {
    const res = new Response("x", { headers: { "content-length": "5000" } });
    expect(() => checkContentLength(res, 1_000)).toThrow(ResponseTooLargeError);
  });

  it("passes when length fits or is absent", () => {
    expect(() =>
      checkContentLength(new Response("x", { headers: { "content-length": "10" } }), 1_000)
    ).not.toThrow();
    expect(() => checkContentLength(new Response("x"), 1_000)).not.toThrow();
  });
});
