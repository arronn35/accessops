# Percevia 7 ve 8 Entegrasyon Geliştirme Programı

**Durum:** Uygulama onaylandı; entegrasyon devam ediyor
**Tarih:** 28 Ağustos 2026
**Kapsam sahibi:** Percevia ürün, pazarlama ve mühendislik
**Uygulama başlangıcı:** Bu belge onaylandıktan sonra

## 1. Amaç

Bu program iki teslimat hattı içerir.

1. Pazarlama ve güven yüzeylerini geliştir.
2. Ürün analitiğini güvenli ve ölçülebilir biçimde ekle.

Birinci hat tamamlanmadan ikinci hat üretimde açılmaz.

## 2. Kapsam

### 2.1 Birinci teslimat hattı

Bu işler 7. maddenin kapsamındadır.

- Ajans ve Türkiye kurumsal çözüm sayfaları
- Giriş gerektirmeyen sayfa kontrolünün üretimde açılması
- Kontrol edilen URL'nin kayıt ve ilk tarama akışında korunması
- Açıkça etiketlenmiş sentetik pilot programı
- Herkese açık örnek rapor ve indirilebilir örnek PDF
- Demo takvimi hazır olana kadar randevu çağrısı göstermeme
- `Verified Accessibility Audit` ve benzeri riskli ifadelerin kaldırılması
- Enterprise planından yol haritası özelliklerinin kaldırılması
- Veri bölgesi ifadelerinin gerçek dağıtım durumu ile eşleştirilmesi

### 2.2 İkinci teslimat hattı

Bu işler 8. maddenin kapsamındadır.

- Tip güvenli olay sözleşmesi
- Firestore'a yazan birinci taraf analitik uç noktası
- Pazarlama hunisi olayları
- Ürün etkinleştirme olayları
- Sunucu tarafından doğrulanan ödeme ve çıktı olayları
- Gizlilik sınırları
- Olay kalite testleri
- Huni ve etkinleştirme panosu tanımı

## 3. Kapsam dışı işler

Bu program şu işleri yapmaz.

- Alan adı değişikliği
- Gmail adreslerini değiştirme
- SSO
- Mobil uygulama taraması
- MCP sunucusu
- Yeni CI/CD entegrasyonu
- On-premise tarayıcı
- Yeni tasarım sistemi
- Ana navigasyonun yeniden tasarımı
- Kanıt bulunmadan müşteri logosu veya referans sözü yayınlama

## 4. Uygulama ilkeleri

### 4.1 Arayüzü koruma

- Mevcut `MarketingShell`, `SectionTag`, `Aside`, `Logo` ve renk değişkenleri kullanılır.
- Yeni renk, gölge, yazı tipi veya köşe sistemi eklenmez.
- Ana sayfanın mevcut bölüm düzeni korunur.
- Büyük sayfalar Server Component olarak kalır.
- İstemci bileşenleri yalnızca etkileşim gereken alanlara eklenir.
- Yeni üçüncü taraf takvim veya analitik betiği sayfaya gömülmez.

### 4.2 İddia güvenliği

- Otomatik tarama sertifika olarak sunulmaz.
- `verified`, `official`, `legally compliant` ve `protects you legally` ifadeleri kullanılmaz.
- Uyum durumu yalnızca kullanıcı tarafından belgelenen manuel inceleme verisi varsa gösterilir.
- Otomatik sonuçlar `ön bulgu`, `otomatik sinyal` veya `çalışma kaydı` olarak adlandırılır.

### 4.3 Gizlilik

- Analitik olaylar URL, e-posta, şirket adı, HTML, seçici veya ekran görüntüsü taşımaz.
- Tarama içeriği analitik sağlayıcıya gönderilmez.
- İstemci tarafında analitik SDK, çerez ve oturum kaydı kullanılmaz.
- Analitik üretimde varsayılan olarak kapalı olur.
- Hukuk ve alt işleyici metinleri güncellenmeden analitik açılmaz.

### 4.4 Geri alma

- Girişsiz kontrol mevcut `PUBLIC_CHECK_ENABLED` bayrağı ile kapatılabilir.
- Demo bağlantısı bu teslimatta gösterilmez.
- Analitik `ANALYTICS_ENABLED` ile tek adımda kapatılabilir.
- Veri bölgesi doğrulanmamışsa tarafsız metin gösterilir.

## 5. Mevcut durum özeti

