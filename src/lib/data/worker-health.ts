/**
 * Worker-level liveness, independent of any particular scan job.
 *
 * Each browser-worker process upserts a doc in `workerHeartbeats` on a
 * fixed interval. The deep health check reads only the freshest beat and
 * reports age — never worker ids or counts — so the public readiness JSON
 * stays free of infrastructure details.
 *
 * Docs carry `expireAt` (24h after the last beat) for the same Firestore
 * TTL policy used by `rateLimits`, so dead worker ids don't accumulate.
 */
import { Timestamp } from "firebase-admin/firestore";
import { firestore } from "@/lib/firebase/admin";

/** A beat older than this means no live worker is polling for jobs. */
export const WORKER_HEARTBEAT_FRESH_MS = Math.max(
  30_000,
  Number(process.env.WORKER_HEARTBEAT_FRESH_MS ?? 120_000)
);

const HEARTBEAT_DOC_TTL_MS = 24 * 60 * 60 * 1000;

export function isWorkerHeartbeatFresh(
  lastSeenAt: Date | null,
  at = Date.now()
): boolean {
  if (!lastSeenAt) return false;
  return at - lastSeenAt.getTime() <= WORKER_HEARTBEAT_FRESH_MS;
}

export async function recordWorkerHeartbeat(args: {
  workerId: string;
  inflight: number;
  shuttingDown: boolean;
}): Promise<void> {
  const at = Date.now();
  await firestore()
    .collection("workerHeartbeats")
    .doc(args.workerId)
    .set(
      {
        workerId: args.workerId,
        inflight: args.inflight,
        shuttingDown: args.shuttingDown,
        lastSeenAt: Timestamp.fromMillis(at),
        expireAt: Timestamp.fromMillis(at + HEARTBEAT_DOC_TTL_MS),
      },
      { merge: true }
    );
}

/** Timestamp of the freshest worker beat, or null when none was recorded. */
export async function getLatestWorkerHeartbeat(): Promise<Date | null> {
  const snap = await firestore()
    .collection("workerHeartbeats")
    .orderBy("lastSeenAt", "desc")
    .limit(1)
    .get();
  const value = snap.docs[0]?.get("lastSeenAt") as Timestamp | undefined;
  return value ? value.toDate() : null;
}
