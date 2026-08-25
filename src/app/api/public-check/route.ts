import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, rateLimitError } from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { publicCheckEnabled } from "@/lib/config";
import {
  PublicCheckUnavailable,
  runPublicCheck,
} from "@/lib/scanner/public-check";
import {
  UrlValidationFailed,
  validateUrl,
} from "@/lib/scanner/url-validation";

const MAX_REQUEST_BYTES = 4_096;

const PublicCheckSchema = z
  .object({
    url: z.string().trim().url().max(2_048),
  })
  .strict();

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(req: NextRequest) {
  try {
    if (!publicCheckEnabled()) {
      throw new ApiError(404, "not_found", "Not found.");
    }
    rejectOversizedBody(req);

    const rateLimit = await checkRateLimit(
      "publicCheck",
      anonymousVisitorKey(req.headers),
      { failureMode: "closed" }
    );
    if (!rateLimit.ok) {
      if (rateLimit.reason === "backend_unavailable") {
        throw new ApiError(
          503,
          "public_check_temporarily_unavailable",
          "The instant checker is temporarily unavailable. Please try again shortly."
        );
      }
      throw rateLimitError(
        rateLimit.reset,
        rateLimit.remaining,
        "You have reached the instant-check limit. Sign in for a full scan or try again later."
      );
    }

    const body = await readBoundedJson(req);
    const parsed = PublicCheckSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_input",
        "Enter a complete public URL, including https://."
      );
    }

    // Fast string/IP validation gives the user a useful 400. The scanner then
    // repeats validation with DNS resolution before every outbound fetch.
    await validateUrl(parsed.data.url, { resolveDns: false });
    const result = await runPublicCheck(parsed.data.url);

    return Response.json(result, {
      headers: {
        "cache-control": "no-store",
        "x-rate-limit-remaining": String(rateLimit.remaining),
        "x-rate-limit-reset": String(Math.ceil(rateLimit.reset / 1_000)),
      },
    });
  } catch (err) {
    const response = publicCheckError(err);
    response.headers.set("cache-control", "no-store");
    return response;
  }
}

function rejectOversizedBody(req: NextRequest): void {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) {
    throw new ApiError(413, "payload_too_large", "The request is too large.");
  }
}

async function readBoundedJson(req: NextRequest): Promise<unknown> {
  if (!req.body) return {};

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "payload_too_large", "The request is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Store only a short-lived pseudonymous counter key, never the raw address. */
function anonymousVisitorKey(headers: Headers): string {
  const forwarded =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "address-unavailable";
  const userAgent = headers.get("user-agent")?.slice(0, 256) ?? "agent-unavailable";
  return createHash("sha256")
    .update(`${forwarded}\n${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

function publicCheckError(err: unknown): Response {
  if (err instanceof UrlValidationFailed) {
    return Response.json(
      {
        error: err.code,
        message: "That address cannot be scanned. Use a public http or https URL.",
      },
      { status: 400 }
    );
  }
  if (err instanceof PublicCheckUnavailable) {
    return Response.json(
      {
        error: err.code,
        message:
          "We could not analyze that page's initial HTML. It may block automated requests or require JavaScript.",
      },
      { status: 422 }
    );
  }
  return apiError(err);
}
