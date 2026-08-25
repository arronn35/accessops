# Percevia AI — Derin Mühendislik Denetimi (Bug / Dayanıklılık / Güvenlik / Teknik Borç)

**Denetim tarihi:** 2026-07-27
**Kapsam:** `/Users/efearronn/Desktop/dev/accessops` — `src/app/api/**` (40 route), `src/lib/**`, `worker/**`, `firestore.rules`, `firestore.indexes.json`, `.github/workflows/**`, `vercel.json`
**Yöntem:** Statik kod okuma (Read/Grep/Glob). `npm run typecheck` ve `npm test` **çalıştırılamadı** — repo iCloud senkronize `~/Desktop` altında olduğu için sandbox shell'i her dosya okumasında `Resource deadlock avoided` veriyor (bu, `docs/audit-2026-06-11.md` bulgu #4'ün hâlâ geçerli olduğunun doğrudan kanıtı). Tüm bulgular kaynak koddan, satır numarasıyla türetildi.

---

## 1. Yönetici Özeti

Sistem, bir V1 SaaS için beklenenin **oldukça üzerinde** mühendislik olgunluğu gösteriyor: saf fonksiyon + transaction ayrımıyla yazılmış watchdog/sweeper, deterministik pageJob id'leriyle idempotent yeniden yazma, gerçek SSRF katmanı, Firestore tabanlı paylaşımlı rate limit, sıkı Firestore kuralları ve olağanüstü kalitede runbook dokümantasyonu. `docs/audit-2026-06-11.md`'deki 10 bulgunun 9'unun gerçekten kapatıldığını kodda doğruladım.

Buna karşılık **7 adet P0/P1 sınıfı hata** var ve bunların ortak teması şu: *durum makinesi kağıt üzerinde doğru, ama terminal duruma yazan kod yolları durumu tekrar kontrol etmiyor.* Sweeper her yazımı transaction içinde yeniden doğruluyor; ancak worker'ın "tamamlandı"/"başarısız" yazımları koşulsuz `merge` yazımı. Bu, "requeue edilmiş bir scan'in eski worker tarafından diriltilmesi" ve "kota çift sayımı" gibi somut yarış durumları üretiyor.

En kritik 5 risk:

1. **P0 — `/statement/{workspaceId}` sayfasında stored XSS.** Workspace sahibinin girdiği `statementLimitations`, `companyName` ve `statementContactEmail` hiçbir kaçış olmadan HTML'e basılıyor; `href` içine `javascript:` şeması da geçebiliyor. Ücretsiz hesapla ürünün kendi origin'inde XSS barındırılabilir. Mevcut test bu davranışı *doğru kabul ederek* kilitliyor.
2. **P1 — Ödeme atlatma.** `POLAR_ACCESS_TOKEN` set değilse `POST /api/plan/select` ile herhangi bir kullanıcı kendini `enterprise` yapabiliyor. `docs/production-readiness.md` "Billing remains disabled; plan selection is an entitlement switch" diyor — yani bu bugün canlı davranış olabilir.
3. **P1 — Kota atlatma + yetki boşluğu.** `POST /api/scans/{id}/retry` ne `create_scans` iznini ne de `reserveScanQuota`'yı çağırıyor. Sınırsız ücretsiz tarama; ayrıca `client_viewer` rolü tarama tetikleyebiliyor.
4. **P1 — PageJob açlığı (starvation) + sıcak döngü.** Bir scan `scan_deadline_exceeded` ile başarısız olduğunda alt `pageJobs` sonsuza dek `queued` kalıyor. FIFO sorgusu (`orderBy createdAt asc`) hep bu ölü kayıtları döndürüyor → yeni page job'lar hiç işlenmiyor ve `worker/serve.ts`'teki `drainWork` 4 dakika boyunca Firestore'u boş yere döverek dönüyor.
5. **P1 — Skor doğruluğu.** Yüklenemeyen sayfalar `issues: []` ile normal sayfa gibi kaydediliyor; `calculateScanScore` bunları `pageCount`'a katıp `penalty / sqrt(pageCount)` bölenini büyütüyor. Sonuç: taranamamış sayfalar hem "100 puan" alıyor hem de genel skoru şişiriyor. Ürünün manşet metriği yanlış.

Sistem sağlığı özeti: **mimari sağlam, kenar durumları zayıf.** Toplam 47 bulgu — 1×P0, 6×P1, 26×P2, 14×P3.

---

## 2. Mimari Akış Özeti (scan pipeline)

```
[TARAYICI]
   │ POST /api/scans  (src/app/api/scans/route.ts)
   │   requireSession → create_scans izni → zod → validateUrl(resolveDns:false)
   │   → checkRateLimit(scanCreate, userId)        [Firestore rateLimits/]
   │   → countInflightScans()   ◄── ⚠ TOCTOU (B17)
   │   → reserveScanQuota()     ◄── ⚠ geri alınmıyor (B18)
   │   → createScanJob(status=queued, usePageJobs=PAGE_JOBS_ENABLED)
   │   → enqueueScanTask()  [best-effort, retry yok]
   ▼
[FIRESTORE]  workspaces/{ws}/scans/{scanId}
   │
   ├──► [CLOUD TASKS] ──OIDC──► Cloud Run private worker  POST /process
   │                              worker/serve.ts :: handleProcess → drainWork()
   │                                 ├ listClaimableScanRefs(1)      ◄── ⚠ sıcak döngü (B04)
   │                                 └ listClaimablePageJobRefs(cap) ◄── ⚠ head-of-line (B04)
   │
   └──► [CLOUD SCHEDULER] ──► GET /api/internal/scans/sweep  (CRON_SECRET)
                                 sweepScans() + sweepPageJobs() → applySweepAction()
                                 + listAggregationCandidates() → aggregateScan()
                                 ⚠ vercel.json'da tanımlı DEĞİL (B31)

WORKER İÇİ (worker/serve.ts | worker/index.ts — aynı iş mantığı, farklı tetikleyici)
   claimScanJob()  [transaction, status==="queued" şartı]  ✅ atomik
      │
      ├─ usePageJobs=false → processScanJob() (worker/process-job.ts)
      │     runScanJob → crawlSameDomain (playwright-runner.ts)
      │        BrowserManager.acquire() → paylaşımlı Chromium, viewport başına context
      │        her sayfa: goto → validateFinalUrl → axe → normalize
      │        ⚠ hatalı sayfa `pageErrorResult` ile "sayfa" olarak dönüyor (B07)
      │     → persistScanOutcome() → clearScanResultCollections() ⚠ 500 batch limiti (B09)
      │     → completeScanJob()  ⚠ durum kontrolsüz merge (B05)
      │
      └─ usePageJobs=true  → resolveScanTargets() → createPageJobs() (phase=scanning)
            her pageJob ayrı claim:  claimPageJob() [transaction] ✅ atomik
              processPageJob() (worker/process-page-job.ts)
                 runWithPageDeadline(60s) → scanSinglePage → persistPageResult
                 → completePageJob()/failPageJob() [transaction, FieldValue.increment]
                 → son sayfayı bitiren aggregation'ı kazanır (planPageFinalize)
            aggregateScan() (persistence.ts)
                 skor + gruplama + remediation task + incrementPagesUsage ⚠ çift sayım (B08)
                 → updateScanJob(status=completed) ⚠ durum kontrolsüz (B05)
```

**Watchdog:** her worker 60 sn'de bir `sweepScans`/`sweepPageJobs` (saf fonksiyon) çalıştırıp `applySweepAction` ile transaction içinde canlı dokümana karşı yeniden doğruluyor. Bu tasarım doğru. Sorun, worker'ın *kendi* terminal yazımlarının aynı disiplini uygulamaması.

---

## 3. Bulgu Tablosu

Şiddet: **P0** = derhal (aktif istismar edilebilir / veri bütünlüğü), **P1** = bu sprint, **P2** = planlı, **P3** = borç.
Efor: **S** ≤ ½ gün, **M** ≤ 2 gün, **L** > 2 gün.

