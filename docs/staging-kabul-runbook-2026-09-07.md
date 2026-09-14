# Percevia — staging kabul koşumu

Bu belge uygulanacak işlemleri tarif eder; başarılı staging koşumunun kanıtı değildir. Yalnız bu çalışma için ayrılmış staging Firebase projesi ve taranmasına izin verilmiş fixture sitesi kullanılmalıdır. Production verisi kabul fixture'ı değildir.

## Çalışma zamanı ve hazırlık

- Node 22 kullanın (`nvm use 22`). `npm ci`, `npm run release:manifest`, `npm run typecheck`, `npm run worker:typecheck`, `npm run lint`, `npm test`, `RUN_BROWSER_TESTS=1 npx vitest run src/lib/scanner/playwright-runner.integration.test.ts`, `npm run build` çalıştırın.
- İncelenen değişiklikleri mantıksal commit'lere ayırın. Commit edilmemiş çalışma ağacı staging/production manifesti üretemez.
- `firestore.indexes.json` içindeki `scans / baseUrl + status + createdAt` bileşik indeksini staging'e yayınlayın ve hazır olmasını bekleyin. Koleksiyon grubu `manualReviews` varsayılan belge kimliği indeksiyle denetlenir.
- Firebase service account izinleri yalnız staging projesine verilmeli. Kimlik bilgilerini belgeye, loga veya Git'e yazmayın.

## GitHub yapılandırması

`staging` GitHub environment'ında aşağıdaki secret'lar gerekir:

| Secret | Amaç |
| --- | --- |
| `E2E_FIREBASE_PROJECT_ID` | Ayrılmış staging projesi |
| `E2E_FIREBASE_CLIENT_EMAIL` | Aynı projenin servis hesabı |
| `E2E_FIREBASE_PRIVATE_KEY` | PEM private key; gerçek veya escaped yeni satır desteklenir |
| `E2E_FIREBASE_API_KEY` | Firebase web API key; testte `NEXT_PUBLIC_FIREBASE_API_KEY` olarak aktarılır |

Environment variable'ları:

- `E2E_EXPECTED_FIREBASE_PROJECT_ID`: staging proje kimliği için bağımsız allowlist.
- `E2E_FIXTURE_URL`: herkese açık erişilebilir, tarama yetkisi verilmiş test sitesi. Worker bu siteyi gerçekten tarar.

`CI / authenticated`, yalnız main push olayında secret alır. PR koduna secret aktarılmaz. PR raporunda authenticated E2E skipped açıkça belirtilir; main üzerinde aynı atlama release-gate'i başarısız yapar. `verify`, `engine`, `e2e`, `release-gate` main dalında zorunlu olmalıdır.

Her CI koşumu ayrı bir test kullanıcısı oluşturur; teardown yalnız bu kullanıcının sahip olduğu workspace ve ilişkili fixture verisini temizler. Temizleme kanıtı olmadan başarı raporu üretilmez.

CI, incelenen kaynak koddan web uygulaması ve Node 22 poll worker'ını başlatır ve gerçek staging Firebase'e bağlanır. Bu, dağıtılmış Cloud Tasks → Cloud Run zincirinin kabulü değildir; bu zincir aşağıdaki ayrı staging deploy adımıyla doğrulanmalıdır.

`authenticated-staging-evidence` artifaktında JSON/HTML test raporu, token içermeyen `auth-fixture.json`, doğrulanmış test sayısı/commit/Node içeren `authenticated-evidence.json` ve build manifesti bulunmalıdır. Oturum cookie dosyaları ve authenticated network trace'leri yüklenmez.

Eklenen `manual-review-lifecycle.spec.ts`, gerçek oturumla revision ve 701 review kaydının scan DELETE akışında temizlenmesini sınar. Aşağıdaki daha geniş matris bununla kapanmış sayılmaz.

## Tekrarlanabilir kabul matrisi

Her koşum için commit SHA, manifest, fixture kayıt kimlikleri, beklenen sonuç, gözlenen sonuç ve temizleme sonucu kaydedilir. Aşağıdaki satırlar CI sonucundan otomatik olarak tamamlanmış sayılmaz.

