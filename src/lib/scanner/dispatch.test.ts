import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAccessTokenMock } = vi.hoisted(() => ({
  getAccessTokenMock: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  firebaseAdminApp: () => ({
    options: { credential: { getAccessToken: getAccessTokenMock } },
  }),
}));

import { enqueueScanTask, scanDispatchMode } from "./dispatch";

const ORIGINAL_ENV = { ...process.env };
const DISPATCH_ENV_KEYS = [
  "SCAN_DISPATCH_MODE",
  "GCP_PROJECT_ID",
  "FIREBASE_PROJECT_ID",
  "CLOUD_TASKS_LOCATION",
  "CLOUD_TASKS_QUEUE",
  "SCAN_WORKER_URL",
  "INTERNAL_WORKER_SECRET",
  "CLOUD_TASKS_OIDC_SERVICE_ACCOUNT",
] as const;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  for (const key of DISPATCH_ENV_KEYS) delete process.env[key];
  getAccessTokenMock
    .mockReset()
    .mockResolvedValue({ access_token: "tok-123", expires_in: 3600 });
  fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

function configureCloudTasks(overrides: Record<string, string> = {}) {
  Object.assign(process.env, {
    SCAN_DISPATCH_MODE: "cloud-tasks",
    GCP_PROJECT_ID: "proj",
    CLOUD_TASKS_LOCATION: "europe-west1",
    CLOUD_TASKS_QUEUE: "scan-jobs",
    SCAN_WORKER_URL: "https://worker.run.app",
    INTERNAL_WORKER_SECRET: "shh",
    CLOUD_TASKS_OIDC_SERVICE_ACCOUNT: "invoker@proj.iam.gserviceaccount.com",
    ...overrides,
  });
}

describe("scanDispatchMode", () => {
  it("defaults to poll", () => {
    expect(scanDispatchMode()).toBe("poll");
  });

  it("is cloud-tasks only when explicitly set", () => {
    process.env.SCAN_DISPATCH_MODE = "cloud-tasks";
    expect(scanDispatchMode()).toBe("cloud-tasks");
    process.env.SCAN_DISPATCH_MODE = "anything-else";
    expect(scanDispatchMode()).toBe("poll");
  });
});

describe("enqueueScanTask", () => {
  it("no-ops in poll mode without touching the network", async () => {
    const res = await enqueueScanTask({ scanJobId: "s1" });
    expect(res).toEqual({ enqueued: false, reason: "poll_mode" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not_configured when cloud-tasks but required vars are missing", async () => {
    process.env.SCAN_DISPATCH_MODE = "cloud-tasks"; // no queue/url/secret
    const res = await enqueueScanTask({ scanJobId: "s1" });
    expect(res).toEqual({ enqueued: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("enqueues a Cloud Task carrying the worker secret and a bearer token", async () => {
    configureCloudTasks({ SCAN_WORKER_URL: "https://worker.run.app/" });

    const res = await enqueueScanTask({ scanJobId: "s1", reason: "scan_created" });

    expect(res).toEqual({ enqueued: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://cloudtasks.googleapis.com/v2/projects/proj/locations/europe-west1/queues/scan-jobs/tasks"
    );
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer tok-123");

    const body = JSON.parse(init.body as string);
    // Trailing slash on SCAN_WORKER_URL must be trimmed.
    expect(body.task.httpRequest.url).toBe("https://worker.run.app/process");
    expect(body.task.httpRequest.headers["x-internal-worker-secret"]).toBe("shh");
    expect(body.task.httpRequest.oidcToken).toEqual({
      serviceAccountEmail: "invoker@proj.iam.gserviceaccount.com",
      audience: "https://worker.run.app",
    });
    const decoded = JSON.parse(
      Buffer.from(body.task.httpRequest.body, "base64").toString("utf8")
    );
    expect(decoded).toEqual({ scanJobId: "s1", reason: "scan_created" });
  });

  it("falls back to FIREBASE_PROJECT_ID when GCP_PROJECT_ID is unset", async () => {
    configureCloudTasks({ GCP_PROJECT_ID: "", FIREBASE_PROJECT_ID: "fb-proj" });
    delete process.env.GCP_PROJECT_ID;

    await enqueueScanTask({ scanJobId: "s1" });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/projects/fb-proj/");
  });

  it("uses the configured OIDC identity for the private Cloud Run service", async () => {
    configureCloudTasks({ CLOUD_TASKS_OIDC_SERVICE_ACCOUNT: "sa@proj.iam.gserviceaccount.com" });

    await enqueueScanTask({ scanJobId: "s1" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.task.httpRequest.oidcToken).toEqual({
      serviceAccountEmail: "sa@proj.iam.gserviceaccount.com",
      audience: "https://worker.run.app",
    });
  });

  it("throws on a non-2xx Cloud Tasks response", async () => {
    configureCloudTasks();
    fetchMock.mockResolvedValueOnce(new Response("denied", { status: 403 }));

    await expect(enqueueScanTask({ scanJobId: "s1" })).rejects.toThrow(
      /cloud_tasks_enqueue_failed_403/
    );
  });
});
