import { beforeEach, describe, expect, it, vi } from "vitest";

const { fullLaunchMock, coreLaunchMock, executablePathMock } = vi.hoisted(() => ({
  fullLaunchMock: vi.fn(),
  coreLaunchMock: vi.fn(),
  executablePathMock: vi.fn(),
}));

vi.mock("playwright", () => ({
  chromium: { launch: fullLaunchMock },
}));

vi.mock("playwright-core", () => ({
  chromium: { launch: coreLaunchMock },
}));

vi.mock("@sparticuz/chromium", () => ({
  default: {
    args: ["--no-sandbox", "--disable-gpu"],
    executablePath: executablePathMock,
  },
}));

function fakeBrowser(pdfBytes: Buffer, onPdf?: () => void) {
  const page = {
    setContent: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockImplementation(async () => {
      onPdf?.();
      return pdfBytes;
    }),
  };
  return { newPage: vi.fn().mockResolvedValue(page), close: vi.fn().mockResolvedValue(undefined), page };
}

import { renderPdfFromHtml } from "./pdf";

const HTML = "<!doctype html><html><body><p>hi</p></body></html>";

beforeEach(() => {
  fullLaunchMock.mockReset();
  coreLaunchMock.mockReset();
  executablePathMock.mockReset().mockResolvedValue("/tmp/chromium");
});

describe("renderPdfFromHtml", () => {
  it("uses full Playwright Chromium when it launches", async () => {
    const browser = fakeBrowser(Buffer.from("%PDF-full"));
    fullLaunchMock.mockResolvedValue(browser);

    const pdf = await renderPdfFromHtml(HTML);

    expect(pdf.toString()).toBe("%PDF-full");
    expect(fullLaunchMock).toHaveBeenCalledWith({ args: ["--no-sandbox"] });
    expect(browser.page.setContent).toHaveBeenCalledWith(HTML, { waitUntil: "networkidle" });
    expect(browser.close).toHaveBeenCalled();
    expect(coreLaunchMock).not.toHaveBeenCalled();
  });

  it("falls back to serverless Chromium when the full build is unavailable", async () => {
    fullLaunchMock.mockRejectedValue(new Error("Executable doesn't exist"));
    const browser = fakeBrowser(Buffer.from("%PDF-serverless"));
    coreLaunchMock.mockResolvedValue(browser);

    const pdf = await renderPdfFromHtml(HTML);

    expect(pdf.toString()).toBe("%PDF-serverless");
    expect(coreLaunchMock).toHaveBeenCalledWith({
      args: ["--no-sandbox", "--disable-gpu"],
      executablePath: "/tmp/chromium",
    });
    expect(browser.close).toHaveBeenCalled();
  });

  it("throws a combined error when both engines fail", async () => {
    fullLaunchMock.mockRejectedValue(new Error("no full browser"));
    coreLaunchMock.mockRejectedValue(new Error("no serverless browser"));

    await expect(renderPdfFromHtml(HTML)).rejects.toThrow(
      /full Chromium: no full browser.*serverless Chromium: no serverless browser/
    );
  });
});
