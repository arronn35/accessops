# Percevia — Claude ve Codex birleşik durum derlemesi

7 Eylül 2026. Bu belge, ilk denetimin 18 maddesini, Claude'un sonraki uygulamalarını ve güncel kaynak kodu incelemesinde görülen eksikleri birleştirir. İlk rapor tarihsel kanıt olarak korunmuştur: [İlk araştırma ve denetim](/Users/efearronn/Desktop/dev/accessops/docs/arastirma-ve-denetim-2026-09-07.md).

**Ana değerlendirme:** Güvenlik, ödeme koruması, erişilebilirlik ve ortak inceleme işlevlerinde önemli ilerleme var. Ancak “18 madde ele alındı” ifadesi “18 madde tamamen kapandı” anlamına gelmiyor. Gerçek oturumlu yayın doğrulaması, karşılaştırma güvenilirliğinin kalan koşulları ve yeni kayıtların silme yaşam döngüsü tamamlanmadan bütün sistemin doğrulandığı söylenemez.

## Claude nerede durmuş?

Claude uygulamasındaki **“Percevia güvenlik ve ödeme kapısı”** oturumu incelendi. Oturum kimliği: `local_44d4425f-169a-4997-8c8f-39a97fd600f7`. Görünen dal: `feat/scan-monitoring-foundation`. Oturum son özetini vermiş ve beklemedeydi; son aşama mobil navigasyon ve kalan ürün kararlarının değerlendirilmesiydi.

Claude, F01–F18'i 14 aşamada ele aldığını bildirmiş. Fiyatlandırma, mobil sayfa uzunluğu ve eski fingerprint kayıtları için kararlar; e-posta teslimi, rapor çevirisi, release manifest ve eski manuel kayıtların taşınması için işler bırakmış. Kendi son özetinde 122 değişiklikten, bunların bir kısmının önceden mevcut olduğundan ve commit edilmediğinden söz ediyor. Çalışma ağacında geniş kapsamlı değişiklikler bulunduğu ayrıca görüldü; bütün değişiklikleri tek başına Claude'a atfetmek doğru olmaz.

Bu incelemede yeni commit veya canlı dağıtım kanıtı doğrulanmadı. Aşağıdaki “uygulanmış” durumları yerel kodu anlatır; canlı ortamda kapanış anlamına gelmez.

## İlk 18 maddenin güncel karşılığı