| Senaryo | Fixture / işlem | Kanıt | Temizleme |
| --- | --- | --- | --- |
| Rol matrisi | Owner, editor, auditor, viewer, report_viewer; API ve doğrudan sayfa erişimi | HTTP izin matrisi ve sayfa sonucu | Yalnız test üyeliklerini kaldır |
| Giriş/persona/dil | Yeni kullanıcı + mevcut kullanıcı; TR persona callback | signup/login olayları ve callback hedefi; TR devamlılığı | Test kullanıcı ve analytics kayıtları |
| Tarama zinciri | Fixture URL için single scan; Cloud Tasks ile staging worker | Tamamlanmış scan, pages, groups, summary; `comparisonProfile` içinde playwright-axe ve beklenen motor sürümü | API DELETE + alt koleksiyon count |
| Eşdeğer karşılaştırma | Aynı fixture iki kez; ikinci sürümde gerçek erişilebilirlik düzeltmesi | `verified_fixed`, score değişimi, matching profile | İki taramayı sil |
| Yeniden açılma | İlk bulgu → düzeltilmiş scan → aynı bulgunun döndüğü scan | Üç tarama eşdeğer; `reopened` | Üç taramayı sil |
| Uyumsuz karşılaştırma | Eksik URL, farklı viewport/motor/skor/fingerprint, tamamlanmamış scan | `comparable=false`, neden kodları; yeşil fixed sonucu yok | Fixture taramalarını sil |
| Ortak manuel inceleme | İki kullanıcı aynı check'i sırayla/eşzamanlı kaydeder | Revision artışı, reviewer kimliği, izin reddi | Scan silme |
| Tek scan silme | 701 manualReviews + rapor/paylaşım/AI verisi | DELETE sayımları; tüm alt koleksiyonlar sıfır | İdempotent tekrar |
| Workspace silme | Ayrı workspace, normal ve ana scan'i olmayan review verisi | DataDeletionJob completed + verifiedAt, alt koleksiyon count sıfır | Fixture workspace/üyelikleri kaldır |
| Retention | Yalnız bu test için ayrılmış Firebase projesinde eski/yeni scan | Eski scan ve review sıfır, yeni scan duruyor; hata varsa retryScanIds ve HTTP 500 | Test projesinin fixture kayıtları |
| Bildirim | Kritik bulgu/skor düşüşü; sweep'i iki kez çağır | Aynı dedupe anahtarında tek olay | Test monitor/olayları |
| Ödeme | Sağlayıcının sandbox checkout, webhook tekrar ve başarısız webhook | Plan geçişi, audit, tekil işlem; iptal/gecikme davranışı | Sandbox abonelik ve fixture |
| Rapor | TR arayüzden HTML/PDF/CSV/JSON export | Dil kontrolü, manuel inceleme, profile ve belirsizlik nedeni | Fixture raporları/paylaşımları |
| Release | Staging app `/api/internal/release` + worker `/health` | Commit, scanner, axe, Playwright, fingerprint, score, Firebase projesi eşleşiyor | Salt okunur |

## Yetim manuel inceleme denetimi

Kimlik bilgileri staging ortamından sağlanarak:

```bash
node --import tsx scripts/audit-orphan-manual-reviews.ts --report=/private/tmp/manual-review-audit.json
```

İlk komut veri silmez; rapor dosyası zaten varsa üstüne yazmaz. Raporu inceleyip silinecek yolları onayladıktan sonra aynı dosyayla:

```bash
node --import tsx scripts/audit-orphan-manual-reviews.ts --report=/private/tmp/manual-review-audit.json --apply
```

Apply, rapordaki Firebase projesini kontrol eder ve her kayıt için parent scan'in hâlâ bulunmadığını transaction içinde tekrar doğrular. Canlı scan'in verisini silmez. Başarısız yollar `.result.json` dosyasına yazılır; aynı rapor tekrar kullanılabilir.

## Yayın kararı

- Yerel test sonucu staging kabulünü kapatmaz.
- `RELEASE_ENVIRONMENT=production` ile worker deploy, temiz çalışma ağacı ve aynı commit için başarılı main CI koşumu + süresi dolmamış authenticated artifaktı olmadan başlamaz.
- Vercel dashboard/otomatik production deploy yolunun da gerekli CI kontrollerini beklemesi ayrıca yapılandırılmalıdır; CLI betiğindeki kontrol dashboard'dan yapılan yayını engellemez.
- Production smoke-test staging sonuçlarının yerine geçmez. Ödeme, retention ve silme kanıtları ayrıca saklanır.
- E-posta sağlayıcısı, plan/kota kararları, TR rapor çeviri kapsamı ve eski localStorage import onayı planın sonraki fazlarında ele alınır.
