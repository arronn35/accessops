# Percevia AI — Ar-Ge ve Ürün Yükseltme Master Planı

**Proje:** maitrico Percevia AI (`accessops`)
**Tarih:** 27 Temmuz 2026
**Kapsam:** Tam ürün denetimi (kod + arayüz + AI + pazar) ve prime-form yol haritası
**Yöntem:** Beş rol paralel çalıştırıldı — Yazılım Mühendisi, Frontend/UX Mühendisi, Yapay Zeka Mühendisi, Ar-Ge/Rekabet Analisti, Proje Mühendisi/CEO

**Ekler (bu dokümanın kanıt tabanı):**

| Dosya | İçerik | Bulgu sayısı |
|---|---|---|
| `01-engineering-audit.md` | Kod, güvenlik, dayanıklılık, teknik borç | 47 |
| `02-ux-audit.md` | Arayüz akıcılığı, performans, kendi a11y uyumumuz | 50 |
| `03-ai-architecture.md` | AI katmanı denetimi + hedef mimari + maliyet modeli | 23 |
| `04-market-research.md` | Rakip matrisi, regülasyon, pazar boşlukları | 100+ kaynak |

> **Metodolojik uyarı:** Tüm kod bulguları statik okumadır. `npm run typecheck`, `npm test` ve `npm run test:e2e` **çalıştırılamadı** — repo iCloud senkronize `~/Desktop` altında olduğu için sandbox her dosya okumasında `Resource deadlock avoided` veriyor. Hiçbir runtime metriği (LCP/CLS/INP, gerçek AI yanıt içeriği) ölçülmemiştir. Bu planın Faz 0'ının ilk maddesi bu doğrulama boşluğunu kapatmaktır.

---

## 1. Yönetici Özeti

Percevia AI, V1 bir SaaS'tan beklenenin **belirgin şekilde üzerinde** mühendislik olgunluğuna sahip: transaction'lı watchdog/sweeper, deterministik idempotent pageJob'lar, gerçek SSRF katmanı, Firestore tabanlı paylaşımlı rate limit, sıkı Firestore kuralları, olağanüstü runbook dokümantasyonu. Önceki denetimin (2026-06-11) 10 bulgusundan 9'u gerçekten kapatılmış. Mimari doğru kurulmuş.

Buna karşılık üç katmanda **sistemik bir açık** var ve üçü de aynı kök nedene bağlanıyor: **ürün, kendi vaadini doğrulayan mekanizmalardan yoksun.**