| ID | Başlık | Şiddet | Kategori | Dosya:satır | Kanıt | Etki | Önerilen düzeltme | Efor |
|---|---|---|---|---|---|---|---|---|
| B01 | `/statement/{id}` stored XSS + `javascript:` href | **P0** | Güvenlik | `src/app/statement/[id]/route.ts:43-53, 61, 148, 153, 166` | `${limitText}`, `${workspace.companyName}`, `href="${privacy.statementContactEmail}"` — hiç escape yok; `render.ts:503` `escapeHtml` var ama burada kullanılmıyor | Ürün origin'inde kalıcı XSS; oturum çalma/CSRF | `escapeHtml` uygula; e-posta `href`'ini sadece `mailto:` + `https?:` şemasına izin ver | S |
| B02 | `/api/plan/select` ile ücretsiz enterprise yükseltme | **P1** | Güvenlik/Billing | `src/app/api/plan/select/route.ts:26-44` | Kapı `polarConfigured()` = `POLAR_ACCESS_TOKEN` varlığı; yoksa `updateWorkspace({plan})` serbest | Gelir kaybı; tüm plan capleri baypas | Prod'da fail-closed: `NODE_ENV==="production"` iken ücretli plan seçimini koşulsuz reddet | S |
| B03 | Retry route: kota + izin kontrolü yok | **P1** | Bug/Güvenlik | `src/app/api/scans/[id]/retry/route.ts:23-32, 41-68` | Sadece `requireSession()`; `roleHasPermission` yok, `reserveScanQuota` yok, `countInflightScans` yok | Sınırsız ücretsiz tarama; yetkisiz rol tarama tetikliyor | `create_scans` iznini ekle + `reserveScanQuota` + eşzamanlılık kontrolü | S |
| B04 | Yetim `queued` pageJob'lar → FIFO tıkanması + sıcak döngü | **P1** | Dayanıklılık | `src/lib/data/firestore.ts:998-1016`; `worker/serve.ts:170-223`; `src/lib/data/scan-sweeper.ts:151-169` | Scan `fail` edilince pageJob'lara dokunulmuyor; `deletePageJobs` yalnızca retry route'unda çağrılıyor; `claimPageJob` null döndükçe `drainWork` while döngüsü hiç beklemeden dönüyor | Yeni page job'lar hiç işlenmez; Cloud Run 4 dk boş Firestore trafiği yakar | `applySweepAction` fail dalında pageJob'ları da `failed` yap; `drainWork`'e "hiç claim edilemedi" backoff'u ekle | M |
| B05 | Terminal durum dirilmesi / çift işleme | **P1** | Bug (race) | `src/lib/scanner/persistence.ts:252-272, 383-394, 420-426`; `worker/index.ts:510-518` | `updateScanJob` koşulsuz `set(..., {merge:true})`; shutdown'da requeue edilirken iş hâlâ uçuşta | Sweeper'ın `failed` yaptığı scan `completed` olur; iki worker aynı scan'i işler; `clearScanResultCollections` diğerinin verisini siler | Terminal yazımları transaction'a al: `status==="running" && claimedBy===workerId` şartı | M |
| B06 | Süresi dolan oturum 401 yerine 500 döndürüyor | **P1** | Bug/UX | `src/lib/auth/session.ts:41-46`; `src/lib/api/context.ts:57-62` | `verifySessionCookie(value, true)` *fırlatır*; `requireSession` try/catch'siz; `apiError` bunu bilinmeyen sayıp Sentry'ye + 500 | 7 günde bir tüm kullanıcılar her API çağrısında 500 alır; Sentry gürültüsü | `verifySessionCookie`'yi try/catch'e al, `null` döndür (→ 401) | S |
| B07 | Başarısız sayfalar skoru şişiriyor | **P1** | Doğruluk | `src/lib/scanner/scoring.ts:33-50, 63-75`; `src/lib/scanner/playwright-runner.ts:813-817, 338-343` | `pageErrorResult` `issues: []` döner; `overallScore = 100 - penalty/√pageCount`; `pageScores` → 100 | Taranamamış sayfa "kusursuz" görünür, genel skor gerçeğin üstünde | `NormalizedPage`'e `failed: true` ekle; skorlamada hariç tut ve raporda ayrıca göster | M |
| B08 | `incrementPagesUsage` yeniden agregasyonda çift sayıyor | P2 | Doğruluk/Billing | `src/lib/scanner/persistence.ts:274-277` | `aggregateScan` "idempotent" deniyor ama `incrementPagesUsage` mutlak artış; sweeper aggregation'ı tekrar tetikliyor | Aylık sayfa kotası şişer; müşteri erken limite takılır | Agregasyonda `usageAppliedAt` bayrağı; ya da sayfa bazlı `pagesScannedThisMonth` | S |
| B09 | `clearScanResultCollections` 500 batch limitini aşabiliyor | P2 | Bug | `src/lib/data/firestore.ts:1672-1681` | Tek `batch` içine sınırsız `delete`; komşu fonksiyonlar 400'de chunk'lıyor (`951-969`, `1426-1440`) | >500 issue'lu scan'de `INVALID_ARGUMENT` → persist/retry başarısız | 400'lük chunk'lara böl (mevcut desen) | S |
| B10 | Legacy yeniden çalıştırmada yetim `visualEvidence` | P2 | Veri/Privacy | `src/lib/data/firestore.ts:1672-1681` vs `1684-1708` | `clearScanPageResult` evidence siliyor, `clearScanResultCollections` silmiyor; legacy issue id'leri rastgele UUID | Kök `visualEvidence` koleksiyonunda ekran görüntüsü birikir; saklama vaadi ihlali | `clearScanResultCollections`'a `visualEvidence where scanJobId==` silme ekle | S |
| B11 | `listIssues` severity sıralaması alfabetik → yanlış öncelik | P2 | Doğruluk | `src/lib/data/firestore.ts:1458-1462`; `types.ts:25` | `orderBy("severity","asc")`; değerler `critical < minor < moderate < passed < review` | `minor` sorunlar `moderate`'in üstüne çıkar; `syncRemediationTasksForScan`'in `slice(0,100)`'ü moderate'leri eler | Sayısal `severityRank` alanı yaz ve ona göre sırala | M |
| B12 | `/api/notifications` audit log'u yetkisiz açıyor | P2 | Güvenlik | `src/app/api/notifications/route.ts:11`; `src/lib/data/firestore.ts:1765-1767` | `listNotifications` = `listAuditLogs`; route sadece `requireSession`. Kardeşi `/api/privacy/audit-logs` `manage_privacy` istiyor | `report_viewer` (hiçbir izni yok) workspace audit log'unu, taranan URL'leri okur | `view_scans` veya ayrı `view_notifications` izni ekle; metadata'yı kırp | S |
| B13 | `auditLogs` composite index eksik → kalıcı degraded yol | P2 | Performans | `src/lib/data/firestore.ts:1740-1763`; `firestore.indexes.json` | `where(workspaceId).orderBy(createdAt desc)` için index yok; catch `message.includes("index")` ile 4×limit sırasız okuyup bellekte sıralıyor | Bildirimler "en yeni" olmayabilir; her istek 4× okuma | `auditLogs (workspaceId ASC, createdAt DESC)` index'ini ekle | S |
| B14 | `findIssueInWorkspace` N+1 + 100 scan penceresi | P2 | Bug/Performans | `src/lib/data/firestore.ts:1473-1483`; `src/app/api/issues/[id]/ai-explanation/route.ts:12` | 100 scan listeler, her biri için ayrı `getIssue` doküman okuması | 101'inci scan'den eski issue'lar için AI açıklaması sessizce 404; en kötü 101 sıralı okuma | Route'a `scanId` parametresi taşı; ya da `collectionGroup("issues").where("id","==")` | M |
| B15 | `syncRemediationTasksForScan` N+1 | P2 | Performans | `src/lib/data/firestore.ts:2201-2265` (2219, 2246) | Her grup/issue için sıralı `getRemediationTask` + `createRemediationTask` | 100 issue = 200 sıralı Firestore işlemi; agregasyon süresi uzar | `getAll()` ile toplu oku, `batch` ile toplu yaz | M |
| B16 | `listAggregationCandidates` her sweep'te N+1 | P2 | Performans | `src/lib/data/firestore.ts:1387-1410` (1400) | 100 aday scan × `listPageJobs()` tam koleksiyon okuması, 60 sn'de bir, her worker'da | Yük altında sweeper maliyeti patlar, sweep gecikir | Sayaçlara güven (`pagesDone+pagesFailed>=pagesTotal`); `listPageJobs` doğrulamasını sadece claim anında yap | M |
| B17 | Eşzamanlılık kontrolü TOCTOU | P2 | Bug (race) | `src/app/api/scans/route.ts:113-116` | `countInflightScans()` okuma, `createScanJob` ayrı yazma — atomik değil | İki eşzamanlı POST `MAX_CONCURRENT_SCANS_PER_WORKSPACE=1`'i aşar | Sayacı `reserveScanQuota` transaction'ına taşı | M |
| B18 | Kota rezerve edilip geri alınmıyor | P2 | Doğruluk | `src/app/api/scans/route.ts:118-186` | `reserveScanQuota` (120) → `createScanJob` (136) → `audit` (187). Aradaki herhangi bir hata kotayı yakar | Kullanıcı tarama alamadan günlük hakkını kaybeder | `try/catch` ile telafi yazımı (compensating decrement) veya scan doc'unu transaction'a al | S |
| B19 | `?limit=` NaN / negatif doğrulanmıyor | P2 | Bug | `src/app/api/scans/route.ts:221` | `Math.min(50, Number(searchParams.get("limit") ?? 20))` → `limit=abc` ⇒ `NaN`, `limit=-5` ⇒ `-5`; Firestore `.limit()` bunları reddeder | 500 internal error | zod `coerce.number().int().min(1).max(50).catch(20)` | S |
| B20 | Polar webhook'ta idempotency / sıralama koruması yok | P2 | Doğruluk/Billing | `src/app/api/billing/webhook/route.ts:43-80` | `applySubscription` en son gelen olayı koşulsuz yazıyor; event id / `modifiedAt` karşılaştırması yok | Sırasız teslimat (Polar retry) yanlış plan düşürme/yükseltme yapar | İşlenen `event.id`'leri dedupe koleksiyonunda tut; sadece daha yeni `modifiedAt`'i uygula | M |
| B21 | Webhook secret boşsa sessiz `""` fallback | P2 | Güvenlik | `src/app/api/billing/webhook/route.ts:88` | `process.env.POLAR_WEBHOOK_SECRET ?? ""` | Yanlış yapılandırmada davranış SDK'ya bağımlı — açıkça fail-closed değil | Secret yoksa 503 döndür ve logla (doğrulanmadı, bkz. §7) | S |
| B22 | Audit yazımı hatası başarılı taramayı 500'e çeviriyor | P2 | Bug | `src/app/api/scans/route.ts:187-194`; `src/lib/data/firestore.ts:1719-1738`; `src/lib/api/audit.ts` (hiç kullanılmıyor) | Route'lar `audit`'i `@/lib/data/firestore`'dan alıyor (throw eder); güvenli sarmalayıcı `src/lib/api/audit.ts` hiçbir yerde import edilmiyor (`grep` = 0 sonuç) | Kullanıcı "başlatılamadı" görür ama tarama çalışır ve kota harcar | Tüm route'ları `@/lib/api/audit`'e geçir (yut + logla) | S |
| B23 | DNS rebinding SSRF — navigasyonda IP pinning yok | P2 | Güvenlik | `src/lib/scanner/playwright-runner.ts:737-748`; `src/lib/scanner/url-validation.ts:147-172` | Kod yorumu açıkça kabul ediyor: "we don't pin connections here because Playwright hides the socket" | Doğrulama sonrası ikinci DNS çözümlemesiyle iç ağa erişim | Chromium `--host-resolver-rules=MAP host ip` ile pinle veya doğrulayan bir proxy'den geçir | L |
| B24 | Alt kaynak istekleri host kısıtına tabi değil | P2 | Güvenlik | `src/lib/scanner/playwright-runner.ts:250-285` (272), `106-115` | Host kontrolü sadece `req.isNavigationRequest() && mainFrame`; `real` profilinde `image/stylesheet/font/script` her host'a gidebilir | Taranan sayfa worker ağından iç uçlara kör istek atabilir (CORS okumayı engeller) | Tüm isteklerde hedef IP/host'u `isBlockedIp` ile kontrol et | M |
| B25 | `MAX_RESPONSE_BYTES` koruması NaN ile devre dışı | P2 | Bug/Güvenlik | `src/lib/scanner/playwright-runner.ts:397-404, 500-505` | `bytesSeen += Number(cl)` — tek bozuk `content-length` ⇒ `NaN`; `NaN > 10MB` her zaman `false`. Ayrıca chunked yanıtlarda header yok | 10 MB tavanı pratikte hiç uygulanmıyor | `Number.isFinite` kontrolü + `response.body()` uzunluğuna göre ölç | S |
| B26 | Retention sweep tüm workspace'leri sınırsız geziyor | P2 | Dayanıklılık/Uyum | `src/lib/data/deletion.ts:482-529` (489) | `collection("workspaces").get()` — sayfalama yok, cursor yok, zaman bütçesi yok; `maxDuration=300` | Ölçekte timeout ⇒ retention sessizce eksik kalır (gizlilik politikası ihlali) | Cursor'lu sayfalama + kaldığı yerden devam eden `lastProcessedWorkspaceId` | M |
| B27 | Kimliksiz Firestore yazımı tetiklenebiliyor | P2 | Güvenlik/Maliyet | `src/app/statement/[id]/route.ts:22`; `src/lib/data/firestore.ts:357-364` | `getPrivacySettings` doküman yoksa **yazıyor** (`ref.set`); `/statement/<rastgele-uuid>` herkese açık | Sınırsız çöp doküman üretimi (depolama/maliyet DoS) | `getPrivacySettings`'e salt-okunur varyant ekle; statement route'unda önce workspace varlığını doğrula | S |
| B28 | `processPageJob` "asla fırlatmaz" iddiası yanlış | P2 | Dayanıklılık | `worker/process-page-job.ts:172-174, 303-315` | `persistPageResult`/`completePageJob` try/catch dışında; Firestore hatası dışarı sızıyor | PageJob 90 sn `running` takılı kalır, bir retry hakkı boşa gider | 303-315'i `recordPageFailure` ile saran try/catch'e al | S |
| B29 | Issue tavanı scan başına değil sayfa başına uygulanıyor | P2 | Doğruluk/Maliyet | `src/lib/scanner/persistence.ts:136-154` | `persistPageResult(..., maxPersistedIssuesPerScan(), ...)` her sayfa için tam bütçe veriyor | `MAX_PERSISTED_ISSUES_PER_SCAN=100` + 50 sayfa ⇒ 5000 issue dokümanı | Scan seviyesinde paylaşılan sayaç (scan doc'ta `issuesPersisted`, transaction'la artır) | M |
| B30 | Serverless'ta fire-and-forget hata raporlaması kayboluyor | P2 | Gözlemlenebilirlik | `src/lib/observability.ts:46-94`; tüm `void captureException(...)` çağrıları | Response döndükten sonra fetch iptal edilebilir; `waitUntil` kullanılmıyor | Prod hataları Sentry'ye hiç ulaşmayabilir | `next/server` `after()` / `waitUntil` ile sarmala | S |
| B31 | Sweeper ve monitor cron'ları repoda tanımlı değil | P2 | Operasyon | `vercel.json:8-13` | Sadece `/api/cron/data-retention` var; `/api/internal/scans/sweep` ve `/api/internal/monitors/run` repo dışı Cloud Scheduler'a bağlı | Scheduler job'ı yoksa takılan scan hiç kurtarılmaz, monitor hiç çalışmaz — repoda hiçbir iz yok | Terraform/`scripts/deploy-cloud-run.sh` içinde scheduler tanımını versiyonla + healthz'e "son sweep" alanı ekle | M |
| B32 | Bozuk env değeri eşzamanlılık korumasını kapatıyor | P2 | Bug | `src/app/api/scans/route.ts:113-116`; `src/app/api/internal/monitors/run/route.ts:69-73` | `Number(process.env.MAX_CONCURRENT_SCANS_PER_WORKSPACE ?? 1)` ⇒ `NaN`; `x >= NaN` her zaman `false`. Monitor tarafında `Math.max(1, NaN)` = `NaN` | Yazım hatası tüm eşzamanlılık limitini sessizce kaldırır | Ortak `intFromEnv(name, fallback, min)` yardımcı fonksiyonu (worker'da zaten var) | S |
| B33 | `userPrompt` sınırsız ve doğrulanmamış | P2 | Güvenlik/Maliyet | `src/app/api/issues/[id]/ai-explanation/route.ts:20-34`; `src/lib/ai/explain.ts:250, 259` | `htmlSnippet` 2048'e kırpılıyor ama `userPrompt` doğrudan prompt'a giriyor; route'ta zod yok | LLM maliyet suistimali (60 istek/saat × sınırsız girdi); prompt injection | zod ile `max(2000)`; `mode`/`framework` için enum | S |
| B34 | Bazı route'larda `view_scans` izni kontrol edilmiyor | P2 | Güvenlik | `scans/[id]/status/route.ts:13`, `scans/[id]/compare/route.ts:22`, `scans/[id]/issues/route.ts:19`, `issues/[id]/visual-evidence/route.ts:9`, `visual-evidence/[id]/image/route.ts:9`, `reports/[id]/route.ts:10` | Yalnızca `requireSession()` | `report_viewer` (tüm izinleri `false`) tarama verisi ve ekran görüntüsü okuyabiliyor | Her birine ilgili `roleHasPermission` kontrolünü ekle | S |
| B35 | Sentry olaylarında stack frame yok | P2 | Gözlemlenebilirlik | `src/lib/observability.ts:60-70` | `stacktrace: { frames: [] }` sabit; `err.stack` sadece console'a | Sentry gruplaması ve kök-neden analizi neredeyse imkânsız | Stack'i parse edip frame'lere çevir veya resmi SDK'ya geç | M |
| B36 | Sabit-zamanlı olmayan secret karşılaştırması | P3 | Güvenlik | `worker/serve.ts:288`; `src/app/api/internal/scans/process/route.ts:8`; `cron/data-retention:20`; `internal/scans/sweep:48` | `!==` ile düz string karşılaştırma | Teorik timing sızıntısı (ağ gürültüsü altında düşük risk) | `crypto.timingSafeEqual` | S |
| B37 | Bellek-içi rate limit fallback'i sınırsız büyüyor | P3 | Teknik borç | `src/lib/api/rate-limit.ts:23, 43-58` | `buckets` Map'ine hiç eviction yok | Uzun ömürlü process'te bellek sızıntısı (sadece Admin creds yokken) | Süresi dolmuş bucket'ları periyodik temizle | S |
| B38 | `limiters.visualEvidence` tanımlı ama hiç kullanılmıyor | P3 | Teknik borç | `src/lib/api/rate-limit.ts:29` | Grep: `visualEvidence` limiter'ı hiçbir route'ta çağrılmıyor | Görsel kanıt endpoint'i limitsiz; ölü konfigürasyon | Image route'una uygula veya kaldır | S |
| B39 | Rate limit olmayan hassas route'lar | P3 | Güvenlik | `plan/select`, `team/invitations` POST, `auth/session` POST, `monitors` POST, `privacy/export-workspace-data` | `checkRateLimit` grep'inde yoklar | Davet spam'i, ağır export'la maliyet baskısı | En azından davet + export + session'a limiter ekle | S |
| B40 | Ham iç hata mesajları kullanıcıya sızıyor | P3 | Güvenlik/UX | `src/lib/scanner/persistence.ts:383-394`; `api/auth/session/route.ts:28`; `team/invitations/[id]/accept/route.ts:30` | `errorMessage: msg` (ham), `message: (err as Error).message` | Playwright/Firebase iç detayları UI'da; runbook da "(raw)" diyor | Kod→kullanıcı mesajı eşlemesi (`SWEEP_ERROR_MESSAGES` deseni) | S |
| B41 | `/api/healthz?deep=1` kimliksiz ve pahalı | P3 | Güvenlik/Maliyet | `src/app/api/healthz/route.ts:100-138`, `33-37` | Kimlik doğrulama yok; 4 Firestore sorgusu; `detail: (err as Error).message` ham | Ucuz DoS + iç hata sızıntısı | `deep=1`'i secret'a bağla; `detail`'i sanitize et | S |
| B42 | Retry `createdAt`'i yeniden yazıyor | P3 | Teknik borç | `src/app/api/scans/[id]/retry/route.ts:67` | Yorumda gerekçe var (`queue_timeout` `createdAt`'ten ölçülüyor) | Tarama geçmişi sıralaması ve denetim izi bozulur | Ayrı `queuedAt` alanı ekle, sweeper onu kullansın | S |
| B43 | `counts` içinde çift sayım | P3 | Doğruluk | `src/app/api/scans/[id]/route.ts:30-33` | `if (impact==="serious") counts.serious++` **ve** `counts[severity]++`; `serious` → `severity="moderate"` (`normalize.ts:32-37`) | Sayaçlar toplamı issue sayısını aşar | Ya impact ya severity ekseninde say, ikisini karıştırma | S |
| B44 | Index hatası tespiti string eşleşmesine bağlı | P3 | Teknik borç | `src/lib/data/firestore.ts:1751` | `if (!message.includes("index")) throw error;` | gRPC mesajı değişirse fallback sessizce kırılır | `firestore-errors.ts:isFirestoreIndexError` zaten var, onu kullan | S |
| B45 | Kullanılmayan composite index | P3 | Maliyet | `firestore.indexes.json:31-44` | `scans (status, processorHeartbeatAt)` — hiçbir sorgu bunu kullanmıyor (grep) | Gereksiz yazma maliyeti ve index bakımı | Kaldır | S |
| B46 | `sanitizeCallback` `/\evil.com`'a izin verebiliyor | P3 | Güvenlik | `src/app/api/auth/session/route.ts:39-42` | Sadece `//` engelleniyor; ters eğik çizgi yok | Olası açık yönlendirme (istemci davranışına bağlı — doğrulanmadı) | Allowlist veya `new URL(v, origin).origin === origin` kontrolü | S |
| B47 | `@types/node ^20` vs `engines: 22.x` | P3 | Teknik borç | `package.json:5-7, 45` | Sürüm kayması | Node 22 API'leri tip düzeyinde eksik/yanlış | `@types/node@^22`'ye yükselt | S |

