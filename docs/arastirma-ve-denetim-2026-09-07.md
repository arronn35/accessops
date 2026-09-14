# Percevia AI — Araştırma, site denetimi ve inovasyon raporu

**İnceleme:** 6–7 Eylül 2026 · **Hedef:** ürün sahibi ve geliştirme ekibi  
**Kod tabanı:** `a8bacb8` üzerine mevcut, commit edilmemiş çalışma ağacı.  
**Canlı hedef:** https://percevia-chi.vercel.app · **Yerel hedef:** üretim derlemesi, 127.0.0.1:3100 ve :3110.

## Karar özeti

Percevia'nın çalışan bir ürün temeli var: tarayıcı/axe motoru, bulgu gruplama, görevler, raporlar, izleme altyapısı ve gizlilik sınırları birbirine bağlanmış. Mevcut testler ve ayrıca çalıştırılan gerçek tarayıcı motoru testleri bunu destekliyor. Ancak ücretli ve çok rollü kullanım için güvence henüz yeterli değil. Özellikle **rol bazlı veri erişimi, doğru “düzeltildi” kararı, ödeme yapılandırmasının güvenli varsayılanları ve gerçek oturumla çalışan testler** yayın kapısı olmalı.

En güçlü ürün fırsatı: **“bulguyu bul → sorumluya ata → düzelt → aynı kapsamda yeniden doğrula → kanıtıyla paylaş”** döngüsü. Yeni bir AI sohbet ekranından önce bu döngünün doğruluğunu ve ekipler arası sürekliliğini güçlendirmek daha değerli.

Bu rapor 18 önceliklendirilmiş bulgu/geliştirme açığı ve 8 inovasyon önerisi içerir. Bunların tamamı güvenlik açığı değildir: yeniden üretilmiş kod kusurları, tarayıcı gözlemleri, yapılandırmaya bağlı riskler ve ürün önerileri ayrı belirtilmiştir.

**Kapsam sınırı:** Firebase staging yapılandırması veya açık bir test oturumu bulunamadı. Bu nedenle gerçek hesapla tarama oluşturma → Cloud Tasks/worker → kalıcı rapor → ödeme → silme zinciri tamamlanmış sayılmıyor. Canlı kullanıcı verisi veya ücretli abonelik değiştirilmedi. Otomatik erişilebilirlik kontrolleri tam WCAG uygunluğu veya ekran okuyucu kullanıcı testi anlamına gelmez.

## 1. Yapılan testler ve sonuçları

| Kontrol | Sonuç | Ne kanıtlıyor / neyi kanıtlamıyor |
|---|---|---|
| `npm test` | 497 geçti, 8 atlandı | Birim ve çoğunlukla mock kullanan entegrasyon davranışları |
| Gerçek motor entegrasyonu, `RUN_BROWSER_TESTS=1` | Atlanan 8 test ayrıca geçti | Yerel fixture sayfalarında gerçek Chromium + axe; Firebase/bulut zinciri değil |
| Lint | Geçti | Başlangıç çalışma ağacının statik kontrolü |
| Uygulama ve worker TypeScript | İkisi de geçti | Başlangıç çalışma ağacının tip kontrolü |
| Üretim derlemesi | Başarılı; `next start` ile servis edildi | Uygulama derleniyor ve sunulabiliyor |
| Mevcut Playwright E2E | **21 geçti, 1 başarısız, 2 atlandı** | Public ve API-mock akışları; authenticated lane kayıtlı değil |
| Ek hata yeniden üretimleri | 4 kusur yeniden üretildi | İki rol/CSV senaryosu, eksik Polar token senaryosu, hatalı karşılaştırma |
| Bir karşı hipotez testi | Geçti; şema kusuru hipotezi elendi | Mevcut Zod intersection `anonymousId` alanını kabul ediyor |
| 17 yerel public rota × 2 ekran ölçüsü | 34 kontrol; tamamı HTTP 200 | 1440 ve 390 px; aXe, sayfa hatası, temel DOM denetimi |
| 7 canlı public rota × 2 ekran ölçüsü | 14 kontrol; tamamı HTTP 200 | Ana sayfa, fiyat, iki çözüm sayfası, örnek rapor, onboarding, giriş |
| 5 yerel rota × 8 genişlik | 40 kontrol | 320, 360, 390, 768, 1366, 1440, 1920, 2560 px; bir 320 px taşma |
| HTTP sağlık ve erişim denetimi | 34 istek | İki ortamda sağlık, oturumsuz app/API davranışı, robots ve sitemap |
| Canlı public-check API | HTTP 200, yaklaşık 7.351 ms | Kendi ana sayfasının ilk HTML ön kontrolü başarılı; tek ölçüm, p95 değil |
| Public-check → onboarding → giriş | Mock sonuçla URL korunuyor | Gerçek girişin sonrasını kapsamıyor |

48 ana sayfa/görünüm kontrolünde JavaScript `pageerror` yakalanmadı ve 1440/390 px genişliklerde dış sayfa yatay taşması görülmedi. Bu, bütün konsol veya ağ isteklerinin hatasız olduğu anlamına gelmez: yerel analytics isteği 403 döndü. Görsel inceleme fiyat sayfası, onboarding ve seçilmiş public ekranlarla örneklendi; tüm ekranların her pikseli manuel incelenmedi.

