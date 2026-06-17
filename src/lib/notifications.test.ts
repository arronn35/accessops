import { describe, expect, it } from "vitest";
import { countUnread, toUiNotification } from "./notifications";
import type { AuditLog } from "./data/types";

function log(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: "log-1",
    userId: "user-1",
    workspaceId: "ws-1",
    action: "scan.created",
    resourceType: "scan",
    resourceId: "scan-1",
    metadataJson: undefined,
    createdAt: new Date("2026-06-11T10:00:00.000Z"),
    ...overrides,
  };
}

describe("toUiNotification", () => {
  it("maps known actions to friendly titles and hrefs", () => {
    const n = toUiNotification(log());
    expect(n.title).toBe("Scan started");
    expect(n.href).toBe("/app/scans/scan-1");
    expect(n.createdAt).toBe("2026-06-11T10:00:00.000Z");
  });

  it("humanizes unknown actions instead of leaking raw keys", () => {
    const n = toUiNotification(log({ action: "billing.invoice_paid" }));
    expect(n.title).toBe("Billing invoice paid");
  });

  it("routes privacy actions to the compliance center", () => {
    const n = toUiNotification(log({ action: "privacy.all_scans_deleted", resourceType: "workspace" }));
    expect(n.href).toBe("/app/compliance");
    expect(n.body).toMatch(/verified/i);
  });

  it("describes status changes in the body", () => {
    const n = toUiNotification(
      log({ action: "issue.updated", metadataJson: { status: "false_positive" } })
    );
    expect(n.body).toBe("Status changed to false positive.");
  });

  it("deleted scans never link to the missing scan page", () => {
    const n = toUiNotification(log({ action: "scan.deleted" }));
    expect(n.href).toBe("/app");
  });
});

describe("countUnread", () => {
  const logs = [
    log({ id: "a", createdAt: new Date("2026-06-11T10:00:00Z") }),
    log({ id: "b", createdAt: new Date("2026-06-11T09:00:00Z") }),
    log({ id: "c", createdAt: new Date("2026-06-11T08:00:00Z") }),
  ];

  it("treats everything as unread for first-time viewers", () => {
    expect(countUnread(logs, null)).toBe(3);
  });

  it("counts only entries newer than the last-seen cutoff", () => {
    expect(countUnread(logs, new Date("2026-06-11T09:30:00Z"))).toBe(1);
    expect(countUnread(logs, new Date("2026-06-11T11:00:00Z"))).toBe(0);
  });
});