---

## 4. P0 / P1 Bulguları — Detay

### B01 (P0) — `/statement/{workspaceId}` stored XSS

**Kod** — `src/app/statement/[id]/route.ts`:

```ts
// 43-45
const limitText = privacy.statementLimitations?.trim()
  ? privacy.statementLimitations
  : "No accessibility limitations are currently reported.";

// 47-53
const contactText = privacy.statementContactEmail
  ? `<p>... <a href="${
      privacy.statementContactEmail.includes("@")
        ? `mailto:${privacy.statementContactEmail}`
        : privacy.statementContactEmail          // ← şema kontrolü YOK
    }" ...>${privacy.statementContactEmail}</a></strong></p>`
  : "...";

// 61   <title>Accessibility Statement — ${workspace.companyName || workspace.name}</title>
// 148  <strong>${workspace.companyName || workspace.name}</strong>
// 153  <strong>${workspace.targetStandard.replace(/_/g," ").toUpperCase()}</strong>
// 166  <p style="white-space: pre-wrap;">${limitText}</p>
```

**Neden bug:** Tüm bu alanlar kullanıcı yazılabilir.
- `statementLimitations` → `PATCH /api/privacy/settings`, zod şeması sadece `z.string().max(2048)` (`privacy/settings/route.ts:14`).
- `companyName` → `PATCH /api/workspace`, `z.string().trim().max(200)` (`workspace/route.ts:8`).
- `statementContactEmail` → `z.string().email().or(z.string().url()).or(z.literal(""))` (`privacy/settings/route.ts:13`). `@` içermeyen bir değer **doğrudan** `href`'e yazılıyor.

Aynı repodaki rapor render'ı (`src/lib/reports/render.ts:503`) düzgün bir `escapeHtml` içeriyor ve her interpolasyonda kullanıyor — yani ekip deseni biliyor, bu dosyada uygulanmamış. Dahası mevcut test bu davranışı doğru kabul ediyor:

```ts
// src/app/statement/[id]/route.test.ts:76-77
expect(html).toContain("Old video subtitle limitations.");
expect(html).toContain("accessibility@acme.com");
```

**Etki:** `/statement/{workspaceId}` kimlik doğrulaması olmayan, `statementPublished: true` yapan herkesin erişebildiği bir sayfa. Ücretsiz bir hesapla üründen `https://<app>/statement/<ws>` altında `<script>` çalıştırılabilir. Aynı origin olduğu için oturumu açık bir ziyaretçi adına `fetch("/api/...")` çağrıları yapılabilir (session cookie `httpOnly` ama same-origin fetch'te otomatik gönderilir).

