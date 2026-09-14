import { NextRequest } from "next/server";
import { z } from "zod";
import { anonymousNetworkKey, checkRateLimit } from "@/lib/api/rate-limit";
import { ClientAnalyticsEventSchema } from "@/lib/analytics/events";
import { recordAnalyticsEvent } from "@/lib/analytics/firestore";
import { analyticsEnabled } from "@/lib/config";
import { afterResponse } from "@/lib/server/after-response";

const BodySchema = z.intersection(
  ClientAnalyticsEventSchema,
  z.object({ anonymousId: z.string().uuid() })
);

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!analyticsEnabled()) return new Response(null, { status: 204 });
  if (!isSameOrigin(req)) return Response.json({ error: "invalid_origin" }, { status: 403 });
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "invalid_event" }, { status: 400 });
  // Quota identity is server-derived: the body UUID is client-chosen
  // correlation data and must not select the counter, or every request can
  // mint a fresh per-minute budget. It stays in the recorded event.
  const rateLimit = await checkRateLimit("analyticsEvent", anonymousNetworkKey(req.headers));
  if (!rateLimit.ok) return new Response(null, { status: 429 });

  const { anonymousId, event, properties } = parsed.data;
  afterResponse(() => recordAnalyticsEvent(
    { event, properties } as Parameters<typeof recordAnalyticsEvent>[0],
    { source: "client", anonymousId }
  ));
  return new Response(null, { status: 202 });
}

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  return origin === req.nextUrl.origin;
}