Mevcut kod aşağıdaki işleri kısmen tamamlıyor.

| Alan | Mevcut durum | Eksik iş |
|---|---|---|
| Girişsiz kontrol | Bileşen, API, limit ve testler hazır | Üretim bayrağı, mesaj düzeltmesi ve URL aktarımı |
| Rapor | HTML, CSV, JSON ve PDF üretimi hazır | Herkese açık sabit örnek ve indirme akışı |
| Çözüm sayfaları | Ana sayfada genel persona bölümü var | Ajans ve Türkiye kurumsal sayfaları |
| Pilot kanıtı | Yok | Sentetik olduğu açıkça belirtilen örnek iş akışı |
| Demo | Takvim bağlantısı yok | Görünür demo çağrısı eklenmeyecek |
| Güven metni | Güçlü uyarılar var | Bazı yerlerde ters iddialar var |
| Enterprise | Yol haritası öğeleri fiyat kartında | Yalnızca çalışan özellikler gösterilmeli |
| Veri bölgesi | Uygulama içi metin ihtiyatlı | Pazarlama sayfası kesin ve çelişkili |
| Analitik | Sunucu gönderim yardımcısı var | Firestore olay sözleşmesi, çağrılar ve huni yok |

## 6. Teslimat hattı A: Pazarlama ve güven yüzeyleri

### A0. Görsel ve davranış tabanı

**Tahmin:** 0,5 gün

#### İş

- Ana sayfa, fiyat sayfası ve onboarding için referans ekran görüntüleri al.
- 375 px, 768 px ve 1440 px genişliklerini kaydet.
- Klavye sırası ve görünür odak davranışını kaydet.
- Mevcut test sonuçlarını başlangıç değeri olarak kaydet.

#### Yeni test

- `e2e/marketing/visual-regression.spec.ts`

#### Kabul

- Sonraki her teslimat aynı üç genişlikte karşılaştırılabilir.
- Dinamik alanlar görsel testte maskelenir.
- Tasarım değişikliği yalnızca onaylanan yeni bölümlerde görülür.

### A1. İddia güvenliği düzeltmesi

**Tahmin:** 1 gün

#### İş

- `Verified Accessibility Audit by Percevia AI` ifadesini kaldır.
- Rozeti `Accessibility Work Record by Percevia` olarak değiştir.
- Türkçe karşılığını `Percevia Erişilebilirlik Çalışma Kaydı` yap.
- `official digital accessibility statement` ifadesini tarafsızlaştır.
- `Being honest protects you legally` ifadesini kaldır.
- Otomatik ve manuel veriye dayanarak kendiliğinden `partially conformant` sonucu üretme.
- Beyan taslağında kapsam, yöntem, tarih, bilinen engeller ve geri bildirim kanalını göster.

#### Etkilenecek dosyalar

- `src/app/app/compliance/page.tsx`
- `src/app/app/compliance/statement/statement-client.tsx`
- `src/app/statement/[id]/route.ts`
- `src/lib/microcopy/compliance.ts`
- `src/lib/i18n/translations.tr.json`

#### Yeni testler

- `src/app/app/compliance/statement/statement-client.test.tsx`
- `src/app/statement/[id]/route.test.ts`
- Pazarlama ve uygulama metninde yasak iddia taraması

#### Kabul

- `Verified Accessibility Audit` metni depoda bulunmaz.
- Otomatik tarama tek başına uyum sonucu üretmez.
- Yayınlanan beyan otomatik test kapsamını açıklar.
- Rozet erişilebilir adı ve görünür metni aynı anlama gelir.

### A2. Veri bölgesi gerçeği

**Tahmin:** 1,5 gün

#### İş

- Tek bir `deployment posture` veri modeli oluştur.
- Firestore konumu, worker konumu ve uygulama barındırma kapsamını ayrı göster.
- Ortam değeri doğrulanmamışsa `Current` rozeti gösterme.
- `GDPR-friendly default` gibi genel sonuç ifadelerini kaldır.
- Pazarlama ve uygulama içi kartları aynı veri kaynağına bağla.
- Derin sağlık kontrolüne yalnızca güvenli bölge etiketlerini ekle.
- Operasyon belgesine doğrulama adımlarını ekle.

#### Önerilen yapılandırma