**Fix:**

```ts
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function safeContactHref(value: string): string | null {
  if (value.includes("@")) return `mailto:${encodeURIComponent(value)}`;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch { return null; }
}

const company = escapeHtml(workspace.companyName || workspace.name);
const limitText = escapeHtml(privacy.statementLimitations?.trim() || "No accessibility limitations are currently reported.");
const href = privacy.statementContactEmail ? safeContactHref(privacy.statementContactEmail) : null;
const contactText = href
  ? `<p>... <a href="${escapeHtml(href)}">${escapeHtml(privacy.statementContactEmail!)}</a></p>`
  : `<p style="color:#C28A2E;">No contact email or feedback link has been configured yet.</p>`;
```

Ayrıca yanıta `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'` ekleyin ve testi XSS payload'ıyla genişletin (`<img src=x onerror=alert(1)>` ⇒ HTML'de `&lt;img` görünmeli).

---

### B02 (P1) — `/api/plan/select` ile ücretsiz enterprise

**Kod** — `src/app/api/plan/select/route.ts:26-44`:

```ts
if (polarConfigured() && parsed.data.plan !== "free") {
  throw new ApiError(409, "use_checkout", "...");
}
// ...
await updateWorkspace(ctx.workspaceId, { plan: parsed.data.plan });
```

