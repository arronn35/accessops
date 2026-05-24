# Visual Evidence

AccessOps AI can attach issue-level screenshots to accessibility findings so authorized workspace members can see where a problem appears on a page.

Visual evidence is diagnostic only and may contain third-party copyrighted or personal data. Do not redistribute publicly.

## Legal And Privacy Assumptions

- Scans are for websites the user owns or is authorized to audit.
- Visual evidence is off by default at the scan level and workspace level.
- The scan form requires authorization confirmation before a scan starts.
- Authenticated/private-page scanning is out of scope for this flow.
- Do not scan pages containing personal, confidential, financial, medical, or highly sensitive information unless explicit authorization exists.
- Screenshots must never be used for marketing, public examples, benchmarks, or public galleries.

## Capture Behavior

- The Playwright scanner uses axe target selectors to find affected elements.
- It scrolls the element into view and tries an element-level screenshot.
- If element capture is not practical, it captures a small clipped viewport region around the element.
- Full-page screenshots are not captured by default.
- A visible bounding box is drawn around the affected region.
- Individual screenshot failures are recorded on visual evidence metadata and do not fail the scan.
- Sensitive page heuristics skip payment, checkout, account, dashboard, admin, login, medical, banking, and similar pages.

## Redaction

Redaction is best-effort and DOM-based, not OCR. The scanner masks:

- Inputs, textareas, selects, password fields, and contenteditable regions.
- Payment-like form fields.
- Email-like, phone-like, and payment-card-like text.
- Likely personal or user-generated content containers.

When masks are applied, evidence status is `redacted`.

## Storage And Access

- Screenshots are stored only as private objects.
- Database rows store object keys and metadata, never base64 image data.
- Images are served through authenticated API routes after workspace membership checks.
- Raw bucket URLs are not exposed for visual evidence, even when `S3_PUBLIC_URL` exists.
- In development, if object storage is not configured, screenshots can be written under `.accessops/visual-evidence/`.
- In production, screenshot storage requires private S3/R2 configuration and `VISUAL_EVIDENCE_STORAGE_ENABLED=true`.

## Retention And Deletion

- Default retention is 30 days.
- Workspace admins can disable visual evidence capture.
- Owners/admins can delete visual evidence for an issue.
- The retention cron deletes expired evidence objects and marks rows deleted.
- Deleting scan data also deletes related evidence objects.

## Environment Variables

```sh
VISUAL_EVIDENCE_ENABLED=false
VISUAL_EVIDENCE_MAX_PER_SCAN=10
VISUAL_EVIDENCE_RETENTION_DAYS=30
VISUAL_EVIDENCE_STORAGE_ENABLED=false
VISUAL_EVIDENCE_REDACTION_ENABLED=true
```

Object storage uses the existing private S3/R2 variables:

```sh
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION=auto
```

## Local Verification

1. Set `VISUAL_EVIDENCE_ENABLED=true`, `VISUAL_EVIDENCE_STORAGE_ENABLED=true`, and leave S3 unset for local file storage.
2. Enable visual evidence and screenshot storage in the Privacy & Compliance Center.
3. Start a scan from `/app/scans/new` and enable “Capture visual evidence screenshots”.
4. Open an issue detail page and confirm the image loads from `/api/visual-evidence/:id/image`.
5. Confirm direct filesystem or bucket paths are not shown in the UI.
6. Sign out or use a different workspace member and confirm the image route does not return the object.

## Known Limitations

- Redaction is best effort and cannot guarantee removal of all personal data.
- Text inside raster images is not OCR-redacted.
- Cross-origin iframe elements may be skipped because their selectors are not safely addressable from the top page.
- Visual evidence is intended for public website pages until a separate authenticated/private-page scanning flow exists.
