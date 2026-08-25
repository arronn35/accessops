# Rakip Görünümü 2026 — Ürün, Müşteri Desteği ve Müşteri Edinme Analizi

**Proje:** Percevia AI (accessops)
**Tarih:** 24 Ağustos 2026
**Kapsam:** 9 rakip organizasyonun ürün/hizmet kapsamı, müşteri destek modeli ve müşteri edinme performansı; Percevia için otomasyon-odaklı aksiyon listesi
**İlişkili doküman:** `04-market-research.md` (V2) — bu rapor o çalışmayı güncel 2026 verisiyle tamamlar, yerine geçmez.

---

## Yönetici Özeti

1. **Pazar büyüyor ama patlamıyor.** Dar tanımlı dijital erişilebilirlik yazılım pazarı 2025'te ~$787M–$1.4B; tahminler %6.2–8.8 CAGR'da birleşiyor. Büyümenin motoru regülasyon (EAA Haziran 2025, ADA Title II Nisan 2026, WCAG 2.2'nin Ekim 2025'te ISO standardı olması).
2. **Müşteri edinmenin kanıtlanmış motoru "partner kanalı".** Kamuya açık tek şeffaf veri olan AudioEye'da Partner & Marketplace kanalı ARR'nin %59'u ve %16 YoY büyüyor; enterprise kanal sadece %5 büyüyor. Acquia–CivicPlus bayi modeli ve accessiBe'nin ajans planları aynı deseni doğruluyor.
3. **Ücretsiz ürün, kategorinin evrensel huni girişi.** WAVE uzantısı 600K+ kullanıcı, axe uzantısı ücretsiz, Silktide/Siteimprove/accessiBe/Pope Tech ücretsiz tarayıcı veya plan sunuyor. Percevia'nın ücretsiz kotası var ama **giriş gerektirmeyen tek sayfalık herkese açık tarama** eksik.
4. **Destek kalitesi satın alma kriteri oldu.** G2 "Quality of Support" skorları 9.0–9.6 bandında; UserWay 9.6 ile lider. Pope Tech'in "Accessibility Help Desk"i (erişilebilirlik uzmanları soru yanıtlıyor) ve Deque University kategorinin destek standardını belirliyor.
5. **Müşteri edinme "oranı" çoğu rakipte kamuya açık değil.** Bu rapor açıklanan rakamları (AudioEye, Siteimprove) ve üçüncü taraf tahminleri (GetLatka, Craft, Bloomberry) açıkça etiketleyerek kullanır; CAC/dönüşüm oranı yerine müşteri sayısı büyümesi, ARR büyümesi ve kanal karması vekilleri (proxy) kullanılmıştır.
6. **Percevia için fırsat:** Rakiplerin kazandığı alanların çoğu (ücretsiz tarama, otomatik benchmark raporu, durum sayfası, ajans kanalı) mevcut mimari (Cloud Tasks + worker + Firestore) üzerine **veri dosyalarına manuel müdahale olmadan, tamamen otomasyonla** inşa edilebilir.

---

## 1. Pazar Bağlamı (2025–2026)

| Kaynak | 2025 Büyüklük | Tahmin | CAGR | Not |
|---|---|---|---|---|
| Mordor Intelligence (Mar 2026) | $0.79B | $1.15B (2031) | %6.23 | Kuzey Amerika %39.87 pay; APAC en hızlı (%7.21) |
| SNS Insider / Expert Market Research | $786.9M | $1.75B (2035) | %8.35 | Kamu sektörü en hızlı segment (~%9.24); büyük kurumlar %68 pay |
| Grand View Research | $886.7M (2026) | $1.30B (2030) | %8.8 | 2023: $721.1M |
| Straits Research (geniş tanım) | $1.42B | $3.24B (2034) | %8.6 | Abonelik SaaS %44.37 pay; yönetilen hizmetler en hızlı (~%9.28) |
| Emergen Research (en geniş tanım) | $2.1B (2024) | $6.8B (2034) | %12.5 | Hizmetler dahil |

**Analitik konumlandırma:** Forrester Wave™ Digital Accessibility Platforms (Q4 2025 / Mart 2026 değerlendirmesi): **Level Access** "Current Offering"de lider; **Deque** en yüksek "Strategy" skoru.

**Talep sürücüleri:**
- EAA (Avrupa Erişilebilirlik Yasası) Haziran 2025'te uygulanmaya başladı — AudioEye 2026'da "şimdiye kadarki en güçlü Avrupa ARR katkısını" raporladı.
- WCAG 2.2, Ekim 2025'te ISO standardı olarak kabul edildi.
- ABD ADA Title II yeni kuralı Nisan 2026'dan itibaren aşamalı yürürlükte — Pope Tech gibi kamu/yükseköğretim odaklı oyuncuların webinar ve satış teması.
- Alıcı davranışı değişimi: tek seferlik denetimden **sürekli uygunluk aboneliğine** geçiş (Mordor: "growth now comes from recurrent subscriptions").