`polarConfigured()` = `Boolean(process.env.POLAR_ACCESS_TOKEN)` (`src/lib/billing/polar.ts:36-38`).

**Neden bug:** Kapı tek bir env değişkeninin *çalışma anındaki* varlığına bağlı. Her yeni kullanıcı kendi workspace'inin `owner`'ı oluyor (`entitlements.ts:74`), `owner` ise `manage_billing: true` (`entitlements.ts:155`). Yani token rotasyonu, yanlış konfigürasyon veya `docs/production-readiness.md`'nin tarif ettiği "billing disabled" durumunda **her kullanıcı** şu isteği atarak enterprise olur:

```
POST /api/plan/select   {"plan":"enterprise"}
```

Enterprise capleri: günde 1000 tarama, tarama başına 1000 sayfa, 500 monitor (`entitlements.ts:270-275`, `103-107`). Ayrıca bu route'ta rate limit yok.

**Fix:**

```ts
const SELF_SERVE_PLAN_SELECT =
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_SELF_SERVE_PLAN_SELECT === "1";

if (!SELF_SERVE_PLAN_SELECT && parsed.data.plan !== "free") {
  throw new ApiError(409, "use_checkout", "Paid plans are purchased through checkout.");
}
```

Yani varsayılan fail-closed; dev/demo için açık bir opt-in bayrağı. `polarConfigured()` kontrolünü ek şart olarak koruyun.

---

### B03 (P1) — Retry kotayı ve izni atlıyor

**Kod** — `src/app/api/scans/[id]/retry/route.ts:22-32`:

```ts
const ctx = await requireSession();          // ← roleHasPermission YOK
const { id } = await params;
const job = await getScanJob(ctx.workspaceId, id);
if (!job) throw new ApiError(404, "not_found");
// ... retryable kontrolü ...
const rl = await checkRateLimit("scanCreate", ctx.userId);   // ← tek koruma
// reserveScanQuota YOK, countInflightScans YOK
await updateScanJob(ctx.workspaceId, id, { status: "queued", ... });
```

Karşılaştırma — `POST /api/scans` (`route.ts:44, 114, 120`) üçünü de yapıyor: izin, eşzamanlılık, kota.

**Neden bug:** Ücretsiz plan `SCAN_DAILY_CAP_FREE=3` ile sınırlı ama retry hiç sayaç harcamıyor. Bir kullanıcı 3 tarama başlatır, hepsini `failed` durumuna getirir (örn. erişilemeyen URL) ve `rate-limit` penceresi izin verdiği ölçüde (10 istek/dakika) sınırsız yeniden çalıştırır. Aynı şekilde `FREE_GLOBAL_SCANS_PER_DAY` global koruması da baypas edilir. Ek olarak `client_viewer`/`auditor`/`report_viewer` rollerinin hepsi `create_scans: false` (`entitlements.ts:173-220`) ama retry edebiliyorlar.

**Fix:**

```ts
const ctx = await requireSession();
if (!roleHasPermission(ctx.role, "create_scans")) throw new ApiError(403, "forbidden");
// ...
const maxConcurrent = intFromEnv("MAX_CONCURRENT_SCANS_PER_WORKSPACE", 1, 1);
if ((await countInflightScans(ctx.workspaceId)) >= maxConcurrent) {
  throw new ApiError(429, "scan_concurrency_limit", "A scan is already running.");
}
const workspace = await getWorkspace(ctx.workspaceId);
const plan = normalizePlan(workspace?.plan);
await reserveScanQuota({ workspaceId: ctx.workspaceId, plan, maxPages: job.maxPages });
```

Ayrıca `enqueueScanTask({ scanJobId: id, reason: "scan_created" })` ekleyin — şu an retry sadece Cloud Scheduler sweep'ini (1-2 dk) bekliyor.

---

### B04 (P1) — Yetim pageJob'lar: FIFO tıkanması + sıcak döngü

**Kod 1** — sweeper scan'i fail ederken alt işleri bırakıyor (`src/lib/data/scan-sweeper.ts:151-169`):

```ts
if (doc.status === "running" && doc.usePageJobs &&
    (doc.phase === "scanning" || doc.phase === "aggregating")) {
  if (started === null || nowMs - started > thresholds.overallCapMs) {
    actions.push({ type: "fail", ..., errorCode: "scan_deadline_exceeded", ... });
  }
  continue;   // pageJobs'a hiç dokunulmuyor
}
```

`applySweepAction`'ın fail dalı (`firestore.ts:774-792`) yalnızca scan dokümanını yazıyor. `deletePageJobs` grep sonucu: **sadece** `src/app/api/scans/[id]/retry/route.ts:36`'da çağrılıyor.

**Kod 2** — FIFO sorgusu (`src/lib/data/firestore.ts:1008-1014`):

```ts
const queued = await db().collectionGroup("pageJobs")
  .where("status", "==", "queued")
  .orderBy("createdAt", "asc")     // ← en eski önce
  .limit(limit).get();
```

**Kod 3** — `claimPageJob` bunları asla claim edemiyor (`firestore.ts:1035-1042`):

```ts
if (job.status !== "queued" || scan.status !== "running" ||
    !scan.usePageJobs || scan.phase !== "scanning") return null;
```

**Kod 4** — sıcak döngü (`worker/serve.ts:174-222`):

```ts
while (!browserUnhealthy && !shuttingDown && Date.now() < deadline) {
  const capacity = CONCURRENCY - inflight.size;
  if (capacity <= 0) { await Promise.race(inflight); continue; }
  ...
  const [scanRefs, pageRefs] = await Promise.all([
    listClaimableScanRefs(1), listClaimablePageJobRefs(capacity),
  ]);
  if (!scanRefs[0] && pageRefs.length === 0) { ... break; }   // ← pageRefs BOŞ DEĞİL
  for (const ref of pageRefs) { ... runPage(ref, stats) ... }  // ← anında null döner
}
```

**Neden bug:** `runPage` claim edemeyip hemen resolve olur, `inflight` boşalır, `pageRefs.length > 0` olduğu için break şartı sağlanmaz. Döngü **hiç beklemeden** `PROCESS_BUDGET_MS` (240 sn) boyunca dönüp her turda 3 Firestore sorgusu + N transaction atar. Aynı zamanda `orderBy createdAt asc` bu ölü kayıtları hep başa koyduğu için `capacity` kadar slot kalıcı olarak dolar → **gerçek page job'lar hiç claim edilmez**.

`worker/index.ts:250-258` aynı sorunu paylaşıyor ama `POLL_INTERVAL_MS` ile yavaşladığı için sadece açlık (starvation) yaşanıyor, CPU/maliyet patlaması olmuyor.

Not: `PAGE_JOBS_ENABLED` varsayılan kapalı (`page-jobs.ts:44-47`), yani bu bayrak açılmadan tetiklenmez — bu yüzden P0 değil P1.

**Fix — iki parça:**

(a) Scan fail edildiğinde alt işleri kapat. `applySweepAction`'ın fail dalına ve `cancelActiveScans`'e ekleyin:

```ts
// firestore.ts — applySweepAction fail dalından sonra, transaction dışında:
if (job.usePageJobs) {
  await failRemainingPageJobs(action.workspaceId, action.scanId, "scan_deadline_exceeded");
}

export async function failRemainingPageJobs(workspaceId, scanId, errorCode) {
  const snap = await pageJobsCol(workspaceId, scanId).where("status","in",["queued","running"]).get();
  let batch = db().batch(); let n = 0;
  for (const doc of snap.docs) {
    batch.set(doc.ref, { status: "failed", errorCode, error: "parent_scan_failed",
                         claimedBy: null, finishedAt: now() }, { merge: true });
    if (++n % 400 === 0) { await batch.commit(); batch = db().batch(); }
  }
  if (n % 400 !== 0) await batch.commit();
}
```

(b) `drainWork`'e "boşa dönme" koruması:

```ts
let claimedThisRound = 0;
for (const ref of pageRefs) { ... }
await Promise.allSettled([...inflight]);
if (stats.pages + stats.scans === claimedBefore) {
  // hiçbir şey claim edilemedi → geri çekil
  await new Promise(r => setTimeout(r, 2000));
  if (++idleRounds >= 3) break;
} else { idleRounds = 0; }
```

