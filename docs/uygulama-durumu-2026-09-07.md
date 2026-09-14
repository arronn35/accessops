# Uygulama durumu — 7 Eylül 2026

Kaynak plan: [uygulama-isleme-plani-2026-09-07.md](uygulama-isleme-plani-2026-09-07.md).

İlk teknik paketin kodu uygulandı. Bu kayıt tüm planın veya staging kabulünün tamamlandığı anlamına gelmez. Üretim yayını yapılmadı.

## Faz 0: çalışma ağacı ve sürüm izlenebilirliği

Çalışma başında zaten geniş, commit edilmemiş bir değişiklik kümesi vardı. Mevcut değişiklikler korundu; tek bir toplu feature commit'i oluşturulmadı. Başlangıçtaki diff'in tamamını arşivleme denemesi Git nesnesi okunurken `mmap failed: Operation timed out` hatası verdi. Mevcut durum listesi doğrulama çıktılarında saklandı.

Önceki değişikliklerin alanları: güvenlik/rol izinleri ve internal auth; plan seçimi/ödeme; tarama motoru, karşılaştırma ve gruplama; manuel inceleme/rapor; CI ve deploy betikleri; pazarlama/mobil/TR; regresyon testleri ve araştırma belgeleri. Bunlar bu oturumun yeni değişiklikleri olarak sunulmamalıdır.

Bu paketin önerilen commit grupları:

| Grup | Bu çalışmanın kapsamı |
| --- | --- |
| `fix(data): delete manual reviews with scan lifecycle` | Ortak silme, batch sınırları, kısmi hata sayımları, review transaction'ı, yetim denetim aracı, lifecycle testleri |
| `fix(compare): require equivalent completed scan scope` | Immutable comparisonProfile, motor/viewport/dil/kapsam kontrolleri, sayfalı geçmiş, neden kodları, üç taramayla reopened, UI ve rapor metadata |
| `ci(e2e): enforce authenticated staging tests` | Secret preflight, gerçek rapor kanıtı, fork/PR ayrımı, koşuma özel fixture/cleanup, manuel inceleme lifecycle E2E, release-gate |
| `feat(release): add deployable build manifest` | Build manifesti, internal endpoint, worker health, Docker/Cloud Build, production CI/artifakt kontrolü ve Node 22 |

Önceden değiştirilmiş dosyalarda commit hazırlarken tüm dosya yerine bu işin hunk'ları ayrılmalıdır.

## Uygulanan davranışlar

### B01 — silme yaşam döngüsü

- Scan, workspace ve retention ortak silme yolunda manualReviews temizleniyor.
- Review silme 300'lük batch'lerle çalışıyor; rapor+share çiftleri batch başına en fazla 300 write kullanıyor.
- Başarısız batch sonrası parent korunuyor; tekrar koşum kalan kayıtları temizleyebiliyor. Tamamlanan review silme sayısı, failedOperations ve retryRequired hata sonucunda korunuyor.
- Silme başlamadan parent'a fence yazılıyor. Manual review upsert parent kontrolünü ve revision artışını aynı Firestore transaction'ında yapıyor.
- Workspace temizliği normal sorguda görünmeyen, alt koleksiyonu kalmış eksik scan parent'larını da kontrol ediyor.
- Retention sonucu manualReviewsDeleted, failedScans ve retryScanIds taşıyor; kısmi hata HTTP 500 veriyor.
- Yetim denetimi varsayılan salt rapor modunda; apply yalnız incelenmiş rapordaki yolları, proje eşleşmesi ve transaction içinde parent kontrolüyle siliyor.
- Firestore istemci kuralları manuel incelemeye izin vermiyor; server API silinen/silinmekte olan scan'e erişimi reddediyor.

### B02 — gerçek oturumlu CI

- Node 22 sabitlendi; `.nvmrc` eklendi.
- PR koduna staging secret'ı aktarılmıyor; atlama açıkça raporlanıyor.
- Main koşumunda gerekli değişken, bağımsız staging proje allowlist'i, servis hesabı projesi, RSA private key ve yetkili fixture URL kontrol ediliyor.
- Worker + web gerçek staging Firebase ile çalışacak şekilde bağlandı. Static fallback, gerçek worker koşumu yerine başarılı sayılmıyor.
- Başarı mesajı, JSON test raporu ve doğrulanmış auth fixture/cleanup kanıtı olmadan üretilemiyor. Skipped/flaky/failed testler reddediliyor.
- Her koşum ayrı test kullanıcısı kullanıyor; teardown sahiplik kontrolüyle yalnız kendi fixture verisini temizliyor.
- Gerçek oturumlu 701 review + revision + scan DELETE kabul testi eklendi.
- GitHub `main` koruması gerçekten uygulandı: `verify`, `engine`, `e2e`, `release-gate`; strict=true, enforce_admins=true; force push/silme kapalı.