---

## 2. Rakip Profilleri

> Veri bütünlüğü kuralı: **[A]** = şirket açıklaması/dosyalama, **[T]** = üçüncü taraf tahmini (GetLatka, Craft, Bloomberry, basın), **[R]** = inceleme platformu (G2 vb.). Tahminler "tah." olarak işaretlenmiştir.

### 2.1 AudioEye (NASDAQ: AEYE) — kategorinin tek şeffaf muhasebesi

**Ne sunuyor:** Hibrit otomasyon + insan incelemesi platformu; iki kanal: (1) Enterprise (büyük kurumlar, federal/eyalet/yerel yönetim, doğrudan satış), (2) Partner & Marketplace (SMB ürünleri + SMB müşterilerine dağıtan partnerlar). Tescilli veri varlığı: "milyonlarca insan incelemesi ve milyarlarca gerçek dünya düzeltmesi" [A].

**Destek modeli:** Partner kanalı üzerinden ölçeklenen destek; G2 Spring 2026'da 11 rozet (Most Implementable, Highest User Adoption dahil), G2 Best Software Products 2026 [A]. CSUN 2026'da 6 uzman oturumu; danışma kurulunda eski ABD Kongre üyesi Gabby Giffords ve National Federation of the Blind [A].

**Ölçek ve müşteri edinimi [A, Q2 2026 kazanç raporu]:**
- Müşteri sayısı: **~129,000** (30 Haziran 2026), YoY **+9,000 (~%7.5)**; 2025 sonu: 131,000; Q1 2026'da tek bir partnerın yeniden hizalanmasıyla -4,000 (gelir etkisi yok).
- ARR: **$42.3M** (+11% YoY); Q2 gelir $10.7M (+9% YoY); **42 çeyrektir ardışık rekor gelir**.
- Kanal karması: Partner & Marketplace = **ARR'nin %59'u, +16% YoY**; Enterprise = %41, +5% YoY.
- FY2026 beklentisi: $43.5–44M gelir, ≥$12.7M düzeltilmiş FAVÖK (~%29 marj), yıl sonu >$15M FAVÖK run-rate.
- Liderlik: Kelly Georgevich CFO'dan CEO'ya (Mayıs 2026); yeni CFO Matthew Domeyer (Temmuz 2026).

**Percevia açısından anlamı:** Kategoride büyümenin doğrudan satıştan değil **partner/marketplace kanalından** geldiğinin tek kesin kanıtı. SMB odaklı self-serve + partner modeli, enterprise satıştan daha hızlı bileşik büyüyor.

### 2.2 accessiBe — en görünür ve en tartışmalı oyuncu

**Ne sunuyor:** accessWidget (AI overlay), accessFlow (geliştirici araçları), uzman hizmetleri, **Litigation Support Package** (dava destek paketi), kâr amacı gütmeyen kuruluş programı. Fiyatlar [A]: Micro $490/yıl, Growth $1,490/yıl, Scale $3,990/yıl, Enterprise özel.

**Destek modeli:** G2 Quality of Support **9.4–9.5** (~950–975 inceleme) [R]; onboarding deneyimi incelemelerde sürekli övülüyor ("en iyi demo & implementasyon"); G2 Summer 2026: Leader, Most Implementable, Best Usability, Best Est. ROI [R]. ~60 kota taşıyan satış temsilcisi [T].

**Ölçek ve müşteri edinimi:**
- Gelir: $27.7M (2023) → **$51.3M tah. (2024), ~%85 YoY** [T, GetLatka]; müşteri **~110.8K tah.** [T]; ortalama ACV ~$463 [T].
- Şirketin kendi ifadesi: "85,000+ web sitesi" (Ağustos 2026 PR) [A] — GetLatka tahminiyle fark, "müşteri" vs "site" tanımından kaynaklanıyor olabilir.
- **Inc. 5000 listesinde üst üste iki yıl** (2025, 2026); 2026'da yazılım şirketleri arasında ilk 200 [A].
- **FTC uzlaşması (Ocak 2025): $1M ceza** — AI ürününün siteleri tam uyumlu hale getirdiği iddiaları ve açıklanmayan ücretli incelemeler nedeniyle [A, FTC].

**Percevia açısından anlamı:** Agresif PLG + düşük ACV + güçlü onboarding ile 6 yılda $50M+ gelire ulaşılabildiğinin kanıtı; aynı zamanda aşırı vaadin (overlay/"tam uyumluluk") regülatör riski doğurduğunun kanıtı. Percevia'nın "uyumluluk vaat etmiyoruz" konumlandırması bu riske karşı yapısal koruma.