- `DEPLOYMENT_POSTURE_VERIFIED=true|false`
- `FIRESTORE_LOCATION_LABEL`
- `SCAN_WORKER_REGION_LABEL`
- `APPLICATION_HOSTING_SCOPE_LABEL`

#### Etkilenecek dosyalar

- `src/lib/deployment-posture.ts` yeni
- `src/app/page.tsx`
- `src/app/app/compliance/region-hosting-card.tsx`
- `src/app/api/healthz/route.ts`
- `docs/worker-deploy.md`
- `docs/production-readiness.md`

#### Kabul

- Pazarlama ve uygulama aynı konum bilgisini gösterir.
- Eksik ortam değerinde kesin bölge iddiası oluşmaz.
- Kullanıcı tercihi veri taşıma işlemi gibi gösterilmez.
- Sağlık uç noktası gizli proje kimliği yayınlamaz.

### A3. Çözüm sayfaları

**Tahmin:** 2 gün

#### Sayfalar

- `/solutions/agencies`
- `/solutions/turkiye`

#### Ajans sayfası içeriği

1. Ajans sorunu
2. Tarama ve kök neden gruplama
3. Markalı rapor
4. Düzeltme panosu
5. İnsan incelemesi sınırı
6. Örnek rapor çağrısı
7. Demo ve ücretsiz kontrol çağrısı

#### Türkiye sayfası içeriği

1. 2025/10 Genelgesi bağlamı
2. İnceleme Komisyonu çalışma ihtiyacı
3. Otomatik taramanın sınırı
4. Teknik bulgu ve düzeltme kaydı
5. Rapor kapsamı
6. Mobil uygulama kapsamının Percevia web taraması dışında olduğu uyarısı
7. Demo ve örnek rapor çağrısı

#### Teknik yaklaşım

- Ortak `SolutionPage` Server Component oluştur.
- İçerikleri tip güvenli veri nesnelerinde tut.
- Türkçe ana içerik `lang="tr"` ile işaretlenir.
- Sayfalar mevcut çerçeve ve bölüm numarası dilini kullanır.
- Sayfa bazlı metadata ve canonical tanımlanır.
- Sitemap güncellenir.

#### Etkilenecek dosyalar

- `src/components/marketing/SolutionPage.tsx` yeni
- `src/lib/marketing/solutions.ts` yeni
- `src/app/solutions/agencies/page.tsx` yeni
- `src/app/solutions/turkiye/page.tsx` yeni
- `src/components/marketing/SiteHeader.tsx`
- `src/components/marketing/SiteFooter.tsx`
- `src/app/sitemap.ts`

#### Kabul

- Sayfalar JavaScript olmadan ana içeriği gösterir.
- Sayfalar 320 px genişlikte yatay taşma üretmez.
- Türkçe içerik ekran okuyucu için doğru dil kapsamına sahiptir.
- Ana navigasyon yüksekliği ve mevcut hücre çizgileri değişmez.

### A4. Örnek rapor

**Tahmin:** 1,5 gün

#### İş

- Northwind adlı açıkça kurgusal bir site için sabit rapor girdisi oluştur.
- Gerçek müşteri veya üçüncü taraf verisi kullanma.
- Aynı girdiden HTML ve PDF üret.
- HTML örneğini pazarlama çerçevesi içinde önizle.
- PDF dosyasını statik olarak sun.
- İlk e-posta için üç sayfalık kısa sürüm üret.
- Raporda otomatik test sınırını görünür tut.

#### Teknik yaklaşım

- İstek anında Chromium çalıştırma.
- Tekrarlanabilir üretim betiği kullan.
- Üretilen PDF'yi `public/samples/` altında tut.
- Rapor oluşturucu değiştiğinde betik tekrar çalıştırılır.

#### Etkilenecek dosyalar

- `src/lib/reports/sample-input.ts` yeni
- `scripts/generate-sample-report.ts` yeni
- `src/app/sample-report/page.tsx` yeni
- `public/samples/percevia-sample-accessibility-report.pdf` yeni
- `src/app/page.tsx`
- `src/components/marketing/SiteFooter.tsx`

#### Kabul

- Örnek rapor kayıt istemeden açılır.
- PDF istemci verisi içermez.
- HTML ve PDF aynı bulgu sayılarını gösterir.
- PDF'de kırpılmış metin, taşan tablo ve siyah kutu yoktur.
- Dosya erişilebilir bir indirme adı taşır.

