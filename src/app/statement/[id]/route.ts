import { NextRequest } from "next/server";
import { getPrivacySettings, getWorkspace, listScans } from "@/lib/data/firestore";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeContactHref(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;

  if (normalized.includes("@") && !normalized.includes(":")) {
    return `mailto:${normalized}`;
  }

  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

const NOT_FOUND = new Response(
  "<!DOCTYPE html><html><head><title>Not Found — Percevia AI</title><meta name='viewport' content='width=device-width, initial-scale=1'><style>body{font-family:sans-serif;background:#F7F8FB;color:#0E1422;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}div{text-align:center;padding:24px;border:1px solid #E4E8F0;border-radius:10px;background:#FFF;box-shadow:0 4px 6px rgba(0,0,0,0.02)}h1{font-size:24px;margin-top:0}p{color:#4B5570;font-size:14px}</style></head><body><div><h1>Statement Not Found</h1><p>The accessibility statement for this workspace does not exist or has not been published.</p></div></body></html>",
  {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  }
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NOT_FOUND.clone();

    const [workspace, privacy, scans] = await Promise.all([
      getWorkspace(id),
      getPrivacySettings(id),
      listScans(id, 10),
    ]);

    if (!workspace || !privacy || !privacy.statementPublished) {
      return NOT_FOUND.clone();
    }

    const latestScan = scans.find((s) => s.status === "completed") ?? null;
    const formattedDate = latestScan?.completedAt
      ? new Date(latestScan.completedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";

    const scoreText = latestScan
      ? `${latestScan.pagesScanned} pages scanned, overall quality metrics met.`
      : "No automated scans completed yet.";

    const companyName = escapeHtml(workspace.companyName || workspace.name);
    const targetStandard = escapeHtml(
      workspace.targetStandard.replace(/_/g, " ").toUpperCase()
    );
    const limitText = escapeHtml(
      privacy.statementLimitations?.trim() ||
        "No accessibility limitations are currently reported."
    );
    const contactValue = privacy.statementContactEmail?.trim() || "";
    const contactHref = safeContactHref(contactValue);
    const contactText = contactHref
      ? `<p>If you encounter accessibility barriers, please contact us at: <strong><a href="${escapeHtml(
          contactHref
        )}" style="color:#3563E6;text-decoration:none;">${escapeHtml(
          contactValue
        )}</a></strong></p>`
      : "<p style='color:#C28A2E;'>No contact email or feedback link has been configured yet.</p>";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Accessibility Statement — ${companyName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #F7F8FB;
      color: #0E1422;
      line-height: 1.6;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 680px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E4E8F0;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-top: 0;
      border-bottom: 2px solid #E4E8F0;
      padding-bottom: 12px;
      color: #0B1220;
    }
    h2 {
      font-size: 18px;
      font-weight: 600;
      margin-top: 30px;
      margin-bottom: 10px;
      color: #0B1220;
    }
    p, li {
      font-size: 15px;
      color: #2A3247;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #EFF2F8;
      color: #4B5570;
      padding: 4px 8px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #3FA67A;
    }
    .footer {
      border-top: 1px solid #E4E8F0;
      margin-top: 40px;
      padding-top: 20px;
      font-size: 12px;
      color: #6B7590;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer a {
      color: #3563E6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <main class="container">
    <div class="badge">
      <span class="badge-dot"></span> Verified Audit
    </div>
    <h1>Accessibility Statement</h1>
    <p>
      <strong>${companyName}</strong> is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.
    </p>

    <h2>Conformance Status</h2>
    <p>
      This website is <strong>partially conformant</strong> with the <strong>${targetStandard}</strong> accessibility guidelines. Conformance was evaluated using automated accessibility scans and manual auditing workflows.
    </p>

    <h2>Audit &amp; Scan Summary</h2>
    <ul>
      <li><strong>Latest Scan Date:</strong> ${formattedDate}</li>
      <li><strong>Scan Context:</strong> ${scoreText}</li>
      <li><strong>Audit Engine:</strong> Percevia-Statement-V1</li>
    </ul>

    <h2>Technical Limitations</h2>
    <p style="white-space: pre-wrap;">${limitText}</p>

    <h2>Feedback &amp; Assistance</h2>
    ${contactText}

    <footer class="footer">
      <span>Verified by <a href="https://percevia-chi.vercel.app" target="_blank">Percevia AI</a></span>
      <span>&copy; ${new Date().getFullYear()}</span>
    </footer>
  </main>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "private, no-store",
        "content-security-policy":
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
