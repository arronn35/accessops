/**
 * Shared, client-safe mapping from AI API error codes to actionable UI copy.
 *
 * Both AI surfaces (the AI Assistant page and the issue-detail AI panel)
 * render errors through this mapper so users always see the same structured
 * title + message + next action instead of raw provider or network strings.
 *
 * Codes produced by the AI pipeline (`AiRequestError`) and by the API routes
 * (consent gates, rate limits, validation) are all covered here.
 */
import type { AiErrorCode } from "./explain";

export interface AiErrorView {
  title: string;
  message: string;
  /**
   * Suggested next step. "retry" means the same request can be tried again;
   * a link value points the user at the place that unblocks them.
   */
  action?: "retry" | { label: string; href: string };
}

/** API error codes that are not AiRequestError codes but surface in the UI. */
type AiApiErrorCode =
  | AiErrorCode
  | "ai_unavailable"
  | "ai_processing_disabled"
  | "ai_disabled"
  | "ai_disabled_for_scan"
  | "rate_limited"
  | "forbidden"
  | "invalid_input"
  | "not_found"
  | "scan_not_found"
  | "network_error";

export function aiErrorToView(
  code: string,
  retryAfterSeconds?: number
): AiErrorView {
  switch (code as AiApiErrorCode) {
    case "ai_processing_disabled":
    case "ai_disabled":
      return {
        title: "AI processing is disabled",
        message: "Enable AI processing for this workspace, then try again.",
        action: { label: "Open Privacy & Compliance Center", href: "/app/compliance" },
      };
    case "ai_disabled_for_scan":
      return {
        title: "AI was off for this scan",
        message:
          "AI explanations were turned off when this scan was started. Start a new scan with AI explanations enabled to generate fixes for it.",
        action: { label: "Start a new scan", href: "/app/scans/new" },
      };
    case "ai_unavailable":
      return {
        title: "AI is not configured",
        message:
          "AI integration is not configured for this deployment. Contact your workspace administrator.",
      };
    case "ai_timeout":
      return {
        title: "The AI request timed out",
        message: "The model took too long to respond. Try again — shorter requests complete more reliably.",
        action: "retry",
      };
    case "ai_rate_limited":
    case "rate_limited":
      return {
        title: "AI rate limit reached",
        message: retryAfterSeconds
          ? `Too many AI requests recently. You can try again in about ${retryAfterSeconds} seconds.`
          : "Too many AI requests recently. Wait a moment, then try again.",
        action: "retry",
      };
    case "ai_refused":
      return {
        title: "The AI declined this request",
        message:
          "The model could not answer this request as phrased. Rephrase it, or target a specific finding from the scan.",
        action: "retry",
      };
    case "ai_incomplete":
      return {
        title: "The AI answer was cut short",
        message: "The model stopped before finishing the remediation plan. Try again to get the complete answer.",
        action: "retry",
      };
    case "ai_bad_response":
      return {
        title: "The AI answer was not usable",
        message: "The model returned output that could not be turned into a remediation plan. Try again.",
        action: "retry",
      };
    case "ai_provider_error":
      return {
        title: "The AI provider had a problem",
        message: "The model provider returned an error. Try again in a moment.",
        action: "retry",
      };
    case "forbidden":
      return {
        title: "No permission for AI features",
        message: "Your role in this workspace does not allow using AI features. Ask an owner or admin for access.",
      };
    case "not_found":
    case "scan_not_found":
      return {
        title: "Scan not found",
        message: "The selected scan no longer exists. Pick another completed scan and try again.",
      };
    case "network_error":
      return {
        title: "Connection problem",
        message: "The request never reached the server. Check your connection and try again.",
        action: "retry",
      };
    case "invalid_input":
    default:
      return {
        title: "AI request failed",
        message: "The request could not be completed. Review your input and try again.",
        action: "retry",
      };
  }
}

/** HTTP status for each AiRequestError code, used by both AI API routes. */
export function aiRequestErrorStatus(code: AiErrorCode): number {
  switch (code) {
    case "ai_timeout":
      return 504;
    case "ai_rate_limited":
      return 429;
    case "ai_refused":
    case "ai_incomplete":
    case "ai_bad_response":
    case "ai_provider_error":
    default:
      return 502;
  }
}

/**
 * Build the JSON error response for an AiRequestError thrown by the AI
 * pipeline. Keeps the error contract identical across both AI routes:
 * `{ error, message, retryAfterSeconds? }` plus a Retry-After header on 429.
 */
export function aiRequestErrorResponse(err: {
  code: AiErrorCode;
  retryAfterMs?: number;
}): Response {
  const status = aiRequestErrorStatus(err.code);
  const view = aiErrorToView(err.code);
  const body: Record<string, unknown> = { error: err.code, message: view.message };
  if (err.code === "ai_rate_limited" && err.retryAfterMs) {
    const seconds = Math.max(1, Math.ceil(err.retryAfterMs / 1000));
    body.retryAfterSeconds = seconds;
    return Response.json(body, {
      status,
      headers: { "Retry-After": String(seconds) },
    });
  }
  return Response.json(body, { status });
}
