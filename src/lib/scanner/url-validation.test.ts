import { describe, it, expect } from "vitest";
import { isBlockedIp, validateUrl, UrlValidationFailed } from "./url-validation";

describe("isBlockedIp", () => {
  const blocked = [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.5",
    "192.168.1.1",
    "169.254.169.254", // AWS/GCP/Azure metadata
    "100.64.0.1", // CGNAT shared
    "0.0.0.0",
    "255.255.255.255",
    "224.0.0.1", // multicast
    "::1",
    "fe80::1",
    "fd00::1", // ULA
    "ff02::1", // multicast
    "::ffff:127.0.0.1", // IPv4-mapped
  ];
  const allowed = ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2001:4860:4860::8888"];

  for (const ip of blocked) {
    it(`blocks ${ip}`, () => {
      expect(isBlockedIp(ip)).toBe(true);
    });
  }
  for (const ip of allowed) {
    it(`allows ${ip}`, () => {
      expect(isBlockedIp(ip)).toBe(false);
    });
  }

  it("blocks garbage strings", () => {
    expect(isBlockedIp("notanip")).toBe(true);
    expect(isBlockedIp("256.256.256.256")).toBe(true);
  });
});

describe("validateUrl (no DNS)", () => {
  it("accepts a simple https URL", async () => {
    const v = await validateUrl("https://example.com/foo");
    expect(v.host).toBe("example.com");
    expect(v.origin).toBe("https://example.com");
  });

  it("rejects ftp://", async () => {
    await expect(validateUrl("ftp://example.com")).rejects.toMatchObject({
      code: "scheme_blocked",
    });
  });

  it("rejects file://", async () => {
    await expect(validateUrl("file:///etc/passwd")).rejects.toMatchObject({
      code: "scheme_blocked",
    });
  });

  it("rejects javascript:", async () => {
    await expect(validateUrl("javascript:alert(1)")).rejects.toMatchObject({
      code: "scheme_blocked",
    });
  });

  it("rejects localhost", async () => {
    await expect(validateUrl("http://localhost/admin")).rejects.toMatchObject({
      code: "reserved_tld",
    });
  });

  it("rejects loopback IP literal", async () => {
    await expect(validateUrl("http://127.0.0.1/")).rejects.toMatchObject({
      code: "private_ip",
    });
  });

  it("rejects metadata IP early (no DNS)", async () => {
    await expect(validateUrl("http://169.254.169.254/latest/meta-data")).rejects.toMatchObject({
      code: "metadata_address",
    });
  });

  it("rejects RFC1918 IP literal", async () => {
    await expect(validateUrl("http://10.0.0.1/")).rejects.toMatchObject({
      code: "private_ip",
    });
  });

  it("rejects oversized URLs", async () => {
    const huge = "https://example.com/" + "a".repeat(3000);
    await expect(validateUrl(huge)).rejects.toMatchObject({ code: "url_too_long" });
  });

  it("rejects empty input", async () => {
    await expect(validateUrl("")).rejects.toMatchObject({ code: "invalid_url" });
  });

  it("strips credentials from the URL", async () => {
    const v = await validateUrl("https://user:pass@example.com/x");
    expect(v.normalized).toBe("https://example.com/x");
  });

  it("strips fragments", async () => {
    const v = await validateUrl("https://example.com/x#section");
    expect(v.normalized).toBe("https://example.com/x");
  });

  it("rejects example.com when it ends in .example reserved TLD", async () => {
    await expect(validateUrl("https://foo.example/")).rejects.toMatchObject({
      code: "reserved_tld",
    });
  });

  it("throws UrlValidationFailed instance", async () => {
    try {
      await validateUrl("not-a-url");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(UrlValidationFailed);
    }
  });
});
