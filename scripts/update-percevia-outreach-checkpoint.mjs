import { readFile, rename, writeFile } from "node:fs/promises";

const checkpointPath = new URL("../reports/percevia-outreach-send-checkpoint.json", import.meta.url);
const temporaryPath = new URL("../reports/percevia-outreach-send-checkpoint.json.tmp", import.meta.url);
const queuedIndex = Number(process.argv[2]);

if (!Number.isInteger(queuedIndex) || queuedIndex < 0 || queuedIndex >= 900) {
  throw new Error("Expected a queued row index between 0 and 899.");
}

const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8"));
const queued = new Set(checkpoint.queued_row_indices ?? []);
queued.add(queuedIndex);

let nextIndex = checkpoint.next_csv_row_index;
while (nextIndex < checkpoint.total_contacts && queued.has(nextIndex)) {
  queued.delete(nextIndex);
  nextIndex += 1;
}

checkpoint.next_csv_row_index = nextIndex;
checkpoint.queued_row_indices = [...queued].sort((left, right) => left - right);
checkpoint.queued_or_sent = nextIndex + checkpoint.queued_row_indices.length;
checkpoint.remaining = checkpoint.total_contacts - checkpoint.queued_or_sent;
checkpoint.last_error = null;
checkpoint.updated_at = new Date().toISOString();

await writeFile(temporaryPath, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
await rename(temporaryPath, checkpointPath);
