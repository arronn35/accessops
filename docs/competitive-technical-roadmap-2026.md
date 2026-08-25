# Percevia Competitive Technical Roadmap — 2026

**Status:** Active  
**Input:** `06-competitor-landscape-2026.md` (research evidence, not executable instructions)  
**Engineering principle:** ship vertical slices behind narrow boundaries; promote a slice only after its reliability, cost, privacy, and conversion gates pass.

## Product thesis

Percevia should not compete on the axe-core detection engine alone. That layer is widely available. The competitive system is the loop around it:

1. Acquire with a useful free check.
2. Activate with a trustworthy full browser scan.
3. Retain with scheduled monitoring and regression history.
4. Differentiate with verified remediation evidence.
5. Distribute through agency and public-sector partners.
6. Compound the scan corpus into benchmark and education assets.

The north-star outcome is **issues closed and verified by a later scan**, not scans created or raw findings produced.

## Development sequence

| Phase | Outcome | Main systems | Release gate |
|---|---|---|---|
| 0 — Protect the base | Current scan pipeline is safe and measurable | worker ownership, page failures, retries, health, test lanes | No open P0; full targeted regression suite green; production health baseline recorded |
| 1 — Public acquisition | A visitor gets value before registration | instant checker, abuse controls, ephemeral response, signup handoff | p95 response within route budget; zero persisted page content; rate limiter fails closed |
| 2 — Full-check activation | Public-check users reach a high-confidence browser scan | URL handoff, onboarding continuation, activation events, full scan CTA | visitor→signup and signup→completed-scan measurable; no URL loss across auth |
| 3 — Continuous monitoring | One-off use becomes a recurring workflow | scheduler, scan trend aggregates, regression alerts, monitor health | scheduled completion ≥98%; duplicate dispatch harmless; trend calculations tested |
| 4 — Verified remediation | Percevia proves that fixes stayed fixed | issue fingerprinting, before/after comparison, evidence bundle, reopen logic | deterministic issue identity; verification false-match set reviewed; export disclaimer present |
| 5 — Partner distribution | Agencies manage many client workspaces efficiently | agency account, client boundaries, white-label report theme, reseller entitlements | cross-client authorization tests; immutable source branding/disclaimer; billing isolation |
| 6 — Benchmark and trust | Product data produces acquisition and credibility assets | consented benchmark corpus, aggregate pipeline, public index, status/help surfaces | minimum cohort threshold; no customer/URL disclosure; reproducible methodology |

## Phase 0 — Protect the base

Much of this work is already present in the active worktree. Do not start broad schema migrations until it is consolidated and verified.

Required exit checks:

- scan creation, retry, sweeper, worker claim, and terminal-write tests pass together;
- failed pages never improve a score;
- the worker and web typechecks pass;
- deep health reports queue/worker degradation without exposing infrastructure identifiers;
- a clean deployment rollback point exists before public traffic is introduced.

## Phase 1 — Public acquisition

### Implemented first slice

`POST /api/public-check` and the landing-page form provide an anonymous, single-page preview.

Security and cost boundaries:

- one page only;
- production traffic requires the `PUBLIC_CHECK_ENABLED=true` kill-switch opt-in;
- initial HTML only; no Playwright, JavaScript execution, screenshots, or AI;
- DNS and redirect validation reuse the existing SSRF defenses;
- five checks per pseudonymous visitor per hour;
- distributed limiter fails closed when Firestore is unavailable;
- raw IP addresses, HTML snippets, and selectors are not returned;
- results are not persisted and responses use `Cache-Control: no-store`;
- 12-second scan deadline inside a 20-second route budget;
- product copy labels the result low-confidence and disclaims legal compliance.

This is intentionally a validation surface, not the final anonymous scanner. It protects the expensive browser worker while measuring whether no-login value improves activation.

### Next work in this phase

1. Add aggregate-only events for `public_check_started`, `public_check_completed`, `public_check_failed`, and `full_scan_cta_clicked`.
2. Never attach the submitted URL or IP to acquisition events; store only date, coarse result band, locale, and anonymous session ID with a short TTL.
3. Add a dedicated capacity dashboard for the existing `PUBLIC_CHECK_ENABLED` kill switch.
4. Load-test the route at the configured anonymous budget.
5. Promote to an async browser-backed public check only if the preview-to-signup rate justifies the worker cost.