---

### B05 (P1) — Terminal durum dirilmesi ve çift işleme

**Kod** — koşulsuz terminal yazımları:

```ts
// src/lib/scanner/persistence.ts:420-426  (completeScanJob)
await updateScanJob(metadata.workspaceId, scanJobId, {
  status: "completed", progressStep: "completed", ...
});

// src/lib/scanner/persistence.ts:383-394  (markScanFailed)
await updateScanJob(workspaceId, scanJobId, { status: "failed", ... });

// src/lib/scanner/persistence.ts:252-272  (aggregateScan)
await updateScanJob(workspaceId, scanJobId, { status: allFailed ? "failed" : "completed", ... });
```

`updateScanJob` (`firestore.ts:558-567`) düz `set(..., { merge: true })` — hiçbir durum ya da sahiplik kontrolü yok.

**Senaryo 1 — sweeper requeue yarışı:**
1. Worker A scan'i claim eder, uzun süren bir crawl'a girer, heartbeat'i (GC duraklaması / ağ) `SWEEP_STALE_RUNNING_MS` kadar gecikir.
2. Sweeper `requeue` uygular: `status=queued`, `claimedBy=null` (`firestore.ts:756-773`).
3. Worker B `claimScanJob` ile alır (`status==="queued"` şartı sağlanır), taramaya başlar.
4. Worker A devam eder → `persistScanOutcome` → **`clearScanResultCollections` Worker B'nin yazdığı sayfaları/issue'ları siler** → kendi sonucunu yazar → `completeScanJob` `status=completed` yapar.
5. Worker B biter, aynısını tekrar yapar. `incrementPagesUsage` iki kez, `audit scan.completed` iki kez.

**Senaryo 2 — shutdown yarışı** (`worker/index.ts:510-518`):

```ts
const drained = await waitForInflight(SHUTDOWN_DRAIN_MS);
if (!drained) {
  await Promise.all([requeueActiveScans(), requeueActivePageJobs()]);
}
```

`requeueScanOnShutdown` scan'i `queued`'a döndürüyor ama **uçuştaki `processScanJob` promise'i iptal edilmiyor** — sadece heartbeat durduruluyor. Aynı Senaryo 1'e düşülüyor.

**Senaryo 3 — `scan_deadline_exceeded` sonrası agregasyon:** Sweeper scan'i `failed` yapar; hâlâ `running` olan bir pageJob biter, `completePageJob` sayaçları artırır ve `planPageFinalize` agregasyonu kazandırır → `aggregateScan` scan'i `completed`'a döndürür. Runbook "Terminal states are never touched" diyor ama bu yalnızca *sweeper* için geçerli.

**Fix — sahiplik + durum kontrollü terminal yazımı:**

```ts
// src/lib/data/firestore.ts
export async function finalizeScanJob(
  workspaceId: string, scanId: string, workerId: string | null,
  patch: Partial<ScanJob>
): Promise<boolean> {
  const ref = scanRef(workspaceId, scanId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = readDoc<ScanJob>(snap.id, snap.data());
    if (!job) return false;
    // Zaten terminal ise dokunma.
    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return false;
    }
    // Bu worker artık sahibi değilse (requeue edilmiş) dokunma.
    if (workerId && job.claimedBy !== workerId) return false;
    tx.set(ref, stripUndefined({ ...patch, updatedAt: now() } as Record<string, unknown>),
           { merge: true });
    return true;
  });
}
```

`completeScanJob`, `markScanFailed` ve `aggregateScan` bunu kullanmalı; `false` dönerse tüm yan etkiler (`incrementPagesUsage`, `syncRemediationTasksForScan`, `audit`) atlanmalı. `processScanJob`/`processPageJob` imzalarına `workerId` eklenmeli (page tarafında `job.claimedBy` zaten mevcut).

Ek olarak `persistScanOutcome` içindeki `clearScanResultCollections` çağrısı da bu sahiplik kontrolüne bağlanmalı — aksi halde geç kalan worker hâlâ veri siler.

---

### B06 (P1) — Süresi dolan oturum 500 döndürüyor

**Kod:**

```ts
// src/lib/auth/session.ts:41-46
export async function verifySessionCookie(): Promise<DecodedIdToken | null> {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;
  return firebaseAdminAuth().verifySessionCookie(value, true);   // ← REJECT eder
}

// src/lib/api/context.ts:56-62
export async function requireSession(): Promise<ApiContext> {
  const token = await verifySessionCookie();      // ← try/catch YOK
  if (!token?.uid) throw new ApiError(401, "unauthorized");
  ...
}
```

**Neden bug:** `firebase-admin`'in `verifySessionCookie` metodu geçersiz/süresi dolmuş/iptal edilmiş cookie'de `FirebaseAuthError` **fırlatır**, `null` döndürmez. Bu hata `requireSession` içinde yakalanmadığı için `apiError` (`context.ts:86-118`) tarafından işlenir:
- `ApiError` değil → atlanır,
- Firestore index/quota hatası değil → atlanır,
- son satır: `void captureException(err, { scope: "api" }); return Response.json({ error: "internal" }, { status: 500 });`

**Etki:** `FIREBASE_SESSION_DAYS=7` olduğu için her kullanıcı haftada bir bu duruma düşer. İstemci 401 görüp sign-in'e yönlendirmek yerine "internal" 500 alır. Aynı zamanda Sentry, normal oturum sona ermelerinden gelen sahte "incident"lerle dolar — ki `apiError`'ın kendi yorumu tam da bunu önlemeyi amaçlıyor ("Expected, handled errors (4xx) are not reported to Sentry"). `src/lib/api/context.test.ts` yalnızca index senaryosunu test ediyor, bu yol test edilmemiş.

**Fix:**

```ts
export async function verifySessionCookie(): Promise<DecodedIdToken | null> {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;
  try {
    return await firebaseAdminAuth().verifySessionCookie(value, true);
  } catch {
    // Süresi dolmuş / iptal edilmiş / bozuk cookie: oturum yok demektir.
    return null;
  }
}
```

Test ekleyin: `verifySessionCookie` reject ettiğinde `requireSession()`'ın `ApiError(401)` fırlattığını doğrulayın. Ayrıca `apiError`'a bir güvenlik ağı ekleyin: `if (err?.code?.startsWith?.("auth/")) return 401`.

---

### B07 (P1) — Başarısız sayfalar skoru şişiriyor

**Kod 1** — başarısız sayfa normal sayfa gibi listeye giriyor (`src/lib/scanner/playwright-runner.ts:813-817`):

```ts
} catch (err) {
  // One bad page should not poison the whole scan.
  results.push(pageErrorResult(next, err, "page_unavailable"));
  continue;
}
```

`pageErrorResult` (`180-205`) `issues: []` ve `rawMetadata.resultConfidence = "low"` döner. Aynı şey `338-343`'te "hiçbir viewport tamamlanamadı" durumunda da olur.

**Kod 2** — skorlama bunu ayırt etmiyor (`src/lib/scanner/scoring.ts:33-50, 63-75`):

```ts
const pageCount = Math.max(1, pages.length);                      // ← başarısızlar dahil
const overallPenalty = calculatePenalty(allWcagEntries.map(e => e.issue));
const overallScore = clampScore(100 - overallPenalty / Math.sqrt(pageCount));   // ← bölen şişer

const pageScores = pages.map((page) => {
  const pageIssues = page.issues.filter(isWcagIssue);             // ← boş
  return { url: page.url, title: page.title,
           score: clampScore(100 - calculatePenalty(pageIssues)), // ← 100
           ... };
});
```

**Sayısal örnek:** 5 sayfalık bir tarama, 1 sayfa taranıyor (penalty 40), 4 sayfa yüklenemedi.
- Gerçek: `100 - 40/√1 = 60` (F/D sınırı, "high risk").
- Kod: `100 - 40/√5 = 100 - 17.9 = 82` (**B notu, "medium risk"**).
Ayrıca `pageScores` dizisinde 4 sayfa `score: 100` ile listelenir ve rapora (`render.ts:458`) "sayfa başına dağılım" tablosunda yansır.

`staticFallbackReasonFromOutcome` (`worker/static-fallback.ts:115-121`) yalnızca **her** sayfa başarısızsa devreye giriyor; karışık tarama bu yolu tetiklemiyor.

**Etki:** Bu ürünün sattığı tek sayı doğru değil. Uyumluluk beyanına ve raporlara giriyor (`/statement`, `/r/{token}`, PDF export).

**Fix:**