**Canlı sağlık anlık görüntüsü:** `/api/healthz?deep=1` HTTP 200, Firestore hazır, Cloud Tasks yapılandırılmış, `degraded:false`, worker `idle_or_scaled_to_zero`, `pending:false`. Bu sonuç iş yokken beklenen durumdur; yeni bir worker işinin başarıyla tamamlandığını veya SLA'yı kanıtlamaz. Yerel deep-health eksik Firebase Admin yapılandırması nedeniyle 503; ürün kusuru olarak sayılmadı.

**E2E başarısızlığının niteliği:** Türkçe test `WCAG 2.2 AA` metnini arıyor; metin mevcut ana sayfada bulunmuyor. Önceki Türkçe dil ve CTA doğrulamaları geçmiş. Bu bir test–içerik sözleşmesi uyumsuzluğu, “Türkçe tamamen çalışmıyor” bulgusu değil.

İlk E2E denemelerindeki port izni, eksik Chromium ve kapalı public-check bayrağı giderildi. Nihai E2E sonucu :3110 üzerinde `PUBLIC_CHECK_ENABLED=true` ile alındı. Mevcut `verify-marketing-pages.ts` yerel analytics 403 nedeniyle ilk sayfada durdu; 40 genişlik kontrolü bunun yerine bağımsız betikle yapıldı.

Ortam Node **25.9.0** idi; proje ve CI **22.x** istiyor. Nihai yayın doğrulaması Node 22 üzerinde de çalıştırılmalı. Süreler kontrollü performans benchmark'ı değildir.

## 2. Önceliklendirilmiş bulgular

P1: dış kullanımı genişletmeden ele alınmalı. P2: yakın geliştirme döngüsü. P3: optimizasyon. Güven düzeyi, üretimde istismar edildiği anlamına gelmez.

### F01 — P1 · Alt API'lerde rol ve dışa aktarma izni eksik

**Kanıt: kontrollü route testi, yüksek güven.** `report_viewer` için `view_scans=false` olmasına rağmen `/api/scans/:id/issues` fixture verisini HTTP 200 ile verdi. `developer` için `export_reports=false` iken aynı endpointin `?format=csv` yolu CSV döndürdü. Ana scan/detail endpointlerinde bulunan izin kontrolü bu alt yolda yok.

Workspace kapsamı kontrol ediliyor; bu test başka müşterinin workspace'ine erişimi kanıtlamıyor. Aynı workspace içinde rolün erişememesi gereken bulgulara ve CSV'ye erişimi kanıtlıyor. Görsel kanıt ve karşılaştırma endpointleri de aynı rol matrisiyle gözden geçirilmeli.

**Çözüm:** okuma için `view_scans`, CSV için ayrıca `export_reports` kontrolü; RSC sayfaları dahil bütün yüzeylerde aynı sözleşme. **Kabul:** altı rol × ilgili endpoint × aynı/farklı workspace negatif testleri; izin dışı hiçbir veri gövdesi dönmemeli.

Kaynak: [issues route](/Users/efearronn/Desktop/dev/accessops/src/app/api/scans/[id]/issues/route.ts:19), [rol matrisi](/Users/efearronn/Desktop/dev/accessops/src/lib/entitlements.ts), [yeniden üretim](/Users/efearronn/Desktop/dev/accessops/output/audit-2026-09-06/reproduce.test.ts).

### F02 — P1 · Karşılaştırma “görünmedi” durumunu “düzeltildi” sayabiliyor

**Kanıt: saf fonksiyon testi + çağrı zinciri incelemesi, yüksek güven.** Kontrast bulgusunun foreground rengi `#aaaaaa` → `#bbbbbb` değiştiğinde, iki örnek de beyaz üzerinde yetersiz kontrastlı olmasına rağmen sonuç **1 fixed + 1 new** oluyor. Kök neden anahtarı renk çiftine bağlı; aynı sorunun kimliği değişiyor.

Ek olarak karşılaştırma yükleyicisi ortak sayfa kapsamı, başarısız sayfalar, engine/profil ve skor sürümünü taşımıyor. Açık `against` parametresinde iki taramanın tamamlanmış olması da zorunlu tutulmuyor. Son 50 workspace taraması içinde arama, yoğun ajans hesaplarında daha eski aynı site karşılaştırmasını kaçırabilir.

**Çözüm:** sürümlü bulgu kimliği, kapsam kesişimi, `not_observed`/`inconclusive` durumları; yalnızca eşdeğer ve başarılı tekrar taramasıyla `verified_fixed`. **Kabul:** renk/selector değişimi, kısmi başarısızlık, farklı viewport, eksik sayfa ve devam eden tarama hiçbir yanlış kesin düzelme üretmemeli.

Kaynak: [karşılaştırma](/Users/efearronn/Desktop/dev/accessops/src/lib/scanner/compare.ts), [yükleyici](/Users/efearronn/Desktop/dev/accessops/src/lib/server/compare.ts:72), [gruplama](/Users/efearronn/Desktop/dev/accessops/src/lib/scanner/grouping.ts).

### F03 — P1 · Ödeme yapılandırması eksikse production'da ücretsiz plan yükseltme mümkün

