import { createHmac } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { analyticsEnabled, analyticsRetentionDays } from "@/lib/config";
import { firebaseAdminConfigured, firestore } from "@/lib/firebase/admin";
import type { AnalyticsEvent } from "@/lib/analytics/events";

interface AnalyticsContext {
  anonymousId?: string | null;
  userId?: string | null;
  workspaceId?: string | null;
  source: "client" | "server" | "worker" | "webhook";
}

function pseudonym(value: string | null | undefined): string | null {
  if (!value) return null;
  const secret = process.env.ANALYTICS_ID_SALT
    || (process.env.NODE_ENV === "production" ? null : "percevia-local-analytics");
  // Keep aggregate events operational without ever storing a weakly hashed
  // identifier when a production deployment has not supplied its salt yet.
  if (!secret) return null;
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 32);
}

function eventDocument(event: AnalyticsEvent, context: AnalyticsContext) {
  const createdAt = new Date();
  const expireAt = new Date(
    createdAt.getTime() + analyticsRetentionDays() * 24 * 60 * 60 * 1_000
  );
  return {
    schemaVersion: 1,
    event: event.event,
    properties: event.properties,
    source: context.source,
    anonymousId: pseudonym(context.anonymousId),
    userId: pseudonym(context.userId),
    workspaceId: pseudonym(context.workspaceId),
    createdAt: Timestamp.fromDate(createdAt),
    expireAt: Timestamp.fromDate(expireAt),
  };
}

/** Best-effort by design: analytics can never fail a product action. */
export async function recordAnalyticsEvent(
  event: AnalyticsEvent,
  context: AnalyticsContext
): Promise<void> {
  if (!analyticsEnabled() || !firebaseAdminConfigured()) return;
  try {
    await firestore().collection("analyticsEvents").add(eventDocument(event, context));
  } catch (error) {
    console.error("[analytics] event write failed", {
      event: event.event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recordFirstScanCompleted(input: {
  workspaceId: string;
  userId?: string | null;
  pagesScanned: number;
}): Promise<void> {
  if (!analyticsEnabled() || !firebaseAdminConfigured()) return;
  try {
    const db = firestore();
    const workspaceRef = db.collection("workspaces").doc(input.workspaceId);
    await db.runTransaction(async (transaction) => {
      const workspace = await transaction.get(workspaceRef);
      if (workspace.get("analyticsMilestones.firstScanCompletedAt")) return;
      const event: AnalyticsEvent = {
        event: "first_scan_completed",
        properties: {
          pagesBucket: input.pagesScanned === 1 ? "1" : input.pagesScanned <= 10 ? "2-10" : "11+",
        },
      };
      const eventRef = db.collection("analyticsEvents").doc();
      transaction.set(eventRef, eventDocument(event, {
        source: "worker",
        workspaceId: input.workspaceId,
        userId: input.userId,
      }));
      transaction.set(workspaceRef, {
        analyticsMilestones: { firstScanCompletedAt: Timestamp.now() },
      }, { merge: true });
    });
  } catch (error) {
    console.error("[analytics] first scan milestone failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
