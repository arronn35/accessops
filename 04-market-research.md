# Dijital Erişilebilirlik Pazarı — Rakip Analizi ve Pazara Giriş Oyun Kitabı (V2)

**Hazırlayan:** AR-GE / Competitive Intelligence + Go-to-Market Stratejisi
**Sürüm:** V2 — 27 Temmuz 2026 (V1: 27 Temmuz 2026, pazar araştırması)
**Bağlam ürün:** Percevia AI (maitrico) — privacy-first accessibility operations SaaS
**Metodoloji:** 70+ web araması ve birincil kaynak doğrulaması (Resmî Gazete, Aile ve Sosyal Hizmetler Bakanlığı, KVKK, KİK, BTK, BDDK, YÖK, TÜİK, Ticaret Bakanlığı, FTC, DOJ, WebAIM, Deque, UsableNet, Seyfarth, vendor fiyat sayfaları, mahkeme kararı analizleri). Her rakam kaynaklıdır; doğrulanamayan rakamlar açıkça işaretlenmiştir.

> **V2'de ne değişti — 12 maddede**
> 1. **Türkiye Genelgesi'nin tam metni elde edildi.** WCAG sürümü tartışması **kesin olarak çözüldü: WCAG 2.2** + "Kontrol Listesi – A Seviyesi". (Bölüm 5.1)
> 2. **Genelge kapsamı V1'de eksik çıkarılmıştı.** MEB özel öğretim kurumları, karayolu/deniz/demiryolu/havayolu yolcu taşımacıları, Kültür ve Turizm Bakanlığı A Grubu seyahat acenteleri ve **yalnızca 200.000+ aboneli** telekom işletmecileri kapsamda. (Bölüm 5.1)
> 3. **Her kurum kendi bünyesinde "İnceleme Komisyonu" kurmak ve teknik rapor üretmek zorunda.** Bu, Percevia'nın Türkiye'deki tam olarak satın alma birimidir. (Bölüm 5.2)
> 4. **Türkiye'de yerli rakip VAR:** WeAccess.AI (Eskişehir OSB Teknopark + Londra + Dubai) — overlay + tarayıcı + Türk İşaret Dili. V1'in "yerli rakip yok" tespiti yanlıştı. (Bölüm 5.9)
> 5. **AB'de ilk mahkeme kararları geldi.** Auchan (Lille, Mayıs 2026 — reddedildi) ve **Carrefour (Caen, 4 Haziran 2026 — kabul edildi**, 6 ay içinde site + mobil uygulama erişilebilir olacak, gecikirse **günlük 500 €**). Mahkeme "%71 uyumluyum" savunmasını reddetti. (Bölüm 6.2)
> 6. **"Erişilebilirlik beyanındaki yüzde bir iddiadır, savunma değildir"** — bu, Percevia'nın beyan üretme özelliği için doğrudan bir ürün riski. (Bölüm 6.3)
> 7. **Deque MCP Server'ı çıkardı** ("IDE'nizde tek tıkla erişilebilirlik düzeltmesi") + issue deduplication + AI kredisi. Percevia'nın MCP fırsat penceresi daraldı. (Bölüm 4.2)
> 8. **Pope Tech PDF taraması ekledi** (Grackle motoru, PDF/UA) ve ücretsiz planı "aylık 25 sayfa havuzu" olarak konumluyor — Percevia'nın freemium'u karşılaştırmada daha da zayıf. (Bölüm 4.1)
> 9. **Türkiye kamu satın alma eşiği netleşti:** 2026 doğrudan temin limiti büyükşehirde **1.021.827 TL**, diğerlerinde **340.391 TL**. Percevia'nın tüm planları ihalesiz alınabilir bantta. (Bölüm 5.6)
> 10. **KVKK yurt dışı aktarım ceza bandı 2026:** bildirimsizlik için **90.308 TL – 1.806.377 TL**. LLM'e veri gönderimi bu ürün için birinci sınıf hukuki tasarım problemi. (Bölüm 5.5)
> 11. **Forrester Wave Q4 2025** yayınlandı: Lider = Deque, Level Access, Siteimprove. Percevia'nın "analist rozeti" boşluğu ölçüldü. (Bölüm 2.1)
> 12. **Türkiye'nin ilk ulusal dijital erişilebilirlik araştırması (TDEA 2026)** 1 Temmuz 2026'da başladı, sonuç raporu **1 Ekim 2026**. Ortaklık ve PR için tek seferlik bir pencere. (Bölüm 5.10)

---

## İÇİNDEKİLER

**BÖLÜM I — PAZAR DURUMU**
1. Yönetici Özeti — Pazarın 2026'daki Durumu
2. Rakip Matrisi
3. Derin Rakip Profilleri ve Kullanıcı Geri Bildirimleri

**BÖLÜM II — SATIŞ CEPHANESİ**
4. Rakip Battlecard'ları (8 rakip)
5. Türkiye Pazarı Derin Analizi
6. Regülasyon Takvimi ve Yaptırım Gerçekliği
7. Regülasyon × WCAG Eşleme Tablosu
8. Alıcı Persona'ları ve Satın Alma Süreci

**BÖLÜM III — ÜRÜN VE FİYAT STRATEJİSİ**
9. Overlay Tartışması
10. Otomatik Taramanın Tavanı
11. WebAIM Million 2026 — Birinci Sınıf Veri
12. Pazar Büyüklüğü
13. Satın Alma Davranışı
14. Fiyatlandırma Derin Analizi
15. Pazar Boşlukları ve Fırsat Alanları
16. Percevia SWOT

**BÖLÜM IV — YÜRÜTME**
17. İçerik, SEO ve Talep Yaratma Oyun Kitabı
18. 12 Aylık Rekabet Senaryoları
19. Satın Alma ve Çıkış Manzarası
20. 90 Günlük Yürütme Planı
21. Öncelikli Aksiyonlar
22. Kaynaklar
23. Ek: Doğrulanamayan / İhtiyatla Kullanılacak Veriler

---

# BÖLÜM I — PAZAR DURUMU

## 1. Yönetici Özeti — Pazarın 2026'daki Durumu

2026 ortası itibarıyla dijital erişilebilirlik pazarı **üç güç arasında sıkışmış** durumda: (1) hızla artan özel hukuk davası riski, (2) Avrupa'da yeni başlayan idari yaptırım ve **artık mahkeme kararları**, ve (3) ABD federal düzenleyicisinin geri çekilmesi. Aynı anda, teknik olarak web **daha erişilemez hale geliyor** — yani ürünler satılıyor ama sonuç iyileşmiyor. Bu, hem büyük bir pazar fırsatı hem de kategori için varoluşsal bir güvenilirlik sorunu.

V2'nin eklediği tek cümlelik tez şudur: **Pazarın hukuki belirsizliği 2026 H1'de kapandı; artık bilinmeyen "ceza gelecek mi" değil, "kim önce ölçmeye başlayacak". Percevia'nın kazanacağı yer bu ölçüm katmanı — ve coğrafi olarak Türkiye.**

### En Önemli 12 Bulgu

**1. Web geriliyor — 7 yıllık iyileşme trendi tersine döndü.**
WebAIM Million 2026 (Şubat 2026 verisi): ana sayfaların **%95,9'unda** otomatik tespit edilebilir WCAG 2 ihlali var (2025: %94,8). Sayfa başına ortalama hata **56,1** — bir yılda **%10,1 artış**. WebAIM bunu doğrudan "3. taraf framework bağımlılığı ve otomatik/AI destekli kodlama pratikleri (*vibe coding*)" ile ilişkilendiriyor.
Kaynak: https://webaim.org/projects/million/

**2. ABD'de federal düzenleyici geri çekildi, özel dava patladı.**
DOJ, 20 Nisan 2026'da yayımladığı Interim Final Rule ile ADA Title II uyum tarihlerini **1 yıl erteledi** (≥50.000 nüfus: 26 Nisan 2027; <50.000 ve özel bölgeler: 26 Nisan 2028). Gerekçe olarak açıkça "kaynak kısıtları ve **üretken yapay zeka dahil mevcut teknolojinin ölçekte otomatik remediation yapamaması**" gösterildi. Buna karşılık UsableNet, 2026'nın ilk yarısına dayanarak yılı **~6.176 dava** ile kapatacağımızı öngörüyor — tarihi rekor, 2025'e göre ~%20 artış.
Kaynaklar: https://www.adatitleiii.com/2026/04/doj-extends-ada-title-ii-website-accessibility-deadlines-for-governmental-entities-but-litigation-and-compliance-risks-remain/ · https://blog.usablenet.com/inside-the-2026-midyear-numbers-where-digital-accessibility-litigation-is-going

**3. Overlay tezi hukuken ve ticari olarak çöktü.**
FTC, accessiBe'ye **1 milyon dolar** ceza kesti (nihai karar Nisan 2025). UsableNet 2026 midyear verisi: widget kullanan şirketlere açılan dava sayısı **azalmıyor** (Ocak 2026: 165 dava, Şubat: 172). AudioEye kendi fiyat sayfasında otomatik araçların "**~%50** erişilebilirlik sorununu" ele aldığını yazıyor. Overlay Fact Sheet'i **600+** erişilebilirlik uzmanı imzaladı.
Kaynaklar: https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million · https://www.audioeye.com/plans-and-pricing/ · https://overlayfactsheet.com/en/

**4. Otomatik tarama tavanı ~%57 — ve bu "WCAG kriterlerinin %57'si" DEĞİL.**
Deque'in birincil çalışması: 2.000+ denetim, 13.000+ sayfa, ~300.000 issue üzerinden **%57,38** — bu **issue hacminin** yüzdesi, WCAG başarı kriterlerinin değil. Bu nüans pazarda sürekli yanlış aktarılıyor ve Percevia için dürüst konumlandırma fırsatı.
Kaynak: https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/

**5. Fiyat uçurumu: $0 / $490-yıl (overlay) / $25.000-150.000-yıl (enterprise). Arada neredeyse kimse yok.**
Doğrulanmış: accessiBe Micro **$490/yıl**, UserWay Pro **$490/yıl**, Pope Tech Team **$25/ay**, Level Access **$25k–150k+/yıl**, Siteimprove **$12k–70k/yıl**. Geliştirici odaklı, overlay olmayan, $20–200/ay bandında ciddi bir ürün pazarda pratikte yok. **Bu Percevia'nın ana boşluğu.**

**6. AB'de yaptırım artık teorik değil — ilk mahkeme kararı geldi ve şirket kaybetti.**
Fransa DGCCRF Kasım 2025'te Auchan, Carrefour, E.Leclerc ve Picard'a resmî ihtar gönderdi. **Mayıs 2026:** Lille mahkemesi Auchan davasını eşik gerekçesiyle reddetti. **4 Haziran 2026:** Caen Adliye Mahkemesi (Tribunal judiciaire de Caen), Carrefour France'a **carrefour.fr ve mobil uygulamasını 6 ay içinde erişilebilir hale getirme** emri verdi; gecikme halinde **günlük 500 €** para cezası. Bu, AB'de bir şirketin uymaya zorlandığı **ilk EAA mahkeme kararı** ve **mobil uygulamayı açıkça kapsayan ilk karar**. Carrefour'un "RGAA'ya göre %71 uyumluyum" savunması reddedildi; mahkeme erişilebilirliği bir **sonuç yükümlülüğü** (*obligation de résultat*) olarak niteledi. E.Leclerc duruşması **22 Eylül 2026**'da Créteil'de. Haziran 2026 itibarıyla doğrulanmış EAA **idari para cezası** hâlâ yok — yaptırım şu an mahkeme kanalından geliyor.
Kaynaklar: https://silktide.com/blog/second-eaa-ruling-4-june-2026/ · https://www.deque.com/blog/frances-major-court-decision-supporting-digital-accessibility-under-the-eaa/ · https://www.deque.com/blog/early-signs-of-eaa-enforcement-across-europe/

**7. "Erişilebilirlik beyanındaki yüzde bir savunma değil" — Percevia için doğrudan ürün riski.**
Carrefour kararının en aktarılabilir cümlesi budur. Percevia'nın **erişilebilirlik beyanı üretme** özelliği, otomatik tarama sonucundan türetilmiş bir "uyum yüzdesi" içeriyorsa, müşterisine mahkemede işe yaramayacak — hatta aleyhine kullanılabilecek — bir artefakt üretiyor demektir. Beyan üretimi, yüzde değil **kapsam, yöntem, bilinen bariyerler ve düzeltme takvimi** üzerine kurulmalı.
Kaynak: https://silktide.com/blog/second-eaa-ruling-4-june-2026/

**8. Türkiye'de bağlayıcı takvim var, standart WCAG 2.2, ve kapsam V1'de sanıldığından geniş.**
2025/10 sayılı Cumhurbaşkanlığı Genelgesi (Resmî Gazete, 21 Haziran 2025, Sayı 32933) tam metni doğrulandı. Standart: **"Web Siteleri ve Mobil Uygulamaların Erişilebilirliği Kontrol Listesi – A Seviyesi" + WCAG 2.2**. Kapsam (1 yıl, ≈Haziran 2026 doldu): kamu kurum ve kuruluşları, üniversiteler, belediyeler, KİT'ler, **belediye şirket/işletme/iştirakleri**, kamu kurumu niteliğindeki meslek kuruluşları, bankalar, özel hastaneler, **MEB izniyle açılan özel öğretim kurumları**, **4925 sayılı Kanun kapsamındaki karayolu taşımacıları + yolcu gemileri + demiryolu + havayolu yolcu taşıyan özel kuruluşlar**, **Kültür ve Turizm Bakanlığı A Grubu seyahat acenteleri**, **200.000'den fazla abonesi olan elektronik haberleşme işletmecileri**. E-ticaret hizmet sağlayıcıları (6563 sayılı Kanun): **2 yıl, ≈Haziran 2027**.
Kaynak (tam metin): https://www.aile.tr/media/268283/web_siteleri_ve_mobil_uygulamalarin_erisilebilirligi_genelgesinin_alternatif_metin_versiyonu.pdf

**9. Türkiye'de her kapsam içi kurum kendi "İnceleme Komisyonu"nu kurup teknik rapor yazmak zorunda.**
Genelge metni: *"izlemesi yapılacak her bir kurum, kuruluş, üniversite ve tüzel kişilerce kendi bünyelerinde, web siteleri ve mobil uygulamaların erişilebilirliğini teknik olarak incelemek ve buna ilişkin rapor hazırlayarak İzleme Komisyonuna sunmak üzere 'Web Siteleri ve Mobil Uygulamaların Erişilebilirliği İnceleme Komisyonu' oluşturulacaktır."* Bu komisyon Percevia'nın Türkiye'deki **birebir alıcı birimidir** ve ürünün çıktısı (PDF rapor + issue kaydı + düzeltme takibi) tam olarak bu komisyonun üretmesi gereken belgedir.
Kaynak: aynı Genelge metni.

**10. Türkiye'de yerli/Türkçe rakip var — ve o bir overlay.**
**WeAccess.AI** (Eskişehir Osmangazi Üniversitesi Teknopark; ayrıca Londra ve Dubai ofisleri): Insight (WCAG 2.2 tabanlı tarayıcı + rapor), **Widget (overlay)**, Visual (AI alt metin), **Sign Language (Türk İşaret Dili dahil 5 işaret dili)**, Motion, Echo. Web/mobil/medya/PDF/basılı içerik dikeyleri. ISO 27001, IAAP kurumsal üyesi, "Stratejik Ortaklar" programı, ücretsiz erişilebilirlik denetleyicisi. **Fiyat yayımlanmıyor.** V1'in "Türkçe arayüzlü ciddi bir SaaS yok" tespiti **yanlıştı** ve düzeltilmiştir.
Kaynaklar: https://www.weaccess.ai/tr/web-accessibility · https://www.weaccess.ai/tr/accessibility-checker

**11. Türkçe siteler küresel ortalamanın %17,9 üzerinde hatalı.**
WebAIM Million 2026: Türkçe sayfalar ortalama **66,2 hata** (küresel ort. 56,1; İngilizce 46,0). Örneklem 11.248 sayfa. Türkçe siteler İngilizce sitelere göre **%44 daha fazla** hata barındırıyor.
Kaynak: https://webaim.org/projects/million/

**12. Kategori analist konsensüsü oluştu — ve Percevia listede yok.**
Forrester Wave™: Digital Accessibility Platforms, Q4 2025 — 9 sağlayıcı, 25 mevcut teklif + 7 strateji kriteri. **Liderler: Deque** (strateji kategorisinde en yüksek skor, 21 kriterde tam puan), **Level Access** (mevcut teklifte en yüksek skor), **Siteimprove** (birleşik platform farklılaşması). Gartner Market Guide 2025 de aynı üçlüyü temsili vendor olarak listeliyor. Bu, kurumsal kısa listeleri belirleyen mekanizmadır; Percevia'nın kurumsal segmentte **yapısal olarak** dezavantajlı olduğunun ölçüsüdür.
Kaynaklar: https://www.forrester.com/blogs/five-themes-from-the-forrester-wave-digital-accessibility-platforms-q4-2025/ · https://www.siteimprove.com/press/siteimprove-named-a-leader-in-digital-accessibility-platforms/ · https://www.levelaccess.com/resources/the-forrester-wave-digital-accessibility-platforms-q4-2025/

---

## 2. Rakip Matrisi

> **Fiyat notu:** "Yayınlanmamış" = vendor fiyat yayımlamıyor, satış ekibiyle görüşme gerekiyor. Üçüncü taraf (Vendr, TrustRadius, Capterra, PeerSpot) rakamları **[3P]** ile işaretlenmiştir ve gerçekleşen sözleşme verisi/ikincil kaynaktır, liste fiyatı değildir.

### 2.1 Kurumsal / Denetim Odaklı

| Ürün | Kategori | Teknoloji | Fiyat | Ücretsiz katman | AI özellikleri | Güçlü yönler | Zayıf yönler | Hedef segment | Kaynak |
|---|---|---|---|---|---|---|---|---|---|
| **Deque axe DevTools / Monitor / Auditor / MCP Server** | Geliştirici + kurumsal denetim | axe-core motoru; tarayıcı eklentisi, IDE linter, **MCP Server**, CI API, Intelligent Guided Tests (yarı-otomatik manuel test) | Pro **~$40–45/ay/kullanıcı** veya **~$500/yıl** [3P]; kurumsal **$15k–50k/yıl** (5–20 koltuk), enterprise **$75k–250k+/yıl** [3P]. **Resmî fiyat sayfası (Haziran 2026 güncellemesi) hâlâ rakam yayımlamıyor** — sadece plan karşılaştırma tablosu var. | **Evet** — ücretsiz tarayıcı eklentisi + axe-core açık kaynak (MPL-2.0) | axe Assistant, **AI-enhanced automation + aylık AI kredi kotası**, **issue deduplication**, guided tests, **Axe MCP Server** ("IDE'nizde tek tıkla erişilebilirlik düzeltmesi") | Fiili endüstri standardı motoru (npm'de **~15M indirme/hafta**, axe araçları toplam **1 milyar+ indirme**); "sıfır false positive" politikası; **Forrester Wave Q4 2025 Lideri, strateji kategorisinde en yüksek skor, 21 kriterde tam puan**; güçlü topluluk itibarı | Pro özellikleri ücretsizde yok; Auditor **Jira ile uyumlu değil** ve bug export edemiyor; Monitor'de **çok sayıda false positive / "needs review"** şikâyeti; Salesforce desteklenmiyor; **fiyat şeffaflığı yok**; yönetime satması zor | Enterprise mühendislik ekipleri, a11y uzmanları | https://www.deque.com/axe/devtools/pricing/ · https://www.deque.com/axe/mcp-server/ · https://www.deque.com/axe/axe-core/ · https://www.deque.com/blog/axe-core-1-billion-downloads/ · https://www.vendr.com/marketplace/deque |
| **Level Access Platform** (+ UserWay, + Tenon) | Kurumsal platform + yönetilen hizmet + overlay | Hibrit: otomatik tarama + uzman manuel denetim + UserWay overlay/otomatik remediation | **Yayınlanmamış.** [3P] **$25k–150k+/yıl**; "Accelerate" tier ~**$60k–100k/yıl**; bazı kapsamlarda $500k+ | Hayır (UserWay tarafında deneme var) | UserWay "AI-powered automated remediation" + human-in-the-loop | Pazarın en geniş kapsamı (yazılım + hizmet + overlay + VPAT + hukuki destek); UserWay ile **1M+ site** erişimi; **Forrester Wave Q4 2025 Lideri — mevcut teklifte en yüksek skor, Innovation kriterinde tam puan**; Gartner Market Guide temsili vendor | Overlay mirası (UserWay) itibar riski taşıyor; fiyat şeffaflığı yok; SMB için erişilemez | Enterprise, kamu, yüksek öğrenim | https://www.levelaccess.com/news/level-access-completes-acquisition-of-userway-signaling-the-next-evolution-of-digital-accessibility/ · https://www.levelaccess.com/resources/the-forrester-wave-digital-accessibility-platforms-q4-2025/ · https://testparty.ai/blog/level-access-pricing · https://www.vendr.com/marketplace/level-access |
| **Siteimprove** | Web governance suite (a11y bir modül) | Statik crawl + DOM analizi; SEO/QA/analytics/policy modülleriyle bundle | **Yayınlanmamış.** [3P] 1.000–5.000 sayfa: **$12k–30k/yıl**; 10k–25k sayfa: **$35k–70k/yıl**; genel aralık $5k–50k+ | Hayır (ücretsiz online Accessibility Checker aracı var) | AI destekli içerik/erişilebilirlik önerileri | Olgun, geniş kurumsal referans; G2'de 4,6/5 (432 yorum); a11y dışında SEO/QA değeri; **Forrester Wave Q4 2025 Lideri**; Nordic Capital sahipliği; MarketMuse satın alması (Eki 2024) ile içerik stratejisi modülü | Kullanıcılar **false positive** (çalışan linkleri kırık göstermesi) ve **pahalı** olduğunu bildiriyor; "arkaik sistem, latency" şikâyetleri; **bildirimsiz otomatik yenileme** şikâyetleri; modüler fiyat şişiyor | Kurumsal pazarlama/web governance ekipleri | https://www.g2.com/products/siteimprove/reviews · https://www.siteimprove.com/press/siteimprove-named-a-leader-in-digital-accessibility-platforms/ · https://www.vendr.com/marketplace/siteimprove · https://www.capterra.com/p/164806/Siteimprove/reviews/?page=2 |
| **Acquia Web Governance** (eski Monsido → Acquia Optimize) | Web governance | Crawl tabanlı tarama, QA/SEO/policy modülleri | **Yayınlanmamış**, modüler. Bir kaynak "özellik başına ~$2.000/yıl" diyor [3P, doğrulanmadı] | Hayır | Sınırlı | Acquia/Drupal ekosistemine gömülü dağıtım kanalı | **İki kez rebrand** (Monsido → Acquia Optimize, Ekim 2024 → Acquia Web Governance, geç 2025) → müşteri kafa karışıklığı; satın alma sonrası paket ve ticari şartlar değişti | Drupal/Acquia müşterileri, kamu | https://silktide.com/blog/what-happened-to-monsido/ · https://www.g2.com/products/acquia-web-governance/reviews |
| **Evinced** | AI-first geliştirici platformu | Tarayıcı otomasyonu + görsel/DOM AI ile issue clustering; SDK, mobil SDK, MCP Tools | **Yayınlanmamış** | Hayır (deneme) | Evinced Chatbot (Eyl 2025) — kör benchmark'ta uzman paneli Evinced yanıtlarını GPT-4'e göre **3 kat daha sık** en iyi seçmiş (vendor iddiası); **MCP Tools**; **Evinced 500** (GAAD 2026 — Fortune 500 erişilebilirlik endeksi) | En iyi finanse edilen bağımsız oyuncu: **$55M Series C** (Ara 2024), toplam **$112M** — Insight Partners, M12 (Microsoft), Capital One Ventures, Vertex; issue clustering gürültüyü ciddi azaltıyor; sermayenin açık amacı **Avrupa'ya açılma** | Fiyat opak; SMB'ye satmıyor; Avrupa'ya yeni açılıyor | Büyük mühendislik organizasyonları | https://techcrunch.com/2024/12/12/evinceds-55m-c-round-will-help-bring-its-accessibility-dev-tools-and-ai-to-europe/ · https://www.prnewswire.com/news-releases/gaad-2026-evinced-launches-evinced-500-offering-a-new-lens-into-enterprise-accessibility-performance-302779177.html |
| **Tenon** | A11y test API | REST API tabanlı tarama motoru | Bağımsız fiyat yok | — | — | — | **30 Kasım 2021'de Level Access tarafından satın alındı**, bağımsız ürün olarak stratejik önemini yitirdi | (tarihsel) | https://en.wikipedia.org/wiki/Level_Access |
| **UsableNet** (AQA + Assistive) | Yönetilen hizmet + test yazılımı | Assistive: paralel erişilebilir katman + uzman + hukuki destek. AQA: tarama/test yönetim yazılımı | AQA [3P] **~$200/kullanıcı/yıl**; Assistive **yayınlanmamış** (usablenet.com/pricing sayfası mevcut) | AQA'nın ücretsiz tarama aracı var | Sınırlı; şirket AI iddialarına mesafeli | Sektörün **en güvenilir dava veri seti** (yıllık ve midyear raporlar) → muazzam thought leadership; e-ticaret/perakendede derin uzmanlık | Yazılım ürünü pazarlama açısından zayıf; "Assistive" paralel site yaklaşımı bazı a11y uzmanlarınca eleştiriliyor | Büyük e-ticaret/perakende | https://usablenet.com/pricing · https://blog.usablenet.com/ada-web-lawsuit-trends-2026 |

### 2.2 Overlay / Widget

| Ürün | Kategori | Teknoloji | Fiyat | Ücretsiz katman | AI özellikleri | Güçlü yönler | Zayıf yönler | Hedef segment | Kaynak |
|---|---|---|---|---|---|---|---|---|---|
| **accessiBe** (accessWidget / accessFlow / accessServices) | Overlay + geliştirici platformu + hizmet | accessWidget: JS overlay, 24 saatte bir tarama+"fix". accessFlow: kod düzeyi tarama + AI kod önerisi, CI/CD + MCP | **accessWidget yayınlanmış:** Micro **$490/yıl** (≤5.000 ziyaret/ay), Growth **$1.490/yıl** (≤30k), Scale **$3.990/yıl** (≤100k), Enterprise custom. Özel hukuki şartlar **$20k+**. Fiyat SimilarWeb trafiğine göre. **accessFlow: yayınlanmamış** (Essential ≤1.000 sayfa / Professional ≤10.000 / Enterprise 10.000+) | accessScan ücretsiz tarayıcı; ücretsiz deneme | "AI-powered", "her 24 saatte otomatik fix". FTC bu iddiaları **aldatıcı** buldu. accessFlow'da AI kod önerisi + MCP | Muazzam dağıtım ve marka bilinirliği; **5.000+ ajans partneri, %20 komisyon (12 ay), WSI partnerlerinde %30**; dava desteği paketi (dedicated case manager, ADA avukatı ile 1–10 saat) satın alma tetikleyicisini doğrudan hedefliyor; fiyat şeffaf | **FTC $1M cezası** (Ocak 2025 complaint, Nisan 2025 nihai karar) — nav menüleri, form alanları, görsel açıklamaları erişilebilir yapamadığı tespit edildi; ayrıca sahte bağımsız yorum yerleştirme; kendi sitesinde **"excluded issues"** sayfası tutuyor; **iade politikası kaldırıldı**, iptal self-servis değil; müşteri hizmetleri şikâyetleri; overlay kullanan siteler yine dava alıyor; **PeerSpot mindshare %22,9 → %15,7'ye düştü** [3P] | SMB, ajanslar; accessFlow ile mid-market mühendislik | https://accessibe.com/pricing/accesswidget · https://accessibe.com/pricing/accessflow · https://accessibe.com/partner-program · https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-order-requires-online-marketer-pay-1-million-deceptive-claims-its-ai-product-could-make-websites · https://www.lflegal.com/2025/01/ftc-accessibe-million-dollar-fine/ |
| **UserWay** (Level Access) | Overlay + monitoring | JS widget + "automated remediation technology" + human-in-the-loop; ayrı satılan crawl monitoring | **Yayınlanmış:** Pro **$490/yıl**, Pro Plus **$1.190/yıl**, Ultimate **$2.490/yıl** (hepsi ≤100K pageview/ay). Bağımsız monitoring: 100 sayfa **$990/yıl**, 500 sayfa **$4.490/yıl**, 1.500 sayfa **$10.990/yıl**. Audit ve VPAT add-on | Ücretsiz deneme | "AI-powered remediation", 1000+ kişiselleştirme aracı, 50+ dile canlı çeviri | Level Access'in kurumsal gücüne upsell köprüsü; fiyat tam şeffaf; ISO 27001; monitoring modülü overlay'den ayrı satın alınabilir (dürüst bir hamle) | Overlay temel eleştirileri geçerli; **BloomsyBox davası** — UserWay overlay'i satın alan müşteri yine dava aldı, dava UserWay'in overlay'in ne yaptığını yanlış tanıttığını iddia ediyor; monitoring sayfa limitleri düşük (Pro'da sadece 10 sayfa) | SMB, ajanslar | https://userway.org/pricing/ · https://www.lflegal.com/2025/02/userway-overlay-lawsuit/ |
| **AudioEye** | Overlay + yönetilen hizmet (halka açık şirket, NASDAQ: AEYE) | Otomatik fix + aktif monitoring + uzman denetim + custom fix; "Assurance" mali garanti | **Yayınlanmamış** — plan sayfası (Automated / Self-Managed / Managed) fiyat göstermiyor. [3P] $199–799/ay | Ücretsiz site tarayıcı | "AudioEye 2,5 kat daha fazla issue tespit ediyor" (kendi sponsorlu 3. taraf çalışması) | **Finansal şeffaflık:** Q1 2026 geliri **$10,6M** (+%8 YoY), **ARR $41,2M**, **~127.000 müşteri**; FY2025 geliri **$40,3M** (+%14,5); FY2026 rehberliği $43,25–44,25M. "Assurance" ile sınırlı mali koruma — rakiplerin sunmadığı gerçek bir taahhüt. **Reseller + Platform partner kanalı**: tier'a göre indirimli fiyat, referral için evergreen komisyon, hacim için wholesale fiyat | **Kendi fiyat sayfasında** otomatik araçların "**~%50** erişilebilirlik sorununu" ele aldığını ve "*kalan sorunlar için uzman testini içermediğini*" yazıyor — kategori için en dürüst ama en zararlı itiraf; büyüme **%14,5'ten ~%8'e yavaşladı**; Q1 2026 GAAP net zarar $2,1M; overlay itibar riski; **PeerSpot mindshare %11,6 → %9,9** [3P] | SMB → mid-market, ajans/platform partner kanalı | https://www.audioeye.com/plans-and-pricing/ · https://www.audioeye.com/partners/ · https://www.prnewswire.com/news-releases/audioeye-reports-record-first-quarter-2026-results-302770076.html |
| **WeAccess.AI** 🆕 | Overlay + tarayıcı + içerik erişilebilirliği (Türkiye merkezli) | Insight (WCAG 2.2 tarama + rapor, günlük/haftalık/aylık), **Widget (overlay)**, Visual (AI görsel betimleme), **Sign Language (TİD + ASL + Fin + Kenya + Arap işaret dili)**, Motion, Echo. Web / mobil / medya / PDF / basılı içerik dikeyleri | **Yayınlanmamış** — demo talebi üzerinden | Ücretsiz erişilebilirlik denetleyicisi | Konumlandırmanın tamamı "yapay zeka destekli" | **Türkiye'nin tek görünür yerli oyuncusu.** Türkçe UI, Türkçe içerik pazarlaması (kamu/belediye, sağlık, perakende, turizm dikey sayfaları), ISO 27001, IAAP kurumsal üyeliği, "Stratejik Ortaklar" programı, TR + UK + UAE ofis yapısı, Türk İşaret Dili eklentisi (Türkiye'de eşi yok) | **Widget = overlay** → FTC/Overlay Fact Sheet eleştirilerinin tamamı geçerli; fiyat opak; bağımsız kullanıcı yorumu ve ölçek kanıtı zayıf; sitede "WCAG 2.1" ve "WCAG 2.2" referansları karışık kullanılıyor; G2/Capterra profilleri var ama yorum hacmi düşük | TR kamu, belediye, sağlık, turizm, perakende | https://www.weaccess.ai/tr/web-accessibility · https://www.weaccess.ai/tr/accessibility-checker · https://www.weaccess.ai/tr/partner · https://www.g2.com/products/weaccess-ai/reviews |
| **EqualWeb** | Overlay + manuel remediation | JS widget + AI remediation + manuel hizmet | [3P] **$590/yıl** sabit veya **$39/ay** — vendor sayfasından doğrulanmadı | Sınırlı ücretsiz plan | "AI-enabled remediation" | Fiyat agresifliği; İsrail/AB pazarında yerleşik | Overlay eleştirileri; ABD dava verisinde overlay kullanıcıları arasında adı geçiyor; ürün derinliği düşük | Mikro/SMB | https://www.g2.com/products/equalweb/pricing · https://www.capterra.com/p/233808/Equalweb/ |

### 2.3 Geliştirici / Açık Kaynak

| Ürün | Kategori | Teknoloji | Fiyat | Ücretsiz katman | AI | Güçlü yönler | Zayıf yönler | Hedef segment | Kaynak |
|---|---|---|---|---|---|---|---|---|---|
| **axe-core** (Deque) | Açık kaynak motor | JS kütüphanesi, rendered DOM analizi; Playwright/Cypress/Selenium/Jest adapter'ları | **Ücretsiz** (MPL-2.0) | Tamamen | Yok (motor deterministik) | Fiili standart; **~15M npm indirme/hafta**; sıfır-false-positive politikası; Percevia dahil neredeyse tüm ürünlerin altyapısı | Sadece motor — UI, raporlama, takip, ekip yok; WCAG 2.2 için Deque açıkça "target-size dışında yeni kural eklemeyeceğiz, gerisi çok fazla false positive üretiyor" diyor → **tavan sabit** | Geliştiriciler | https://github.com/dequelabs/axe-core · https://www.deque.com/blog/axe-core-1-billion-downloads/ |
| **Pa11y** | Açık kaynak CLI/CI | HTML_CodeSniffer veya axe motoru, headless tarayıcı, pa11y-ci, dashboard | **Ücretsiz** | Tamamen | Yok | CI/CD'de build'i fail ettirebilme; sıfır maliyet; pa11y-dashboard ile basit trend takibi | Bakım hızı yavaş; kurumsal raporlama, ekip, task takibi yok; kurulum/işletim yükü müşteride | Geliştiriciler, kamu ekipleri | https://www.digitala11y.com/open-source-accessibility-tools/ |
| **Google Lighthouse** | Ücretsiz denetim | axe-core alt kümesi + performans/SEO | **Ücretsiz** | Tamamen | Yok | Chrome'a gömülü, sıfır sürtünme, PageSpeed/CI entegrasyonu; herkes zaten kullanıyor | **Uyumluluk için yanıltıcı** — a11y skoru WCAG kapsamının küçük bir alt kümesi; "100 aldım, uyumluyum" yanılsaması pazardaki en büyük eğitim problemi | Herkes | https://www.a11yflow.dev/blog/accessibility-testing-tools-compared |
| **WAVE** (WebAIM) | Ücretsiz denetim + API | Kendi motoru, rendered DOM; stand-alone API | Tarayıcı eklentisi/web aracı **ücretsiz**; stand-alone API lisanslı | Evet | Yok | WebAIM Million'ın motoru → sektörün referans veri seti; görsel in-page annotation eğitim değeri yüksek; kâr amacı gütmeyen üniversite kurumu (Utah State) → itibar | Ürünleşmiş platform değil; ekip/task/monitor yok (Pope Tech bu boşluğu dolduruyor) | Herkes, eğitim | https://wave.webaim.org/ · https://webaim.org/projects/million/ |
| **IBM Equal Access Toolkit** | Açık kaynak | Tarayıcı eklentisi + Node CLI + karma motor | **Ücretsiz** | Tamamen | Yok | Thoughtworks Technology Radar'da yer aldı; production'da deploy edilmiş sayfa testinde bazı ekipler axe'a tercih ediyor | Topluluk küçük; ürün/hizmet katmanı yok | Geliştiriciler | https://www.thoughtworks.com/en-us/radar/tools/ibm-equal-access-accessibility-checker |
| **Storybook a11y addon** | Bileşen düzeyi test | axe-core üzerine kurulu; Vitest addon ile CI'da çalışıyor | **Ücretsiz** | Tamamen | Yok | Tasarım sistemi düzeyinde "shift-left" — sorunun kaynağını yakalar; Vercel/Netlify deployment_status event'iyle CI'a bağlanabiliyor | Sadece bileşen; gerçek sayfa kompozisyonu, içerik, 3. taraf script'leri kapsamaz; Storybook kullanmayan takım için değersiz | Frontend/design system ekipleri | https://storybook.js.org/docs/writing-tests/accessibility-testing |

### 2.4 Yeni Nesil / AI-First / Bitişik

| Ürün | Kategori | Teknoloji | Fiyat | Ücretsiz katman | AI | Güçlü yönler | Zayıf yönler | Hedef segment | Kaynak |
|---|---|---|---|---|---|---|---|---|---|
| **Pope Tech** | SMB/eğitim tarama platformu | **WAVE motoru** lisanslı (WCAG 2.2 A/AA tespit edilebilir kriterler); crawl + zamanlanmış tarama + ekip/grup hiyerarşisi + manuel test takibi + **PDF taraması (Grackle, PDF/UA — Beta add-on)** | **Tamamen yayınlanmış:** Free **$0** (25 sayfa havuzu/ay, 2 kullanıcı, 1 site, sonsuza kadar), Team **$25/ay**'dan (50 sayfa tier, yıllık; $30 aylık), Business Plus **$225/ay**'dan (500 sayfa; $270 aylık), Professional **$400/ay**'dan (eğitim dahil) | **Evet, gerçek ve kalıcı** (25 sayfa/ay havuzu, **sınırsız rescan**) | Yok — AI iddiası **yapmıyor** | **Percevia'nın en yakın gerçek rakibi.** Şeffaf fiyat, sınırsız kullanıcı/site/grup, Jira/Asana entegrasyonu, login arkası tarama, GitHub/Bitbucket CI/CD, SSO, Developer API, YouTube altyazı tespiti, Accessibility Plan Tracking. Fiyat/değer oranı pazarın en iyisi. **Yıllık/aylık indirim oranı %16,7 (2 ay bedava normu)** | AI/kod önerisi yok; WAVE motoru → axe ekosistemine göre daha az geliştirici-native; ağırlıklı ABD yüksek öğrenim odaklı; AB/Türkiye pazarında ve çok dilde zayıf; broken link ve video/doküman dashboard'u "coming soon" | Yüksek öğrenim, kamu, SMB, ajanslar | https://www.pope.tech/websites/pricing · https://blog.pope.tech/2026/02/04/web-accessibility-platform-product-updates-2026/ |
| **Silktide** | Web governance | Crawl + WCAG 2.2, user flows (çok adımlı form testi), mobil, policies, cookie-free analytics, prioritization, uptime monitor, API | **Yayınlanmamış** — quote-only, **12 ay minimum** taahhüt [3P] | Ücretsiz Silktide Toolbar (tarayıcı eklentisi) + ücretsiz cookie banner + ücretsiz kontrast aracı | "Dünyanın ilk AI destekli web governance çözümü" iddiası | G2'de sürekli **#1 kullanılabilirlik**; 2026 Leader/High Performer/Best Results/Best Relationship rozetleri; UX kalitesi kategorinin en iyisi; NHS, Oxford, eBay, Deloitte referansları; Siteimprove/Monsido'dan aktif switch kampanyası; **kategorinin en iyi içerik pazarlaması** (EAA mahkeme kararlarını herkesten önce ve daha iyi analiz ediyor); SOC2 + VPAT yayınlıyor; AB veri bölgesi var (app.eu.silktide.com) | Fiyat gizli + 12 ay taahhüt SMB'yi eliyor; a11y saf ürün değil, governance suite | Kamu, yüksek öğrenim, büyük kurumlar, web ajansları | https://silktide.com/ · https://silktide.com/pricing/ · https://silktide.com/blog/ |
| **Equally AI (Flowy)** | AI-first a11y platformu | AI asistan + no-code builder + tarama | [3P] **$19–37/ay** aralığı — kaynaklar çelişkili, **doğrulanmadı** | Ücretsiz deneme | ChatGPT tabanlı "Flowy" asistan, no-code remediation | Düşük fiyat noktası, geliştirici + no-code hibrit | Fiyat bilgisi tutarsız; ürün olgunluğu ve bağımsız kullanıcı kanıtı zayıf; overlay/remediation sınırında konumlanıyor (FTC riski) | SMB, ajanslar | https://www.g2.com/products/equally-ai/reviews · https://www.softwareadvice.com/compliance/equally-ai-profile/ |
| **Stark** | Tasarım aşaması a11y | Figma/Sketch plugin + tarayıcı; kontrast, focus order, alt text yönetimi, touch target | **Yayınlanmış:** Free tier + **Pro $99/yıl/kullanıcı**; Enterprise custom [3P] | **Evet** (kontrast + renk körlüğü simülatörü) | Sınırlı | Sorunu **kod yazılmadan** yakalıyor — en ucuz düzeltme anı; tasarımcı benimsemesi yüksek; fiyat çok erişilebilir | Sadece tasarım aşaması; canlı site, içerik, 3. taraf script kapsamı yok; rakip değil **tamamlayıcı** | Ürün tasarımcıları | https://www.getstark.co/figma/ · https://www.g2.com/products/stark-stark/pricing |
| **TestParty** | AI remediation-first | Tarama → teşhis → **kaynak kod yeniden yazma**; insan uzman doğrulaması | **Yayınlanmamış** | Hayır | Kod düzeyi otomatik remediation; ihlal paterni öğrenme + etki bazlı önceliklendirme | **$4,05M seed** (Harlem Capital + Urban Innovation Fund eş liderliğinde) + **$274.990 NSF SBIR hibesi**; Forbes Accessibility 100 (2025); 1.575.000+ WCAG issue remediate ettiği iddiası; müşterileri yılda **$500M+** ticaret hacmi işliyor; **içerik pazarlaması agresif ve etkili** — rakip karşılaştırma sayfaları ("X vs Y") ile SEO'da her yerde | Erken aşama, ölçek kanıtlanmadı; Series A yok; "AI kodunuzu düzeltir" iddiası FTC sonrası hassas alan | Mid-market e-ticaret | https://testparty.ai/blog/best-ai-driven-accessibility-tool-that-fixes-code · https://www.crunchbase.com/organization/testparty · https://testparty.ai/blog/nsf-grant |
| **A11yWatch** | Açık kaynak + hosted | API-first + CLI, CI/CD entegrasyonu; Lite sürüm açık kaynak | Hosted için fiyat sayfası mevcut; rakamlar doğrulanmadı | Açık kaynak Lite | Sınırlı | API-first mimari, geliştirici odaklı, düşük maliyet | Küçük ekip, sınırlı destek, kurumsal özellik yok | Bütçe kısıtlı geliştirici ekipleri | https://a11ywatch.com/pricing · https://github.com/a11ywatch/a11ywatch |
| **Sentry / Datadog / Vercel / Netlify / GitHub** | Bitişik | Sentry/Datadog'da **native a11y modülü yok** (RUM/error monitoring). Vercel/Netlify build-time a11y **yerleşik değil** — pa11y-ci/axe CI adımı olarak eklenmeli | — | — | — | Geliştiricinin zaten içinde olduğu workflow; dağıtım avantajı devasa | Bugün a11y birinci sınıf özellik değil → **kısa vadede risk düşük, orta vadede yüksek** (bu oyuncular kategoriye girerse SMB katmanı buharlaşır) | — | https://storybook.js.org/docs/writing-tests/accessibility-testing |

---

## 3. Derin Rakip Profilleri ve Kullanıcı Geri Bildirimleri

### 3.1 accessiBe — Kategorinin en görünür ve en hasarlı markası

accessiBe, accessWidget (overlay), accessScan (ücretsiz tarayıcı), accessFlow (geliştirici platformu) ve accessServices (VPAT, uzman denetim, kullanıcı testi, dava desteği) ile 2025–2026'da klasik overlay şirketinden **hibrit platforma** dönmeye çalışıyor. Fiyatlandırma tamamen trafik tabanlı ve SimilarWeb verisiyle hesaplanıyor: Micro $490/yıl (≤5.000 ziyaret/ay), Growth $1.490/yıl, Scale $3.990/yıl. accessFlow tarafında ise fiyat yayımlanmıyor; sayfa/domain/kullanıcı limitleriyle üç kademe var ve Professional'dan itibaren CI/CD (Jenkins, CircleCI, GitLab), Jira/Asana/ClickUp ve **MCP** entegrasyonu sunuluyor — yani agent tabanlı geliştirici iş akışına açık bir hamle. Şirketin en güçlü satış kancası ürün değil, **dava desteği**: her plana dedicated case manager, üst kademelerde "top ADA attorney" ile 1–10 saat danışmanlık dahil.

Sorun şu: FTC, 3 Ocak 2025 tarihli şikâyetinde accessiBe'nin "48 saat içinde herhangi bir web sitesini WCAG uyumlu yapabildiği" iddiasının aldatıcı olduğunu, eklentinin **navigasyon menüleri, form alanları ve görsel açıklamaları gibi temel bileşenleri erişilebilir yapamadığını** tespit etti; ayrıca üçüncü taraf makale ve yorumları bağımsız görüşmüş gibi biçimlendirdiği ve maddi ilişkileri açıklamadığı belirtildi. Nihai karar Nisan 2025'te onaylandı, **1 milyon dolar** ödeme ve yanıltıcı iddia yasağı getirildi.

> "The Federal Trade Commission approved a final consent order against accessiBe, finding it falsely claimed its tool could make any website compliant with WCAG. The order requires the company to pay $1 million."
> — FTC, Nisan 2025 · https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million

> "Beware of AI Accessibility Promises: US Federal Agency Fines an Overlay Company One Million Dollars"
> — Lainey Feingold (erişilebilirlik hukuku alanının en tanınan avukatı), Ocak 2025 · https://www.lflegal.com/2025/01/ftc-accessibe-million-dollar-fine/

Ticari tarafta kullanıcı şikâyetleri yoğunlaşıyor: iade politikasının kaldırılması, self-servis iptal olmaması, otomatik yenilemeyi durdurmak için e-posta zorunluluğu, AI chat widget dışında destek kanalı bulunmaması.

> "AccessiBe used to offer a 14-day refund policy but removed it… customers cannot cancel licenses online and there is no way to contact support outside of an AI chat widget… can't cancel auto-renewal on their own."
> — Trustpilot / Software Advice derlemesi · https://www.trustpilot.com/review/accessibe.com · https://www.softwareadvice.com/compliance/accessibe-profile/reviews/

Dikkat çekici bir şeffaflık detayı: accessiBe kendi fiyat sayfasında **"accessWidget tarafından giderilmeyen erişilebilirlik sorunları listesi"** için ayrı bir "excluded issues" makalesine link veriyor. Bu, FTC kararının doğrudan bir sonucu ve overlay iddiasının resmî olarak daraltıldığının kanıtı.

**V2 eki — kanal gücü.** accessiBe'nin gerçek varlığı ürün değil **dağıtım**: 5.000'den fazla ajans partneri, müşteri accessWidget kurduğunda ilk 12 ay için **%20 komisyon** (WSI ortaklarında **%30**), white-label izni (şirketin önceden yazılı onayıyla arayüzün grafik öğelerinin özelleştirilmesi), satış desteği, pazarlama materyali, eğitim ve **dava desteği** paketi. Percevia'nın ajans kanalı tasarlarken kopyalaması gereken şablon budur — overlay hariç.
Kaynaklar: https://accessibe.com/partner-program · https://support.accessibe.com/hc/en-us/articles/20470937352850-How-does-the-Partners-Program-work

**Percevia için anlamı:** accessiBe'nin fiyat noktası (yıllık $490) Percevia'nın rekabet edeceği bandın tam üstünde. Ama accessiBe'nin sattığı şey aslında **hukuki rahatlama**, tarama değil. Percevia "uyumluluk vaat etmiyorum" derken bu segmenti kaybediyor — ama FTC sonrası pazarda bu, uzun vadeli bir varlık.

### 3.2 AudioEye — Kategorinin en dürüst rakamı, en yavaşlayan büyümesi

AudioEye halka açık olduğu için (NASDAQ: AEYE) kategorinin tek doğrulanabilir finansal penceresi. Q1 2026: rekor çeyrek geliri **$10,6M** (+%8 YoY), **ARR $41,2M** (31 Mart 2026), **~127.000 müşteri** (yıllık +8.000, ama çeyreklik -4.000 — partner realignment nedeniyle). FY2025 geliri **$40,3M** (+%14,5). FY2026 rehberliği $43,25–44,25M — yani **%7–10 büyüme**. Büyüme %14,5'ten tek haneye inmiş durumda. GAAP net zarar Q1 2026'da $2,1M.

En önemli bulgu ürün sayfasından geliyor. AudioEye'ın kendi **Plans & Pricing** sayfasında "Automated" planı şöyle tanımlanıyor:

> "Automated tools addressing **~50% accessibility issues** … *Does not include expert testing for remaining issues*"
> — AudioEye resmî fiyat sayfası · https://www.audioeye.com/plans-and-pricing/

Bir overlay şirketinin kendi pazarlama sayfasında otomasyonun tavanını %50 olarak yazması, FTC sonrası sektörün nasıl değiştiğinin en net göstergesi. AudioEye ayrıca "AudioEye Assurance" ile WCAG kaynaklı demand letter/dava karşısında **sınırlı, garantili mali koruma** sunuyor — pazarda kimsenin eşleşmediği tek gerçek taahhüt (Managed paket şartına bağlı).

AudioEye fiyat yayımlamıyor; plan sayfasında rakam yok, "Get Started" / "Talk to an Expert" var. Üçüncü taraf kaynaklardaki $199–799/ay aralığı **doğrulanamadı**.

G2'de 4,7/5 (228 yorum) ile yüksek puanlı; övgüler teknik olmayan kullanıcı için kolaylık ve destek hızı etrafında toplanıyor:

> "I like using AudioEye because it makes my website accessible… Before AudioEye, I lost many leads due to undetected issues on my website, but now I can quickly find and fix problems."
> — G2 kullanıcı yorumu · https://www.g2.com/products/audioeye/reviews

**V2 eki — kanal yapısı.** AudioEye müşterilerini iki kanaldan yönetiyor: **Enterprise** ve **Partner & Marketplace** (CMS partnerleri, platform & ajans partnerleri, yetkili bayiler ve marketplace'leri). Reseller partnerler müşteri ilişkisinin tamamına sahip olup kendi belirledikleri fiyattan faturalıyor; AudioEye'dan tier'a bağlı **indirimli fiyat** ve **Dedicated Partner Manager** alıyorlar. Referral için evergreen komisyon, hacimli dağıtım için wholesale fiyat modeli var. Q1 2026'daki **çeyreklik -4.000 müşteri** kaybının açıklaması da "partner realignment" — yani kanalın kendisi bir kırılganlık kaynağı.
Kaynak: https://www.audioeye.com/partners/

**Percevia için anlamı:** AudioEye'ın büyüme yavaşlaması, overlay+hizmet modelinin SMB'de doygunluğa ulaştığını gösteriyor. 127.000 müşterilik taban, "overlay'den kaçan" müşteri havuzunun ne kadar büyük olduğunun da ölçüsü.

### 3.3 Deque — Motoru herkes kullanıyor, ürünü kimse ucuz bulmuyor (ve artık MCP'si var)

Deque'in axe-core'u fiili standart: haftada **~15 milyon npm indirme**, axe araçlarında toplam **1 milyar+ indirme**. Percevia dahil pazardaki hemen her ürün — Storybook a11y addon, Lighthouse'un a11y kısmı, sayısız SaaS — bu motorun üzerinde çalışıyor. Bu, Deque için hem güç hem zafiyet: motor ücretsiz olduğu için ürün katmanında (axe DevTools Pro, axe Monitor, axe Auditor) fiyat direnci yüksek.

Fiyat: Pro yaklaşık $40–45/ay/kullanıcı veya ~$500/yıl [ikincil kaynaklar]. **V2 doğrulaması:** deque.com/axe/devtools/pricing/ sayfası (son güncelleme 4 Haziran 2026) bu kez başarıyla alındı ve **hiçbir rakam içermiyor** — sadece üç plan (Extension Free / Extension Pro / DevTools for Web Bundle) ve özellik karşılaştırma tablosu var. Yani Deque fiyat şeffaflığı sunmuyor; "Request a Demo" / "Free Trial" akışı işletiyor. Vendr'ın işlem verisine göre 5–20 koltuklu ekipler koltuk başına yıllık $1.200–2.500 pazarlık ediyor; kurumsal dağıtımlar $75.000–250.000+/yıl'a ulaşabiliyor.

**V2'nin en önemli Deque bulgusu — ürün yüzeyi genişledi:**
- **Axe MCP Server** — "One-click accessibility fixes right in your IDE". Deque, agent tabanlı geliştirici iş akışına Percevia'dan önce girdi.
- **Axe DevTools Linter** — statik kod analizi, GitHub PR'larda erişilemez kodu bloklama.
- **AI-enhanced automation + aylık AI kredi kotası** — Deque artık AI'yi paketleyip ölçüyor.
- **Issue deduplication** — Evinced'in clustering tezine doğrudan yanıt.
- **On-premises / private cloud / offline deployment** — veri egemenliği kaygısı olan alıcıya doğrudan cevap. Bu, Percevia'nın "privacy-first" farklılaşmasının üst segmentte zaten karşılanmış olduğu anlamına gelir.
Kaynak: https://www.deque.com/axe/devtools/pricing/ · https://www.deque.com/axe/mcp-server/

Kullanıcı geri bildirimlerinde tekrarlayan temalar:

> "The DevTools chrome extension makes automated accessibility testing super streamlined… The Pro version's Intelligent Guided Tests are a great way to learn manual accessibility testing techniques."
> — Software Advice / Capterra derlemesi · https://www.softwareadvice.com/automation-testing/deque-profile/

> Şikayetler: "Auditor **not being compatible with JIRA** and not able to export bugs found to JIRA; **Monitor having many false positives or 'needs review' items**; Axe DevTools does not support Salesforce platform… difficulty selling management on the paid version when budgets are limited."
> — aynı kaynak

Kritik teknik gerçek: Deque, WCAG 2.2 için **`target-size` dışında yeni bir axe-core kuralı eklemeyi planlamadığını**, geri kalanını otomatikleştirmenin çok fazla false positive üreteceğini açıkça belirtiyor. Yani otomatik tarama tavanı sadece bugünkü durum değil, **öngörülebilir gelecekte de sabit**.

### 3.4 Siteimprove — Kurumsal varsayılan, ama memnuniyetsiz

Siteimprove a11y'yi tek başına değil, SEO/QA/analytics/policy/content modülleriyle birlikte satıyor. Fiyat yayımlanmıyor; Vendr verisine göre 1.000–5.000 sayfa izleyen alıcılar $12.000–30.000/yıl, 10.000–25.000 sayfa $35.000–70.000/yıl bandında; çok yıllı taahhütlerde %10–25 indirim yaygın. G2'de 4,6/5 (432 yorum) ile yüksek puanlı ama şikayet profili tutarlı ve keskin:

> "Users have reported experiencing **false flags**… it would report links as broken when they actually weren't." · "**expensive**" · "a horrible archaic system with **latency issues**" · "**illegal practices of holding you to auto-renew without notice** or an easy way to end auto-renew."
> — G2 ve Capterra yorum derlemesi · https://www.g2.com/products/siteimprove/reviews · https://www.capterra.com/p/164806/Siteimprove/reviews/?page=2

Silktide, Siteimprove ve Monsido'dan geçiş için ayrı landing page'ler tutuyor — kategoride aktif bir yerinden etme savaşı var.

**V2 eki — sahiplik ve yön.** Siteimprove **Nordic Capital** portföyünde; Ekim 2024'te **MarketMuse**'u satın alarak içerik stratejisi/AI tarafını güçlendirdi ve 2025'te CEO (Nayaki Nayyar) ile CMO (Christy Marble) değişikliğine gitti. Forrester Wave Q4 2025'te Lider konumunu, "erişilebilirliği SEO + analytics + içerik stratejisiyle birleşik platformda sunması" ile aldı. Yani Siteimprove'un yönü a11y derinliği değil, **suite genişliği**. Bu, saf a11y ürünlerine (Percevia dahil) orta segmentte alan bırakıyor.
Kaynaklar: https://www.crunchbase.com/acquisition/nordic-capital-acquires-siteimprove--744cd8b1 · https://www.siteimprove.com/press/siteimprove-completes-acquisition-of-marketmuse/ · https://www.siteimprove.com/press/siteimprove-named-a-leader-in-digital-accessibility-platforms/

### 3.5 Silktide — UX kalitesinde kategori lideri, içerikte kategori lideri, fiyatta opak

Silktide 2026'da G2'de Leader, High Performer, Best Results ve Best Relationship rozetlerini topladı ve "sürekli #1 usability" iddiasını referanslarla destekliyor (NHS, Oxford, eBay, Deloitte, Accenture, Honeywell). Ürün olarak WCAG 2.2, çok adımlı form testi (user flows), mobil, policies ve cookie-free analytics içeriyor — a11y saf ürün değil, web governance suite.

> "Silktide has exceeded expectations. They've provided better support, an easier-to-use platform, and a **better price**."
> — Christy Grant, The University of Texas at Dallas · https://silktide.com/

Fiyat yayımlanmıyor; üçüncü taraf analizler quote-only ve **12 ay minimum taahhüt** olduğunu belirtiyor. Bu, SMB ve ajans segmentini yapısal olarak eliyor.

**V2 eki — Silktide kategorinin içerik lideri oldu.** Auchan ve Carrefour EAA kararlarının en iyi analizleri Silktide bloğundan geldi ve rakiplerin (Deque dahil) haber döngüsünü belirledi. Ayrıca "AI Chatbots Are Inaccessible, and I Can Prove It" ve "What the Forbes Accessibility 200 Measures, and What it Doesn't" gibi **rakip iddiasını sökme** içerikleri üretiyor. Silktide'ın sitesinde ayrıca **VPAT**, **SOC2**, **accessibility statement**, **partner programı**, ücretsiz toolbar, ücretsiz kontrast aracı ve ücretsiz cookie banner var — yani lead magnet mimarisi tamamlanmış. **Percevia'nın içerik stratejisi için taklit edilecek referans budur, TestParty değil.**
Kaynaklar: https://silktide.com/blog/ · https://silktide.com/vpat/ · https://silktide.com/toolbar/

### 3.6 Pope Tech — Percevia'nın en gerçek rakibi

Pope Tech, WebAIM'in WAVE motorunu lisanslayarak SMB ve yüksek öğrenim için tam şeffaf fiyatlı bir tarama platformu kurmuş. **Fiyatlar tamamen kamuya açık (27 Temmuz 2026 doğrulaması):**

- **Free — $0, sonsuza kadar:** "Scan a 25 page sample each month" — 1–25 sayfa, 2 kullanıcı, 1 site, 1 grup, **sınırsız rescan**, zamanlanmış tarama ve raporlar, ilerleme takibi, sonuç dismiss etme, otomatik test skoru, Inspect WAVE entegrasyonu
- **Team — $25/ay'dan** (50 sayfa tier, yıllık; aylık $30): **sınırsız kullanıcı, sınırsız site, sınırsız grup**, 50–500 sayfa tier'ları, grup hiyerarşisi, çoklu site dashboard, grup taraması ve raporu
- **Business Plus — $225/ay'dan** (500 sayfa, yıllık; aylık $270): manuel test takibi, AIM score guided manual test, Jira/Asana entegrasyonu, **login arkası tarama**, Developer API, **GitHub/Bitbucket CI/CD**, SSO, template/region, bulk upload, **YouTube altyazı tespiti**, Accessibility Plan Tracking, **PDF taraması (opsiyonel Beta add-on)**
- **Professional — $400/ay'dan:** yukarıdakiler + WebAIM 4 saatlik eğitim, 5 eğitim koltuğu, yıllık AIM Score, eğitim stratejisi danışmanlığı, Accessibility Help Desk

Kaynak: https://www.pope.tech/websites/pricing

**Kritik fiyat mimarisi detayı — "Page Tier" kavramı.** Pope Tech sayfa **havuzu** satıyor, tarama satmıyor: "Page Tier'ınız 500 ise hesabınızda herhangi bir anda 500 aktif sayfa olabilir. Seçtiğiniz Page Tier içinde **sınırsız rescan** hakkınız var." Sayfalar arşivlenebiliyor (tarihsel veri kalıyor, limitten düşüyor). Bu, alıcının kafasındaki en basit soruya ("kaç sayfam var?") doğrudan cevap veren bir metrik ve **Percevia'nın "günde 3 tarama × 3 sayfa" modelinin neden zayıf algılandığını açıklıyor.**

Pope Tech **AI iddiası yapmıyor** — bu FTC sonrası dünyada bir güç. Zayıflığı: WAVE motoru axe ekosistemine göre geliştiriciye daha az yakın, AI kod önerisi yok, ve pazarlaması ağırlıkla ABD yüksek öğrenimine dönük. **Percevia'nın ücretsiz planı (günde 3 tarama × 3 sayfa) Pope Tech'in ücretsiz planına (aylık 25 sayfa havuzu, sınırsız rescan, 2 kullanıcı) karşı zayıf kalıyor** — bu doğrudan bir aksiyon maddesi.

**Yeni (2026):** PDF taraması (Grackle motoru, PDF/UA standardı) hem Web Accessibility Platform hem Canvas Dashboard'a geldi; broken link kontrolü ve video/doküman dashboard'u "coming soon". Yani Pope Tech kapsamı genişletiyor — Percevia'nın "biz de PDF/mobil kapsamıyoruz" boşluğu rakipte kapanıyor.
Kaynak: https://blog.pope.tech/2026/02/04/web-accessibility-platform-product-updates-2026/

### 3.7 Evinced — Kategorinin en iyi finanse edilen bağımsızı

Evinced, Aralık 2024'te **$55M Series C** (toplam **$112M**) topladı; Insight Partners liderliğinde M12 (Microsoft), BGV, Capital One Ventures, Engineering Capital ve yeni yatırımcı Vertex Ventures katıldı. Sermayenin açık kullanım amacı dört başlıkta tanımlandı: **Avrupa varlığını ve müşteri tabanını genişletmek**, global satış ve customer success ekiplerini büyütmek, generative AI Ar-Ge'sini derinleştirmek, yeni ürün ve hizmetler geliştirmek.

Eylül 2025'te iki ürün duyurdu: **Evinced Chatbot** ve **Evinced MCP Tools**. Şirket, 2024 sonbaharındaki kör benchmark testlerinde uzman panelinin Evinced Chatbot yanıtlarını genel amaçlı LLM'e (GPT-4) göre **3 kat daha sık** en iyi seçtiğini iddia ediyor (vendor iddiası, bağımsız doğrulanmadı).

Mayıs 2026'da (GAAD 2026) **Evinced 500**'ü duyurdu: ABD'nin en büyük 500 şirketinin (Fortune 500) erişilebilirlik performansını ölçen bir endeks. Bu, WebAIM Million'ın kurumsal versiyonu ve **veri-temelli PR'ın kategoride ne kadar işe yaradığının** kanıtı.

Ürünün asıl teknik farkı, ham issue listesi yerine **issue clustering** — aynı kök nedenden doğan yüzlerce ihlali tek bir düzeltilebilir birime indirgemek. Bu, pazarın en gerçek acı noktası olan "gürültü"ye doğrudan saldırı. Ancak Deque'in 2026'da "issue deduplication"ı DevTools bundle'ına eklemesiyle bu farklılaşma erimeye başladı.

Kaynaklar: https://techcrunch.com/2024/12/12/evinceds-55m-c-round-will-help-bring-its-accessibility-dev-tools-and-ai-to-europe/ · https://www.prnewswire.com/news-releases/gaad-2026-evinced-launches-evinced-500-offering-a-new-lens-into-enterprise-accessibility-performance-302779177.html

### 3.8 Level Access + UserWay — Konsolidasyonun merkezi

Level Access, UserWay'i **20 Mart 2024'te ~$98,7M** değerlemeyle satın alarak kurumsal platform + SMB overlay'i tek çatı altında topladı (daha önce Tenon'u 30 Kasım 2021'de almıştı). Hisse başına **$21,06** ödendi — son 30 günlük tam sulandırılmış ortalama fiyata göre **%22 prim**. UserWay'in 2023 ilk yarı geliri **$6,2M** idi (2022 aynı dönemin neredeyse iki katı). Forrester bunu "türünün ilk örneği" bir anlaşma olarak nitelendirdi. UserWay'in yazılımı **1M+ web sitesinde** çalışıyor.

UserWay fiyatları tam şeffaf ve Percevia için doğrudan referans noktası: Pro **$490/yıl**, Pro Plus **$1.190/yıl**, Ultimate **$2.490/yıl** (≤100K pageview/ay); bağımsız monitoring 100 sayfa **$990/yıl**, 500 sayfa **$4.490/yıl**, 1.500 sayfa **$10.990/yıl**. Dikkat: **Pro planında monitoring sadece 10 sayfa.**

Level Access platformu için fiyat yayımlanmıyor; üçüncü taraf tahminleri $25.000–150.000+/yıl, "Accelerate" tier'ı ~$60.000–100.000/yıl.

UserWay için en ciddi hukuki sinyal, Şubat 2025'teki **BloomsyBox davası**: UserWay overlay'i satın alan bir online çiçek şirketi, sitesini kullanamayan kör bir kişi tarafından dava edildi; dava, UserWay'in overlay'in ne yaptığını yanlış tanıttığını da iddia ediyor.

> "Another Web Access Overlay Company Sued by a Small Business"
> — Lainey Feingold, Şubat 2025 · https://www.lflegal.com/2025/02/userway-overlay-lawsuit/

Kaynaklar: https://herzoglaw.co.il/en/news-and-insights/userway-is-acquired-by-level-access-for-98-million/ · https://www.privsource.com/acquisitions/deal/level-access-acquires-userway-for-98-7-million-oMSdaz · https://www.forrester.com/blogs/digital-accessibility-vendor-level-access-to-acquire-userway-in-a-first-of-its-kind-deal/

### 3.9 WeAccess.AI — Türkiye'nin yerli oyuncusu (V1'de kaçırıldı)

WeAccess.AI, Eskişehir Osmangazi Üniversitesi Teknopark merkezli, Londra ve Dubai ofisleri olan bir Türk erişilebilirlik şirketi. Ürün mimarisi beş dikeyde beş modül üzerine kurulu:

| Modül | Ne yapıyor | Kategori |
|---|---|---|
| **Insight** | WCAG 2.2 tabanlı otomatik tarama, "Erişilebilirlik İnceleme Raporu", günlük/haftalık/aylık izleme, skor (100 üzerinden) | Tarayıcı — Percevia ile doğrudan rakip |
| **Widget** | Kullanıcıya kontrast, metin boyutu, disleksi fontu, imleç, ekran okuma, animasyon durdurma seçenekleri sunan panel | **Overlay** |
| **Visual** | Alt metni olmayan görsellere AI ile otomatik betimleme | Overlay/otomatik remediation |
| **Sign Language** | Web içeriğine gerçek zamanlı işaret dili desteği — **Türk, Fin, Amerikan, Kenya ve Arap işaret dilleri** | Türkiye'de eşi olmayan farklılaşma |
| **Motion / Echo** | Mobil ve doküman/basılı içerik erişilebilirliği | Kapsam genişliği |

Dikeyler: Web, Mobil, Medya, Doküman (PDF), Basılı Materyal. Sektör sayfaları: kamu ve belediyeler, sağlık, perakende, turizm, medya. Rozetler: ISO 27001, IAAP kurumsal üyeliği, kendi "Erişilebilir Web Sitesi AA" işareti. Ücretsiz erişilebilirlik denetleyicisi ve "Stratejik Ortaklar" (partner) programı var. **Fiyat yayımlanmıyor** — demo talebi formu üzerinden ilerliyor.

**Percevia açısından üç sonuç:**
1. **"Türkiye'de yerli rakip yok" argümanı kullanılamaz.** Kullanılırsa ilk demoda çürütülür.
2. **Ama WeAccess bir overlay satıcısı.** Percevia'nın anti-overlay konumlandırması artık soyut bir ABD tartışması değil, **Türkiye'de somut bir rakibe karşı** kullanılabilir bir silah. Overlay Fact Sheet, FTC kararı ve WebAIM %67/%72 verisi doğrudan uygulanabilir.
3. **Türk İşaret Dili modülü gerçek bir boşluk kapatıyor** ve Percevia'da karşılığı yok. Kamu ihalelerinde bu bir eleme kriteri olabilir. Percevia'nın cevabı ya ortaklık ya da "biz tespit ve düzeltme operasyonu yapıyoruz, içerik üretim eklentisi satmıyoruz" şeklinde net bir kapsam ayrımı olmalı.

Kaynaklar: https://www.weaccess.ai/tr/web-accessibility · https://www.weaccess.ai/tr/accessibility-checker · https://www.weaccess.ai/tr/partner · https://www.weaccess.ai/tr/compliance · https://n24.com.tr/weaccess-ai-dijital-erisilebilirlige-gecis-surecinde-rehberlik-edecek/

### 3.10 TestParty — En iyi içerik SEO'su, en zayıf bilanço

TestParty, "tespit değil düzeltme" tezini en agresif savunan erken aşama oyuncu: tarama → teşhis → **kaynak kod yeniden yazma** + insan uzman doğrulaması. Toplam finansman **$4,05M** (seed, Harlem Capital + Urban Innovation Fund eş liderliğinde) + **$274.990 NSF SBIR hibesi**. Series A yok. Müşterileri yılda $500M+ ticaret hacmi işliyor (vendor iddiası).

**Asıl öğrenilecek şey ürünü değil, pazarlaması.** TestParty'nin blogu şu şablonu sistematik uyguluyor:
- Rakip karşılaştırma sayfaları: "TestParty vs Pope Tech", "UserWay vs accessiBe vs AudioEye", "Level Access pricing"
- Rakibin en zayıf noktasını başlığa taşıyan analizler: "Why 800 Businesses With accessiBe Were Still Sued"
- Kategori otoritesi içerikleri: "Digital Accessibility Software Market: Complete Industry Analysis", "Accessibility Investment Landscape: VC Funding and M&A Activity"

Sonuç: TestParty, ürün olgunluğunun çok üzerinde bir SEO görünürlüğüne sahip; "level access pricing", "accessibility market size" gibi yüksek ticari niyetli sorgularda rakip vendor'ların önünde çıkıyor. **Bu, sıfır marka bilinirliğine sahip Percevia için en düşük maliyetli ve en hızlı taklit edilebilir taktiktir** (bkz. Bölüm 17).

Kaynaklar: https://testparty.ai/blog/best-ai-driven-accessibility-tool-that-fixes-code · https://testparty.ai/blog/why-800-businesses-with-accessibe-were-still-sued · https://testparty.ai/blog/level-access-pricing · https://www.crunchbase.com/organization/testparty · https://testparty.ai/blog/nsf-grant

---

# BÖLÜM II — SATIŞ CEPHANESİ

## 4. Rakip Battlecard'ları

> **Kullanım kuralları — satış ekibi için bağlayıcı**
> 1. **Rakip hakkında doğrulanmamış hiçbir şey söylenmez.** Bu battlecard'lardaki her iddianın kaynağı var. Kaynağı olmayan bir şey aklınıza gelirse söylemeyin.
> 2. **FTC kararı bir silah değil, bir bağlamdır.** "accessiBe dolandırıcı" demeyin. "FTC, Nisan 2025'te accessiBe'ye 1 milyon dolar ceza kesti ve şirket artık kendi sitesinde giderilmeyen sorunlar listesi yayımlıyor" deyin ve linki verin.
> 3. **Percevia uyumluluk vaat etmez.** Hiçbir battlecard cevabı "biz sizi uyumlu yaparız" ima etmemeli. Bu, kategorinin tek büyük hukuki riskidir ve Percevia'nın yapısal avantajıdır — konuşurken kaybetmeyin.
> 4. **Otomatik taramanın tavanı ~%50–57'dir ve bu Percevia için de geçerlidir.** Bunu rakip söylemeden önce siz söyleyin. Dürüstlük burada satış tekniğidir.
> 5. **Tuzak sorular alıcıya verilir, rakibe sorulmaz.** Amaç rakibi köşeye sıkıştırmak değil, alıcının kendi başına doğru soruyu sormasını sağlamaktır.

---

### 4.1 BATTLECARD — Pope Tech

**Tek cümlelik konumları:** "WebAIM'in WAVE motoruyla çalışan, fiyatı tamamen şeffaf, sınırsız kullanıcılı, AI iddiası yapmayan, ABD yüksek öğrenimi için tasarlanmış tarama ve manuel test takip platformu."

**Tehdit seviyesi: ⚠️ EN YÜKSEK.** Percevia ile aynı fiyat bandında, aynı alıcıya, daha olgun bir ürünle satıyorlar.

**Ne zaman kazanırlar**
- Alıcı ABD/Kanada yüksek öğreniminde ve WebAIM markası tanıdık geliyor
- Alıcı "sınırsız kullanıcı" istiyor (Percevia koltuk bazlı düşünürse burada kaybeder)
- Alıcı AI'ye güvenmiyor ve "AI yok" bir güven işareti olarak okunuyor
- Alıcı ücretsiz planda gerçek bir siteyi taramak istiyor (25 sayfa havuzu vs Percevia'nın 3 sayfası)
- Alıcı Canvas LMS kullanıyor (Pope Tech'in ayrı Canvas Accessibility Dashboard ürünü var — Percevia'nın karşılığı yok)

**Ne zaman kaybederler**
- Alıcı Türkçe/Almanca/Fransızca UI ve yerel dilde issue açıklaması istiyor
- Alıcı AB'de ve veri konumu soruyor (Pope Tech ABD merkezli, Utah)
- Alıcı "bu 47 ihlali nasıl düzeltirim" diye soruyor — Pope Tech kod önerisi vermiyor
- Alıcı axe-core ekosistemi içinde (Playwright/Jest/CI) ve WAVE motoruna geçmek istemiyor
- Alıcı Türkiye 2025/10 Genelgesi'ne ve Bakanlık A Seviyesi Kontrol Listesi'ne eşlenmiş rapor istiyor
- Bütçe **€/TL** cinsinden ve USD fatura kurumsal satın almada sürtünme yaratıyor

**Onların bize karşı söyleyeceği 5 şey → cevabımız**

| # | Pope Tech'in argümanı | Percevia'nın cevabı |
|---|---|---|
| 1 | "Bizim motorumuz WAVE — WebAIM Million'ı üreten motor. Sektörün referans veri seti bizim motorumuzdan çıkıyor." | Doğru ve saygı duyuyoruz. Ama WebAIM Million bir **araştırma** metodolojisi; sizin sitenizde önemli olan **düzeltilebilirlik**. Percevia axe-core kullanıyor — haftada ~15M npm indirmesiyle geliştirici ekosisteminin fiili standardı, Playwright/Jest/CI adapter'ları hazır. İkisi de aynı %50–57 tavanına tabi. Fark motorun adında değil, motorun üstündeki katmanda. |
| 2 | "AI iddiası yapmıyoruz. Bu, FTC'nin accessiBe'ye 1 milyon dolar kestiği bir sektörde bir güvenlik özelliğidir." | Katılıyoruz — ve **biz de uyumluluk veya sertifikasyon vaat etmiyoruz**. FTC kararı "AI kullanma" demedi; "AI'ın yapmadığı şeyi yaptı diye satma" dedi. Percevia'nın LLM kullanımı tespit değil **açıklama ve düzeltme önerisi** üretiyor; her öneri insan onayı gerektirir ve ürün içinde böyle etiketlenir. Motor deterministik axe-core; AI kararı vermiyor. |
| 3 | "Sınırsız kullanıcı, sınırsız site, sınırsız grup — $25/ay'dan." | Bu gerçek bir güç. Percevia'nın karşılığı: **koltuk değil sayfa havuzu** fiyatlandırması ve ekip davetinin tüm ücretli planlarda açık olması. Ayrıca Percevia'da olan, Pope Tech'te olmayan: issue'nun **neden** oluştuğunun doğal dilde açıklaması ve kod düzeyi düzeltme önerisi. |
| 4 | "CI/CD, login arkası tarama, API, SSO bizde var." | Business Plus'ta — **$225/ay'dan**, yani yılda $2.700'den başlıyor. Percevia Agency €129/ay bandında ekip, monitör, task takibi ve raporlamayı veriyor. Karşılaştırma "özellik var mı" değil, "hangi fiyatta var" olmalı. *(Not: Percevia'da CI/CD ve SSO bugün yok — bu itiraza dürüst cevap "yol haritamızda, bugün yok" olmalı. Bkz. W6.)* |
| 5 | "WebAIM eğitimi ve AIM Score dahil." | Professional planında, **$400/ay'dan**. Eğitim ihtiyacınız varsa bu iyi bir paket. Operasyon ihtiyacınız varsa — yani "kaç hata kapandı, ne kadar sürede, kim üzerinde çalışıyor" — Percevia bunu tüm planlarda merkeze koyuyor. |

**Bizim onlara karşı söyleyeceğimiz 5 şey (kanıtlı)**

| # | Argüman | Kanıt |
|---|---|---|
| 1 | **Türkçe (ve yerel dil) yok.** Pope Tech UI'ı, raporu ve sonuç dokümantasyonu İngilizce. Türkiye'de 2025/10 Genelgesi kapsamındaki bir kurumun İzleme Komisyonu'na sunacağı rapor Türkçe olmak zorunda. | Genelge metni: kurumlar kendi "İnceleme Komisyonu"nu kurar ve **rapor hazırlayarak İzleme Komisyonuna sunar** — https://www.aile.tr/media/268283/web_siteleri_ve_mobil_uygulamalarin_erisilebilirligi_genelgesinin_alternatif_metin_versiyonu.pdf |
| 2 | **Sorunu bulur, çözümü anlatmaz.** Pope Tech'in çıktısı WAVE sonuç dokümantasyonu; "bu React bileşenindeki bu satırı şöyle değiştir" demiyor. | Pope Tech özellik listesi — "Integrated Accessibility Documentation" var, kod önerisi yok · https://www.pope.tech/websites/pricing |
| 3 | **Veri ABD'de.** AB/Türkiye kamu, banka ve hastane alıcısı için veri konumu bir eleme kriteri. | Pope Tech merkezi: PO Box 460, Providence, UT 84332 · https://www.pope.tech/websites/pricing |
| 4 | **Ana metrik "bulunan hata".** Percevia'nın ana metriği "kapatılan hata ve kapanış süresi". UsableNet verisi tespitin sonuç üretmediğini kanıtlıyor: 2025 davalarının 1.427'si daha önce dava almış şirketlere açıldı, federal davaların **%46'sı tekrar davalı**. | https://blog.usablenet.com/ada-web-lawsuit-trends-2026 |
| 5 | **Kanal ve ajans hiyerarşisi zayıf.** Pope Tech'in reseller programı var ama "Contact Us" formundan öteye geçmiyor; white-label rapor yok. | https://www.pope.tech/websites/pricing (Resellers and Agencies → Contact Us) |

**Fiyat karşılaştırma satırı**

| | Pope Tech | Percevia |
|---|---|---|
| Ücretsiz | $0 — 25 sayfa/ay havuzu, 2 kullanıcı, sınırsız rescan | €0 — 3 tarama/gün × 3 sayfa ⚠️ **rekabetçi değil** |
| Giriş ücretli | $25/ay (yıllık) = **~$300/yıl** — 50 sayfa | Starter €39/ay = **€468/yıl** |
| Orta | $225/ay (yıllık) = **$2.700/yıl** — 500 sayfa + CI/CD + SSO | Agency €129/ay = **€1.548/yıl** · Team €249/ay = **€2.988/yıl** |
| Yıllık indirim normu | **%16,7** ("2 ay bedava") | Belirlenmeli — sektör normu %16,7–20 |

**Tuzak sorular (alıcının Pope Tech'e sorması gereken)**
1. "Bulduğunuz bir ihlali **nasıl düzeltmem gerektiğini** ürün içinde bana anlatıyor musunuz, yoksa dokümantasyona mı link veriyorsunuz?"
2. "Verilerim hangi ülkede saklanıyor? AB'de veri işleme yeri seçebiliyor muyum? DPA'nızı ve alt işleyici listenizi görebilir miyim?"
3. "Arayüz ve raporlar Türkçe olabiliyor mu? Bulguları Türkçe açıklıyor musunuz?"
4. "Türkiye'nin 2025/10 Genelgesi'ndeki A Seviyesi Kontrol Listesi'ne eşlenmiş bir rapor üretebiliyor musunuz?"
5. "500 sayfalık bir sitede 8.000 ihlal bulduğunuzda bunları kaç **iş kalemine** indirgiyorsunuz? Aynı header'daki hata 500 kez mi listeleniyor?"
6. "CI/CD ve login arkası tarama hangi fiyattan başlıyor?" *(Cevap: $225/ay — alıcı bunu duyduğunda pazarlık penceresi açılır.)*

**Göç senaryosu — Pope Tech'ten Percevia'ya geçen müşteri**

| Kaybeder | Kazanır |
|---|---|
| WAVE motorunun tanıdıklığı ve WebAIM markası | axe-core ekosistemi ve geliştirici araçlarıyla uyum |
| Sınırsız kullanıcı (Percevia plan bazlı koltuk kullanıyorsa) | Türkçe UI + Türkçe issue açıklaması ve düzeltme önerisi |
| Canvas LMS dashboard | AB/TR veri konumu ve KVKK/GDPR silme-dışa aktarma |
| WebAIM eğitim paketi ve AIM Score | Bakanlık A Seviyesi eşlemeli rapor (TR) |
| PDF taraması (Beta) | Kapanış oranı ve düzeltme süresi metrikleri |
| CI/CD ve SSO (Business Plus'ta) — **Percevia'da henüz yok** | Daha düşük fiyatta ekip + monitör + task takibi |

**Göç riski:** CI/CD ve SSO kaybı, 200+ kişilik BT organizasyonlarında **anlaşma kırıcıdır**. Bu segmentte Pope Tech'e karşı savaşmayın; Türkiye/AB ve ajans segmentine odaklanın.

---

### 4.2 BATTLECARD — Deque (axe DevTools / Monitor / Auditor / MCP Server)

**Tek cümlelik konumları:** "Sektörün motorunu biz yazdık; kurumsal mühendislik organizasyonları için tasarım aşamasından CI/CD'ye, IDE'den manuel denetime kadar uçtan uca erişilebilirlik platformu."

**Tehdit seviyesi: ⚠️ YÜKSEK (dolaylı).** Doğrudan aynı alıcıyı hedeflemiyorlar ama **motorları ücretsiz** ve alıcının kafasında "axe zaten bedava, neden ödeyeyim?" sorusunu Deque yaratıyor.

**Ne zaman kazanırlar**
- Alıcı 50+ kişilik bir mühendislik organizasyonu ve "shift-left" istiyor
- Alıcının VPAT ve resmî uzman denetimi ihtiyacı var (Deque hem yazılım hem hizmet satıyor)
- Satın alma komitesi analist raporu istiyor — **Forrester Wave Q4 2025 Lideri, strateji kategorisinde en yüksek skor**
- Alıcı on-premises / private cloud / offline deployment istiyor
- Alıcı IDE ve agent iş akışına girmek istiyor (Axe MCP Server + Linter)

**Ne zaman kaybederler**
- Bütçe $10k/yıl altında (Deque bu bandı ciddiye almıyor)
- Alıcı fiyat şeffaflığı istiyor — Deque fiyat sayfasında **hiç rakam yok**
- Alıcı web governance/içerik ekibi, mühendislik değil
- Alıcı "ücretsiz eklenti yeter" diyor ve Pro'nun ek değerini göremiyor
- Alıcı Jira export'a bağımlı ve Auditor'ün Jira uyumsuzluğunu öğreniyor

**Onların bize karşı söyleyeceği 5 şey → cevabımız**

| # | Deque'in argümanı | Percevia'nın cevabı |
|---|---|---|
| 1 | "Motoru biz yazdık. Percevia bizim açık kaynak kütüphanemizi kullanıyor." | Doğru — ve bunu gizlemiyoruz, sitede yazıyoruz. axe-core MPL-2.0 lisanslı ve Deque'in kendi ifadesiyle 1 milyar+ indirme aldı; ekosistemin ortak malı. Percevia'nın kattığı şey motor değil: Playwright ile gerçek tarayıcı render'ı, bileşen düzeyinde gruplama, task takibi, monitör, Türkçe açıklama ve **kapanış metrikleri**. Deque de aynı motoru kullanıyor. |
| 2 | "Forrester Wave Q4 2025 Lideriyiz, 21 kriterde tam puan aldık." | Doğru ve hak edilmiş. Ama Forrester'ın değerlendirdiği 9 sağlayıcının hepsi kurumsal platform; bu rapor **$25k+ bütçeli alıcı** için yazıldı. €39–249/ay bandında bir alıcının kararını Forrester Wave belirlemiyor — fiyat şeffaflığı ve ürün içi deneyim belirliyor. |
| 3 | "Sıfır false positive politikamız var." | Bu gerçek bir mühendislik disiplini ve saygı duyuyoruz. Ancak kendi kullanıcılarınız **axe Monitor'de "çok sayıda false positive / needs review"** bildiriyor (Software Advice/Capterra). Sıfır false positive politikası motor seviyesinde; ürün seviyesinde gürültü hâlâ kategorinin #1 şikâyeti. |
| 4 | "MCP Server'ımız var — IDE'nizde tek tıkla düzeltme." | Güçlü bir hamle. Percevia'nın cevabı fiyat ve dil: MCP ve PR entegrasyonunu **kurumsal katmana kilitlemeyeceğiz**. Ayrıca Deque'in fiyatı yayımlanmadığı için alıcı bu özelliğe ne ödeyeceğini demo öncesi bilemiyor. |
| 5 | "VPAT ve uzman denetim hizmetimiz var." | Doğru ve Percevia'da yok. Percevia bunu **sunmuyor ve sunmayacak**; bunun yerine denetçiye/avukata verilebilecek zaman damgalı bir çalışma dosyası üretiyor. VPAT şartı olan bir ihaledeyseniz Deque veya bir denetim firması gerekir — ve biz bunu size baştan söylüyoruz. |

**Bizim onlara karşı söyleyeceğimiz 5 şey (kanıtlı)**

| # | Argüman | Kanıt |
|---|---|---|
| 1 | **Fiyat yayımlamıyorlar.** Haziran 2026'da güncellenen resmî fiyat sayfasında tek bir rakam yok. | https://www.deque.com/axe/devtools/pricing/ |
| 2 | **Kendi tavanlarını kendileri açıkladı: %57,38.** Ve WCAG 2.2 için `target-size` dışında yeni kural eklemeyeceklerini söylediler — tavan sabit. | https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/ · https://github.com/dequelabs/axe-core/issues/4415 |
| 3 | **Auditor Jira ile uyumlu değil ve bulunan bug'ları export edemiyor.** Kurumsal remediation akışında bu ciddi bir kırılma. | https://www.softwareadvice.com/automation-testing/deque-profile/ |
| 4 | **Salesforce platformu desteklenmiyor.** | aynı kaynak |
| 5 | **Kullanıcıların bildirdiği en somut engel: "bütçe kısıtlıyken ücretli sürümü yönetime satmak zor."** Yani Deque'in kendi kullanıcı tabanında bile fiyat direnci var. | aynı kaynak |

**Fiyat karşılaştırma satırı**

| | Deque | Percevia |
|---|---|---|
| Ücretsiz | Chrome eklentisi + axe-core (MPL-2.0) | €0 plan |
| Bireysel | Pro ~$40–45/ay/kullanıcı veya ~$500/yıl [3P, **doğrulanmadı**] | Starter €39/ay |
| Ekip (5–20 koltuk) | koltuk başına yıllık **$1.200–2.500** pazarlıklı [3P Vendr] | Agency €129/ay · Team €249/ay (koltuk başına değil) |
| Kurumsal | **$75.000–250.000+/yıl** [3P] | Enterprise custom |

**Tuzak sorular (alıcının Deque'e sorması gereken)**
1. "Liste fiyatınızı bana yazılı verebilir misiniz, yoksa her müşteriye farklı mı fiyatlıyorsunuz?"
2. "axe-core ücretsizse, ödediğim para tam olarak neyin karşılığı? Bunu bir tabloda görebilir miyim?"
3. "Auditor'de bulduğum bulguları Jira'ya aktarabiliyor muyum?" *(Kullanıcı raporlarına göre: hayır.)*
4. "Monitor'ün 'needs review' oranı tipik bir sitede yüzde kaç? Bu kalemlerin insan incelemesi kaç saat sürer?"
5. "AI kredisi kotam bittiğinde ne oluyor? Ek kredi fiyatı nedir?"
6. "3 kişilik bir ekip için toplam yıllık maliyet nedir — eklenti, linter, MCP ve CI dahil?"

**Göç senaryosu — Deque'ten Percevia'ya**

| Kaybeder | Kazanır |
|---|---|
| IDE linter + MCP Server + CI/CD derinliği | Şeffaf, yayınlanmış fiyat |
| Intelligent Guided Tests (yarı-otomatik manuel test) | 10–50 kat daha düşük maliyet |
| VPAT + uzman denetim + Deque University | Türkçe/yerel dil, TR ve AB regülasyon eşlemesi |
| On-prem / offline deployment | Task takibi ve kapanış metrikleri merkezde |
| Forrester Lideri statüsünün satın alma komitesindeki ağırlığı | Karar için demoya girmeden fiyat bilme |

**Gerçekçi değerlendirme:** Deque müşterisi Percevia'ya **göç etmez**; Deque'i düşünen ama fiyatı karşılayamayan alıcı Percevia'ya gelir. Hedef "Deque'ten müşteri çalmak" değil, **"Deque teklifi alıp şok olan"** alıcıyı yakalamaktır. Satış tetikleyicisi: "Deque'ten fiyat aldınız mı?" sorusu.

---

### 4.3 BATTLECARD — Siteimprove

**Tek cümlelik konumları:** "Erişilebilirlik, SEO, analytics, içerik kalitesi ve veri gizliliğini tek bir web governance platformunda birleştiren, kurumsal pazarlama ve web ekipleri için olgun suite."

**Tehdit seviyesi: 🟡 ORTA.** Farklı alıcı (pazarlama/web governance), farklı bütçe kalemi. Ama Türkiye'de bazı büyük kurumlarda zaten kurulu.

**Ne zaman kazanırlar**
- Alıcı bir **pazarlama/dijital kanal** yöneticisi, mühendis değil
- Kurum a11y + SEO + broken link + policy'yi tek satın almada istiyor (bütçe konsolidasyonu)
- 10.000+ sayfalık bir kurumsal site portföyü var
- Satın alma komitesi analist rozeti arıyor (Forrester Wave Q4 2025 Lideri)
- Kurum zaten Siteimprove müşterisi ve modül eklemek yeni tedarikçiden ucuz

**Ne zaman kaybederler**
- Bütçe $12k/yıl altında
- Alıcı sadece a11y istiyor, suite istemiyor
- Alıcı yenileme deneyiminden şikâyetçi (bildirimsiz otomatik yenileme kategoride en sık şikâyet)
- Alıcı false positive'e karşı hassas
- Alıcı mühendislik ekibine issue akışı istiyor (Siteimprove developer-native değil)

**Onların bize karşı söyleyeceği 5 şey → cevabımız**

| # | Siteimprove'un argümanı | Percevia'nın cevabı |
|---|---|---|
| 1 | "Erişilebilirlik tek başına bir bütçe kalemi değil. Bizde SEO, analytics ve içerik kalitesi de var." | Doğru — bu bir bundling stratejisi. Ama bundling, a11y derinliğinizin ölçüsü değil. Türkiye'de 2025/10 Genelgesi bir SEO yükümlülüğü getirmiyor; **A Seviyesi Kontrol Listesi + WCAG 2.2** getiriyor. Bu spesifik yükümlülük için spesifik bir araç daha iyidir ve 10–50 kat ucuzdur. |
| 2 | "Forrester Wave Q4 2025 Lideriyiz." | Doğru. Aynı raporda 9 kurumsal platform değerlendirildi ve hiçbirinin fiyatı yayınlanmıyor. Bu rapor $12k+ bütçeli alıcıya hitap ediyor. |
| 3 | "Kurumsal referanslarımız ve 15+ yıllık olgunluğumuz var." | Doğru. Aynı olgunluk kullanıcı yorumlarında "arkaik sistem, latency" olarak da geçiyor (G2/Capterra). Olgunluk bir güç ama otomatik bir avantaj değil. |
| 4 | "Tüm sitenizi crawl ediyoruz." | Percevia de crawl ediyor — farkı **Playwright ile gerçek tarayıcı render'ı**: script ve stiller uygulandıktan sonraki DOM analiz ediliyor. Bu, WebAIM Million'ın da kullandığı yaklaşım ve modern JS uygulamalarında statik crawl'dan üstün. |
| 5 | "AI destekli içerik ve erişilebilirlik önerilerimiz var." | Öneri kalitesi ölçülebilir bir şeydir. Alıcıya önerelim: aynı sayfayı ikimize de tarattırın ve **kaç iş kalemine indirgediğimize** bakın, kaç ihlal listelediğimize değil. |

**Bizim onlara karşı söyleyeceğimiz 5 şey (kanıtlı)**

| # | Argüman | Kanıt |
|---|---|---|
| 1 | **False positive şikâyeti dokümante:** "çalışan linkleri kırık olarak raporluyor." | https://www.g2.com/products/siteimprove/reviews |
| 2 | **Bildirimsiz otomatik yenileme şikâyeti**, kullanıcı ifadesiyle "illegal practices of holding you to auto-renew without notice". | https://www.capterra.com/p/164806/Siteimprove/reviews/?page=2 |
| 3 | **"Arkaik sistem, latency sorunları"** — kullanıcı yorumu. | aynı kaynaklar |
| 4 | **Fiyat yayımlanmıyor**; üçüncü taraf verisine göre 1.000–5.000 sayfa için $12k–30k/yıl. Percevia aynı kapsamı €1.548–2.988/yıl bandında karşılar. | https://www.vendr.com/marketplace/siteimprove |
| 5 | **Silktide, Siteimprove'dan geçiş için özel landing page tutuyor** — yani kendi kategorisinde aktif olarak yerinden ediliyor. | https://silktide.com/alternative/the-best-alternative-to-siteimprove/ |

**Fiyat karşılaştırma satırı:** Siteimprove **$12.000–70.000/yıl** [3P] · Percevia **€468–2.988/yıl** yayınlanmış. Yaklaşık **10–25 kat** fark.

**Tuzak sorular**
1. "Sözleşmem otomatik yenileniyor mu? Yenilemeyi durdurmak için ne yapmam gerekiyor ve son tarih nedir?"
2. "Sadece erişilebilirlik modülünü, diğer modüller olmadan alabilir miyim? Fiyatı nedir?"
3. "Bir bulgunun false positive olduğunu tespit edersem, bunu tüm sitede kalıcı olarak susturabiliyor muyum?"
4. "Verilerim AB'de mi işleniyor? DPA ve alt işleyici listenizi görebilir miyim?"
5. "JavaScript ile render edilen içeriği tarıyor musunuz, yoksa statik HTML mi?"

**Göç senaryosu — Siteimprove'dan Percevia'ya**

| Kaybeder | Kazanır |
|---|---|
| SEO, analytics, policy, broken link, içerik kalitesi modülleri | Yıllık maliyette 10–25 kat düşüş |
| Kurumsal raporlama derinliği ve yönetici dashboard'ları | Türkçe UI ve TR genelge eşlemesi |
| Forrester Lideri statüsü (satın alma komitesi argümanı) | Sonuç odaklı metrik: kapatılan issue ve süre |
| Uzun vadeli hesap yöneticisi ilişkisi | Şeffaf fiyat, taahhütsüz aylık seçenek |

**Kritik uyarı:** SEO ve analytics kaybı, pazarlama bütçesinden ödeyen alıcı için **anlaşma kırıcıdır**. Siteimprove'a karşı doğru strateji yerinden etme değil, **bütçesi Siteimprove'a yetmeyen kurumun ikinci sırasını almaktır** — özellikle belediye şirketleri, orta ölçek üniversite, özel hastane zinciri.

---

### 4.4 BATTLECARD — accessiBe

**Tek cümlelik konumları:** "Tek satır JavaScript ile sitenizi 48 saatte erişilebilir hale getiren, dava riskini yöneten AI destekli overlay + ajans kanalı makinesi." *(FTC bu iddiaların bir kısmını aldatıcı buldu; şirket iddiasını daralttı.)*

**Tehdit seviyesi: 🟡 ORTA (fiyat bandı olarak yakın, konumlandırma olarak zıt).**

**Ne zaman kazanırlar**
- Alıcı bir **demand letter** aldı ve panik halinde — "hemen bir şey yapmalıyım"
- Alıcı teknik ekibi olmayan bir SMB; "kurulum 1 dakika" gerçek bir değer
- Alıcı bir ajans ve **%20 komisyon** ilgisini çekiyor
- Alıcı dava desteği paketini (case manager + ADA avukat saatleri) istiyor
- Alıcı fiyat şeffaflığı arıyor ve accessiBe rakam yayımlıyor

**Ne zaman kaybederler**
- Alıcı FTC kararını duyduğunda
- Alıcının hukuk/uyum departmanı overlay riskini araştırdığında
- Alıcı bir kamu kurumu veya üniversite (bu segment overlay'e kurumsal olarak karşı)
- Alıcı engelli kullanıcı topluluğundan geri bildirim aldığında
- Alıcı iade/iptal politikasını okuduğunda

**Onların bize karşı söyleyeceği 5 şey → cevabımız**

| # | accessiBe'nin argümanı | Percevia'nın cevabı |
|---|---|---|
| 1 | "Biz sorunu **düzeltiyoruz**, onlar sadece rapor veriyor." | Overlay DOM'u çalışma anında değiştirir; kaynak kodunuz değişmez. FTC, eklentinin **navigasyon menüleri, form alanları ve görsel açıklamalarını** erişilebilir yapamadığını tespit etti. Siz kendi sitenizde "accessWidget tarafından giderilmeyen sorunlar" listesi yayımlıyorsunuz. Yani düzeltme kapsamlı değil ve bunu siz de yazıyorsunuz. |
| 2 | "Dava desteği veriyoruz — case manager ve ADA avukatıyla saatler dahil." | Bu gerçek bir hizmet ve Percevia bunu sunmuyor. Ama UsableNet verisi net: 2026 Ocak'ta widget kullanan şirketlere **165**, Şubat'ta **172** dava açıldı. Widget sayfada olması bir savunma değil. Ayrıca 2023–2024'te overlay widget kullanan **800+** işletme dava edildi. |
| 3 | "127.000+ site bizi kullanıyor / 5.000+ ajans partnerimiz var." | Ölçek doğru. Ama Overlay Fact Sheet'i **600+** erişilebilirlik uzmanı — WCAG/ARIA/HTML spesifikasyon katkıcıları, Google/Microsoft/Apple/BBC/Shopify iç uzmanları — overlay'lerin **kaldırılmasını** talep ederek imzaladı. Ölçek ve meşruiyet aynı şey değil. |
| 4 | "accessFlow ile kod düzeyi tarama, CI/CD ve MCP de sunuyoruz." | Doğru ve ciddi bir üründür. Ama fiyatı yayımlanmıyor ve aynı şirketin overlay ürünüyle aynı markanın altında satılıyor. Kamu ve kurumsal alıcı için bu bir itibar riski taşır. |
| 5 | "Fiyatımız şeffaf: $490'dan başlıyor." | accessWidget için evet. accessFlow için hayır. Ve $490, trafiğiniz ayda 5.000 ziyaretin altındaysa geçerli — üstündeyse $1.490 veya $3.990. Percevia'nın fiyatı trafiğe değil sayfa sayısına bağlı, yani öngörülebilir. |

**Bizim onlara karşı söyleyeceğimiz 5 şey (kanıtlı)**

| # | Argüman | Kanıt |
|---|---|---|
| 1 | **FTC $1.000.000 ceza + yanıltıcı iddia yasağı** (şikâyet Ocak 2025, nihai karar Nisan 2025). | https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million |
| 2 | **Kendi sitelerinde "excluded issues" sayfası tutuyorlar** — yani widget'ın gideremediği sorunlar resmen listeli. | https://accessibe.com/excluded-issues |
| 3 | **Engelli kullanıcı kanıtı olumsuz:** WebAIM anketinde katılımcıların %67'si (engelli katılımcılarda **%72**) overlay'leri "hiç/çok etkili değil" buldu; engellilerin yalnızca **%2,4'ü** "çok etkili" dedi. Ayrı bir çalışmada katılımcıların **%42'si** overlay bulunan siteleri kullanmayı bıraktı. | https://webaim.org/projects/practitionersurvey3/ · https://create.uw.edu/accessibility-overlays-can-make-websites-less-accessible |
| 4 | **İade politikası kaldırıldı, iptal self-servis değil**, destek yalnızca AI chat widget üzerinden. | https://www.trustpilot.com/review/accessibe.com · https://www.softwareadvice.com/compliance/accessibe-profile/reviews/ |
| 5 | **Pazar payı eriyor:** PeerSpot mindshare %22,9 → **%15,7** [3P]. | https://www.peerspot.com/products/comparisons/accessibe_vs_audioeye |

**Fiyat karşılaştırma satırı:** accessiBe accessWidget **$490 / $1.490 / $3.990 yıl** (trafik bazlı) · Percevia **€468–2.988/yıl** (sayfa bazlı). Fiyat benzer; **satılan şey tamamen farklı**: accessiBe hukuki rahatlama satıyor, Percevia ölçüm ve düzeltme operasyonu satıyor.

**Tuzak sorular**
1. "Widget'ınızın **gideremediği** sorunların listesini bana yazılı verebilir misiniz?" *(Cevap: accessibe.com/excluded-issues — alıcı bunu okuduğunda satış genelde biter.)*
2. "Widget kurulu olan kaç müşteriniz son 12 ayda dava aldı?"
3. "FTC kararından sonra pazarlama iddialarınızda hangi değişiklikleri yaptınız?"
4. "Bir kör kullanıcı kendi ekran okuyucusuyla sitemi gezerken widget'ınız devrede olmasa deneyim nasıl olur?"
5. "Aboneliğimi panelden iptal edebilir miyim, yoksa e-posta göndermem mi gerekiyor?"
6. "Widget'ı kaldırdığımda sitem hangi duruma döner?" *(Kritik: overlay bir bağımlılıktır; kaldırıldığında altta hiçbir şey düzelmiş değildir.)*

**Göç senaryosu — accessiBe'den Percevia'ya**

| Kaybeder | Kazanır |
|---|---|
| Dava desteği paketi (case manager + avukat saatleri) — **gerçek bir kayıp** | Kaynak kodunda gerçekten düzelen sorunlar |
| Son kullanıcıya görünen kişiselleştirme paneli | Engelli kullanıcı topluluğu ve kamu alıcısı nezdinde meşruiyet |
| "Kurdum, bitti" hissi | Zaman damgalı, denetçiye/avukata verilebilir çalışma dosyası |
| Sıfır teknik efor | FTC benzeri yanıltıcı iddia riskinin sıfırlanması |

**Satış hamlesi:** accessiBe müşterisi göçte **hukuki rahatlama** kaybediyor. Bunun ikamesi "Erişilebilirlik Çalışma Dosyası"dır (Bölüm 15, Boşluk 7): zaman damgalı tarama geçmişi + kapatılan/açık issue kaydı + düzeltme planı + beyan, tek PDF, açık sorumluluk reddiyle. Bu, vaat vermeden ihtiyacı karşılar.

---

### 4.5 BATTLECARD — AudioEye

**Tek cümlelik konumları:** "Otomasyon + uzman testi + aktif izlemeyi birleştiren, dava riskine karşı sınırlı mali garanti (Assurance) sunan halka açık erişilebilirlik şirketi."

**Tehdit seviyesi: 🟡 ORTA.** Overlay itibarı taşıyor ama kategorinin en dürüst kamuya açık rakamına ve tek gerçek mali taahhüdüne sahip.

**Ne zaman kazanırlar**
- Alıcı **mali garanti** istiyor — "dava gelirse ne olacak?" sorusuna tek cevap veren onlar
- Alıcı halka açık şirket şeffaflığını güven işareti olarak okuyor
- Alıcı bir CMS/platform partneri üzerinden geliyor (Partner & Marketplace kanalı)
- Alıcı otomasyon + insan uzman karışımı istiyor ve tek fatura istiyor

**Ne zaman kaybederler**
- Alıcı fiyat soruyor — **fiyat sayfasında hiç rakam yok**
- Alıcı "otomasyon sorunların ~%50'sini çözer" cümlesini kendi sayfalarında görüyor
- Alıcı overlay tartışmasını biliyor
- Alıcı AB/TR'de ve veri konumu soruyor
- Alıcı büyüme yavaşlamasını (%14,5 → ~%8) sürdürülebilirlik riski olarak okuyor

**Onların bize karşı söyleyeceği 5 şey → cevabımız**

| # | AudioEye'ın argümanı | Percevia'nın cevabı |
|---|---|---|
| 1 | "AudioEye Assurance ile hukuki riske karşı mali koruma sağlıyoruz." | Bu gerçek ve Percevia'da yok — açıkça söylüyoruz. Ancak Assurance Managed paket şartına bağlı ve **sınırlı**. Ayrıca hiçbir mali garanti bir kör kullanıcının sitenizi kullanabilmesini sağlamaz; sadece sonucu sigortalar. |
| 2 | "Bağımsız testlerde 2,5 kat daha fazla issue tespit ediyoruz." | Bu çalışma **AudioEye tarafından sponsorlandı** — bağımsız değil. Ayrıca "daha fazla issue bulmak" iyi bir metrik değil; kategorinin #1 şikâyeti zaten gürültü. Önemli olan kaç **iş kalemine** indirgediğiniz. |
| 3 | "Halka açık şirketiz, finansallarımız şeffaf." | Doğru ve saygı duyuyoruz — kategorideki tek doğrulanabilir pencere sizsiniz. Ama finansal şeffaflık **fiyat şeffaflığı** değil. Plan sayfanızda tek bir rakam yok. |
| 4 | "127.000 müşterimiz var." | Ve Q1 2026'da çeyreklik **-4.000** müşteri kaybettiniz (partner realignment). Büyüme %14,5'ten ~%8'e indi. Bu, SMB'de overlay+hizmet modelinin doygunluğa ulaştığının sinyali. |
| 5 | "Uzman testi ve custom fix hizmetimiz var." | Doğru — ve Percevia bunu sunmuyor. Bunu baştan söylüyoruz. Percevia'nın işi ölçüm, gruplama, düzeltme takibi ve kanıt üretimi. Uzman denetim ihtiyacınız varsa ayrı bir hizmet gerekir; biz bunu satıyormuş gibi yapmayız. |

**Bizim onlara karşı söyleyeceğimiz 5 şey (kanıtlı)**

| # | Argüman | Kanıt |
|---|---|---|
| 1 | **Kendi fiyat sayfalarında yazıyor:** "Automated tools addressing **~50% accessibility issues** … *Does not include expert testing for remaining issues*". | https://www.audioeye.com/plans-and-pricing/ |
| 2 | **Fiyat yayımlanmıyor.** Üçüncü taraf $199–799/ay diyor ama doğrulanamıyor. | https://www.audioeye.com/plans-and-pricing/ |
| 3 | **Büyüme yavaşlıyor:** FY2025 +%14,5 → FY2026 rehberliği %7–10. Q1 2026 GAAP net zarar $2,1M. | https://www.prnewswire.com/news-releases/audioeye-reports-record-first-quarter-2026-results-302770076.html |
| 4 | **Çeyreklik müşteri kaybı:** Q1 2026'da -4.000 (partner realignment). Kanal kırılganlığı. | aynı kaynak |
| 5 | **Pazar payı eriyor:** PeerSpot mindshare %11,6 → **%9,9** [3P]. | https://www.peerspot.com/products/comparisons/accessibe_vs_audioeye |

**Fiyat karşılaştırma satırı:** AudioEye **yayınlanmamış** ([3P] $199–799/ay = $2.388–9.588/yıl) · Percevia **€468–2.988/yıl** yayınlanmış.

**Tuzak sorular**
1. "Assurance tam olarak neyi karşılıyor, üst limiti nedir, hangi durumlarda geçersiz olur? Poliçe metnini görebilir miyim?"
2. "Kendi sayfanızda otomasyonun ~%50'yi kapsadığını yazıyorsunuz. Kalan %50 için hangi pakette, kaç saat uzman testi alıyorum?"
3. "'2,5 kat daha fazla issue' çalışmasını kim finanse etti?"
4. "3 yıllık toplam sahip olma maliyetim nedir?"
5. "Verilerim hangi ülkede işleniyor? AB müşterilerim için DPA'nız var mı?"

**Göç senaryosu — AudioEye'dan Percevia'ya**

| Kaybeder | Kazanır |
|---|---|
| **Assurance mali garantisi** — kategorinin tek gerçek taahhüdü | Şeffaf, öngörülebilir fiyat |
| Uzman testi ve custom fix hizmeti | Overlay itibar riskinden çıkış |
| Overlay'in görünür "bir şey yapıyoruz" etkisi | AB/TR veri konumu ve KVKK/GDPR yerleşikliği |
| Halka açık şirket güvencesi | Türkçe UI ve TR genelge eşlemesi |

---

### 4.6 BATTLECARD — UserWay / Level Access

**Tek cümlelik konumları:** "SMB'den Fortune 500'e kadar tüm segmentleri tek çatı altında toplayan; overlay, kurumsal platform, yönetilen hizmet, VPAT ve hukuki desteği paketleyen konsolidasyon lideri."

**Tehdit seviyesi: 🟡 ORTA-YÜKSEK.** Percevia'nın rekabet edemeyeceği bir paket teklifi var — ama iki uçtan da (fiyat ve itibar) saldırılabilir.

**Ne zaman kazanırlar**
- Alıcı tek tedarikçiden her şeyi istiyor (yazılım + denetim + VPAT + overlay + hukuk)
- Alıcı büyük ve satın alma komitesi analist rozeti arıyor (Forrester Wave Q4 2025 Lideri)
- Alıcı UserWay'in şeffaf SMB fiyatını görüp Level Access'e upsell ediliyor
- İhalede VPAT şartı var

**Ne zaman kaybederler**
- Alıcı overlay tartışmasını biliyor ve UserWay bağlantısını görüyor
- Bütçe $25k/yıl altında
- Alıcı UserWay monitoring'in sayfa limitlerini fark ediyor (Pro'da **sadece 10 sayfa**)
- Alıcı BloomsyBox davasını okuyor

**Onların bize karşı söyleyeceği 5 şey → cevabımız**

| # | UserWay/Level Access'in argümanı | Percevia'nın cevabı |
|---|---|---|
| 1 | "Tek tedarikçi, tek fatura: yazılım + denetim + VPAT + hukuki destek." | Doğru ve Percevia bunu sunmuyor. Ama bu paket **$25.000–150.000+/yıl** [3P] bandında. Yükümlülüğünüz ölçüm ve düzeltme takibi ise, bunun için 10–50 kat fazla ödemeniz gerekmez. |
| 2 | "1 milyondan fazla sitede çalışıyoruz." | UserWay overlay'i için doğru. **BloomsyBox davası** tam olarak bunu gösteriyor: UserWay overlay'i satın alan bir işletme yine dava edildi ve dava, UserWay'in ürünü yanlış tanıttığını da iddia ediyor. |
| 3 | "Overlay'i istemiyorsanız monitoring'i ayrı satın alabilirsiniz." | Bu dürüst bir hamle ve takdir ediyoruz. Ama fiyatına bakın: **100 sayfa $990/yıl, 500 sayfa $4.490/yıl, 1.500 sayfa $10.990/yıl**. Percevia aynı kapsamı €468–2.988/yıl bandında karşılıyor. |
| 4 | "Forrester Wave Q4 2025'te mevcut teklif kategorisinde en yüksek skoru aldık." | Doğru. Aynı raporda değerlendirilen 9 sağlayıcının hepsi kurumsal. Bu rapor SMB ve ajans alıcısı için yazılmadı. |
| 5 | "VPAT üretiyoruz." | Doğru, add-on olarak. Percevia VPAT üretmiyor ve bunu baştan söylüyor. İhalenizde VPAT şartı varsa bir denetim firmasına ihtiyacınız var — hangi ürünü alırsanız alın. |

**Bizim onlara karşı söyleyeceğimiz 5 şey (kanıtlı)**

| # | Argüman | Kanıt |
|---|---|---|
| 1 | **BloomsyBox davası:** UserWay overlay'i kullanan işletme dava edildi; dava overlay'in yanlış tanıtıldığını iddia ediyor. | https://www.lflegal.com/2025/02/userway-overlay-lawsuit/ |
| 2 | **UserWay Pro planında monitoring sadece 10 sayfa.** Gerçek izleme için ayrı ürün almanız gerekiyor. | https://userway.org/pricing/ |
| 3 | **Bağımsız monitoring pahalı:** 1.500 sayfa için $10.990/yıl. | aynı kaynak |
| 4 | **Level Access platform fiyatı yayımlanmıyor**; [3P] $25k–150k+/yıl, "Accelerate" ~$60k–100k. | https://testparty.ai/blog/level-access-pricing · https://www.vendr.com/marketplace/level-access |
| 5 | **Overlay Fact Sheet'in 600+ imzacısı** overlay'lerin kaldırılmasını talep ediyor; UserWay bu listede tartışılan ürünlerden biri. | https://overlayfactsheet.com/en/ |

**Fiyat karşılaştırma satırı**

| | UserWay / Level Access | Percevia |
|---|---|---|
| SMB overlay | $490 / $1.190 / $2.490 yıl | — (overlay satmıyoruz) |
| Monitoring (overlay'siz) | 100 syf $990 · 500 syf $4.490 · 1.500 syf $10.990 /yıl | Starter €468 · Agency €1.548 · Team €2.988 /yıl |
| Kurumsal platform | **$25.000–150.000+/yıl** [3P] | Enterprise custom |

**Tuzak sorular**
1. "Overlay olmadan sadece monitoring alırsam, 500 sayfa için yıllık fiyat nedir?" *(Cevap: $4.490.)*
2. "Pro planımda kaç sayfa izleniyor?" *(Cevap: 10.)*
3. "BloomsyBox davasını biliyor musunuz? Overlay kullanan müşterileriniz dava alırsa sorumluluk kimde?"
4. "Level Access platformunun liste fiyatını yazılı alabilir miyim?"
5. "VPAT add-on fiyatı nedir ve yenileme sıklığı nedir?"

**Göç senaryosu — UserWay/Level Access'ten Percevia'ya**

| Kaybeder | Kazanır |
|---|---|
| VPAT üretimi ve uzman denetim | Maliyette 5–50 kat düşüş |
| Hukuki destek programı | Overlay itibar riskinden çıkış |
| Tek tedarikçi kolaylığı | Sayfa başına gerçek izleme (10 sayfa limiti yok) |
| Analist rozeti argümanı | Türkçe/yerel dil ve TR-AB regülasyon eşlemesi |

---

### 4.7 BATTLECARD — Silktide

**Tek cümlelik konumları:** "Kategorinin en kullanışlı arayüzü; erişilebilirlik, SEO, UX, analytics ve veri gizliliğini AI destekli tek bir web governance platformunda toplayan, kamu ve yüksek öğrenime odaklı suite."

**Tehdit seviyesi: 🟡 ORTA.** Farklı fiyat bandı ama **içerik ve marka gücü Percevia'nın gireceği her konuşmayı şekillendiriyor**.

**Ne zaman kazanırlar**
- Alıcı UX kalitesine ve kullanım kolaylığına öncelik veriyor (G2'de #1 usability)
- Alıcı kamu/NHS/yüksek öğrenimde ve referans listesi ikna edici
- Alıcı Siteimprove veya Monsido'dan kaçıyor (Silktide bu göçü aktif hedefliyor)
- Alıcı user flows (çok adımlı form testi) istiyor — checkout/başvuru akışları
- Alıcı AB veri bölgesi istiyor (app.eu.silktide.com var)

**Ne zaman kaybederler**
- Alıcı fiyat soruyor — **yayımlanmıyor**
- Alıcı **12 ay minimum taahhüt** [3P] duyuyor
- Alıcı sadece a11y istiyor, suite istemiyor
- Bütçe küçük veya aylık esneklik gerekiyor
- Alıcı Türkçe UI istiyor

**Onların bize karşı söyleyeceği 5 şey → cevabımız**

| # | Silktide'ın argümanı | Percevia'nın cevabı |
|---|---|---|
| 1 | "G2'de sürekli #1 usability. Ürünümüz kullanmaktan keyif alınan bir üründür." | Doğru, ve kategoride en çok saygı duyduğumuz ürün deneyimi. Ama kullanım kolaylığı, alıcının fiyatı görmeden demoya girmek zorunda kalmasını telafi etmiyor. |
| 2 | "User flows ile çok adımlı formları otomatik test ediyoruz." | Gerçek bir teknik üstünlük ve Percevia'da bugün yok. Playwright altyapımız bunu mümkün kılıyor; yol haritasında. Bugün için: dürüst cevap "yok". |
| 3 | "EAA mahkeme kararlarını sektöre biz açıkladık." | Doğru ve bunu kabul ediyoruz — Auchan ve Carrefour analizleriniz kategorinin en iyisi. Bu içerik liderliği; ürün üstünlüğü değil. |
| 4 | "Kamu ve yüksek öğrenimde derin referanslarımız var (NHS, Oxford)." | Doğru — **Birleşik Krallık'ta**. Türkiye'de 2025/10 Genelgesi kapsamında bir kurum için NHS referansı bir şey ifade etmiyor; Bakanlık A Seviyesi Kontrol Listesi eşlemesi ifade ediyor. |
| 5 | "AI destekli ilk web governance platformuyuz." | "İlk" iddiaları FTC sonrası dünyada dikkatli kullanılmalı. Percevia AI'yi tespit için değil **açıklama ve öneri** için kullanıyor ve bunu ürün içinde açıkça etiketliyor. |

**Bizim onlara karşı söyleyeceğimiz 5 şey (kanıtlı)**

| # | Argüman | Kanıt |
|---|---|---|
| 1 | **Fiyat yayımlanmıyor** — silktide.com/pricing sayfası "Request demo"ya yönlendiriyor. | https://silktide.com/pricing/ |
| 2 | **12 ay minimum taahhüt** [3P] — aylık deneme veya çıkış yok. | https://www.a11ypulse.com/comparisons/silktide-alternative-with-simple-pricing/ |
| 3 | **A11y saf ürün değil**; SEO, analytics, içerik, veri gizliliği modülleriyle birlikte satılıyor. Sadece a11y isteyen alıcı fazlasını ödüyor. | https://silktide.com/solutions/ |
| 4 | **Türkçe UI ve TR regülasyon eşlemesi yok.** | Ürün ve site dil seçenekleri |
| 5 | **Ücretsiz kalıcı plan yok** — sadece tarayıcı toolbar'ı. | https://silktide.com/toolbar/ |

**Fiyat karşılaştırma satırı:** Silktide **yayınlanmamış + 12 ay taahhüt** [3P] · Percevia **€0–249/ay, yayınlanmış, aylık seçenekli**.

**Tuzak sorular**
1. "Liste fiyatınız nedir? Demo öncesi bir aralık verebilir misiniz?"
2. "Minimum sözleşme süresi nedir? 12 ay dolmadan çıkabilir miyim?"
3. "Sadece erişilebilirlik modülünü alabilir miyim?"
4. "Arayüz ve raporlar Türkçe olabiliyor mu?"
5. "Kalıcı ücretsiz bir plan sunuyor musunuz, yoksa sadece tarayıcı eklentisi mi?"

**Göç senaryosu — Silktide'dan Percevia'ya**

| Kaybeder | Kazanır |
|---|---|
| Kategorinin en iyi UX'i | Şeffaf fiyat ve taahhütsüz aylık seçenek |
| User flows (çok adımlı form testi) | Türkçe UI, Türkçe issue açıklaması |
| SEO/analytics/policy/uptime modülleri | Kalıcı ücretsiz plan |
| İngilizce eğitim ve kaynak kütüphanesi | Maliyette ciddi düşüş (Silktide fiyatı bilinmiyor ama SMB'yi eliyor) |

**Not:** Silktide'a karşı doğru strateji **rekabet değil öğrenmedir**. İçerik operasyonlarını (mahkeme kararı analizi, ücretsiz araç seti, VPAT/SOC2 şeffaflığı, karşılaştırma sayfaları) birebir modelleyin.

---

### 4.8 BATTLECARD — Evinced

**Tek cümlelik konumları:** "Görsel ve DOM tabanlı AI ile binlerce ihlali kök nedene indirgeyen, büyük mühendislik organizasyonları için tasarlanmış, kategorinin en iyi finanse edilmiş bağımsız geliştirici platformu."

**Tehdit seviyesi: 🟢 DÜŞÜK-ORTA bugün, 🟡 ORTA 2027'de.** Segment farkı var ama $112M sermaye ve açık Avrupa hedefi aşağı inme riski yaratıyor.

**Ne zaman kazanırlar**
- Alıcı 100+ mühendisli bir organizasyon, gürültü asıl problemi
- Alıcı mobil (iOS/Android SDK) kapsamı istiyor
- Alıcı agent/MCP iş akışına giriyor
- Alıcı "AI ne kadar iyi" karşılaştırması yapıyor

**Ne zaman kaybederler**
- Bütçe kurumsal değil
- Alıcı fiyat şeffaflığı istiyor — **yayımlanmıyor**
- Alıcı ücretsiz plan istiyor — yok
- Alıcı Türkiye/AB'de küçük-orta ölçekli
- Alıcı "clustering" iddiasının bağımsız doğrulamasını istiyor

**Onların bize karşı söyleyeceği 5 şey → cevabımız**

| # | Evinced'in argümanı | Percevia'nın cevabı |
|---|---|---|
| 1 | "Issue clustering ile 500 ihlali 12 iş kalemine indiriyoruz." | En doğru teknik tez bu ve Percevia da aynı yöne gidiyor: Playwright ile gerçek tarayıcı render'ı + bileşen/template düzeyinde gruplama. Fark: biz bunu €39/ay'dan sunuyoruz, siz fiyat yayımlamıyorsunuz. |
| 2 | "Kör benchmark'ta uzman paneli bizim yanıtlarımızı GPT-4'e göre 3 kat daha sık seçti." | Bu **vendor tarafından yürütülen** bir benchmark; bağımsız doğrulama yok. Kategori FTC'den sonra bu tür iddialara daha dikkatli olmalı. |
| 3 | "$112M topladık, Insight Partners ve Microsoft M12 yatırımcımız." | Sermaye güçlü bir sinyal. Ama sermaye, alıcının bugün karşılaştığı sorunu çözmüyor; ürün çözüyor. Ayrıca sermayenin açık hedefi Avrupa'ya **açılmak** — yani orada henüz yoksunuz. |
| 4 | "Mobil SDK'larımız var." | Doğru ve Percevia'da yok. Türkiye 2025/10 Genelgesi mobil uygulamaları da kapsıyor; bu gerçek bir boşluk ve bunu saklamıyoruz. |
| 5 | "Evinced 500 ile Fortune 500'ün erişilebilirlik performansını ölçüyoruz." | Güçlü bir PR hamlesi. Ama Fortune 500 endeksi bir Türk belediyesinin veya AB'li orta ölçek e-ticaretin kararını değiştirmiyor. |

**Bizim onlara karşı söyleyeceğimiz 5 şey (kanıtlı)**

| # | Argüman | Kanıt |
|---|---|---|
| 1 | **Fiyat yayımlanmıyor, ücretsiz plan yok.** SMB ve ajans segmentine hiç hitap etmiyorlar. | evinced.com — plan/fiyat sayfası yok |
| 2 | **"3 kat daha iyi" iddiası vendor benchmark'ı**, bağımsız doğrulama yok. | https://www.prnewswire.com/news-releases/a-giant-boost-for-digital-accessibility-with-evinceds-new-tools-for-developers-302560075.html |
| 3 | **Avrupa'ya "açılıyorlar"** — yani yerel varlık, yerel dil, yerel regülasyon uzmanlığı henüz yok. | https://techcrunch.com/2024/12/12/evinceds-55m-c-round-will-help-bring-its-accessibility-dev-tools-and-ai-to-europe/ |
| 4 | **Clustering artık tek başına farklılaşma değil** — Deque 2026'da issue deduplication'ı DevTools bundle'ına ekledi. | https://www.deque.com/axe/devtools/pricing/ |
| 5 | **Türkçe yok, TR regülasyon eşlemesi yok.** | Ürün ve site dil seçenekleri |

**Fiyat karşılaştırma satırı:** Evinced **yayınlanmamış, ücretsiz plan yok** · Percevia **€0–249/ay yayınlanmış**.

**Tuzak sorular**
1. "Fiyatınızı demo öncesi verebilir misiniz? Minimum sözleşme büyüklüğünüz nedir?"
2. "Clustering iddianızı bağımsız bir üçüncü taraf doğruladı mı?"
3. "Avrupa'da hangi ülkelerde yerel destek ekibiniz var? Verim nerede işleniyor?"
4. "Ürününüzü 5 kişilik bir ekip kullanabilir mi, yoksa minimum koltuk sayınız var mı?"
5. "Türkçe arayüz ve rapor sunabiliyor musunuz?"

**Göç senaryosu — Evinced'den Percevia'ya**

| Kaybeder | Kazanır |
|---|---|
| Mobil SDK ve derin mühendislik entegrasyonları | Şeffaf fiyat ve ücretsiz plan |
| Olgun issue clustering ve AI chatbot | Türkçe/yerel dil ve TR-AB regülasyon eşlemesi |
| Enterprise ölçekli destek | Küçük ekipler için erişilebilir maliyet |

**Gerçekçi değerlendirme:** Evinced müşterisi Percevia'ya göç etmez. Bu battlecard'ın işlevi, Percevia'nın **teknik yönünü** doğrulamaktır: kategorinin en iyi finanse edilmiş bağımsızı, gürültü azaltma tezine $112M yatırıyor. Percevia'nın Boşluk 3'e (clustering) yatırım yapması bu nedenle doğru.

---

### 4.9 Battlecard Özeti — Tek Sayfa

| Rakip | Tehdit | Bizim tek cümlelik saldırımız | Onların bize karşı en güçlü tek cümlesi | Kaybettiğimiz yer |
|---|---|---|---|---|
| **Pope Tech** | ⚠️ En yüksek | "Türkçe yok, kod önerisi yok, veri ABD'de." | "Sınırsız kullanıcı, $25/ay, gerçek ücretsiz plan, WebAIM motoru." | CI/CD + SSO + ücretsiz plan |
| **Deque** | ⚠️ Yüksek (dolaylı) | "Fiyat yayımlamıyorlar; tavanı %57 olduğunu kendileri yazdı." | "Motoru biz yazdık, Forrester Lideriyiz, MCP'miz var." | Kurumsal, VPAT, IDE derinliği |
| **Siteimprove** | 🟡 Orta | "$12k–70k/yıl, false positive şikâyeti, bildirimsiz otomatik yenileme." | "A11y + SEO + analytics tek platformda, Forrester Lideri." | Suite bundling, pazarlama bütçesi |
| **accessiBe** | 🟡 Orta | "FTC $1M cezası; giderilmeyen sorunlar listesini kendileri yayımlıyor." | "48 saatte kurulum + dava desteği + %20 ajans komisyonu." | Hukuki rahatlama, kanal ölçeği |
| **AudioEye** | 🟡 Orta | "Otomasyonun ~%50'yi kapsadığını kendi fiyat sayfalarında yazıyorlar." | "Assurance mali garantisi — kategoride tek." | Mali garanti, uzman testi |
| **UserWay/Level Access** | 🟡 Orta-Yüksek | "Overlay'siz monitoring 500 sayfa için $4.490/yıl; Pro'da sadece 10 sayfa izleniyor." | "Tek tedarikçi: yazılım + denetim + VPAT + hukuk." | VPAT, tek fatura, analist rozeti |
| **Silktide** | 🟡 Orta | "Fiyat yok + 12 ay taahhüt + Türkçe yok." | "Kategorinin en iyi UX'i ve en iyi içeriği." | UX kalitesi, user flows, içerik otoritesi |
| **Evinced** | 🟢 Düşük-Orta | "Fiyat yok, ücretsiz plan yok, Avrupa'ya henüz 'açılıyorlar'." | "$112M sermaye + en olgun issue clustering + mobil SDK." | Mobil, clustering olgunluğu |
| **WeAccess.AI** 🇹🇷 | 🟡 Orta (TR'de yüksek) | "Widget = overlay. Overlay Fact Sheet 600+ imza, WebAIM %72 etkisiz, FTC $1M." | "Türkçe, yerli, Türk İşaret Dili modülü, ISO 27001, IAAP üyesi." | TİD modülü, yerel referanslar |

---

## 5. Türkiye Pazarı Derin Analizi

> **Neden bu bölüm en uzun bölüm:** Türkiye, Percevia için **en yakın gelir kaynağı**. Bağlayıcı bir takvim, kamuya açık bir hedef listesi, düşük rekabet ve kurucunun yerel bağlam avantajı bir arada. Bu bölüm, satışa çıkmadan önce bilinmesi gereken her şeyi içerir.

### 5.1 2025/10 sayılı Cumhurbaşkanlığı Genelgesi — Tam Kapsam ve Doğrulanmış Metin

**Künye:** Genelge 2025/10, "Web Siteleri ve Mobil Uygulamaların Erişilebilirliği". İmza **20 Haziran 2025** (Recep Tayyip Erdoğan, Cumhurbaşkanı). Resmî Gazete: **21 Haziran 2025 Cumartesi, Sayı 32933**.
**Birincil kaynak (tam metin, alternatif metin versiyonu):** https://www.aile.tr/media/268283/web_siteleri_ve_mobil_uygulamalarin_erisilebilirligi_genelgesinin_alternatif_metin_versiyonu.pdf
**Resmî Gazete PDF:** https://www.resmigazete.gov.tr/eskiler/2025/06/20250621-17.pdf

**Hukuki dayanak:** 1/7/2005 tarihli ve **5378 sayılı Engelliler Hakkında Kanun** — "bilgilendirme hizmetleri ile bilgi ve iletişim teknolojisinin erişilebilirliğinin sağlanması yasal zorunluluktur."

#### ✅ ÇÖZÜLDÜ: Hangi WCAG sürümü?

**V1'de kaynaklar çelişiyordu. V2'de kesin cevap: WCAG 2.2.**

Genelge metninin kendisi, iki ayrı yerde açıkça belirtiyor:

> "**Web Siteleri ve Mobil Uygulamaların Erişilebilirliği Kontrol Listesi - A Seviyesi** ile **Web İçeriği Erişilebilirlik Kılavuzu (WCAG-2.2.)** Bakanlığın resmi internet adresinde (www.aile.gov.tr) yayımlanacaktır."

> "…tarafından 1 yıl içinde; … tarafından 2 yıl içinde **Web Siteleri ve Mobil Uygulamaların Erişilebilirliği Kontrol Listesi - A Seviyesi ile Web İçeriği Erişilebilirlik Kılavuzuna (WCAG-2.2.)** uygun hale getirilmesi…"

Bakanlığın kendi SSS sayfası da bunu teyit ediyor:

> "Genelge ile, kamu kurum ve kuruşları ile vatandaşlar tarafından sıklıkla kullanılan özel hukuk tüzel kişilerine ait web siteleri ve mobil uygulamaların tasarım ve güncelleme dâhil tüm aşamalarında Dünya Çapında Ağ Birliği (W3C)'nin hazırladığı **Web İçeriği Erişilebilirlik Kılavuzu (WCAG 2.2)**'na göre erişilebilirliğin sağlanması amaçlanmaktadır."
> — https://www.aile.gov.tr/sss/engelli-ve-yasli-hizmetleri-genel-mudurlugu/erisilebilirlik/

**Karar: Türkiye'nin referans standardı WCAG 2.2 + Bakanlık "A Seviyesi" Kontrol Listesi'dir. WCAG 2.1 diyen hukuk yorumları hatalıdır ve düzeltilmelidir.**

**Percevia için doğrudan ürün gereksinimi:** axe-core'un WCAG 2.2 kural seti aktif olmalı, raporda "WCAG 2.2 A/AA" etiketi görünmeli, ve rapor şablonu Bakanlık A Seviyesi Kontrol Listesi'ne eşlenmeli.

#### Tam kapsam listesi (Genelge metninden birebir)

**1 yıl içinde uyum (süre ≈ 20/21 Haziran 2026'da doldu):**

| # | Kapsanan kuruluş | Tahmini adet | Kaynak |
|---|---|---|---|
| 1 | Kamu kurum ve kuruluşları | Bakanlıklar + bağlı/ilgili/ilişkili kuruluşlar; yüzlerce ayrı web varlığı | — |
| 2 | Üniversiteler | **~209** (129–131 devlet + 78 vakıf + 4 vakıf MYO) | https://veriyonetim.yok.gov.tr/documentFiles/17768717381.B%C3%BClten20252026.pdf |
| 3 | Belediyeler | **~1.401** (30 büyükşehir + 51 il + 922 ilçe + 398 belde/kademe) | https://www.tbb.gov.tr/en/metropolitan-and-provincial-municipalities |
| 4 | Kamu iktisadi teşebbüsleri (KİT) | Onlarca | — |
| 5 | **Belediyeye ait şirket, işletme ve iştirakler** | Yüzlerce (İSKİ, İETT, BELBİM, ESHOT, ASKİ vb. + tüm il/ilçe belediye şirketleri) | Genelge metni |
| 6 | Kamu kurumu niteliğindeki meslek kuruluşları | TOBB, TBB (Barolar), TTB, TMMOB, ticaret/sanayi odaları, borsalar — **yüzlerce oda ve borsa** | Genelge metni |
| 7 | Bankalar | **50+ aktif banka** (mevduat + katılım + kalkınma/yatırım + dijital) | https://www.bddk.org.tr/bultenaylik |
| 8 | Özel hastaneler | **~570+** özel hastane (2022'de 572); ayrıca büyük zincirler (Acıbadem, Medical Park/MLP Care, Memorial, Medicana, Liv, Florence Nightingale vb.) | https://ohsad.org/wp-content/uploads/2025/10/Saglik-Istatistikleri-2024-Yilligi-Haber-Bulteni.pdf |
| 9 | **MEB izniyle açılan özel öğretim kurumları** | Binlerce (özel okul, kurs, etüt merkezi, sürücü kursu, özel eğitim ve rehabilitasyon merkezleri) | Genelge metni |
| 10 | **4925 sayılı Karayolu Taşıma Kanunu kapsamındaki karayolu taşıtları, yolcu gemileri, demir yolu ve hava yolu ile yolcu taşıma hizmeti sunan özel kuruluşlar** | Otobüs firmaları (Metro, Kamil Koç, Pamukkale…), havayolları (THY, Pegasus, AJet, SunExpress…), feribot/deniz otobüsü işletmecileri | Genelge metni |
| 11 | **Kültür ve Turizm Bakanlığından işletme belgesi alan A Grubu seyahat acenteleri** | Binlerce (TÜRSAB kayıtlı A Grubu acenteler) | Genelge metni |
| 12 | **Elektronik haberleşme sektöründe hizmet sunan ve 200.000'in üzerinde abonesi bulunan işletmeciler** | Turkcell, Vodafone TR, Türk Telekom/TT Mobil + büyük ISS'ler ve kablo operatörleri — **muhtemelen 10–20 işletmeci** | Genelge metni + https://www.btk.gov.tr/uploads/pages/elektronik-haberlesme-pazar-verileri/pazar-verileri-raporu-2025-4.pdf |

**2 yıl içinde uyum (süre ≈ 20/21 Haziran 2027):**

| # | Kapsanan kuruluş | Tahmini adet | Kaynak |
|---|---|---|---|
| 13 | 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında **elektronik ticaret yapan hizmet sağlayıcıları** | Kendi sitesi/uygulamasından e-ticaret yapan ETBİS kayıtlı işletme: **35.000+**; pazaryerleri dahil toplam e-ticaret yapan işletme **~559.000** (2023) | https://ticaret.gov.tr/data/6a02f2c7269de183c0b98bc4/T%C3%BCrkiye'de%20E-Ticaretin%20G%C3%B6r%C3%BCn%C3%BC%C3%BC%20Raporu%202025.pdf |

> **V1 düzeltmesi:** V1, kapsam listesinde 9, 10, 11 numaralı grupları hiç saymamıştı ve 12. grubu "elektronik haberleşme şirketleri" olarak sınırsız yazmıştı. Gerçekte **200.000 abone eşiği** var. Bu eşik tesadüfi değil: BTK'nın "Sosyal Açıdan Desteklenmesi Gereken Kesimlere Yönelik Tedbirlere İlişkin Usul ve Esaslar" kurul kararı da aynı 200.000 eşiğini kullanıyor ve bu işletmecilere hem engellilere **asgari %25 indirim** hem de **çevrimiçi işlem merkezinin erişilebilirliğini sağlama** yükümlülüğü getiriyor. Yani telekom operatörleri için erişilebilirlik yükümlülüğü Genelge'den **önce** vardı; Genelge onu web ve mobile genişletti.
> Kaynak: https://www.aile.gov.tr/sss/engelli-ve-yasli-hizmetleri-genel-mudurlugu/erisilebilirlik/ (Soru 7)

### 5.2 Denetim mekanizması — üç komisyonlu yapı

Genelge üç ayrı komisyon kuruyor. Bu yapıyı anlamak, Türkiye'de kime satılacağını anlamaktır.

| Komisyon | Başkan | Üyeler | Görev | Percevia için anlamı |
|---|---|---|---|---|
| **İzleme Komisyonu** | **Aile ve Sosyal Hizmetler Bakanı** | (Genelge'de detaylandırılmamış) | Web sitesi ve mobil uygulamaların erişilebilirliğini izlemek; sonuç raporlarını Bakan duyurur | Nihai otorite. Sonuç raporları kamuya açıklanacak → **kamuya açık kıyaslama = PR ve satış tetikleyicisi** |
| **Danışma Komisyonu** | **Bakan Yardımcısı** (EYHGM'nin bağlı olduğu) | İçişleri Bakanlığı, Ulaştırma ve Altyapı Bakanlığı, **TÜBİTAK**, **Türksat**, engellilik alanında ulusal düzeyde en çok temsil gücüne sahip **iki konfederasyon**. Ayrıca diğer kamu kurumları, üniversiteler, meslek kuruluşları, STK'lar ve **özel sektör temsilcileri davet edilebilir** | Tereddütleri gidermek; yıl içinde izlenecek web sitesi/uygulamaları belirleyen **"İzleme Planı"na görüş vermek** | **Özel sektör davet edilebiliyor.** Percevia'nın uzun vadeli meşruiyet hedefi bu masaya oturmaktır. Ayrıca TÜBİTAK ve Türksat üye — teknik referans buradan çıkacak |
| **İnceleme Komisyonu** | Her kurumun kendi bünyesinde | Kurumun kendi personeli | **"Web siteleri ve mobil uygulamaların erişilebilirliğini teknik olarak incelemek ve buna ilişkin rapor hazırlayarak İzleme Komisyonuna sunmak"** | 🎯 **PERCEVIA'NIN BİREBİR ALICISI BUDUR.** Bu komisyon bir teknik rapor üretmek zorunda ve elinde araç yok |

**Bu, Türkiye satış stratejisinin merkez tespitidir.** Genelge, kapsamdaki **her kurumu** bir iç teknik inceleme komisyonu kurmaya ve **düzenli olarak rapor üretmeye** zorluyor. Bu komisyonlar tipik olarak:
- 3–5 kişilik, BT birimi + kurumsal iletişim + engelli koordinasyon biriminden oluşuyor
- Erişilebilirlik uzmanı değil, **genel BT personeli**
- Elinde WAVE tarayıcı eklentisi veya Lighthouse'tan başka araç yok
- Bakanlık formatında, tekrarlanabilir, savunulabilir bir rapor üretmek zorunda

**Percevia'nın Türkiye ürün vaadi tek cümlede:** *"İnceleme Komisyonunuzun İzleme Komisyonuna sunacağı raporu 20 dakikada üretir."*

**Uyum ödülü — Erişilebilirlik Logosu:** İzleme süreci tamamlanan ve **erişilebilir olduğu tespit edilen** kurum ve kuruluşların web sayfalarına veya mobil uygulamalarına Bakanlık tarafından **2 yıl süreyle** Erişilebilirlik Logosu kullanım hakkı verilir. (Not: 5378 geçici madde 3 kapsamındaki fiziksel "Erişilebilirlik Belgesi/Logosu" valilikler tarafından binalar, açık alanlar ve toplu taşıma araçları için verilir; web/mobil logosu **Bakanlık tarafından** verilen ayrı bir mekanizmadır.)

### 5.3 Yaptırım gerçeği — para cezası var mı, yok mu?

**Kısa cevap: Genelge'nin kendisinde para cezası yok. Ama 5378'de var ve kapsamı tartışmalı.**

| Katman | Ne diyor | Kaynak |
|---|---|---|
| **2025/10 Genelgesi** | Hiçbir para cezası öngörmüyor. Mekanizma: izleme + raporlama + Bakan duyurusu + Erişilebilirlik Logosu ödülü | Genelge tam metni |
| **5378 sayılı Kanun, geçici madde 3** | Geçici 2. ve 3. maddelerdeki sürelerin bitiminden sonra yükümlülüklerini yerine getirmediği **denetim komisyonlarınca tespit edilen** büyükşehir belediyeleri, belediyeler ve diğer kamu kurum ve kuruluşlarına **her bir tespit için 5.000 TL – 25.000 TL** idari para cezası; **bir yılda toplam 500.000 TL'yi geçemez**. Gerçek ve özel hukuk tüzel kişilerine de ceza uygulanabilir | https://mevzuat.gov.tr/mevzuatmetin/1.5.5378.pdf |
| **Erişilebilirlik İzleme ve Denetleme Yönetmeliği (20.07.2013)** | 81 ilde valilikler bünyesinde komisyonlar; formlarla **bina, açık alan ve toplu taşıma aracı** denetimi | https://www.aile.gov.tr/eyhgm/mevzuat/ulusal-mevzuat/yonetmelikler/erisilebilirlik-izleme-ve-denetleme-yonetmeligi/ |

⚠️ **Kritik belirsizlik (satış argümanında dikkatli olunmalı):** 5378 geçici madde 3'ün idari para cezası rejimi, pratikte **yapılı çevre** (bina, kaldırım, yaya geçidi, durak, otopark, toplu taşıma aracı) denetimlerinde uygulanıyor ve 2016/7 sayılı Genelge'nin form ekleri de bunları kapsıyor. **Web ve mobil uygulama erişilebilirliği için idari para cezasının fiilen uygulandığına dair doğrulanmış bir örnek bulunamadı.** Ayrıca bu ceza tutarları enflasyon karşısında (5.000–25.000 TL) 2026 koşullarında caydırıcı değil.

**Bunun satış argümanına etkisi — net kural:**
- ❌ **Söylemeyin:** "Uymazsanız ceza yersiniz."
- ✅ **Söyleyin:** "2026 izleme ve denetleme yılı. İzleme Komisyonu sonuç raporlarını **Bakan duyuracak**. İnceleme Komisyonunuz teknik rapor üretmek zorunda. Uyumlu bulunan kurumlar **2 yıl Erişilebilirlik Logosu** kullanabiliyor. Ayrıca 5378 kapsamında idari para cezası rejimi mevcut ve kapsamı genişleyebilir."

**Türkiye'de en güçlü satın alma tetikleyicisi ceza değil, üç şeydir:**
1. **Görünürlük riski** — Bakan'ın açıklayacağı sonuç raporunda kötü çıkmak. Kamu kurumunda bu, para cezasından daha korkulan bir şeydir.
2. **Denetim yazışması** — İzleme Komisyonu'ndan gelen bir yazı, bütçe onayını anında açar.
3. **Logo** — pozitif, tabelaya asılabilir, üst yönetime gösterilebilir bir çıktı.

### 5.4 Cumhurbaşkanlığı Dijital Dönüşüm Ofisi ve Bakanlık araçları — rakip mi, tamamlayıcı mı?

| Araç | Kim sağlıyor | Kapsam | Percevia için |
|---|---|---|---|
| **ERDEM — Erişilebilirlik Değerlendirme Modülü** (erdem.aile.gov.tr) | Aile ve Sosyal Hizmetler Bakanlığı | **Bina ve bahçe** erişilebilirliği. 10 bölüm, **281 soru**, Evet/Hayır. Sistem "Erişilebilirlik Raporu" üretiyor | ✅ **Rakip DEĞİL** — fiziksel çevre için. Ama **model olarak kritik**: Bakanlık, kurumların kendi kendini değerlendirip rapor ürettiği bir modüle zaten alışkın. Percevia'nın web/mobil karşılığı tam olarak bu boşluğu dolduruyor |
| **Web Siteleri ve Mobil Uygulamaların Erişilebilirliği Kontrol Listesi – A Seviyesi** | Aile ve Sosyal Hizmetler Bakanlığı | Web/mobil. Üçüncü taraf derlemelerine göre **31 ilke üzerinden 122 soru**; Ekim 2023'te WCAG 2.2 ile güncellendi [3P — soru sayısı Bakanlık kaynağından teyit edilemedi] | ⚠️ **Doğrudan ürün gereksinimi.** Percevia raporu bu listeye eşlenmeli. Liste www.aile.gov.tr'de yayımlanıyor |
| **Cumhurbaşkanlığı Dijital Dönüşüm Ofisi (CBDDO)** | Cumhurbaşkanlığı | Bilgi ve İletişim Güvenliği Rehberi, kamu dijital dönüşüm rehberliği. **Web erişilebilirliği ölçüm aracı, cbddo.gov.tr üzerinde kamuya açık olarak bulunamadı** | 🟡 **Belirsiz.** V1'deki "DDO ölçüm aracı sağlayacak" ifadesi doğrulanamadı. CBDDO daha çok siber güvenlik ve dijital dönüşüm rehberliğine odaklı. **Risk:** ileride ücretsiz bir kamu tarayıcısı çıkarsa Percevia'nın kamu segmenti daralır (bkz. Senaryo 5) |

**Sonuç: bugün Türkiye kamusunda web/mobil erişilebilirliği için ücretsiz, resmî, ölçekli bir tarama aracı YOK.** Kurumlar Lighthouse, WAVE eklentisi veya manuel kontrol listesiyle idare ediyor. Bu, Percevia'nın **açık kapı**sıdır ve kapanmadan girilmelidir.

### 5.5 KVKK — LLM'e veri gönderme ve yurt dışına aktarım

Bu, Percevia'nın Türkiye'de bankalara ve hastanelere satış yapabilmesinin **ön koşuludur**, pazarlama malzemesi değil.

**Problem tanımı:** Percevia bir sayfayı tarar, DOM parçalarını ve HTML fragmanlarını OpenAI API'ye gönderir, açıklama ve kod düzeltme önerisi alır. Bu iki KVKK sorusu doğurur:
1. Gönderilen HTML **kişisel veri** içeriyor mu? (Login arkası tarama yapılıyorsa: **büyük ihtimalle evet** — kullanıcı adı, e-posta, TCKN, hasta/müşteri bilgisi DOM'da olabilir.)
2. OpenAI ABD merkezli → bu bir **yurt dışına aktarım**.

**KVKK yurt dışına aktarım rejimi (2024 değişikliği sonrası, 2026 durumu):**

| Yöntem | Ne gerekiyor | Bildirim | 2026 ceza riski |
|---|---|---|---|
| **Yeterlilik kararı** | Kurul'un ilgili ülke için yeterlilik kararı vermiş olması | — | ABD için yeterlilik kararı **yok** |
| **Uygun güvenceler — Standart Sözleşme (SCC)** | Kurul'un yayımladığı, **değiştirilmesi yasak** metinlerden uygun olanı (Veri Sorumlusu→Veri Sorumlusu, Veri Sorumlusu→Veri İşleyen, Veri İşleyen→Veri İşleyen, Veri İşleyen→Veri Sorumlusu) | İmzadan itibaren **5 iş günü** içinde KVKK dijital bildirim modülünden Kuruma bildirim | Bildirim yükümlülüğünü yerine getirmeyenlere **90.308 TL – 1.806.377 TL** idari para cezası |
| **Bağlayıcı Şirket Kuralları (BCR)** | Çok uluslu şirket grupları için Kurul onaylı iç protokol | Kurul onayı | Percevia ölçeğinde uygulanabilir değil |
| **Açık rıza** | Somut, bilgilendirilmiş, özgür iradeyle | — | Kurumsal müşteri senaryosunda pratik değil (son kullanıcı rızası alınamaz) |

Kaynaklar: https://www.kvkk.gov.tr/Icerik/8142/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi · https://www.kvkk.gov.tr/Icerik/7938/Standart-Sozlesmeler-ve-Baglayici-Sirket-Kurallarina-Iliskin-Dokumanlar-Hakkinda-Kamuoyu-Duyurusu · https://www.cottgroup.com/tr/blog/kvkk-gdpr/item/standart-sozlesme-bildirim-yukumlulugu-ve-yaptirimlari · https://www.mondaq.com/turkey/privacy-protection/1740066/kvkk-yurt-d%C4%B1%C5%9F%C4%B1na-veri-aktar%C4%B1m%C4%B1-rehberi-2026-g%C3%BCncel-d%C3%BCzenlemeler

**Percevia'nın alması gereken 7 karar (ürün + hukuk):**

| # | Karar | Neden | Zorluk |
|---|---|---|---|
| 1 | **Varsayılan olarak PII maskeleme.** LLM'e gönderilen HTML fragmanından metin içeriği çıkarılsın, yalnızca yapı (etiket, rol, attribute, seçici) gönderilsin | Erişilebilirlik ihlallerinin çoğu **yapısal**; metin içeriğine gerek yok. Bu tek karar KVKK riskinin %80'ini siler | Orta — mühendislik işi |
| 2 | **"LLM'siz mod" anahtarı** (kurum düzeyinde, geri alınamaz) | Banka/hastane alıcısı "hiçbir veri yurt dışına çıkmasın" diyebilir. Bu anahtar satışı kapatır | Düşük |
| 3 | **Sıfır saklama modu:** tarama sonrası ham HTML silinir, yalnızca issue metadata kalır | Hem KVKK hem GDPR hem satış argümanı | Düşük-Orta |
| 4 | **AB/TR veri bölgesi seçimi** (Cloud Run region) | Cloud Run'da europe-west bölgeleri mevcut. Teknik olarak kolay, ticari olarak kilit | Düşük |
| 5 | **KVKK Standart Sözleşme'nin (Veri İşleyen→Veri İşleyen) imzalanması + 5 iş günü içinde bildirim** | Yasal zorunluluk. Yapılmazsa 90.308–1.806.377 TL risk | Düşük (hukuki) |
| 6 | **Aydınlatma metni + alt işleyici listesi + DPA şablonu sitede yayında** | Kurumsal satın almada ilk istenen belgeler | Düşük |
| 7 | **OpenAI API'nin eğitimde kullanmama taahhüdünün açıkça yazılması** | Alıcının ilk sorusu bu olacak | Çok düşük |

**Satış cümlesi (banka/hastane demosunda):** *"LLM'e sayfanın metnini göndermiyoruz — sadece yapısını gönderiyoruz. İsterseniz LLM'i kurum genelinde tamamen kapatabilirsiniz. Verinin işlendiği bölgeyi siz seçiyorsunuz. KVKK Standart Sözleşmemiz ve alt işleyici listemiz hazır."* Bu cümleyi kurabilen tek rakip yok.

### 5.6 Kamu ihale süreci — Percevia nasıl satın alınır?

**En önemli tek bulgu: Percevia'nın hiçbir planı ihale gerektirmiyor.**

**2026 yılı parasal limitler (4734 sayılı Kamu İhale Kanunu, 22/d doğrudan temin):**

| Kalem | Tutar | Geçerlilik |
|---|---|---|
| **Doğrudan temin (22/d) — büyükşehir belediyesi sınırları içindeki idareler** | **1.021.827 TL** | 1 Şubat 2026 – 31 Ocak 2027 |
| **Doğrudan temin (22/d) — diğer idareler** | **340.391 TL** | aynı |
| Güncelleme yöntemi | 2025 Yİ-ÜFE artışı **%27,67** | Kamu İhale Bülteni 2026/1, RG 22 Ocak 2026, Sayı 33145 |

Kaynaklar: https://www.yakadanismanlik.com/makaleler/2026-yili-dogrudan-temin-22-d-parasal-limitleri-1-milyon-tl-siniri-asildi · https://www.ampdanisman.com.tr/esik-degerler-ve-parasal-limitler-2026-yili-icin-guncellendi

**Percevia planlarının TL karşılığı ve eşik konumu** *(varsayım: 1 EUR ≈ 47 TL — kur varsayımdır, satışta güncel kur kullanılmalı)*

| Plan | Yıllık EUR | ≈ Yıllık TL | Büyükşehir eşiği (1.021.827 TL) | Diğer eşik (340.391 TL) |
|---|---|---|---|---|
| Starter €39/ay | €468 | ~22.000 TL | ✅ %2,2 | ✅ %6,5 |
| Agency €129/ay | €1.548 | ~73.000 TL | ✅ %7,1 | ✅ %21,4 |
| Team €249/ay | €2.988 | ~140.000 TL | ✅ %13,7 | ✅ %41,2 |
| Enterprise (varsayım €10.000/yıl) | €10.000 | ~470.000 TL | ✅ %46 | ❌ eşiği aşar → ihale gerekir |

**Sonuç: Percevia'nın Starter/Agency/Team planları, Türkiye'deki her kamu kurumu tarafından ihalesiz, doğrudan temin yoluyla satın alınabilir.** Bu, satış döngüsünü aylardan haftalara indirir ve **birinci sınıf bir satış argümanıdır**:

> *"Bütçeniz varsa doğrudan temin sınırının çok altındayız — ihale açmanıza gerek yok."*

**Diğer kamu satın alma kanalları:**

| Kanal | Nasıl çalışır | Percevia için |
|---|---|---|
| **Doğrudan temin (22/d)** | Kurum piyasa araştırması yapar, teklif alır, satın alır. İhale ilanı yok | ✅ **Ana kanal.** Üç firmadan teklif istenmesi tipiktir → rakip teklifi (WeAccess vb.) beklenmeli |
| **DMO (Devlet Malzeme Ofisi) e-Satış Portalı** | Kamu kurumlarının merkezî tedarik kanalı; katalogdan sipariş. Tek firmadan doğrudan sipariş limiti **2.000.000 TL** | 🟡 Orta vadeli. DMO kataloğuna girmek bir süreç gerektirir ama girildiğinde **1.400+ belediye ve yüzlerce kurumun varsayılan alım kanalı** olur. **Yüksek etkili orta vadeli hamle** — https://www.dmo.gov.tr/Home/Icerik/3752 |
| **Açık ihale / pazarlık** | Eşik üstü alımlar. Şartnamede VPAT, ISO 27001, yerli üretim, referans sayısı gibi eleme kriterleri çıkabilir | ❌ Percevia bugün burada rekabet edemez (VPAT yok, ISO yok, referans yok) |
| **Üniversite döner sermaye / BAP** | Üniversitelerin esnek bütçe kalemleri | ✅ Küçük tutarlar için hızlı kanal |
| **TÜBİTAK / kalkınma ajansı projeleri** | Proje bütçesinden yazılım alımı | 🟡 Fırsatçı |

**Fatura ve vergi gerçekleri (Türkiye'ye satış):**

| Konu | Durum | Percevia'nın yapması gereken |
|---|---|---|
| **e-Fatura / e-Arşiv** | Türkiye'de kurumsal alıcılar e-Fatura mükellefi; yurt dışı faturayı muhasebeleştirmek ekstra iş yükü | 🎯 **Türkiye'de bir tüzel kişilik veya yerel bayi üzerinden TL e-Fatura kesebilmek, kamu satışında neredeyse zorunlu.** Bu, hukuki/mali bir yatırım kararıdır |
| **KDV-2 (sorumlu sıfatıyla KDV)** | Yurt dışından alınan SaaS/yazılım hizmetinde Türk alıcı **KDV-2 beyan edip ödemek** zorunda | Alıcıya ek yük ve süreç. Yerel faturayla ortadan kalkar |
| **Stopaj** | Hizmet "ticari kazanç" niteliğindeyse ve yurt dışı firmanın Türkiye'de işyeri yoksa stopaj genelde **%0**; ancak yazılım/telif niteliğinde değerlendirilirse ÇVÖA'ya göre değişir | Muhasebeci/mali müşavir görüşü alınmalı; alıcının mali müşaviri bunu soracaktır |
| **Kur riski** | EUR fiyatlama + TL bütçe = alıcı için öngörülemezlik | Bkz. Bölüm 14.7 |

Kaynaklar: https://www.istanbulmalimusavirlik.net/yurt-disi-yazilim-ve-bulut-hizmetleri-aliminda-kdv-2-ve-stopaj-zorunlulugu/ · https://www.ffkpartnerhukuk.com.tr/dijital-hizmet-sunan-yabancilarin-vergi-yukumlulukleri-2026-guncel-rehber/

### 5.7 Hedef segment büyüklüğü — kaynaklı sayılar

| Segment | Adet | Kapsam grubu | Erişilebilirlik | Kaynak |
|---|---|---|---|---|
| **Üniversite** | **~209** (129–131 devlet, 78 vakıf, 4 vakıf MYO) | 1 yıl (doldu) | YÖK listesi kamuya açık, e-posta formatları tahmin edilebilir | https://veriyonetim.yok.gov.tr/documentFiles/17768717381.B%C3%BClten20252026.pdf |
| **Belediye** | **~1.401** (30 büyükşehir + 51 il + 922 ilçe + 398 belde) | 1 yıl (doldu) | TBB üyelik listesi kamuya açık | https://www.tbb.gov.tr/en/metropolitan-and-provincial-municipalities |
| **Belediye şirketi/iştiraki** | Yüzlerce (kesin sayı doğrulanamadı) | 1 yıl (doldu) | Her büyükşehirde 5–30 arası şirket | Genelge metni |
| **Banka** | **50+** aktif banka; sektör aktif büyüklüğü Mart 2026'da **49,7 trilyon TL** | 1 yıl (doldu) | BDDK/TBB listeleri kamuya açık | https://www.bddk.org.tr/bultenaylik · https://www.tbb.org.tr/en/banks-and-banking-sector-information |
| **Özel hastane** | **~570+** hastane (2022: 572); özel sektör yatak sayısı 2024'te **54.394** | 1 yıl (doldu) | Zincirler: Acıbadem, MLP Care/Medical Park, Memorial, Medicana, Liv, Florence Nightingale, Anadolu Sağlık | https://ohsad.org/wp-content/uploads/2025/10/Saglik-Istatistikleri-2024-Yilligi-Haber-Bulteni.pdf |
| **Telekom işletmecisi (>200k abone)** | ~10–20 (kesin liste doğrulanamadı). Mobilde 3 büyük: Turkcell **~39,03M**, Türk Telekom/TT Mobil **~30,81M**, Vodafone. Toplam mobil abone (M2M dahil) **96,5M** (2025 Q2). Genişbant abone 2025 Q4: **97,4M** | 1 yıl (doldu) | BTK üç aylık pazar verileri raporu | https://www.btk.gov.tr/uploads/pages/elektronik-haberlesme-pazar-verileri/pazar-verileri-raporu-2025-4.pdf |
| **Kamu kurumu niteliğindeki meslek kuruluşu** | TOBB'a bağlı **365 oda ve borsa** [3P, teyit edilmeli]; ayrıca barolar (81), tabip odaları, TMMOB'a bağlı 24 oda | 1 yıl (doldu) | Federasyon listeleri kamuya açık | Genelge metni |
| **MEB özel öğretim kurumu** | Binlerce (kesin sayı doğrulanamadı) | 1 yıl (doldu) | MEB Özel Öğretim Kurumları Genel Müdürlüğü listesi | Genelge metni |
| **A Grubu seyahat acentesi** | Binlerce (TÜRSAB kayıtlı; kesin sayı doğrulanamadı) | 1 yıl (doldu) | TÜRSAB üye listesi | Genelge metni |
| **Yolcu taşımacılığı (kara/deniz/demir/hava)** | Onlarca büyük firma + yüzlerce D1/D2 belgeli otobüs firması | 1 yıl (doldu) | UAB yetki belgesi listeleri | Genelge metni |
| **E-ticaret hizmet sağlayıcısı (kendi sitesi/uygulaması)** | **35.000+** ETBİS kayıtlı işletme; toplam e-ticaret yapan işletme ~559.000 (pazaryeri dahil) | **2 yıl → Haziran 2027** | ETBİS ve Ticaret Bakanlığı raporu | https://ticaret.gov.tr/data/6a02f2c7269de183c0b98bc4/T%C3%BCrkiye'de%20E-Ticaretin%20G%C3%B6r%C3%BCn%C3%BC%C3%BC%20Raporu%202025.pdf |

**Bottom-up gelir tahmini (VARSAYIM — pazar verisi değil):**

| Segment | Adet | Erişilebilir hedef (%) | Hedef adet | Varsayılan ARPA (yıllık) | Potansiyel ARR |
|---|---|---|---|---|---|
| Üniversite | 209 | %10 (3 yılda) | 21 | ~140.000 TL (Team) | ~2,9M TL |
| Büyükşehir + il belediyesi | 81 | %15 | 12 | ~140.000 TL | ~1,7M TL |
| İlçe belediyesi | 922 | %2 | 18 | ~73.000 TL (Agency) | ~1,3M TL |
| Banka | 50 | %10 | 5 | ~470.000 TL (Enterprise) | ~2,4M TL |
| Özel hastane zinciri | ~20 zincir | %20 | 4 | ~470.000 TL | ~1,9M TL |
| Meslek kuruluşu / oda | ~470 | %2 | 9 | ~22.000 TL (Starter) | ~0,2M TL |
| Web ajansı (kanal) | — | — | 25 ajans | ~73.000 TL | ~1,8M TL |
| **Toplam (3 yıl, muhafazakâr)** | | | **~94 hesap** | | **~12,2M TL ≈ €260k ARR** |

> ⚠️ **Bu tablo bir varsayımdır**, pazar araştırması değil. Dönüşüm oranları, ARPA ve kur tamamen varsayımsaldır. Amacı büyüklük mertebesi vermek: **Türkiye tek başına Percevia'yı €250–300k ARR'a taşıyabilir, ama €5M ARR'a taşıyamaz.** Türkiye bir başlangıç pazarı ve meşruiyet kaynağıdır, nihai pazar değildir.

### 5.8 Türkiye'de fiyat hassasiyeti ve kur riski

**Gerçekler:**
- Türkiye'de kamu ve kurumsal alıcı **TL bütçeyle** planlama yapar; yıllık bütçe kalemi Aralık'ta kesinleşir
- EUR/TL kuru son yıllarda yüksek oynaklık gösterdi; bir kurumun Ocak'ta onayladığı EUR bütçesi Kasım'da %30 fazla TL'ye mal olabilir
- Doğrudan temin limiti bile **Yİ-ÜFE ile yıllık güncelleniyor** (2026: %27,67) — yani kurum kendi limitini enflasyonla ayarlıyor, ama kur riskini ayarlamıyor
- 4734 kapsamındaki alımlar TL üzerinden yapılır; döviz cinsi sözleşme kamu alımında sürtünme yaratır

**Percevia için fiyatlandırma kararları (öneri):**

| Karar | Öneri | Gerekçe |
|---|---|---|
| **Para birimi** | Türkiye için **TL liste fiyatı yayımla**, EUR'yu global fiyat olarak tut | Kamu alıcısı TL fiyat görmek zorunda; EUR fiyat "bunu bütçeleyemem" itirazı doğurur |
| **Kur riski yönetimi** | TL fiyatı **yılda 2 kez** (Ocak ve Temmuz) revize et, sözleşmeye "yıllık yenilemede güncel liste fiyatı uygulanır" maddesi koy | Aylık kur takibi alıcıyı kaçırır; yılda 2 revizyon piyasa normudur |
| **Yıllık peşin teşviki** | Yıllık peşin ödemede **%20 indirim** (sektör normu %16,7; Türkiye'de nakit değeri daha yüksek) | Kur riskini alıcıya değil, size sabitler; kamu kurumu yıllık peşin ödemeye zaten yatkın |
| **Fiyat bandı hedefi (TL)** | Starter ~**1.900 TL/ay** · Agency ~**6.200 TL/ay** · Team ~**11.900 TL/ay** | EUR fiyatların ~47 TL kurdan psikolojik yuvarlamasıyla; bkz. Bölüm 14.7 |
| **Kamu için özel paket** | "Kurum Planı" — sabit yıllık TL, doğrudan temin limitinin altında, e-Fatura, Türkçe destek, Bakanlık A Seviyesi eşlemeli rapor | Kamu alıcısı paket ismini bütçe kalemine yazabilmeli |

### 5.9 Türkiye'deki rakip durumu

| Oyuncu | Tip | Türkçe | Konum | Tehdit |
|---|---|---|---|---|
| **WeAccess.AI** | Overlay + tarayıcı + işaret dili + PDF/medya | ✅ Tam | Eskişehir OSB Teknopark + Londra + Dubai | 🟡 **Yüksek (TR'de).** Tek görünür yerli rakip. Ama overlay — saldırılabilir |
| **erisilebilirlik.org** | Bilgi/danışmanlık portalı + araştırma | ✅ Tam | Türkiye | 🟢 **Rakip değil — potansiyel ORTAK.** Bakanlık kontrol listesini yayımlıyor, TDEA 2026 araştırmasını koordine ediyor |
| **Yerel web ajansları** (Drupart vb.) | Danışmanlık + geliştirme | ✅ | Türkiye | 🟢 **Rakip değil — kanal.** Genelge içerikleri üretiyorlar, müşteri portföyleri var |
| **accessiBe / UserWay / AudioEye** | Overlay | ❌ (widget çok dilli ama panel/rapor İngilizce) | ABD/İsrail | 🟡 Orta — Türk SMB'lere ulaşıyorlar |
| **Siteimprove / Silktide / Deque** | Kurumsal | ❌ | ABD/UK/DK | 🟢 Düşük — Türkiye'de aktif satış yok, fiyat bandı uymuyor |
| **Pope Tech** | SMB tarama | ❌ | ABD | 🟢 Düşük — Türkiye'de görünürlük yok |

**Stratejik okuma:** Türkiye'de gerçek rekabet **iki cephede**:
1. **WeAccess.AI'a karşı:** ürün kategorisi savaşı. "Overlay mi, ölçüm ve düzeltme operasyonu mu?" Percevia'nın silahı FTC kararı, Overlay Fact Sheet ve WebAIM verisi. **Ama dikkat: Türkiye'de overlay'e karşı topluluk baskısı ABD'deki kadar güçlü değil ve Aile ve Sosyal Hizmetler Bakanlığı'nın kendi web sitesi bile bir erişilebilirlik menüsü/overlay çalıştırıyor** (aile.gov.tr'de "Erişilebilirlik Menüsü": Ekran Okuyucu, Disleksi Dostu, Kontrast, Okuma Maskesi vb.). Yani "overlay kötüdür" argümanı Türkiye'de **eğitim gerektiriyor**, otomatik kabul görmüyor. Bu, PR ve içerik stratejisinin merkezine oturmalı.
2. **"Hiçbir şey"e karşı:** kurumların çoğu bugün hiçbir araç kullanmıyor. Asıl rakip **eylemsizlik** ve **"Lighthouse'ta 100 aldık"** yanılsaması.

### 5.10 Türkçe erişilebilirlik ekosistemi ve potansiyel ortaklar

| Kurum/Oluşum | Ne yapıyor | Percevia için değer |
|---|---|---|
| **erisilebilirlik.org** | Bakanlık A Seviyesi Kontrol Listesi'ni erişilebilir HTML formatında yayımlıyor; Genelge haberleri; **TDEA 2026'yı koordine ediyor** | 🎯 **1 numaralı ortaklık hedefi.** İçerik ortaklığı, araştırma sponsorluğu, kontrol listesi eşleme işbirliği |
| **Türkiye Görme Engelliler Derneği (TURGED)** | TDEA 2026 kurucu eş yürütücüsü | 🎯 Meşruiyet ortağı. Kullanıcı testi ve doğrulama için doğal partner |
| **Görme Engelliler Federasyonu (GEF)** | Çatı federasyon; erişilebilirlik standartları çalışmaları, Ulaştırma ve Altyapı Bakanlığı ile ortak raporlar. Üye dernekler arasında Altı Nokta yapıları | 🎯 Danışma Komisyonu'ndaki "iki konfederasyon"dan birine erişim yolu olabilir |
| **Türkiye Down Sendromu Derneği** | TDEA 2026 destekçisi | Bilişsel erişilebilirlik perspektifi |
| **TİHEK (Türkiye İnsan Hakları ve Eşitlik Kurumu)** | 2025/10 Genelgesi hakkında basın açıklaması yayımladı | Kamu meşruiyeti ve ayrımcılık başvuru kanalı |
| **Türkiye Belediyeler Birliği (TBB)** | Genelgeyi tüm belediyelere duyurdu | 🎯 **1.401 belediyeye tek noktadan erişim.** Webinar/eğitim işbirliği en yüksek kaldıraçlı hamle |
| **YÖK / üniversite engelli öğrenci birimleri** | Her üniversitede zorunlu Engelli Öğrenci Birimi var | 🎯 209 üniversitede hazır iç savunucu (champion) |
| **TÜBİTAK, Türksat** | Danışma Komisyonu üyesi | Teknik referans ve standart belirleyici |
| **Web ajansları (Drupart vb.)** | Genelge içeriği üretiyor, kamu/kurumsal müşteri portföyü var | 🎯 Kanal ortağı |
| **Akademi** | Üniversite ve bakanlık web sitesi erişilebilirliği üzerine Türkçe literatür mevcut (Hacettepe BBY, DergiPark yayınları) | Ortak yayın = düşük maliyetli otorite |

**🔥 Tek seferlik zamanlama fırsatı — TDEA 2026**
Türkiye'nin **ilk ulusal dijital erişilebilirlik araştırması** (Türkiye Dijital Erişilebilirlik Araştırması, TDEA 2026), erisilebilirlik.org koordinasyonunda, TURGED kurucu eş yürütücülüğünde, GEF ve Türkiye Down Sendromu Derneği katkısıyla **1 Temmuz 2026'da** katılıma açıldı. Anket **30 Eylül 2026'ya** kadar açık; **sonuç raporu 1 Ekim 2026'da** yayımlanacak. Kapsam: bankacılık, e-ticaret, ulaşım, telekomünikasyon, eğitim, sosyal medya ve kamu hizmetleri.

**Percevia'nın yapması gereken (Ağustos–Eylül 2026):**
1. erisilebilirlik.org ile temas kur, araştırmaya **veri katkısı** öner (örn. Türkiye'nin en çok ziyaret edilen 500 sitesinin otomatik tarama sonuçları — WebAIM Million'ın Türkiye versiyonu)
2. Anketi kendi kanallarında duyur — sıfır maliyetli iyi niyet
3. **1 Ekim rapor gününe senkron** kendi "Türkiye Web Erişilebilirlik Raporu 2026"nı yayımla ve TDEA'ya atıf ver
4. Bu, Türkiye'de marka bilinirliği için **yılın en büyük tek fırsatıdır**

Kaynaklar: https://yasadikca.com/turkiyenin-ilk-dijital-erisilebilirlik-arastirmasi-basladi/ · https://erisilebilirlik.org/ · https://www.turged.org.tr/ · https://gef.org.tr/ · https://www.tihek.gov.tr/web-siteleri-ve-mobil-uygulamalarin-erisilebilirligi-konulu-2025-10-sayili-cumhurbaskanligi-genelgesi-hakkinda-basin-aciklamasi · https://www.tbb.gov.tr/tr/mevzuat-duyurulari/web-siteleri-ve-mobil-uygulamalarin-erisilebilirligi-ile-ilgili-202510-sayili-cumhurbaskanligi-genelgesi

### 5.11 Türkiye — Özet Aksiyon Listesi

| # | Aksiyon | Etki | Çaba | Ne zaman |
|---|---|---|---|---|
| TR-1 | Bakanlık **A Seviyesi Kontrol Listesi**'ni ürün içine eşle; rapor şablonu üret | 🔴 Kritik | Orta | Hafta 1–4 |
| TR-2 | Türkçe UI + Türkçe issue açıklaması + Türkçe düzeltme önerisi | 🔴 Kritik | Orta | Hafta 1–6 |
| TR-3 | "İnceleme Komisyonu Raporu" PDF şablonu (Genelge diliyle) | 🔴 Kritik | Düşük | Hafta 2–4 |
| TR-4 | TL liste fiyatı + doğrudan temin argümanı satış materyaline | 🔴 Kritik | Düşük | Hafta 2 |
| TR-5 | KVKK paketi: PII maskeleme + LLM'siz mod + SCC + DPA + alt işleyici listesi | 🔴 Kritik (banka/hastane için) | Orta-Yüksek | Hafta 3–10 |
| TR-6 | erisilebilirlik.org ve TURGED ile temas; TDEA 2026 katkısı | 🟠 Yüksek | Düşük | Hafta 2–6 |
| TR-7 | TBB üzerinden belediye webinarı | 🟠 Yüksek | Düşük | Hafta 6–12 |
| TR-8 | Türkiye'de tüzel kişilik / yerel bayi ile TL e-Fatura kabiliyeti | 🟠 Yüksek | Yüksek | Ay 3–6 |
| TR-9 | "Türkiye Web Erişilebilirlik Raporu 2026" — 500 site taraması, 1 Ekim yayını | 🟠 Yüksek | Orta | Ağustos–Eylül |
| TR-10 | DMO kataloğuna giriş süreci başlat | 🟡 Orta | Yüksek | Ay 4–12 |
| TR-11 | Türk İşaret Dili boşluğuna karşı kapsam netleştirme mesajı (WeAccess'e cevap) | 🟡 Orta | Düşük | Hafta 4 |

---

## 6. Regülasyon Takvimi ve Yaptırım Gerçekliği

### 6.1 Ana takvim tablosu

| Regülasyon | Bölge | Kapsam | Tarih | Yaptırım | Kaynak |
|---|---|---|---|---|---|
| **European Accessibility Act (EAA / Direktif 2019/882)** | AB 27 | E-ticaret, bankacılık/ödeme, elektronik haberleşme, AV medya, ulaşım biletleme/bilgi, e-kitap, bilgisayar/OS, ATM/kiosk. **Muafiyet: sadece hizmet sunan mikro işletmeler — <10 çalışan VE ≤€2M ciro (her iki koşul birlikte)**. Ürün üreten/dağıtan mikro işletmeler kapsamda | **28 Haziran 2025**'te yürürlükte; 27 üye devletin tamamı iç hukuka aktardı | Ceza miktarı üye devlete göre: **Polonya ~€21.000 (veya cironun %10'u) → İrlanda €60.000 → İspanya €1.000.000 → Macaristan €1.260.000 → İsveç ~€900.000**. İrlanda tek **cezai yaptırımlı** ülke (iddianameyle 18 aya kadar hapis). Ürün geri çekme, pazardan men, zorunlu denetim, **kamuya teşhir** de mümkün | https://www.levelaccess.com/blog/penalties-for-eaa-non-compliance/ · https://web-accessibility-checker.com/en/blog/eaa-fines-by-country · https://krisrivenburgh.com/microenterprises-exempt-eaa-requirements/ · https://www.gtlaw.com/en/insights/2025/7/european-accessibility-act-compliance-what-businesses-in-the-eu-market-need-to-know |
| **EAA — fiili uygulama durumu (Temmuz 2026)** 🆕 | AB | — | **Kasım 2025:** Fransa DGCCRF, Auchan, Carrefour, E.Leclerc, Picard'a resmî ihtar; 12 Kasım 2025 Ticaret Mahkemesi'nde acil ihtiyati tedbir. **Mayıs 2026:** Lille mahkemesi **Auchan davasını reddetti** (eşik gerekçesiyle). **4 Haziran 2026:** **Caen Adliye Mahkemesi Carrefour France'ı mahkûm etti.** **22 Eylül 2026:** E.Leclerc duruşması (Créteil). Picard: tarih yok. **Hollanda:** ACM resmî yaptırım programları başlattı, ceza kararları 2026 boyunca bekleniyor. **Almanya:** BFSG yürürlüğe girdikten haftalar sonra (Ağustos 2025) hukuk bürolarından özel ihtarnameler | **Haziran 2026 itibarıyla doğrulanmış EAA idari para cezası yok** — yaptırım mahkeme kanalından geliyor | https://silktide.com/blog/second-eaa-ruling-4-june-2026/ · https://www.deque.com/blog/frances-major-court-decision-supporting-digital-accessibility-under-the-eaa/ · https://www.lflegal.com/lf-country/european-accessibility-act-eaa-enforcement-and-implementation/ |
| **EN 301 549** | AB (harmonize standart) | EAA ve Web Accessibility Directive'in teknik referansı; web/mobil için WCAG + donanım, yazılım, dokümantasyon, destek | Mevcut harmonize sürüm **v3.2.1** (WCAG 2.1 AA tabanlı). **v4.1.0** taslağı Kasım 2025'te kamuoyu görüşüne açıldı; **v4.1.1**'in **Ekim 2026**'da OJEU'da referans verilmesi ve **WCAG 2.2 AA** tabanına geçmesi bekleniyor. Geliştirici: ETSI + CEN + CENELEC | v4.1.1'e uygunluk EAA'ya uygunluk **karinesi** yaratacak. **Bir standart yalnızca OJEU'da referans verildiğinde hukuki anlam kazanır** | https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.00_20/en_301549v040100ev.pdf · https://digital-strategy.ec.europa.eu/en/policies/latest-changes-accessibility-standard · https://www.skynettechnologies.com/blog/en-301-549-v4-1-1-european-accessibility-standards |
| **ADA Title II final rule (DOJ, Nisan 2024)** | ABD eyalet/yerel yönetimler | Web içeriği ve mobil uygulamalar; bağlayıcı teknik standart **WCAG 2.1 AA** | Orijinal: 24 Nisan 2026 (≥50.000 nüfus) / 26 Nisan 2027 (<50.000 + özel bölgeler). **20 Nisan 2026 Interim Final Rule ile ~1 yıl ertelendi:** **≥50.000 → 26 Nisan 2027**; **<50.000 ve özel bölge yönetimleri → 26 Nisan 2028** | DOJ icra + özel dava. **Erteleme gerekçesi: kaynak kısıtları ve üretken AI dahil mevcut teknolojinin ölçekte otomatik remediation yapamaması** | https://www.adatitleiii.com/2026/04/doj-extends-ada-title-ii-website-accessibility-deadlines-for-governmental-entities-but-litigation-and-compliance-risks-remain/ · https://www.venable.com/insights/publications/2026/04/ada-title-ii-website-accessibility-regulations |
| **Section 504 (HHS)** | ABD federal fon alan sağlık kuruluşları | Web içeriği + mobil uygulama, **WCAG 2.1 AA** | Bir yıl ertelendi: **≥15 çalışan → 11 Mayıs 2027**; **<15 çalışan → 10 Mayıs 2028** | Federal fon şartı; HHS icra | https://webaim.org/blog/an-extension-is-not-an-excuse/ · https://public-inspection.federalregister.gov/2026-09266.pdf |
| **ADA Title III (özel dava)** | ABD işletmeleri | "Public accommodation" web siteleri | Sürekli — takvimi yok, **fiili uygulama mekanizması bu** | 2025: **8.667** federal ADA Title III davası (-%2); bunun **3.117'si web sitesi davası (+%27)**. Toplam (federal+eyalet) dijital erişilebilirlik davası **5.000+**. **2026 projeksiyonu ~6.176 (+~%20, tarihi rekor)** | https://www.adatitleiii.com/2026/02/ada-title-iii-federal-lawsuit-filings-fall-slightly-to-8667-in-2025/ · https://blog.usablenet.com/inside-the-2026-midyear-numbers-where-digital-accessibility-litigation-is-going |
| **Section 508** | ABD federal kurumlar ve tedarikçiler | Federal ICT satın alma | Yürürlükte (EN 301 549 ile büyük ölçüde uyumlu, WCAG 2.0 AA tabanlı) | Satın alma dışı bırakma, şikayet | https://userway.org/compliance/508/ |
| **AODA (Ontario, Kanada)** 🆕 | Ontario | 20+ çalışanlı özel/kâr amacı gütmeyen kuruluşlar ve kamu sektörü; kamuya açık web içeriği | Web için **WCAG 2.0 AA** son tarihi 1 Ocak 2021'de doldu. **Uyum raporlaması: kamu sektörü 31 Aralık 2025; özel/kâr amacı gütmeyen 20+ çalışan 31 Aralık 2026.** WCAG 2.2'ye eyalet çapında geçiş **2027** bekleniyor [3P] | Teorik tavan **kurumlar için günlük $100.000**, yönetici/direktör için günlük $50.000 — **bu tavan hiç kullanılmadı**. Pratikte cezalar $500–15.000 bandında ve çoğunlukla **raporlama ihlali** için | https://www.levelaccess.com/blog/aoda-compliance-requirements-for-websites/ · https://allyant.com/compliance/aoda-compliance-the-accessibility-for-ontarians-with-disabilities-act/ |
| **UK — Public Sector Bodies Accessibility Regulations 2018 (PSBAR)** 🆕 | Birleşik Krallık | Merkezi hükümet, yerel yönetimler, geniş kamu fonlu kuruluş yelpazesi; web siteleri ve mobil uygulamalar | **WCAG 2.2 AA**, 5 Ekim 2023'ten itibaren hukuki teknik standart. **Ekim 2024'ten itibaren GDS izleme süreci WCAG 2.2 kullanıyor** | **GDS (Central Digital and Data Office)** izliyor: erişilebilirlik beyanlarının varlığı ve doğruluğu dahil. **EHRC** ve **ECNI** soruşturma açabilir, hukuka aykırılık bildirimi verebilir, dava açabilir | https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps · https://www.levelaccess.com/blog/website-accessibility-laws-in-the-u-k/ |
| **UK — Equality Act 2010** 🆕 | Birleşik Krallık | Tüm hizmet sağlayıcılar (kamu + özel) | Sürekli | "Makul düzenleme" (reasonable adjustment) yükümlülüğü; bireysel ayrımcılık davası. Teknik standart belirtilmemiş — WCAG fiili referans | https://accessibility.eu/compliance-overview/uk-accessibility-laws/ |
| **Avustralya — Disability Discrimination Act 1992 (DDA)** 🆕 | Avustralya | İstihdam, eğitim, konaklama ve **internet/dijital hizmetler dahil kamusal yaşamın tüm alanları** | Sürekli. Avustralya İnsan Hakları Komisyonu'nun "World Wide Web Access: DDA Advisory Notes" rehberi. Commonwealth kurumları için **WCAG 2.1 AA**, Digital Transformation Agency Digital Service Standard aracılığıyla | Ayrımcılık şikâyeti → AHRC arabuluculuk → federal mahkeme. Kamu alımında WCAG 2.1 AA fiili eşik | https://humanrights.gov.au/our-work/disability-rights/world-wide-web-access-disability-discrimination-act-advisory-notes · https://www.accessibility.org.au/policy/website-accessibility/ |
| **WCAG 2.2** | Global | W3C Recommendation | Yürürlükte — **bugün inşa edilecek ve test edilecek standart** | Doğrudan yaptırım yok; regülasyonlar referans alıyor | https://www.w3.org/WAI/ |
| **WCAG 3.0** | Global | W3C | **Hâlâ Working Draft.** Son taslak **3 Mart 2026** — "outcomes" artık "**requirements**" adını aldı, **174 requirement**. Candidate Recommendation beklentisi **2027 Q4**, W3C Recommendation **2028'den önce değil** (bazı analizler 2029'a kadar uzayabileceğini söylüyor) | Yok — planlamada baz alınmamalı | https://www.w3.org/WAI/news/2026-03-03/wcag3 · https://www.accessibility.org.au/new-2026-update-for-the-wcag-3-0-working-draft/ |
| **Türkiye — 2025/10 sayılı Cumhurbaşkanlığı Genelgesi** ✅ | Türkiye | **Tam liste Bölüm 5.1'de.** Özet: kamu kurum/kuruluşları, üniversiteler, belediyeler, KİT'ler, belediye şirket/işletme/iştirakleri, kamu kurumu niteliğindeki meslek kuruluşları, bankalar, özel hastaneler, MEB izinli özel öğretim kurumları, kara/deniz/demir/hava yolcu taşımacıları, A Grubu seyahat acenteleri, 200.000+ aboneli elektronik haberleşme işletmecileri → **1 yıl**. E-ticaret hizmet sağlayıcıları (6563) → **2 yıl** | İmza **20 Haziran 2025**; **Resmî Gazete 21 Haziran 2025, Sayı 32933**. 1 yıllık grup ≈ **Haziran 2026** (doldu); e-ticaret ≈ **Haziran 2027**. **2026 = izleme ve denetleme yılı** | **Genelgede doğrudan para cezası yok.** Mekanizma: Bakan başkanlığında **İzleme Komisyonu**; Bakan Yardımcısı başkanlığında **Danışma Komisyonu** (İçişleri + UAB + TÜBİTAK + Türksat + 2 konfederasyon); her kurumda **İnceleme Komisyonu** (teknik rapor üretir). Uyumlu bulunan kuruma **2 yıl "Erişilebilirlik Logosu"**. Sonuç raporlarını **Bakan duyuracak**. 5378 geç. md. 3'te 5.000–25.000 TL/tespit, yılda max 500.000 TL idari para cezası rejimi mevcut ama web/mobile fiilen uygulandığına dair örnek bulunamadı | https://www.aile.tr/media/268283/web_siteleri_ve_mobil_uygulamalarin_erisilebilirligi_genelgesinin_alternatif_metin_versiyonu.pdf · https://www.resmigazete.gov.tr/eskiler/2025/06/20250621-17.pdf · https://www.aile.gov.tr/sss/engelli-ve-yasli-hizmetleri-genel-mudurlugu/erisilebilirlik/ |
| **Türkiye — referans standart** ✅ | Türkiye | Web ve mobil | **"Web Siteleri ve Mobil Uygulamaların Erişilebilirliği Kontrol Listesi – A Seviyesi" + WCAG 2.2.** Liste ve kılavuz www.aile.gov.tr'de yayımlanıyor. Kontrol listesi [3P] **31 ilke / 122 soru**, Ekim 2023'te WCAG 2.2 ile güncellendi | — | Genelge tam metni · https://erisilebilirlik.org/wcag/bakanlik-kontrol-listesi |

### 6.2 🆕 Fransa mahkeme kararları — kategorinin dönüm noktası

**Auchan (Tribunal judiciaire de Lille, Mayıs 2026) — DAVA REDDEDİLDİ**
Fransız dernekleri ApiDV ve Droit Pluriel'in açtığı dava, Lille mahkemesi tarafından **eşik gerekçesiyle** reddedildi. Mahkeme, Fransız Tüketici Kanunu md. L412-13'ün açılışındaki "2005 kanununun 47 ve 48. maddeleri saklı kalmak kaydıyla" ifadesini, Fransa'nın eski iç rejimini ve onun **€250 milyon ciro eşiğini** koruyacak şekilde yorumladı. Davalı Auchan iştiraki bu eşiğin altında kaldığı için kapsam dışı sayıldı. **Karar Cour d'appel de Douai'de temyizde.**

**Carrefour (Tribunal judiciaire de Caen, 4 Haziran 2026) — DAVA KABUL EDİLDİ**
Aynı dernekler tarafından açılan acil ihtiyati tedbir (*assignation en référé*) davasında Caen mahkemesi:
- Carrefour France'a **carrefour.fr ve Carrefour mobil uygulamasını 6 ay içinde erişilebilir hale getirme** emri verdi
- Süre aşımında **günün 500 €** para cezası (astreinte) öngördü
- Carrefour'un **"RGAA'ya göre yaklaşık %71 uyumluyum"** savunmasını **reddetti**
- Erişilebilirliği bir **sonuç yükümlülüğü** (*obligation de résultat*) olarak niteledi: bir site "kısmen erişilebilir" olamaz; RGAA'ya göre ölçülüyorsa **uygulanabilir kriterlerin %100'ü** karşılanmalıdır
- Carrefour'un "site her gün değişiyor, gerçek zamanlı tam erişilebilirlik zor" savunmasını da reddetti: yükümlülük ürünün yoğunluğuna göre yumuşamaz
- Kararını doğrudan **L412-13'e (EAA transpozisyonu)** dayandırdı — Lille'in aksine daha özerk bir okuma

Bu, **AB'de bir şirketin uymaya zorlandığı ilk EAA mahkeme kararı** ve **mobil uygulamayı açıkça kapsayan ilk karar**. Carrefour temyiz hakkını saklı tutuyor.

**Açık kalan soru:** €2M–€250M ciro bandındaki orta ölçekli şirketler. AB hukukuna göre kapsamdalar; Lille okumasına göre Fransız hukukunda kapsam dışılar. Bu, **Cour d'appel de Douai** kararıyla çözülecek. Carrefour €250M'u zaten aştığı için Caen kararı bu soruyu net olarak test etmiyor.

Kaynaklar: https://silktide.com/blog/second-eaa-ruling-4-june-2026/ · https://silktide.com/blog/eaa-auchan-court-ruling/ · https://www.deque.com/blog/frances-major-court-decision-supporting-digital-accessibility-under-the-eaa/ · https://www.barrierbreak.com/eaa-carrefour-penalty-france/ · https://www.village-justice.com/articles/urgent-decision-lille-mai-2026-apidv-droit-pluriel-auchan-commerce,57342.html

### 6.3 ⚠️ Carrefour kararının Percevia için doğrudan ürün sonuçları

Bu, V2'nin en önemli ürün uyarısıdır.

| Bulgu | Percevia'ya etkisi | Aksiyon |
|---|---|---|
| **"Beyandaki uyum yüzdesi bir iddiadır, savunma değildir."** Carrefour %71'i mahkemeye savunma olarak sundu, reddedildi | Percevia **erişilebilirlik beyanı üretiyor**. Bu beyan otomatik tarama sonucundan bir "uyum yüzdesi/skor" türetiyorsa, müşteriye mahkemede aleyhine kullanılabilecek bir belge veriyoruz | 🔴 **Beyan şablonundan skor/yüzde kaldırılmalı.** Yerine: kapsam, test yöntemi, test tarihi, **bilinen bariyerler listesi**, düzeltme takvimi, geri bildirim kanalı. Bu zaten EN 301 549 / WAD beyan formatının doğru yapısıdır |
| **Erişilebilirlik bir sonuç yükümlülüğü** — "kısmen erişilebilir" diye bir şey yok | Percevia'nın "skor 79/100" tarzı gösterimi alıcıda yanlış güvenlik hissi yaratır | 🟠 Skor gösterilecekse **açıkça "otomatik tespit edilebilir ihlallerin ilerleme göstergesi, uyum ölçüsü değildir"** etiketiyle |
| **"Site her gün değişiyor" bir savunma değil** | Bu, **sürekli izleme** ürününün en güçlü satış argümanıdır | ✅ Pazarlama mesajına doğrudan gir: *"Mahkeme, 'sitemiz her gün değişiyor' savunmasını reddetti. O yüzden yılda bir denetim değil, sürekli izleme gerekiyor."* |
| **Mobil uygulama açıkça kapsandı** | Percevia'da mobil kapsamı **yok** | 🟠 AB e-ticaret ve TR genelge alıcısına bu boşluk baştan söylenmeli. Orta vadeli ürün kararı |
| **Dernekler dava açıyor, regülatör değil** | Yaptırım kanalı sivil toplum. Türkiye'de de GEF/TURGED gibi yapılar aynı rolü üstlenebilir | ✅ Bu, engelli dernekleriyle ortaklığın **iş kritikliğini** artırıyor |

---

## 7. Regülasyon × WCAG Eşleme Tablosu

> **Amaç:** Bir satış konuşmasında "hangi kuralın altındayız ve Percevia bunun neyini karşılıyor" sorusuna tek bakışta cevap vermek.
> **Kritik dürüstlük kuralı:** Hiçbir otomatik araç — Percevia dahil — bu tablodaki hiçbir regülasyona **uygunluğu kanıtlayamaz**. Sütun adları bilinçli olarak "karşıladığı kısım" / "karşılamadığı kısım" şeklindedir, "uyumlu yapar" değil.

| Regülasyon | Bölge | Kapsanan kuruluşlar | Referans standart | WCAG sürümü/seviyesi | Yükümlülük tipi | Yaptırım | Kilit tarih | Percevia'nın karşıladığı kısım | Karşılamadığı kısım |
|---|---|---|---|---|---|---|---|---|---|
| **EAA (2019/882)** | AB 27 | E-ticaret, banka/ödeme, e-haberleşme, AV medya, ulaşım biletleme, e-kitap, bilgisayar/OS, ATM/kiosk. Mikro işletme muafiyeti: <10 çalışan **VE** ≤€2M ciro | EN 301 549 (harmonize) | Bugün **v3.2.1 → WCAG 2.1 AA**; Ekim 2026'da **v4.1.1 → WCAG 2.2 AA** bekleniyor | Sonuç yükümlülüğü (Carrefour kararı) + erişilebilirlik beyanı + geri bildirim kanalı + şikâyet mekanizması | Üye devlete göre €21k–€1,26M; İrlanda'da hapis; ürün geri çekme; kamuya teşhir; **mahkeme kararıyla zorlama + günlük astreinte** | 28 Haz 2025 yürürlük; **4 Haz 2026 ilk mahkûmiyet** | Otomatik tespit edilebilir WCAG 2.2 A/AA ihlallerinin sürekli izlenmesi; issue gruplama; düzeltme takibi; zaman damgalı kayıt; beyan taslağı | Manuel test, ekran okuyucu ile gerçek kullanıcı akışı doğrulaması, **mobil uygulama**, PDF/e-kitap, AV medya altyazı/sesli betimleme, donanım (ATM/kiosk), destek hizmetlerinin erişilebilirliği, VPAT/uygunluk beyanı denetimi |
| **EN 301 549 v3.2.1 → v4.1.1** | AB (harmonize standart) | EAA + Web Accessibility Directive kapsamındaki her şey | Kendisi standart | v3.2.1 = WCAG 2.1 AA; **v4.1.1 = WCAG 2.2 AA (Ekim 2026 OJEU bekleniyor)** | Uygunluk karinesi | Kendi başına yaptırım yok; EAA/WAD üzerinden | **Ekim 2026** | Web için WCAG 2.2 A/AA otomatik kural seti | Standardın web dışı bölümleri: donanım, yazılım (non-web), dokümantasyon, destek hizmetleri, iki yönlü iletişim, gerçek zamanlı metin (RTT) |
| **Web Accessibility Directive (2016/2102)** | AB 27 kamu | Kamu sektörü web siteleri ve mobil uygulamaları | EN 301 549 | WCAG 2.1 AA (→2.2) | Uyum + **erişilebilirlik beyanı** + geri bildirim + düzenli izleme raporu | Üye devlete göre; genelde idari | Yürürlükte | Otomatik ihlal tespiti; beyan taslağı; periyodik izleme raporu üretimi | Üye devletin resmî izleme metodolojisi (basitleştirilmiş/derinlemesine), manuel test, mobil uygulama |
| **ADA Title II** | ABD eyalet/yerel yönetim | ≥50.000 ve <50.000 nüfuslu yönetimler + özel bölgeler | DOJ final rule | **WCAG 2.1 AA** (bağlayıcı teknik standart) | Uyum | DOJ icra + özel dava | ≥50k: **26 Nis 2027**; <50k: **26 Nis 2028** | WCAG 2.1/2.2 otomatik tespit edilebilir ihlaller; ilerleme kaydı | Manuel test, "fundamental alteration/undue burden" analizi, arşivlenmiş içerik istisnaları, üçüncü taraf içerik değerlendirmesi |
| **ADA Title III** | ABD özel sektör | "Public accommodation" web siteleri | Teknik standart **YOK** — mahkemeler WCAG 2.0/2.1 AA'yı fiili ölçüt alıyor | Fiilen WCAG 2.1 AA | Ayrımcılık yasağı (sonuç odaklı) | Özel dava; 2026'da ~6.176 dava projeksiyonu | Sürekli | Zaman damgalı "kanıtlanabilir çaba" kaydı; düzeltme takibi | **Hukuki savunma, uzlaşma desteği, mali garanti, uzman tanıklık** — Percevia hiçbirini sunmuyor |
| **Section 508** | ABD federal kurum + tedarikçi | Federal ICT satın alma | Section 508 Refresh (EN 301 549 ile büyük ölçüde uyumlu) | WCAG 2.0 AA tabanlı | Satın alma şartı; **VPAT/ACR talebi** | Satın alma dışı bırakma, şikâyet | Yürürlükte | Otomatik ihlal tespiti | 🔴 **VPAT/ACR üretimi — Percevia'da yok ve bu bir eleme kriteridir** |
| **Section 504 (HHS)** | ABD federal fon alan sağlık kuruluşları | Web + mobil uygulama | HHS kuralı | **WCAG 2.1 AA** | Uyum (federal fon şartı) | HHS icra, fon kesintisi | ≥15 çalışan: **11 May 2027**; <15: **10 May 2028** | Web tarafı otomatik tespit | Mobil uygulama, PDF/hasta dokümanları, klinik sistemler |
| **AODA (Ontario)** | Kanada — Ontario | 20+ çalışanlı özel/kâr amacı gütmeyen + kamu sektörü | IASR (Integrated Accessibility Standards Regulation) | **WCAG 2.0 AA** (2.2'ye geçiş 2027 bekleniyor [3P]) | Uyum + **periyodik uyum raporu (compliance report)** | Teorik tavan kurumlar için günlük $100k (hiç kullanılmadı); pratik cezalar $500–15.000, çoğu raporlama ihlali | Kamu: **31 Ara 2025**; özel/NPO 20+: **31 Ara 2026** | Otomatik ihlal tespiti; **periyodik rapor üretimi için veri** | Resmî AODA uyum raporu formatı, manuel test, çalışan eğitim/politika yükümlülükleri |
| **TR — 2025/10 Genelgesi** | Türkiye | Kamu, üniversite (~209), belediye (~1.401) + belediye şirketleri, KİT, meslek kuruluşları, banka (50+), özel hastane (~570+), MEB özel öğretim kurumları, kara/deniz/demir/hava yolcu taşımacıları, A Grubu acenteler, 200k+ aboneli telekom → **1 yıl**. E-ticaret (6563) → **2 yıl** | **Web Siteleri ve Mobil Uygulamaların Erişilebilirliği Kontrol Listesi – A Seviyesi** | **WCAG 2.2** | Uyum + kurum içi **İnceleme Komisyonu** kurma + **teknik rapor üretip İzleme Komisyonuna sunma** | Genelgede para cezası yok. İzleme + Bakan duyurusu + **2 yıl Erişilebilirlik Logosu**. 5378 geç. md. 3: 5.000–25.000 TL/tespit, yılda max 500.000 TL (web'e uygulandığı doğrulanamadı) | 1 yıl: ≈**Haz 2026** (doldu). E-ticaret: ≈**Haz 2027**. **2026 = izleme yılı** | 🎯 **İnceleme Komisyonu raporunun otomatik tespit edilebilir kısmı**; WCAG 2.2 A/AA taraması; Türkçe issue açıklaması; zaman damgalı kayıt; A Seviyesi eşlemeli PDF | **Mobil uygulama** (Genelge açıkça kapsıyor), manuel kontrol listesi kalemleri, Türk İşaret Dili içeriği, PDF/doküman erişilebilirliği, Bakanlık resmî değerlendirme süreci |
| **UK — PSBAR 2018** | Birleşik Krallık kamu | Merkezi hükümet, yerel yönetimler, kamu fonlu kuruluşlar; web + mobil | — | **WCAG 2.2 AA** (5 Eki 2023'ten beri) | Uyum + **erişilebilirlik beyanı (doğruluğu izleniyor)** | **GDS/CDDO izleme**; **EHRC/ECNI** soruşturma, hukuka aykırılık bildirimi, dava | Yürürlükte; Eki 2024'ten beri GDS izlemesi WCAG 2.2 | Otomatik WCAG 2.2 tespiti; beyan taslağı; sürekli izleme kaydı | GDS'in resmî izleme metodolojisi, manuel test, mobil uygulama, beyanın **doğruluğunun** denetimi |
| **UK — Equality Act 2010** | Birleşik Krallık | Tüm hizmet sağlayıcılar (kamu + özel) | Teknik standart **YOK** | Fiilen WCAG 2.2 AA | "Makul düzenleme" yükümlülüğü | Bireysel ayrımcılık davası, tazminat | Sürekli | Kanıtlanabilir çaba kaydı | Hukuki savunma; "makul düzenleme" değerlendirmesi hukuki bir yargıdır, teknik değil |
| **AU — DDA 1992** | Avustralya | Kamusal yaşamın tüm alanları; internet/dijital hizmetler dahil | AHRC "World Wide Web Access" Advisory Notes; Commonwealth için DTA Digital Service Standard | **WCAG 2.1 AA** (fiili benchmark ve satın alma eşiği) | Ayrımcılık yasağı (sonuç odaklı) | AHRC şikâyeti → arabuluculuk → federal mahkeme | Sürekli | Otomatik ihlal tespiti; sürekli izleme kaydı | Manuel test, kullanıcı testi, hukuki savunma, mobil uygulama |
| **WCAG 2.2 (W3C)** | Global | — | Kendisi standart | A / AA / AAA | Doğrudan yaptırım yok | — | Yürürlükte | axe-core ile otomatik tespit edilebilen kriterler (issue hacminin ~%50–57'si) | **WCAG başarı kriterlerinin çoğunluğu otomatik test edilemez** (odak sırası, anlam bütünlüğü, alt metin *kalitesi*, hata önleme, tutarlı yardım, sürükleme alternatifi vb.) |

### 7.1 Bir aracın "uyumluluk kanıtı" olarak kabul edilip edilmediği

| Regülasyon | Otomatik araç çıktısı kanıt sayılır mı? | Manuel denetim şart mı? | Gerekçe / kaynak |
|---|---|---|---|
| **EAA** | ❌ Hayır | ⚠️ Fiilen evet | Carrefour kararı: sonuç yükümlülüğü; %71 self-declared oran reddedildi. EN 301 549 uygunluğu tüm kriterleri kapsar, otomatikleştirilemeyenler dahil · https://silktide.com/blog/second-eaa-ruling-4-june-2026/ |
| **EN 301 549** | ❌ Hayır | ✅ Evet | Standardın kriterlerinin çoğu insan değerlendirmesi gerektiriyor |
| **ADA Title II** | ❌ Hayır | ⚠️ Fiilen evet | DOJ'un erteleme gerekçesi **doğrudan** "üretken AI dahil mevcut teknoloji ölçekte otomatik remediation yapamıyor" · https://www.adatitleiii.com/2026/04/doj-extends-ada-title-ii-website-accessibility-deadlines-for-governmental-entities-but-litigation-and-compliance-risks-remain/ |
| **ADA Title III** | ❌ Hayır | ⚠️ Uzlaşmalarda genelde şart koşuluyor | UsableNet: "Sayfadaki bir widget savunma değildir. Hiçbir zaman olmadı." · Overlay kullanan 800+ işletme dava edildi |
| **Section 508** | ❌ Hayır — **VPAT/ACR gerekir** | ✅ Evet | VPAT, tüm kriterlerin insan tarafından değerlendirilmesini gerektirir |
| **AODA** | 🟡 Kısmen — uyum raporu self-declared | ⚠️ Önerilir | Ceza pratikte raporlama ihlaline kesiliyor, teknik ihlale değil |
| **TR 2025/10** | 🟡 **Belirsiz — İnceleme Komisyonu raporu kurumun kendi beyanı** | ⚠️ A Seviyesi Kontrol Listesi'nin bir kısmı manuel | Genelge, kurumun kendi teknik incelemesini ve raporunu esas alıyor; Bakanlık İzleme Komisyonu doğruluyor. **Bu, otomatik araç için Türkiye'yi en elverişli pazar yapan yapısal özelliktir** |
| **UK PSBAR** | ❌ Hayır — **beyanın doğruluğu ayrıca izleniyor** | ✅ Evet | GDS beyanların doğruluğunu denetliyor · https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps |
| **UK Equality Act / AU DDA** | ❌ Hayır | ⚠️ Fiilen evet | Sonuç odaklı ayrımcılık rejimleri; teknik uygunluk savunma değil |

**Percevia'nın bu tablodan çıkarması gereken tek cümle:**
> *"Hiçbir regülasyon otomatik tarama çıktısını uyumluluk kanıtı olarak kabul etmiyor. Percevia bunu iddia etmiyor ve etmeyecek. Percevia'nın ürettiği şey **kanıtlanabilir, tarihli, tekrarlanabilir çaba kaydı** ve düzeltme operasyonudur. Türkiye 2025/10 Genelgesi ise, kurumun kendi teknik inceleme raporunu esas aldığı için, bu çaba kaydının doğrudan yükümlülüğün bir parçası olduğu tek rejimdir."*

---

## 8. Alıcı Persona'ları ve Satın Alma Süreci

> ⚠️ **BU BÖLÜM VARSAYIMDIR.** Aşağıdaki persona'lar; regülasyon metinleri, kurum yapıları, kamuya açık bütçe/limit verileri ve kategori satın alma davranışı araştırmasından **türetilmiş sentetik profillerdir**. Hiçbiri gerçek bir müşteri görüşmesine dayanmıyor. Görüşme yapılmadan bunlara bütçe bağlanmamalıdır.
> **Doğrulanmış veri ile varsayımın karışmaması için:** kaynak linki olan satırlar veridir; geri kalanı varsayımdır.
>
> **Doğrulanmış zemin veriler (Level Access State of Digital Accessibility Report 2025–2026, ABD + Avrupa'da 1.600+ dijital deneyim profesyoneli):**
> - **%77'si** kurumunda politika + sorumlu kişi + **ayrılmış bütçe** olduğunu söylüyor (2024: %73)
> - **%68'i** önümüzdeki yıl bütçeyi koruyacağını veya artıracağını söylüyor
> - **%89'u** erişilebilirliğin rekabet avantajı sağladığına inanıyor; **%86'sı** hukuki riski azalttığını, **%75'i** geliri artırdığını söylüyor
> Kaynak: https://www.levelaccess.com/sodar/exploring-our-findings/ · https://www.businesswire.com/news/home/20251113911439/en/Research-Finds-Strong-Link-Between-Digital-Accessibility-and-Business-Growth

### 8.1 Persona 1 — "Genelge Baskısındaki Kamu BT Sorumlusu" (TR)

**Örnek:** Murat, 41 — Bilgi İşlem Daire Başkanı, orta ölçekli devlet üniversitesi (veya büyük ilçe belediyesi Bilgi İşlem Müdürü)

| Boyut | Detay |
|---|---|
| **Rol** | Kurumun tüm dijital varlıklarından sorumlu; 4–12 kişilik ekip; ana site + 30–200 alt birim sitesi (fakülteler, enstitüler, müdürlükler) |
| **Hedefleri** | Genelge yükümlülüğünü kapatmak; İnceleme Komisyonu raporunu üretmek; **Erişilebilirlik Logosu** almak; üst yönetime "sorun yok" diyebilmek |
| **Korkuları** | Bakan'ın açıklayacağı izleme sonuç raporunda kurumun kötü çıkması; rektörlük/başkanlıktan "bu neden yapılmadı" yazısı; denetim yazışması; alt birim sitelerinin kontrolsüzlüğü |
| **Günlük iş akışı** | %60 operasyon (sunucu, ağ, e-posta, öğrenci/vatandaş sistemleri), %20 ihale/satın alma evrakı, %20 üst yönetim talepleri. **Erişilebilirlik için ayrılmış zamanı yok.** |
| **Bütçe kalemi ve tutarı** | Kurum bütçesinde "yazılım lisans/bakım" kalemi. Yıllık toplam 500.000 – 5.000.000 TL bandında; erişilebilirlik için ayrılabilecek: **50.000 – 200.000 TL/yıl** *(varsayım)*. **Doğrudan temin limiti (2026): büyükşehirde 1.021.827 TL, diğerlerinde 340.391 TL** ✅ doğrulanmış |
| **Karar verici mi, etkileyici mi** | **Genelde karar verici** (doğrudan temin limitinin altında). Üstü: Genel Sekreter / Rektör Yardımcısı — onaylayan ama teknik detaya girmeyen |
| **Satın alma tetikleyicisi** | 1) Bakanlık/İzleme Komisyonu'ndan gelen yazı, 2) TBB veya YÖK duyurusu, 3) bir engelli öğrenci/vatandaş şikâyeti (CİMER başvurusu), 4) yıl sonu bütçe kullanma baskısı (Kasım–Aralık) |
| **İtirazları** | "Bunu Lighthouse ile de yapamaz mıyız?" · "Alt birim siteleri bizde değil, fakültelerde" · "Yurt dışı firmadan alım evrakı zor" · "TL fatura kesebiliyor musunuz?" · "Bu bize ihale açtırır mı?" |
| **Nereden bilgi alıyor** | Bakanlık duyuruları, TBB/YÖK yazışmaları, kurum içi yazışma sistemi (EBYS), meslektaş WhatsApp/e-posta grupları, LinkedIn, Kamu BT sempozyumları (Akademik Bilişim, Kamu BİB) |
| **Hangi mesaja yanıt verir** | ✅ *"İnceleme Komisyonunuzun raporunu 20 dakikada üretin. Doğrudan temin sınırının çok altındayız, ihale gerekmez. Bakanlık A Seviyesi Kontrol Listesi'ne eşlenmiş Türkçe PDF."* ❌ *"AI destekli erişilebilirlik platformu"* — hiçbir şey ifade etmez |
| **Kanal** | E-posta (kurumsal, kişisel değil), LinkedIn InMail, TBB/YÖK üzerinden webinar, meslektaş referansı. **Cold call işe yaramaz; resmî görünen e-posta işe yarar** |
| **Tipik satın alma süresi** | **4–10 hafta** (doğrudan temin: piyasa araştırması + 3 teklif + onay + evrak). Bütçe yılı başında (Ocak–Mart) veya sonunda (Kasım–Aralık) hızlanır |
| **Kazanma formülü** | Ücretsiz tarama → kurumun kendi sitesinin Türkçe raporunu göster → İnceleme Komisyonu şablonunu ver → TL fiyat + doğrudan temin notu → 3 teklif için "karşılaştırma dosyası" hazırla |

### 8.2 Persona 2 — "Banka/Özel Hastane Uyum ve Dijital Kanal Yöneticisi" (TR)

**Örnek:** Elif, 36 — Dijital Kanallar Yöneticisi, orta ölçekli özel banka (veya Kurumsal İletişim/Uyum Müdürü, özel hastane zinciri)

| Boyut | Detay |
|---|---|
| **Rol** | İnternet şubesi, mobil uygulama, kurumsal site ve müşteri portalından sorumlu; Uyum (Compliance) ve Hukuk ile sürekli temas |
| **Hedefleri** | Regülatör (BDDK/Bakanlık) karşısında temiz durmak; müşteri şikâyetini önlemek; dijital kanal NPS'ini korumak; **KVKK riskini artırmadan** yeni araç sokmak |
| **Korkuları** | 🔴 **KVKK ihlali — en büyük korku.** Yurt dışına veri aktarımı bildirimsizliği 2026'da **90.308 – 1.806.377 TL** ceza riski ✅ doğrulanmış · İkinci korku: bir engelli müşterinin şikâyeti + basına yansıması · Üçüncü: BT güvenlik ekibinin veto etmesi |
| **Günlük iş akışı** | Toplantı yoğun; ürün/proje yönetimi; ajans ve yazılım tedarikçileriyle koordinasyon; iç denetim taleplerine cevap |
| **Bütçe kalemi ve tutarı** | Dijital kanal bütçesi veya uyum bütçesi. **200.000 – 2.000.000 TL/yıl** bandında araç harcaması yapabilir *(varsayım)*. Fiyat hassasiyeti düşük, **risk hassasiyeti çok yüksek** |
| **Karar verici mi, etkileyici mi** | **Etkileyici + bütçe sahibi.** Gerçek kapı bekçisi: **Bilgi Güvenliği** ve **Uyum** birimleri. Onların onayı olmadan hiçbir SaaS içeri girmez |
| **Satın alma tetikleyicisi** | 1) İç denetim bulgusu, 2) Genelge kapsamında olduğunun fark edilmesi, 3) müşteri şikâyeti/CİMER, 4) rakip bankanın Erişilebilirlik Logosu alması, 5) yeni mobil uygulama lansmanı |
| **İtirazları** | 🔴 *"Verimiz nereye gidiyor? OpenAI'a ne gönderiyorsunuz?"* · *"KVKK Standart Sözleşmeniz var mı?"* · *"ISO 27001'iniz var mı?"* · *"Login arkasını tararsanız müşteri verisi görürsünüz"* · *"Bilgi güvenliği onayından nasıl geçeceğiz?"* · *"Penetrasyon testi raporunuz var mı?"* |
| **Nereden bilgi alıyor** | Sektör dernekleri (TBB, OHSAD), regülatör duyuruları, danışmanlık firmaları (Big 4), LinkedIn, sektör konferansları |
| **Hangi mesaja yanıt verir** | ✅ *"LLM'e sayfa metnini göndermiyoruz, sadece yapıyı gönderiyoruz. LLM'i kurum genelinde kapatabilirsiniz. Veri işleme bölgesini siz seçiyorsunuz. KVKK Standart Sözleşmemiz, DPA'mız ve alt işleyici listemiz hazır."* ❌ Fiyat odaklı mesaj — ilgisini çekmez |
| **Kanal** | Referans (en güçlü), sektör derneği etkinliği, LinkedIn, danışmanlık firması aracılığıyla |
| **Tipik satın alma süresi** | **3–9 ay.** Bilgi güvenliği değerlendirmesi tek başına 4–12 hafta. **Percevia'nın en uzun ama en yüksek değerli döngüsü** |
| **Kazanma formülü** | Güvenlik/gizlilik paketini **satıştan önce** hazırla (DPA, alt işleyici listesi, veri akış şeması, LLM kapatma anahtarı, veri bölgesi seçimi, silme/dışa aktarma politikası). Bu paket olmadan bu personaya satış denemesi zaman kaybıdır |

### 8.3 Persona 3 — "Web Ajansı Sahibi / Teknik Direktörü" (TR / AB)

**Örnek:** Can, 34 — 12 kişilik dijital ajansın kurucu ortağı ve teknik direktörü; 40–120 müşteri sitesi yönetiyor

| Boyut | Detay |
|---|---|
| **Rol** | Müşteri sitelerinin teknik sorumluluğu; yeni iş geliştirme; ekip yönetimi |
| **Hedefleri** | **Yeni bir tekrarlayan gelir kalemi** yaratmak; mevcut müşteriye upsell; teklif dosyasında rakiplerden ayrışmak; müşteri kaybını önlemek |
| **Korkuları** | Müşterinin "sen neden söylemedin" demesi; bir müşterinin dava/denetim alması; overlay satıp itibar kaybetmek; 100 siteyi tek tek taramak zorunda kalmak (zaman = para) |
| **Günlük iş akışı** | Proje yönetimi, müşteri toplantıları, teklif hazırlama, ekip yönlendirme, acil müdahaleler. **Araç değerlendirmesi için ayda ~2 saati var** |
| **Bütçe kalemi ve tutarı** | Ajans işletme gideri veya **doğrudan müşteriye yansıtılan maliyet**. Kendi cebinden **€50–300/ay** *(varsayım)*; müşteriye yansıtırsa sınır yok |
| **Karar verici mi, etkileyici mi** | **Tam karar verici.** Kredi kartıyla aynı gün alabilir. Kategorinin en hızlı dönüşen persona'sı |
| **Satın alma tetikleyicisi** | 1) Bir müşterisinden erişilebilirlik sorusu gelmesi, 2) Genelge/EAA haberini görmesi, 3) rakip ajansın bunu satıyor olması, 4) yeni bir kamu/kurumsal teklif hazırlarken şartnamede görmesi |
| **İtirazları** | *"Müşteri başına ayrı hesap açmam gerekiyor mu?"* · *"Raporda benim logom olabilir mi?"* · *"Bunu müşteriye kaça satarım?"* · *"Müşteri paneli görebilir mi, yoksa ben mi göndereyim?"* · *"120 site için fiyat ne olur?"* |
| **Nereden bilgi alıyor** | Twitter/X, LinkedIn, ajans toplulukları, Reddit (r/webdev, r/agency), Hacker News, YouTube, WordPress/Drupal/Webflow toplulukları, Product Hunt |
| **Hangi mesaja yanıt verir** | ✅ *"Müşteri portföyünüzü tek panelden yönetin, kendi logonuzla rapor gönderin, aylık ücretinize ekleyin."* ✅ **Somut marj örneği:** *"Müşteriye ayda ₺X, size maliyeti ₺Y."* ❌ Regülasyon korkusu mesajı — o müşterisinin derdi, onun değil |
| **Kanal** | 🎯 **PLG.** Ücretsiz plan → self-servis → ajans paneli upsell. Ayrıca: ajans toplulukları, LinkedIn içerik, ortak webinar, partner programı |
| **Tipik satın alma süresi** | **1 gün – 3 hafta.** Ücretsiz planda dener, beğenirse aynı hafta öder |
| **Kazanma formülü** | Multi-tenant ajans paneli + white-label PDF + **partner marj tablosu** (accessiBe'nin %20/%30 modeline karşı net bir teklif). Bu persona **kanal çarpanı**: 1 ajans = 20–100 site |

### 8.4 Persona 4 — "Ürün Mühendisliği Lideri / Frontend Lead" (Global, PLG)

**Örnek:** Sofia, 31 — Frontend Lead, 40 kişilik SaaS şirketi, Berlin/Amsterdam/İstanbul

| Boyut | Detay |
|---|---|
| **Rol** | Frontend mimarisi ve tasarım sisteminden sorumlu; 5–10 geliştirici; CI/CD sahibi |
| **Hedefleri** | Teknik borcu yönetmek; kurumsal müşteri **vendor assessment** sorularını geçebilmek; ekibin hızını düşürmeden kalite eklemek; tasarım sistemine kural gömmek |
| **Korkuları** | Satış ekibinin "müşteri VPAT istiyor" diye gelmesi; 4.000 satırlık bir tarama raporunun ekibi felç etmesi; **gürültü**; bir aracın CI'ı yavaşlatması veya build'i yanlış yere fail etmesi |
| **Günlük iş akışı** | Kod inceleme, mimari kararlar, sprint planlama, incident. **Bir araca 30 dakikadan fazla ayıramaz; kurulum 10 dakikayı geçerse bırakır** |
| **Bütçe kalemi ve tutarı** | Mühendislik araç bütçesi. Onaysız harcayabildiği tutar tipik olarak **$50–500/ay** *(varsayım)*; üstü VP Eng onayı |
| **Karar verici mi, etkileyici mi** | **Küçük tutarlarda karar verici, büyük tutarlarda etkileyici.** Ama **veto gücü mutlak**: beğenmezse hiçbir yerden satın alınmaz |
| **Satın alma tetikleyicisi** | 1) 🔴 **Kurumsal müşterinin satın alma sürecinde a11y/VPAT sorusu** — açık ara #1, 2) EAA kapsamına girdiğini fark etme, 3) tasarım sistemi yenilemesi, 4) bir kullanıcı şikâyeti |
| **İtirazları** | *"axe zaten ücretsiz, ben CI'a kendim koyarım"* · *"Bu 800 ihlali kim düzeltecek?"* · *"False positive oranınız ne?"* · *"CI'da çalışıyor mu? PR'a yorum atıyor mu?"* · *"API var mı? Dokümantasyon nerede?"* |
| **Nereden bilgi alıyor** | Hacker News, Reddit (r/webdev, r/reactjs), GitHub, Twitter/X, dev.to, Storybook/Next.js/Vercel blogları, YouTube konferans konuşmaları, Product Hunt |
| **Hangi mesaja yanıt verir** | ✅ *"800 ihlali 23 bileşen düzeyi iş kalemine indiriyoruz."* ✅ *"axe-core üzerine kurulu — motoru değiştirmiyoruz, üstüne operasyon katmanı koyuyoruz."* ✅ **Açık, ölçülebilir false positive politikası.** ❌ "Uyumluluk" dili — güvenini kaybettirir |
| **Kanal** | 🎯 **Tamamen PLG.** Ücretsiz plan, kredi kartısız kayıt, 5 dakikada ilk sonuç. Teknik blog, açık kaynak katkı, HN/PH lansmanı, GitHub App |
| **Tipik satın alma süresi** | **Aynı gün – 6 hafta.** Kendi bütçesindeyse aynı gün; VP onayı gerekiyorsa 2–6 hafta |
| **Kazanma formülü** | Kurulum sürtünmesini sıfıra indir; ilk taramada **gruplanmış** sonuç göster (ham liste değil); false positive politikasını yayımla; GitHub App + MCP sunucusu. **Bu persona kazanılmadan hiçbir "geliştirici aracı" iddiası inandırıcı değildir** |

### 8.5 Persona 5 — "AB E-ticaret Dijital Yöneticisi (EAA Baskısı)"

**Örnek:** Lukas, 39 — Head of Digital / E-commerce Director, €40–300M ciro, Almanya/Hollanda/Fransa

| Boyut | Detay |
|---|---|
| **Rol** | E-ticaret sitesi ve mobil uygulamanın P&L sahibi; dönüşüm oranı ve ciro hedefi var |
| **Hedefleri** | Dönüşümü artırmak; EAA riskini kapatmak; **ihtarname/dava almamak**; hukuk departmanına "kapsıyoruz" diyebilmek |
| **Korkuları** | 🔴 **Carrefour kararı sonrası:** mahkeme emri + günlük para cezası + basına yansıma. 🔴 **Almanya'da:** hukuk bürolarından gelen özel ihtarnameler (Abmahnung). 🔴 Checkout akışının erişilemez olduğunun kanıtlanması — Fransız derneklerinin tam olarak test ettiği şey buydu |
| **Günlük iş akışı** | Dönüşüm optimizasyonu, kampanya, tedarikçi yönetimi, platform (Shopify/Magento/custom) ekibiyle koordinasyon |
| **Bütçe kalemi ve tutarı** | E-ticaret/dijital bütçe. **€5.000 – €50.000/yıl** araç harcaması yapabilir *(varsayım)*. Hukuki risk algısı yüksekse üst sınır hızla yükselir |
| **Karar verici mi, etkileyici mi** | **Karar verici**, ancak Legal ve Procurement onayı gerekir. €25k üstünde CFO devreye girer |
| **Satın alma tetikleyicisi** | 1) 🔴 **İhtarname/dernek mektubu** — açık ara #1, 2) Carrefour kararının sektör basınında yer alması, 3) EN 301 549 v4.1.1'in Ekim 2026'da OJEU'ya girmesi → **tüm mevcut denetimlerin yeniden yapılması gerekmesi**, 4) rakibin dava alması, 5) yeni platform geçişi |
| **İtirazları** | *"Zaten yılda bir denetim yaptırıyoruz"* · *"Ajansımız hallediyor"* · *"Bu bize uyumluluk garantisi veriyor mu?"* (→ **hayır demek zorundayız**) · *"Mobil uygulamayı kapsıyor musunuz?"* (→ **hayır**) · *"Checkout akışını test edebiliyor musunuz?"* (→ login arkası evet, çok adımlı flow **hayır**) |
| **Nereden bilgi alıyor** | LinkedIn, sektör bültenleri, hukuk firması müvekkil bültenleri (Osborne Clarke, Taylor Wessing, GT), e-ticaret konferansları (dmexco, Shoptalk Europe), rakip haberleri |
| **Hangi mesaja yanıt verir** | ✅ *"4 Haziran 2026: Caen mahkemesi Carrefour'a 6 ay süre ve günlük 500 € ceza verdi. Mahkeme '%71 uyumluyuz' savunmasını reddetti — ve 'sitemiz her gün değişiyor' savunmasını da. O yüzden yıllık denetim yetmiyor; sürekli izleme gerekiyor."* — **kategorideki en güçlü tek satış cümlesi** ❌ "Uyumlu yaparız" — hem yalan hem risk |
| **Kanal** | LinkedIn (hedefli), hukuk firması ortaklıkları, sektör bülteni sponsorluğu, e-ticaret platformu ekosistemi (Shopify App Store, Shopware, Adobe Commerce) |
| **Tipik satın alma süresi** | **2–12 hafta** normalde; **ihtarname geldiyse 3–10 gün** |
| **Kazanma formülü** | Ücretsiz "EAA hazırlık taraması" + Carrefour kararı içeriği + net kapsam beyanı (neyi kapsadığımız/kapsamadığımız) + AB veri konumu. **Kapsamı dürüstçe daraltmak burada satış kaybettirmez, güven kazandırır** |

### 8.6 Persona 6 (bonus) — "Erişilebilirlik/Kapsayıcılık Sorumlusu" (Global, kurumsal)

**Örnek:** Anna, 44 — Digital Accessibility Lead, 3.000+ çalışanlı kurum. IAAP sertifikalı (CPACC/WAS).

| Boyut | Detay |
|---|---|
| **Rol** | Kurumun erişilebilirlik programının sahibi; genelde 1–3 kişilik ekip; tüm dijital ürün ekipleriyle yatay çalışıyor |
| **Hedefleri** | Programı ölçeklemek; ekiplere kendi kendine yeterlilik kazandırmak; yönetime ilerleme raporlamak; **denetim maliyetini düşürmek** |
| **Korkuları** | Bütçesinin kesilmesi; "araç aldık, iş bitti" yanılgısı; overlay satın alınması; kendi otoritesinin bir SaaS tarafından ikame edilmesi |
| **Bütçe** | Ayrılmış erişilebilirlik bütçesi (kategorinin %77'sinde var ✅). **$20.000 – $200.000/yıl** *(varsayım)* |
| **Karar verici mi** | **Gerçek karar verici ve teknik referans.** Kısa listeyi o yapar |
| **İtirazları** | 🔴 *"Otomatik tarama kapsamınız ne? WCAG başarı kriterlerinin yüzde kaçı?"* — **bu personayı sadece dürüst cevap ikna eder** · *"Kim bu ürünü inşa etti, a11y geçmişi var mı?"* · *"Overlay satıyor musunuz?"* · *"VPAT'ınız var mı?"* (ürünün kendi VPAT'ı) |
| **Hangi mesaja yanıt verir** | ✅ *"Otomatik tarama, gerçek denetimlerde bulunan sorunların hacim olarak ~%50–57'sini yakalar; WCAG başarı kriterleri bazında bu çok daha düşüktür. Hiçbir otomatik araç uyumluluğu kanıtlayamaz. Biz manuel denetimin yerini almıyoruz — onun arasındaki sürekliliği sağlıyoruz."* ✅ Overlay karşıtı net duruş ❌ Herhangi bir "AI uyumlu yapar" iması → anında kaybedersiniz |
| **Kanal** | a11y toplulukları (WebAIM listserv, a11y Slack, IAAP), axe-con/CSUN konferansları, LinkedIn a11y çevresi, WebAIM/Deque içerikleri |
| **Satın alma süresi** | **6 hafta – 6 ay** (kurumsal süreç), ama **destekçi olursa satışı o taşır** |
| **Neden önemli** | Bu persona **kapı bekçisi ve savunucu** olabilir. Percevia'nın dürüstlük konumlandırması tam olarak bu kişiyi hedefler. Percevia'nın **kendi ürününün erişilebilirliği** ve **kendi VPAT'ı** bu personaya karşı zorunludur |

### 8.7 Persona × Ürün × Kanal Özet Matrisi

| Persona | Öncelik | Plan uyumu | Satın alma süresi | Kanal | Kilit engel | Kilit mesaj |
|---|---|---|---|---|---|---|
| **1. TR Kamu BT** | 🔴 1 | Agency/Team (TL) | 4–10 hafta | E-posta, TBB/YÖK, webinar | TL fatura, evrak | "İnceleme Komisyonu raporunuzu 20 dk'da üretin, doğrudan temin sınırının altındayız" |
| **2. TR Banka/Hastane** | 🟠 3 | Team/Enterprise | 3–9 ay | Referans, dernek | 🔴 KVKK + bilgi güvenliği | "LLM'e metin göndermiyoruz, kapatabilirsiniz, bölgeyi siz seçiyorsunuz" |
| **3. Ajans (TR/AB)** | 🔴 2 | Agency + partner | 1 gün – 3 hafta | 🎯 PLG + topluluk | White-label eksikliği | "Portföyünüzü tek panelden yönetin, kendi logonuzla raporlayın" |
| **4. Frontend Lead** | 🟡 4 | Free → Starter/Agency | Aynı gün – 6 hafta | 🎯 PLG, HN/PH, GitHub | 🔴 CI/CD ve MCP eksikliği | "800 ihlali 23 bileşen iş kalemine indiriyoruz" |
| **5. AB E-ticaret** | 🟠 3 | Team/Enterprise | 2–12 hafta (ihtarname: 3–10 gün) | LinkedIn, hukuk firması | Mobil + flow eksikliği | "Carrefour: %71 savunma değil; 'site her gün değişiyor' da değil" |
| **6. A11y Lead** | 🟡 5 | Team/Enterprise | 6 hafta – 6 ay | a11y toplulukları | Ürünün kendi VPAT'ı yok | "Manuel denetimin yerini almıyoruz, arasını dolduruyoruz" |

**Odak kararı:** İlk 90 günde **Persona 1 (TR kamu) + Persona 3 (ajans)** üzerine %80 kaynak. Bunlar en kısa döngülü, en az ürün bağımlılığı olan ve Percevia'nın mevcut özellik setiyle **bugün** kazanılabilecek iki persona. Persona 2 ve 5 ürün/hukuk bağımlılığı taşıyor; Persona 4 ve 6 ürün olgunluğu bekliyor.

---

# BÖLÜM III — ÜRÜN VE FİYAT STRATEJİSİ

## 9. Overlay Tartışması

### 9.1 Ne oldu

Overlay'ler (accessiBe accessWidget, UserWay Widget, AudioEye, EqualWeb, **WeAccess Widget**), siteye tek satır JS ekleyerek DOM'u çalışma anında manipüle eden ve son kullanıcıya bir kişiselleştirme paneli sunan ürünler. 2020–2024 arasında SMB pazarını domine ettiler; 2025–2026'da hem regülatör hem mahkeme hem de engelli topluluğu tarafından sistematik olarak yıkıldılar.

**Kilometre taşları:**

- **3 Ocak 2025** — FTC, accessiBe'ye karşı şikâyet: "48 saatte herhangi bir siteyi WCAG uyumlu yapar" iddiası aldatıcı; eklenti navigasyon menüleri, form alanları ve görsel açıklamalarını erişilebilir yapamıyor. Ayrıca üçüncü taraf içeriği bağımsız yorum gibi sunma ve maddi ilişkiyi gizleme. https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-order-requires-online-marketer-pay-1-million-deceptive-claims-its-ai-product-could-make-websites
- **Nisan 2025** — FTC nihai kararı onayladı: **$1.000.000** + yanıltıcı iddia yasağı. https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million
- **Şubat 2025** — BloomsyBox / UserWay davası: overlay satın alan işletme yine dava edildi; dava overlay sağlayıcısının ürünü yanlış tanıttığını da iddia ediyor. https://www.lflegal.com/2025/02/userway-overlay-lawsuit/
- **Overlay Fact Sheet** — **600+ imzacı**: WCAG, ARIA ve HTML spesifikasyonlarının katkıcı ve editörleri; Google, Microsoft, Apple, BBC, Shopify, Squarespace, ServiceNow, Dell, Lyft, Costco, Expedia, eBay, Cigna, Target, CVS Health iç erişilebilirlik uzmanları. Talep: overlay'lerin **kaldırılması**. https://overlayfactsheet.com/en/
- **4 Haziran 2026** 🆕 — Carrefour kararı, overlay tartışmasını dolaylı ama kesin biçimde sonlandırdı: mahkeme **sonuç** istedi, araç değil. Bir overlay kurmuş olmak, sitenin erişilebilir olduğu anlamına gelmiyor. https://silktide.com/blog/second-eaa-ruling-4-june-2026/

### 9.2 Kullanıcı ve topluluk kanıtı

> WebAIM Erişilebilirlik Uygulayıcıları Anketi: **%67**'si (engelli katılımcılarda **%72**) overlay/plugin/widget'ları "hiç etkili değil" veya "çok etkili değil" olarak değerlendirdi. Engelli katılımcıların yalnızca **%2,4**'ü "çok etkili" dedi.
> https://webaim.org/projects/practitionersurvey3/

> Overlay araştırması: katılımcıların **%42**'si overlay bulunan siteleri kullanmayı bıraktı; en yaygın neden sitenin **overlay'den önce daha erişilebilir olması**. En belirgin problemler: sayfa düzeni ve navigasyon; ekran okuyucuyla sayfa içi bilgi arayamama.
> https://create.uw.edu/accessibility-overlays-can-make-websites-less-accessible · https://overlays.dnikub.dev/

Teknik özü şu: kör bir kullanıcı kendi ekran okuyucusunu yıllar içinde kendi tercihine göre yapılandırmıştır. Overlay açıldığında bu kullanıcı kendi aracını bırakıp **tanımadığı ve daha az yetenekli bir ikameyi** kullanmaya zorlanıyor.

### 9.3 Dava verisi — overlay hukuki koruma sağlamıyor

- **2024:** overlay kullanan şirketlere **1.023** dava açıldı.
- **2023–2024:** overlay widget kullanan **800+** işletme dava edildi — dönemin tüm dijital erişilebilirlik davalarının **%25'inden fazlası**.
- **2025 aylık widget davası:** Oca 95, Şub 126, Mar 133, Nis 111, May 132, Haz 106, **Tem 155**, Ağu 114, Eyl 107, Eki 128, Kas 95, Ara 114.
- **2026 aylık widget davası:** **Oca 165, Şub 172**, Mar 141, Nis 129, May 126, Haz 98.

UsableNet'in sonucu net:

> "Widgets may handle surface-level adjustments like tweaking contrast, resizing fonts, or patching the occasional alt tag. But they cannot address what actually matters in a lawsuit: whether a real user with a screen reader can navigate and use the site… **A widget on the page is not a defense. It never was.**"
> — Jason Taylor, UsableNet, 8 Temmuz 2026 · https://blog.usablenet.com/inside-the-2026-midyear-numbers-where-digital-accessibility-litigation-is-going

> "Businesses with overlays were sued at rates **equal to or exceeding** businesses with no accessibility solution at all."
> — TestParty analizi · https://testparty.ai/blog/why-800-businesses-with-accessibe-were-still-sued

### 9.4 🇹🇷 Türkiye'de overlay durumu — ABD'den farklı

**Bu, V2'nin en pratik uyarılarından biri.** Türkiye'de overlay karşıtı topluluk baskısı ABD/AB'deki gibi kurumsallaşmamış. Aksine:

- **WeAccess.AI**, Türkiye'nin en görünür yerli erişilebilirlik oyuncusu ve ürün portföyünün merkezinde bir **Widget (overlay)** var.
- **Aile ve Sosyal Hizmetler Bakanlığı'nın kendi web sitesi (aile.gov.tr) bir erişilebilirlik menüsü/overlay çalıştırıyor** — sayfa altında "Erişilebilirlik Menüsü: Ekran Okuyucu, Seçili Alan Okuyucu, Bağlantı Vurgula, Büyük Metin, İmleç, Okuma Kılavuzu, Okuma Maskesi, Disleksi Dostu, Kontrast, Solgunlaştırma, Düşük/Yüksek Doygunluk" seçenekleri sunuluyor.
  Kaynak (gözlem): https://www.aile.gov.tr/sss/engelli-ve-yasli-hizmetleri-genel-mudurlugu/erisilebilirlik/

**Bunun stratejik sonucu:**
1. ❌ **"Overlay kötüdür" argümanını Türkiye'de bir açılış cümlesi olarak kullanmayın.** Alıcı, düzenleyici bakanlığın kendi sitesinde gördüğü bir şeyi "kötü" diye duyduğunda savunmaya geçer.
2. ✅ **Bunun yerine kapsam farkını anlatın:** *"Erişilebilirlik menüsü kullanıcıya tercih sunar — bu iyi bir şey olabilir. Ama Genelge'nin istediği şey sayfanın **kendisinin** WCAG 2.2 ve A Seviyesi Kontrol Listesi'ne uygun olması. Menü, alt metni olmayan bir görseli alt metinli yapmaz; etiketsiz bir form alanını etiketlemez. İnceleme Komisyonunuz raporunda tam olarak bunları listelemek zorunda."*
3. ✅ **Eğitim içeriği fırsatı:** "Erişilebilirlik menüsü siteyi erişilebilir yapar mı?" başlıklı Türkçe içerik, hem SEO hem konumlandırma açısından **Türkiye'de yazılmamış** bir yazıdır.
4. ⚠️ **Uzun vadeli fırsat:** TDEA 2026 sonuçları (1 Ekim 2026) muhtemelen Türkiye'de de overlay'lerin engelli kullanıcılar için yetersizliğini ortaya koyacak. **O rapora hazırlıklı olun.**

### 9.5 Percevia'nın "overlay önermiyoruz" konumlandırması ne kadar değerli?

**Çok değerli, ama tek başına yeterli değil.**

**Neden değerli:**
1. **Hukuki dayanıklılık.** FTC kararı bir emsal oluşturdu: "AI'ımız sitenizi uyumlu yapar" demek artık bir düzenleyici risk. Percevia'nın "uyumluluk veya sertifikasyon vaat etmiyoruz" konumu, kategorinin en büyük hukuki riskini yapısal olarak sıfırlıyor.
2. **Topluluk meşruiyeti.** Erişilebilirlik topluluğu (600+ imzacı, WebAIM, Lainey Feingold, Karl Groves) overlay satıcılarına aktif düşman. Bu topluluk aynı zamanda kurumsal alımların teknik referans grubu. Overlay olmamak, bu kapıyı açan asgari koşul.
3. **Zamanlama.** 127.000 AudioEye müşterisi, 1M+ UserWay sitesi ve accessiBe'nin SMB tabanı — "overlay mültecisi" havuzu devasa ve şu anda yerine koyacak uygun fiyatlı bir şey yok.
4. 🆕 **Türkiye'de somut bir rakibe karşı silah.** WeAccess.AI'ın merkezinde bir widget var. Percevia'nın ayrımı artık soyut değil.

**Neden yeterli değil:**
1. Overlay'in sattığı şey tarama değil, **hukuki rahatlama** (dedicated case manager, ADA avukatı saatleri, AudioEye Assurance mali garantisi). Percevia bunu sunmuyor ve sunmamalı — ama bu talebe bir **ikame** üretmeli (bkz. Bölüm 15, Boşluk 7).
2. "Overlay değiliz" negatif bir konumlandırma. Alıcı hâlâ "peki sen ne yapıyorsun ve %57 tavanın ötesinde ne oluyor?" diye soruyor. Bunun dürüst cevabı ürünün içinde görünmeli.
3. 🆕 **Türkiye'de bu argüman eğitim gerektiriyor** (bkz. 9.4).

---

## 10. Otomatik Taramanın Tavanı — Rakamlar ve Birincil Kaynaklar

### 10.1 %57 rakamının birincil kaynağı ve gerçek anlamı

**Kaynak:** Deque Systems, *"Automated Testing Study Identifies 57% of Digital Accessibility Issues"* — https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/ ve tam rapor: https://www.deque.com/automated-accessibility-coverage-report/

**Metodoloji:** 2.000'den fazla anonimleştirilmiş denetim, 13.000'den fazla sayfa, yaklaşık **300.000 issue**. Deque, bu gerçek denetimlerde belgelenmiş erişilebilirlik kusurlarının kaçının axe-core ile tespit edilebileceğini ölçtü. Sonuç: **%57,38**.

**Kritik nüans — pazarda sürekli yanlış aktarılıyor:** Deque, "erişilebilirlik kapsamı" tanımını bilinçli olarak **WCAG başarı kriterlerinin yüzdesinden** → **şiddet ve etkiye göre tespit edilen issue hacmine** çevirdi. Yani:

- ✅ **Doğru:** "Otomatik test, gerçek denetimlerde bulunan erişilebilirlik sorunlarının **hacminin ~%57'sini** yakalıyor."
- ❌ **Yanlış:** "Otomatik test **WCAG başarı kriterlerinin %57'sini** kapsıyor." (Bu çok daha düşük — WCAG SC bazında otomatik kapsanabilir oran literatürde tipik olarak **%20–30** aralığında konuşulur.)

Neden %57 hacim bazında bu kadar yüksek çıkıyor? Çünkü gerçek sitelerdeki hataların ezici çoğunluğu az sayıda **tekrarlayan, makine ile tespit edilebilir** kategoriden geliyor — düşük kontrast, eksik alt metin, etiketsiz form alanı, boş link/buton. WebAIM Million verisi bunu doğruluyor: **tüm tespit edilen hataların %96'sı sadece 6 kategoriden** geliyor.

### 10.2 Tavanın neden sabit kalacağı

Deque, WCAG 2.2 için **`target-size` dışında yeni bir axe-core kuralı eklemeyi planlamadığını**, geri kalanını otomatikleştirmenin kabul edilemez düzeyde false positive üreteceğini açıkça belirtti. axe-core'un temel tasarım ilkesi "sıfır false positive" politikası — bu, kapsamı bilinçli olarak kısıtlıyor.
Kaynak: https://github.com/dequelabs/axe-core/issues/4415 · https://www.deque.com/axe/axe-core/

### 10.3 WebAIM'in kendi uyarısı — en dürüst formülasyon

> "All automated tools, including WAVE, have limitations—not all conformance failures can be automatically detected. **Absence of detected errors does not indicate that a page is accessible or conformant.**"
> — WebAIM Million 2026, Metodoloji bölümü · https://webaim.org/projects/million/

Bu cümle, Percevia'nın ürün içinde ve raporlarında **kelimesi kelimesine** karşılığı olması gereken duruştur.

### 10.4 AudioEye'ın kendi rakamı

> "Automated tools addressing **~50% accessibility issues** … *Does not include expert testing for remaining issues*"
> — AudioEye resmî Plans & Pricing sayfası · https://www.audioeye.com/plans-and-pricing/

### 10.5 DOJ'un kendi gerekçesi 🆕

ADA Title II ertelemesinin resmî gerekçesinde, düzenleyici doğrudan şunu söylüyor: kurumların uyum sağlayamamasının nedenlerinden biri, **üretken yapay zeka dahil mevcut teknolojinin ölçekte otomatik remediation yapamaması**. Bu, bir ABD federal düzenleyicisinin otomasyon tavanını resmî bir belgede kabul etmesidir ve satış konuşmasında en yüksek otoriteli kaynaktır.
Kaynak: https://www.adatitleiii.com/2026/04/doj-extends-ada-title-ii-website-accessibility-deadlines-for-governmental-entities-but-litigation-and-compliance-risks-remain/

### 10.6 Söylenmesi gereken doğru aralık

**Otomatik tarama, gerçek dünyada bulunan erişilebilirlik sorunlarının hacim olarak yaklaşık %50–57'sini yakalar; WCAG başarı kriterleri bazında kapsama bunun çok altındadır. Hiçbir otomatik araç WCAG uyumluluğunu kanıtlayamaz veya sertifikalandıramaz.**

**Bu cümlenin üç yerde görünmesi gerekir:** (1) fiyat sayfasında, (2) her PDF raporun ilk sayfasında, (3) her satış demosunun ilk 5 dakikasında. Rakip söylemeden siz söylediğinizde bu bir zafiyet değil, güvenilirlik kanıtıdır.

---

## 11. WebAIM Million 2026 — Birinci Sınıf Veri

**Kaynak:** https://webaim.org/projects/million/ · Veri Şubat 2026, yayın 30 Mart 2026. Motor: WAVE stand-alone API, rendered DOM (script ve stiller uygulandıktan sonra). Örneklem: Tranco listesinden 1.000.000 ana sayfa. 8. yıl.

### Manşet rakamlar

| Metrik | 2026 | 2025 | Değişim |
|---|---|---|---|
| Tespit edilebilir WCAG 2 hatası olan ana sayfa | **%95,9** | %94,8 | **+1,1 puan (6 yıllık iyileşme trendi tersine döndü)** |
| Toplam tespit edilen hata | **56.114.377** | — | — |
| Sayfa başına ortalama hata | **56,1** | 51 | **+%10,1** |
| Sayfa başına ortalama element | **1.437** | 1.257 | **+%22,5** |
| Hatalı element oranı | **%3,9** (her 26 elementten 1'i) | — | — |
| Sayfa başına ARIA attribute | **133+** | 106 | **+%27** (2019'a göre 6 kat) |
| Sayfa başına görsel | **66,6** | — | **+%13,6** |
| Alt metni eksik görsel oranı | **%16,2** (sayfa başına 10,8 görsel) | %18,5 | -2,3 puan |
| Etiketsiz form input oranı | **%33,1** | — | Son 3 yılda form input sayısı +%36 |

**Tam WCAG 2 A/AA uyum oranı kesinlikle %4,1'in altında** (çünkü sadece otomatik tespit edilebilir ihlaller sayıldı).

### En yaygın hata tipleri (tüm hataların %96'sı bu 6 kategoride)

| Hata tipi | Sayfa yüzdesi 2026 | 2025 | Yön |
|---|---|---|---|
| Düşük kontrastlı metin | **%83,9** | %79,1 | ▲ kötüleşti (sayfa başına 34 ayrı örnek, +%15) |
| Eksik görsel alternatif metni | **%53,1** | %55,5 | ▼ iyileşti |
| Eksik form input etiketi | **%51** | %48,2 | ▲ kötüleşti |
| Boş link | **%46,3** | %45,4 | ▲ kötüleşti |
| Boş buton | **%30,6** | %29,6 | ▲ kötüleşti |
| Eksik doküman dili | **%13,5** | %15,8 | ▼ iyileşti |

### ARIA paradoksu

ARIA kullanan sayfalarda ortalama **59,1** hata, kullanmayanlarda **42** — yani ARIA varlığı sayfa başına ~17 ek bariyerle ilişkili. ARIA menü (`role="menu"`) kullanan sayfaların **%22'si** gerekli ARIA işaretlemesi ve etkileşimleri eksik olduğu için bariyer üretiyor. `aria-hidden="true"` sayfa başına 23,3 (2020'ye göre +%250), `tabindex` 30,4 (2020'ye göre ~+%300).

### Percevia için doğrudan ilgili kesitler

**Dile göre ortalama hata (küresel ortalama 56,1):**

| Dil | Sayfa sayısı | Ort. hata | Fark |
|---|---|---|---|
| İngilizce | 521.826 | 46,0 | **−%18,0** |
| Almanca | 36.134 | 46,9 | −%16,4 |
| Fransızca | 25.036 | 58,5 | +%4,2 |
| İspanyolca | 35.228 | 64,3 | +%14,7 |
| İtalyanca | 12.615 | 64,4 | +%14,8 |
| **Türkçe** | **11.248** | **66,2** | **+%17,9** |
| Lehçe | 10.059 | 68,7 | +%22,5 |
| Rusça | 44.288 | 78,1 | +%39,2 |
| Çince | 17.909 | 136,2 | +%142,8 |

**→ Türkçe siteler, İngilizce sitelere göre ortalama %44 daha fazla hata barındırıyor. Bu, Türkiye pazarı için satış argümanının veri temeli.**

**Teknolojiye göre (Percevia'nın stack'i ile ilgili):**

| Teknoloji | Sayfa | Ort. hata | Fark |
|---|---|---|---|
| Astro | 5.472 | **9,0** | **−%84,0** |
| Next.js | 23.863 | **40,9** | **−%27,1** |
| React | 45.673 | 43,5 | −%22,5 |
| Vue.js | 55.049 | 64,6 | +%15,1 |
| **Firebase** | **8.426** | **82,9** | **+%47,7** |
| Shopify | 42.516 | 75,1 | +%33,9 |
| WordPress | 252.302 | 52,8 | −%5,8 |
| jQuery | 560.294 | 64,9 | +%15,7 |

> **Not (dahili):** Percevia Next.js üzerinde (−%27,1) ama Firebase kullanıyor (+%47,7). Bu bir nedensellik değil korelasyon — ancak Percevia'nın kendi sitesinin erişilebilirliği **satış öncesi kanıt** olarak kusursuz olmalı. Bir a11y ürününün kendi sitesinin hatalı olması ölümcül.

### WebAIM'in kendi yorumu

> "These trends likely reflect broader shifts in web development including increased reliance on 3rd party frameworks and libraries and **automated or AI-assisted coding practices ('vibe coding')**. Home pages are getting larger and more technologically complex at an alarming rate, making accessibility more difficult to achieve and maintain."
> — WebAIM Million 2026, Sonuç · https://webaim.org/projects/million/

**Bu, Percevia için pazarlama açısından en güçlü tek cümle: AI kod üretimi erişilebilirlik borcunu hızlandırıyor, ve bu borcu ölçmek için sürekli otomatik taramaya ihtiyaç var.** (accessiBe de aynı açıyı yakaladı: "Gen-AI content: The #1 cited in eComm ADA lawsuits" webinarı ve `/gen-ai` sayfası.)

---

## 12. Pazar Büyüklüğü

**Uyarı:** Bu rakamlar ticari pazar araştırma firmalarından geliyor, metodolojileri şeffaf değil ve birbirinden 2 kata kadar farklılaşıyor. **Tek bir rakama güvenilmemeli; aralık kullanılmalı.**

### 12.1 Dijital erişilebilirlik YAZILIM pazarı (dar tanım)

| Kaynak | 2026 pazar büyüklüğü | CAGR | Ufuk |
|---|---|---|---|
| Market Research Future | **$0,91 milyar** | %6,82 | 2026–2035 (2035'te $1,58 milyar) |
| Fortune Business Insights | **$0,93 milyar** | %9,33 | 2026–2034 |
| Precedence Research | **$968,49 milyon** | %10,25 | 2026–2035 (2035'te $2.330,57M) |
| SNS Insider | — | %8,35 | 2026–2035 |

**Konsensüs aralığı: 2026 için ~$0,9–1,0 milyar; CAGR %7–10.**

Kaynaklar: https://www.marketresearchfuture.com/reports/digital-accessibility-software-market-29249 · https://www.fortunebusinessinsights.com/digital-accessibility-software-market-111207 · https://www.precedenceresearch.com/digital-accessibility-software-market · https://www.snsinsider.com/reports/digital-accessibility-software-market-6371

### 12.2 Dijital erişilebilirlik pazarı (geniş tanım — hizmetler dahil)

- **2025: $1.417,47 milyon → 2034: $3.239,42 milyon, CAGR %8,6** (Precedence Research)
- Çözümler (yazılım/platform) segmenti 2025 gelirlerinin **%58,64**'ü
- Büyük işletmeler (1.000+ çalışan) pazarın **%62**'si (2025)

Kaynaklar: https://straitsresearch.com/report/digital-accessibility-market · https://testparty.ai/blog/digital-accessibility-software-market

### 12.3 Gerçeklik kontrolü — bottom-up doğrulama

AudioEye ARR'ı **$41,2M** (Mart 2026) ve pazardaki en görünür saf-oyunculardan biri. UserWay $98,7M'a satıldı. Eğer toplam yazılım pazarı ~$0,9–1,0 milyar ise, AudioEye tek başına pazarın **~%4'ü** demektir — bu makul görünüyor ve tahminlerin çılgınca şişirilmediğini gösteriyor. Ancak pazarın **son derece parçalı** olduğu ve "milyar dolarlık pazar" hikayesinin çoğunlukla hizmet gelirlerini içerdiği unutulmamalı.

**Percevia için doğru çerçeve:** Bu **büyük ve hızlı büyüyen bir pazar değil**. Bu, regülasyonla zorlanan, orta hızda büyüyen, aşırı parçalı ve konumlandırma savaşının kazandığı bir pazar. Değer, TAM büyüklüğünden değil, **terk edilmiş bir segmenti** (SMB/geliştirici, overlay olmayan, uygun fiyatlı, yerel dilli) tekelleştirmekten gelir.

### 12.4 🆕 Percevia için gerçekçi TAM/SAM/SOM (VARSAYIM)

| Katman | Tanım | Büyüklük | Not |
|---|---|---|---|
| **TAM** | Küresel dijital erişilebilirlik yazılım pazarı | **$0,9–1,0 milyar** ✅ | Kaynaklı |
| **SAM** | $20–300/ay bandındaki overlay olmayan tarama/operasyon araçları + TR/AB yerel dil segmenti | **$60–120 milyon** *(varsayım)* | TAM'ın %7–12'si; overlay ($490–3.990/yıl) ve enterprise ($12k+) katmanları hariç |
| **SOM (3 yıl)** | Türkiye kamu/üniversite/belediye + TR-AB ajans kanalı + AB SMB e-ticaret | **$1,5–3 milyon** *(varsayım)* | Türkiye tek başına ~€260k ARR (Bölüm 5.7); ajans kanalı ve AB ile 3–5 katı |

> Bu tablo tamamen varsayımsaldır ve yatırımcı sunumunda **varsayım olarak etiketlenmelidir**.

---

## 13. Satın Alma Davranışı

### 13.1 Kim satın alıyor

Pazar üç ayrı alıcı personası etrafında bölünmüş:

| Persona | Ne satın alıyor | Kimler | Tipik ürün |
|---|---|---|---|
| **Hukuk / uyumluluk** | Risk transferi ve **kanıtlanabilir çaba** | General counsel, compliance manager, risk yöneticisi | accessiBe/AudioEye/UserWay (dava desteği paketleri), Level Access yönetilen hizmet, VPAT |
| **Pazarlama / web governance** | Site kalitesi + a11y'nin SEO/QA ile paketlenmesi | Digital marketing director, web team lead | Siteimprove, Silktide, Acquia Web Governance |
| **Mühendislik** | CI/CD'ye giren, gürültüsüz, kod düzeyi araç | Frontend lead, platform/QA engineering | axe DevTools, Evinced, Pa11y, Storybook a11y |

Gartner'ın 2025 Market Guide'ı bu bölünmeyi doğrulayan bir uyarı içeriyor:

> "Generative AI, visual AI and machine learning **significantly increase the performance of accessibility scanning tools**, reducing the need for humans to identify accessibility issues via manual testing. However, **AI enhances automation and detection, but it cannot fully replace the nuanced judgment that human experts bring.**"
> — 2025 Gartner Market Guide for Digital Accessibility · https://www.levelaccess.com/resources/2025-gartner-market-guide-for-digital-accessibility/

🆕 **Dördüncü persona ekleniyor: kamu uyum sorumlusu (TR).** Türkiye'nin 2025/10 Genelgesi, üç Batılı personaya ait olmayan yeni bir alıcı yarattı: **İnceleme Komisyonu üyesi kamu BT personeli**. Bu kişi ne hukukçu, ne pazarlamacı, ne de mühendis — **bir rapor üretmek zorunda olan bir memur**. Kategorinin hiçbir ürünü bu kişi için tasarlanmadı.

### 13.2 Satın alma tetikleyicileri (etki sırasına göre)

1. **Demand letter, ihtarname veya dava dilekçesi.** Açık ara birinci. 2026'da beklenen ~6.176 dava, her biri potansiyel bir satın alma olayı. UsableNet: 2025'te 1.427 dava **daha önce dava almış şirketlere** açıldı; federal davaların **%46'sı tekrar davalı**. Yani bir dava, satın alma penceresini kapatmıyor — açık tutuyor. 🆕 Avrupa'da yeni kanal: **dernek davaları** (ApiDV, Droit Pluriel) ve **Almanya'da avukat ihtarnameleri**.
2. **Regülasyon tarihi.** EAA (28 Haziran 2025), Türkiye 2025/10 (Haziran 2026 / Haziran 2027), ADA Title II (Nisan 2027/2028), Section 504 (Mayıs 2027/2028), **EN 301 549 v4.1.1 (Ekim 2026)**, AODA raporlama (31 Aralık 2026).
3. 🆕 **Mahkeme kararı haberi.** Carrefour kararı (4 Haziran 2026), AB e-ticaret segmentinde 2026 H2'nin en güçlü tetikleyicisi olacak. E.Leclerc duruşması (22 Eylül 2026) ikinci dalga.
4. **İhale/tedarik şartı.** B2B ve B2G satışında VPAT talebi. UserWay VPAT'ı add-on olarak satıyor; accessiBe ayrı hizmet olarak. **Bu, ürünü olmayan bir şirkete kapıyı kapatan tek şart.**
5. **Kurumsal müşterinin vendor assessment'ı.** SaaS satan bir şirket, kurumsal müşterisinin satın alma sürecinde a11y sorusuyla karşılaşınca aniden alıcı oluyor.
6. **Yeniden tasarım / replatform.** En sağlıklı ama en nadir tetikleyici.
7. 🆕 **Denetim/izleme yazışması (TR).** Türkiye'de İzleme Komisyonu'ndan gelen bir yazı, kamu kurumunda bütçe onayını anında açar. **Türkiye'nin "demand letter"ı budur.**

### 13.3 Kimler dava alıyor — hedefleme verisi

| Boyut | 2025 | 2026 H1 |
|---|---|---|
| E-ticaret payı | ~%70 | **%79** |
| Yiyecek/servis | ~%21 | (kalan %21 içinde) |
| Sağlık | %2–3 | — |
| Yıllık geliri >$25M olan davalı | %36 (2024: %33, 2023: %27) | **%36** |
| Geliri <$50M olan davalı | — | **%68** |
| Geliri >$1B olan davalı | — | %10 |
| Top-500 e-ticaret perakendecisinden en az bir dava alan | **%35,8** | — |

Kaynaklar: https://blog.usablenet.com/ada-web-lawsuit-trends-2026 · https://blog.usablenet.com/inside-the-2026-midyear-numbers-where-digital-accessibility-litigation-is-going

**Coğrafya (2026 H1, aylık ortalama federal+eyalet):** New York lider (~190–235/ay), **Illinois yükselen yıldız** (~60–114/ay, tek bir davacı bürosu — Equal Access Law Group PLLC — 2026 artışının ana sürükleyicisi), Florida (~41–115/ay), California (~57–83/ay).

### 13.4 Tipik sözleşme büyüklüğü

| Segment | Yıllık sözleşme | Kaynak |
|---|---|---|
| Mikro/SMB overlay | **$490 – $3.990** | accessiBe/UserWay yayınlanmış fiyatları |
| SMB tarama platformu | **$300 – $4.800** | Pope Tech yayınlanmış ($25–400/ay) |
| Geliştirici araç (küçük ekip) | **$500 – $2.500/koltuk** | [3P] Vendr / TrustRadius |
| Mid-market platform | **$12.000 – $30.000** | [3P] Siteimprove, Vendr |
| Enterprise platform | **$25.000 – $150.000+** | [3P] Level Access, Vendr |
| Enterprise + yönetilen hizmet | **$75.000 – $500.000+** | [3P] Deque enterprise, Level Access geniş kapsam |
| 🆕 **TR kamu (doğrudan temin)** | **≤340.391 TL** (~€7.200) veya **≤1.021.827 TL** (~€21.700) büyükşehirde | ✅ KİK 2026 parasal limitleri |

Kaynaklar: https://www.vendr.com/marketplace/level-access · https://www.vendr.com/marketplace/siteimprove · https://www.vendr.com/marketplace/deque · https://www.yakadanismanlik.com/makaleler/2026-yili-dogrudan-temin-22-d-parasal-limitleri-1-milyon-tl-siniri-asildi

---

## 14. Fiyatlandırma Derin Analizi

### 14.1 Rakiplerin değer metriği karşılaştırması — kim neye göre fiyatlıyor ve neden

| Rakip | Değer metriği | Somut fiyat | Neden bu metriği seçmiş | Zayıflığı |
|---|---|---|---|---|
| **accessiBe accessWidget** | 🔵 **Aylık trafik (ziyaret)** — SimilarWeb verisiyle hesaplanıyor | ≤5k ziyaret $490/yıl · ≤30k $1.490 · ≤100k $3.990 | Overlay'in "değeri" son kullanıcıya sunulduğu için trafikle ölçekleniyor. Ayrıca **hukuki risk trafikle korelasyonlu** — çok ziyaretçi = çok dava riski | Müşteri kendi trafiğini bilmiyor/kabul etmiyor; SimilarWeb tahmini tartışmalı; trafik arttıkça sürpriz fatura |
| **UserWay Widget** | 🔵 **Aylık pageview** | ≤100K pageview: Pro $490 · Pro Plus $1.190 · Ultimate $2.490 /yıl | accessiBe ile aynı mantık; fiyat noktalarını birebir eşlemiş (rekabetçi eşleme) | Aynı; ayrıca Pro'da monitoring sadece 10 sayfa → gizli sınır |
| **UserWay Monitoring** | 🟢 **Sayfa sayısı** | 100 syf $990 · 500 syf $4.490 · 1.500 syf $10.990 /yıl | Tarama maliyeti sayfa sayısıyla doğrusal — **maliyete en yakın metrik** | Pahalı; sayfa başına $6–10/yıl |
| **Pope Tech** | 🟢 **Sayfa havuzu ("Page Tier")** + sınırsız kullanıcı | Free 25 syf · Team 50–500 syf $25–?/ay · Business Plus 500–1M+ syf $225+/ay | En basit ve en dürüst metrik. "Kaç sayfam var?" sorusu alıcının zaten cevabını bildiği tek soru. Sınırsız kullanıcı = benimseme sürtünmesi sıfır | Sayfa sayısı değeri yansıtmaz (5 sayfalık kritik checkout > 500 sayfalık blog) |
| **Deque axe DevTools** | 🟣 **Koltuk (kullanıcı)** | ~$40–45/ay/kullanıcı [3P]; 5–20 koltukta $1.200–2.500/koltuk/yıl [3P] | Geliştirici aracı; değer bireysel üretkenlikte | Ekip büyüdükçe maliyet patlar → benimseme düşmanı; "sadece 2 kişi lisans alsın" davranışı |
| **Siteimprove** | 🟢 **Sayfa sayısı × modül** | 1k–5k syf $12k–30k/yıl · 10k–25k syf $35k–70k/yıl [3P] | Crawl maliyeti + modül bundling ile ARPA maksimizasyonu | Modül şişmesi; alıcı istemediği modüle ödüyor |
| **Silktide** | 🟢 Sayfa/site + suite (quote-only) | Yayınlanmamış, 12 ay taahhüt [3P] | Değer bazlı fiyatlama, pazarlık gücü | Şeffaflık yok → SMB elenir |
| **AudioEye** | 🔵 Site + paket seviyesi | Yayınlanmamış | Hizmet karışımı fiyatı gizlemeyi gerektiriyor | Alıcı karşılaştırma yapamıyor |
| **Level Access** | 🟠 Kapsam + hizmet (custom) | $25k–150k+/yıl [3P] | Kurumsal değer bazlı | SMB erişilemez |
| **Stark** | 🟣 Koltuk | $99/yıl/kullanıcı | Tasarımcı aracı; bireysel benimseme | Ekip düzeyinde ölçeklenmiyor |
| **WeAccess.AI** | ❓ Yayınlanmamış | — | — | Alıcı karşılaştırma yapamıyor |

**Metrik ailelerinin özeti:**
- 🔵 **Trafik/pageview** — overlay'lerin metriği. Hukuki risk proxy'si. Percevia için **uygun değil** (Percevia risk transferi satmıyor).
- 🟢 **Sayfa/site** — tarama ürünlerinin metriği. Maliyete yakın, anlaşılır. **Kategorinin fiili standardı.**
- 🟣 **Koltuk** — geliştirici araçlarının metriği. Benimseme düşmanı.
- 🟠 **Kapsam/custom** — kurumsal.

### 14.2 Percevia için değer metriği seçimi — her seçeneğin artı/eksisi

| Seçenek | Artı | Eksi | Uygunluk |
|---|---|---|---|
| **A. Aylık sayfa havuzu** (Pope Tech modeli) | ✅ Kategorinin standardı → karşılaştırılabilir ✅ Alıcı kendi sayfa sayısını biliyor ✅ Maliyete yakın (Playwright render maliyeti sayfa başına doğrusal) ✅ "Sınırsız rescan" güçlü bir yan vaat | ❌ Değer yansıtmıyor (5 sayfalık checkout > 500 sayfalık blog) ❌ Alıcı "kaç sayfam var bilmiyorum" diyebilir → crawl ile otomatik tespit gerekir | 🟢 **ÖNERİLEN ANA METRİK** |
| **B. Tarama sayısı** (mevcut Free modeli) | ✅ Maliyete en yakın ✅ Kötüye kullanımı engeller | ❌ **Alıcı için anlamsız** — "günde 3 tarama" ne demek? ❌ Rakiplerle karşılaştırılamaz ❌ Sürekli izleme vaadiyle çelişir (izleme = sık tarama) | 🔴 **TERK EDİLMELİ** — Percevia'nın ücretsiz planının zayıf algılanmasının kök nedeni |
| **C. Site/domain sayısı** | ✅ Ajans için doğal ✅ Basit | ❌ Site büyüklüğü çok değişken → 5 sayfalık site ile 50.000 sayfalık site aynı fiyat ❌ Maliyetle ilişkisiz | 🟡 **İKİNCİL boyut** — ajans planında "N site + N sayfa havuzu" |
| **D. Koltuk (kullanıcı)** | ✅ Yüksek ARPA potansiyeli ✅ Kurumsal satın almaya tanıdık | ❌ **Benimseme düşmanı** — kurum 3 koltuk alır, 20 kişi kullanamaz ❌ Pope Tech "sınırsız kullanıcı" ile doğrudan saldırıyor ❌ TR kamu kurumunda İnceleme Komisyonu 5 kişi + BT ekibi = koltuk sayma kabusu | 🔴 **ANA METRİK OLMAMALI.** Ücretli planlarda **sınırsız kullanıcı** verin — bu Pope Tech paritesi için zorunlu |
| **E. Kapatılan issue** (sonuç bazlı) | ✅ Kategoride kimse yapmıyor → tam farklılaşma ✅ Percevia'nın "kapanış metriği" tezine mükemmel uyum ✅ Alıcı sadece işe yarayan şeye öder | ❌ Ölçüm oyunlanabilir (dismiss et = kapattım) ❌ Gelir öngörülemez ❌ Alıcı bütçeleyemez ❌ Faturalama karmaşık | 🟡 **ANA METRİK OLMAMALI** ama **pazarlama metriği olarak kullanılmalı**: "Bu ay 1.240 issue kapattınız" |
| **F. Hibrit: sayfa havuzu + sınırsız kullanıcı + site limiti plan bazında** | ✅ Pope Tech paritesi ✅ Ajans için doğal upsell yolu ✅ Öngörülebilir gelir | ❌ Üç boyutlu → iletişimi biraz karmaşık | 🟢 **ÖNERİLEN NİHAİ YAPI** |

**KARAR ÖNERİSİ:**

> **Ana metrik: aylık aktif sayfa havuzu. İkincil boyut: site sayısı (plan bazında). Kullanıcı: tüm ücretli planlarda sınırsız. Tarama sayısı: sınırsız (havuz içinde).**

Bu yapı üç şeyi aynı anda çözüyor: (1) Pope Tech ile birebir karşılaştırılabilirlik, (2) ücretsiz planın algı sorunu, (3) ajans kanalının doğal ölçeklenmesi.

### 14.3 Fiyat esnekliği ve psikolojik eşikler

**Bantların anlamı (SaaS fiyatlandırma literatürü + kategori gözlemi):**

| Bant | Anlamı | Alıcı davranışı | Kategoride kim var |
|---|---|---|---|
| **$0** | Deneme, öğrenme, viral giriş | Kredi kartı yok, karar yok, risk yok | Pope Tech Free, axe eklentisi, WAVE, Lighthouse |
| **$19–29/ay** | 🎯 **"Düşünmeden alınan" bant.** Bireysel kredi kartı sınırı; onay gerektirmez | Aynı gün karar, düşük bağlılık, yüksek churn | Pope Tech Team $25, Equally AI [3P] $19–37 |
| **$49/ay** | Küçük ekip / freelancer bandı. Hâlâ onaysız ama "bilinçli" bir karar | 1–7 gün karar | — **kategoride boş** |
| **$99/ay** | 🎯 **Küçük işletme bandı.** Yıllık ~$1.200 — bir çalışan gününün maliyeti; yönetici onayı sınırında | 1–3 hafta, kısa karşılaştırma | — **kategoride boş** |
| **$199–249/ay** | Ekip/ajans bandı. Yıllık $2.400–3.000; bütçe kalemi gerektirir | 2–6 hafta, karşılaştırma tablosu istenir | Pope Tech Business Plus $225 |
| **$400–500/ay** | Küçük kurumsal. Yıllık $4.800–6.000 | 4–10 hafta, satın alma süreci | Pope Tech Professional $400 |
| **$1.000+/ay** | Kurumsal. Satın alma, hukuk, güvenlik incelemesi | 3–9 ay | Siteimprove, Silktide, Level Access, Deque |

**Percevia'nın mevcut yapısının değerlendirmesi:**

| Plan | Fiyat | Bant | Değerlendirme |
|---|---|---|---|
| Free | €0 | $0 | 🔴 **Yapısı yanlış** (tarama sayısı), miktar yanlış (3 sayfa). Bkz. 14.4 |
| Starter | €39/ay | ~$42 | 🟢 İyi konumlanmış — $29 ile $49 arası, "düşünmeden alınan" bandın hemen üstü. **Ancak Pope Tech Team $25 ile doğrudan karşılaştırılacak** |
| Agency | €129/ay | ~$139 | 🟡 $99 ile $199 arasında sıkışmış. **$99'a indirmek veya €149'a çıkarmak** psikolojik olarak daha net. €129 "ne ucuz ne pahalı" bandı — en zayıf fiyat noktası tipi |
| Team | €249/ay | ~$268 | 🟢 İyi — Pope Tech Business Plus ($225) ile rekabetçi ve üstünde bir konum iddia ediyor. **Ama Percevia'da CI/CD ve SSO yok, Pope Tech'te var** → bu fiyat şu an savunulamaz |
| Enterprise | custom | — | 🟢 Doğru |

**⚠️ Kritik bulgu:** Percevia'nın Team planı (€249) Pope Tech Business Plus'tan ($225) **pahalı** ama **daha az özellik** içeriyor (CI/CD yok, SSO yok, login arkası tarama yok, API yok). Bu, doğrudan karşılaştırma yapılan her satışta kayıptır. İki çıkış yolu var: (a) Team'in fiyatını düşür, (b) eksik özellikleri kapat. **Önerilen: (b), ama kapanana kadar Team'i CI/CD olmayan alıcılara konumla (kamu, ajans, pazarlama ekipleri).**

**Yıllık/aylık indirim normu:**
- Sektör standardı: **%16,7** ("2 ay bedava" = 12 ay fiyatına 10 ay) — anlaşılması en kolay çerçeve
- Tipik aralık: **%15–20**; bazı şirketler %20–25
- Pope Tech uyguluyor: $25 (yıllık) vs $30 (aylık) = **%16,7**; $225 vs $270 = **%16,7**
- Fiyat sayfasında **varsayılan olarak yıllık göstermek**, yıllık dönüşümü %20–30 artırıyor [3P]
- Yıllık faturalama churn'ü %20–30 azaltıyor [3P]

Kaynaklar: https://fungies.io/annual-vs-monthly-saas-pricing-strategy/ · https://www.getmonetizely.com/articles/saas-pricing-benchmark-study-2025-key-insights-from-100-companies-analyzed · https://www.pope.tech/websites/pricing

**Öneri:** Percevia %16,7 (2 ay bedava) uygulasın ve fiyat sayfasında **varsayılan yıllık** göstersin. Türkiye'de kur riski nedeniyle **%20**'ye çıkarmak savunulabilir (Bölüm 14.7).

### 14.4 Ücretsiz plan tasarımı — en kritik tek fiyat kararı

**Mevcut durum ve problem:**

| | Percevia Free | Pope Tech Free |
|---|---|---|
| Yapı | Günde 3 tarama × 3 sayfa | Ayda 25 sayfa havuzu |
| Aylık teorik kapasite | ~270 sayfa-tarama | 25 sayfa × sınırsız rescan |
| **Alıcının algıladığı** | 🔴 **"3 sayfa"** — sitemi kapsayamam | 🟢 **"25 sayfa"** — küçük sitemi kapsayabilirim |
| Kullanıcı | ? | 2 |
| Site | ? | 1 |
| Rescan | Günde 3 kez sınırlı | **Sınırsız** |
| Zamanlanmış tarama | ? | ✅ Var |
| Raporlar | ? | ✅ Var |

**Teşhis:** Percevia'nın ücretsiz planı **teknik olarak daha cömert ama algısal olarak çok daha kısıtlı**. Alıcı "3 sayfa" rakamını görüyor ve ürünü zihninde eliyor. Bu, huninin tepesindeki en pahalı hatadır.

**Pope Tech'in 25 sayfa/ay modelinin analizi — neden işe yarıyor:**

1. **25 sayfa gerçek bir küçük siteyi kapsıyor.** Bir belediye alt birimi, bir küçük işletme, bir portföy sitesi 25 sayfaya sığar. Kullanıcı **gerçek değer** görüyor.
2. **Sınırsız rescan, ürünün asıl vaadini (sürekli izleme) ücretsizde deneyimletiyor.** Kullanıcı düzeltiyor, yeniden tarıyor, skorun düzeldiğini görüyor — **bu, alışkanlık döngüsüdür**.
3. **2 kullanıcı = ekip özelliğini tattırıyor** ama 3. kişi geldiğinde duvara çarpıyor.
4. **1 site limiti, ikinci site geldiğinde doğal dönüşüm tetikleyicisi.**
5. **"Free Forever" ve "no credit card required" ifadeleri** sürtünmeyi sıfırlıyor.
6. **Zamanlanmış tarama ve raporlar ücretsizde var** — yani ürünün operasyonel çekirdeği deneyimleniyor, sadece ölçek kısıtlı.

**Neyi ücretsiz vermeli / kesinlikle vermemeli:**

| Ver ✅ | Verme ❌ | Gerekçe |
|---|---|---|
| **Aylık N sayfa havuzu** (öneri: 25–30) | Sınırsız sayfa | Ana ölçek kısıtı burada olmalı |
| **Sınırsız rescan** | — | Alışkanlık döngüsünün motoru; kısıtlanırsa ürün "tek seferlik tarayıcı" gibi hissettirir |
| **Zamanlanmış tarama (haftalık)** | Günlük zamanlanmış tarama | Sürekli izleme vaadi tadılmalı ama günlük ücretli olsun |
| **1 site** | 2+ site | İkinci site = en doğal dönüşüm tetikleyicisi |
| **2 kullanıcı** | 3+ kullanıcı | Ekip tadı verir, duvarı erken çıkarır |
| **Türkçe/İngilizce issue açıklaması** | — | 🎯 **Percevia'nın en güçlü farkı ücretsizde görünmeli** |
| **Sınırlı AI kod önerisi** (örn. ayda 10 öneri) | Sınırsız AI önerisi | Maliyet kalemi; ayrıca en güçlü dönüşüm kancası |
| **Ekranda görüntülenebilir rapor** | 🔴 **PDF export** | PDF = kurumun İnceleme Komisyonuna sunacağı belge = **ödeme anı** |
| **Basit skor/özet** | 🔴 **Paylaşılabilir link** | Ajans ve kurumsal kullanımın çekirdeği |
| — | 🔴 **Erişilebilirlik beyanı üretimi** | En yüksek algılanan değer, en düşük maliyet → ücretli olmalı |
| — | 🔴 **Remediation task takibi** | Operasyonel bağımlılık yaratan özellik → ücretli |
| — | 🔴 **Monitör/uyarı (değişiklik bildirimi)** | Sürekli değer → ücretli |
| — | 🔴 **Bakanlık A Seviyesi eşlemeli rapor** | 🇹🇷 Türkiye'nin ödeme sebebi |

**Dönüşüm tetikleyicileri — nasıl kurulur:**

| # | Tetikleyici | Mekanizma | Beklenen etki |
|---|---|---|---|
| 1 | **Sayfa havuzu dolması** | Kullanıcı 26. sayfayı eklemek istediğinde: "Havuzunuz doldu. Starter ile 250 sayfa." | En sık tetiklenen |
| 2 | **PDF export denemesi** | Rapor ekranda görünüyor, "PDF olarak indir" tıklandığında paywall | 🎯 **En yüksek niyetli an** — kullanıcı raporu birine göstermek istiyor |
| 3 | **3. kullanıcı daveti** | "Ekibinize 3. kişiyi eklemek için Starter'a geçin" | Ekip benimsemesi başladığında |
| 4 | **2. site ekleme** | Ajans persona'sı için birincil tetikleyici | Ajans dönüşümünün ana yolu |
| 5 | **AI öneri kotası bitmesi** | "Bu ay 10 öneri hakkınızı kullandınız" | Değer en net anlaşıldığı an |
| 6 | **İlk düzeltme kapandığında** | "İlk issue'nuzu kapattınız 🎉 — kapanış geçmişinizi saklamak için Starter" | Duygusal an, yüksek dönüşüm |
| 7 | 🇹🇷 **Genelge raporu talebi** | "İnceleme Komisyonu raporu şablonunu indir" → paywall | Türkiye'de #1 tetikleyici |

**ÖNERİLEN YENİ ÜCRETSİZ PLAN:**

> **Free — €0, sonsuza kadar**
> • **30 sayfa/ay havuzu** (sınırsız yeniden tarama)
> • 1 site, 2 kullanıcı
> • Haftalık zamanlanmış tarama
> • Türkçe/İngilizce issue açıklaması
> • Ayda 10 AI düzeltme önerisi
> • Ekranda rapor + skor
> • Kredi kartı gerekmez
>
> *(PDF export, paylaşılabilir link, erişilebilirlik beyanı, task takibi, monitör uyarıları, A Seviyesi eşlemeli rapor: ücretli planlarda)*

Bu yapı Pope Tech'in 25 sayfasını **30'a çıkararak** karşılaştırmada üstünlük kuruyor, ama Percevia'nın gerçek para kazandıran özelliklerini (PDF, beyan, task, monitör) korumaya alıyor.

### 14.5 Ajans / white-label fiyatlandırma modelleri — rakipler nasıl yapıyor

| Rakip | Model | Doğrulanmış koşullar | Kaynak |
|---|---|---|---|
| **accessiBe** | Affiliate/komisyon + reseller | **%20 komisyon**, müşteri accessWidget kurduğunda otomatik, **ilk 12 ay**. WSI partnerlerinde **%30**. **5.000+ ajans partneri.** White-label: şirketin **önceden yazılı onayıyla**, arayüzün grafik öğeleri özelleştirilebilir (logo, renk şeması). Reselling partner'a order form'da belirtilen **indirimli fiyattan** satış. Ek: white-label araçlar, satış desteği, pazarlama materyali, eğitim, **dava desteği** | https://accessibe.com/partner-program · https://support.accessibe.com/hc/en-us/articles/20470937352850-How-does-the-Partners-Program-work |
| **AudioEye** | İki kanal: **Enterprise** ve **Partner & Marketplace** (CMS partnerleri, platform & ajans partnerleri, yetkili bayiler). **Reseller:** müşteri ilişkisinin tamamına sahip, kendi belirlediği fiyattan faturalıyor, AudioEye'dan **tier'a bağlı indirimli fiyat** + **Dedicated Partner Manager**. **Referral:** evergreen komisyon. **Volume distribution:** wholesale fiyat | Yüzde oranları yayımlanmamış | https://www.audioeye.com/partners/ · https://www.audioeye.com/become-a-partner/ |
| **UserWay / Level Access** | Partner programı mevcut | Koşullar yayımlanmamış | https://userway.org/ |
| **Pope Tech** | "Resellers and Agencies — Help your clients be accessible and Re-sell Pope Tech as part of your services" + multi-product indirim | **Koşullar yayımlanmamış**, iletişim formundan ilerliyor. **Ajans için multi-tenant panel veya white-label rapor kanıtı bulunamadı** | https://www.pope.tech/websites/pricing |
| **Silktide** | Partner sayfası mevcut, "Web agencies" dikey sayfası var | Koşullar yayımlanmamış | https://silktide.com/partners/ · https://silktide.com/industries/web-agencies/ |
| **Deque** | "Find an accessibility partner" dizini | Danışmanlık ortaklığı odaklı, reseller marjı yayımlanmamış | https://www.deque.com/company/partners/find-accessibility-partner/ |
| **WeAccess.AI** | "Stratejik Ortaklar" sayfası | Koşullar yayımlanmamış | https://www.weaccess.ai/tr/partner |

**Pazarın öğrettiği üç model:**

| Model | Nasıl çalışır | Ajans için | Vendor için | Percevia uygunluğu |
|---|---|---|---|---|
| **A. Referral / komisyon** | Ajans tavsiye eder, müşteri vendor'dan satın alır, ajans %X komisyon alır (accessiBe: %20/12ay) | ✅ Sıfır risk, sıfır iş ❌ Müşteri ilişkisini kaybeder, gelir tek seferlik | ✅ Kolay kurulum ✅ Müşteri sahipliği vendor'da | 🟢 **Başlangıç için ideal** — düşük mühendislik |
| **B. Reseller / wholesale** | Ajans indirimli alır, kendi fiyatından satar, faturayı kendi keser (AudioEye modeli) | ✅ Marj kontrolü ✅ Müşteri ilişkisi sahipliği ❌ Fatura/tahsilat yükü | ✅ Yüksek hacim ❌ Fiyat kontrolü kaybı | 🟠 **Orta vadeli** — sözleşme ve faturalama altyapısı gerekir |
| **C. White-label / multi-tenant** | Ajans kendi markasıyla panel ve rapor sunar | ✅ Maksimum değer ✅ Kendi ürünü gibi | ❌ Mühendislik yükü ❌ Marka görünürlüğü kaybı | 🟡 **Kademeli** — önce white-label PDF, sonra panel |

**PERCEVIA İÇİN ÖNERİLEN AJANS PAKETİ (kademeli):**

**Aşama 1 (Hafta 1–4, sıfır mühendislik):** Referral programı
- **%25 komisyon, 12 ay** (accessiBe'nin %20'sini geçiyor, kanal cazibesi yaratıyor)
- Ajansa özel takip linki, aylık ödeme
- Ajans için hazır satış materyali (Türkçe + İngilizce)

**Aşama 2 (Ay 2–4, düşük mühendislik):** Ajans planı
- **Agency €129/ay**: N site + M sayfa havuzu + sınırsız kullanıcı
- **White-label PDF rapor** (ajans logosu, renk, iletişim bilgisi) — düşük efor, yüksek algılanan değer
- Müşteri başına ayrı çalışma alanı (workspace)

**Aşama 3 (Ay 5–9, orta mühendislik):** Reseller
- **%35–40 wholesale indirimi** (10+ müşteri portföyü için)
- Ajans kendi faturalar, Percevia toplu faturalar
- Müşteriye salt-okunur panel erişimi (ajans markası ile)

**Somut ajans marj tablosu (satış materyaline konulmalı — VARSAYIM):**

| Ajans senaryosu | Percevia'ya ödediği | Müşteriye sattığı | Ajans yıllık brüt marjı |
|---|---|---|---|
| 10 müşteri × referral (%25) | €0 | Müşteri €39/ay öder | **€1.170/yıl komisyon** |
| 20 site, Agency planı | €1.548/yıl | 20 × €25/ay = €6.000/yıl | **€4.452/yıl** |
| 50 site, reseller (%35 indirim) | ~€3.900/yıl | 50 × €25/ay = €15.000/yıl | **€11.100/yıl** |

> Bu tablo varsayımsaldır; ajans satış fiyatları örnektir. Ancak **bu tabloyu satış materyalinde göstermek, ajans persona'sını (Persona 3) dönüştürmenin tek etkili yoludur.**

### 14.6 Enterprise fiyatlandırma — neye göre, hangi eşikler, hangi ek kalemler

**Kategorinin enterprise fiyat mantığı:**

| Değişken | Rakiplerde nasıl kullanılıyor | Percevia için öneri |
|---|---|---|
| Sayfa sayısı | Siteimprove: 1k–5k → $12k–30k; 10k–25k → $35k–70k | ✅ Ana değişken |
| Site/domain sayısı | Level Access: kapsam bazlı | ✅ İkincil değişken |
| Koltuk | Deque: 5–20 koltukta $1.200–2.500/koltuk | ❌ Kullanmayın — sınırsız kalsın |
| Hizmet katmanı | Level Access, AudioEye, Deque: denetim/eğitim/VPAT ekleniyor | ⚠️ Percevia hizmet satmıyor — **ortak ekosistemine yönlendirin** |
| Taahhüt süresi | Çok yıllı taahhütte %10–25 indirim yaygın [3P Vendr] | ✅ 2 yıl %10, 3 yıl %20 |

**Percevia Enterprise eşikleri (öneri — VARSAYIM):**

| Eşik | Tetikleyici | Yaklaşık fiyat |
|---|---|---|
| **Enterprise başlangıcı** | >5.000 sayfa VEYA >10 site VEYA SSO/SAML talebi VEYA özel veri bölgesi | **€6.000–12.000/yıl** |
| **Enterprise orta** | >25.000 sayfa VEYA çok kurumlu yapı (holding, üniversite + tüm fakülteler) | **€15.000–30.000/yıl** |
| **Enterprise üst** | >100.000 sayfa VEYA on-prem/private cloud VEYA özel SLA | **€35.000+/yıl** |

**Ek kalemler (add-on) — kategoride yaygın ve Percevia'ya uygun:**

| Add-on | Kategoride kim satıyor | Percevia için | Tahmini fiyat |
|---|---|---|---|
| **Özel veri bölgesi / bölge kilidi** | Deque (on-prem, private cloud) | 🟢 Yüksek marj, düşük maliyet (Cloud Run region) | +%20–30 |
| **SSO/SAML** | Pope Tech (Business Plus), Deque | 🟢 Kurumsal zorunluluk | Enterprise'a dahil |
| **Ek sayfa paketi** | Pope Tech (page tier upgrade) | 🟢 Doğal upsell | Sayfa başına doğrusal |
| **Onboarding + eğitim** | Pope Tech (Professional), Level Access | 🟡 Ortakla yapılabilir | €1.500–5.000 tek seferlik |
| **Özel rapor şablonu** | — | 🟢 🇹🇷 TR kamu için değerli | €1.000–3.000 tek seferlik |
| **Öncelikli destek / SLA** | Silktide, Siteimprove | 🟢 Düşük maliyet | +%15–25 |
| **VPAT / manuel denetim** | Deque, Level Access, accessiBe, UserWay | 🔴 **Percevia satmamalı** — ortak ekosistemine yönlendir | — |

### 14.7 🇹🇷 TRY fiyatlandırma önerisi ve kur riski yönetimi

**Problem:** Türk kamu ve kurumsal alıcı TL bütçeyle planlar, TL fatura ister, EUR fiyat görünce "bütçeleyemem" der. Aynı zamanda EUR/TL oynaklığı Percevia'nın marjını erozyona uğratabilir.

**Önerilen TL fiyat listesi** *(1 EUR ≈ 47 TL varsayımıyla; kur varsayımdır ve yayından önce güncellenmelidir)*

| Plan | EUR | Ham TL | **Önerilen TL (psikolojik yuvarlama)** | Yıllık TL (2 ay bedava) | Doğrudan temin (340.391 TL) |
|---|---|---|---|---|---|
| Free | €0 | 0 | **₺0** | ₺0 | — |
| Starter | €39/ay | ~1.833 | **₺1.890/ay** | **₺18.900/yıl** | ✅ %5,6 |
| Agency | €129/ay | ~6.063 | **₺5.990/ay** | **₺59.900/yıl** | ✅ %17,6 |
| Team | €249/ay | ~11.703 | **₺11.900/ay** | **₺119.000/yıl** | ✅ %35 |
| **Kurum Planı** 🆕 | — | — | **₺149.000/yıl sabit** | — | ✅ %43,8 |
| Enterprise | custom | — | Teklif | — | Değişken |

**"Kurum Planı" — Türkiye'ye özel paket önerisi:**
- Sabit yıllık TL fiyat (kur riski Percevia'da)
- Doğrudan temin limitinin **rahatça altında** (340.391 TL'nin %44'ü)
- 2.500 sayfa havuzu, sınırsız kullanıcı, 25 alt site (fakülte/müdürlük)
- Bakanlık A Seviyesi eşlemeli PDF rapor + İnceleme Komisyonu şablonu
- Türkçe destek, TL e-Fatura
- LLM kapatma anahtarı + veri bölgesi seçimi + KVKK Standart Sözleşme
- Yıllık peşin, tek fatura

Bu paket, Persona 1'in (TR kamu BT) satın alma sürecine **birebir** oturuyor: tek kalem, tek fatura, ihalesiz, TL, Türkçe.

**Kur riski yönetimi — 5 kural:**

| # | Kural | Gerekçe |
|---|---|---|
| 1 | **TL liste fiyatını yılda 2 kez revize et** (1 Ocak, 1 Temmuz) | Aylık revizyon güven kaybettirir; yıllık revizyon marjı yakar |
| 2 | **Sözleşmeye "yenilemede güncel liste fiyatı uygulanır" maddesi koy** | Yenileme anında kur farkını kapatır |
| 3 | **Yıllık peşin ödemeyi %20 indirimle teşvik et** (EUR'daki %16,7 yerine) | Nakit erken gelir, kur riski süresi kısalır |
| 4 | **Çok yıllı sözleşmelerde TL fiyatı yıllık ÜFE/TÜFE endeksle** — sözleşmede açıkça yaz | KİK doğrudan temin limitleri de Yİ-ÜFE ile güncelleniyor (2026: %27,67) → alıcı bu mantığa aşina ✅ |
| 5 | **EUR maliyet tabanını (OpenAI, GCP) TL gelirle eşleştir** — TL gelir payı %30'u aşarsa doğal hedge veya forward düşün | Operasyonel finans kararı |

**Uyarı:** TL fiyatlandırmaya geçmek, **TL e-Fatura kesme kabiliyeti** olmadan yarım bir çözümdür. Kamu kurumunun muhasebesi TL fiyat görüp yurt dışı fatura aldığında KDV-2 ve stopaj süreçleriyle uğraşır ve bu, satışın kapanmasını geciktirir veya öldürür. **Türkiye'de tüzel kişilik veya yerel bayi kurma kararı, Türkiye stratejisinin en kritik ticari kararıdır.** (Bkz. TR-8.)

### 14.8 Fiyatlandırma — Önerilen Nihai Yapı (özet)

| Plan | Fiyat (EUR/ay, yıllık) | Fiyat (TL/ay) | Sayfa havuzu | Site | Kullanıcı | Ana ayırt edici |
|---|---|---|---|---|---|---|
| **Free** | €0 | ₺0 | 30/ay | 1 | 2 | Sınırsız rescan, TR/EN açıklama, 10 AI önerisi/ay |
| **Starter** | €39 | ₺1.890 | 250 | 3 | Sınırsız | PDF export, paylaşılabilir link, günlük izleme, beyan üretimi |
| **Agency** | €129 | ₺5.990 | 1.500 | 25 | Sınırsız | White-label PDF, müşteri workspace'leri, task takibi |
| **Team** | €249 | ₺11.900 | 5.000 | 50 | Sınırsız | Ekip rolleri, gelişmiş raporlama, öncelikli destek *(CI/CD ve SSO gelene kadar bu fiyat savunması zayıf)* |
| **Kurum Planı** 🇹🇷 | — | ₺149.000/yıl | 2.500 | 25 | Sınırsız | A Seviyesi eşlemeli rapor, İnceleme Komisyonu şablonu, TL e-Fatura, LLM kapatma, veri bölgesi |
| **Enterprise** | custom | Teklif | 5.000+ | 50+ | Sınırsız | SSO, veri bölgesi, SLA, özel şablon, çok yıllı indirim |

> ⚠️ Sayfa havuzu rakamları **varsayımdır** ve Playwright render maliyeti + OpenAI token maliyeti üzerinden birim ekonomisi hesaplanarak doğrulanmalıdır. Bir sayfanın tarama + LLM açıklama maliyeti bilinmeden bu tablo bağlayıcı olamaz.

---

## 15. Pazar Boşlukları ve Percevia için Fırsat Alanları

> **Bu rapordaki en önemli bölüm.**

### Boşluk 1 — SMB/geliştirici fiyat uçurumu (EN BÜYÜK FIRSAT)

**Problem:** Pazarda üç fiyat adası var ve aralarında köprü yok.

```
$0 ────────────── $490/yıl ──────────────────────── $12.000–150.000/yıl
Lighthouse         accessiBe Micro                  Siteimprove / Level Access
Pa11y              UserWay Pro                      Silktide (12 ay taahhüt)
axe eklentisi      (= OVERLAY, hukuken riskli)      Deque enterprise
WAVE                                                Evinced (fiyat yok)
Pope Tech Free                                      (= SMB için erişilemez)
(25 sayfa/ay)
```

Overlay olmayan, geliştirici odaklı, $20–200/ay bandında **tek ciddi oyuncu Pope Tech** (Team $25/ay, Business Plus $225/ay) — o da ABD yüksek öğrenim odaklı, WAVE motorlu, AI'sız ve tek dilli.

**Percevia için fırsat:** Bu bandı hedeflemek zorunlu değil, **kaçınılmaz**. Ancak bunun için ücretsiz planın rekabetçi olması gerekiyor. Bugünkü ücretsiz plan (günde 3 tarama × 3 sayfa) **Pope Tech'in 25 sayfa/ay + sınırsız rescan + 2 kullanıcı planına karşı zayıf algılanıyor**. **Aksiyon: ücretsiz planı "tarama başına 3 sayfa" yerine "ayda 30 sayfa havuzu" olarak yeniden çerçevele** (Bölüm 14.4).

---

### Boşluk 2 — Tespit var, remediation yok

**Problem:** Pazarın tamamı **tespit** satıyor. Fakat UsableNet'in verisi, tespitin sonuç üretmediğini kanıtlıyor: 2025'te açılan davaların **1.427'si daha önce dava almış şirketlere** karşı; federal davaların **%46'sı tekrar davalı**. Şirketler tarıyor, rapor alıyor, düzeltmiyor.

> "The complaints follow a familiar pattern: a settlement, limited remediation, a new plaintiff, and another filing—often within months."
> — UsableNet 2025 Year-End · https://blog.usablenet.com/ada-web-lawsuit-trends-2026

🆕 **Carrefour kararı bu boşluğu hukuki olarak da doğruladı:** mahkeme "%71 uyumluyum" demeyi reddetti ve **sonuç** istedi. Denetim raporu değil, düzeltme.

**Percevia için fırsat:** Percevia'da zaten **remediation task takibi** var — bu, kategoride nadir bir özellik. Ancak konumlandırma bunu ön plana çıkarmıyor. **Ürünün ana metriği "kaç hata buldum" değil, "kaç hata KAPANDI ve ne kadar sürede" olmalı.** Burn-down grafiği, kapanış oranı, ortalama düzeltme süresi. Bu tek başına Percevia'yı "bir başka tarayıcıdan" ayırır.

---

### Boşluk 3 — False positive / "needs review" gürültüsü

**Problem:** Kategorinin en tutarlı şikayeti. Deque axe Monitor: "many false positives or 'needs review' items". Siteimprove: "false flags… reported links as broken when they actually weren't". Bir sayfada 200 ihlal bulununca ne olacağı, kural sayısından daha önemli.

Evinced'in $112M'lık tezi tam olarak bu: **issue clustering** — aynı kök nedenden doğan yüzlerce ihlali tek düzeltilebilir birime indirgemek. 🆕 Deque de 2026'da **issue deduplication**'ı DevTools bundle'ına ekledi — yani bu artık bir ürün gereksinimi, bir farklılaşma değil.

**Percevia için fırsat:** Percevia zaten "issue'ları gruplayıp raporluyor" — bu doğru içgüdü ama yeterince ileri götürülmemiş olabilir. Gerçek fark yaratacak olan:
- **Bileşen/template düzeyinde gruplama** (100 sayfada aynı header hatası = 1 iş)
- **LLM ile "bu 47 ihlal aynı React bileşeninden geliyor" tespiti** — bu, LLM'in gerçekten değer kattığı yer, kod önerisinden daha fazla
- **Dismiss + kalıcı kural** (bu false positive'i bir daha gösterme, tüm sitede)
- Percevia'nın Playwright kullanması burada avantaj: gerçek tarayıcıda render edilmiş DOM + component boundary bilgisi çıkarılabilir

---

### Boşluk 4 — Overlay mültecileri için ikame yok

**Problem:** Sektör SMB'lere "overlay kullanma" diyor ama yerine ne koyacaklarını söylemiyor. AudioEye'ın 127.000 müşterisi, UserWay'in 1M+ sitesi, accessiBe'nin SMB tabanı — bunlar yılda $490–3.990 ödemeye **hazır**, ödeme isteği kanıtlanmış müşteriler.

**Percevia için fırsat:** Doğrudan "overlay'inizi bırakın, yerine bunu koyun" göç kampanyası. Somut varlıklar:
- **Ücretsiz "overlay teşhis" taraması**: sitenizde overlay var mı, hangi ihlaller overlay'e rağmen duruyor. Bu, accessScan/UserWay Scanner'ın aynası ama tersine çevrilmiş — ve son derece paylaşılabilir bir içerik/PR aracı
- FTC kararı + UsableNet widget davası grafiği ile veri destekli içerik
- Overlay'in yıllık maliyetiyle Percevia karşılaştırması
- 🇹🇷 **Türkiye'de dikkatli uygulanmalı** (bkz. Bölüm 9.4) — "overlay kötü" değil, "kapsam farklı" çerçevesi

---

### Boşluk 5 — Gizlilik ve veri egemenliği (BEYAZ ALAN — ama daralıyor)

**Problem:** Pazarda **hiçbir vendor gizliliği ana konumlandırma olarak kullanmıyor.** Oysa:
- Erişilebilirlik taraması, login arkasındaki sayfaları tararken müşteri verisi ve PII görüyor
- LLM'e gönderilen HTML/DOM parçaları bir veri işleme faaliyeti
- AB alıcıları için GDPR, Türkiye alıcıları için **KVKK zorunlu** (2026 ceza bandı: 90.308–1.806.377 TL ✅)
- accessiBe İsrail, AudioEye ABD, Level Access ABD, Pope Tech ABD merkezli — AB kamu ve banka alıcıları için veri konumu bir satın alma engeli

🆕 **Ancak boşluk daralıyor:** Deque artık **on-premises, private cloud ve offline deployment** seçenekleri sunuyor; Silktide'ın **AB veri bölgesi** (app.eu.silktide.com) ve yayınlanmış **SOC2 + VPAT** sayfaları var. Yani üst segmentte bu ihtiyaç zaten karşılanıyor. **Percevia'nın boşluğu üst segment değil, orta ve alt segment** — €39–249/ay bandında AB/TR veri konumu sunan kimse yok.

**Not:** Bu boşluğun büyüklüğüne dair doğrudan bir pazar araştırması bulunamadı — bu bir **hipotez**, doğrulanmış bir bulgu değil.

**Percevia için fırsat:** "privacy-first" zaten ürünün adında. Bunu kanıta dönüştürmek gerekiyor:
- **AB/Türkiye veri konumu seçeneği** (Cloud Run bölge seçimi — teknik olarak kolay, ticari olarak kilit)
- **LLM'e ne gönderildiğinin tam şeffaflığı**: hangi HTML parçası, ne kadar süre saklanıyor, eğitimde kullanılıyor mu
- **PII maskeleme:** LLM'e metin değil, yapı gönderilmesi (Bölüm 5.5)
- **LLM kapatma anahtarı** (kurum düzeyinde)
- **Sıfır-saklama modu**: tarama sonrası ham HTML silinir, sadece issue metadata kalır
- DPA şablonu + alt işleyici listesi + KVKK Standart Sözleşme hazır olarak sitede
- Bu, **Türkiye'deki banka ve özel hastane alıcıları** (2025/10 kapsamında) için doğrudan bir satın alma kriteri

---

### Boşluk 6 — İngilizce dışı pazarlar, özellikle Türkiye

**Problem ve fırsat birlikte:**
- WebAIM Million: Türkçe sayfalar ortalama **66,2 hata** (küresel ort. 56,1'in **%17,9 üzerinde**, İngilizce'nin **%44 üzerinde**). Örneklem 11.248 sayfa.
- 2025/10 Genelgesi: 12 kuruluş tipi için uyum süresi ≈Haziran 2026'da doldu. **E-ticaret için ≈Haziran 2027.**
- 2026, Bakanlığın "Erişilebilirlik İzleme ve Denetleme Planı" genelgesiyle resmen **denetim yılı**.
- Her kurum **İnceleme Komisyonu** kurup teknik rapor üretmek zorunda ✅
- Uyumlu bulunan kurumlara **2 yıllık "Erişilebilirlik Logosu"** — yani bir **ödül mekanizması** var, sadece ceza değil.
- **Pazarda Türkçe arayüzlü, Türkçe raporlayan, Türkçe WCAG açıklaması üreten, overlay olmayan bir SaaS yok** (WeAccess Türkçe ama overlay merkezli).

**Percevia için fırsat — en somut ve en yakın gelir:**
- Türkçe UI + **Türkçe issue açıklaması ve düzeltme önerisi** (LLM ile doğal, rakiplerin makine çevirisinden çok üstün)
- Bakanlık **"A Seviyesi Kontrol Listesi"** ile eşleştirilmiş rapor şablonu — ürünü genelgeye doğrudan bağlar
- **İnceleme Komisyonu Raporu** PDF şablonu — Genelge diliyle
- Türkçe erişilebilirlik beyanı üretimi (⚠️ yüzde/skor içermeden — Bölüm 6.3)
- Hedef liste hazır ve kamuya açık: ~209 üniversite, ~1.401 belediye, 50+ banka, ~570+ özel hastane, telekom, meslek odaları
- Doğrudan temin limiti argümanı: ihalesiz satın alınabilirlik ✅
- Aynı oyun İspanyolca (+%14,7), İtalyanca (+%14,8), Lehçe (+%22,5) pazarlarında tekrarlanabilir

**Uyarı:** Genelgede doğrudan para cezası yok. Satış argümanı "ceza yersiniz" değil, **"denetleniyorsunuz, Bakan sonuçları duyuracak, logo alabilirsiniz, İnceleme Komisyonunuz rapor üretmek zorunda"** olmalı — ve bu argüman doğrulanmıştır.

---

### Boşluk 7 — "Kanıtlanabilir çaba" belgesi, VPAT'tan ucuz

**Problem:** Overlay'lerin sattığı asıl ürün hukuki rahatlama. accessiBe "automated proof of effort" ve aylık denetim raporu veriyor; AudioEye "Assurance" mali garanti veriyor; UserWay "Litigation Support Program" veriyor. Percevia bunların hiçbirini sunmuyor ve **sunmamalı** (FTC riski).

**Ama:** demand letter alan bir SMB'nin — veya izleme yazısı alan bir Türk kamu kurumunun — gerçekte ihtiyacı olan şey, avukatına/denetçisine verebileceği **tarihli, değişmez, üçüncü tarafça üretilmiş bir kayıt**: "şu tarihte taradık, şunu bulduk, şunları şu tarihte düzelttik, şunlar açık ve planı bu."

**Percevia için fırsat:** Bu tam olarak Percevia'nın zaten sahip olduğu parçaların (monitör + task takibi + PDF export + paylaşılabilir link + erişilebilirlik beyanı) bir **ürün paketi** olarak yeniden çerçevelenmesi:

> **"Erişilebilirlik Çalışma Dosyası"** — zaman damgalı tarama geçmişi, kapatılan/açık issue kaydı, remediation planı ve erişilebilirlik beyanı. Tek PDF. Avukatınıza veya denetçinize verilebilir.
> **Açıkça belirtilir:** Bu bir uyumluluk sertifikası değildir ve hukuki savunma garantisi vermez.

🇹🇷 **Türkiye versiyonu: "İnceleme Komisyonu Raporu"** — aynı içerik, Genelge diliyle, A Seviyesi Kontrol Listesi eşlemeli.

⚠️ 🆕 **Carrefour uyarısı:** Bu dosya **uyum yüzdesi içermemelidir**. Mahkeme, self-declared yüzdeyi savunma olarak reddetti. Doğru içerik: kapsam, yöntem, tarih, **bilinen bariyerler**, düzeltme takvimi, geri bildirim kanalı.

Bu, uyumluluk vaadi yapmadan hukuki alıcının gerçek ihtiyacını karşılar. **Sıfır yeni mühendislik, büyük konumlandırma kazancı.**

---

### Boşluk 8 — Geliştirici iş akışına gerçek entegrasyon (⚠️ pencere daralıyor)

**Problem:** Rakipler CI/CD entegrasyonunu enterprise tier'a kilitliyor. Pope Tech GitHub/Bitbucket CI/CD'yi **$225/ay** Business Plus'ta veriyor. accessiBe accessFlow CI/CD ve MCP'yi Professional tier'da.

🆕 **Ama pencere daraldı:** Deque 2026'da **Axe MCP Server** ("IDE'nizde tek tıkla erişilebilirlik düzeltmesi") ve **Axe DevTools Linter** (GitHub PR'da erişilemez kodu bloklama) ürünlerini çıkardı. Evinced'in MCP Tools'u zaten vardı. Yani **"MCP'de ilk olmak" fırsatı kapandı.**

**Percevia için kalan fırsat — fiyat ve dil:**
- **PR yorumu**: "bu PR 3 yeni erişilebilirlik ihlali ekliyor" — GitHub App olarak, **ucuz tier'da** (rakipler enterprise'a kilitliyor)
- **MCP sunucusu**: Claude Code / Cursor gibi agent'ların Percevia'yı doğrudan çağırabilmesi — artık farklılaşma değil, **parite gereksinimi**
- WebAIM'in "vibe coding erişilebilirlik borcunu artırıyor" bulgusunun doğal panzehiri: **AI'ın ürettiği kodu AI ile denetlemek**

**Risk:** Bu alan hızla kalabalıklaşıyor ve Vercel/Netlify/GitHub'ın kendi çözümlerini gömme ihtimali var. **Percevia'nın bu boşlukta kazanma ihtimali V1'e göre düştü.** Kaynak önceliği Türkiye ve ajans kanalına kaymalı.

---

### Boşluk 9 — Ajans / white-label kanalı

**Problem ve fırsat:** accessiBe, UserWay, AudioEye ve Pope Tech'in hepsi ajans/reseller programı işletiyor — çünkü SMB'ye tek tek satmak ekonomik değil. Web ajansları müşterilerinin 20–200 sitesini yönetiyor ve şu anda ya overlay satıyorlar (itibar riski) ya da hiçbir şey.

🆕 **Doğrulanmış boşluk:** accessiBe'nin **5.000+ ajans partneri** ve **%20 komisyon** modeli var; AudioEye'ın tier'lı reseller/wholesale yapısı var. Ama **Pope Tech'in ajans programı yalnızca bir iletişim formu**, multi-tenant panel veya white-label rapor kanıtı yok. **Overlay olmayan ürünlerde ajans kanalı boş.**

**Percevia için fırsat:** Multi-tenant ajans paneli, white-label rapor, müşteri başına fiyatlandırma, **%25 referral komisyonu** (accessiBe'nin %20'sini geçen). Percevia'da zaten ekip daveti var — bunu ajans hiyerarşisine genişletmek nispeten küçük bir iş, dağıtım çarpanı büyük. Detay: Bölüm 14.5.

---

### 🆕 Boşluk 10 — Kamu "kendi kendini değerlendirme" araçları

**Problem:** Türkiye'de (ve muhtemelen benzer rejimlerde) devlet, kurumlardan **kendi kendini değerlendirip rapor üretmesini** istiyor. Bakanlığın ERDEM modülü (bina için, 10 bölüm/281 soru) bunun kanıtı: kurum soruları cevaplıyor, sistem rapor üretiyor. **Web ve mobil için böyle bir modül yok.**

**Percevia için fırsat:** Ürünü "erişilebilirlik tarayıcısı" olarak değil, **"kurum içi erişilebilirlik değerlendirme ve raporlama modülü"** olarak konumlandırmak. Bu:
- Alıcının zihnindeki kategoriye (ERDEM benzeri) oturur
- Otomatik tespit + manuel kontrol listesi kalemlerini birleştirir (manuel kalemler için basit checkbox akışı — düşük mühendislik)
- İnceleme Komisyonu'nun ihtiyacını uçtan uca karşılar

**Uzun vadeli risk:** Bakanlık veya CBDDO ileride web için resmî bir modül çıkarırsa bu boşluk kapanır (bkz. Senaryo 5). **Pencere şimdi açık.**

---

## 16. Percevia SWOT

### Güçlü Yönler (S)

| # | Güç | Kanıt / gerekçe |
|---|---|---|
| S1 | **Hukuken dayanıklı konumlandırma** — uyumluluk/sertifikasyon vaat etmiyor | FTC accessiBe kararı ($1M) kategorinin en büyük riskini gösterdi. 🆕 Carrefour kararı, "%X uyumluyum" iddiasının mahkemede reddedildiğini gösterdi. Percevia bu riski yapısal olarak taşımıyor |
| S2 | **Overlay değil** | 600+ imzacılı Overlay Fact Sheet; UsableNet "widget bir savunma değil"; WebAIM %67/%72 etkisizlik. 🆕 Türkiye'de somut bir rakibe (WeAccess Widget) karşı kullanılabilir |
| S3 | **Gerçek tarayıcı render'ı** (Playwright + axe-core) | WebAIM'in de kullandığı yaklaşım: script ve stiller uygulandıktan sonra DOM analizi. Basit HTML-fetch tabanlı ucuz rakiplerden üstün. Ayrıca bileşen sınırı çıkarımı için altyapı |
| S4 | **Tam operasyon döngüsü** — tarama → gruplama → task → monitör → rapor → beyan | Rakiplerin çoğu ya sadece tarıyor (açık kaynak) ya sadece raporluyor (Siteimprove) ya sadece "düzeltiyor" (overlay) |
| S5 | **Gerçek freemium** | Pope Tech dışında hiçbir ciddi rakipte kalıcı ücretsiz plan yok (Deque'in ücretsiz eklentisi ürün değil, motor) |
| S6 | **GDPR/KVKK yerleşik** (veri silme, dışa aktarma) | Rakiplerde bu bir pazarlama teması bile değil — orta segmentte beyaz alan |
| S7 | **Türkçe/yerel pazar erişimi** | Türkçe sayfalar +%17,9 hata; 2025/10 Genelgesi WCAG 2.2 + A Seviyesi; İnceleme Komisyonu zorunluluğu; kurucunun yerel bağlamı |
| S8 🆕 | **Türkiye'de ihalesiz satın alınabilirlik** | 2026 doğrudan temin limiti: büyükşehir 1.021.827 TL, diğer 340.391 TL. Tüm Percevia planları bu limitin çok altında ✅ |
| S9 🆕 | **Küçüklük = hız** | Kategorinin lideri Deque'in fiyat sayfası bile hâlâ rakam yayımlamıyor. Percevia şeffaflık, hız ve yerelleşmede yapısal olarak avantajlı |

### Zayıf Yönler (W)

| # | Zayıflık | Neden önemli |
|---|---|---|
| W1 | **axe-core = emtia motor** | Deque'in motoru ücretsiz ve herkeste var; tespit yeteneğinde farklılaşma imkânsız. Fark, motorun üstündeki katmanda olmak zorunda |
| W2 | **%57 tavanı Percevia'da da geçerli** | Alıcı "kalan %43'ü kim yapacak?" diye soracak. Manuel denetim hizmeti veya ortaklığı yok |
| W3 | **VPAT / manuel denetim / uzman hizmeti yok** | B2B/B2G ihalelerinde VPAT talebi bir eleme kriteri. accessiBe, UserWay, AudioEye, Level Access, Deque hepsi sunuyor. Section 508 kapsamında **kesin eleme** |
| W4 | **Hukuki destek / mali garanti yok** | Satın alma tetikleyicilerinin #1'i demand letter/ihtarname. AudioEye Assurance kategoride tek gerçek taahhüt. (Bkz. Boşluk 7 — ikame öneri) |
| W5 | **Ücretsiz plan rekabetçi görünmüyor** | "Günde 3 tarama × 3 sayfa" vs Pope Tech "25 sayfa/ay havuzu, sınırsız rescan, 2 kullanıcı". **Yapısal metrik hatası** (Bölüm 14.4) |
| W6 | **CI/CD, IDE, PR entegrasyonu, SSO yok** | Geliştirici segmentinin asgari beklentisi. Pope Tech ($225/ay) ve accessFlow bunu veriyor. 🆕 Deque MCP Server + Linter çıkardı → pencere daralıyor |
| W7 | **Mobil uygulama, PDF/doküman, video kapsamı yok** | EAA ve Türkiye genelgesi mobil uygulamaları **açıkça** kapsıyor. 🆕 Carrefour kararı mobil uygulamayı açıkça emre bağladı. 🆕 Pope Tech PDF taraması ekledi |
| W8 | **Sıfır marka bilinirliği ve analist rozeti yok** | 🆕 Forrester Wave Q4 2025 Liderleri (Deque, Level Access, Siteimprove) kurumsal kısa listeleri belirliyor. G2/Capterra yorum sayısı sıfır |
| W9 | **AI iddiası bir yükümlülük olabilir** | OpenAI ile "kod düzeltme önerisi" — bu iddia dikkatli çerçevelenmezse FTC benzeri risk doğurur. "Öneri" ve "insan onayı gerekir" dili zorunlu |
| W10 🆕 | **Erişilebilirlik beyanı özelliği hukuki risk taşıyor** | Carrefour kararı: beyandaki yüzde savunma değil. Beyan skor içeriyorsa müşteriye zararlı belge üretiyoruz |
| W11 🆕 | **KVKK/LLM veri akışı çözülmemiş** | TR banka/hastane segmentine satış bu çözülmeden imkânsız. 2026 ceza bandı 90.308–1.806.377 TL |
| W12 🆕 | **TL fatura kesme kabiliyeti yok** | TR kamu satın almasında ciddi sürtünme (KDV-2, stopaj, evrak) |
| W13 🆕 | **Team planı Pope Tech Business Plus'tan pahalı ama daha az özellikli** | €249 vs $225, ama CI/CD, SSO, login arkası, API yok. Doğrudan karşılaştırmada kayıp |

### Fırsatlar (O)

| # | Fırsat | Zamanlama |
|---|---|---|
| O1 | **Türkiye 2025/10 denetim yılı** — 12 kuruluş tipi; İnceleme Komisyonu zorunluluğu; e-ticaret 2027'ye kadar | **Şimdi** — 2026 denetim yılı |
| O2 | **EAA yaptırım rampası mahkemeye taşındı** — Carrefour kararı (4 Haz 2026), E.Leclerc duruşması (22 Eyl 2026), Hollanda ACM ceza kararları 2026 boyunca | **2026 H2** |
| O3 | **EN 301 549 v4.1.1 → WCAG 2.2 AA** (Ekim 2026 OJEU) — tüm AB müşterilerinde **yeniden tarama ihtiyacı** | **Ekim 2026** |
| O4 | **Overlay mültecileri** — AudioEye 127k müşteri, UserWay 1M+ site, accessiBe SMB tabanı; ödeme isteği kanıtlanmış | Sürekli |
| O5 | **SMB fiyat uçurumu** — $490 overlay ile $12k enterprise arası boş | Sürekli |
| O6 | **AI kodun ürettiği erişilebilirlik borcu** — WebAIM "vibe coding" bulgusu; hata sayısı +%10,1 | Büyüyor |
| O7 | **Ajans/white-label kanalı** — overlay olmayan ürünlerde boş | Sürekli |
| O8 | **MCP / agent entegrasyonu** — artık parite gereksinimi, farklılaşma değil | 2026 (pencere daraldı) |
| O9 | **Diğer düşük-performanslı diller** — İspanyolca (+%14,7), İtalyanca (+%14,8), Lehçe (+%22,5) | 2027+ |
| O10 🆕 | **TDEA 2026 — Türkiye'nin ilk ulusal dijital erişilebilirlik araştırması**, sonuç raporu 1 Ekim 2026 | **Ağu–Eki 2026 — tek seferlik** |
| O11 🆕 | **AODA raporlama son tarihi** 31 Aralık 2026 (Ontario, 20+ çalışanlı özel sektör) | 2026 Q4 |
| O12 🆕 | **Kamu "kendi kendini değerlendirme modülü" kategorisi** — ERDEM benzeri, web için boş | Şimdi |

### Tehditler (T)

| # | Tehdit | Şiddet |
|---|---|---|
| T1 | **Pope Tech doğrudan çakışma** — şeffaf fiyat, sınırsız kullanıcı, $25/ay'dan, gerçek ücretsiz plan, WebAIM itibarı, 🆕 PDF taraması | **Yüksek** |
| T2 | **Deque'in emtia motoru + genişleyen ücretsiz/AI yüzeyi** — alıcı "axe zaten ücretsiz, neden ödeyeyim?" 🆕 MCP Server, Linter, deduplication, on-prem | **Yüksek, artıyor** |
| T3 | **Platform gömülmesi** — Vercel/Netlify/GitHub/Storybook a11y'yi native özellik yaparsa SMB katmanı buharlaşır | **Orta-Yüksek**, artıyor |
| T4 | **Evinced'in $112M'ı Avrupa'ya yönlendiriliyor** | Orta (segment farkı var ama aşağı inebilirler) |
| T5 | **Level Access / AudioEye bundling** — hukuki destek + overlay + platform paketi Percevia'nın rekabet edemeyeceği bir teklif | Orta |
| T6 | **DOJ ertelemesi ABD kamu talebini 2027'ye itti** | Orta — ama Percevia'nın hedef pazarı zaten ABD kamu değil |
| T7 | **Fiyat sıfıra doğru yarış** — açık kaynak + AI kodlama asistanları tarama maliyetini sıfıra indiriyor | Orta |
| T8 | **Kategori güvenilirlik krizi** — WebAIM verisi araçların sonucu değiştirmediğini gösteriyor; alıcı "bu ürünler işe yaramıyor" sonucuna varabilir | **Yüksek, altta yatan** |
| T9 🆕 | **WeAccess.AI'ın Türkiye'de yerleşikliği** — Türkçe, ISO 27001, IAAP üyeliği, TİD modülü, TR/UK/UAE yapısı, partner programı | **Yüksek (TR'de)** |
| T10 🆕 | **Türkiye'de kamunun kendi ücretsiz aracını çıkarması** — ERDEM'in web versiyonu | Orta, ama gelirse **ölümcül** (bkz. Senaryo 5) |
| T11 🆕 | **Forrester/Gartner konsolidasyonu** — analist raporları kurumsal kısa listeyi kilitliyor, Percevia listede yok | Orta |
| T12 🆕 | **Carrefour kararının ters etkisi** — "otomatik araç yetmez, uzman denetim şart" mesajı, otomatik araç kategorisinin tamamına zarar verebilir | Orta-Yüksek |

### Stratejik sentez

Percevia'nın kazanma tezi **teknoloji değil, konumlandırma + coğrafya + kanal**:

1. **Motorda rekabet etme** (axe-core emtia). **Gürültü azaltma, remediation kapanışı ve kanıt üretiminde** rekabet et.
2. **Türkiye'de yerel ol — ve bunu "yerelleştirme" değil, "yerli ürün" seviyesinde yap.** 2025/10 Genelgesi'nin İnceleme Komisyonu zorunluluğu, ihalesiz satın alınabilirlik ve yerli rakibin overlay olması bir arada eşsiz bir pencere yaratıyor. Bu pencere **12–24 ay** açık kalır.
3. **Dürüstlüğü ürünleştir.** %57 tavanını, WebAIM'in "hata yokluğu erişilebilirlik demek değildir" cümlesini, DOJ'un kendi gerekçesini ve overlay eleştirisini ürünün içine yaz. FTC ve Carrefour sonrası dünyada bu bir satış argümanıdır.
4. **Uyumluluk vaat etme, ama uyumluluk ARAYAN alıcıya bir artefakt ver** — "Erişilebilirlik Çalışma Dosyası" / "İnceleme Komisyonu Raporu". ⚠️ **Yüzde/skor içermeden.**
5. **Ücretsiz planı Pope Tech'e karşı yeniden fiyatla** — metriği "tarama" değil "sayfa havuzu" yap. Bu, edinim hunisinin tepesi ve şu anda yapısal olarak kırık.
6. 🆕 **Ajans kanalını erken kur.** %25 referral + white-label PDF, sıfıra yakın mühendislikle 20–100 site çarpanı verir. Overlay olmayan ürünlerde bu kanal boş.
7. 🆕 **Geliştirici segmentini birinci öncelik yapma.** Deque MCP+Linter, Evinced MCP Tools ve accessFlow ile bu cephe kalabalıklaştı ve Percevia'nın CI/CD, SSO, IDE eksikleri büyük. Bu segment **ikinci dalga** olmalı.

---