### A5. Müşteri kanıtı ve pilot kanıtı

**Tahmin:** 1 gün

#### İş

- Doğrulanmış kanıtlar için küçük bir içerik modeli oluştur.
- Kanıt yoksa logo veya referans sözü gösterme.
- Kanıt yokken `Founding pilot program` çağrısı göster.
- Kanıt kaydı şu alanları zorunlu kılar:
  - Yayın izni
  - Kaynak kişi veya anonimlik durumu
  - Ölçülen başlangıç değeri
  - Ölçülen sonuç
  - Tarih
  - Kapsam ve sınırlama
- İlk gerçek pilot geldiğinde aynı bileşen vaka kartına dönüşür.

#### Etkilenecek dosyalar

- `src/lib/marketing/proof.ts` yeni
- `src/components/marketing/ProofSection.tsx` yeni
- `src/app/page.tsx`
- `src/app/solutions/agencies/page.tsx`

#### Kabul

- Kanıt kaydı olmadan müşteri logosu görünmez.
- Sayısal sonuç kaynak ve kapsam taşır.
- Anonim vaka açıkça anonim olarak işaretlenir.
- Kanıt bölümü boş veri ile düzeni bozmaz.

### A6. Girişsiz kontrol ve URL aktarımı

**Tahmin:** 2 gün

#### İş

- Mevcut public checker üretimde kontrollü olarak açılır.
- Sonuç kartında `Grade A-F` kaldırılır veya `Automated signal` olarak yeniden adlandırılır.
- URL, onboarding ve giriş bağlantılarında güvenli biçimde korunur.
- Workspace kurulumundan sonra kullanıcı yeni tarama sayfasına gider.
- Yeni tarama formu URL'yi önceden doldurur.
- URL her adımda tekrar doğrulanır.
- URL analitik olayına eklenmez.

#### Akış

`/` -> `/api/public-check` -> `/onboarding?url=...` -> `/auth/sign-in?callbackUrl=...` -> `/workspace/setup?url=...` -> `/app/scans/new?url=...`

#### Güvenlik

- Mevcut SSRF doğrulaması korunur.
- Mevcut 4 KB gövde sınırı korunur.
- Mevcut IP ve user-agent hash limiti korunur.
- Ham IP saklanmaz.
- Sonuç kalıcı depoya yazılmaz.
- Üretim açılışı kademeli yapılır.

#### Etkilenecek dosyalar

- `src/components/marketing/PublicCheckForm.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/onboarding/onboarding-client.tsx`
- `src/app/workspace/setup/page.tsx`
- `src/app/app/scans/new/page.tsx`
- `src/lib/scanner/url-validation.ts`
- `src/lib/config.ts`

#### Kabul

- Kullanıcı aynı URL'yi yeniden yazmaz.
- Harici veya çift eğik çizgi callback değeri reddedilir.
- URL yalnızca `http` ve `https` olur.
- Kayıt iptal edilirse tarama oluşturulmaz.
- Bayrak kapalıyken ana sayfa mevcut `Start free scan` davranışına döner.

### A7. Demo çağrısı

**Tahmin:** 0,5 gün

#### İş

- Takvim URL'si yapılandırma ile verilir.
- Takvim betiği veya iframe yüklenmez.
- Ana sayfa, çözüm sayfaları ve fiyat sayfası aynı küçük CTA bileşenini kullanır.
- Yapılandırma yoksa bileşen görünmez.
- Dış bağlantı açıkça yeni pencere davranışını belirtir.

#### Önerilen yapılandırma

- `NEXT_PUBLIC_DEMO_BOOKING_URL`

#### Etkilenecek dosyalar

- `src/components/marketing/DemoCta.tsx` yeni
- `src/app/page.tsx`
- `src/app/pricing/page.tsx`
- Çözüm sayfaları

#### Kabul

- Yeni üçüncü taraf JavaScript yüklenmez.
- CTA mevcut buton ölçülerini ve renklerini kullanır.
- Geçersiz URL gösterilmez.
- Klavye odağı görünürdür.

### A8. Enterprise plan doğruluğu

**Tahmin:** 1 gün

#### İş

- `roadmap` etiketli SSO ve on-prem ifadelerini kaldır.
- Pazarlama ve uygulama içi plan listelerini tek katalogda birleştir.
- Yalnızca kodda uygulanan limit ve özellikleri göster.
- Kurumsal görüşmede konuşulacak işler özellik gibi sunulmaz.
- `Custom DPA review` gibi süreçler özelliklerden ayrı gösterilir.