### 2.3 Level Access (+ UserWay) — konsolidasyonun merkezi

**Ne sunuyor:** AMP platformu (tarama, analitik, remediation iş akışı), yönetilen hizmetler, uzman denetimleri, eğitim, hukuki/uyum danışmanlığı, VPAT; UserWay ile SMB/overlay ucuna indi. Üçüncü taraf fiyat tahminleri [T]: AMP $15K–$40K+/yıl; denetim başına $5K–$25K+.

**Destek modeli:** Uzman-hizmet ağırlıklı; G2 Quality of Support 9.2 (n=157) [R]; Ease of Use 8.2 — kurumsal karmaşıklık kullanılabilirliği düşürüyor [R]. **UserWay'in destek skoru 9.6 (n=382) — karşılaştırılan oyuncular arasında en yüksek** [R].

**Ölçek ve müşteri edinimi:**
- **Aralık 2024'te $100M ARR'yi aşan ilk "yalnızca erişilebilirlik" şirketi** [A].
- UserWay'i **$98.7M nakit** karşılığında satın aldı (anlaşma Ara 2023, kapanış Mar 2024; hisse başına $21.06, %17 prim) [A]. UserWay "milyonlarca web sitesi" tarafından kullanılıyordu [A].
- 2022'de eSSENTIAL Accessibility ile birleşme (KKR/JMI destekli); Ekim 2024'ten beri CEO Mark Zablan [A].
- Forrester Wave Q4 2025: **Leader, en yüksek "Current Offering"** [A].

**Percevia açısından anlamı:** Kategori konsolide oluyor; bağımsız, odaklı ve dürüst konumlandırma ("overlay önermiyoruz") konsolidasyon dışı kalan alıcılar için değerli. UserWay'in destek skoru, SMB segmentinde destek kalitesinin satın alma kriteri olduğunu gösteriyor.

### 2.4 Deque Systems — motoru herkes kullanıyor

**Ne sunuyor:** axe DevTools (Free / **Pro $45/kullanıcı/ay ≈ $1,250/yıl** / Enterprise özel), axe Monitor (tah. $3K–$20K/yıl [T]), axe for Web Enterprise (tah. $5K–$50K+ [T]), denetim/VPAT/danışmanlık, **Deque University** ($400/yıl tam erişim; **engelli bireylere 1 yıl ücretsiz burs**; IAAP CPACC/WAS sınav hazırlığında onaylı sağlayıcı) [A]. axe-core açık kaynak motoru: Google Lighthouse, Microsoft Accessibility Insights, Pa11y ve yüzlerce ticari aracın temeli [A].

**Destek modeli:** Kategorinin eğitim standardı: Deque University + eğitmenli eğitimler + **axe-con** konferansı + enterprise öncelikli destek. Otomatik kapsam ~%30–40 WCAG; **false-positive oranı kategorinin en iyisi** kabul ediliyor [R/T].

**Ölçek ve müşteri edinimi:** Gelir ~$35.8M tah. [T, Crunchbase tabanlı]; ~199 çalışan [T]; 1999 kuruluş, dış yatırım yok (kârlı, kendi kendini fonluyor olabilir) [T]. Ekim 2025 Sauce Labs ortaklığı [A]; BrowserStack'e karşı IP davaları (2024–25) [T]. Forrester Wave: en yüksek "Strategy" [A].

**Percevia açısından anlamı:** Percevia zaten axe-core kullanıyor — bu, Deque ile "motor" seviyesinde eşitlik demek; fark **ürünleşme, raporlama ve destek katmanında** kurulacak. Ücretsiz uzantı → Pro → Enterprise hunisi, Percevia'nın ücretsiz kota → ücretli plan geçişi için model.

### 2.5 Siteimprove — kurumsal varsayılan, büyümesi yavaş

**Ne sunuyor:** Dijital varlık optimizasyonu (DPO) paketi: erişilebilirlik + SEO + analitik + içerik kalitesi + politika; "Siteimprove.ai" agentic içerik zekâsı konumlandırması; ücretsiz checker'lar (accessibility, kontrast, SEO, EAA, ADA Title II, statement generator) huni girişi olarak [A]. FedRAMP Ready federal platform [A]. Fiyat [T]: tipik $5K–$30K/yıl; orta ölçek $20–35K/yıl, enterprise $40–100K+/yıl.

**Destek modeli:** Help Center + support@siteimprove.com, **Frontier** (eski Academy) eğitim platformu, Success Plans, Developer Center, **herkese açık status sayfası**, profesyonel hizmetler; hizmet ekibi IAAP CPWA/CPACC sertifikalı [A]. G2'de Ease of Use 8.7 / Setup 8.9 — accessiBe'nin (9.6) gerisinde [R].

