/**
 * Shared API request context. Every protected route handler calls
 * `requireSession()` first to:
 *   1. Ensure the user is signed in.
 *   2. Resolve the active workspace id.
 *   3. Verify the user is an active member of that workspace.
 *
 * Returns a typed context object or throws an ApiError that the route
 * handler converts into a JSON response.
 */
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { captureException } from "@/lib/observability";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    /** Extra response headers — e.g. Retry-After on a 429. */
    public readonly headers?: Record<string, string>
  ) {
    super(message ?? code);
    this.name = "ApiError";
  }
}

/**
 * Build an ApiError for a rate-limit rejection, with standard
 * Retry-After / X-RateLimit-* headers derived from the limiter result.
 */
export function rateLimitError(
  reset: number,
  remaining = 0,
  message = "Too many requests. Please slow down."
): ApiError {
  const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new ApiError(429, "rate_limited", message, {
    "Retry-After": String(retryAfterSec),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
  });
}

export interface ApiContext {
  userId: string;
  workspaceId: string;
  role: string;
}

export async function requireSession(): Promise<ApiContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, "unauthorized");
  }
  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    throw new ApiError(403, "no_workspace", "User has no workspace yet");
  }

  const [member] = await db
    .select({ role: workspaceMembers.role, status: workspaceMembers.status })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, session.user.id),
        eq(workspaceMembers.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!member || member.status !== "active") {
    throw new ApiError(403, "not_a_member");
  }

  return {
    userId: session.user.id,
    workspaceId,
    role: member.role,
  };
}

export function apiError(err: unknown): Response {
  if (err instanceof ApiError) {
    // Expected, handled errors (4xx) are not reported to Sentry —
    // they're normal control flow, not incidents.
    return Response.json(
      { error: err.code, message: err.message },
      { status: err.status, headers: err.headers }
    );
  }
  // Unexpected — log + ship to Sentry (fire-and-forget).
  void captureException(err, { scope: "api" });
  return Response.json({ error: "internal" }, { status: 500 });
}
