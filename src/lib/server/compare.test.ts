import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getScanJob: vi.fn(), getScanSummary: vi.fn(), listIssueGroups: vi.fn(), listScanPages: vi.fn(), listPriorComparisonScans: vi.fn() }));
vi.mock("@/lib/data/firestore", () => mocks);
import { resolveComparison } from "./compare";
import { buildComparisonProfile } from "../scanner/comparison-profile";
const page = { url: "https://example.com/", title: null, statusCode: 200, scannedAt: new Date(), issues: [], rawMetadata: { engine: "playwright-axe", scannerVersion: "v1", axeVersion: "4.11", playwrightVersion: "1.60", viewports: ["desktop"], renderProfile: "real", userAgent: "test", locale: "en-US" } };
const profile = buildComparisonProfile([page]);
function job(id: string, patch = {}) { return { id, baseUrl: page.url, status: "completed", createdAt: new Date(id === "after" ? 2000 : 1000), completedAt: new Date(3000), comparisonProfile: profile, ...patch }; }
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getScanJob.mockImplementation(async (_ws, id) => job(id));
  mocks.listIssueGroups.mockResolvedValue([]);
  mocks.listScanPages.mockResolvedValue([{ url: page.url }]);
  mocks.getScanSummary.mockResolvedValue(null);
  mocks.listPriorComparisonScans.mockImplementation(async function* () { yield job("before"); });
});
describe("comparison server gate (B03)", () => {
  it("rejects an unfinished new scan", async () => {
    mocks.getScanJob.mockImplementation(async (_ws, id) => job(id, id === "after" ? { status: "running" } : {}));
    expect(await resolveComparison("after", "before", "ws")).toMatchObject({ comparable: false, reasons: ["NEW_SCAN_INCOMPLETE"], verificationStatus: "verification_pending" });
  });
  it("rejects an unfinished old scan", async () => {
    mocks.getScanJob.mockImplementation(async (_ws, id) => job(id, id === "before" ? { status: "running" } : {}));
    expect(await resolveComparison("after", "before", "ws")).toMatchObject({ comparable: false, reasons: ["OLD_SCAN_INCOMPLETE"] });
  });
  it.each([
    ["engineVersions", ["other-engine"], "ENGINE_VERSION_MISMATCH"],
    ["viewportProfile", ["mobile"], "VIEWPORT_MISMATCH"],
    ["scoringVersion", "old", "SCORE_VERSION_MISMATCH"],
    ["fingerprintVersion", 1, "FINGERPRINT_VERSION_MISMATCH"],
    ["scopeHash", "different", "SCOPE_MISMATCH"],
  ])("reports %s mismatch without a verdict", async (field, value, reason) => {
    mocks.getScanJob.mockImplementation(async (_ws, id) => job(id, id === "before" ? { comparisonProfile: { ...profile, [field]: value } } : {}));
    expect(await resolveComparison("after", "before", "ws")).toMatchObject({ comparable: false, reasons: [reason], verificationStatus: "inconclusive" });
  });
  it("finds an equivalent scan beyond 50 newer incompatible records", async () => {
    mocks.listPriorComparisonScans.mockImplementation(async function* () {
      for (let i = 0; i < 65; i++) yield job(`bad-${i}`);
      yield job("before");
    });
    mocks.getScanJob.mockImplementation(async (_ws, id) => job(id, id.startsWith("bad-") ? { comparisonProfile: null } : {}));
    expect(await resolveComparison("after", null, "ws")).toMatchObject({ comparable: true, before: { id: "before" } });
  });
  it("does not assign today's fingerprint version to legacy empty scans", async () => {
    mocks.getScanJob.mockImplementation(async (_ws, id) => job(id, { comparisonProfile: null }));
    expect(await resolveComparison("after", "before", "ws")).toMatchObject({ comparable: false, reasons: ["PROFILE_MISSING"] });
  });
});

it("marks a finding reopened only with a completed equivalent third scan", async () => {
  const group = { rootCauseKey: "button", ruleId: "button-name", title: "Name", severity: "critical", affectedCount: 1, primaryWcagTag: null, priority: 1, elementKeys: ["#button"] };
  mocks.getScanJob.mockImplementation(async (_ws, id) => job(id, id === "earlier" ? { createdAt: new Date(0) } : {}));
  mocks.listIssueGroups.mockImplementation(async (_ws, id) => id === "before" ? [] : [group]);
  mocks.listPriorComparisonScans.mockImplementation(async function* () { yield job("earlier", { createdAt: new Date(0) }); });
  const result = await resolveComparison("after", "before", "ws");
  expect(result).toMatchObject({ comparable: true, comparison: { newIssues: [{ verificationStatus: "reopened" }] } });
});