**Ölçek ve müşteri edinimi:**
- Danimarka holding dosyalaması [A]: gelir $99.3M (2022) → **$103.2M (2023), +%4.0**; FAVÖK $2.1M (2022: -$15.9M); net zarar $20.6M (2022: $89.0M); **~5,600 müşteri**, 430+ çalışan, 15 ülke.
- Craft.co FY2025 [T]: gelir **$113M**, brüt kâr $85.5M, net zarar $3.2M.
- Şubat 2022'de $100M ARR duyurusu [A]. Nisan 2025'te M&A teklifi kaydı [T].
- Bloomberry tespiti (Temmuz 2026) [T]: **3,225 aktif müşteri sitesi, 403 churn etmiş, 41'i 3 ay içinde yenileme döneminde**; en yaygın sektör Kamu Yönetimi (%21).

**Percevia açısından anlamı:** %4 büyüme + zarar + tespit edilebilir churn = kurumsal devin kırılganlığı. Siteimprove'un geniş paketi (SEO+analitik+içerik) memnuniyetsizlik yaratıyor; Percevia'nın odaklılığı avantaj. Status sayfası ve Success Plans gibi "profesyonellik sinyalleri" kopyalanabilir.

### 2.6 Silktide — UX ve destekte kategori lideri, fiyatta opak

**Ne sunuyor:** Web yönetişim platformu: erişilebilirlik + SEO + içerik kalitesi + UX + GDPR; varsayılan **5 günde bir tarama** + sınırsız ad-hoc test; PDF testi; CMS entegrasyonları; **overlay'i açıkça reddediyor** ("accessibility overlays do not work... we never will") [A]; AI yetenekleri. Ücretsiz Chrome checker + ücretsiz erişilebilirlik kitabı [A].

**Destek modeli:** **Customer Success Manager + Silktide Academy + canlı eğitimler**; destek paketine göre onboarding/eğitim; danışmanlık, manuel denetim, özel eğitim [A]. G2'de "Usability ve Customer Satisfaction'da en yüksek puanlı erişilebilirlik platformu" iddiası [A]; SoftwareReviews composite 7.3/10 (sadece 7 inceleme) [R]. Müşteri yorumlarında gamification (skor artışı) ve CSM kalitesi öne çıkıyor [R].

**Ölçek ve müşteri edinimi:** Fiyat opak, özel teklif, **minimum 12 ay sözleşme** [A]; raporlanan aralık $500–$10,000+/ay [T]. Referanslar: Bayer, Deloitte, Honeywell, Accenture, NHS, Oxford, AbbVie, Carnegie Mellon [A]; İngiltere yerel yönetimlerinde çok güçlü [R].

**Percevia açısından anlamı:** "Skor + gamification + 5 günlük periyodik tarama" modeli, Percevia'nın tek seferlik taramadan **sürekli izlemeye** geçişinin ürün şablonu. Anti-overlay duruşu Percevia ile aynı — Silktide bunu pazarlama varlığına dönüştürmüş durumda.

### 2.7 Pope Tech — Percevia'nın en gerçek rakibi (04 raporuyla uyumlu)

**Ne sunuyor:** WAVE motoruyla site geneli tarama/izleme, **Canvas Accessibility Dashboard** (LMS), manuel test modülü (AIM Score Assistant, 2024), Sensus Access alternatif format ortaklığı. **Ücretsiz plan — süresiz, kredi kartsız** [A]. Fiyatlandırma sayfa sayısına göre; sınırsız tarama ve sınırsız kullanıcı [A].

**Destek modeli (kategorinin en öğretici örneği):**
- **Accessibility Help Desk** — erişilebilirlik uzmanları müşteri sorularını yanıtlıyor [A]
- Help Center (video + makale kütüphanesi) [A]
- Onboarding + AIM Score [A]
- Eğitim koltuğu kullanıcılarına **üç ayda bir eğitim**; **aylık erişilebilirlik odak konuları**; otomatik aylık e-posta raporları [A]
- ADA Title II webinar'ları (Nisan 2026 kuralı öncesi) [A]
- Felsefe: "people over products, education over sales, accessibility over compliance" [A]

**Ölçek ve müşteri edinimi:** Bootstrap (aile şirketi, dış yatırım yok) [A]; yüzlerce yükseköğretim, kamu, banka/kredi birliği, e-ticaret, ajans müşterisi [A]; Canvas ürünü 100+ müşteri (2022), **1M+ öğrenciye dokunan dersler** (2024) [A]. **Satışların bir yüzdesi WebAIM'e bağışlanıyor** [A]. **4K Projesi:** 2019'dan beri 4,000+ ABD yükseköğretim kurumunu periyodik tarayıp boylamsal çalışma yayınlıyor; kurumlar kendi tarama verilerine ücretsiz erişebiliyor [A]. Temmuz 2026: Miami University (OH), Level Access AMP'den Pope Tech'e geçişini kullanılabilirlikle gerekçelendirdi [A].

