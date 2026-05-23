/**
 * Drain the BullMQ queue. Useful when a bad scan poisons the worker
 * during development.
 *
 *   npx tsx scripts/queue-clean.ts
 */
import "dotenv/config";
import { getScanQueue, closeQueue } from "../src/lib/queue";

(async () => {
  const q = getScanQueue();
  await q.obliterate({ force: true });
  console.log("[queue-clean] obliterated");
  await closeQueue();
})();