| Madde | Güncel durum | Yapılan ve kalan iş |
|---|---|---|
| F01 — Rol ve export izinleri | Kodda uygulanmış | Alt API'lere izin kontrolü, CSV'ye export izni eklendi. Sonraki turda sunucuda render edilen sayfalara da izin denetimi ve `/app/no-access` akışı eklenmiş. Gerçek kullanıcı/rol matrisi staging üzerinde doğrulanmalı. |
| F02 — Yanlış “düzeltildi” sonucu | Kısmen tamamlandı | Element kimliği kök nedenden ayrılmış; fingerprint v2, kapsam kontrolü ve `inconclusive` eklendi. Eski taramanın tamamlanması kontrol ediliyor. Yeni taramanın durumu, viewport/motor/skor sürümü eşdeğerliği ve son 50 tarama sınırı hâlâ açık. |
| F03 — Ödemesiz plan yükseltme | Varsayılan koruma uygulanmış | Production'da doğrudan plan seçimi varsayılan kapalı; Polar durumuna göre checkout veya yapılandırma hatası var. `ALLOW_DIRECT_PLAN_SELECT=true` production'da da açabildiğinden dağıtım ayarı ve gerçek ödeme/webhook akışı ayrıca doğrulanmalı. |
| F04 — CI ve gerçek oturum kapsamı | Kısmen tamamlandı | Node 22 üzerinde E2E ve gerçek motor işleri eklenmiş. Oturumlu testlerin secrets aktarımı eksik; bildirim gerçek çalışma sonucunu doğrulamıyor. Aşağıdaki B02 öncelikli. |
| F05 — Örnek rapor kontrastı | Düzeltme uygulanmış | Kod alanının renkleri değiştirilmiş. Claude tarayıcı/axe kontrolünün geçtiğini bildiriyor; bu tur görsel test yeniden koşulmadı. |
| F06 — Bağlantılar yalnız renkle ayrılıyor | Düzeltme uygulanmış | Hukuki içerik bağlantılarına kalıcı alt çizgi eklenmiş. |
| F07 — 320 px yatay taşma | Düzeltme uygulanmış | Grid öğelerine `min-w-0` uygulanmış; Claude 320 px doğrulamasını geçtiğini bildiriyor. |
| F08 — Manuel inceleme yalnız cihazda | Çekirdek işlev uygulanmış; yaşam döngüsü eksik | Firestore kaydı, reviewer, tarih, revision, izin denetimi ve rapora aktarım var. Eski localStorage verisi taşınmıyor. Yeni koleksiyonun silme akışında unutulması B01'de açıklanıyor. |
| F09 — Persona bilgisi kayboluyor | Persona akışı uygulanmış | Callback boyunca taşınıyor ve workspace'e kaydediliyor; başlangıç önerileri buna bağlanmış. Ayrıca kalıcı saklanmayan acknowledgement için yanıltıcı tekrar erişim metni düzeltilmiş; acknowledgement kalıcılığı ayrı bir açık iş. |
| F10 — Her giriş signup sayılıyor | Düzeltme uygulanmış | Session akışında `isNewUser` üzerinden login/signup ayrımı var. Gerçek analytics toplama ve funnel doğruluğu ayrıca izlenmeli. |
| F11 — Regresyon e-postası yok | Kısmen tamamlandı | Yeni kritik bulgu/skor düşüşü için uygulama içi bildirim, dedupe ve monitor bağlantısı eklenmiş. E-posta sağlayıcısı ve teslim zinciri yok. |
| F12 — Fiyatlandırma vaatleri | Envanter ve test koruması var; ürün açığı sürüyor | 10 uygulanmayan veya planlara göre ayrıştırılmayan vaat kayıt altına alınmış. Listeyi test etmek website kotası ya da plan yetkisi uygulamak değildir. |
| F13 — Türkçe akış eksik | Kısmen tamamlandı | Dil seçimi ve sayfalar arası kalıcılık geliştirilmiş. Sunucuda üretilen raporların çevirisi açık. |
| F14 — Canlı/yerel sürüm farkı | Kısmen tamamlandı | Oturum callback'i merkezi ve daha güvenli hâle getirilmiş. Release manifest ve canlı ortamın test edilen commit ile eşleşmesi henüz doğrulanmış değil. |
| F15 — SEO/canonical | Temel düzenleme uygulanmış | Claude 13 public sayfada canonical ve özel alanlarda noindex düzenlemesi bildiriyor. Aynı URL'de cookie ile dil seçildiği için hreflang eklenmemiş; bu tek başına hata sayılmamalı. |
| F16 — Mobil gezinme ve uzun sayfa | Kısmen tamamlandı | Erişilebilir açılır mobil menü eklenmiş. Ana sayfa hâlâ yaklaşık 20.598 px; Claude'un 390×844 ölçümünde yaklaşık 24 ekran, fiyatlandırma yaklaşık 14 ekran aşağıda. İçerik kısaltılmamış. |
| F17 — Sentetik verinin canlı sanılması | Metin düzeltmesi uygulanmış | Ürün önizlemesinin örnek/sentetik niteliği daha açık etiketlenmiş. |
| F18 — Ön kontrolde 100/A kesinliği | Sunum iyileştirilmiş | API limitations bilgisi ve ilk HTML kapsamı skorun yanında gösteriliyor. Bu, gerçek etkileşim kapsamını artırmıyor; tam güven paneli için ek iş var. |

## Birleşik incelemede öne çıkan ek sorunlar

### B01 — P1: Manuel inceleme kayıtları silme işlemlerinden sonra kalabilir

Yeni kayıtlar `scans/{scanId}/manualReviews/{checkId}` altında tutuluyor. Fakat `deleteScanCompletely`, `pageJobs`, `pages`, `issues`, `groups` ve `meta` koleksiyonlarını temizlerken `manualReviews` koleksiyonunu işlemiyor. Aynı yardımcı workspace silme ve retention akışında da kullanılıyor; silme sayımları yeni kayıt türünü içermiyor.