**Percevia açısından anlamı:** Pope Tech, Percevia'nın hedef segmentinde (kamu, eğitim, orta ölçek) **ürün + eğitim + topluluk + araştırma** dörtlüsüyle kazanıyor. 4K Projesi, "otomatik üretilen benchmark raporu" fikrinin kanıtlanmış modeli — Percevia'nın mevcut tarama hattıyla birebir uygulanabilir.

### 2.8 Evinced — en iyi finanse edilen bağımsız

**Ne sunuyor:** AI/bilgisayarlı görü tabanlı web + mobil test; geliştirici iş akışına gömülü (CI/CD, SDK); 2026'da **agentic otomatik düzeltme** (Disability:IN'de duyuruldu) [A]; **Evinced Learn** eğitim platformu (Nisan 2026, Knowbility ortaklığı) [A]; **Evinced 500** — Fortune 500 erişilebilirlik benchmark raporu (GAAD 2026) [A]; MCAG (Mobil İçerik Erişilebilirlik Kılavuzları) taslağı [A].

**Destek modeli:** Series C kaynağının dört kullanım alanından ikisi doğrudan müşteriyle ilgili: **global satış ve customer success ekiplerini büyütmek** ve Avrupa genişlemesi [A].

**Ölçek ve müşteri edinimi:** Toplam fon **$112M** (PitchBook) / $115M (Caplight) [T]; Series C **$55M** (Ara 2024, Insight Partners liderliğinde; M12, BGV, Capital One Ventures, Engineering Capital, Vertex) [A]; ~134 çalışan [T]; Global 500 odaklı [A].

**Percevia açısından anlamı:** Evinced'in yatırım yaptığı üç şey — agentic düzeltme, eğitim (Learn), benchmark raporu (500) — kategorinin 2026 ürün yönünü işaret ediyor. Percevia için benchmark raporu en düşük maliyetli taklit edilebilir varlık.

### 2.9 Monsido → Acquia Web Governance — kanal oyununun ders kitabı örneği

**Ne sunuyor:** Web yönetişim paketi (erişilebilirlik, QA, SEO, veri gizliliği, performans, consent yönetimi), artık Acquia DXP içinde [A]. Zamanlanmış tarama (günlük/haftalık/özel) + Quick Scan [A].

**Destek modeli:** Acquia'nın destek/eğitim yığınına devredildi; geçişte "mevcut müşteriler için değişiklik yok" güvencesi [A].

**Ölçek ve müşteri edinimi:** Monsido 2014 Danimarka kuruluşu; CivicPlus bünyesindeydi; Acquia satın almayı Kasım 2023'te duyurdu, Mayıs 2024'te tamamladı [A]. "Binlerce kurum" kullanıyor [A]. **Kritik hamle: CivicPlus, ABD yerel yönetim segmentinde bayi (reseller) olarak kaldı** — CivicPlus'ın 10,000+ kamu kurumu ilişkisi kanal olarak korundu [A].

**Percevia açısından anlamı:** Satın alma sonrası bile değerini koruyan şey ürün değil **dağıtım kanalı**. Türkiye'de kamu segmentine açılan kapı, doğrudan satıştan çok yerel bayi/entegratör ortaklıklarından geçiyor (04 raporundaki kamu ihale analiziyle uyumlu).

---

## 3. Müşteri Destek Modeli Karşılaştırması

| Rakip | Destek kanalları | Eğitim/akademi | G2 Destek Skoru [R] | Ayırt edici destek varlığı |
|---|---|---|---|---|
| UserWay | E-posta, bilgi tabanı | — | **9.6** (n=382) | SMB'de en yüksek destek puanı |
| accessiBe | Onboarding ekibi, uzman hizmetler, litigation desteği | Raporlar/webinar | 9.4–9.5 (n≈950) | "En iyi onboarding" ünü; NPO programı |
| Pope Tech | **Accessibility Help Desk** (uzmanlar), Help Center | Üç aylık eğitim, aylık odak konuları, webinar | — | Destek = erişilebilirlik danışmanlığı |
| Level Access | Yönetilen hizmetler, hukuki danışmanlık | Eğitim programları | 9.2 (n=157) | Uzman-hizmet derinliği |
| Deque | Enterprise öncelikli destek | **Deque University** ($400/yıl, engelli bursu), axe-con | — | Kategorinin eğitim standardı; IAAP hazırlık |
| Siteimprove | Help Center, e-posta, Success Plans, status sayfası | **Frontier** akademi, Developer Center | 8.7–8.9 (kullanılabilirlik) | FedRAMP Ready; sertifikalı hizmet ekibi |
| Silktide | **Özel CSM**, canlı eğitim | **Silktide Academy** | G2'de kullanılabilirlik/memuniyet lideri iddiası | Gamification + CSM kalitesi |
| AudioEye | Partner kanalı üzerinden ölçekli destek | CSUN oturumları, raporlar | 11 G2 rozeti (Spring 2026) | Tescilli düzeltme veri tabanı |
| Evinced | Büyütülen CS ekibi (Series C) | **Evinced Learn** (2026) | — | Fortune 500 odaklı CS |