#### Etkilenecek dosyalar

- `src/lib/marketing/plans.ts`
- `src/app/pricing/page.tsx`
- `src/app/app/settings/billing/plan-picker.tsx`
- `src/lib/entitlements.ts`

#### Kabul

- Fiyat ve uygulama plan adları aynı kaynaktan gelir.
- SSO ve on-prem metni fiyat yüzeylerinde bulunmaz.
- Her görünür kapasite için kod karşılığı vardır.
- Enterprise CTA çalışmaya devam eder.

### A9. Birinci hattın toplu kalite kapısı

**Tahmin:** 1,5 gün

#### Zorunlu kontroller

- `npm run lint`
- `npm run typecheck`
- `npm test`
- Pazarlama E2E testleri
- Görsel regresyon testleri
- Klavye ile tam gezinme
- 200% yakınlaştırma
- 320 px ve 1440 px görünüm
- Türkçe ve İngilizce içerik
- Yasak iddia taraması
- Ücretsiz kontrol açık ve kapalı durumları
- PDF görsel incelemesi

#### Yayın kapısı

- Kullanıcı ekran görüntülerini onaylar.
- İddia metinleri onaylanır.
- Veri bölgesi ortam değerleri doğrulanır.
- Örnek rapor onaylanır.
- Demo URL'si onaylanır.

## 7. Teslimat hattı B: Ürün analitiği

### B0. Analitik karar kaydı ve hukuk kapısı

**Tahmin:** 0,5 gün

#### Karar

- Mevcut sunucu tarafı PostHog yardımcısı kullanılabilir.
- İstemci PostHog SDK'sı eklenmez.
- Tarayıcı yalnızca birinci taraf `/api/analytics/events` uç noktasına gönderir.
- PostHog sunucudan çağrılır.
- `POSTHOG_HOST` sunucu ortam değişkeni olur.
- Varsayılan harici host kaldırılır.
- EU projesi doğrulanmadan üretim açılmaz.

#### Hukuk kapısı

- Gizlilik politikası ürün analitiğini açıklar.
- Alt işleyici listesi PostHog kullanımını açıklar.
- Çerez veya session replay kullanılmadığı belirtilir.
- Hukuki inceleme onay vermezse analitik kapalı kalır.

### B1. Tip güvenli olay sözleşmesi

**Tahmin:** 1 gün

#### Yeni dosyalar

- `src/lib/analytics/events.ts`
- `src/lib/analytics/properties.ts`
- `src/lib/analytics/server.ts`
- `src/lib/analytics/client.ts`

#### Kural

Her olay yalnızca tanımlı özellikleri kabul eder. Serbest özellik nesnesi kabul edilmez.

#### Yasak özellikler

- URL
- E-posta
- Kullanıcı adı
- Şirket ve workspace adı
- HTML
- CSS selector
- Ekran görüntüsü
- Hata mesajının ham metni
- Arama parametrelerinin tamamı
- Form değeri

### B2. Birinci taraf olay uç noktası

**Tahmin:** 1 gün

#### Uç nokta

- `POST /api/analytics/events`

#### Kontroller

- Sıkı Zod şeması
- 4 KB istek sınırı
- Same-origin kontrolü
- Saatlik anonim limit
- Tanımsız olay reddi
- Tanımsız özellik reddi
- Ham IP saklamama
- Sağlayıcı hatasında kullanıcı akışını bozmama
- `cache-control: no-store`

#### Yeni limit

- `analyticsEvent`: önerilen 120 olay / saat / anonim ziyaretçi

### B3. Olay sözleşmesi

| Olay | Kaynak | Temel özellikler | Kimlik |
|---|---|---|---|
| `landing_viewed` | İstemci | locale, referrer_category, campaign_source | Sekme oturumu |
| `public_scan_started` | İstemci | locale, entry_surface | Sekme oturumu |
| `public_scan_completed` | Sunucu | result_bucket, finding_count_bucket | Anonim istek hash'i |
| `signup_started` | İstemci | provider_intent, entry_surface | Sekme oturumu |
| `signup_completed` | Sunucu | provider, entry_surface | HMAC kullanıcı kimliği |
| `first_scan_completed` | Sunucu/worker | scan_type, page_count_bucket, duration_bucket | HMAC workspace kimliği |
| `issue_fix_viewed` | İstemci | severity, rule_id, source_surface | HMAC workspace kimliği |
| `report_exported` | Sunucu | format, report_type, agency_branding | HMAC workspace kimliği |
| `monitor_created` | Sunucu | frequency, scan_type | HMAC workspace kimliği |
| `checkout_completed` | Webhook | plan, billing_interval, currency | HMAC workspace kimliği |