**Kanıt: kontrollü route testi, yapılandırmaya bağlı risk.** `NODE_ENV=production`, `POLAR_ACCESS_TOKEN` boş ve fixture workspace owner olduğunda `enterprise` seçimi HTTP 200 ile workspace planını güncelliyor. Kod demo kolaylığını production'dan ayırmıyor.

**Canlıda token eksik olduğu doğrulanmadı; canlı abonelik değiştirilmedi.** Token varsa bu doğrudan yükseltme engelleniyor.

**Çözüm:** production'da ödeme yapılandırması eksikse ücretli yükseltme kapalı; demo davranışı açık, bağımsız demo bayrağına bağlı. Token, webhook secret, server ve ürün eşlemeleri birlikte doğrulansın. **Kabul:** eksik veya kısmi production yapılandırmasında ücretli entitlement yazılamamalı.

Kaynak: [plan seçimi](/Users/efearronn/Desktop/dev/accessops/src/app/api/plan/select/route.ts:26), [Polar yapılandırması](/Users/efearronn/Desktop/dev/accessops/src/lib/billing/polar.ts).

### F04 — P1 · Gerçek oturum ve bulut zinciri CI yayın kapısı değil

**Kanıt: CI/test yapılandırması.** CI lint, tip kontrolü, birim test ve build çalıştırıyor; Playwright E2E veya `RUN_BROWSER_TESTS=1` yok. Authenticated lane yalnızca staging değişkenleri varsa kayıt oluyor. Yeşil CI ana gelir akışının tamamlandığını göstermiyor.

**Çözüm:** Node 22 üzerinde zorunlu public E2E + motor testleri; ayrı staging workspace ile giriş, tarama, issue, rapor, izin, webhook ve silme yaşam döngüsü. **Kabul:** eksik staging yapılandırması sessiz yeşil yerine açık “çalıştırılmadı/yayın engeli” durumuna dönüşmeli.

Kaynak: [CI](/Users/efearronn/Desktop/dev/accessops/.github/workflows/ci.yml), [Playwright yapılandırması](/Users/efearronn/Desktop/dev/accessops/playwright.config.ts), [auth fixture](/Users/efearronn/Desktop/dev/accessops/e2e/authenticated/fixtures.ts).

### F05 — P2 · Örnek raporun kendi kontrastı yetersiz

**Kanıt: canlı ve yerel Chromium + axe.** `/sample-report` iframe içindeki küçük kod etiketlerinde **4,32:1** ölçüldü; beklenen eşik **4,5:1**. Yerelde ekran başına 12, canlıda 5 düğüm işaretlendi; bunlar farklı cihazlarda tekrarlanan aynı şablon sorunudur.

**Çözüm:** raporun code/ikincil metin rengini koyulaştır; HTML ve PDF çıktısını birlikte kontrol et. **Kabul:** örnek ve gerçek rapor şablonunda axe kontrast hatası kalmamalı; basılı çıktı da okunabilir olmalı. Eşik: [WCAG 2.2, 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum).

### F06 — P2 · Hukuki metin bağlantıları yalnızca renkle ayrılıyor

**Kanıt: yerel tarayıcı taraması.** Terms, Privacy, DPA, Subprocessors, Contact ve AI Use sayfalarında toplam **17 bağlantı örneği** her iki ölçüde işaretlendi. Çevre metne göre renk kontrastı **1,76:1**, kalıcı alt çizgi yok.