**Desen:** Kategori liderleri desteği üç katmanda kurguluyor: (1) self-serve bilgi tabanı/akademi, (2) insan desteği (CSM/help desk), (3) uzman hizmeti (denetim/danışmanlık). Percevia şu an hiçbir katmanda kamuya açık varlık göstermiyor (uygulamada destek widget'ı, help center veya status sayfası yok).

---

## 4. Müşteri Edinme Oranları — Açıklanan Veriler ve Benchmark'lar

### 4.1 Rakiplerde ölçülebilir edinme performansı

| Rakip | Müşteri ölçeği | Büyüme sinyali | Veri sınıfı |
|---|---|---|---|
| AudioEye | ~129,000 müşteri | +9,000/yıl (~%7.5); ARR +%11 YoY; partner kanalı +%16 YoY | [A] |
| accessiBe | ~110.8K tah. müşteri / "85K+ site" | Gelir +%85 YoY (2023→24, tah.); Inc. 5000 ×2 | [T]/[A] |
| Siteimprove | ~5,600 müşteri (2023); 3,225 aktif tespit | Gelir +%4 (2023); 403 churn tespiti | [A]/[T] |
| Level Access | — | $100M+ ARR (Ara 2024); UserWay satın alımı $98.7M | [A] |
| Pope Tech | "Yüzlerce" kurum; Canvas 100+ | 1M+ öğrenci; 4K Projesi hunisi | [A] |
| Deque | — | ~$35.8M tah. gelir; ücretsiz uzantı hunisi | [T] |
| Evinced | Global 500 odaklı | $112M fon; AB genişlemesi | [A]/[T] |
| Monsido/Acquia | "Binlerce" kurum | CivicPlus bayi kanalı korundu | [A] |
| Silktide | — | Opak; UK kamu/NHS yoğunluğu | [A]/[R] |

**Önemli dürüstlük notu:** Hiçbir özel rakip CAC, huni dönüşüm oranı veya net müşteri edinme maliyeti açıklamıyor. Yukarıdaki tablo vekiller (müşteri sayısı değişimi, ARR büyümesi, kanal karması, inceleme hacmi) kullanır.

### 4.2 Genel SaaS edinme benchmark'ları (Percevia'nın hedef çizgisi için)

| Metrik | Medyan | İyi | Kaynak |
|---|---|---|---|
| Freemium → ücretli | %2–5 | %8–15 (üst çeyrek) | OpenView/FirstPageSage/ChartMogul derlemeleri |
| Opt-in deneme → ücretli | ~%18 | %25+ | FirstPageSage |
| 7 günlük deneme → ücretli | %24 | — | 1capture derlemesi |
| Kullanım-limiti vs özellik-limiti kısıtlama | — | 1.5–2× daha yüksek dönüşüm | acceleroi |
| Partner kanalının toplam gelirdeki payı (olgun programlar) | — | %28'e kadar | Forrester (aktaran: channelasservice) |
| Uyum/güvenlik dikeyinde deneme dönüşümü | %8–14 | — | adv.me derlemesi |

**Percevia için çıkarım:** Mevcut ücretsiz kota tasarımı (günde 3 tarama, tarama başına 3 sayfa) zaten "kullanım-limiti" modelinde — benchmark'lara göre doğru seçim. Eksik olan: (a) girişsiz tek sayfa taraması (huni girişi), (b) dönüşüm ölçümü (ücretsiz→ücretli oranını izleyecek enstrümantasyon), (c) partner kanalı.

---

## 5. Percevia İçin Aksiyon Listesi (Otomasyon-Odaklı — Veri Dosyalarına Manuel Müdahale Yok)

> Kısıt: Tüm öneriler mevcut mimari (Next.js + Firestore + Cloud Tasks + Cloud Run worker) üzerine **kod/otomasyonla** inşa edilebilir; hiçbiri mevcut veri dosyalarının (leads, raporlar, pazar dokümanları) elle düzenlenmesini gerektirmez.

### Öncelik 1 — Huni girişi: girişsiz herkese açık tek sayfa taraması
- **Ne:** Landing page'e URL girişi → rate-limited, tek sayfalık axe taraması → sonuç özeti + "tam rapor için kayıt" CTA'sı.
- **Neden:** Kategorinin evrensel edinme varlığı (WAVE 600K kullanıcı, axe Free, Silktide/Siteimprove checker'ları, accessiBe ücretsiz denetim, Pope Tech ücretsiz plan).
- **Nasıl (otomasyon):** Mevcut worker'a "public single-page" modu; kota middleware'i anonim IP bazlı limit; sonuçlar kalıcı depolanmaz (gizlilik konumlandırmasıyla uyumlu).

### Öncelik 2 — Otomatik benchmark raporu ("Türkiye Erişilebilirlik Endeksi")
- **Ne:** Hedef segment listelerinin (kamu siteleri, üniversiteler, belediyeler) zamanlanmış taraması → otomatik üretilen periyodik endeks raporu.
- **Neden:** Pope Tech 4K Projesi, Evinced 500, WebAIM Million modeli — içerik pazarlamasının en güçlü biçimi; veri **pipeline'dan otomatik üretilir**, elle rapor yazımı yok.
- **Nasıl (otomasyon):** Cloud Scheduler → Cloud Tasks → worker → Firestore agregasyon → statik rapor sayfası. Mevcut kurtarma/izleme cron altyapısı doğrudan kullanılabilir.

### Öncelik 3 — Destek yüzeyi (profesyonellik sinyalleri)
- **Ne:** (a) Herkese açık status sayfası (mevcut `/api/healthz?deep=1` çıktısının sarmalanmış hali), (b) help center/docs, (c) destek e-postası + yanıt süresi taahhüdü, (d) onboarding checklist (mevcut `/onboarding` rotasının genişletilmesi).
- **Neden:** G2 destek skorları 9.2–9.6 bandında; destek kalitesi SMB'de satın alma kriteri. Siteimprove'un status sayfası ve Success Plans'ı kategori standardı.
- **Nasıl (otomasyon):** Status sayfası healthz endpoint'ini yoklar; help center MDX/markdown içerikten derlenir.

### Öncelik 4 — Ajans/partner kanalı altyapısı
- **Ne:** White-label PDF rapor export'u, çoklu-workspace ajans hesabı, bayi fiyatlandırma katmanı.
- **Neden:** AudioEye ARR'sinin %59'u partnerdan; Acquia–CivicPlus bayi modeli; 04 raporundaki Boşluk 9 (ajans/white-label kanalı).
- **Nasıl (otomasyon):** Rapor şablonuna marka parametreleri; workspace modeline "agency" tipi; Polar üzerinden bayi planı.

### Öncelik 5 — Güven katmanı
- **Ne:** Güvenlik sayfası (SOC2 yol haritası), KVKK/DPA sayfası, changelog, "otomatik testin kapsamı" açıklaması (WCAG 2.2 eşleme tablosu: neyi buluyoruz, neyi bulamıyoruz).
- **Neden:** Silktide ve WebAIM'in "dürüstlük" konumlandırması; accessiBe FTC davası sonrası kategoride güven açığı; 04 raporundaki Boşluk 5 (gizlilik/veri egemenliği).
- **Nasıl (otomasyon):** Kapsam tablosu axe-core kural listesinden **otomatik üretilir** (kural → WCAG SC eşlemesi zaten motorda var).

### Öncelik 6 — Ürün derinliği: sürekli izleme
- **Ne:** Zamanlanmış yeniden tarama (Silktide'nin 5 günlük kadansı modeli), trend geçmişi, skor grafiği.
- **Neden:** Pazar "tek seferlik denetimden sürekli uygunluk aboneliğine" kayıyor (Mordor); abonelik gelirinin ve retention'ın temeli.
- **Nasıl (otomasyon):** Cloud Scheduler + mevcut tarama hattı; Firestore'da zaman serisi agregasyonu.

### Öncelik 7 — Edinme ölçümü
- **Ne:** Ücretsiz→ücretli dönüşüm, aktivasyon (ilk tamamlanan tarama), kota-duvarına çarpma anında upgrade prompt'u.
- **Neden:** Benchmark: freemium medyan %2–5, hedef %8+; kota anında prompt +2–5 puan dönüşüm getiriyor.
- **Nasıl (otomasyon):** Mevcut kota guard'ına event enstrümantasyonu; dönüşüm dashboard'u Firestore verisinden üretilir.

---

## 6. Metodoloji ve Veri Bütünlüğü

- **Araştırma tarihi:** 24 Ağustos 2026; tüm web kaynakları bu tarihte erişildi.
- **Veri sınıfları:** [A] şirket açıklaması/SEC dosyalaması/basın bülteni; [T] üçüncü taraf tahmini (GetLatka, Craft.co, Bloomberry, Caplight, PitchBook); [R] inceleme platformu (G2, SoftwareReviews, Trustpilot).
- **Bilinen çelişkiler:** Siteimprove geliri için GetLatka ($46.5M tah.) ile Craft.co ($113M FY2025) ve Danimarka dosyalaması ($103.2M 2023) çelişiyor — resmi dosyalama esas alındı, GetLatka tahmini güvenilmez işaretlendi. accessiBe müşteri sayısında GetLatka (110.8K) ile şirket ifadesi (85K+ site) tanım farkı içeriyor.
- **Kapsam dışı:** CAC, LTV, huni dönüşüm oranları — hiçbir özel rakip tarafından açıklanmıyor; tahmin üretilmedi.
- **Çıkar çatışması uyarısı:** accessiBe'nin kendi blogundaki G2 karşılaştırmaları şirket kaynaklıdır; skorlar G2'nin kamuya açık verisiyle uyumludur ancak yorumlar taraflıdır.

---

## Kaynakça

**Pazar:**
1. Mordor Intelligence — Digital Accessibility Software Market (Mar 2026): mordorintelligence.com/industry-reports/digital-accessibility-software-market
2. SNS Insider — Digital Accessibility Software Market Report (2026): snsinsider.com/reports/digital-accessibility-software-market-6371
3. Grand View Research — Digital Accessibility Software Market Report 2024–2030
4. Straits Research — Digital Accessibility Market (Ağu 2026): straitsresearch.com/report/digital-accessibility-market
5. Emergen Research — Digital Accessibility Software Market 2024–2034

**AudioEye:**
6. AudioEye Q2 2026 sonuçları — PR Newswire (13 Ağu 2026): prnewswire.com/news-releases/audioeye-reports-record-second-quarter-2026-results-302851274.html
7. AudioEye Q1 2026 8-K — StockTitan (May 2026)
8. BriefGlance — AudioEye 2025 yıl sonu özeti (Mar 2026)

**accessiBe:**
9. GetLatka — accessiBe şirket profili (tah.): getlatka.com/companies/accessibe
10. accessiBe Inc. 5000 duyurusu — PR Newswire (11 Ağu 2026)
11. FTC uzlaşması analizi — Adrian Roselli (Oca 2025): adrianroselli.com/2025/01/ftc-catches-up-to-accessibe.html
12. accessiBe fiyatlandırma ve G2 rozetleri — accessibe.com (erişim: Ağu 2026)

**Level Access / UserWay:**
13. Level Access–UserWay satın alımı — BusinessWire (Ara 2023 / Mar 2024); Washington Business Journal ($98.7M)
14. Level Access $100M ARR — Yahoo Finance basın bülteni (Ara 2024, aktaran accessible.org)
15. Level Access Wikipedia (erişim: Tem 2026)
16. accessiBe vs UserWay/Level Access G2 tabloları — accessibe.com blog (G2 kamu verisi)

**Deque:**
17. axe DevTools fiyatlandırma — deque.com/axe/devtools/pricing
18. Deque University — dequeuniversity.com
19. Checkthat.ai — Deque profili (gelir/çalışan tah.)
20. RatedWithAI — axe DevTools incelemesi (Haz 2026)

**Siteimprove:**
21. Siteimprove Holding A/S yıllık rapor (2023, cvrapi.dk)
22. Craft.co — Siteimprove FY2025 finansalları (tah.)
23. Bloomberry — Siteimprove müşteri tespiti (Tem 2026)
24. Siteimprove $100M ARR basın bülteni (Şub 2022)
25. siteimprove.com — destek/akademi/status sayfaları (erişim: Ağu 2026)

**Silktide:**
26. silktide.com/pricing ve /testimonials (erişim: Ağu 2026)
27. SoftwareReviews/Info-Tech — Silktide skorları
28. RatedWithAI — Silktide incelemesi (Haz 2026)

**Pope Tech / WebAIM:**
29. pope.tech/about ve ana sayfa (erişim: Ağu 2026)
30. WebAIM 25 yıl zaman çizelgesi — webaim.org/about/timeline
31. Accessing Higher Ground — Pope Tech 4K Projesi oturum özetleri (2020, 2023)
32. Miami University (OH) — Pope Tech geçiş duyurusu (Tem 2026)

**Evinced:**
33. Evinced Series C — PR Newswire (12 Ara 2024)
34. PitchBook / Caplight / CB Insights — Evinced fon profilleri
35. Evinced 500 duyurusu — GAAD 2026 (May 2026)

**Monsido / Acquia:**
36. Acquia–Monsido satın alımı — CMSWire (Kas 2023), CMS Critic (May 2024)
37. acquia.com/products/acquia-web-governance (erişim: Ağu 2026)

**Benchmark'lar:**
38. FirstPageSage — SaaS free trial conversion benchmarks
39. OpenView/ChartMogul derlemeleri (aktaran: adv.me, saasdash.ai, tryflint.com)
40. Forrester partner gelir payı (aktaran: channelasservice.com)