GitHub repository secret listesi boş döndü. Staging environment secret listesi 404 döndü; ortam/erişim henüz doğrulanamadı. Bu nedenle canlı authenticated koşum yapılmadı.

### B03 — karşılaştırma güvenilirliği

- Her yeni tamamlanmış scan, gerçekten çalıştırılan sayfa metadata'sından comparisonProfile saklıyor. Legacy kayıtların bilinmeyen sürümleri bugünkü sürümle doldurulmuyor.
- Tamamlanmamış eski/yeni scan, viewport/motor/fingerprint/skor/ayar farkı, eksik/fazla URL, başarısız veya atlanan sayfalar kesin sonucu engelliyor.
- Belirsiz karşılaştırma, skor artışı veya azalan instance sayısını iyileşme diye göstermiyor.
- Önceki uygun tarama, aynı URL için indeksli ve sayfalı sorguyla aranıyor; 50 workspace kaydı sınırı kaldırıldı. Otomatik geçmiş penceresi 365 gün.
- verified_fixed yalnız eşdeğer tamamlanmış kapsamda; reopened yalnız önce görülmüş, ara scan'de yok olmuş ve yeniden dönmüş bulgu için üç taramalık kanıtla üretiliyor.
- UI belirsizlik nedenini ve kapsam profilini gösteriyor. HTML/PDF, CSV ve JSON export profile ve comparison evidence taşıyor.
- Yeni Firestore bileşik indeksi henüz staging'e dağıtılmadı.

### Release manifesti

- Commit, dirty durumu, build zamanı/ortamı, Node, uygulama, scanner, axe, Playwright, fingerprint, skor sürümü ve Firebase proje kimliği saklanıyor.
- Manifest `/api/internal/release` üzerinden internal kimlik doğrulamasıyla, worker'da health metadata'sıyla erişilebilir.
- Staging/production build temiz commit, Firebase proje kimliği ve Node 22 istiyor. Release ortamında direct plan select bayrağı reddediliyor.
- Production deploy betiği aynı commit için başarılı main CI koşumu ve süresi dolmamış authenticated artifaktı arıyor.
- Vercel otomatik/dashboard deployment kontrolü ayrıca bağlanmalı; CLI denetimi bu yayın yollarını kontrol etmiyor.

## Yerel doğrulama

Node v22.22.3 kullanıldı.

- 677 test geçti; normal suite'de devre dışı olan 8 browser testi ayrıca Chromium ile çalıştırıldı ve 8/8 geçti.
- Lint, uygulama typecheck, worker typecheck ve Next.js production build geçti.
- B01, B02 ve B03 için düzeltme öncesi kırmızı regresyon çıktıları saklandı.
- Eksik E2E secret'larıyla preflight gerçekten exit 1 verdi; test çalışmış gibi başarı metni üretmedi.
- Playwright'ın public/UI test keşfi 44 test buldu. Bu keşif, bu oturumda 44 browser testinin çalıştırıldığı iddiası değildir.
- Gerçek Firebase authenticated suite, Docker/Cloud Build ve dağıtılmış staging/production smoke testleri henüz çalıştırılmadı.

Kanıt klasörü: `output/verification/implementation-plan-2026-09-07/`. Klasör Git dışında tutulur. Başlıca dosyalar: `tests.txt`, `engine.txt`, `build.txt`, `typecheck.txt`, `lint.txt`, `b01-red.txt`, `b02-red.txt`, `b03-red.txt`, `b03-server-red.txt`, `missing-secrets.txt`, `main-protection.json`.

## Sıradaki işler ve açık yayın koşulları

1. Ayrılmış staging Firebase proje kimliği, servis hesabı ve yetkili fixture URL'sini GitHub staging environment'ına tanımlamak.
2. Yeni Firestore indeksini dağıtmak; incelenen commit'le CI'ı çalıştırıp authenticated artifaktını almak.
3. [Staging kabul runbook'u](staging-kabul-runbook-2026-09-07.md) ile gerçek Cloud Tasks/Cloud Run zinciri, çok kullanıcılı rol/revision, retention, ödeme ve manifest eşleşmesini kanıtlamak.
4. Vercel otomatik production deployment yolunu CI kanıtına bağlamak.
5. Faz 5: satış vaatlerini gerçek plan/kota/rol uygulamasına bağlamak. Bu pakette tam ürün sözleşmesi uygulanmadı.
6. Faz 6: e-posta sağlayıcısı/teslim zinciri, tüm TR rapor çevirileri, onaylı localStorage import'u, acknowledgement kalıcılığı ve genel kapsam paneli.
7. Faz 7: P1 staging kabulü kapandıktan sonra mobil dönüşüm ve pilotlar.

B01–B03 yerelde doğrulandı; staging kabul ölçütleri hâlâ açık. Planın yayın karar listesindeki bütün kutular kapatılmadan üretim onayı verilmemelidir.