#### Ek olaylar

Gerekli görülürse aşağıdaki olaylar eklenir.

- `demo_clicked`
- `sample_report_opened`
- `solution_page_viewed`
- `checkout_started`
- `public_scan_failed`

### B4. Kimlik ve idempotency

**Tahmin:** 1 gün

#### Anonim kullanıcı

- Tarayıcı sekmesi için `sessionStorage` içinde rastgele kimlik oluştur.
- Kalıcı çerez kullanma.
- Sekme kapanınca kimlik kaybolur.

#### Giriş yapmış kullanıcı

- Firebase UID doğrudan gönderilmez.
- Sunucu UID'yi `ANALYTICS_ID_SALT` ile HMAC eder.
- Workspace kimliği aynı yöntemle takma kimliğe çevrilir.

#### Tekrarlanan işlemler

- Ödeme olayı webhook olay kimliği ile tekilleştirilir.
- İlk tarama olayı workspace üzerinde atomik bir kilometre taşı ile tekilleştirilir.
- Rapor dışa aktarma her başarılı dışa aktarmada olay üretir.
- Başarısız işlem başarı olayı üretmez.

### B5. Olay entegrasyon noktaları

**Tahmin:** 2 gün

#### İstemci olayları

- Ana sayfa görünümü
- Public checker gönderimi
- Sign-in başlangıcı
- Issue fix panelinin açılması
- Demo tıklaması
- Örnek rapor açılması

#### Sunucu olayları

- Public check başarısı
- Session oluşturma başarısı
- İlk scan tamamlama
- Rapor export başarısı
- Monitor oluşturma başarısı
- Billing webhook ile ödeme başarısı

#### Next.js sınırı

- Kök layout Client Component yapılmaz.
- Sayfa görüntüleme için küçük bir Client Component kullanılır.
- Sunucu sırları `server-only` modüllerde tutulur.
- Analitik başarısızlığı uygulama cevabını başarısız yapmaz.

### B6. Gizlilik metinleri

**Tahmin:** 0,5 gün

#### Etkilenecek dosyalar

- `src/app/legal/privacy/page.tsx`
- `src/app/legal/subprocessors/page.tsx`
- `src/app/legal/dpa/page.tsx`
- `src/app/app/compliance/page.tsx`

#### Kabul

- Tarama içeriğinin analitik için kullanılmadığı açıkça yazılır.
- Analitik sağlayıcı, amaç ve bölge açıklanır.
- Çerez ve session replay kullanılmadığı açıklanır.
- Analitik kapalı dağıtımda yanıltıcı sağlayıcı iddiası gösterilmez.

### B7. Analitik testleri

**Tahmin:** 1,5 gün

#### Birim testleri

- Her olay geçerli özelliklerle kabul edilir.
- Bilinmeyen olay reddedilir.
- URL, e-posta ve HTML benzeri özellikler reddedilir.
- HMAC kimliği aynı girdide kararlı olur.
- Ortam değeri yoksa gönderim yapılmaz.
- Sağlayıcı hatası kullanıcı işlemine yansımaz.

#### Route testleri

- Büyük gövde 413 döner.
- Cross-origin istek reddedilir.
- Limit aşımı 429 döner.
- Geçerli olay 202 döner.
- Sağlayıcı kapalıysa güvenli no-op olur.

#### E2E testleri

- Public check başlangıç ve başarı olayları bir kez oluşur.
- URL olay gövdesine girmez.
- Sign-in başlangıcı bir kez oluşur.
- Rapor export başarısızsa başarı olayı oluşmaz.
- Demo bağlantısı olay göndermese bile açılır.

### B8. Huni ve gösterge panosu

**Tahmin:** 0,5 gün

#### Ana huni

1. `landing_viewed`
2. `public_scan_started`
3. `public_scan_completed`
4. `signup_started`
5. `signup_completed`
6. `first_scan_completed`
7. `report_exported`
8. `checkout_completed`