**Çözüm:** prose içi linklerde kalıcı underline ve görünür focus. **Kabul:** altı sayfada `link-in-text-block` bulgusu kalmamalı. Bu turda canlı hukuki sayfalar ayrıca axe ile taranmadı. Dayanak: [WCAG 2.2, 1.4.1](https://www.w3.org/TR/WCAG22/#use-of-color).

### F07 — P2 · 320 px ana sayfada içerik sınırı aşılıyor

**Kanıt: genişlik matrisi.** Checker açık yerel ana sayfada viewport/document 320 px, body 326 px ölçüldü. `overflow-x-clip` kaydırmayı gizleyebilir; içerik taşmasını çözmez. 390/1440 px temiz olması bu uç genişliği kapsamıyor.

**Çözüm:** taşan çocuk elemanı belirleyip minimum genişlik veya metin kırılmasını düzelt. **Kabul:** 320 px'te body ve document genişliği viewport'u aşmamalı; yakınlaştırma ayrıca manuel denenmeli. Bu ölçüm tek başına bütün WCAG reflow kriterinin ihlal edildiği hükmü değildir.

### F08 — P1 · Manuel inceleme kayıtları ekip kanıtına dönüşmüyor

**Kanıt: veri akışı incelemesi.** Guided manual audit durum/notları yalnızca `localStorage`, `percevia_manual_audit_${scanId}` anahtarında. Arayüz bunu açıkça söylüyor; gizli veri kaybı iddiası değil. Fakat başka cihaz/inceleyiciyle paylaşılmaz, tarayıcı temizlenince gider ve sunucu raporu bu gerçek notları okuyamaz.

**Çözüm:** workspace + scan + criterion + reviewer kimliğiyle kalıcı inceleme kaydı, zaman damgası, revizyon ve rapora dahil edilme. **Kabul:** ikinci yetkili hesap notları görmeli; rapordaki sonuç gerçek inceleme kaydına bağlanmalı.

Kaynak: [manuel inceleme](/Users/efearronn/Desktop/dev/accessops/src/components/compliance/ManualReviewChecklist.tsx:179), [rapor render](/Users/efearronn/Desktop/dev/accessops/src/lib/reports/render.ts).

### F09 — P2 · Onboarding kişiselleştirme sorusu sonucu kaydedilmiyor

**Kanıt: kaynak incelemesi + giriş öncesi akış testi.** Rol seçimi local React state içinde; Continue yalnızca `router.push(nextHref)` yapıyor. Seçim ne kaydediliyor ne sonraki URL'ye ekleniyor. “Workspace, scans, report templates” kişiselleştirme vaadini bu veri akışı gerçekleştirmiyor.

**Çözüm:** persona'yı güvenli onboarding state olarak taşı ve gerçekten şablon/başlangıç ayarı seç; aksi halde gereksiz soruyu kaldır. **Kabul:** iki persona farklı, anlamlı başlangıç akışı üretmeli. URL'nin onboarding'den giriş callback'ine korunması ise doğrulandı.

Kaynak: [onboarding client](/Users/efearronn/Desktop/dev/accessops/src/app/onboarding/onboarding-client.tsx:25).

### F10 — P2 · Yeni kayıt metriği her girişte artabilir

**Kanıt: route incelemesi.** Oturum oluşturma başarılı olduğunda kullanıcı yeni/eski ayrımı olmadan `signup_completed` gönderiliyor. Aynı kullanıcının yeniden girişi dönüşüm hunisini şişirebilir. Canlı analytics isteği 202 kabul edildi; Firestore event kayıtlarını okuma yapılmadı.

**Çözüm:** `user_created`/`signup_completed` yalnızca ilk oluşturma için; normal oturum için `login_completed`. Public başlangıç ve sunucu tamamlanma olaylarını mahremiyet koruyan ortak operation kimliğiyle ilişkilendir. **Kabul:** bir yeni hesap ve üç tekrar giriş tam bir signup üretmeli.

Yerel analytics 403 `invalid_origin` gözlemi ayrı bir ortam uyumluluğu sorunudur; canlıda aynı sayfa görüntüleme isteği 202 döndü. Şemanın `anonymousId` alanını reddettiği hipotezi testle elendi ve bulgu olarak kabul edilmedi.

Kaynak: [session route](/Users/efearronn/Desktop/dev/accessops/src/app/api/auth/session/route.ts:27), [event sözleşmesi](/Users/efearronn/Desktop/dev/accessops/src/lib/analytics/events.ts).

### F11 — P2 · Regresyon izleme için e-posta teslimi ürünleşmemiş

**Kanıt: UI ve kaynak.** Bildirim ayarları e-posta teslimi gelene kadar disabled; mevcut bildirim zili audit-log olaylarını kullanıyor. Bu, tarama zamanlama altyapısının olmadığı anlamına gelmez. Ancak kullanıcı ürünü açmadan anlamlı regresyondan haberdar olamıyorsa izleme değerinin önemli kısmı eksik kalır.

**Çözüm:** yeni kritik/regresyon bulgularında bildirim, tekrarları birleştirme, teslim durumu ve tercih kontrolü. **Kabul:** değişmeyen tarama sessiz; yeni kritik bulgu bir bildirim; retry çift bildirim üretmemeli.

Kaynak: [bildirim ayarları](/Users/efearronn/Desktop/dev/accessops/src/app/app/settings/notification-availability.tsx), [bildirim dönüşümü](/Users/efearronn/Desktop/dev/accessops/src/lib/notifications.ts).

### F12 — P2 · Fiyatlandırma vaatleri için sözleşme doğrulaması eksik

**Kanıt: plan ve API incelemesi; bazı maddeler doğrulama açığı.** Günlük tarama ve sayfa limitleri ortak entitlement kaynağından geliyor; bu iyi. “1 website”, “3 websites”, “Multiple client workspaces” ve “CSV/API” vaatlerinin her biri için aynı açıklıkta uçtan uca kabul testi bulunmadı. Tarama oluşturma yolunda website sayısı limiti görünmedi. Bu inceleme bütün partner işlevlerinin yokluğunu kanıtlamaz.

**Çözüm:** her pazarlama satırını gerçek yetki, kota, veri modeli ve testle eşleyen plan matrisi. Ajans için müşteri izolasyonu, workspace oluşturma/değiştirme ve marka çıktısı staging'de doğrulansın. **Kabul:** ücretli her vaat bir başarılı ve bir kota/izin negatif testiyle gösterilebilmeli.

Kaynak: [pazarlama planları](/Users/efearronn/Desktop/dev/accessops/src/lib/marketing/plans.ts), [entitlements](/Users/efearronn/Desktop/dev/accessops/src/lib/entitlements.ts), [scan creation](/Users/efearronn/Desktop/dev/accessops/src/app/api/scans/route.ts).

### F13 — P2 · Türkçe ziyaretçi yolculuğu bütünlüklü değil

**Kanıt: canlı görünüm ve kaynak.** Türkiye içerik gövdesi Türkçe, üst menü/giriş/fiyat yolculuğu yeni oturumda İngilizce. Marketing header'da dil seçimi yok. Türkçe sayfanın gövdesinde `lang="tr"` var; bu nedenle kök `html lang=en` tek başına dil ihlali olarak raporlanmadı.

**Çözüm:** public dil seçimi, kalıcı tercih, giriş/onboarding/rapor boyunca çeviri; mesaj anahtarlarıyla daha öngörülebilir çeviri. **Kabul:** yeni ziyaretçi yalnızca Türkçe kullanarak ilk raporuna ulaşabilmeli.

### F14 — P1 · Canlı sürüm ve çalışma ağacı davranışları ayrışıyor

**Kanıt: eşleştirilmiş HTTP sonuçları.** Canlı `/app/scans/new` girişe giderken hedefi `callbackUrl` içinde koruyor; yerel sürüm yalnızca `/auth/sign-in` döndürüyor. Yerel `/api/workspace` GET 405, canlı 401. Örnek rapor içeriği ve ana sayfa residency açıklaması da farklı.

Bu bir yetkisiz erişim kanıtı değil; **yayın regresyonu riski**. Yeni çalışma ağacı yayınlandığında oturumu biten kullanıcı hedef sayfasını kaybedebilir. Canlı FAQ'daki genel EU varsayımı ile aynı sayfanın global/US alt işlemci açıklamalarının daha açık ve tutarlı hale gelmesi de gerekiyor; yerel kopya bu ayrımı daha iyi anlatıyor.

**Çözüm:** yayın SHA'sı ve konfigürasyon manifesti, aynı smoke matrisiyle canlı/aday karşılaştırması, güvenli callback koruması. **Kabul:** deep link yeniden giriş sonrasında hedefe dönmeli; residency metni doğrulanmış storage/compute/AI bölgelerini ayrı söylemeli.

Kaynak: [workspace redirect](/Users/efearronn/Desktop/dev/accessops/src/lib/server/workspace.ts), [HTTP kanıtı](/Users/efearronn/Desktop/dev/accessops/output/audit-2026-09-06/followup-results.json).

### F15 — P3 · SEO için canonical ve dil stratejisi eksik

**Kanıt: yedi canlı public sayfanın DOM'u.** Canonical link bulunmadı. Sitemap ve robots mevcut ve HTTP 200. Bu durum “arama motorunda indekslenmiyor” anlamına gelmez.

**Çözüm:** seçilen ana domain için canonical; dil bazlı URL stratejisi varsa uygun alternate/hreflang; public rapor ve özel sayfalarda indeksleme kararı; sayfaya özel OG görseli. **Kabul:** public URL'lerin her birinde tek ve doğru canonical; auth/özel içerik indeksleme politikası testli.

### F16 — P3 · Mobil ana sayfa çok uzun, önemli navigasyon aşağıda kalıyor

**Kanıt: canlı 390 px ekran görüntüsü ve header yapısı.** Ana sayfa yaklaşık **20.436 px** yüksekliğinde; 900 px viewport için yaklaşık 23 ekran. Desktop navigasyon bağlantıları mobilde gizleniyor ve alternatif menü yok; fiyat/çözüm bağlantıları footer'a kalıyor.

**Çözüm:** kısa mobil değer anlatımı, örnek çıktı, net ilk aksiyon; uzun yöntem/gizlilik detaylarını ayrı sayfalara bağla, erişilebilir mobil menü ekle. **Kabul:** fiyatlandırma ve yöntem mobilde üstten erişilebilir; ilk aksiyona kadar kaydırma ve tamamlanma oranı ölçülsün. Dönüşüm artışı henüz ölçülmedi; öneri hipotezdir.

### F17 — P2 · Sentetik ürün önizlemesinin bazı etiketleri canlı veri izlenimi veriyor

**Kanıt: canlı metin ve component.** Sabit Northwind önizlemesi “live product view” ve “the working product, not a decorative mockup” ifadeleriyle sunuluyor. Ayrı sentetik pilot bölümünde doğru açıklama var; fakat önizleme noktasında da kapsam net olmalı.

**Çözüm:** “örnek workspace / sentetik veri” etiketi önizlemenin yanında; gerçek ürün gösterimi iddiası varsa izinli, kontrollü demo akışı. **Kabul:** ziyaretçi gerçek müşteri sonucu, demo ve ürün işlevini karıştırmamalı.

Kaynak: [önizleme](/Users/efearronn/Desktop/dev/accessops/src/components/marketing/ProductPreview.tsx:84), [ana sayfa](/Users/efearronn/Desktop/dev/accessops/src/app/page.tsx:321).

### F18 — P2 · 100/A ön kontrol sonucu kapsamından daha kesin algılanabilir

**Kanıt: canlı API.** Kendi ana sayfası için `score:100`, `grade:A`, `confidence:low`, `engine:static-html-preview` döndü. API sınırlamaları doğru biçimde veriyor; bu motorun yanlış çalıştığına dair bir kanıt değil. İlk HTML sonucu, etkileşimli tam site için güvence veremez.

**Çözüm:** sonuçta “ilk HTML'de bulgu bulunmadı” ifadesini skor kadar görünür yap; çalıştırılmayan testleri ve kapsamı göster. Kapsam göstergesi ile bulgu skorunu ayır. **Kabul:** erişilemeyen/çalıştırılmayan kontroller başarılı sayılmamalı; kullanıcı test kapsamını doğru açıklayabilmeli. Dayanak: [W3C araçların sınırları](https://www.w3.org/WAI/test-evaluate/tools/selecting/).

## 3. Rekabet araştırması ve anlamı

Birincil ürün dokümanları esas alındı; pazar payı, gelir veya rakip doğruluk yüzdesi tahmin edilmedi. Rakip hesaplarında satın alma veya uygulamalı ürün testi yapılmadı. Aşağıdaki özellikler dokümantasyonla doğrulandı.

| Kaynak/ürün | Doğrulanan yaklaşım | Percevia için çıkarım |
|---|---|---|
| [Deque User Flow Analysis](https://docs.deque.com/devtools-for-web/4/en/user-flow-analysis/) | Bir kullanıcı akışını tarama ve sonuçları birlikte değerlendirme | Akış taraması tek başına benzersiz inovasyon sayılmamalı |
| [Deque Intelligent Guided Tests](https://docs.deque.com/devtools-for-web/4/en/devtools-igt/) | Otomatik testlerin ötesinde kılavuzlu değerlendirme | Genel AI açıklaması yerine inceleme sonucunu kalıcı kanıta bağlamak önemli |
| [BrowserStack Workflow Analyzer](https://www.browserstack.com/docs/accessibility/workflow-analyzer/run-workflow-analyzer) | Etkileşim sırasında tarama; sayfa/bölüm kapsamı; rapor paylaşımı ve CSV | Dinamik durumlar ve geliştiricinin mevcut iş akışına uyum beklenen kabiliyetler |
| [BrowserStack test entegrasyonu](https://www.browserstack.com/docs/accessibility/automated-tests) | Fonksiyonel testlerin yanında erişilebilirlik testi | CI ve regresyon kontrolü ürünün tekrar kullanımına katkı sağlayabilir |
| [Accessibility Insights](https://accessibilityinsights.io/docs/web/overview/) | Otomatik denetim ile kılavuzlu manuel değerlendirme | Checklist'in varlığı tek başına farklılaştırmaz; ekip kayıtları ve doğrulama sürekliliği gerekir |
| [W3C değerlendirme araçları](https://www.w3.org/WAI/test-evaluate/tools/selecting/) | Otomasyonun sınırları ve insan değerlendirmesi | Kesinlik, kapsam ve belirsizlik ürün arayüzünde birlikte gösterilmeli |

**Stratejik çıkarım:** Percevia için iyi başlangıç pazarı, Türkçe çalışan küçük/orta ajanslar ve erişilebilirlik işini müşterisine düzenli raporlamak zorunda olan ekipler olabilir. Bu bir müşteri görüşmesiyle doğrulanmış talep veya pazar büyüklüğü iddiası değil. Önce gerçek müşteri iş akışı ve ödeme isteği ölçülmeli.

## 4. Sekiz inovasyon önerisi

Eforlar mevcut mimariye göre **kaba mühendislik tahmini**; tasarım, test ve entegrasyon belirsizliği içerir. Taahhüt veya ölçülmüş teslim süresi değildir. KPI eşikleri önerilen yayın kapılarıdır, mevcut performans değildir.

| Öncelik | Öneri | İlk uygulanabilir kapsam | Tahmini efor | Başarı/kalite ölçütü |
|---|---|---|---|---|
| 1 | **Doğrulanmış düzeltme kaydı** | Sürümlü fingerprint, eşdeğer kapsam, `claimed_fixed → verification_pending → verified_fixed/reopened/inconclusive` | 2–4 hafta | Altın fixture setinde yanlış kesin “fixed” yok; ilk doğrulanmış düzeltmeye kadar süre |
| 2 | **Ortak manuel inceleme defteri** | Reviewer, WCAG kriteri, not, tarih, sonuç ve revision; rapora bağlama | 1–2 hafta | Başka hesap/cihazda aynı kayıt; rapor sonucu kaynağına izlenebilir |
| 3 | **Anlamlı regresyon bildirimi** | Yeni kritik bulgu veya doğrulanmış düzeltmenin geri gelmesi; sessiz değişmeyen tarama | 1–2 hafta | İdempotent teslim; duplicate bildirim yok; kullanıcı başına aksiyona dönüşen bildirim oranı |
| 4 | **Ajans müşteri çalışma dosyası** | İzole müşteri workspace'leri, müşteri özeti, kalıcı manuel kanıt ve markalı rapor | 2–3 hafta | Çapraz müşteri sızıntısı için negatif testler; rapor hazırlama süresi |
| 5 | **PR'da değişen kapsam denetimi** | GitHub PR preview URL'si + değişen sayfa/bileşen eşlemesi; yeni ciddi bulgularla kontrol sonucu | 2–3 hafta | Tam taramaya göre maliyet/süre farkı; kaçırılan regresyonlar kontrollü fixture ile ölçülür |
| 6 | **Kaydedilebilir kullanıcı yolculukları** | Tekrarlanabilir menü/dialog/form/checkout adımları; güvenli oturum desteği sonraki aşama | 3–5 hafta | Aynı akışın yeniden oynatılabilirliği; durum kapsamı; yan etkili adımların kontrolü |
| 7 | **Kanıta dayanan Türkçe AI düzeltme paketi** | Kök neden özeti, ilgili kaynak/selector, uygulanabilir diff taslağı, doğrulama adımları | 2–3 hafta | Uzman kabul oranı; yanlış öneri oranı; düzeltme sonrası tekrar test sonucu |
| 8 | **Kapsam ve güven paneli** | Test edilen URL/viewport/durum, engine sürümü, başarısız sayfalar, manuel kalan kontroller | 1–2 hafta | Düşük kapsamın yüksek skorla gizlenmemesi; kullanıcı kapsamı doğru anlayabilmeli |

### Önerilerin mevcut üründen farkı

Karşılaştırma, görev panosu, monitor, AI açıklaması ve checklist zaten var. Yenilik bunları tekrar eklemek değil: karşılaştırmayı güvenilir doğrulama durumuna, checklist'i paylaşılan kanıta, monitor'u anlamlı bildirime, AI çıktısını test sonucu olan bir düzeltme paketine dönüştürmek.

Scanner'da menü/dialog/tab/form gibi sınırlı etkileşim durumlarını açan betikler de mevcut. “Kaydedilebilir kullanıcı yolculukları” önerisi bu özelliğin yok sayılması değil; kullanıcının seçtiği sıralı akışın sürümlenmesi ve tekrar oynatılmasıdır.

PR entegrasyonu ilk aşamada yeni repo erişim yetkileri ve token saklama tasarımı gerektirir. Her müşteri için doğrudan production crawl genişletmek yerine izinli preview/staging hedefleriyle başlanmalı. AI tarafından üretilen değişiklik otomatik kesin düzeltme olarak kabul edilmemeli; sonraki test sonucu ayrı kayıt olmalı.

## 5. Uygulanabilir geliştirme sırası

### İlk 7 gün — güven ve yayın kapısı

1. F01 rol/CSV izinlerini birleştir, bütün alt yüzeyler için negatif test ekle.
2. F03 ücretli plan seçimini production'da güvenli varsayılana getir.
3. F02 kapsamı uyuşmayan sonuçlarda “düzeltildi” ifadesini durdur; `inconclusive` ekle.
4. F04 Node 22 public E2E + gerçek motor testi; başarısız Türkçe sözleşmesini güncelle.
5. F05–F07 rapor/link kontrastı ve 320 px taşmayı düzelt.
6. F14 aday/canlı manifesti ve güvenli deep-link callback testi.

### 2–3. hafta — ortak çalışma ve ölçüm

Manuel incelemeyi sunucuya taşı; kayıt/giriş metriklerini ayır; ilk başarılı tarama ve ilk doğrulanmış düzeltme dönüşümlerini ölç; gerçek staging hesabıyla tarama, yeniden deneme, rapor ve gizlilik silme yolculuğunu çalıştır. Bildirim teslimini idempotent yap. Public sayfalardaki demo, kapsam ve bölge ifadelerini tutarlı hale getir.

### 4–6. hafta — müşteriyle ürün doğrulaması

Üç ila beş gönüllü ajansla kontrollü pilot önerilir; bu turda kimseye mesaj gönderilmedi. Her pilotta temsilî bir site, belirli bir bulgu grubu ve rapor alıcısı olsun. Başlangıç/sonuç karşılaştırmasında tarama sayısından çok **rapor hazırlama süresi, doğrulanmış düzeltme sayısı, tekrar gelen bulgular ve müşterinin raporu kullanabilmesi** ölçülsün.

İlk görüşmelerde sorulacak dört soru: Son rapor nasıl hazırlandı? En çok hangi adım zaman aldı? Düzeltmenin tamamlandığını kim ve nasıl doğruladı? Hangi çıktı için ödeme yapılıyor? Özellik listesi beğenisi, kullanım veya ödeme isteğinin yerine geçmemeli.

### 7–12. hafta — kanıtlanan kullanım üzerinden genişleme

Pilot verisi destekliyorsa müşteri workspace görünümü, PR kontrolü ve kayıtlı kullanıcı yolculuklarına geç. Talep doğrulanmadan benchmark endeksi, çok sayıda platform entegrasyonu veya ikinci bir AI asistanı önceliklendirilmemeli. Mevcut `competitive-technical-roadmap-2026.md` ile aynı doğrulanmış düzeltme yönü korunabilir; güncel test bulguları o belgenin yayın kapılarına eklenmeli.

## 6. Açık kalan test matrisi

| Akış | Mevcut kanıt | Kapanması için gereken |
|---|---|---|
| E-posta/GitHub gerçek giriş | Canlı giriş UI açıldı; callback'e kadar mock akış geçti | Hazır test hesabı veya staging oturumu |
| Tarama oluşturma → worker → Firestore | 497 test + 8 gerçek yerel motor testi; canlı health hazır | Staging'de yeni scan job ve terminal veri doğrulaması |
| AI yanıtı | Kaynak/ilgili mevcut testler | İzinli örnekle gerçek sağlayıcı yanıtı, maliyet ve hata yolu |
| PDF gerçek indirme | Render testleri ve public HTML örnek | Hedef deployment'ta gerçek PDF yanıtı; tarayıcı binary/fallback davranışı |
| Polar ödeme/webhook/iptal | Mevcut testler; eksik token kusuru yeniden üretildi | Sandbox checkout, webhook tekrarı ve iptal akışı |
| Bildirim/monitor | Kaynak ve testler | Zamanlanmış gerçek iş, anlamlı değişiklik ve teslim kanıtı |
| Takım/ajans izolasyonu | Rol ve workspace kod incelemesi | İki staging workspace, altı rol, davet kabul/iptal akışı |
| Veri silme/retention | Mevcut otomatik testler | Disposable staging kaydı; iş tamamlanınca sıfır kalıntı kontrolü |
| VoiceOver/NVDA, Safari/Firefox | Yapılmadı | Gerçek yardımcı teknoloji ve tarayıcı matrisi |
| Performans/yük | Tekil yanıtlar ve ekran kontrolleri | Kontrollü staging yükü, RUM/p75 CWV, kuyruk gecikmesi, maliyet/scan |

Canlı public-check formunda bir denemede 30 saniye içinde yanıt olayı gözlenemedi; tarayıcı betiği bu adımda durdu. Ardından endpoint'e yapılan tek, sınırlı doğrudan istek HTTP 200 verdi. **Backend'in çalıştığı doğrulandı; canlı formun sonuç ekranını gösterme akışı kesin başarılı olarak işaretlenmedi.** Bu noktayı oturumlu doğrulama turunda ağ kaydıyla tekrar ele almak gerekir.

## 7. Kanıtlar ve tekrar çalıştırma

Üretim uygulama kaynaklarında bu denetim için düzeltme veya deploy yapılmadı. Mevcut kullanıcı değişiklikleri korundu. Denetim betikleri, JSON sonuçlar ve ekran görüntüleri `output/audit-2026-09-06/` içinde.

- [48 tarayıcı kontrolünün ham sonuçları](/Users/efearronn/Desktop/dev/accessops/output/audit-2026-09-06/browser-results.json)
- [40 genişlik kontrolü, HTTP ve kullanıcı akışı sonuçları](/Users/efearronn/Desktop/dev/accessops/output/audit-2026-09-06/followup-results.json)
- [Canlı public-check yanıtı](/Users/efearronn/Desktop/dev/accessops/output/audit-2026-09-06/live-check.json)
- [Dört kusuru yeniden üreten ve bir hipotezi eleyen test](/Users/efearronn/Desktop/dev/accessops/output/audit-2026-09-06/reproduce.test.ts)
- [Tarayıcı denetimi betiği](/Users/efearronn/Desktop/dev/accessops/output/audit-2026-09-06/browser-audit.cjs)
- [Tamamlayıcı denetim betiği](/Users/efearronn/Desktop/dev/accessops/output/audit-2026-09-06/followup-audit.cjs)

Yeniden üretim testlerinin “geçmesi”, mevcut kusurlu davranışın yeniden üretildiğini ifade eder; bunlar güvenli davranış onayı değildir. Düzeltme aşamasında beklenen sonuçlar güvenli davranışa çevrilmelidir.

```sh
npm run lint
npm run typecheck
npm run worker:typecheck
npm test
RUN_BROWSER_TESTS=1 PLAYWRIGHT_BROWSERS_PATH=/tmp/accessops-audit-browsers npx vitest run src/lib/scanner/playwright-runner.integration.test.ts
npx vitest run --config output/audit-2026-09-06/vitest.config.mts
PLAYWRIGHT_BROWSERS_PATH=/tmp/accessops-audit-browsers E2E_PORT=3110 npm run test:e2e -- --workers=2
```

E2E mevcut bir :3110 sunucusunu yeniden kullanırsa `PUBLIC_CHECK_ENABLED=true` sözleşmesi sağlanmalı. Geçici Chromium klasörü silinmişse Playwright'ın resmi tarayıcı kurulumu gerekir. Public-check gerçek istekleri kota tüketir; tekrarları sınırlı tutun.

### Araştırma kaynakları

Kaynaklar 6–7 Eylül 2026 tarihinde erişilebilir birincil dokümanlardan incelendi. Ürün dokümanlarında kesin yayın tarihi görünmeyen sayfalara tarih uydurulmadı. WCAG 2.2 başvuru metni 12 Aralık 2024 W3C Recommendation sürümünü gösteriyor.

1. W3C — [Selecting Web Accessibility Evaluation Tools](https://www.w3.org/WAI/test-evaluate/tools/selecting/), araçların sınırları; sayfada 13 Mayıs 2024 güncellemesi.
2. W3C — [WCAG 2.2](https://www.w3.org/TR/WCAG22/), özellikle 1.4.1, 1.4.3 ve reflow değerlendirme çerçevesi.
3. Deque — [User Flow Analysis](https://docs.deque.com/devtools-for-web/4/en/user-flow-analysis/), akış tarama kabiliyeti.
4. Deque — [Intelligent Guided Tests](https://docs.deque.com/devtools-for-web/4/en/devtools-igt/), kılavuzlu test yaklaşımı.
5. BrowserStack — [Run Workflow Analyzer](https://www.browserstack.com/docs/accessibility/workflow-analyzer/run-workflow-analyzer), etkileşimli kapsam ve raporlama.
6. BrowserStack — [Automated tests](https://www.browserstack.com/docs/accessibility/automated-tests), fonksiyonel test entegrasyonu.
7. Accessibility Insights — [Web overview](https://accessibilityinsights.io/docs/web/overview/), otomatik ve kılavuzlu değerlendirme.

Araştırma; ürün akışı, mevcut kod ve otomasyon sınırları için yeterli birincil kanıt elde edilince daraltıldı. Hukuki yükümlülüklerin ülke/kurum bazında değerlendirmesi, pazar büyüklüğü ve ödeme isteği bu raporda doğrulanmış bulgu olarak sunulmadı.