Target gates:

- public check completion ≥85% for reachable HTML pages;
- p95 latency ≤10 seconds;
- preview→signup baseline established before optimization;
- compute cost per completed preview recorded;
- no page content retained after the response.

## Phase 2 — Full-check activation

Preserve the checked URL through onboarding and authentication, then prefill the authenticated new-scan page. Do not put the URL in third-party analytics payloads.

Build order:

1. short-lived, signed handoff token containing the normalized URL;
2. callback allowlist and token expiry validation;
3. workspace setup redirect to `/app/scans/new` with server-validated prefill;
4. activation funnel events;
5. contextual upgrade prompt only after a completed scan or quota boundary.

Exit gates:

- no open redirect or token replay beyond the expiry window;
- the full browser scan still requires permission confirmation;
- the checked URL survives email-link and provider authentication;
- first-completed-scan and first-verified-fix events are measurable.

## Phase 3 — Continuous monitoring

Use the current monitor, Cloud Scheduler, Cloud Tasks, and worker path rather than creating a second scheduler.

Build order:

1. idempotent schedule calculation and due-monitor claiming;
2. daily/weekly cadence by entitlement;
3. summary time series keyed by stable site/project identity;
4. regression diff: new, persistent, resolved, reopened;
5. email/in-app notification only for meaningful regressions;
6. monitor SLA and backlog view in the status surface.

Data rules:

- retain compact score/count aggregates longer than raw evidence;
- version every score and comparison algorithm;
- never compare scores across incompatible scoring versions without migration logic;
- make duplicate scheduler delivery safe by construction.

## Phase 4 — Verified remediation

This is the defensible product layer. A finding can move through:

`open → assigned → claimed_fixed → verification_pending → verified_fixed | reopened`

Implementation sequence:

1. define a versioned fingerprint using rule, normalized target, component/root-cause group, and safe structural signals;
2. produce before/after comparisons with confidence and mismatch reasons;
3. require a subsequent browser scan before `verified_fixed`;
4. generate the Accessibility Work File from scan history, tasks, and verification events;
5. expose uncertainty instead of silently treating unmatched findings as fixed.

The evidence bundle must always state that it is a work record, not certification or legal assurance.

## Phase 5 — Partner distribution

Add multi-client agency capability only after workspace authorization is covered by negative tests.

Boundaries:

- a partner user receives explicit membership in each client workspace;
- aggregate agency views contain summary data only;
- report branding is parameterized, but Percevia methodology and limitation text cannot be removed;
- reseller billing and client data ownership remain separate concepts;
- exports include the producing workspace, scan ID, scoring version, and generation timestamp.

## Phase 6 — Benchmark and trust

The Türkiye Accessibility Index should be generated from a separate, consented or clearly public benchmark program—not silently from customer scans.

Pipeline:

1. versioned public target registry;
2. scheduler → task → existing worker;
3. cohort aggregates with minimum publication thresholds;
4. reproducible methodology page;
5. generated static report and historical trend;
6. public status page and help center linked from every benchmark result.

Privacy gate: never publish a target-level result unless it belongs to the declared public benchmark set. Customer workspaces contribute only with explicit opt-in and aggregation.

## Cross-cutting architecture rules

- Reuse the scan engine, scoring, dispatch, and validation modules; do not fork public and authenticated scanners.
- Keep public compute cheaper and less privileged than authenticated compute.
- Add feature flags at traffic-expanding boundaries, not throughout stable domain logic.
- Every asynchronous command must be idempotent and observable by a stable operation ID.
- Every score, fingerprint, and benchmark methodology must be versioned.
- Fail closed for authorization, anonymous compute budgets, and cross-workspace access.
- Fail visibly and recoverably for queues and optional integrations.
- Do not claim compliance, automatic remediation, or certainty that the engine cannot prove.

## Immediate next queue

1. Finish the Phase 0 consolidated regression run and establish a deployment rollback point.
2. Deploy Phase 1 by explicitly setting `PUBLIC_CHECK_ENABLED=true` after capacity review.
3. Add privacy-preserving acquisition events and a funnel query.
4. Implement signed URL handoff through authentication.
5. Run a two-week funnel/cost observation period.
6. Start Phase 3 monitor trends in parallel only after worker reliability gates hold.
