import {
  getLatestWorkerHeartbeat,
  isWorkerHeartbeatFresh,
} from "@/lib/data/worker-health";
import { scanDispatchMode } from "./dispatch";

/**
 * Legacy poll mode has no durable worker wake-up. When its heartbeat is stale
 * (or cannot be read), use the bounded serverless static scanner so a scan
 * cannot remain queued forever. Cloud Tasks mode has its own durable delivery
 * and recovery path and must never take this fallback pre-emptively.
 */
export async function scanNeedsInlineFallback(): Promise<boolean> {
  if (scanDispatchMode() !== "poll") return false;
  try {
    return !isWorkerHeartbeatFresh(await getLatestWorkerHeartbeat());
  } catch {
    return true;
  }
}