```ts
// src/lib/scanner/types.ts
export interface NormalizedPage {
  ...
  /** Sayfa hiç analiz edilemedi — skorlama dışı tutulur. */
  scanFailed?: boolean;
  failureCode?: ScannerErrorCode;
}

// playwright-runner.ts :: pageErrorResult
return { url, title: null, statusCode: null, scannedAt: new Date(),
         scanFailed: true, failureCode: normalized.code, rawMetadata: {...}, issues: [] };

// scoring.ts :: calculateScanScore
export function calculateScanScore(allPages: NormalizedPage[]): ScanScoreSummary {
  const pages = allPages.filter((p) => !p.scanFailed);
  const failedPages = allPages.filter((p) => p.scanFailed);
  const pageCount = Math.max(1, pages.length);
  // ... mevcut hesap, sadece `pages` üzerinden ...
  return {
    ...,
    pagesFailedToScan: failedPages.length,
    failedPageUrls: failedPages.map((p) => p.url),
  };
}
```

`ScanSummary` tipine `pagesFailedToScan` ekleyip raporda ve UI'da "N sayfa taranamadı — skor kalan M sayfaya dayanıyor" uyarısı gösterin. Hiç sayfa taranamadıysa (`pages.length === 0`) skor üretmek yerine scan'i `failed` işaretleyin. `scoring.test.ts`'e başarısız-sayfa vakası ekleyin.

---

## 5. Test Kapsamı Boşluk Analizi

**Mevcut test dosyaları (33 adet, `node_modules` hariç):** `src/lib/scanner/*` çoğunlukla kapsanmış (`scoring`, `normalize`, `grouping`, `url-validation`, `sources`, `viewports`, `estimate`, `progress`, `evidence-crop`, `visual-evidence`, `compare`, `static-runner`, `inline-runner`, `dispatch`, `playwright-runner.integration`); `src/lib/data/*` kısmen (`scan-sweeper`, `page-jobs`, `firestore.lifecycle`, `cleanup-stuck-scan`, `firestore-errors`); route testleri: `scans/status`, `scans/retry`, `issues`, `healthz`, `statement`, `cron/data-retention`, `privacy/delete-scan-data`, `reports/[id]/export`; worker: `browser-manager`, `process-job`, `page-jobs.integration`.

**Kritik kapsanmayan yollar:**

| Alan | Dosya | Neden kritik | Önerilen test |
|---|---|---|---|
| Scan oluşturma | `src/app/api/scans/route.ts` | **Sistemin ana giriş noktası, hiç testi yok.** B17/B18/B19/B32 buradan | Kota reddi, eşzamanlılık reddi, consent uyarıları, `limit=abc`, dispatch hatasında 201 |
| Kalıcılık + agregasyon | `src/lib/scanner/persistence.ts` | B05/B08/B09/B10/B29'un tamamı burada | `aggregateScan` iki kez çağrıldığında `incrementPagesUsage` bir kez; >500 issue'da batch chunk'lama |
| Billing webhook | `src/app/api/billing/webhook/route.ts` | Para akışı. B20/B21 | Geçersiz imza → 403; sırasız `canceled` sonrası `active`; bilinmeyen product → plan değişmez |
| Plan seçimi | `src/app/api/plan/select/route.ts` | B02 | Prod modunda ücretli plan seçimi 409 |
| Oturum | `src/lib/api/context.ts` / `src/lib/auth/session.ts` | B06 | Süresi dolmuş cookie → 401, 500 değil |
| Ekip davetleri | `src/app/api/team/invitations/**` | Yetki + koltuk limiti | Koltuk limiti, plan-rol kısıtı, e-posta uyuşmazlığı, süresi dolmuş token |
| Sweep endpoint | `src/app/api/internal/scans/sweep/route.ts` | Crash recovery'nin tek prod tetikleyicisi | `CRON_SECRET` yoksa prod'da 401; fan-out sayımı |
| Monitor scheduler | `src/app/api/internal/monitors/run/route.ts` | Duplicate scan riski | Aynı monitor iki kez claim edilemez (lease) |
| PageJob işleme | `worker/process-page-job.ts` | B28; page-jobs rollout'unun kalbi | `persistPageResult` throw ederse pageJob `failed`/requeue olmalı, fırlatmamalı |
| Serve modu | `worker/serve.ts` | B04 sıcak döngüsü | Claim edilemeyen pageJob'lar varken `drainWork` sonlu turda çıkmalı |
| Statement XSS | `src/app/statement/[id]/route.test.ts` | **Mevcut test güvensiz davranışı kilitliyor** (satır 76-77) | XSS payload'ının escape edildiğini doğrulayan negatif test |
| Public share | `src/app/r/[token]/route.ts` | Kimliksiz veri açığa çıkarma | Geçersiz/silinmiş token → 404; 16 karakterden kısa token → 404 |
| Görsel kanıt | `src/app/api/visual-evidence/**` | Tenant izolasyonu | Başka workspace'in evidence id'si → 404 |
| Silme | `src/lib/data/deletion.ts` | GDPR vaadi. B26 | Retention cutoff doğruluğu; verify-retry döngüsü |

**Tenant izolasyonu için sistematik boşluk:** Hiçbir testte "A workspace'inin kullanıcısı B workspace'inin kaynağına erişemez" senaryosu yok. `requireSession` her yerde `ctx.workspaceId` döndürdüğü ve tüm repository fonksiyonları `workspaceId` aldığı için tasarım doğru; ama regresyon koruması yok. Her `[id]` route'u için bir "cross-tenant 404" testi önerilir.