Firestore'da üst belgenin silinmesi alt koleksiyonları otomatik silmez. Bu nedenle tarama silindiği hâlde reviewer bilgileri ve notları kalabilir. Bu davranış [Firebase'in resmi silme dokümanında](https://firebase.google.com/docs/firestore/manage-data/delete-data) açıklanıyor.

**Kanıt:** [kayıt konumu](/Users/efearronn/Desktop/dev/accessops/src/lib/data/firestore.ts:1685), [silme akışı](/Users/efearronn/Desktop/dev/accessops/src/lib/data/deletion.ts:103). Kodda eksik entegrasyon doğrulandı; canlı veriler üzerinde silme testi yapılmadı.

**Kapanış ölçütü:** Tarama silme, workspace silme ve retention sonrasında manuel inceleme belgeleri sıfır; sayımlar ve artık veri doğrulaması bunları kapsıyor. Daha önce oluşmuş yetim kayıtlar varsa ayrıca tespit edilmeli.

### B02 — P1: CI oturumlu testler koşulmadan “çalıştı” diyebilir

E2E adımına yalnız `PUBLIC_CHECK_ENABLED` aktarılıyor. Oturumlu testler ise Firebase project ID, client email, private key ve public API key bekliyor. Workflow bu secrets değerlerini test işlemine aktarmıyor. Sonraki adım yalnız project ID secret'ının varlığına bakıp “Ran against staging Firebase” yazıyor; test projesinin gerçekten çalıştığını denetlemiyor.

Secret yokken de yalnız warning veriliyor. Metinde “release gate” denmesi teknik olarak yayın engeli oluşturmaz. GitHub branch protection veya harici bir dağıtım kapısı bu tur incelenmedi.

**Kanıt:** [workflow](/Users/efearronn/Desktop/dev/accessops/.github/workflows/ci.yml:93), [oturumlu test koşulları](/Users/efearronn/Desktop/dev/accessops/e2e/authenticated/fixtures.ts:15). Bu bulgu kaynak kodundan doğrulandı; GitHub Actions çalışması yeniden tetiklenmedi.

**Kapanış ölçütü:** Gerekli tüm staging değişkenleri güvenli şekilde test adımına aktarılıyor; oturumlu projenin çalıştığı rapordan doğrulanıyor; zorunlu yayın kontrolünde eksik veya atlanmış testler başarı sayılmıyor.

### B03 — P1/F02 devamı: Karşılaştırmanın tüm ön koşulları kapanmamış

`resolveComparison` açıkça seçilen eski taramanın tamamlanmasını kontrol ediyor, yeni taramaya aynı kontrolü uygulamıyor. Kapsam bilgisi URL'ler, başarısız sayfa sayısı ve fingerprint sürümünü içeriyor; viewport, tarama motoru ve skor sürümü eşdeğerliğini kapsamıyor. Otomatik eski tarama seçimi workspace'in son 50 taramasıyla sınırlı; yoğun kullanımda aynı siteye ait uygun bir önceki tarama dışarıda kalabilir.

**Kanıt:** [karşılaştırma servisi](/Users/efearronn/Desktop/dev/accessops/src/lib/server/compare.ts:97). Eksik kontroller kaynakta görüldü; güncel kodda yanlış sonuç senaryoları bu tur tekrar üretilmedi. Eski renk değişimi kusurunu yeni sürümde hâlâ varmış gibi değerlendirmemek gerekir.

**Kapanış ölçütü:** İki tarama da tamamlanmış; karşılaştırılabilir kapsam ve sürümler açık; uygun önceki tarama siteye göre bulunuyor. Eksik veri kesin düzelme sayılmıyor.

## Test kanıtı ve sınırları

| Kontrol | Güncel sonuç | Kanıtın sahibi |
|---|---|---|
| `npm test` | 641 geçti, 8 atlandı; 86 dosya geçti, 1 atlandı | Bu derlemede yeniden çalıştırıldı |
| `npm run lint` | Başarılı, exit 0 | Bu derlemede yeniden çalıştırıldı |
| `npm run typecheck` | Başarılı, exit 0 | Bu derlemede yeniden çalıştırıldı |
| `npm run worker:typecheck` | Başarılı, exit 0 | Bu derlemede yeniden çalıştırıldı |
| Tarayıcı E2E | 42 geçti, 0 hata bildirildi | Claude son özeti; bu tur tekrar koşulmadı |
| Gerçek motor testleri | 8 testin geçtiği bildirildi; ayrı CI işi eklendi | Claude özeti ve workflow; bu tur tekrar koşulmadı |
| Gerçek oturum → tarama → worker → rapor → izin/silme | Uçtan uca kapanış doğrulanmadı | Staging doğrulaması açık |
| Gerçek ödeme/webhook ve yeni kodun canlı karşılığı | Doğrulanmadı | Yayın kapanışı açık |

İlk rapordaki 497 geçen birim test, güncel çalışmada 641'e çıkmış: +144. Test sayısı işlevsel tamamlanma oranı değildir. Varsayılan testte atlanan 8 motor testi ayrı koşum gerektirir. Yerel kabuk önceki tespitte Node 25.9.0 kullanıyordu; desteklenen Node 22 CI ortamı ayrıca önemlidir.

İlk denetim sonrasında üretilen `output` altındaki yardımcı CJS dosyaları lint'e girerek hata oluşturmuş; Claude bunları ve test çıktı klasörlerini ESLint kapsamı dışına almış. Güncel lint temiz. İlk rapordaki “lint geçti” ifadesi o zamanki koşumu anlatır.

`output/audit-2026-09-06/reproduce.test.ts` eski kusurları doğrulayan tarihsel problardır. Kusurları düzeltilmiş kodda bu probların eski beklentilerinin bozulması yeni regresyon sayılmamalı; güncel kabul testlerinden ayrı tutulmalı.

## Ürün kararları ve inovasyonların yeni durumu

Fiyatlandırmada önce hangi vaatlerin gerçekten satılacağı netleşmeli. Registry'deki 10 açık; website sayısı, plan bazlı web raporu/AI/PDF/CSV/API erişimi, çoklu müşteri workspace'i ve remediation erişim ayrımlarını kapsıyor. Bazı özellikler mevcut fakat alt planlarda da kullanılabiliyor; çoklu workspace içinse oluşturma/geçiş deneyimi eksik. Destek/SLA gibi insan tarafından verilen taahhütler ayrıca operasyonel kararlardır.

| İlk rapordaki inovasyon | Şimdi anlamlı sonraki adım |
|---|---|
| Doğrulanmış düzeltme kaydı | Yeni fingerprint temelinin üstüne tam kapsam denetimi ve `verification_pending/verified_fixed/reopened/inconclusive` yaşam döngüsü |
| Ortak manuel inceleme defteri | Temel kayıt ve rapor bağlantısı geldi; silme, eski veri taşıma ve gerçek iki kullanıcıyla doğrulama |
| Anlamlı regresyon bildirimi | Uygulama içi temel geldi; e-posta tercihleri, teslim/yeniden deneme ve teslim kanıtı |
| Ajans müşteri çalışma dosyası | Workspace oluşturma/geçiş, müşteri izolasyonu, plan sınırları ve müşteri rapor görünümü |
| PR'da değişen kapsam denetimi | Preview URL ve değişen sayfa/bileşen eşlemesiyle küçük pilot; henüz tamamlandığına dair kanıt yok |
| Kaydedilebilir kullanıcı yolculukları | Mevcut sınırlı etkileşim betiklerinden sürümlü, tekrar oynatılabilir kullanıcı akışlarına geçiş |
| Kanıta dayanan Türkçe AI düzeltme paketi | Türkçe rapor, kaynak/selector ile açıklama, diff taslağı ve tekrar test sonucu |
| Kapsam ve güven paneli | Ön kontrol açıklaması iyileşti; URL/viewport/durum/motor sürümü/başarısız sayfa ve manuel kalan işlerin tam görünümü |

Bu tablo yeni bir rekabet araştırması değildir; ilk raporun kaynaklı sekiz önerisinin güncel uygulamalar karşısındaki durumudur.

## Önerilen uygulama sırası

1. **Yayın öncesi teknik kapanış:** B01 silme entegrasyonu, B02 gerçek oturumlu CI ve B03 karşılaştırma koşulları. Her biri için mevcut kusuru yakalayan anlamlı regresyon testi.
2. **Gerçek staging kabulü:** Rol matrisi, iki kullanıcıyla manuel kayıt, tarama/worker/rapor zinciri, silme ve retention; ödeme sağlayıcısının test ortamında checkout/webhook. Desteklenen Node 22 ile çalıştırma.
3. **Değişiklik ve sürüm izlenebilirliği:** Mevcut kullanıcı değişikliklerini koruyarak diff incelemesi; mantıksal commit grupları; manifestte commit/build/motor kimliği; dağıtılan sürüm ile test edilen sürüm eşleşmesi.
4. **Ürün sözünün tamamlanması:** Fiyatlandırma metnini gerçek yetkilerle eşleme veya eksik yetki/kotaları uygulama; e-posta teslimi; Türkçe rapor; manuel veri geçişi.
5. **Kullanım ve büyüme:** Mobil ana sayfayı kısaltma ve temel eylemleri öne alma; önce ortak inceleme ve doğrulanmış düzeltme deneyimi, ardından ajans/PR/yolculuk pilotları.

Bu derlemede uygulama kodu değiştirilmedi, commit veya dağıtım yapılmadı. Sonraki işin kapsamı bu listedeki somut kapanış ölçütlerinden seçilebilir; mevcut ilerleme korunarak devam edilebilir.