1. **Kod katmanı (öncelik #1).** 47 bulgu; 1 P0, 6 P1. Ortak tema: *durum makinesi kağıt üzerinde doğru, ama terminal duruma yazan kod yolları durumu yeniden kontrol etmiyor.* En ağırı, ürünün **kendi origin'inde barındırdığı stored XSS** — üstelik mevcut bir test bu hatalı davranışı doğru kabul ederek kilitliyor.
2. **Arayüz katmanı (öncelik #2).** Akıcılık notu 6.5/10. Mimari sağlam (RSC ağırlıklı, `onSnapshot` realtime + polling fallback doğru kurgulanmış), ama **bir erişilebilirlik ürününün kendi arayüzü WCAG ihlal ediyor**: uygulamada tek bir `aria-live` yok, canlı tarama ilerlemesi ekran okuyucuya tamamen sessiz. Ayrıca tıklandığında hiçbir şey yapmayan **sahte kontroller** var — bir "dürüstlük" ürününde en pahalı hata tipi.
3. **AI katmanı (öncelik #3).** Ürünün adında AI geçiyor; gerçekte 329 satırlık tek dosyalık bir prompt wrapper. Streaming, cache, retry, timeout, eval, maliyet takibi, injection savunması — hiçbiri yok. Ve muhtemelen **hiç çalışmıyor**: reasoning model üzerinde `max_output_tokens: 900` kullanılıyor; reasoning token'ları bu bütçeden düşer ve limit dolunca API görünür output üretmeden `incomplete` döner. Kod bu durumu kontrol etmiyor; boş yanıt `modelProvider: "openai"` etiketiyle geçerli sayılıyor. Fatura kesiliyor, kullanıcı boş kart görüyor.

**Pazar tarafında zamanlama lehimize.** Web geriliyor (WebAIM Million 2026: ana sayfaların %95,9'unda hata, sayfa başına 56,1 hata, bir yılda +%10,1 — WebAIM nedeni açıkça "vibe coding"e bağlıyor). Overlay tezi hukuken çöktü (FTC → accessiBe $1M). Türkiye'de bağlayıcı bir denetim takvimi var ve **yerli rakip yok**. $490/yıl overlay ile $12.000/yıl kurumsal arasında, overlay olmayan geliştirici odaklı tek ciddi oyuncu Pope Tech.

**Stratejik tez:** Percevia motorda (axe-core, emtia) kazanamaz. Kazanacağı yer **gürültü azaltma, kapanış kanıtı ve coğrafya**. Kategorinin varoluşsal sorunu, araçların bulguyu üretip sonucu değiştirmemesi — UsableNet verisi 2025 davalarının 1.427'sinin *daha önce dava almış* şirketlere açıldığını gösteriyor. Bu yüzden ürünün manşet metriği "kaç hata buldum" değil, **"kaç hata kapandı, ne kadar sürede ve bunu nasıl kanıtlıyorum"** olmalı.

**Karar:** Önümüzdeki 16 hafta, yeni özellik değil **doğrulanabilirlik** inşa etmeye ayrılmalı. Sırasıyla: kritik hataları kapat → kendi ürünümüzü erişilebilir yap → AI'ı gerçekten çalıştır ve ölç → kapanışı kanıtlayan farklılaştırıcıyı kur.

---

## 2. Mevcut Durum Tespiti

### 2.1 Teknik profil

| Katman | Teknoloji | Durum |
|---|---|---|
| Web | Next.js 16.2.6 App Router, React 19.2.4, Tailwind v4 | Sağlam; RSC disiplini iyi |
| Auth | Firebase Auth (email link + GitHub) | Süresi dolan oturumda 500 hatası (B06) |
| Veri | Firestore (Admin SDK), 40 API route | Index/N+1 borçları var |
| Dispatch | Google Cloud Tasks + Cloud Scheduler | Scheduler tanımları **repoda yok** (B31) |
| Tarayıcı | Private Cloud Run worker, Playwright + axe-core | Yetim pageJob açlığı + sıcak döngü (B04) |
| Billing | Polar (`@polar-sh/sdk`) | Webhook idempotency yok (B20); plan seçimi fail-open (B02) |
| AI | OpenAI Responses API, düz `fetch`, `gpt-5.3-codex` | Muhtemelen boş yanıt üretiyor (AI-01) |
| Test | vitest + Playwright, CI Node 22 | Kritik yolların bir kısmı kapsam dışı |

Ölçek: ~250 kaynak dosya, 40 API route, 27 rota, 8 tarama kütüphanesi modülü, 5 plan katmanı, 6 workspace rolü.

### 2.2 Ticari profil (koddan çıkarıldı)

| Plan | Fiyat | Günlük tarama | Sayfa/tarama | Monitör | Üye | AI kotası |
|---|---|---|---|---|---|---|
| Free | €0 | 3 | 3 | 0 | 1 | **Yok — sınırsız** |
| Starter | €39/ay | 50 | 50 | 3 (haftalık) | 3 | **Yok — sınırsız** |
| Agency | €129/ay | 200 | 200 | 25 | 10 | **Yok — sınırsız** |
| Team | €249/ay | 500 | 500 | 100 | 25 | **Yok — sınırsız** |
| Enterprise | Custom | 1000 | 1000 | 500 | 200 | **Yok — sınırsız** |

Kaynak: `src/lib/entitlements.ts:84-277`, `src/app/pricing/page.tsx:14-86`

**Üç yapısal sorun:**

1. **AI hiçbir plana bağlı değil.** `view_ai` bir *rol* izni (`entitlements.ts:148-221`), plan yetkisi değil. Tek kontrol `aiExplain: 60 istek/saat/kullanıcı` (`rate-limit.ts:27`) ve bu limiter Firestore hatasında **fail-open** (`rate-limit.ts:112-117`). Teorik tavan **$43/kullanıcı/gün** — €0 planda. Aynı zamanda: fiyat sayfası "AI explanations (limited)" diyor, kodda limit yok. Hem maliyet bombası hem para kazanma kaldıracının kaybı.
2. **Ücretsiz plan yanlış çerçevelenmiş.** "Tarama başına 3 sayfa" ifadesi kullanıcıya "siteni kapsayamazsın" mesajı veriyor. Pope Tech'in "25 sayfa/ay, 2 kullanıcı, kalıcı ücretsiz" planına karşı algısal olarak zayıf — oysa günlük 3×3 aslında aylık ~270 sayfa-tarama. **Huninin tepesi ölçüyle değil, kelimeyle kırık.**
3. **Starter'ın marjı savunulamaz.** €39'a günde 50 tarama × 50 sayfa = günde 2.500 sayfa-tarama + sınırsız AI. Playwright compute + LLM maliyeti bu fiyatta karşılanamaz.

### 2.3 Pazar konumu

Doğrulanmış rakip fiyat haritası:

```
$0 ──────────────── $490/yıl ──────────────────── $12.000–150.000/yıl
axe-core, Pa11y     accessiBe Micro                Siteimprove ($12k–70k)
Lighthouse, WAVE    UserWay Pro                    Level Access ($25k–150k)
Pope Tech Free      (= OVERLAY, hukuken riskli)    Silktide (12 ay taahhüt)
(25 sayfa/ay)                                      Deque enterprise
        │
        └──► Pope Tech Team $25/ay · Business Plus $225/ay
             (overlay değil, AI yok, ABD yüksek öğrenim odaklı)
             ◄── PERCEVIA'NIN GERÇEK RAKİBİ
```

**Regülasyon takvimi (fırsat penceresi):**

| Bölge | Olay | Tarih | Percevia etkisi |
|---|---|---|---|
| **Türkiye** | 2025/10 Genelgesi — kamu, üniversite, belediye, banka, özel hastane, telekom | Uyum süresi ≈Haz 2026 doldu | **Şimdi satılabilir** |
| **Türkiye** | Bakanlık "Erişilebilirlik İzleme ve Denetleme Planı" | 2026 = denetim yılı | Aciliyet mevcut |
| **Türkiye** | E-ticaret hizmet sağlayıcıları | ≈Haz 2027 | 12 aylık hazırlık penceresi |
| **AB** | EAA yürürlükte; Fransa'da ilk ihtarlar (Kasım 2025, mahkemede) | 2025→ | Yaptırım rampası |
| **AB** | Hollanda aktif denetim | 2026 H2 | Yakın |
| **AB** | EN 301 549 v4.1.1 → WCAG 2.2 AA, OJEU | Ekim 2026 | **Tüm AB müşterisinde yeniden tarama ihtiyacı** |
| **ABD** | DOJ, ADA Title II tarihlerini 1 yıl erteledi | Nisan 2026 | ABD kamu talebi 2027'ye kaydı |
| **ABD** | Özel dava tahmini ~6.176 (rekor, +%20) | 2026 | Talep düzenleyiciden değil davadan geliyor |

> DOJ'un erteleme gerekçesinde açıkça **"üretken yapay zeka dahil mevcut teknolojinin ölçekte otomatik remediation yapamaması"** yazıyor. Bu, Percevia'nın "vaat etmiyoruz, kanıtlıyoruz" konumlandırmasının resmî bir doğrulaması.

---

## 3. Konsolide Bulgu Envanteri

Toplam **120 bulgu**: 3 P0, 13 P1, 60+ P2, 30+ P3.

### 3.1 P0 — Derhal (bu hafta)

| ID | Bulgu | Dosya | Neden P0 |
|---|---|---|---|
| **B01** | `/statement/{id}` stored XSS + `javascript:` href | `src/app/statement/[id]/route.ts:43-53, 61, 148, 166` | Ücretsiz hesapla ürünün kendi origin'inde kalıcı XSS. Sayfa public. `render.ts:503`'te doğru `escapeHtml` zaten var, burada kullanılmamış. **Mevcut test hatalı davranışı kilitliyor** (`route.test.ts:76-77`) |
| **F-01** | Uygulamada tek bir `aria-live` yok | `progress-client.tsx:356-371`; grep → 0 sonuç | WCAG 4.1.3 AA ihlali, **amiral gemisi ekranda**. Bir a11y ürünü için varoluşsal marka riski |
| **F-03/04/05/09/10** | Sahte kontroller — tıklanır, hiçbir şey olmaz | Rapor filtre çipleri `<span>` (`scans/[id]/page.tsx:458-500`), Compliance bölge butonları `onClick`'siz (`compliance/page.tsx:216`), Settings→Notifications 3 switch state'siz (`settings-client.tsx:161-180`), print "butonu" `<span>` (`reports/preview/page.tsx:61`), TopNav arama bağlı değil | "Dürüstlük" konumlandırmasıyla doğrudan çelişiyor. Büyük taramada filtre olmadan rapor kullanılamaz |

### 3.2 P1 — Bu sprint

**Güvenlik / gelir**

| ID | Bulgu | Etki |
|---|---|---|
| B02 | `POLAR_ACCESS_TOKEN` yoksa herkes kendini `enterprise` yapabiliyor (`plan/select/route.ts:26-44`) | Gelir kaybı + tüm plan capleri baypas. `production-readiness.md:94` "billing disabled" dediği için **bugün canlı olabilir** |
| B03 | Retry route kota ve izin atlıyor (`scans/[id]/retry/route.ts:23-32`) | Sınırsız ücretsiz tarama; `client_viewer` tarama tetikleyebiliyor |
| B34 | 6 route'ta `view_scans` kontrolü yok | `report_viewer` (tüm izinleri `false`) tarama verisi ve ekran görüntüsü okuyabiliyor |
| AI-13 | AI için plan kotası yok, limiter fail-open | $43/kullanıcı/gün teorik maruziyet |

**Dayanıklılık / doğruluk**

| ID | Bulgu | Etki |
|---|---|---|
| B04 | Yetim `queued` pageJob'lar → FIFO tıkanması + sıcak döngü | Yeni page job'lar **hiç işlenmez**; Cloud Run 4 dk boş Firestore trafiği yakar |
| B05 | Terminal durum dirilmesi / çift işleme (`persistence.ts:252,383,420`) | Sweeper'ın `failed` yaptığı scan `completed` olur; iki worker aynı scan'i işler; veri silinir; kota çift sayılır |
| B06 | Süresi dolan oturum 401 yerine 500 (`auth/session.ts:41-46`) | 7 günde bir tüm kullanıcılar; Sentry gürültüsü |
| **B07** | **Başarısız sayfalar skoru şişiriyor** (`scoring.ts:33-50`) | 5 sayfadan 4'ü yüklenemezse gerçek 60 yerine **82** gösteriliyor (F yerine B). **Ürünün manşet metriği yanlış** |

**AI**

| ID | Bulgu | Etki |
|---|---|---|
| **AI-01** | Reasoning model'de `max_output_tokens: 900` (`explain.ts:287`) | Sessiz truncation; muhtemelen prod'da boş yanıt + kesilen fatura |
| AI-02 | `status: "incomplete"` hiç kontrol edilmiyor | Boş çıktı `modelProvider: "openai"` etiketiyle geçerli sayılıyor |
| AI-03 | `fetch`'te timeout yok | İstek dakikalarca asılı kalabilir |
| **AI-04** | Mock fallback şeffaf değil | Şablon metin provenance göstergesi olmadan "AI" diye sunuluyor. **FTC/accessiBe emsali → düzenleyici risk** |
| AI-05 | Prompt injection — taranan sitenin HTML'i işaretsiz prompt'a giriyor | Kötü niyetli site overlay yasağını ve uyum-iddiası yasağını override edebilir |

**UX**

| ID | Bulgu |
|---|---|
| F-02 | `Dialog` focus trap yok — üstelik bileşen hiç kullanılmıyor, yerine 3 ad-hoc desen (native `confirm()` dahil) var. `docs/design-system.md:111` "focus trap" olduğunu iddia ediyor |
| F-07 | `Checkbox`/`Switch` id'leri `Math.random()` → hydration mismatch |
| F-33 | **Mobilde Monitors / AI Assistant / Reports / Team / Billing hiç erişilemiyor** — SideNav `hidden lg:flex`, hamburger yok |
| F-18 | `/pricing` ve `/legal/*`'ta `<main id="main">` yok → skip link kırık (WCAG 2.4.1) |
| F-26 | Route bazlı `loading.tsx` yok — dashboard iskeleti tüm `/app/*`'ta |

### 3.3 Dogfooding ironisi — en yüksek marka riski

`src/components/compliance/ManualReviewChecklist.tsx` müşteriye 6 madde sorduruyor. Kendi arayüzümüzün cevabı:

| Checklist maddesi (müşteriye sorulan) | Percevia'nın kendi cevabı |
|---|---|
| Modal'da focus trap var mı? | ❌ `Dialog.tsx:24` — `ref` tanımlı, kullanılmıyor |
| Escape ile kapanıyor mu? | ❌ TopNav menüsü, `NotificationsBell` |
| Durum değişiklikleri duyuruluyor mu? | ❌ Uygulamada hiç `aria-live` yok |
| Ok tuşu navigasyonu doğru mu? | ❌ `Tabs.tsx`, `A11ySettingsPanel.tsx` (**erişilebilirlik ayarları panelinin kendisi erişilemez**) |
| Focus görünür mü? | ❌ `sr-only` radio'lar (`scans/new/page.tsx:167`) |
| Form hataları bağlanmış mı? | ❌ `FieldHint` `aria-describedby` ile bağlanmıyor |

**Bu tablo bir rakip, gazeteci veya potansiyel müşteri tarafından 10 dakikada üretilebilir.** Ürünün en büyük tekil riski budur — teknik değil, itibar riskidir.

---

## 4. Stratejik Karar Katmanı (CEO)

### 4.1 Konumlandırma gerilimi ve çözümü

**Gerilim:** Percevia bilinçli olarak uyumluluk vaat etmiyor. Bu dürüst ve FTC sonrası dünyada hukuken dayanıklı — ama alıcının bütçesi "compliance" kaleminden geliyor ve dürüstlük aciliyet yaratmıyor.

**Çözüm — vaadi değiştirmeden aciliyeti taşımak:** Alıcının gerçekte istediği şey uyumluluk değil, **avukatına veya denetçisine verebileceği bir kayıt**. accessiBe "automated proof of effort" satıyor, AudioEye "Assurance" mali garanti satıyor, UserWay "Litigation Support" satıyor. Percevia bunları sunmamalı. Ama şunu sunabilir:

> **"Erişilebilirlik Çalışma Dosyası"** — zaman damgalı tarama geçmişi, kapatılan ve açık issue kaydı, remediation planı ve erişilebilirlik beyanı. Tek PDF. Avukatınıza veya denetçinize verilebilir.
> *Bu bir uyumluluk sertifikası değildir ve hukuki savunma garantisi vermez.*

Bu paket **mevcut parçalardan** (monitör + remediation task + PDF export + paylaşılabilir link + beyan üretimi) sıfır yeni motor mühendisliğiyle kurulabilir. Uyumluluk vaat etmeden hukuki alıcının gerçek ihtiyacını karşılar.

**Önerilen konumlandırma cümlesi:**

> **Percevia — bulmakla değil, kapatmakla ölçülen erişilebilirlik platformu.**
> Otomatik testler ihlal hacminin ~%57'sini yakalar. Biz kalanı gizlemiyoruz; bulduğumuzu kapattığınızı yeniden tarayarak kanıtlıyoruz.

Mesajlaşma çerçevesi:

| Vaat ETMİYORUZ | Vaat EDİYORUZ |
|---|---|
| WCAG / ADA / EAA uyumluluğu | Zaman damgalı, doğrulanabilir kapanış kaydı |
| Sertifika, "%100", "tam uyumlu" | Kapatılan issue sayısı ve ortalama kapanış süresi |
| Overlay ile tek tıkla düzeltme | Kod düzeyinde, insan onaylı düzeltme önerisi |
| Otomatik testin her şeyi bulduğu | ~%57 tavanının ürün içinde görünür olması |

### 4.2 Hedef segment sıralaması

| # | Segment | Neden | Zamanlama |
|---|---|---|---|
| **1** | **Türkiye — kamu, üniversite, belediye, banka, özel hastane, telekom** | 2026 denetim yılı; uyum süresi doldu; **yerli rakip yok**; Türkçe sayfalar +%17,9 hata; hedef liste kamuya açık; Türkçe LLM çıktısı makine çevirisine karşı gerçek üstünlük | **Şimdi** |
| **2** | **Ajans / white-label (TR + AB)** | Dağıtım çarpanı; ajanslar 20–200 site yönetiyor; şu an ya overlay satıyorlar (itibar riski) ya hiçbir şey. Ekip daveti altyapısı zaten var | Faz 2 |
| **3** | **Geliştirici / PLG freemium (global)** | 1 ve 2'yi besleyen huni; Pope Tech'in bandı; ücretsiz plan düzeltildikten sonra | Sürekli |
| **4** | **AB / EAA orta ölçek** | Ekim 2026 EN 301 549 güncellemesi tüm AB müşterisinde yeniden tarama yaratıyor; veri egemenliği kancası | 2026 H2 → 2027 |
| — | ~~ABD kurumsal~~ | VPAT + SOC 2 + manuel denetim hizmeti gerektiriyor; DOJ ertelemesi talebi 2027'ye itti. **Şu an girilmemeli** | Değerlendirme dışı |

**Overlay göç kampanyası** bir segment değil, bir **edinim kampanyası**: AudioEye'ın 127.000 müşterisi ve UserWay'in 1M+ sitesi, ödeme isteği kanıtlanmış bir havuz. Kanca: ücretsiz **"overlay teşhis taraması"** — sitenizde overlay var mı, overlay'e rağmen hangi ihlaller duruyor. Son derece paylaşılabilir, düşük efor, yüksek PR değeri.

### 4.3 Moat değerlendirmesi

| Aday | Gerçek moat mi? | Kopyalanma süresi | Yatırım | Karar |
|---|---|---|---|---|
| **Closed-loop doğrulanmış remediation** (patch → PR → preview re-scan → kanıt) | **Evet** — doğrulama altyapısı + geri bildirim veri döngüsü | 12–24 ay | L | **Yatır — ana farklılaştırıcı** |
| **Bileşen/template düzeyi clustering** | Yarı-moat — Playwright DOM avantajı + biriken veri | 9–15 ay | M | **Yatır** |
| **Türkiye yerelleştirmesi + Bakanlık kontrol listesi eşlemesi** | Evet, ilişki/dağıtım moat'ı | 6–12 ay avantaj | M | **Yatır — en yakın gelir** |
| **Privacy-first / veri egemenliği** | Tek başına değil; ama **kimse kopyalamıyor** → 12–18 ay açık pencere. TR/AB kamu-banka satın almasında eleme kriteri | 12–18 ay | S–M | **Yatır — ucuz, yüksek getirili** |
| CI/PR + MCP entegrasyonu | Hayır — tablo bahsi | 3–6 ay | M | Yap ama moat sayma |
| Fiyat | Hayır — yarışa davet | 0 | — | Silah olarak kullanma |
| axe-core tabanlı tespit | Hayır — emtia | — | — | **Rekabet etme** |

### 4.4 Önerilen fiyatlandırma

**Değer metriği değişikliği:** "günlük tarama × sayfa/tarama" → **aylık sayfa havuzu + AI istek kotası**. Neden: (a) kullanıcı "3 sayfa" görüp ürünü eliyor, (b) AI maliyeti şu an tamamen kontrolsüz, (c) aylık havuz hem daha cömert algılanıyor hem tahmin edilebilir maliyet veriyor.

| Plan | Fiyat (yıllık / aylık) | Sayfa/ay | Site | Üye | AI isteği/ay | Monitör | Öne çıkan |
|---|---|---|---|---|---|---|---|
| **Free** | €0 kalıcı | **50** | 1 | 2 | 25 | — | Web raporu, AI açıklama örneği |
| **Starter** | €25 / €29 | 750 | 3 | 3 | 300 | 3 haftalık | PDF, Çalışma Dosyası |
| **Agency** | €99 / €119 | 4.000 | ∞ | 10 | 2.000 | 25 günlük | White-label, ajans paneli |
| **Team** | €229 / €269 | 12.000 | ∞ | 25 | 7.500 | 100 günlük | CI/PR, roller, API |
| **Enterprise** | Sözleşme | Özel | ∞ | 200 | Sözleşme + aşım | 500 | Veri konumu, DPA, SSO |

**Gerekçeler:**
- **Free 50 sayfa/ay**, Pope Tech'in 25'ini ikiye katlıyor ve "3 sayfa" algı sorununu ortadan kaldırıyor. 2 kullanıcı ile eşleşiyor.
- **Starter €25 yıllık**, Pope Tech Team ($25/ay) ile birebir aynı fiyat — **farkımız AI ve Türkçe**. Mevcut €39'dan düşürmek, huninin ilk ödeme adımını Pope Tech'e karşı nötralize ediyor.
- **AI kotası her plana yazılmalı.** Bu hem maliyet tavanı hem yükseltme kaldıracı. AI maliyeti Faz 2 sonrası istek başına ~$0.005'e indiğinde (bkz. §6.3) Free planın AI maliyeti aylık ~$0.10 olur.
- Starter'ın mevcut "50 tarama/gün × 50 sayfa" cömertliği kaldırılıyor — bu fiyatta savunulamaz.

### 4.5 Metrikler

| Metrik | Tanım | Neden |
|---|---|---|
| **Kuzey Yıldızı** | **Ayda doğrulanmış kapatılan issue sayısı** — "fixed" işaretlenmiş ve yeniden taramada gerçekten kapandığı doğrulanmış | Tespit değil sonuç ölçüyor; kategorinin güvenilirlik krizine doğrudan cevap |
| Aktivasyon | Kullanıcı ilk 7 günde ≥1 issue'yu kapatıp yeniden taramada doğruladı | "Tarama yaptı" yeterli değil — değer kapanışta |
| Retention göstergesi | 30. günde aktif monitörü olan workspace oranı | Monitör = alışkanlık = düşük churn |
| Kalite | AI çıktısı 👍 oranı; eval golden set skoru | AI'ın gerçekten çalıştığının kanıtı |
| Sağlık | Tarama başarı oranı; p95 kuyruk süresi; boş AI yanıt oranı | Faz 0 çıktılarının doğrulaması |
| Marj | Workspace başına aylık LLM + compute USD | Şu an ölçülmüyor (AI-18) |

---

## 5. Hedef Ürün Vizyonu

### 5.1 "Prime form" ne demek — somut tanım

| Boyut | Bugün | 6 ay | 18 ay |
|---|---|---|---|
| **Tespit** | axe-core + heuristics | + bileşen düzeyi clustering + FP triage | + VLM ile görsel/layout kriterleri |
| **Açıklama** | Tek atımlık prompt, muhtemelen boş | Streaming + cache + RAG grounded + Türkçe | Taksonomi-güdümlü, atıflı, ölçülmüş |
| **Düzeltme** | Kod örneği metni | Guided patch (unified diff + doğrulama komutu) | **Doğrulanmış PR**: patch → draft PR → preview re-scan → kanıt |
| **Kanıt** | PDF rapor | Erişilebilirlik Çalışma Dosyası | Değişmez, zaman damgalı kapanış kaydı |
| **Entegrasyon** | Yok | GitHub App PR yorumu | MCP sunucusu (Claude Code / Cursor / VS Code) |
| **Pazar** | Genel İngilizce | Türkçe tam yerelleştirme + Bakanlık eşlemesi | AB çok dilli + ajans kanalı |

### 5.2 Farklılaştırıcının teknik gerekçesi

Akademik literatür, "AI kodunuzu düzeltir" iddiasının neden kanıtsız yapılamayacağını gösteriyor:

- **Concordia (arXiv:2605.27716):** LLM yamaları %99,7 sözdizimsel geçerli, vakaların %80,2'sinde uyumu iyileştiriyor — **ama %26'dan azı ihlali tam kapatıyor ve ~%30'u yapısal değişiklik sokuyor.** Ayrıca iteratif agent döngüsü maliyeti **%52 artırıyor, sonucu iyileştirmeden.**
- **AccessGuru (arXiv:2507.19549):** Taksonomi-güdümlü prompting (Syntactic/Semantic/Layout) ihlal skorunda %84'e varan azalma — jenerik prompt'un %50'sine karşı. **Ders: tek prompt değil, ihlal sınıfına özel strateji.**
- **Çok-modlu değerlendirme (arXiv:2509.18965):** Modeller "bilmiyorum" demekte belirgin şekilde kötü. **Ders: güven skoru modelin kendi beyanına değil, dış sinyallere (kural tipi, RAG hit, re-scan sonucu) dayanmalı.**

**Çıkarım:** LLM yamalarının çoğu ihlali kapatmadığı için, **"kapanmadı" diyebilen ilk araç güven pazarını alır.** Doğrulama katmanı ürünün kendisidir. Ve agent döngüsü körlemesine maliyeti artırdığı için, **döngü sayısı 2 ile sınırlanmalıdır — bu bir mühendislik değil marj kararıdır.**

---

## 6. Yol Haritası

Dört faz, 16 hafta. Her fazın çıkış kriteri ölçülebilir.

### Faz 0 — Kanamayı durdur (Hafta 1–2)

**Amaç:** Aktif istismar edilebilir, gelir kaybettiren ve ürünün manşet metriğini yanlışlayan hataları kapat. Yeni özellik yok.

| # | İş | Bulgu | Efor |
|---|---|---|---|
| 0.1 | **Doğrulama boşluğunu kapat:** repoyu iCloud dışına taşı, `npm run typecheck` + `npm test` + `npm run test:e2e` çalıştır, sonuçları kaydet | Metodoloji | S |
| 0.2 | `statement` route'unda `escapeHtml` uygula; `href`'i `mailto:`/`https?:` allowlist'ine bağla; **hatalı testi düzelt** | B01 | S |
| 0.3 | `plan/select` prod'da fail-closed | B02 | S |
| 0.4 | Retry route'una `create_scans` izni + `reserveScanQuota` + eşzamanlılık kontrolü | B03 | S |
| 0.5 | 6 route'a eksik `view_scans` kontrolü; `/api/notifications`'a izin kontrolü | B34, B12 | S |
| 0.6 | `verifySessionCookie`'yi try/catch'e al → 401 | B06 | S |
| 0.7 | **Skor doğruluğu:** `NormalizedPage`'e `failed: true`, skorlamada hariç tut, raporda ayrı göster | B07 | M |
| 0.8 | Yetim pageJob'ları sweep'te `failed` yap; `drainWork`'e backoff | B04 | M |
| 0.9 | Terminal yazımlarını transaction'a al (`status==="running" && claimedBy===workerId`) | B05 | M |
| 0.10 | **AI'ı gerçekten çalıştır:** `max_output_tokens` ≥8.000, `reasoning.effort: "low"`, `status !== "completed"` kontrolü, `AbortSignal.timeout(60s)`, retry+backoff | AI-01/02/03/17 | S |
| 0.11 | Mock'u prod'da fail-closed yap; `modelProvider` rozetini her zaman göster | AI-04 | S |
| 0.12 | `usage` + hesaplanan USD'yi audit log'a yaz; `listIssues`'a limit geç | AI-18, AI-07 | S |
| 0.13 | **Sahte kontrolleri kaldır veya bağla:** filtre çipleri, Compliance bölge butonları, Notifications switch'leri, print butonu, TopNav arama | F-03/04/05/09/10 | M |
| 0.14 | `aria-live` bölgesi ekle (progress ekranı önce), `aria-busy` doğru kullan | F-01 | S |
| 0.15 | `<main id="main">` eksiklerini kapat (pricing, legal layout, auth fallback); `error.tsx`'te iç içe `<main>` düzelt | F-18, F-17 | S |
| 0.16 | `Checkbox`/`Switch` → `useId()` | F-07 | S |
| 0.17 | `/app/states` prod'da `notFound()` + prefetch listesinden çıkar | F-34 | S |

**Çıkış kriteri:** Tüm P0 kapalı. `npm test` ve `typecheck` yeşil ve CI'da zorunlu. AI paneli gerçek, dolu yanıt döndürüyor ve bu bir ekran görüntüsüyle kanıtlanmış. Tarama skoru başarısız sayfaları hariç tutuyor.

### Faz 1 — Kendi ürünümüzü dürüst yap (Hafta 3–6)

**Amaç:** Marka riskini kapat, akıcılığı ölç, AI'ı ölçülebilir bir sisteme çevir.

| # | İş | Bulgu | Efor |
|---|---|---|---|
| 1.1 | **A11y dogfooding turu:** `Dialog` focus trap + tek `ConfirmDialog`; `Tabs`/`A11ySettingsPanel` klavye desteği; heading hiyerarşisi (`CardTitle` `as` prop); `FieldHint` ↔ `aria-describedby`; Team tablosu `<thead>`; sr-only radio focus | F-02/06/11/12/13/19/29/37 | L |
| 1.2 | **Percevia'yı Percevia ile tara ve sonucu yayınla** — kendi raporumuzu public paylaşılabilir link olarak sitede göster | Marka | S |
| 1.3 | Mobil navigasyon: bottom nav "More" + drawer | F-33 | M |
| 1.4 | Route bazlı `loading.tsx` (scans/[id], remediation, team, compliance) | F-26 | M |
| 1.5 | Optimistic UI: `useOptimistic`/`useTransition` — issue actions, invite, monitors, plan picker, workspace setup | F-08/36/48 | M |
| 1.6 | Polling sertleştirme: backoff + jitter + `visibilityState` gating + hard timeout; bildirim polling'i arka planda durdur; bitmiş taramada saat interval'ını durdur | F-22/23/24/25 | S |
| 1.7 | Prefetch'i tek sefere indir veya `AppRoutePrefetcher`'ı kaldır | F-35 | S |
| 1.8 | Dashboard veri çekimini paralelleştir; `listIssues` limitle; rapor sayfasına lazy grup açılımı | F-27/28 | M |
| 1.9 | Design system temizliği: `ink-800` token, Tailwind palet karışması, `AlertCallout` tekilleştirme, ölü CSS | F-30/31/32/41 | M |
| 1.10 | **AI provider abstraction** + resmi SDK + model routing + fallback zinciri; model adı testini kaldır | AI-09/23 | M |
| 1.11 | **SSE streaming** + UI progressive render | AI-11 | M |
| 1.12 | **Deterministik cache** (`ruleId + framework + htmlShape` hash) + prompt caching için prefix yeniden düzenleme | AI-06/08 | M |
| 1.13 | Prompt injection sertleştirme: `<untrusted_data>` kanalı + escaping + injection detector; HTML snippet'e PII redaction (mevcut `TEXT_SENSITIVE_PATTERN`'i yeniden kullan) | AI-05/14 | M |
| 1.14 | **AI plan kotası + workspace USD bütçesi**; limiter AI için fail-closed | AI-13 | M |
| 1.15 | AI çıktısına 👍/👎 → `aiFeedback` koleksiyonu (eval dataset'inin tohumu) | AI-22 | S |
| 1.16 | `sanitize()`'ı tüm alanlara uygula; regex'leri `[\s\-]+` yap; sözlüğü genişlet ("ADA compliant", "conformant", "meets WCAG", "certif(y\|ication)") | AI-10 | S |
| 1.17 | Firestore borçları: eksik `auditLogs` index, `clearScanResultCollections` chunk'lama, severity sıralaması, N+1'ler | B09/11/13/15/16 | M |
| 1.18 | Webhook idempotency + `modifiedAt` sıralama koruması | B20 | M |
| 1.19 | Scheduler tanımlarını repoya al (`scripts/deploy-cloud-run.sh` veya Terraform) + healthz'e "son sweep" alanı | B31 | M |

**Çıkış kriteri:** Kendi ürünümüz WCAG 2.2 AA otomatik taramasından temiz geçiyor ve bu public olarak kanıtlanmış. AI streaming ile yanıt veriyor, cache hit oranı ölçülüyor, workspace başına AI maliyeti audit log'dan raporlanabiliyor. Lighthouse/axe skorları kaydedilmiş (ilk gerçek runtime ölçümü).

### Faz 2 — Ticari yeniden konumlandırma (Hafta 5–10, Faz 1 ile paralel)

**Amaç:** Huninin tepesini onar, Türkiye'yi aç, ana metriği değiştir.

| # | İş | Kaynak | Efor |
|---|---|---|---|
| 2.1 | **Fiyatlandırma modelini değiştir:** aylık sayfa havuzu + AI kotası; `entitlements.ts` + `pricing/page.tsx` + `scans/new` cap uyumu (F-43) | §4.4 | M |
| 2.2 | **"Erişilebilirlik Çalışma Dosyası"** PDF paketi — mevcut parçalardan; net sorumluluk reddi ile | Boşluk 7 | M |
| 2.3 | **Ana metriği değiştir:** dashboard'da "bulunan hata" yerine **kapatılan hata + kapanış süresi + burn-down** | Boşluk 2 | M |
| 2.4 | **Türkçe yerelleştirme:** UI + **LLM ile Türkçe issue açıklaması ve düzeltme önerisi** (makine çevirisi değil, doğrudan üretim) | Boşluk 6 | L |
| 2.5 | Bakanlık **A Düzeyi Kontrol Listesi** eşlemeli rapor şablonu + Türkçe erişilebilirlik beyanı | Boşluk 6 | M |
| 2.6 | Ücretsiz **"overlay teşhis taraması"** pazarlama aracı (login'siz, paylaşılabilir) | Boşluk 4 | M |
| 2.7 | Ürün içine **%57 tavanını ve WebAIM uyarısını** görünür yerleştir; `docs/microcopy.md:84-85` kuralına uyarak disclaimer yığılmasını tekilleştir (F-45) | S1, F-45 | S |
| 2.8 | **Bileşen/template düzeyinde issue clustering** + kalıcı "dismiss" kuralı (bu FP'yi tüm sitede bir daha gösterme) | Boşluk 3 | L |
| 2.9 | AB/Türkiye **veri konumu seçeneği** + LLM veri işleme şeffaflık sayfası + hazır DPA | Boşluk 5 | M |
| 2.10 | Heuristic FP düzeltmeleri (skip-link href pattern'i, `aria-labelledby` çözümü) | AI-21 | S |

**Çıkış kriteri:** Yeni fiyatlandırma canlı. Türkçe UI + Türkçe AI çıktısı çalışıyor. İlk 10 Türk kurumuna outbound gitmiş. Dashboard'un manşet sayısı artık kapanış.

### Faz 3 — Zeka katmanı (Hafta 9–16)

| # | İş | Bölüm | Efor |
|---|---|---|---|
| 3.1 | **RAG korpusu:** WCAG 2.2 SC + ARIA APG + axe-core 4.11 kural dokümanı + framework pattern kütüphanesi | AI §5.4 | L |
| 3.2 | Retrieval + `citations` şema alanı + citation validator (halüsinasyon önleme) | AI §5.4 | M |
| 3.3 | **Taksonomi-güdümlü prompting** (Syntactic / Semantic / Layout — AccessGuru yaklaşımı, ~1,7× etkinlik) | AI §3.3 | M |
| 3.4 | **Güven skoru + FP triage** (kural + LLM hibrit, dış sinyallere dayalı) + Triage Inbox UI | AI §5.7 | M |
| 3.5 | **Eval harness + golden dataset v1** (150 vaka) + CI regresyon + halüsinasyon detektörü | AI §8 | L |
| 3.6 | **Guided patch:** repo bağlantısız unified diff + doğrulama komutu | AI §5.5 | M |
| 3.7 | GitHub App: PR'da "bu PR N yeni erişilebilirlik ihlali ekliyor" yorumu | Boşluk 8 | M |

**Çıkış kriteri:** Golden set skoru ölçülüyor ve CI'da regresyon koruması var. AI çıktısı atıflı. FP triage kullanıcının gördüğü gürültüyü ölçülebilir şekilde azaltmış.

### Faz 4 — Farklılaştırma (Hafta 16+)

| # | İş | Not |
|---|---|---|
| 4.1 | **Doğrulanmış PR:** patch → draft PR → preview URL'i mevcut Playwright runner ile yeniden tara → kapanış kanıt raporu. **Döngü sayısı 2 ile sınırlı** (Concordia maliyet bulgusu) | Ana moat |
| 4.2 | **VLM katmanı:** alt-text kalitesi, görsel sıra, gruplama. Altyapı hazır (`visual-evidence.ts` crop + redaction + bbox). **Şart: ayrı consent bayrağı + `/legal/ai-use` güncellemesi** (sayfa şu an "ekran görüntüsü göndermiyoruz" diyor) | %43'lük insan yargısı alanına giriş |
| 4.3 | **MCP sunucusu** — Percevia bulgularını Claude Code / Cursor / VS Code'a taşı. Siteimprove'un Haziran 2026'da yaptığı hamlenin dengi; küçüklük burada hız avantajı | Kategori yeni açılıyor |
| 4.4 | Ajans multi-tenant paneli + white-label rapor | Dağıtım çarpanı |
| 4.5 | Embedding tabanlı semantik retrieval | Serbest metin assistant sorguları |

### 6.3 AI maliyet projeksiyonu

Doğrulanmış fiyat: `gpt-5.3-codex` — $1,75 input / $0,175 cached input / $14,00 output (1M token).

| Aşama | Cache hit | Ucuz model payı | Efektif $/istek | Değişim |
|---|---|---|---|---|
| Bugün | %0 | %0 | $0,0300 | — |
| Faz 1 | %55 | %60 | **$0,0059** | **−80%** |
| Faz 3 | %70 | %60 | **$0,0048** | **−84%** |

Plan başına aylık AI maliyeti (Faz 3 sonrası): Free $0,10 · Starter $0,96 · Agency $7,20 · Team $24,00.
Doğrulanmış PR akışı (Faz 4): PR başına ~$0,17 LLM + re-scan compute → **plan bazlı "ayda N doğrulanmış PR" olarak paketlenmeli, sınırsız sunulmamalı.**

> **Uyarı:** Ucuz model tier fiyatları bu denetimde doğrulanamadı ($0,25/$2,00 varsayımıyla modellendi). Uygulamadan önce OpenAI pricing sayfasından teyit edilmeli.

---

## 7. Risk Kaydı

| # | Risk | Olasılık | Etki | Azaltma | Erken uyarı sinyali |
|---|---|---|---|---|---|
| R1 | **P0 XSS istismar edilir** | Düşük–Orta | Çok yüksek | Faz 0.2 — bu hafta | Sayfa public, hedef bulunması kolay |
| R2 | **"A11y ürünü kendi sitesinde WCAG ihlal ediyor" haberi** | Orta | Çok yüksek (kategoride ölümcül) | Faz 1.1 + 1.2; kendi raporumuzu yayınla | Sosyal medyada bir uzmanın ürünü axe ile taraması |
| R3 | **AI mock'u gerçek AI diye sunulması → FTC benzeri iddia** | Orta | Yüksek | Faz 0.11 — prod'da fail-closed + provenance rozeti | Kullanıcının "bu çıktı hep aynı" demesi |
| R4 | **AI maliyet suistimali** ($43/kullanıcı/gün maruziyet) | Orta | Yüksek | Faz 0.12 (ölçüm) → Faz 1.14 (bütçe + fail-closed limiter) | OpenAI faturasında ani sıçrama |
| R5 | **Pope Tech ile doğrudan çakışma** | Yüksek | Orta–Yüksek | Faz 2.1 fiyat + Faz 2.4 Türkçe + AI farkı | Karşılaştırma aramalarında kayıp |
| R6 | **"axe zaten ücretsiz, neden ödeyeyim"** | Yüksek | Orta | Motorda değil clustering/kapanış/kanıtta konumlan (§4.1) | Demo'da bu itirazın sıklığı |
| R7 | **Platform gömülmesi** (Vercel/Netlify/GitHub a11y'yi native yaparsa) | Orta | Yüksek | Kapanış + kanıt + yerel pazar katmanına yatır; motor katmanına yatırma | Bu oyuncuların a11y duyuruları |
| R8 | **OpenAI tek sağlayıcı bağımlılığı** | Orta | Orta | Faz 1.10 provider abstraction + fallback | Fiyat/model politikası değişikliği |
| R9 | **VPAT/SOC 2 yokluğu B2B/B2G ihalelerinde eleme** | Yüksek (o segmentte) | Orta | ABD kurumsalı şimdilik hedefleme; TR/ajans segmentine odaklan | RFP'lerde tekrarlayan VPAT talebi |
| R10 | **Yanlış "temiz" raporu → hukuki iddia** | Düşük–Orta | Yüksek | %57 tavanını ürün içinde görünür kıl (Faz 2.7); B07 skor hatasını kapat (Faz 0.7) | Müşterinin "temiz çıktı ama dava aldım" bildirimi |
| R11 | **Küçük ekip / tek kişi riski** | Yüksek | Orta | Runbook kalitesi zaten iyi; scheduler tanımlarını repoya al (Faz 1.19) | Bilgi tek kişide toplanması |
| R12 | **Kategori güvenilirlik krizi** — alıcı "bu ürünler işe yaramıyor" der | Orta | Yüksek | Kuzey yıldızının kapanış olması bu riski **fırsata çeviriyor** | Sektör basınında araç eleştirisi artışı |

---

## 8. Çalışma Şekli ve Yönetişim

1. **Faz 0 tek başına, paralelsiz.** Kritik hata düzeltmeleri özellik geliştirmeyle karıştırılmamalı. Her düzeltme kendi testiyle gelmeli — özellikle B01, çünkü mevcut test hatalı davranışı kilitliyor.
2. **Her bulgu ID'si bir issue.** `B01…B47` (mühendislik), `F-01…F-50` (UX), `AI-01…AI-23` (yapay zeka). Bu plan backlog'un kendisidir; ayrıca bir liste üretmeye gerek yok.
3. **CI kapıları.** Faz 0 sonunda: `typecheck` + `test` + `lint` zorunlu; Faz 1 sonunda: e2e authenticated lane; Faz 3 sonunda: AI eval regresyon eşiği.
4. **Dogfooding kuralı.** Her sürümden önce Percevia kendi kendini tarar. Yeni kritik/serious bulgu varsa sürüm çıkmaz. Bu, hem ürünü hem tarayıcıyı test eder.
5. **Doküman-kod sapması yasağı.** `docs/design-system.md`, `docs/ux-flows.md` ve `docs/microcopy.md` şu an var olmayan davranışları anlatıyor (F-13, F-50, F-41). Her faz sonunda dokümanlar gerçeğe çekilmeli — aksi halde plan yanlış varsayımlar üzerine kurulur.
6. **Ölçmeden iddia etme.** AI'ın çalıştığı, akıcılığın arttığı, FP'nin azaldığı — hepsi ölçümle kanıtlanmalı. Bu ürünün tüm konumlandırması "kanıt" üzerine kurulu; iç süreç de öyle olmalı.

---

## 9. Doğrulanamayanlar ve Varsayımlar

Bu bölüm kasıtlı olarak uzun tutulmuştur; planın hangi kısımlarının teyit gerektirdiğini gösterir.

**Kod tarafı**
- `npm run typecheck`, `npm test`, `npm run test:e2e` **çalıştırılamadı** (sandbox FS hatası). Tüm bulgular statik okuma.
- Cloud Scheduler job'larının gerçekten var olup olmadığı repo dışı — B31 bu yüzden kritik.
- Polar'ın `canceled` durum semantiği ve webhook retry davranışı doğrulanmadı.
- `POLAR_ACCESS_TOKEN`'ın prod'da set olup olmadığı bilinmiyor — B02'nin canlı olup olmadığı buna bağlı.

**UX tarafı**
- Hiçbir runtime metriği ölçülmedi. CLS/LCP/INP maddeleri kod kaynaklı **risk tespitidir**, ölçüm değildir.
- Renk kontrastı Tailwind sınıflarından tahmin edildi; gerçek hesaplama yapılmadı.

**AI tarafı**
- **AI-01'in prod'da gerçekten boş yanıt üretip üretmediği doğrulanmadı.** Tek bir gerçek API çağrısıyla `usage.output_tokens_details.reasoning_tokens` loglanarak teyit edilmeli — Faz 0'ın ilk işi.
- Ucuz model tier fiyatları doğrulanmadı; maliyet modelindeki "ucuz model" satırları varsayım.
- VLM görüntü token maliyeti doğrulanmadı.

**Pazar tarafı**
- Deque'in resmî fiyat sayfası scrape edilemedi; $40–45/ay rakamı ikincil kaynaklı.
- AudioEye, Silktide, Level Access, Siteimprove, accessFlow fiyat yayımlamıyor — üçüncü taraf rakamlar `[3P]` etiketli, liste fiyatı değil.
- Reddit/HN'den doğrudan kullanıcı alıntısı bulunamadı; uydurulmadı, rapora konmadı.
- **Türkiye 2025/10 Genelgesi'nin WCAG 2.1 mi 2.2 mi referans aldığı kaynaklar arası çelişkili** — Bakanlık kontrol listesinden doğrulanmalı. Faz 2.5 buna bağlı.
- "Gizlilik/veri egemenliği beyaz alan" bir **hipotez**; doğrulanmış pazar verisi değil. Rakiplerin bunu pazarlamaması boşluğun kendisi olabilir de olmayabilir de.
- Fiyatlandırma önerisindeki dönüşüm varsayımları modellenmemiştir; A/B veya kohort testiyle doğrulanmalı.

---

## 10. Özet Karar Tablosu — Şimdi / Sonra / Asla

| Şimdi (Hafta 1–10) | Sonra (Hafta 10+) | Asla / şimdilik hayır |
|---|---|---|
| P0 XSS + P1 güvenlik/gelir açıkları | RAG + taksonomi prompting | Uyumluluk veya sertifika vaadi |
| Skor doğruluğu (B07) | Doğrulanmış PR (moat) | Overlay veya overlay benzeri widget |
| AI'ı gerçekten çalıştır (AI-01/02/03) | VLM katmanı | Hukuki savunma garantisi / "Assurance" tarzı taahhüt |
| Kendi a11y'mizi düzelt + kanıtla | MCP sunucusu | Kendi VPAT/manuel denetim hizmetimizi kurmak |
| AI plan kotası + bütçe | Ajans multi-tenant paneli | ABD kurumsal segmenti (VPAT/SOC 2 olmadan) |
| Ücretsiz planı yeniden çerçevele | Eval harness + golden set | On-prem scanner (talep kanıtlanmadan) |
| Erişilebilirlik Çalışma Dosyası | GitHub App PR yorumu | Mobil uygulama/PDF taraması (2027 öncesi) |
| Türkçe yerelleştirme + Bakanlık eşlemesi | Çok dilli AB genişlemesi | Motorda axe-core ile rekabet |
| Ana metriği kapanışa çevir | Bileşen düzeyi clustering v2 | Fiyat savaşına girmek |

---

*Bu plan dört bağımsız denetim raporunun sentezidir. Her iddia ilgili ek dosyada dosya:satır veya URL kaynağıyla desteklenmiştir. Kaynaksız veya doğrulanamamış hiçbir rakam bu dokümanda kesinlik iddiasıyla sunulmamıştır.*