**CI (`.github/workflows/ci.yml`):** lint → typecheck (app) → typecheck (worker) → test → build; Node 22; 15 dk timeout. Sağlam bir temel. Eksikler:
- `npm audit` / `dependabot` / SCA adımı yok.
- Coverage eşiği yok (`@vitest/coverage-v8` bağımlılıklarda var ama CI'da çalıştırılmıyor).
- SAST (CodeQL / semgrep) yok — B01 gibi template-literal XSS'leri semgrep kuralı yakalardı.
- `npm run build` prod env değişkenleri olmadan koşuyor; runtime konfig hatalarını yakalamaz.

**E2E (`.github/workflows/e2e.yml`):** yalnızca public + route-mock lane'leri; authenticated lane `E2E_FIREBASE_*` secret'ları olmadığı için otomatik atlanıyor (`docs/audit-2026-06-11.md` #6 ile tutarlı). Yani **CI'da hiçbir kimlik doğrulamalı akış ve hiçbir gerçek scan pipeline'ı test edilmiyor**. `docs/audit-2026-06-11.md`'de "owners needed" olarak listelenen staging stack hâlâ yok.

---

## 6. Teknik Borç Kaydı

| # | Borç | Yer | Etki | Öneri |
|---|---|---|---|---|
| TD1 | İki paralel worker entrypoint'i (`index.ts` poller, `serve.ts` HTTP) neredeyse aynı iş mantığını kopyalıyor | `worker/index.ts:99-259` ↔ `worker/serve.ts:88-240` | B04/B05 gibi hataları iki kez düzeltmek gerekiyor; testler sadece birini kapsıyor | Ortak `drainOnce(deps)` modülü çıkar, iki entrypoint sadece tetikleyici olsun |
| TD2 | `src/lib/data/firestore.ts` 2379 satır, 80+ export — repository + domain mantığı karışık | tüm dosya | Değişiklik riski yüksek, test etmek zor, import grafiği şişkin | `scans.ts`, `usage.ts`, `team.ts`, `reports.ts`, `monitors.ts`, `remediation.ts` olarak böl |
| TD3 | `src/lib/api/audit.ts` yazılmış ama hiç import edilmiyor | grep: 0 sonuç | B22'nin doğrudan sebebi; ölü kod yanlış güvenlik hissi veriyor | Tüm route'ları buna geçir, `firestore.audit`'i `_auditRaw` yap |
| TD4 | Env parsing her modülde tekrar ediliyor, üç farklı yardımcı fonksiyon | `worker/index.ts:51-54`, `scan-sweeper.ts:29-32`, `page-jobs.ts:13-41`, `browser-manager.ts:408-411`, route'larda ham `Number(...)` | B32; tutarsız min/fallback davranışı | Tek `src/lib/env.ts` (zod ile şema doğrulamalı), boot'ta fail-fast |
| TD5 | Agregasyon bağımsız bir iş tipi değil; son sayfayı bitiren worker'a piggyback | `firestore.ts:1109-1141`, `1342-1381` | `aggregating` takılması sweeper ile "yamanıyor"; B16'nın N+1'i bundan | Runbook'un kendi önerisi: claim edilebilir/retry edilebilir `aggregationJob` |
| TD6 | Aynı sıralı-yazma deseni 6 yerde kopyalanmış (batch chunk'lama) | `firestore.ts:893-949, 951-969, 1426-1440, 1672-1681, 1684-1708`; `deletion.ts:74-85` | B09 tam da bu kopyalardan birinde chunk'lama unutulduğu için oluştu | Tek `chunkedBatchWrite(refs, op)` yardımcısı |
| TD7 | Skorlama, gruplama, önceliklendirme için severity/impact eşlemesi üç farklı yerde | `normalize.ts:32-44`, `scoring.ts:11-17`, `firestore.ts:2267-2278` | B11 ve B43'ün ortak kökü; `priorityForSeverity` "serious"ı hiç görmüyor (severity'de yok ama impact'te var) | Tek `severity.ts` modülü: rank, weight, priority, label |
| TD8 | `docs/production-readiness.md` ile kod arasında kayma | `production-readiness.md:18` "Rate limiting Ready" ✅ doğru; `:94` "Billing remains disabled" ↔ `billing/checkout` tam implement | Operatör yanlış varsayımla hareket eder (B02 riski buradan) | Doküman-kod tutarlılığını CI'da bir smoke test'e bağla |
| TD9 | Sentry/PostHog için elle yazılmış shim, stack frame yok | `observability.ts:46-94` | B30, B35 | `@sentry/nextjs`'e geç veya envelope'a `frames` ekle |
| TD10 | `@types/node ^20` vs `engines 22.x`; `next 16.2.6` dev-server hydration bug'ı hâlâ açık | `package.json:5,45`; `docs/audit-2026-06-11.md:14` | Tip kayması; e2e sadece prod build ile koşabiliyor | `@types/node@^22`; Next patch'inde yeniden test |
| TD11 | Repo iCloud senkronize `~/Desktop` altında | çevre | `docs/audit-2026-06-11.md` #4 aynen geçerli — bu denetimde de tsc/vitest **çalıştırılamadı** | `~/dev/percevia`'ya taşı (önceki denetimin de önerisi) |
| TD12 | `PAGE_JOBS_ENABLED` process-geneli tek bayrak | `page-jobs.ts:44-47` | Kademeli rollout imkânsız; B04 riski all-or-nothing | Workspace bazlı bayrak (`workspaces/{id}.features.pageJobs`) |

---

## 7. Doğrulanamadı / Varsayım

Aşağıdakiler **kodda kesin olarak doğrulanamadı**; tahmin yürütmedim, açıkça işaretliyorum:

1. **`npm run typecheck` / `npm test` sonuçları.** Sandbox shell'i repo dosyalarını okuyamıyor (`Resource deadlock avoided`); `npx vitest` ve `tsc` binary'leri de aynı sebeple çalışmadı. `docs/audit-2026-06-11.md` 2026-06-11'de "172 passed, 3 skipped" ve temiz typecheck rapor ediyor; o tarihten bu yana kırılma olup olmadığını **doğrulayamadım**.
2. **B02'nin canlı istismar edilebilirliği** tamamen prod'da `POLAR_ACCESS_TOKEN`'ın set olup olmamasına bağlı. `.env` dosyalarını okumadım/okuyamadım. `docs/production-readiness.md:94` "Billing remains disabled" diyor, bu risk lehine bir işaret ama kesin değil.
3. **Polar abonelik durum semantiği.** `isEntitledStatus` yalnızca `active`/`trialing` kabul ediyor (`polar.ts:68-70`). Polar'ın `subscription.canceled` olayını dönem sonunda mı yoksa iptal talebi anında mı `status: "canceled"` ile gönderdiğini repodan doğrulayamadım. Eğer iptal talebi anında gönderiyorsa, kullanıcı ödediği dönemin kalanında erişimi kaybeder (`cancelAtPeriodEnd` ve `currentPeriodEnd` hiç kontrol edilmiyor — `webhook/route.ts:53, 72-79`). **Polar dokümanıyla doğrulanmalı.**
4. **B21 — `validateEvent(body, headers, "")` davranışı.** `@polar-sh/sdk/webhooks`'un boş secret ile fail-closed olup olmadığını (ve hangi hata tipini fırlattığını) SDK kodunu okumadan doğrulayamadım. `WebhookVerificationError` dışında bir hata fırlatırsa route 500 döner (fail-closed) — muhtemelen güvenli, ama açık değil.
5. **B46 — `sanitizeCallback` open redirect.** `/\evil.com` gibi bir değerin istemcide (`router.push`) protokol-göreli URL olarak yorumlanıp yorumlanmadığını test etmedim. Sunucu tarafında `Location` header'ı üretilmiyor, değer JSON `redirectTo` olarak dönüyor; risk istemci kodunun davranışına bağlı.
6. **B24 — metadata SSRF'in gerçek istismar edilebilirliği.** GCP metadata sunucusu `Metadata-Flavor: Google` header'ı istiyor ve CORS izni vermiyor; tarayıcı JS'i yanıtı *okuyamaz*. Yani bu muhtemelen sadece "blind SSRF" (yan etki tetikleme). Yine de alt kaynak host filtresinin olmaması gerçek ve düzeltilmeli.
7. **Firestore index yeterliliği (kısmi).** `workspaceInvitations (workspaceId, status)` ve `dataDeletionJobs (workspaceId, status)` sorguları iki eşitlik filtresi kullanıyor. Firestore'un tek-alan index merge özelliğinin bunları karşılayıp karşılamadığını **canlı projede doğrulamadım**. `auditLogs (workspaceId, createdAt DESC)` composite'i ise kesinlikle gerekli ve kesinlikle eksik (B13) — kodun kendi fallback'i bunun kanıtı.
8. **Cloud Scheduler / Cloud Tasks konfigürasyonu.** `scripts/deploy-cloud-run.sh` dosyasını okumadım; sweeper ve monitor cron job'larının gerçekten kurulu olup olmadığı repo dışı bir gerçek (B31).
9. **Vercel plan limitleri.** Birden fazla route `export const maxDuration = 300` kullanıyor (`internal/scans/sweep`, `cron/data-retention`, `internal/monitors/run`). Hobby planında bu değer izin verilmez/kırpılır. Deploy planı bilinmiyor.
10. **`scripts/cleanup-stuck-scan*.ts` ve `scripts/admin-clear-scan-data.ts`** içeriklerini okumadım (runbook'ta referans veriliyor, `src/lib/data/cleanup-stuck-scan-utils.ts` için test mevcut). Bu manuel operatör araçlarının güvenlik/idempotency özellikleri denetlenmedi.
11. **UI katmanı (`src/components/**`, `src/app/app/**`)** bu denetimde kapsam dışı bırakıldı (öncelik listesi backend/pipeline odaklıydı). Yalnızca `JSON.parse`/`dangerouslySetInnerHTML` taraması yapıldı — `dangerouslySetInnerHTML` kullanımı **yok**, localStorage `JSON.parse` çağrılarının hepsi try/catch içinde (`A11yProvider.tsx:30-35`, `statement-client.tsx:54-59`) veya düşük riskli.
12. **B23'ün gerçek erişilebilirlik yüzeyi.** Cloud Run worker'ının VPC/ağ konfigürasyonunu bilmiyorum. Eğer worker VPC connector'a bağlı değilse ve sadece public internet'e çıkıyorsa, DNS rebinding'in ulaşabileceği "iç" hedef sadece metadata sunucusu olur ve etki daha düşüktür.

---

## 8. Önerilen Aksiyon Sırası

1. **Bugün:** B01 (XSS — S), B06 (401 — S), B02 (plan fail-closed — S), B03 (retry izin+kota — S).
2. **Bu hafta:** B05 (terminal durum transaction'ı — M), B04 (pageJob temizliği + backoff — M), B07 (skor doğruluğu — M), B09/B12/B13/B19/B22/B32 (hepsi S).
3. **Bu sprint:** B08, B10, B11, B17, B18, B20, B25, B28, B29, B34 + `src/app/api/scans/route.ts` ve `persistence.ts` için test yazımı.
4. **Sonraki sprint:** B14/B15/B16 (N+1'ler), B23/B24 (SSRF sertleştirme), B26 (retention sayfalama), B31 (scheduler'ı versiyonla), TD1/TD2/TD5.
5. **Sürekli:** CI'ya coverage eşiği + semgrep/CodeQL + `npm audit`; staging stack'i sağlayıp authenticated e2e lane'ini aç (2026-06-11 denetiminden devreden madde).