#### Ürün etkinleştirme tanımı

Kullanıcı ilk taramayı tamamlar ve aynı workspace içinde bir fix görünümü veya rapor çıktısı açar.

#### Ana ölçüler

- İlk değere ulaşma süresi
- Public check başarı oranı
- Public check sonrası kayıt oranı
- Kayıt sonrası ilk tarama oranı
- İlk tarama sonrası rapor oranı
- Ücretsizden ücretliye dönüşüm
- Plan bazında aktif monitor sayısı

#### Veri kalite alarmı

- Bir olay 24 saat boyunca sıfırsa kontrol et.
- Başarı olayı hata olayından önce gelirse kontrol et.
- Tanımsız özellik reddi artarsa istemci sürümünü kontrol et.
- Aynı ödeme kimliği birden fazla başarı üretiyorsa entegrasyonu durdur.

### B9. Analitik yayın kapısı

- Önce preview ortamında aç.
- Test workspace ile tüm olayları sırayla üret.
- Olay gövdelerini PII açısından elle incele.
- Funnel sırasını doğrula.
- Sağlayıcı bölgesini doğrula.
- Gizlilik ve alt işleyici metnini onayla.
- Üretimde yüzde 10 trafik ile başla.
- 48 saat hata ve olay hacmini izle.
- Sonra tam açılışa geç.

## 8. Önerilen takvim

| Hafta | Teslimat |
|---|---|
| 0 | Belge inceleme ve kararlar |
| 1 | A0, A1, A2, A8 |
| 2 | A3, A4, A5, A7 |
| 3 | A6, A9 ve ilk hattın yayını |
| 4 | B0, B1, B2, B3, B4 |
| 5 | B5, B6, B7, B8, B9 |

Tek geliştirici için toplam tahmin 15-19 iş günüdür. Dış hukuk incelemesi ve içerik onayı bu tahmine dahil değildir.

## 9. Onay gerektiren kararlar

Uygulamaya başlamadan önce şu kararlar gerekir.

1. Çözüm sayfası adları ve ana mesajları
2. Örnek raporda Northwind kurgusal markasının kullanımı
3. Gerçek müşteri kanıtı yoksa founding pilot çağrısının gösterilmesi
4. Demo takvim URL'si
5. Enterprise planında kalacak doğrulanmış özellikler
6. Firestore ve worker için doğrulanmış üretim bölgeleri
7. PostHog EU kullanımı veya analitiğin birinci taraf depoda tutulması
8. Analitik için hukuk ve alt işleyici metni onayı

## 10. Uygulama sırası ve kontrol noktaları

### Kontrol 1

Bu belge onaylanır. Kod değişmez.

### Kontrol 2

A1-A4 uygulanır. Yeni sayfalar ve örnek rapor yerel olarak gösterilir. Kullanıcı içerik ve görsel dili kontrol eder.

### Kontrol 3

A5-A8 uygulanır. Public checker ve tam URL aktarım akışı test edilir. Kullanıcı son ekran görüntülerini kontrol eder.

### Kontrol 4

A9 tamamlanır. Birinci hat yayına hazırlanır.

### Kontrol 5

B0-B4 uygulanır. Olay sözleşmesi ve gizlilik sınırı kullanıcıya gösterilir.

### Kontrol 6

B5-B9 uygulanır. Preview ortamındaki olaylar doğrulanır. Kullanıcı üretim açılışını onaylar.

## 11. Tamamlanma tanımı

Program şu koşullarda tamamlanır.

- Tasarım sistemi değişmez.
- Mevcut ana sayfa düzeni bozulmaz.
- Ajans ve Türkiye çözüm sayfaları yayıma hazırdır.
- Örnek rapor ve PDF erişilebilirdir.
- Gerçek olmayan müşteri kanıtı gösterilmez.
- Public checker güvenli biçimde açılıp kapatılabilir.
- URL ilk tam taramaya kadar korunur.
- Riskli uyum ve doğrulama iddiaları kaldırılmıştır.
- Enterprise yüzeyinde yalnızca çalışan özellikler vardır.
- Veri bölgesi metni gerçek yapılandırmaya bağlıdır.
- On analitik olayı tip güvenli ve PII içermeden çalışır.
- Analitik tek bayrakla kapatılabilir.
- Tüm birim, entegrasyon, E2E ve görsel testler geçer.
