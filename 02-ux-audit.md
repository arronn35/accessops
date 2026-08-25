# Percevia AI — UX, Erişilebilirlik ve Uygulama Kılavuzu (V2)

**Denetim tarihi (V1):** 2026-07-27 · **V2 derinleştirme:** 2026-07-27
**Kapsam:** `/Users/efearronn/Desktop/dev/accessops` — Next.js 16.2.6 App Router, React 19.2.4, Tailwind v4, Firebase/Firestore, Playwright + `@axe-core/playwright` (bağımlılıkta mevcut, kullanılmıyor)
**Yöntem:** Statik kod analizi (Read/Grep/Glob) + hex değerlerinden **hesaplanmış** WCAG kontrast oranları. Tarayıcıda çalıştırma yapılmadı — **hiçbir runtime metriği (LCP/CLS/INP/TTFB) ölçülmemiştir.** Performans bulguları kod kaynaklı *risk tespitidir*, ölçüm değildir.

---

## 0. V2 hakkında — bu doküman ne, nasıl okunur

V1 bir **denetimdi**: 50 bulgu, bir öncelik tablosu, bir ihlal listesi. V2 bir **uygulama kılavuzu + tasarım spesifikasyonu**. Fark:

| V1 | V2 |
|---|---|
| "F-02: Dialog'da focus trap yok" | F-02 için kopyalanabilir tam bileşen, alternatiflerin trade-off'u, klavye + ekran okuyucu doğrulama adımları |
| "1.4.11 ⚠️ risk" | `line` (#E4E8F0) `paper` (#FFFFFF) üzerinde **1.23:1** — hesaplanmış, ihlal kesin |
| 18 WCAG kriteri incelendi | **WCAG 2.2'nin 55 A/AA kriterinin tamamı** tablolandı (VPAT çekirdeği) |
| "loading/empty/error var/yok" | 8 kritik ekran için durum matrisi + microcopy + tab order + landmark haritası + performans bütçesi |
| — | Ölçüm planı, i18n hazırlığı, CI a11y kapısı, manuel test protokolü, kendi erişilebilirlik beyanımız |

### Bulgu ID sözleşmesi

- **F-01 … F-50** V1'den birebir korunmuştur. Başlık, şiddet ve dosya:satır referansları değişmemiştir. Bazılarının **kapsamı genişletilmiştir** (örn. F-30'un 4 değil 7 kullanımı var) — bu, ayrı bir "Kapsam düzeltmesi" satırı olarak işaretlenmiştir.
- **F-51 … F-62** V2'de eklenen yeni bulgulardır.
- Her bulgunun `§5` içinde bir **kod yaması** varsa "🔧 §5.x" etiketiyle işaretlidir.

### Okuma sırası (role göre)

| Rol | Oku |
|---|---|
| **Frontend geliştirici** | §3 (bulgu tablosu) → §5 (kod yamaları) → §7 (token'lar) |
| **Tasarımcı / PM** | §1 → §6 (ekran spesifikasyonları) → §9 (microcopy) → §10 (yolculuk) |
| **Uyumluluk / satış** | §4 (WCAG matrisi = VPAT çekirdeği) → §11 (kanıtlama planı) |
| **Teknik lider** | §13 (yol haritası) → §8 (algılanan performans) → §11.2 (CI kapısı) |

### Regülatif zemin (neden WCAG 2.2 AA, neden şimdi)

- **EN 301 549** — v4.1.1 revizyonu WCAG 2.2 AA'ya hizalanıyor; OJEU'da yayımlanması Ekim 2026 civarında bekleniyor. AB kamu sektörü ve **EAA** (European Accessibility Act, 28 Haziran 2025'ten itibaren yürürlükte) kapsamındaki özel sektör ürünleri için fiili teknik referans budur.
- **Türkiye** — 2025/10 sayılı Cumhurbaşkanlığı Genelgesi kapsamında kamu dijital hizmetlerinde erişilebilirlik denetimleri 2026 boyunca yoğunlaşıyor. Yerel kamu ihalelerinde WCAG uyum beyanı talebi artıyor.
- **Sonuç:** Percevia'nın hedefi **WCAG 2.2 AA**'dır ve bu **kanıtlanabilir** olmalıdır. §4 bunun beyan tarafı, §11 kanıt tarafıdır.

> ⚠️ **Kriter sayısı düzeltmesi.** Görev tanımında "A: 30, AA: 20 — toplam 50 SC" geçiyor; bu **WCAG 2.1** sayımıdır. WCAG 2.2'de 4.1.1 Parsing kaldırıldı (−1 A), 3.3.7 Redundant Entry eklendi (+1 A) → **A = 30**; AA'ya 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.8 eklendi (+5) → **AA = 25**. Toplam **A+AA = 55**. §4 matrisi 55 satırdır. Bu ayrım VPAT'ta önemlidir; 50 satırlık bir matris eksik beyan sayılır.

---

## 1. Yönetici Özeti

**Genel akıcılık notu: 6.5 / 10** (V1'den değişmedi)
**WCAG 2.2 AA uygunluk notu: 27 / 55 kriter geçer durumda** — 12 kesin ihlal, 11 kısmi/riskli, 5 manuel test gerekli (§4)

Temel mimari sağlıklı: sayfaların büyük çoğunluğu React Server Component, tarama ilerlemesi `onSnapshot` realtime + HTTP polling fallback ile doğru kurgulanmış (`progress-client.tsx:149-191`), prefetch stratejisi düşünülmüş, `prefers-reduced-motion` **hem medya sorgusu hem kullanıcı override'ı** ile destekleniyor (`globals.css:103-121`) — bu çoğu üründen iyi. Ancak ürün **kendi sattığı şeyde** ciddi şekilde başarısız ve arayüzün birkaç yerinde **çalışmayan ama çalışıyormuş gibi görünen kontroller** var.

### En kritik 5 sorun (V1'den korundu)

| # | Sorun | Neden kritik |
|---|---|---|
| **1** | **Uygulamada pratik olarak tek bir `aria-live` bölgesi yok.** `grep aria-live src/` → sadece mock veri (`lib/mock/issues.ts:485,489,492`) ve `ManualReviewChecklist.tsx:144` içinde *müşteriye tavsiye olarak* geçiyor. Tek gerçek canlı bölge: `firebase-callback-client.tsx:126` `role="status"`. Canlı tarama ilerlemesi (`progress-client.tsx:356-371`) ekran okuyucuya duyurulmuyor. | WCAG 4.1.3 (AA) ihlali. Bir a11y tarama ürününün amiral gemisi ekranı ekran okuyucu kullanıcısı için tamamen sessiz. Dogfooding açısından en yıkıcı bulgu. 🔧 §5.1 |
| **2** | **Sahte/ölü kontroller.** Rapor filtre çipleri `<span>` (`scans/[id]/page.tsx:458-500`), Compliance bölge seçici `onClick`'siz (`compliance/page.tsx:216-233`), Settings→Notifications 3 switch state'siz (`settings-client.tsx:161-180`), rapor önizleme "Use browser print" bir `<span>` (`reports/preview/page.tsx:61`), TopNav arama kutusu bağlı değil (`TopNav.tsx:169-173`). | Kullanıcı tıklar, hiçbir şey olmaz. Güven kaybı + WCAG 4.1.2. Bir "dürüstlük" ürününde en pahalı hata tipi. 🔧 §5.3, §5.4 |
| **3** | **`Dialog.tsx` focus trap içermiyor** — `ref` tanımlı ama kullanılmıyor (`:24`), açılışta focus taşınmıyor, kapanışta geri verilmiyor, `aria-labelledby="dlg-title"` sabit ID. Bileşen **hiçbir yerde kullanılmıyor**; yerine 3 farklı ad-hoc onay deseni var. `docs/design-system.md:111` "focus trap" olduğunu iddia ediyor. | WCAG 2.4.3 + 2.1.2. Kendi `ManualReviewChecklist.tsx:44` müşteriye "modal'da focus trap'li mi kontrol et" diyor. 🔧 §5.2 |
| **4** | **`Checkbox`/`Switch` id üretiminde `Math.random()`** (`Checkbox.tsx:14`, `Switch.tsx:13`) → SSR/CSR hydration uyuşmazlığı. | Hydration hatası + form etiketi ilişkisi (WCAG 1.3.1/3.3.2) riski. `useId()` olmalı. 🔧 §5.7 |
| **5** | **Route bazlı `loading.tsx` yok.** Tek `app/app/loading.tsx` dashboard iskeletini gösteriyor; `/app/scans/[id]`, `/app/remediation`, `/app/team`, `/app/compliance` gibi tamamen farklı düzenlerde de aynı iskelet çıkıyor. Tüm bu sayfalar `force-dynamic`. | Algılanan gecikme + görsel sıçrama (CLS riski). 🔧 §5.21, §8.2 |

### V2'de ortaya çıkan 5 yeni kritik bulgu

| # | Yeni bulgu | Kanıt |
|---|---|---|
| **F-51** | **Gövde metni içi linkler yalnızca renkle ayırt ediliyor** ve `blue-600` ile `ink-700` arasındaki kontrast **2.67:1** (< 3:1). Alt çizgi sadece `:hover`'da. | `NoGuaranteeBanner.tsx:24`, `ai-panel.tsx:98`, `settings-client.tsx:134` · WCAG 1.4.1 (A) |
| **F-52** | **`docs/design-system.md:54-58`'deki kontrast iddiaları yanlış.** Doküman "amber 4.6:1, green 4.5:1 — all WCAG AA" diyor. Gerçek (hesaplanmış, `--canvas` üzerinde): **amber-500 = 2.82:1**, **green-500 = 2.82:1**. Rose-500 = 4.83:1 (doküman 5.1:1 diyor). | §4.1 hesap tablosu · Marka riski: bir a11y ürününün tasarım dokümanı ölçülmemiş kontrast iddiası yayınlıyor |
| **F-55** | **Kendi "Larger text" özelliği kısmen bozuk.** `html[data-text-size="lg"] { font-size: 115% }` (`globals.css:72`) yalnızca `rem`-tabanlı boyutları büyütür; koddaki **88 adet `text-[10px]`/`text-[11px]`** (36 dosya) sabit px olduğu için hiç büyümez. | grep: 88 eşleşme · WCAG 1.4.4 (AA) |
| **F-56** | **Aynı hedef için tutarsız etiket:** `/app/remediation` mobilde **"Tasks"** (`MobileBottomNav.tsx:11`), masaüstünde **"Remediation"** (`SideNav.tsx:26`). `/app/compliance` mobilde "Privacy", masaüstünde "Privacy & Compliance". | WCAG 3.2.4 (AA) Consistent Identification |
| **F-57** | **Plan değişikliği onaysız uygulanıyor.** `billingEnabled === false` iken `plan-picker.tsx:74-86` doğrudan `POST /api/plan/select` atıyor; "Choose" tıklaması geri alınamaz bir plan düşürme yapabiliyor, onay/geri alma adımı yok. | `plan-picker.tsx:43-92,178` · WCAG 3.3.4 (AA) Error Prevention |

### Dogfooding ironisi — güncellenmiş tablo

`ManualReviewChecklist.tsx` müşteriye şunları sormasını söylüyor. Kendi arayüzünün cevabı:

| Kendi checklist maddemiz | Percevia AI'ın durumu | Bulgu |
|---|---|---|
| `:44` "Try opening and closing modals, checking if **focus is properly trapped** inside them" | ❌ `Dialog.tsx`'te focus trap yok | F-02 |
| `:49` "Confirm you can escape modals and dropdowns using the **'Escape' key**" | ❌ `TopNav` hesap menüsü ve `NotificationsBell` Escape ile kapanmıyor | F-20, F-21 |
| `:66` "Confirm screen reader announces the **status changes**" | ❌ Uygulamada canlı bölge yok | F-01 |
| `:42` "Use **arrow keys** to navigate menus, radio groups, and tab panels" | ❌ `A11ySettingsPanel`, `Tabs`, `ai-panel` ok tuşu desteklemiyor | F-12, F-13, F-38 |
| `:113` "Confirm that a **clear, visible focus indicator** is present on all active controls" | ❌ `sr-only` radio kartları | F-11 |
| `:62` "Verify form inputs announce their associated visual label, **placeholder, and error message**" | ⚠️ `aria-describedby`/`aria-invalid` yok | F-37, F-58 |
| `:144` "Ensure the error container announces itself automatically (e.g. `role="alert"` or `aria-live="assertive"`)" | ⚠️ `AlertCallout` bunu yapıyor ✅ ama form alanı hataları hiç duyurulmuyor | F-58 |

**Bu tablo, ürünün pazarlama iddiasını (`app/page.tsx` hero: "Find accessibility issues before they become user and compliance problems") en yüksek maliyetle çürüten şeydir.** Yayın öncesi **P0 kapısı:** F-01, F-02, F-03, F-04, F-05 + **A11y kapısı:** F-11, F-12, F-13, F-18, F-51, F-59.

---

## 2. Ekran Envanteri

Loading/Empty/Error sütunları: ✅ var · ⚠️ kısmi/yanlış · ❌ yok · — uygulanamaz

| Rota | Tip | Loading | Empty | Error | Notlar |
|---|---|---|---|---|---|
| `/` (`app/page.tsx`) | RSC (`force-dynamic:15`) | ❌ | — | ❌ | Pazarlama sayfası `force-dynamic` — gereksiz SSR/TTFB. Mobilde header nav `hidden md:flex` (`:63`), hamburger yok → 3 bölüm linki mobilde erişilemez. `<main id="main">` ✅ (`:99`) |
| `/pricing` | RSC + `PricingCta` client | ❌ | — | ❌ | **`<main id="main">` yok** → global skip link kırık (F-18) |
| `/onboarding` | RSC kabuk + client (`onboarding-client.tsx`) | ❌ | — | ⚠️ | Seçilen rol hiçbir yere kaydedilmiyor (F-14). `<main id="main" tabIndex={-1}>` ✅ (`:44`) |
| `/workspace/setup` | RSC + Server Action | ❌ | — | ❌ | Server Action (`:34`); pending state yok → çift submit riski (F-48). `<main id="main">` ✅ (`:23`) |
| `/auth/sign-in` | RSC + `<Suspense>` + client form | ✅ (`page.tsx:27` fallback) | — | ✅ (`:175`) | Fallback `<main>`'de `id="main"` yok (`page.tsx:35`), gerçek formda var (`firebase-sign-in-form.tsx:157`) → skip link fallback anında kırık |
| `/auth/callback` | RSC + client | ⚠️ | — | ✅ | `page.tsx:39` `<main>` id'siz; client `firebase-callback-client.tsx:110` id'li. **Uygulamadaki tek `role="status"` burada** (`:126`) |
| `/auth/verify-request` | RSC | — | — | — | `<main id="main">` ✅ (`:15`) |
| `/invite/[token]` | RSC + client | ❌ | — | ✅ | |
| `/legal/*` (8 sayfa) | RSC + shared layout | ❌ | — | ❌ | `legal/layout.tsx:58` `<main>`'de **`id="main"` yok** → 8 sayfada skip link kırık (F-18) |
| `/app` (dashboard) | RSC (`force-dynamic:19`) | ⚠️ (paylaşımlı) | ✅ (`:82` EmptyState) | ⚠️ (layout error.tsx) | Veri çekimi **seri**: `listScans` → `listIssues` → `getScanSummary` (`:24,27,41`). `listIssues` tüm bulguları çekip 5 tanesini gösteriyor (F-27). Boş `<th>` (`:222`, F-46) |
| `/app/scans/new` | **Client page** (`"use client":1`) | — | — | ✅ (`:308`) | Tüm sayfa client — RSC'ye taşınabilir. Radio inputlar `sr-only` (`:167`) → klavye focus görünmez (F-11). Plan cap uyumsuzluğu (`:223,228`, F-43). Hata sözlüğü ✅ (`:362-405`) — projedeki en iyi hata mesajı örneği |
| `/app/scans/[id]/progress` | RSC → client | ⚠️ | — | ✅ (`:247`) | En iyi kurgulanmış ekran. `aria-live` yok (F-01). 5 sn saat sonsuz tikliyor (`:105-108`, F-24) |
| `/app/scans/[id]` (rapor) | RSC (`force-dynamic:31`) | ⚠️ (paylaşımlı) | ✅ (`:240`) | `notFound()` (`:43`) | Filtre çipleri **çalışmıyor** (`:265-286` kullanım, `:458-500` tanım). Veri çekimi `Promise.all` ✅ (`:48`). Tüm bulgular sayfalama/virtualization olmadan (F-28) |
| `/app/scans/[id]/issues/[issueId]` | RSC + 3 client island | ⚠️ | — | `notFound()` (`:31`) | `IssueActions` state senkron değil (F-08). `docs/ux-flows.md:43-50`'de vaat edilen bölümler yok (F-50) |
| `/app/scans/[id]/compare` | RSC | ⚠️ | ✅ (`:65-87`) | `notFound()` (`:43`) | `bg-ink-900 hover:bg-ink-800` (`:82`) — `ink-800` token yok, hover ölü (F-30) |
| `/app/ai-assistant` | RSC + client | ⚠️ | ✅ (`ai-assistant-client.tsx:173`) | ✅ (`:217`) | Yatay kaydırmalı scan seçici (`:179-210`) `aria-pressed` toggle grubu — radiogroup olmalı. Preset listesi de `aria-pressed` (`:329-342`) |
| `/app/remediation` | RSC | ⚠️ | ✅ (`:50`) | ⚠️ | `<details open>` gruplar (`:63-101`) — server-rendered, iyi. Sunucuda gruplama (`:175-200`) ✅ |
| `/app/monitors` | RSC + client | ⚠️ | ✅ (`monitors-manager.tsx:186`) + plan gate (`page.tsx:51`) | ⚠️ (inline `<p>` `:182`) | Native `confirm()` (`:116`) — tasarım sistemi dışı (F-29). `text-ink-800` ölü token (`:189`) |
| `/app/reports/builder` | **Client page** | ❌ **(kritik)** | ⚠️ **yanlış** (`:136`) | ✅ (`:250`) | Mount'ta fetch (`:51-65`); veri gelene kadar "No completed scans yet" → **loading ≠ empty** (F-15). `useSearchParams()` (`:41`) Suspense sınırı olmadan (F-16) |
| `/app/reports/preview` | RSC | ⚠️ | ✅ (`:70`) | ❌ | Print "butonu" `<span>` (`:61`). `<iframe srcDoc>` (`:65`) — `loading="lazy"` yok |
| `/app/compliance` | RSC + client islands | ⚠️ | ✅ (`:260`) | ✅ (`:255`) | Bölge seçici butonları ölü (`:216-233`). Tek sayfada 4 PostureCard + 3 AlertCallout + 2 NoGuaranteeBanner |
| `/app/compliance/statement` | RSC + client | ⚠️ | ⚠️ | ⚠️ | Tanımsız token'lar: `text-purple-800` (`:218`), `text-ink-800` (`:241`), `text-amber-600` (`:364,439`) |
| `/app/team` | RSC + client | ⚠️ | ⚠️ (`invite-section.tsx:235`) | ⚠️ (`:218`) | Permission tablosunda **`<thead>` yok** — 6 rol sütunu etiketsiz (F-06, `:95-112`). `X` ikonu `text-ink-300` = **1.99:1** kontrast (F-59) |
| `/app/settings` | RSC + client | ⚠️ | — | ⚠️ | Notifications sekmesi tamamen sahte (`settings-client.tsx:161-180`). `Tabs` kullanıyor ✅ ama `Tabs`'ın kendisi klavyesiz (F-13) |
| `/app/settings/profile` | RSC + client | ⚠️ | — | ⚠️ | |
| `/app/settings/billing` | RSC + client | ⚠️ | — | ✅ (`plan-picker.tsx:114`) | Plan düşürme onaysız (F-57). `text-ink-800` ölü token (`page.tsx:58`) |
| `/app/states` | RSC | — | ✅ | ✅ | **İç QA sayfası prod'da erişilebilir** ve `AppRoutePrefetcher.tsx:17`'de prefetch listesinde (F-34) |

**Genel:** 27 rotanın **1 tanesinde** özel `loading.tsx` var; **hiçbirinde** route-level `error.tsx` yok (`app/app/error.tsx` tüm segmenti kapsıyor ve içinde ikinci bir `<main>` render ediyor — F-17).

---

## 3. Bulgu Tablosu

Şiddet: **P0** = ship-blocker · **P1** = bir sonraki sürümde · **P2** = planlanmalı · **P3** = iyileştirme
Efor: **S** ≤2sa · **M** ≤1gün · **L** >1gün

### 3.1 V1 bulguları (F-01 … F-50) — ID'ler korunmuştur

| ID | Başlık | Şiddet | Kategori | Dosya:satır | Etki | Önerilen düzeltme | Efor | Yama |
|---|---|---|---|---|---|---|---|---|
| **F-01** | Uygulamada hiç `aria-live` bölgesi yok; tarama ilerlemesi ekran okuyucuya duyurulmuyor | **P0** | A11y | `progress-client.tsx:356-371`, `:297-354`; grep `aria-live` → 0 üretim kullanımı | WCAG 4.1.3 AA ihlali. Ekran okuyucu kullanıcısı taramanın nerede olduğunu asla bilemez | Adım/sayfa özetini saran `<p role="status" aria-live="polite" aria-atomic="true">`; `aria-busy` ile `<ol>`'u işaretle; gereksiz duyuruyu bastır | S | 🔧 §5.1 |
| **F-02** | `Dialog` focus trap/initial focus/focus restore yok; `ref` kullanılmıyor; sabit `dlg-title` ID | **P0** | A11y | `Dialog.tsx:24,42-51` | WCAG 2.4.3 + 2.1.2. Ayrıca `docs/design-system.md:111` yanlış bilgi veriyor | `useId()` + initial focus + Tab döngüsü + `document.activeElement` geri yükleme + `inert` | M | 🔧 §5.2 |
| **F-03** | Rapor sayfasındaki filtre çipleri interaktif değil (`<span>`) | **P0** | Akış | `scans/[id]/page.tsx:458-500`, kullanım `:265-286` | Kullanıcı "Critical (5)" çipine tıklar, hiçbir şey olmaz. Büyük taramalarda rapor kullanılamaz | `searchParams` tabanlı `<Link>` filtreleri (RSC uyumlu, JS'siz çalışır) | M | 🔧 §5.3 |
| **F-04** | Compliance bölge seçici butonları `onClick` içermiyor | **P0** | Akış | `compliance/page.tsx:216-233` | "highest-trust screen" (`docs/ux-flows.md:105`) üzerinde 3 ölü buton | Gerçek `PATCH /api/workspace` bağla veya `<div>` + "Enterprise'da mevcut" rozetine çevir | S | 🔧 §5.4 |
| **F-05** | Settings → Notifications: 3 Switch tamamen sahte (state/onChange/save yok) | **P0** | Akış | `settings-client.tsx:161-180` | Kullanıcı bildirim tercihini kaydettiğini sanır | Persist et veya "Yakında" olarak `disabled` göster | M | 🔧 §5.5 |
| **F-06** | Team permission tablosunda `<thead>`/sütun başlığı yok; hücreler etiketsiz ikon | **P1** | A11y | `team/page.tsx:95-112` (`<Check>` `:103`, `<X>` `:105`) | WCAG 1.3.1 + 1.1.1. Hangi sütunun hangi rol olduğu bilinemez | `<thead><tr><th scope="col">` + `<th scope="row">` + `sr-only` ikon etiketi | S | 🔧 §5.6 |
| **F-07** | `Checkbox`/`Switch` id'leri `Math.random()` ile üretiliyor → hydration mismatch | **P1** | Performans/A11y | `Checkbox.tsx:14`, `Switch.tsx:13` | SSR/CSR id uyuşmazlığı; `htmlFor` bağı kopabilir | `const inputId = id ?? useId()` | S | 🔧 §5.7 |
| **F-08** | Durum butonları tıklandığında select güncellenmiyor + butonlar disable olmuyor | **P1** | Akıcılık | `issue-actions.tsx:87-109` (`patch()` `:30`) | Kullanıcı "Fixed" der, dropdown hâlâ "To Review" gösterir. Çift tıklama = çift PATCH | `useOptimistic` + `disabled={pending}` + `role="status"` geri bildirim | S | 🔧 §5.8 |
| **F-09** | Rapor önizleme "Use browser print" butonu değil, `<span>` | **P1** | Akış | `reports/preview/page.tsx:61` | Klavye ile erişilemez, tıklanmaz | Client `<button onClick={() => window.print()}>` | S | 🔧 §5.9 |
| **F-10** | TopNav arama input'u hiçbir şeye bağlı değil | **P1** | Akış | `TopNav.tsx:165-175` | "Search scans, issues, pages…" yazıyor ama hiçbir şey aramıyor | Global arama route'u veya input'u kaldır | M | 🔧 §5.10 |
| **F-11** | Radio inputlar `sr-only` — klavye focus göstergesi görünmez | **P1** | A11y | `scans/new/page.tsx:167`, `onboarding-client.tsx:74` | WCAG 2.4.7 Focus Visible ihlali | `sr-only` yerine `absolute opacity-0` + `peer` ve karta `peer-focus-visible:ring-2` | S | 🔧 §5.11 |
| **F-12** | `A11ySettingsPanel` `role="radio"` butonlarında ok tuşu / roving tabindex yok, `type="button"` yok | **P1** | A11y | `A11ySettingsPanel.tsx:34-48` | **Erişilebilirlik ayarları panelinin kendisi erişilemez** | Gerçek `<input type="radio">` + `peer` tabanlı segmented control | M | 🔧 §5.12 |
| **F-13** | `Tabs` bileşeninde klavye desteği yok (ok tuşları, Home/End, roving tabindex) | **P1** | A11y | `Tabs.tsx:54-84`; `docs/design-system.md:110` iddia ediyor | ARIA APG ihlali; doküman/kod sapması | `onKeyDown` + roving `tabIndex` + `TabsList` `aria-label` | M | 🔧 §5.13 |
| **F-14** | Onboarding'de seçilen rol hiçbir yere kaydedilmiyor | **P1** | Akış | `onboarding-client.tsx:23,29-33`; grep `onboardingRole/persona` → 0 | `:50`'de "We'll tailor the workspace…" yazıyor — yerine getirilmeyen vaat | Persist et ve `framework`/`targetStandard` ön-doldurmada kullan, ya da adımı kaldır | M | 🔧 §5.14 |
| **F-15** | Report Builder mount'ta fetch ederken "No completed scans yet" gösteriyor | **P1** | Akıcılık | `reports/builder/page.tsx:43,51-65,136` | Kullanıcı taramaları olduğu halde "hiç tarama yok" görüyor, sonra içerik zıplıyor | Sayfayı RSC'ye çevir, veriyi server'da çek | M | 🔧 §5.15 |
| **F-16** | `useSearchParams()` Suspense sınırı olmadan client page'de | **P1** | Performans | `reports/builder/page.tsx:41` | Next.js tüm rotayı client-side render'a düşürür | RSC + `searchParams` prop | M | 🔧 §5.15 |
| **F-17** | `error.tsx` layout'un `<main id="main">` içine ikinci bir `<main>` render ediyor | **P1** | A11y | `app/app/error.tsx:14` içinde `app/app/layout.tsx:30` sarmalayıcı | İç içe `<main>` — geçersiz HTML, çift landmark | `<main>` → `<div role="alert">` | S | 🔧 §5.17 |
| **F-18** | `/pricing` ve `/legal/*` sayfalarında `<main id="main">` yok → global skip link kırık | **P1** | A11y | `pricing/page.tsx` (`<main>` hiç yok), `legal/layout.tsx:58`; skip link `layout.tsx:35` + `SkipToContent.tsx:3` | WCAG 2.4.1 Bypass Blocks | Her iki yere `<main id="main" tabIndex={-1}>` | S | 🔧 §5.18 |
| **F-19** | Başlık hiyerarşisi atlaması: h1 → h3 (CardTitle) → h4 (AiSuggestionBlock) → h5 | **P1** | A11y | `Card.tsx:27` (h3), `AiSuggestionBlock.tsx:30` (h4), `ai-panel.tsx:250` (h5) | WCAG 1.3.1 / 2.4.10. Rotor gezinmesi bozuk | `CardTitle`'a `as` prop'u (varsayılan `h2`) | M | 🔧 §5.19 |
| **F-20** | TopNav hesap menüsü: Escape ile kapanmıyor, dışarı tıklama yok, focus dönüşü yok, `aria-haspopup` yok | **P1** | A11y | `TopNav.tsx:180-219` | Klavye kullanıcısı menüde sıkışır | `useDismissable` hook'u (§5.20) + `aria-haspopup="menu"` | S | 🔧 §5.20 |
| **F-21** | `NotificationsBell` `role="menu"` kullanıyor ama çocukları `role="menuitem"` değil, Escape ile kapanmıyor | **P2** | A11y | `NotificationsBell.tsx:122-186` | Geçersiz ARIA yapısı; öğe sayısı yanlış duyurulur | `role="menu"`'yu kaldır (basit popover) + aynı `useDismissable` | S | 🔧 §5.20 |
| **F-22** | Bildirim polling'i sekme arka plandayken de 60 sn'de bir çalışıyor | **P2** | Performans | `NotificationsBell.tsx:55-62`, `POLL_INTERVAL_MS:21` | Gereksiz batarya/ağ/Firestore okuma | `document.visibilityState` gating + `visibilitychange` | S | 🔧 §5.22 |
| **F-23** | Progress polling fallback'te jitter/backoff yok, sekme görünürlüğü dikkate alınmıyor | **P2** | Akıcılık/Performans | `progress-client.tsx:122-146` (`intervalMs` `:125,137`) | Askıda kalan tarama sonsuza dek 2.5 sn'de bir istek atar | Üstel backoff + jitter + `visibilityState` + hard timeout | S | 🔧 §5.23 |
| **F-24** | 5 saniyelik saat `setInterval`'ı tarama bittikten sonra da çalışıyor | **P3** | Performans | `progress-client.tsx:105-108` | Sürekli re-render, gereksiz CPU | Terminal statülerde `return` | S | 🔧 §5.23 |
| **F-25** | `onSnapshot` tamamlanma anında her yeni snapshot'ta `router.replace` çağırıyor | **P3** | Akıcılık | `progress-client.tsx:161` | Tekrarlı navigasyon çağrısı | `hasNavigatedRef` guard | S | 🔧 §5.23 |
| **F-26** | Route bazlı `loading.tsx` yok — dashboard iskeleti tüm `/app/*` rotalarında | **P1** | Akıcılık | Tek dosya: `app/app/loading.tsx` | Tarama raporuna girerken dashboard iskeleti → görsel sıçrama | En az 5 route için özel iskelet | M | 🔧 §5.21 |
| **F-27** | Dashboard veri çekimi seri; `listIssues` tüm bulguları çekip 5'ini gösteriyor | **P2** | Performans | `app/app/page.tsx:24,27,41` | Büyük taramada TTFB artar; Firestore okuma maliyeti | `Promise.all` + `getScanSummary`'den sayım + `limit` | M | 🔧 §5.27 |
| **F-28** | Rapor sayfası tüm bulguları sayfalama/virtualization olmadan render ediyor | **P2** | Performans | `scans/[id]/page.tsx:318-349` | 500+ bulgulu taramada devasa DOM, düşük INP | Grup başına lazy açılım + sayfalama (F-03 ile birlikte) | L | 🔧 §5.28 |
| **F-29** | `Dialog` bileşeni hiç kullanılmıyor; 3 farklı onay deseni paralel yaşıyor | **P2** | Tutarlılık | Kullanılmayan `Dialog.tsx`; native `confirm()` `monitors-manager.tsx:116`; inline expand `delete-actions.tsx:87-131`; kopya markup `states/page.tsx:139-166` | Görsel/davranışsal tutarsızlık | Tek `ConfirmDialog` (F-02 sonrası) | M | 🔧 §5.29 |
| **F-30** | `ink-800` token tanımlı değil ama kullanılıyor → ölü sınıf | **P2** | Tutarlılık | Tanım yok: `globals.css:17-22`. **Kapsam düzeltmesi: 4 değil 7 kullanım** — `compare/page.tsx:82`, `scans/[id]/page.tsx:619`, `settings/billing/page.tsx:58`, `monitors-manager.tsx:189`, `scan-report-actions.tsx:193`, `statement-client.tsx:241`, `ManualReviewChecklist.tsx:326`. Ayrıca **`ink-100`** de tanımsız (`ManualReviewChecklist.tsx:326`) | Renk sessizce miras alınıyor, hover state hiç çalışmıyor | `ink-800`/`ink-100`/`ink-200` token'larını ekle (§7.3) | S | 🔧 §5.30 |
| **F-31** | Marka paleti Tailwind varsayılan paletiyle karışıyor | **P2** | Tutarlılık | **Tam liste §7.4'te** — 19 farklı tanımsız ton, 24 dosya | Desatüre marka rose'u (#B7475A) ile Tailwind'in canlı rose-600'ü (#E11D48) yan yana → "calm, desaturated" ilkesi bozuluyor | `@theme` içinde eksik tonları tanımla; `--color-*: initial` ile leakage'ı kapat | M | 🔧 §5.30 |
| **F-32** | Aynı iş için 3+ farklı uyarı kutusu markup'ı | **P2** | Tutarlılık | Kanonik `AlertCallout.tsx`; kopyalar `invite-section.tsx:162,219,224`, `plan-picker.tsx:114-123`, `scans/[id]/page.tsx:175-186`, `monitors-manager.tsx:182`, `FailedPagesNotice.tsx:14` | `docs/design-system.md:201` ihlali; `role="alert"` bazılarında var bazılarında yok | Hepsini `AlertCallout`'a taşı | S | 🔧 §5.32 |
| **F-33** | Mobilde SideNav içeriğine erişim yolu yok — Monitors / AI Assistant / Reports / Team / Billing ulaşılamaz | **P1** | Akış | `SideNav.tsx:49` (`hidden lg:flex`), `MobileBottomNav.tsx:8-14` (5 sekme) | Mobil kullanıcı ürünün 5 ana özelliğine ulaşamaz | Bottom nav'a "More" sekmesi + drawer (focus yönetimiyle) | M | 🔧 §5.33 |
| **F-34** | `/app/states` iç QA sayfası prod'da erişilebilir ve prefetch listesinde | **P2** | Performans/Akış | `states/page.tsx`, `AppRoutePrefetcher.tsx:17` | Her sayfa geçişinde gereksiz prefetch | Listeden çıkar + prod'da `notFound()` | S | 🔧 §5.34 |
| **F-35** | `AppRoutePrefetcher` her pathname değişiminde 11-15 route'u yeniden prefetch ediyor | **P2** | Performans | `AppRoutePrefetcher.tsx:31-56` (deps `[pathname, router]`) | Her navigasyonda ~12 RSC payload isteği | Oturumda bir kez (`useRef` guard) veya bileşeni kaldır | S | 🔧 §5.34 |
| **F-36** | `invite-section` revoke butonunda busy state yok | **P3** | Akıcılık | `invite-section.tsx:124-138,253-261` | Çift tıklama = çift DELETE | `revokingId` state + `disabled` + optimistic | S | 🔧 §5.36 |
| **F-37** | Form ipuçları (`FieldHint`) `aria-describedby` ile bağlanmıyor | **P2** | A11y | `Input.tsx:66-68` (id yok); kullanım `scans/new/page.tsx:145,193,211,227`. `docs/design-system.md:187` bağlandığını iddia ediyor | Ekran okuyucu "We block private and internal addresses." uyarısını duymaz | `Field` sarmalayıcı bileşeni + `useId()` | M | 🔧 §5.37 |
| **F-38** | `ai-panel` ad-hoc `role="tablist"` — `aria-controls`, tabpanel, klavye, `type="button"` yok | **P2** | A11y/Tutarlılık | `ai-panel.tsx:176-197` | ARIA yapısı geçersiz; `Tabs` varken çoğaltma | `Tabs`/`TabsList`/`TabsTrigger` kullan (F-13 sonrası) | S | 🔧 §5.13 |
| **F-39** | `IssueGroupSection` `aria-expanded` var ama `aria-controls` ve panel id'si yok | **P3** | A11y | `IssueGroupSection.tsx:37-74` | Ekran okuyucu bağlantıyı kuramaz | Panel'e `id`, butona `aria-controls`, `useId()` | S | 🔧 §5.39 |
| **F-40** | `Logo variant="mark"` hardcoded `bg-black` + her örnekte `priority` | **P3** | Tutarlılık/Performans | `Logo.tsx:13-19` | Token dışı renk; çok sayıda `priority` görsel uyarısı | `bg-navy-900`; `priority` sadece landing hero'da | S | — |
| **F-41** | `.marquee-track` CSS ölü kod; `docs/design-system.md:177` kullanıldığını iddia ediyor | **P3** | Tutarlılık | `globals.css:196-200`; grep → sadece `lib/mock/issues.ts` | Doküman/kod sapması, ölü CSS | CSS'i sil veya dokümanı düzelt | S | 🔧 §7.8 |
| **F-42** | Team sayfası "Email invitations are disabled" diyor ama davetiye e-postası gönderiliyor | **P2** | Akış/Microcopy | `team/page.tsx:48` vs `invite-section.tsx:109-116` (`sendInviteEmail`) | Çelişkili microcopy | Metni gerçek davranışa göre güncelle | S | 🔧 §9.3 |
| **F-43** | New Scan'de "Free plan: up to 3 pages" yazıyor ama input 1000'e kadar izin veriyor | **P2** | Akış | `scans/new/page.tsx:223,227-229` | Kullanıcı 50 yazar, submit eder, geç hata alır | Plan cap'ini prop olarak geç, `max={cap}` + inline uyarı | M | 🔧 §5.43 |
| **F-44** | Landing pazarlama sayfası `force-dynamic` | **P2** | Performans | `app/page.tsx:15`, `pricing/page.tsx:12` | Her istekte SSR; CDN cache yok | Oturum kontrolünü client island'a taşı, sayfayı statik/ISR yap | M | — |
| **F-45** | Aynı ekranda 4-5 disclaimer yığılıyor — kendi microcopy kuralını ihlal ediyor | **P2** | Microcopy | New Scan: `scans/new/page.tsx:263-265,270-272,276-282,306`. Scan Results aside: `scans/[id]/page.tsx:352-355` + `:388-391`. Kural: `docs/microcopy.md:84-85` | Uyarı yorgunluğu — hepsi görmezden geliniyor | Ekran başına 1 birincil disclaimer + Compliance Center'a link | M | 🔧 §9.2 |
| **F-46** | Dashboard "Recent scans" tablosunda boş `<th>` | **P3** | A11y | `app/app/page.tsx:222` | Ekran okuyucu boş sütun başlığı duyurur | `<th><span className="sr-only">Actions</span></th>` | S | 🔧 §5.6 |
| **F-47** | `AlertCallout` statik/kalıcı uyarılarda da `role="alert"` (assertive) kullanıyor | **P3** | A11y | `AlertCallout.tsx:63`; ör. `states/page.tsx` 9 adet, `scans/new/page.tsx:270` | Sayfa yüklendiğinde gereksiz kesintili duyuru | `live` prop'u ekle; sadece dinamik durumlarda `role="alert"` | S | 🔧 §5.47 |
| **F-48** | Workspace Setup Server Action'da pending/başarı geri bildirimi yok | **P2** | Akıcılık | `workspace/setup/page.tsx:34,109-114` | Yavaş bağlantıda çift submit | `useFormStatus()` ile `<SubmitButton>` | S | 🔧 §5.48 |
| **F-49** | Onboarding "Step 1 of 3" / Setup "Step 2 of 3" — 3. adım hiç yok | **P3** | Akış/Microcopy | `onboarding-client.tsx:40`, `workspace/setup/page.tsx:19` | Kullanıcı 3. adımı bekler | "Step 2 of 2" yap veya ilk taramayı 3. adım olarak akışa dahil et | S | 🔧 §10.2 |
| **F-50** | Dokümantasyon-kod sapması: `docs/ux-flows.md`'deki "core loop" ekranı mevcut değil | **P2** | Tutarlılık | `docs/ux-flows.md:43-50` vs `issues/[issueId]/page.tsx:40-121` | Ürün ekibi olmayan bir akışa göre plan yapıyor | Dokümanı gerçeğe çek veya eksik bölümleri implemente et | L | 🔧 §6.5 |

### 3.2 V2'de eklenen bulgular (F-51 … F-62)

| ID | Başlık | Şiddet | Kategori | Dosya:satır | Etki | Önerilen düzeltme | Efor | Yama |
|---|---|---|---|---|---|---|---|---|
| **F-51** | **Gövde metni içi linkler sadece renkle ayırt ediliyor; renk kontrastı 2.67:1 (< 3:1)** | **P1** | A11y | `NoGuaranteeBanner.tsx:24` (`text-blue-600 underline-offset-2 hover:underline`), `ai-panel.tsx:98`, `settings-client.tsx:134`, `compliance/page.tsx:288`, `app/page.tsx:131` | WCAG 1.4.1 (A) Use of Color. `blue-600` (#3563E6) vs `ink-700` (#2A3247) = **2.67:1** — G183 tekniğinin 3:1 eşiğinin altında ve alt çizgi yalnız `:hover`'da | Gövde içi linklerde daima `underline`; `hover`'da `decoration-2`. `Prose` içinde global kural | S | 🔧 §5.51 |
| **F-52** | **`docs/design-system.md` kontrast iddiaları ölçülmemiş ve yanlış** | **P1** | Tutarlılık / Marka riski | `docs/design-system.md:54-58` | Doküman "rose 5.1:1 / amber 4.6:1 / green 4.5:1 — all WCAG AA" diyor. Hesaplanmış (canvas #F7F8FB üzerinde): rose-500 **4.83:1**, amber-500 **2.82:1**, green-500 **2.82:1**. Bir a11y ürününün kendi tasarım dokümanının yanlış kontrast beyanı yayınlaması satış görüşmesinde ciddi risk | §7.2 hesaplanmış tabloyu dokümana yaz; amber/green-500'ü yalnız dekoratif kullanıma sınırla | S | 🔧 §7.2 |
| **F-53** | **`docs/design-system.md:191` "≥ 44×44 px tap target" iddiası kodla uyuşmuyor; birçok inline link < 24 px** | **P2** | A11y / Tutarlılık | `SideNav.tsx:80` (40px), `TopNav.tsx:150` (36px), `Tabs.tsx:74` (36px), `A11ySettingsPanel.tsx:40` (36px), `invite-section.tsx:256` (32px), `scans/[id]/page.tsx:474` (32px); padding'siz metin butonları: `NotificationsBell.tsx:132`, `ai-panel.tsx:204`, `app/page.tsx:252` | WCAG 2.5.8 (AA) minimum 24×24. 36-40px değerleri geçer; padding'siz metin butonları yalnız "spacing exception" ile geçebilir → **manuel doğrulama gerekli**. Doküman iddiası yanlış | Dokümanı "≥ 24×24 zorunlu, ≥ 44×44 hedef" olarak düzelt; padding'siz butonlara `min-h-[24px] px-2` ekle | S | 🔧 §7.6 |
| **F-54** | **Tutarlı yardım mekanizması yok** | **P3** | Akış | Yardım linki yok. `SideNav.tsx:117-123` yalnız "Plans & pricing"; iletişim e-postası sadece `compliance/page.tsx:344` | WCAG 3.2.6 vakuum olarak sağlanıyor (yardım hiç sunulmadığı için ihlal yok) ama ürün açısından boşluk: kullanıcı takıldığında gidecek yer yok | SideNav footer'a kalıcı "Help & docs" linki; her sayfada aynı konumda | S | 🔧 §6.1 |
| **F-55** | **Kendi "Larger text" a11y özelliği 88 yerde çalışmıyor** | **P1** | A11y | `globals.css:72` (`html[data-text-size="lg"] { font-size: 115% }`) vs `text-[10px]`/`text-[11px]` — **88 kullanım / 36 dosya** (en yoğun: `app/page.tsx` 12, `ai-assistant-client.tsx` 8, `scans/[id]/page.tsx` 7) | WCAG 1.4.4 Resize Text. Kullanıcı "Larger" seçer, ekrandaki metadata/kicker/badge metinleri hiç büyümez. Ürünün kendi a11y özelliği yarım çalışıyor | `text-[10px]`→`text-[0.625rem]`, `text-[11px]`→`text-[0.6875rem]`; ya da `@theme` içinde `--text-2xs`/`--text-3xs` token'ları | M | 🔧 §7.5 |
| **F-56** | **Aynı hedef için tutarsız etiketleme (mobil ↔ masaüstü)** | **P2** | A11y | `MobileBottomNav.tsx:11` `"Tasks"` → `/app/remediation`; `SideNav.tsx:26` `"Remediation"` → aynı hedef. Aynı şekilde `:12` `"Privacy"` vs `:33` `"Privacy & Compliance"`, `:10` `"Scans"` vs `:24` `"Scans"` (bu ✅) | WCAG 3.2.4 (AA) Consistent Identification. Responsive geçişte kullanıcı aynı özelliği iki farklı adla görüyor | Tek etiket sözlüğü (`lib/nav/labels.ts`) ve her iki nav'ın oradan okuması | S | 🔧 §5.33 |
| **F-57** | **Plan değişikliği geri alma/onay adımı olmadan uygulanıyor** | **P2** | Akış / A11y | `plan-picker.tsx:74-86,178` — `billingEnabled=false` iken `POST /api/plan/select` doğrudan çalışıyor | WCAG 3.3.4 (AA) Error Prevention (Financial). Kullanıcı "Choose" der, plan anında düşer, kaybettiği limitler geri gelmez | Downgrade için `ConfirmDialog` + "neyi kaybedeceksin" listesi (§9.4) | M | 🔧 §5.57 |
| **F-58** | **Hiçbir form alanında `aria-invalid` yok; hatalar alan seviyesinde bağlanmıyor** | **P2** | A11y | grep `aria-invalid` → 0 üretim kullanımı. Hata gösterimleri form üstünde toplu: `scans/new/page.tsx:308-312`, `invite-section.tsx:219`, `monitors-manager.tsx:182`, `TopNav.tsx:140-144`. `FieldError` bileşeni var (`Input.tsx:70-76`) ama **hiç kullanılmıyor** | WCAG 3.3.1 Error Identification. Ekran okuyucu kullanıcısı hangi alanın hatalı olduğunu bilemez; klavyeyle alana gittiğinde hata duyurulmaz | `Field` sarmalayıcı: `aria-invalid` + `aria-describedby` → `FieldError` | M | 🔧 §5.37 |
| **F-59** | **Anlam taşıyan ikon 1.99:1 kontrastta; form kenarlıkları 1.23:1** | **P1** | A11y | `team/page.tsx:105` (`<X className="text-ink-300">` = **1.99:1** on paper), `Input.tsx:5` (`ring-line` #E4E8F0 on #FFF = **1.23:1**), `line-strong` = **1.50:1**, `progress-client.tsx:346` (`text-ink-400` "Queued" = **3.08:1**, metin için 4.5 gerekli) | WCAG 1.4.11 (AA) Non-text Contrast + 1.4.3 (AA). Hesaplanmış değerler, tahmin değil (§7.2) | Yeni `--color-border-field: #9AA3B8` (3.02:1) token'ı; `ink-300` ikonları `ink-600`'e; `ink-400`'ü metin için yasakla | M | 🔧 §7.3 |
| **F-60** | **Sticky TopNav altında focus gizlenebiliyor (`scroll-margin` yok)** | **P2** | A11y | `TopNav.tsx:88` (`sticky top-0 z-30 h-16`); grep `scroll-mt`/`scroll-margin` → **0 sonuç** | WCAG 2.4.11 (AA) Focus Not Obscured (Minimum). Klavyeyle uzun bir listede Tab'larken tarayıcı elemanı görünür alana kaydırır ama 64 px'lik sticky header'ın altında kalabilir | `globals.css`'e `:target, [tabindex], a, button, input, select, textarea { scroll-margin-top: 5rem; }` | S | 🔧 §7.7 |
| **F-61** | **Geçici başarı mesajları 2.5 sn sonra kayboluyor, duyurulmuyor** | **P3** | A11y / Microcopy | `issue-actions.tsx:54` (`setTimeout(… , 2500)`) — "Task created" metni butonun içinde değişip geri dönüyor | WCAG 2.2.1 Timing Adjustable sınırında; ayrıca 4.1.3 (duyurulmuyor). Buton etiketinin değişmesi ekran okuyucuda "isim değişikliği" olarak da kafa karıştırıcı | Buton etiketi sabit kalsın; ayrı `role="status"` bölgesine kalıcı mesaj (§5.8) | S | 🔧 §5.8 |
| **F-62** | **Ham hata mesajı sızıntısı — `humanizeError` fallback'i sunucu metnini olduğu gibi gösteriyor** | **P2** | Microcopy / Güvenlik | `progress-client.tsx:534-541` (`return msg;`), ayrıca `data.message \|\| data.error` deseni: `monitors-manager.tsx:82,106,123`, `invite-section.tsx:89,131`, `plan-picker.tsx:66,81,101`, `ai-assistant-client.tsx:128` | Kullanıcı `Navigation failed: net::ERR_CERT_AUTHORITY_INVALID at https://…` gibi ham metin görebiliyor. `scans/new/page.tsx:362-405`'te doğru desen zaten var ama tek yerde | Merkezi `lib/errors/messages.ts` sözlüğü; UI asla `error`/`message` ham alanını basmasın (§9.5) | M | 🔧 §9.5 |

### 3.3 Öncelik dağılımı

| Şiddet | Adet | ID'ler |
|---|---|---|
| **P0** | 5 | F-01, F-02, F-03, F-04, F-05 |
| **P1** | 18 | F-06…F-20, F-26, F-33, F-51, F-52, F-55, F-59 |
| **P2** | 26 | F-21…F-23, F-27…F-32, F-34, F-35, F-37, F-38, F-42…F-45, F-48, F-50, F-53, F-56, F-57, F-58, F-60, F-62 |
| **P3** | 13 | F-24, F-25, F-36, F-39, F-40, F-41, F-46, F-47, F-49, F-54, F-61 |

---

## 4. WCAG 2.2 AA Tam Uygunluk Matrisi (VPAT çekirdeği)

**Kapsam:** `percevia.app` web uygulaması arayüzü (`src/app/**`, `src/components/**`). Üretilen PDF/HTML rapor çıktısı (`src/lib/reports/render.ts`) ve `/statement/[id]` kamuya açık beyan sayfası **bu matrisin dışındadır** — ayrı bir denetim gerekir (§14.9).

**Durum kodları:**
- ✅ **Supports** — kod okumasıyla karşılandığı doğrulandı
- ⚠️ **Partially Supports** — bazı yerlerde karşılanıyor, bazılarında değil
- ❌ **Does Not Support** — en az bir kesin ihlal var
- 🔬 **Manuel test gerekli** — statik kod okumasıyla karar verilemez
- ➖ **Not Applicable** — ürün bu içerik türünü barındırmıyor

> Bu matris **statik kod analizine** dayanır. VPAT olarak yayımlanmadan önce §11.3'teki manuel protokol ve §11.1'deki otomatik test paketi çalıştırılmalıdır. 🔬 satırları özellikle bloke edicidir.

### 4.1 Level A (30 kriter)

| SC | Ad | Sev. | Durum | Kanıt (dosya:satır) | Bulgu | Düzeltme |
|---|---|---|---|---|---|---|
| **1.1.1** | Non-text Content | A | ❌ | `team/page.tsx:103,105` — izin matrisinde etiketsiz `<Check>`/`<X>`, `aria-hidden` bile yok. Karşı örnek ✅: `ScanScoreRing.tsx:28-29` `role="img"`+`aria-label`, `issues/[issueId]/page.tsx:91` `alt="Screenshot showing the affected page area"`, tüm dekoratif ikonlarda `aria-hidden` | F-06 | İkona `<span className="sr-only">Allowed/Not allowed</span>` ekle (§5.6) |
| **1.2.1** | Audio-only / Video-only (Prerecorded) | A | ➖ | grep `<video`/`<audio` → **0 sonuç** (`src/` içinde yalnızca mock issue metinlerinde geçiyor) | — | Ürüne demo video eklenirse bu satır yeniden değerlendirilmeli |
| **1.2.2** | Captions (Prerecorded) | A | ➖ | Aynı | — | — |
| **1.2.3** | Audio Description or Media Alternative | A | ➖ | Aynı | — | — |
| **1.3.1** | Info and Relationships | A | ❌ | (a) `team/page.tsx:95-112` — `<thead>`/`scope` yok; (b) başlık atlaması h1→h3→h4→h5 (`Card.tsx:27`, `AiSuggestionBlock.tsx:30`, `ai-panel.tsx:250`); (c) `FieldHint` `aria-describedby` ile bağlı değil (`Input.tsx:66-68`); (d) boş `<th>` (`app/app/page.tsx:222`); (e) `IssueGroupSection.tsx:37-74` `aria-controls` yok. Karşı örnek ✅: `<fieldset>/<legend>` doğru kullanılmış (`scans/new/page.tsx:150-151`, `onboarding-client.tsx:54-55`, `A11ySettingsPanel.tsx:21-25`), `<dl>/<dt>/<dd>` (`scans/[id]/page.tsx:363,618-619`) | F-06, F-19, F-37, F-39, F-46 | §5.6, §5.19, §5.37, §5.39 |
| **1.3.2** | Meaningful Sequence | A | ⚠️ | Genelde DOM sırası = görsel sıra ✅. İstisna: `Dialog.tsx:82` `flex-col-reverse sm:flex-row` — mobilde DOM (Cancel, Confirm) görsel olarak (Confirm, Cancel) sırasında; Tab sırası görsel sırayla ters. Ayrıca `issues/[issueId]/page.tsx:45-61` `IssueActions` içerikten **önce** DOM'da — ekran okuyucu bulguyu okumadan aksiyonları duyuyor | Yeni: §6.5 | Dialog footer'da `flex-col` + `order-*` yerine DOM sırasını görsel sırayla eşitle; issue detayında aksiyonları `<h1>` sonrasına al |
| **1.3.3** | Sensory Characteristics | A | ⚠️ | `invite-section.tsx:115` "share **the link below** with them manually" — yalnız konumsal referans. `scans/[id]/page.tsx:390` "see the checklist on each finding" ✅ (konumsal değil) | Yeni | "share the invite link shown in the Pending invitations list" gibi ada dayalı referans |
| **1.3.4** | (AA — bkz. §4.2) | — | — | — | — | — |
| **1.4.1** | Use of Color | A | ❌ | Gövde metni içi linkler yalnız renkle işaretli ve **2.67:1** kontrastta (`NoGuaranteeBanner.tsx:24`, `ai-panel.tsx:98`, `settings-client.tsx:134`). Karşı örnek ✅: `SeverityBadge` ikon+renk+metin üçlüsü, `IssueGroupSection.tsx:54` sayı + metin | **F-51** | Gövde içi linklerde daima `underline` (§5.51) |
| **1.4.2** | Audio Control | A | ➖ | Otomatik oynatılan ses yok | — | — |
| **2.1.1** | Keyboard | A | ❌ | (a) `A11ySettingsPanel.tsx:34-48` radiogroup'ta ok tuşu yok; (b) `Tabs.tsx:54-84` ok tuşu yok; (c) `ai-panel.tsx:176-197` tablist klavyesiz; (d) `reports/preview/page.tsx:61` print kontrolü `<span>` — hiç odaklanamıyor; (e) `scans/[id]/page.tsx:474` filtre çipleri `<span>`; (f) `compliance/page.tsx:216` butonlar odaklanıyor ama hiçbir şey yapmıyor | F-03, F-04, F-09, F-12, F-13, F-38 | §5.3, §5.4, §5.9, §5.12, §5.13 |
| **2.1.2** | No Keyboard Trap | A | ⚠️ | `TopNav.tsx:197-219` hesap menüsü Escape ile kapanmıyor, focus dönüşü yok — teknik olarak Tab ile çıkılabildiği için "trap" değil ama menü açık kalır ve arkasındaki içeriğe focus geçer. `Dialog.tsx` açıldığında arkadaki içerik `inert` değil → modal içinde Tab dışarı çıkar (ters yönde bir 2.1.2 riski) | F-02, F-20 | §5.2, §5.20 |
| **2.1.4** | Character Key Shortcuts | A | ✅ | Tek karakterli global kısayol yok. Klavye dinleyicileri: `Dialog.tsx:28-30` (Escape), `TopNav.tsx:108-114` (Enter/Escape, input odaklıyken) — ikisi de tek karakter değil | — | — |
| **2.2.1** | Timing Adjustable | A | ⚠️ | `issue-actions.tsx:54` "Task created" 2.5 sn sonra kayboluyor — kullanıcı uzatamıyor/kapatamıyor. `NotificationsBell.tsx:21` 60 sn polling içerik değiştirir ama zaman sınırı değildir ✅ | **F-61** | Kalıcı `role="status"` mesajı (§5.8) |
| **2.2.2** | Pause, Stop, Hide | A | ✅ | `.pulse-dot` (`globals.css:190-194`) sonsuz animasyon **ama** `prefers-reduced-motion` (`:112-121`) **ve** kullanıcı override'ı (`:103-110`, `A11ySettingsPanel` üzerinden) ikisi de durduruyor — bu geçerli bir "Hide" mekanizmasıdır | — | Motion ayarının keşfedilebilirliği düşük (Settings > Accessibility sekmesinde gömülü) — §6.1 |
| **2.3.1** | Three Flashes or Below Threshold | A | ✅ | Flaş/stroboskopik içerik yok. `pulseDot` 1.6s periyot = 0.625 Hz ≪ 3 Hz | — | — |
| **2.4.1** | Bypass Blocks | A | ❌ | Skip link global (`layout.tsx:35` + `SkipToContent.tsx:3` → `href="#main"`) ama `id="main"` yalnız **6 üretim dosyasında** var (`app/page.tsx:99`, `app/app/layout.tsx:31`, `onboarding-client.tsx:44`, `workspace/setup/page.tsx:23`, `verify-request/page.tsx:15`, `firebase-sign-in-form.tsx:157`, `firebase-callback-client.tsx:110`). **Yok:** `pricing/page.tsx` (`<main>` hiç yok), `legal/layout.tsx:58` (id'siz), `auth/sign-in/page.tsx:35` (Suspense fallback), `auth/callback/page.tsx:39`, `AppServiceUnavailable.tsx:8`, `app/app/error.tsx:14` | F-18 | §5.18 |
| **2.4.2** | Page Titled | A | ✅ | Her rota `export const metadata = { title: … }` tanımlıyor; root `layout.tsx:11` fallback | — | Başlıklar sabit — dinamik ekranlarda bağlam yok (örn. tüm scan raporları "Scan results — Percevia AI"). `generateMetadata` ile host adı eklenmeli (§6.4) |
| **2.4.3** | Focus Order | A | ❌ | `Dialog.tsx:24-51` açılışta focus taşımıyor, kapanışta geri vermiyor. `TopNav.tsx:183` menü açıldığında focus butonda kalıyor, menü öğelerine geçiş Tab ile ama kapanınca geri dönüş yok. `MobileBottomNav` "More" drawer'ı henüz yok (F-33) | F-02, F-20, F-33 | §5.2, §5.20, §5.33 |
| **2.4.4** | Link Purpose (In Context) | A | ⚠️ | `app/app/page.tsx:246-255` — tablo satırlarında yalnız "View"; bağlam `<td>` üzerinden sağlanıyor (teknik olarak yeterli) ama link listesi gezinmesinde ayırt edilemez. `scans/[id]/page.tsx:148` "Dashboard", `issues/[issueId]/page.tsx:43` "Back to scan results" ✅ | Yeni | `View` linkine `<span className="sr-only"> {s.baseUrl} scan results</span>` |
| **2.5.1** | Pointer Gestures | A | ✅ | Çok noktalı / yol tabanlı jest yok. Yatay kaydırıcılar (`ai-assistant-client.tsx:179`) native scroll ✅ | — | — |
| **2.5.2** | Pointer Cancellation | A | ✅ | Tüm aktivasyonlar `onClick` (up-event). `NotificationsBell.tsx:72` `mousedown` yalnız *kapatma* için kullanılıyor (aktivasyon değil) ✅ | — | — |
| **2.5.3** | Label in Name | A | ✅ | `TopNav.tsx:151` `aria-label={\`Workspace: ${workspaceName}. Click to rename.\`}` görünür metni (`workspaceName`) içeriyor ✅. `NotificationsBell.tsx:100-104` `"Notifications (3 new)"` görünür rozeti (`3`) içeriyor ✅. `SideNav.tsx:52` `aria-label="percevia home"` + Logo wordmark ✅ | — | 🔬 Logo'nun görünür metni "percevia" mı yoksa görsel mi — `Logo.tsx` render'ı manuel doğrulanmalı |
| **2.5.4** | Motion Actuation | A | ✅ | Cihaz hareketi ile tetiklenen işlev yok | — | — |
| **3.1.1** | Language of Page | A | ✅ | `layout.tsx:29` `<html lang="en">` | — | ⚠️ Türkçe lokalizasyon geldiğinde `lang` dinamikleşmeli (§9.6) |
| **3.2.1** | On Focus | A | ✅ | Focus alındığında bağlam değişimi yok. `TopNav.tsx:46-48` edit moduna girildiğinde input'a focus taşınıyor — bu kullanıcı tıklamasıyla tetiklenmiş, focus ile değil ✅ | — | — |
| **3.2.2** | On Input | A | ⚠️ | `issue-actions.tsx:62-67` `<select onChange>` → anında `PATCH` + `router.refresh()`. Sayfa içeriği yeniden yükleniyor. Kesin "change of context" tanımına girmez (navigasyon/odak/pencere değişmiyor) ama uyarı yok. `A11ySettingsPanel` tıklama tabanlı ✅ | F-08 | Select'in yanına "Değişiklik anında kaydedilir" ipucu + §5.8 optimistic geri bildirim |
| **3.3.1** | Error Identification | A | ❌ | grep `aria-invalid` → **0 üretim kullanımı**. `FieldError` bileşeni (`Input.tsx:70-76`) tanımlı ama **hiç import edilmiyor**. Hatalar yalnız form üstünde toplu `AlertCallout` olarak (`scans/new/page.tsx:308-312`) — hangi alanın hatalı olduğu programatik olarak belirtilmiyor | **F-58** | §5.37 `Field` sarmalayıcısı |
| **3.3.2** | Labels or Instructions | A | ⚠️ | Görünür etiketler her yerde ✅ (`Label` bileşeni, `docs/design-system.md:91` "No placeholder-as-label" kuralına uyuluyor). Ancak `FieldHint` bağlanmamış (F-37) ve `Checkbox`/`Switch` id'leri `Math.random()` (F-07) → `htmlFor`↔`id` bağı hydration'da kopabilir | F-07, F-37 | §5.7, §5.37 |
| **3.3.7** | Redundant Entry | A *(2.2 yeni)* | ✅ | Workspace adı `workspace/setup/page.tsx:39-46`'da bir kez soruluyor; sonraki adımlarda tekrar istenmiyor. Sitemap URL alanı `scans/new/page.tsx:187` girilen URL'den `safeOrigin(url)` ile ön-doldurulmuş placeholder gösteriyor ✅. Manuel URL listesi placeholder'ı da aynı ✅ | — | — |
| **4.1.2** | Name, Role, Value | A | ❌ | (a) `<span>` olarak render edilen "butonlar" (`scans/[id]/page.tsx:474`, `reports/preview/page.tsx:61`); (b) `NotificationsBell.tsx:122` `role="menu"` ama çocuklar `menuitem` değil; (c) `ai-panel.tsx:177-197` `role="tablist"` ama `aria-controls`/tabpanel yok, `type="button"` yok; (d) `IssueGroupSection.tsx:40` `aria-controls` yok; (e) `A11ySettingsPanel.tsx:35-37` `role="radio"` ama `type="button"` yok → form içinde submit eder; (f) `compliance/page.tsx:219` `aria-pressed={!!r.current}` her zaman aynı, state değişmiyor | F-03, F-04, F-09, F-12, F-21, F-38, F-39 | §5.3, §5.4, §5.9, §5.12, §5.20, §5.39 |

### 4.2 Level AA (25 kriter)

| SC | Ad | Sev. | Durum | Kanıt (dosya:satır) | Bulgu | Düzeltme |
|---|---|---|---|---|---|---|
| **1.2.4** | Captions (Live) | AA | ➖ | Canlı medya yok | — | — |
| **1.2.5** | Audio Description (Prerecorded) | AA | ➖ | Video yok | — | — |
| **1.3.4** | Orientation | AA | ✅ | Yönlendirme kilidi yok; `viewport` meta'sında `user-scalable=no` yok (root `layout.tsx` viewport export'u tanımlamıyor → Next varsayılanı `width=device-width, initial-scale=1`) | — | — |
| **1.3.5** | Identify Input Purpose | AA | ⚠️ | `autoComplete` yalnız **3 yerde**: `firebase-sign-in-form.tsx:195` (`email`) ✅, `firebase-callback-client.tsx:156` (`email`) ✅, `scans/new/page.tsx:141` (`url`) ✅. **Eksik:** `workspace/setup/page.tsx:51-57` (`companyName` → `organization`), `settings/profile/profile-client.tsx` (isim alanı → `name`), `invite-section.tsx:178-184` (davet e-postası — *başkasının* verisi olduğu için 1.3.5 kapsamı dışı ✅) | Yeni | Kullanıcının **kendi** verisini toplayan her alana WCAG 1.3.5 Input Purposes listesinden token ekle |
| **1.4.3** | Contrast (Minimum) | AA | ❌ | **Hesaplanmış (§7.2):** `text-ink-400` (#8892A6) `bg-paper` üzerinde **3.08:1**, `bg-canvas` üzerinde **2.86:1** — 4.5:1 gerekli. Gerçek metin kullanımı: `progress-client.tsx:346` ("Queued" durum etiketi), `app/app/page.tsx:103` (ayraç). ✅ Geçenler: `ink-900` 17.1:1, `ink-600` 6.91:1, `ink-500` 4.87:1, `blue-600` 4.52:1 (canvas), `green-700`/`amber-700`/`rose-700`/`blue-700`/`purple-600` kendi `-50` zeminlerinde 4.8–6.8:1 | **F-59** | `ink-400`'ü metin için yasakla; ≥14px normal metinde `ink-500` taban (§7.3) |
| **1.4.4** | Resize Text | AA | ❌ | `html[data-text-size="lg"] { font-size: 115% }` (`globals.css:72`) yalnız `rem` ölçekli boyutları etkiler. Kodda **88 adet sabit px** `text-[10px]`/`text-[11px]` (36 dosya) → ürünün kendi "Larger text" özelliği bu metinlerde çalışmıyor. Tarayıcı zoom'u ✅ çalışır ama SC metin boyutu ayarını da kapsar | **F-55** | `rem` cinsine çevir (§7.5) |
| **1.4.5** | Images of Text | AA | ✅ | Metin içeren görsel yok; logo istisna kapsamında (logotype). `Logo.tsx` wordmark bir görsel — logotype istisnası geçerli ✅ | — | — |
| **1.4.10** | Reflow (320 CSS px) | AA | 🔬 | Kod tarafında hazırlık iyi: `overflow-x-auto` sarmalayıcılar (`app/app/page.tsx:214`, `team/page.tsx:94`), `min-w-0` disiplini (`issues/[issueId]/page.tsx:41,62,63`), responsive grid'ler. **Riskli:** `scans/[id]/page.tsx:228-233` `flex gap-2` ile 4 `SeverityStat` 320px'e sıkışıyor; `ai-assistant-client.tsx:192` `min-w-[220px]` kartlar yatay scroller içinde (izinli); `team/page.tsx:95` 7 sütunlu matris | Yeni | 320×256 px'de manuel test (§11.3) |
| **1.4.11** | Non-text Contrast | AA | ❌ | **Hesaplanmış (§7.2):** `line` (#E4E8F0) `paper` üzerinde **1.23:1**, `line-strong` (#CDD3E0) **1.50:1** — form input kenarlıkları için 3:1 gerekli (`Input.tsx:5` `ring-1 ring-line`). `team/page.tsx:105` `<X className="text-ink-300">` = **1.99:1** ve anlam taşıyor. ✅ Geçen: focus outline `blue-500` (#4A7BFF) canvas üzerinde **3.53:1**, navy-900 buton üzerinde **4.94:1** | **F-59** | Yeni `--color-border-field` token'ı (§7.3) |
| **1.4.12** | Text Spacing | AA | 🔬 | `line-height: 1.55` body ✅ (`globals.css:82`), `leading-relaxed`/`leading-snug` yaygın. **Risk:** sabit yükseklikli kontroller (`Button` `h-9/h-11/h-12`, `TopNav.tsx:117` `h-7`) ve `leading-none` (`scans/new/page.tsx:355`) — text-spacing bookmarklet'i uygulandığında kırpılma olabilir | Yeni | Bookmarklet testi (§11.3); `h-*` yerine `min-h-*` |
| **1.4.13** | Content on Hover or Focus | AA | ⚠️ | `TopNav.tsx:157-160` `Pencil` ikonu `opacity-0 group-hover:opacity-100` — **focus'ta görünmüyor** (klavye kullanıcısı düzenleme affordance'ını hiç görmez). `progress-client.tsx:365` `title={state.currentUrl}` native tooltip — dismissable değil ama tarayıcı kontrolünde. `remediation/page.tsx:91-92` `group-open` ✅ hover değil | Yeni | `group-focus-within:opacity-100` ekle veya ikonu kalıcı yap |
| **2.4.5** | Multiple Ways | AA | ⚠️ | Uygulama içinde: SideNav (masaüstü) + MobileBottomNav + dashboard içi linkler + Recent scans tablosu = 2+ yol ✅. **Ama** TopNav arama kutusu (`TopNav.tsx:169-173`) üçüncü bir yol *gibi görünüp* çalışmıyor (F-10) — kullanıcıyı yanıltıyor. Pazarlama tarafı: header nav + footer ✅ (mobilde header nav gizli, F-33 benzeri) | F-10, F-33 | §5.10, §5.33 |
| **2.4.6** | Headings and Labels | AA | ⚠️ | Başlıklar tanımlayıcı ✅. **Ama** `app/app/page.tsx:222` boş `<th>` (F-46), `team/page.tsx` tabloda hiç başlık yok (F-06), `CardTitle`'lar h3 seviyesinde ve sayfa başlığından kopuk (F-19) | F-06, F-19, F-46 | §5.6, §5.19 |
| **2.4.7** | Focus Visible | AA | ❌ | `globals.css:123-128` global `*:focus-visible { outline: 2px solid blue-500; offset 2px }` — çok iyi bir temel ✅. **Ama** `sr-only` radio inputları (`scans/new/page.tsx:167`, `onboarding-client.tsx:74`) 1×1 px alanda görünmez focus alıyor; kart üzerinde `peer-focus-visible` yok → klavye kullanıcısı hangi kartta olduğunu göremez. Ayrıca `Tabs.tsx:102` `focus:outline-none` tabpanel'de (fakat `tabIndex={0}` ile odaklanabilir → görünmez focus) | F-11 | §5.11; `Tabs` panelinde `focus-visible:outline` bırak |
| **2.4.11** | Focus Not Obscured (Minimum) | AA *(2.2 yeni)* | ❌ | `TopNav.tsx:88` `sticky top-0 z-30` yükseklik 64px; grep `scroll-mt`/`scroll-margin` → **0 sonuç**. Uzun listelerde (`scans/[id]/page.tsx` bulgu listesi, `team/page.tsx` üye tablosu) Tab ile ilerlerken odaklanan eleman header'ın altında tamamen gizlenebilir. `MobileBottomNav` `fixed bottom-0` için `main` üzerinde `pb-20` telafisi var (`app/app/layout.tsx:33`) ✅ | **F-60** | Global `scroll-margin-top: 5rem` (§7.7) |
| **2.5.7** | Dragging Movements | AA *(2.2 yeni)* | ✅ | Sürükle-bırak etkileşimi yok. Remediation "board" aslında `<details>` grupları (`remediation/page.tsx:63-101`) — sürükleme gerektirmiyor ✅. `docs/ux-flows.md:50` "Card moves on Remediation Board automatically" — otomatik, kullanıcı sürüklemesi değil ✅ | — | ⚠️ Gerçek bir kanban sürüklemesi eklenirse tek tıkla alternatif zorunlu |
| **2.5.8** | Target Size (Minimum, 24×24) | AA *(2.2 yeni)* | ⚠️ | ✅ Geçenler: `Button` `h-9/h-11/h-12` (36/44/48), `SideNav.tsx:80` 40px, `Tabs.tsx:74` 36px, `TopNav.tsx:150` 36px, `A11ySettingsPanel.tsx:40` 36px, `MobileBottomNav.tsx:34` 56px, `Dialog.tsx:75` 36px, `invite-section.tsx:256` 32px, `scans/[id]/page.tsx:474` 32px, `TopNav.tsx:124,128,136` 28px. ⚠️ Şüpheli (padding'siz metin butonları, ~16-18px): `NotificationsBell.tsx:129-136` "Mark all read", `ai-panel.tsx:202-207` "Regenerate", `app/app/page.tsx:246-255` "View", `compliance/page.tsx:286-291`. Bunlar "spacing exception" ile geçebilir → **hesaplanmalı**. `docs/design-system.md:191` "≥44×44" iddiası **yanlış** | **F-53** | §7.6 |
| **3.1.2** | Language of Parts | AA | ✅ | Arayüz tamamen İngilizce; farklı dilde pasaj yok | — | ⚠️ Türkçe i18n geldiğinde kritik hale gelir (§9.6) |
| **3.2.3** | Consistent Navigation | AA | ✅ | `SideNav` sırası: Dashboard, Scans, Monitors, Remediation, AI Assistant, Reports · sonra Team, Privacy, Billing, Settings. `MobileBottomNav`: Home, Scans, Tasks, Privacy, Settings — **göreli sıra korunuyor** (alt küme) ✅. Her `/app/*` sayfasında aynı chrome (`app/app/layout.tsx:19-40`) ✅ | — | — |
| **3.2.4** | Consistent Identification | AA | ❌ | Aynı hedef, farklı ad: `/app/remediation` → mobilde **"Tasks"** (`MobileBottomNav.tsx:11`), masaüstünde **"Remediation"** (`SideNav.tsx:26`). `/app/compliance` → **"Privacy"** vs **"Privacy & Compliance"** (`:12` vs `:33`). `/app` → **"Home"** vs **"Dashboard"** (`:9` vs `:23`) | **F-56** | Tek etiket sözlüğü (§5.33) |
| **3.2.6** | Consistent Help | AA *(2.2 yeni)* | ✅ ➖ | Ürün hiçbir sayfada yardım mekanizması (canlı destek, iletişim, self-help) **sunmuyor** → SC vakuum olarak sağlanıyor. Tek istisna `compliance/page.tsx:340-357` footer'daki iletişim e-postası — tek sayfada olduğu için "tutarlılık" yükümlülüğü doğmuyor | **F-54** (UX boşluğu) | Yardım eklenecekse **her sayfada aynı göreli konumda** olmalı — SideNav footer'ı (`SideNav.tsx:116-124`) doğru yer |
| **3.3.3** | Error Suggestion | AA | ⚠️ | ✅ Mükemmel örnek: `scans/new/page.tsx:362-405` — 18 hata kodu → aksiyon önerili kullanıcı mesajı. ❌ Diğer yerlerde `data.message \|\| data.error` deseni ham sunucu metnini basıyor (`monitors-manager.tsx:82,106,123`, `invite-section.tsx:89,131`, `plan-picker.tsx:66,81,101`, `ai-assistant-client.tsx:128`) ve `progress-client.tsx:540` `return msg;` fallback'i | **F-62** | Merkezi hata sözlüğü (§9.5) |
| **3.3.4** | Error Prevention (Legal, Financial, Data) | AA | ❌ | **Finansal:** `plan-picker.tsx:74-86` — `billingEnabled=false` iken plan düşürme onaysız, geri alınamaz. **Veri silme:** `delete-actions.tsx:87-131` inline onay ✅, `monitors-manager.tsx:116` native `confirm()` ✅ (markasız ama var), `invite-section.tsx:124` revoke **onaysız** ⚠️. **Yasal:** Onboarding/New Scan consent checkbox'ları ✅ | **F-57**, F-36 | §5.57, §5.36 |
| **3.3.8** | Accessible Authentication (Minimum) | AA *(2.2 yeni)* | ✅ | E-posta magic link (`firebase-sign-in-form.tsx`) + GitHub OAuth. Bilişsel işlev testi (şifre hatırlama, bulmaca, CAPTCHA) yok — grep `recaptcha` → yalnız `static-runner.ts:367` (tarayıcının *hedef siteyi* tespit ettiği yer, kendi formumuz değil) ✅. E-posta alanlarında `autoComplete="email"` ✅ (`:195`) — kopyala-yapıştır engellenmemiş ✅ | — | Firebase Auth'un bot koruması ileride reCAPTCHA aktive ederse bu satır ❌'ye döner — izlenmeli |
| **4.1.3** | Status Messages | AA | ❌ | **Uygulamada tek üretim canlı bölgesi:** `firebase-callback-client.tsx:126` `role="status"`. Duyurulmayan durum değişiklikleri: tarama ilerlemesi (`progress-client.tsx:356-371`), workspace adı kaydetme (`TopNav.tsx:140-144`), davet gönderme/iptal (`invite-section.tsx:219-227`), plan değişimi (`plan-picker.tsx:114-123`), monitor ekleme/silme (`monitors-manager.tsx:182`), AI üretimi (`ai-panel.tsx:142-146`), issue durum değişimi (`issue-actions.tsx`), rapor indirme (`reports/builder/page.tsx`). `AlertCallout` `role="alert"` (`:63`) danger/warning'de ✅ ama koşullu render edildiğinde DOM'a *yeni giren* bir `role="alert"` bazı ekran okuyucularda güvenilmez okunur | **F-01** | §5.1 + `LiveRegion` bileşeni (§5.1.3) |

### 4.3 Özet skor tablosu

| Durum | Level A | Level AA | Toplam |
|---|---|---|---|
| ✅ Supports | 12 | 8 | **20** |
| ⚠️ Partially Supports | 7 | 6 | **13** |
| ❌ Does Not Support | 7 | 7 | **14** |
| 🔬 Manuel test gerekli | 0 | 2 | **2** |
| ➖ Not Applicable | 4 | 2 | **6** |
| **Toplam** | **30** | **25** | **55** |

**Yorum:** ❌ + ⚠️ = 27 kriter (%49). Bunların **14'ü P0/P1 bulgularla birebir eşleşiyor** ve §5'teki yamalar uygulandığında kapanıyor. §13'teki 3 sprintlik plan sonunda tahmini durum: ✅ 44, ⚠️ 4, 🔬 5, ➖ 6 → **"Supports / Partially Supports" oranı %87**. Bu, savunulabilir bir VPAT için yeterlidir; %100 "Supports" iddiası a11y sektöründe zaten şüphe uyandırır.

### 4.4 VPAT'a dönüştürme notu

Yukarıdaki tablo, **VPAT 2.5 Rev EU** formatının "Table 2: Success Criteria, Level AA" bölümüne doğrudan çevrilebilir:
- "Durum" sütunu → *Conformance Level* (`Supports` / `Partially Supports` / `Does Not Support` / `Not Applicable`)
- "Kanıt" + "Düzeltme" sütunları → *Remarks and Explanations*
- EN 301 549 eşlemesi için ek olarak Bölüm 9 (Web), 11 (Yazılım) ve 12.1.2 (Ürün dokümantasyonu) tabloları gerekir — 12.1.2 için §11.4'teki erişilebilirlik beyanı kullanılır.

> **Uyarı — microcopy kuralına uyum.** VPAT yayımlanırken `docs/microcopy.md:34-51`'deki yasaklı ifadeler (`fully compliant`, `certified`, `legally compliant`) VPAT metninde de kullanılmamalıdır. VPAT'ın kendi terminolojisi ("Supports") zaten yeterlidir; "WCAG certified" ifadesi hem yanlış hem kendi kuralımızı ihlal eder.

---

## 5. Bulgu Bazlı Kod Yamaları

Her yama dört bölümden oluşur: **Mevcut kod** (satır numaralı gerçek alıntı) · **Düzeltilmiş kod** (kopyala-yapıştır TSX) · **Neden bu çözüm** (alternatifler ve trade-off) · **Nasıl doğrulanır** (klavye + ekran okuyucu + otomatik test).

**Genel notlar:**
- Proje `radix-ui`, `react-aria`, `headlessui` **kullanmıyor** (`package.json:27-41`). Aşağıdaki yamalar bunu bilinçli olarak koruyor — her yamanın "Neden" bölümünde bağımlılık eklemenin trade-off'u tartışılıyor.
- Tüm sınıf adları mevcut `@theme` token'larıdır. §7.3'te önerilen **yeni** token'lar kullanıldığında açıkça belirtilmiştir.
- `cn()` yardımcısı `@/lib/utils`'ten gelir (`clsx` + `tailwind-merge`).

---

### 5.1 — F-01: Canlı bölge (`aria-live`) · Tarama ilerlemesi · **P0**

#### Mevcut kod — `src/app/app/scans/[id]/progress/progress-client.tsx:295-372`

```tsx
      <Card>
        <CardContent className="pt-5">
          <ol className="space-y-3">
            {STEPS.map((s, i) => {
              /* … 6 adımlık liste, hiçbir canlı bölge yok … */
            })}
          </ol>

          {state.status === "running" && (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-ink-600">
                {state.pagesDone} scanned
                {state.pagesFailed > 0 ? `, ${state.pagesFailed} failed` : ""} /{" "}
                {state.pagesTotal || initial.maxPages} pages processed
                {state.currentState ? ` · ${state.currentState} viewport` : ""}.
              </p>
              {state.currentUrl && (
                <p className="text-xs text-ink-500 font-mono truncate" title={state.currentUrl}>
                  <ScanLine className="size-3 inline mr-1 -mt-0.5" aria-hidden />
                  {state.currentUrl}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
```

Sorun üç katmanlı:
1. Hiçbir `aria-live` yok → ekran okuyucu hiçbir güncellemeyi duyurmuyor.
2. `state.currentUrl` her sayfada değişiyor; naif bir `aria-live="polite"` konursa **saniyede birkaç kez** URL okunur → kullanım dışı gürültü.
3. `state.pagesDone` her tick'te değişebilir → aynı sorun.

#### Düzeltilmiş kod

**Adım 1 — Yeniden kullanılabilir canlı bölge bileşeni.** Yeni dosya: `src/components/accessibility/LiveRegion.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tek bir kibar (polite) canlı bölge. `message` değiştiğinde ekran okuyucu
 * yeni metni okur. Aynı metin tekrar gelirse duyurulmaz (gürültü önleme).
 *
 * `throttleMs` ile hızlı değişen durumlar (tarama ilerlemesi gibi) için
 * duyuru sıklığı sınırlanır — WCAG 4.1.3 "duyur" der, "her tick'te duyur"
 * demez; art arda duyuru kullanıcıyı sayfadan koparır.
 */
export function LiveRegion({
  message,
  throttleMs = 4000,
  assertive = false,
}: {
  message: string;
  throttleMs?: number;
  assertive?: boolean;
}) {
  const [announced, setAnnounced] = useState("");
  const lastAtRef = useRef(0);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message || message === announced) return;

    const flush = () => {
      lastAtRef.current = Date.now();
      pendingRef.current = null;
      setAnnounced(message);
    };

    const elapsed = Date.now() - lastAtRef.current;
    if (elapsed >= throttleMs) {
      flush();
      return;
    }

    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(flush, throttleMs - elapsed);
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, [message, announced, throttleMs]);

  return (
    <p
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      aria-atomic="true"
      className="sr-only"
    >
      {announced}
    </p>
  );
}
```

**Adım 2 — `progress-client.tsx` içinde kullanım.** Import'lara ekle:

```tsx
import { useMemo } from "react";
import { LiveRegion } from "@/components/accessibility/LiveRegion";
```

`currentStepIdx` hesaplamasının hemen altına (`:202-208` civarı):

```tsx
  // Ekran okuyucuya duyurulacak tek cümlelik özet. URL'i BİLEREK dışarıda
  // bırakıyoruz: her sayfada değişiyor ve okunması dakikalarca sürerdi.
  // Görsel kullanıcı URL'i görebilir; ekran okuyucu kullanıcısı ilerlemeyi
  // ve adımı duyar. Duyuru metni yalnızca adım veya sayfa sayısı
  // değiştiğinde değişir → gereksiz tekrar duyuru yok.
  const liveMessage = useMemo(() => {
    if (state.status === "failed") {
      return `Scan failed. ${humanizeError(state.errorMessage)}`;
    }
    if (state.status === "completed") {
      return "Scan complete. Opening results.";
    }
    if (state.status === "queued") {
      return "Scan queued. Waiting for a scanner worker.";
    }
    const step = STEPS[currentStepIdx]?.label ?? "Scanning";
    const total = state.pagesTotal || initial.maxPages;
    const failed = state.pagesFailed > 0 ? `, ${state.pagesFailed} failed` : "";
    return `${step}. ${state.pagesDone} of ${total} pages processed${failed}.`;
  }, [
    state.status,
    state.errorMessage,
    state.pagesDone,
    state.pagesTotal,
    state.pagesFailed,
    currentStepIdx,
    initial.maxPages,
  ]);

  const busy = state.status === "queued" || state.status === "running";
```

Render içinde, `<Card>`'ın hemen üstüne ve `<ol>` üzerine:

```tsx
      {/* Tek canlı bölge. Hata durumu assertive, ilerleme polite. */}
      <LiveRegion
        message={liveMessage}
        assertive={state.status === "failed"}
        throttleMs={state.status === "failed" ? 0 : 5000}
      />

      <Card>
        <CardContent className="pt-5">
          <ol
            className="space-y-3"
            aria-busy={busy}
            aria-label="Scan progress steps"
          >
            {STEPS.map((s, i) => { /* … değişmedi … */ })}
          </ol>

          {state.status === "running" && (
            <div className="mt-4 space-y-1">
              {/* aria-hidden DEĞİL: görsel metin sayfa içinde okunabilir kalmalı;
                  duyuru işini yukarıdaki LiveRegion yapıyor, bu blok
                  canlı bölge DEĞİL, bu yüzden çift duyuru olmuyor. */}
              <p className="text-xs text-ink-600">
                {state.pagesDone} scanned
                {state.pagesFailed > 0 ? `, ${state.pagesFailed} failed` : ""} /{" "}
                {state.pagesTotal || initial.maxPages} pages processed
                {state.currentState ? ` · ${state.currentState} viewport` : ""}.
              </p>
              {state.currentUrl && (
                <p className="text-xs text-ink-500 font-mono truncate" title={state.currentUrl}>
                  <ScanLine className="size-3 inline mr-1 -mt-0.5" aria-hidden />
                  <span className="sr-only">Currently scanning: </span>
                  {state.currentUrl}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
```

Ayrıca her adımın durumunu programatik yap (`:341-350` yerine):

```tsx
                  <span className="text-[0.6875rem] uppercase tracking-wider font-semibold shrink-0 mt-2">
                    {done && <span className="text-green-700">Done</span>}
                    {failedStep && <span className="text-rose-700">Failed</span>}
                    {active && (
                      <span className="text-blue-700">
                        In progress
                      </span>
                    )}
                    {!done && !active && !failedStep && (
                      <span className="text-ink-500">
                        {state.status === "failed" ? "Not completed" : "Queued"}
                      </span>
                    )}
                  </span>
```

*(`text-ink-400` → `text-ink-500`: 3.08:1 → 5.23:1, F-59.)*

#### Neden bu çözüm

| Alternatif | Değerlendirme |
|---|---|
| `<progress>` elementi | Yüzde bilinmiyor (crawl sırasında `pagesTotal` değişiyor). `<progress>` belirsiz modda ekran okuyucuda "busy" der ama sayfa sayısını duyurmaz. **Ret.** |
| `role="progressbar"` + `aria-valuenow` | `aria-valuenow` değişimi çoğu ekran okuyucuda **otomatik duyurulmaz** (kullanıcı elemana odaklanmalı). İlerlemeyi pasif olarak duymak istiyoruz. **Ret** — ama görsel bir progress bar eklenirse ek olarak kullanılabilir. |
| Doğrudan `<p aria-live="polite">` görünür metnin üzerinde | `state.currentUrl` ve `pagesDone` her tick'te değiştiği için saniyede birkaç duyuru → kullanılamaz. Throttle mantığı zaten gerekiyor. **Ret.** |
| **Ayrı `sr-only` `LiveRegion` + throttle** | Görsel metinden bağımsız, özetlenmiş, gürültüsüz. Bileşen 8 farklı yerde yeniden kullanılabilir (§5.8, §5.20, §5.36, §5.48). **Seçilen.** |

`aria-atomic="true"` kritik: bölge içeriği kısmen değiştiğinde ekran okuyucunun **tüm cümleyi** yeniden okumasını sağlar; aksi halde "3" gibi kopuk parçalar duyulur.

`aria-busy` `<ol>` üzerinde: yardımcı teknolojiye "bu bölge güncelleniyor, ara okumaya çalışma" der.

#### Nasıl doğrulanır

**Klavye/görsel:** Yeni tarama başlat → `/progress` sayfasına gel. Görsel değişiklik olmamalı (canlı bölge `sr-only`).

**VoiceOver (macOS, Safari):** `Cmd+F5` → sayfayı aç. Beklenen duyuru dizisi (≈5 sn aralıklarla):
```
"Scan queued. Waiting for a scanner worker."
"Preparing scanner. 0 of 3 pages processed."
"Scanning pages. 1 of 3 pages processed."
"Scanning pages. 2 of 3 pages processed."
"Scan complete. Opening results."
```
Duyurular arasında URL **okunmamalı**. Aynı cümle iki kez okunmamalı.

**NVDA (Windows, Firefox):** Aynı dizi. `NVDA+7` ile konuşma geçmişi (speech viewer) açıp doğrula.

**Otomatik test** — `e2e/authenticated/progress-live-region.spec.ts`:
```ts
test("progress page exposes a polite status region", async ({ page }) => {
  await page.goto(`/app/scans/${scanId}/progress`);
  const status = page.getByRole("status");
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toHaveAttribute("aria-atomic", "true");
  await expect(status).toContainText(/pages processed|queued|complete/i);
  // Adım listesi güncellenirken aria-busy true olmalı
  await expect(page.getByRole("list", { name: /scan progress steps/i }))
    .toHaveAttribute("aria-busy", "true");
});
```

#### 5.1.3 — Aynı `LiveRegion`'ın uygulanacağı diğer 8 nokta

| Konum | Duyurulacak mesaj |
|---|---|
| `TopNav.tsx:50-78` `saveWorkspaceName` | `Workspace renamed to {next}.` / hata metni (assertive) |
| `invite-section.tsx:112-116` | `Invite created for {email}.` / `Invite revoked.` |
| `plan-picker.tsx:85` | `Switched to {target} plan.` |
| `monitors-manager.tsx:86,109,126` | `Monitor added.` / `Monitor paused.` / `Monitor removed.` |
| `ai-panel.tsx:63-72` | `AI explanation ready.` |
| `issue-actions.tsx` | §5.8 |
| `reports/builder/page.tsx:88` | `Report generated. Download started.` |
| `visual-evidence-actions.tsx` | `Visual evidence deleted.` |

**Kural:** Uygulamada **layout başına en fazla bir kalıcı `role="status"`** olmalı. Birden fazla eşzamanlı canlı bölge, duyuruların birbirini yemesine yol açar. En temiz yol: `app/app/layout.tsx`'e tek bir `<AppLiveRegion />` koyup context üzerinden `announce(message)` çağırmak.

```tsx
// src/components/accessibility/AnnouncerProvider.tsx
"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const Ctx = createContext<(msg: string, opts?: { assertive?: boolean }) => void>(() => {});

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const announce = useCallback((msg: string, opts?: { assertive?: boolean }) => {
    // Aynı metni tekrar duyurmak için önce boşalt (SR "değişiklik" görsün).
    const set = opts?.assertive ? setAssertive : setPolite;
    set("");
    requestAnimationFrame(() => set(msg));
  }, []);
  return (
    <Ctx.Provider value={announce}>
      {children}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{polite}</p>
      <p role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">{assertive}</p>
    </Ctx.Provider>
  );
}

export const useAnnounce = () => useContext(Ctx);
```

`app/app/layout.tsx:19-40` içinde `<AnnouncerProvider>` `<main>`'i sarmalar. Sonra her yerde: `const announce = useAnnounce(); … announce("Workspace renamed.")`.

---

### 5.2 — F-02: `Dialog` focus trap, initial focus, focus restore · **P0**

#### Mevcut kod — `src/components/ui/Dialog.tsx:24-51`

```tsx
  const ref = useRef<HTMLDivElement>(null);   // ← tanımlı, hiç kullanılmıyor

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 …"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dlg-title"          // ← sabit ID; iki dialog açılırsa çakışır
      aria-describedby={description ? "dlg-desc" : undefined}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
```

Eksikler: initial focus yok · Tab döngüsü yok · kapanışta focus geri verilmiyor · `role="dialog"` **overlay** üzerinde (içerik kutusunda olmalı) · sabit ID · arka plan `inert` değil · `scrollbar` kaybı layout shift üretiyor.

#### Düzeltilmiş kod — `src/components/ui/Dialog.tsx` (tam dosya)

```tsx
"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "summary",
].join(",");

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Açılışta odaklanacak eleman. Verilmezse ilk odaklanabilir eleman. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;

  const focusables = useCallback((): HTMLElement[] => {
    const root = panelRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  }, []);

  // --- Açılış: focus'u kaydet, panele taşı; kapanışta geri ver. ---
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;

    // Panel DOM'a girdikten sonra odakla.
    const raf = requestAnimationFrame(() => {
      const target =
        initialFocusRef?.current ?? focusables()[0] ?? panelRef.current;
      target?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      // Tetikleyen eleman hâlâ DOM'daysa focus'u geri ver.
      const el = restoreRef.current;
      if (el && document.contains(el)) el.focus();
    };
  }, [open, initialFocusRef, focusables]);

  // --- Escape + Tab döngüsü. ---
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (active && !panelRef.current?.contains(active)) {
        // Odak bir şekilde dışarı kaçtıysa geri çek.
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose, focusables]);

  // --- Scroll lock. Scrollbar genişliğini telafi et → layout shift yok. ---
  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const gap = window.innerWidth - documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/50 backdrop-blur-sm p-0 sm:p-4"
      onMouseDown={(e) => {
        // mousedown + target kontrolü: panel içinde başlayan bir seçim
        // dışarıda bitince yanlışlıkla kapanmayı önler.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "bg-paper rounded-t-xl sm:rounded-lg shadow-[var(--shadow-pop)] w-full max-h-[90vh] overflow-hidden flex flex-col focus:outline-none",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl"
        )}
      >
        <header className="flex items-start justify-between gap-4 p-5 border-b border-line">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-ink-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-sm text-ink-600 mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="size-9 inline-flex items-center justify-center rounded-md text-ink-600 hover:bg-canvas-2"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && (
          <footer className="flex flex-col sm:flex-row sm:justify-end gap-2 p-5 border-t border-line bg-canvas/50">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
```

Ek olarak **`ConfirmDialog`** (F-29'un çözümü) — `src/components/ui/ConfirmDialog.tsx`:

```tsx
"use client";

import { useRef, type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  pending = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  children?: ReactNode;
}) {
  // Yıkıcı işlemlerde initial focus DAİMA "Cancel"da olmalı: Enter'a
  // refleksle basan kullanıcı veri silmemeli.
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      initialFocusRef={tone === "danger" ? cancelRef : undefined}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
```

> `Dialog.tsx:82`'deki `flex-col-reverse` **kaldırıldı** (WCAG 1.3.2, §4.1). Mobilde birincil aksiyonun altta olması isteniyorsa DOM sırası da değişmeli — görsel ve DOM sırası ayrılmamalı.

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| `<dialog>` native element + `showModal()` | **En doğru cevap** ve tarayıcı desteği artık yeterli (Safari 15.4+). Focus trap, Escape, `::backdrop`, `inert` ücretsiz gelir. **Ancak:** `showModal()` imperatif; React'te `open` prop'uyla senkronizasyon effect gerektirir, `::backdrop` Tailwind ile stillemek zahmetli, mobil bottom-sheet animasyonu için `::backdrop` + `dialog` kombinasyonu ekstra CSS ister. Proje 1 sprintlik bir a11y borcunu kapatıyor; **V2 için önerilir, V1 düzeltmesi için değil.** |
| `radix-ui/react-dialog` | ~14 kB gzip ek bundle. Focus trap, `inert`, portal, animasyon state'i hepsi çözülmüş ve savaşta test edilmiş. **Bir a11y ürünü için güçlü argüman: "kendi primitive'lerimizi yazıyoruz" riski yüksek.** Ancak proje şu an sıfır UI bağımlılığıyla çalışıyor ve bu bilinçli bir tercih gibi görünüyor (`package.json` yalnız `cva`+`clsx`+`tailwind-merge`). |
| `react-aria` `useDialog`+`FocusScope` | En sağlam ARIA uygulaması, ama `react-aria` ekosistemi tek bir bileşen için ağır ve API'si projedeki cva/Tailwind desenine yabancı. |
| **Elle yazılmış trap (yukarıdaki)** | ~90 satır, sıfır bağımlılık, mevcut API korunuyor (`open`/`onClose`/`title`/`footer`). **Seçilen** — ama §13'te "Q4: `<dialog>` native'e geç" maddesi bırakıldı. |

**Bilinçli olarak yapılmayan:** arka plan içeriğine `inert` uygulanmadı. Doğru yol `document.getElementById("main")?.setAttribute("inert","")` olurdu, ancak `Dialog` `<main>` içinde render edildiği için kendisi de inert olurdu. Portal'a geçilmeden `inert` uygulanamaz. Tab döngüsü zaten odağı içeride tutuyor; fare/ekran okuyucu sanal imleci için portal + `inert` §13'e alındı.

#### Nasıl doğrulanır

**Klavye:**
1. Dialog'u açan butona Tab ile git, Enter'a bas.
2. ✅ Focus dialog'un içindeki ilk odaklanabilir elemana (veya `ConfirmDialog`'da "Cancel"a) geçmeli.
3. Tab'a arka arkaya bas → son elemandan sonra ilk elemana dönmeli, **arka plana asla çıkmamalı**.
4. Shift+Tab → ters yönde aynı döngü.
5. Escape → dialog kapanmalı, **focus açan butona geri dönmeli**.
6. Overlay'e tıkla → kapanmalı, focus geri dönmeli.

**VoiceOver:** Dialog açıldığında "Delete all scan data, dialog" duyulmalı (başlık + rol). `VO+Shift+↓` ile dialog'a girip `VO+→` ile gezinildiğinde arka plan içeriğine **ulaşılabilir** (portal/inert yok — bilinen sınır, §13'te).

**Otomatik test** — `e2e/ui-mocks/dialog.spec.ts`:
```ts
test("dialog traps focus and restores it", async ({ page }) => {
  await page.goto("/app/states");
  const trigger = page.getByRole("button", { name: /delete all scan data/i });
  await trigger.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  // Focus dialog içinde
  await expect(dialog).toContainText(/permanent/i);
  const inside = await dialog.evaluate((d) => d.contains(document.activeElement));
  expect(inside).toBe(true);

  // 20 Tab sonra hâlâ içeride
  for (let i = 0; i < 20; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
```

---

### 5.3 — F-03: Filtre çipleri · `searchParams` tabanlı, JS'siz çalışan RSC filtreleri · **P0**

#### Mevcut kod — `src/app/app/scans/[id]/page.tsx:458-500` (tanım) ve `:261-287` (kullanım)

```tsx
function FilterChip({ label, count, active, severity }: { … }) {
  const baseClasses = active
    ? "bg-navy-900 text-paper ring-navy-900"
    : "bg-paper text-ink-700 ring-line hover:bg-canvas-2";
  return (
    <span                                            // ← <span>. Tıklanamaz, odaklanamaz.
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ring-1 min-h-[32px] ${baseClasses}`}
    >
      {severity && (
        <span aria-hidden className="size-1.5 rounded-full"
          style={{ background: severity === "critical" ? "var(--color-rose-500)" : … }} />
      )}
      {label}
      <span className={…}>{count}</span>
    </span>
  );
}
```

```tsx
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-700">
              <Filter className="size-3.5" aria-hidden /> Filter:
            </span>
            <FilterChip label="All" count={issueRows.length} active />
            <FilterChip label="Critical" count={counts.critical} severity="critical" />
            {/* … 4 çip daha, hepsi ölü … */}
          </div>
```

#### Düzeltilmiş kod

**Adım 1 — Sayfa imzasına `searchParams` ekle** (`page.tsx:33-38`):

```tsx
type SeverityFilter = "all" | "critical" | "serious" | "moderate" | "minor" | "review";
type ViewportFilter = "all" | "desktop" | "tablet" | "mobile" | "multiple";

export default async function ScanResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sev?: string; vp?: string; state?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const sev = (["critical", "serious", "moderate", "minor", "review"] as const)
    .includes(sp.sev as never)
    ? (sp.sev as Exclude<SeverityFilter, "all">)
    : "all";
  const vp = (["desktop", "tablet", "mobile", "multiple"] as const)
    .includes(sp.vp as never)
    ? (sp.vp as Exclude<ViewportFilter, "all">)
    : "all";
  const stateFilter = typeof sp.state === "string" ? sp.state : null;
  // … mevcut veri çekimi değişmeden devam …
```

**Adım 2 — `issueRows` üzerinden türetilmiş filtreli liste** (`counts` hesabından hemen sonra, `:100` civarı):

```tsx
  // Sayımlar DAİMA filtresiz set üzerinden hesaplanır — çipler her zaman
  // "toplam kaç tane var" bilgisini gösterir, kendi filtresinden etkilenmez.
  function matchesSeverity(issue: (typeof issueRows)[number]): boolean {
    if (sev === "all") return true;
    if (sev === "review") return issue.severity === "review";
    return issue.impact === sev || (!issue.impact && issue.severity === sev);
  }

  function matchesViewport(issue: (typeof issueRows)[number]): boolean {
    if (vp === "all") return true;
    const contexts = issue.contextsJson ?? [];
    const viewports = new Set(contexts.map((c) => c.viewport));
    if (vp === "multiple") return viewports.size > 1;
    return viewports.has(vp);
  }

  function matchesState(issue: (typeof issueRows)[number]): boolean {
    if (!stateFilter) return true;
    return (issue.contextsJson ?? []).some((c) => c.state === stateFilter);
  }

  const filteredRows = issueRows.filter(
    (i) => matchesSeverity(i) && matchesViewport(i) && matchesState(i)
  );
  const isFiltered = sev !== "all" || vp !== "all" || stateFilter !== null;

  // Gruplar da filtrelenmiş instance'lara göre yeniden kurulur.
  const filteredByGroup = new Map<string, typeof issueRows>();
  for (const row of filteredRows) {
    if (!row.groupId) continue;
    const bucket = filteredByGroup.get(row.groupId);
    if (bucket) bucket.push(row);
    else filteredByGroup.set(row.groupId, [row]);
  }
```

**Adım 3 — `FilterChip`'i `<Link>`'e çevir** (`:458` yerine):

```tsx
function FilterChip({
  label,
  count,
  active,
  severity,
  href,
}: {
  label: string;
  count: number;
  active?: boolean;
  severity?: "critical" | "serious" | "moderate" | "minor" | "review";
  href: string;
}) {
  const dotColor =
    severity === "critical"
      ? "bg-rose-500"
      : severity === "serious" || severity === "moderate"
      ? "bg-amber-500"
      : severity === "minor"
      ? "bg-blue-500"
      : severity === "review"
      ? "bg-purple-500"
      : null;

  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      aria-label={`${label}: ${count} finding${count === 1 ? "" : "s"}${active ? ", selected" : ""}`}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ring-1 min-h-[32px] transition-colors",
        active
          ? "bg-navy-900 text-paper ring-navy-900"
          : "bg-paper text-ink-700 ring-line hover:bg-canvas-2 hover:ring-line-strong"
      )}
    >
      {dotColor && <span aria-hidden className={cn("size-1.5 rounded-full", dotColor)} />}
      <span aria-hidden>{label}</span>
      <span aria-hidden className={cn("text-[0.625rem] tabular-nums", active ? "text-paper/80" : "text-ink-500")}>
        {count}
      </span>
    </Link>
  );
}
```

> Inline `style={{ background: "var(--color-…)" }}` (`:479-491`) **kaldırıldı** — artık Tailwind sınıfı. Bu, `data-contrast="high"` modunun çipleri de etkilemesini garantiler (V1 §8.3'teki doğrulanamayan madde kapanıyor).

**Adım 4 — Kullanım** (`:261-287` yerine):

```tsx
          <nav aria-label="Filter findings" className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span id="sev-filter-label" className="inline-flex items-center gap-2 text-xs font-medium text-ink-700">
                <Filter className="size-3.5" aria-hidden /> Severity:
              </span>
              <FilterChip href={buildHref({ sev: null })} label="All" count={issueRows.length} active={sev === "all"} />
              <FilterChip href={buildHref({ sev: "critical" })} label="Critical" count={counts.critical} severity="critical" active={sev === "critical"} />
              <FilterChip href={buildHref({ sev: "serious" })} label="Serious" count={counts.serious} severity="serious" active={sev === "serious"} />
              <FilterChip href={buildHref({ sev: "moderate" })} label="Moderate" count={counts.moderate} severity="moderate" active={sev === "moderate"} />
              <FilterChip href={buildHref({ sev: "minor" })} label="Minor" count={counts.minor} severity="minor" active={sev === "minor"} />
              <FilterChip href={buildHref({ sev: "review" })} label="Needs review" count={counts.review} severity="review" active={sev === "review"} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-700">
                <Filter className="size-3.5" aria-hidden /> Viewport:
              </span>
              <FilterChip href={buildHref({ vp: null })} label="All" count={issueRows.length} active={vp === "all"} />
              <FilterChip href={buildHref({ vp: "desktop" })} label="Desktop" count={contextSummary.desktop} active={vp === "desktop"} />
              <FilterChip href={buildHref({ vp: "tablet" })} label="Tablet" count={contextSummary.tablet} active={vp === "tablet"} />
              <FilterChip href={buildHref({ vp: "mobile" })} label="Mobile" count={contextSummary.mobile} active={vp === "mobile"} />
              <FilterChip href={buildHref({ vp: "multiple" })} label="Multiple" count={contextSummary.both} active={vp === "multiple"} />
            </div>
          </nav>

          {/* Filtre sonucu duyurusu — sayfa yenilendiğinde SR bunu okur. */}
          <p role="status" className="text-xs text-ink-600" aria-live="polite">
            {isFiltered ? (
              <>
                Showing <strong className="text-ink-900">{filteredRows.length}</strong> of{" "}
                {issueRows.length} findings.{" "}
                <Link href={`/app/scans/${scan.id}`} className="text-blue-600 underline underline-offset-2 font-medium">
                  Clear filters
                </Link>
              </>
            ) : (
              <>Showing all <strong className="text-ink-900">{issueRows.length}</strong> findings.</>
            )}
          </p>
```

`buildHref` yardımcısı (aynı dosyada, komponentin içinde tanımlanır çünkü `id`'ye ihtiyaç var):

```tsx
  function buildHref(patch: { sev?: string | null; vp?: string | null; state?: string | null }) {
    const next = new URLSearchParams();
    const merged = { sev, vp, state: stateFilter, ...patch };
    if (merged.sev && merged.sev !== "all") next.set("sev", merged.sev);
    if (merged.vp && merged.vp !== "all") next.set("vp", merged.vp);
    if (merged.state) next.set("state", merged.state);
    const qs = next.toString();
    return qs ? `/app/scans/${id}?${qs}` : `/app/scans/${id}`;
  }
```

**Adım 5 — Boş filtre sonucu durumu** (`hasGroups ? … : …` render'ından önce):

```tsx
          {filteredRows.length === 0 && issueRows.length > 0 ? (
            <EmptyState
              icon={Filter}
              title="No findings match these filters"
              description="Try a different severity or viewport, or clear the filters to see everything."
              action={
                <Link
                  href={`/app/scans/${scan.id}`}
                  className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
                >
                  Clear filters
                </Link>
              }
            />
          ) : hasGroups ? (
            /* … groups.map, instancesByGroup yerine filteredByGroup … */
          ) : (
            <div className="space-y-2.5">{filteredRows.map(renderRow)}</div>
          )}
```

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| `useState` + client-side filtre | Tüm bulgu listesini client'a hydrate etmek gerekir → F-28 (500+ bulgu) daha da kötüleşir. Paylaşılabilir URL yok. Geri tuşu çalışmaz. **Ret.** |
| `useRouter().push()` ile client-side query güncelleme | Çalışır ama JS gerekli, `<Link>` prefetch avantajı kaybolur, çipler `<button>` olur ve "sayfa değiştirme" semantiği kaybolur. **Ret.** |
| **`<Link>` + `searchParams` (RSC)** | JS kapalıyken bile çalışır · URL paylaşılabilir ("kritikleri gördün mü?" → link at) · geri/ileri tuşu doğru · `PrefetchLink` ile ısıtılabilir · filtreleme sunucuda, DOM'a sadece filtreli set gider (F-28'i de kısmen çözer) · `aria-current` semantiği doğru. **Seçilen.** |

`scroll={false}`: filtre değiştiğinde sayfa başına zıplamayı önler.

`aria-label` içinde sayı ve seçilme durumu: ekran okuyucu "Critical: 5 findings, selected, link" der. Görsel metin `aria-hidden` çünkü aksi halde "Critical 5 Critical: 5 findings" gibi çift okuma olur.

**Not:** `force-dynamic` olduğu için her filtre tıklaması sunucuya gider. `getScanJob`+`listIssues` çağrıları tekrarlanır. §5.28'de `unstable_cache`/`cacheLife` ile bu maliyeti düşüren varyant var; `searchParams` değişimi Next.js'te tam bir RSC yeniden çekimi tetikler ama payload sadece değişen segment kadardır.

#### Nasıl doğrulanır

**Klavye:** Tab ile çip grubuna gel → her çip ayrı bir Tab durağı olmalı (link listesi) → Enter → sayfa filtreli hâlde yenilenmeli, `aria-current="true"` seçili çipte olmalı.

**JS'siz:** DevTools → Settings → Debugger → "Disable JavaScript" → çipe tıkla. **Filtre çalışmalı.** Bu, çözümün doğru olduğunun kanıtıdır.

**VoiceOver:** `VO+U` → Links rotoru → "Critical: 5 findings, Serious: 12 findings…" listelenmeli. Filtre uygulandıktan sonra `role="status"` bölgesi "Showing 5 of 47 findings." duyurmalı.

**Otomatik test:**
```ts
test("severity filter narrows the finding list via URL", async ({ page }) => {
  await page.goto(`/app/scans/${scanId}`);
  const total = await page.getByRole("status").textContent();
  await page.getByRole("link", { name: /^Critical: \d+ findings/ }).click();
  await expect(page).toHaveURL(/\?sev=critical/);
  await expect(page.getByRole("link", { name: /Critical.*selected/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("status")).not.toHaveText(total ?? "");
});
```

---

### 5.4 — F-04: Compliance bölge seçici · ölü butonlar · **P0**

#### Mevcut kod — `src/app/app/compliance/page.tsx:210-241`

```tsx
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { id: "eu", label: "EU (Frankfurt)", current: true, description: "GDPR-friendly default." },
                { id: "us", label: "US (Virginia)", description: "Required for some clients." },
                { id: "other", label: "Other (on-request)", description: "Enterprise plan: AU, UK, CA." },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={!!r.current}        // ← her zaman sabit
                  className={…}                      // ← onClick YOK
                >
```

Üstelik `:236-241`'deki açıklama zaten "region selector records your residency preference. Actual data location follows the configured Firebase project region" diyor — yani buton **gerçekten de** bir şey yapamaz. Ölü buton, altında "aslında bu bir şey yapmıyor" yazan bir paragrafla birlikte duruyor. Bu, güven ekranında en kötü kombinasyon.

#### Düzeltilmiş kod — Seçenek A (önerilen): dürüst bilgi kartına çevir

```tsx
      {/* Region / hosting */}
      <section className="space-y-3">
        <SectionTitle icon={<Server className="size-4 text-ink-700" aria-hidden />} title="Region & data hosting" />
        <Card>
          <CardContent className="pt-5">
            <h3 className="sr-only">Data residency</h3>
            <dl className="grid sm:grid-cols-3 gap-4">
              {REGIONS.map((r) => {
                const active = r.id === ctx.workspace.region;
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "rounded-md p-4 ring-1 min-h-[88px]",
                      active ? "ring-blue-500 bg-blue-50/50" : "ring-line bg-paper"
                    )}
                  >
                    <dt className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                      {r.label}
                      {active && (
                        <Badge tone="info" size="sm">
                          <Check className="size-3" aria-hidden />
                          Current
                        </Badge>
                      )}
                      {!active && r.enterpriseOnly && (
                        <Badge tone="neutral" size="sm">Enterprise</Badge>
                      )}
                    </dt>
                    <dd className="text-xs text-ink-600 mt-1 leading-relaxed">{r.description}</dd>
                  </div>
                );
              })}
            </dl>
            <p className="text-xs text-ink-600 mt-4 leading-relaxed">
              Data residency is an infrastructure setting, not a toggle. Your workspace is
              currently hosted in <strong className="text-ink-900">{REGION_LABEL[ctx.workspace.region] ?? ctx.workspace.region}</strong>.
              To move regions,{" "}
              <a
                href="mailto:maitritechco@gmail.com?subject=Percevia%20data%20residency%20change"
                className="text-blue-600 underline underline-offset-2 font-medium"
              >
                contact us
              </a>{" "}
              — we migrate the Firebase project and the scan worker deployment together, and
              confirm the new region in writing before anything moves.
            </p>
          </CardContent>
        </Card>
      </section>
```

Dosya başına:

```tsx
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const REGIONS = [
  { id: "eu", label: "EU (Frankfurt)", description: "GDPR-friendly default. Scan worker runs in europe-west1." },
  { id: "us", label: "US (Virginia)", description: "Available on request for US-based clients." },
  { id: "other", label: "Other (AU, UK, CA)", description: "Available on the Enterprise plan.", enterpriseOnly: true },
] as const;

const REGION_LABEL: Record<string, string> = {
  eu: "the EU (Frankfurt)",
  us: "the US (Virginia)",
  uk: "the UK",
  ca: "Canada",
  other: "a custom region",
};
```

#### Düzeltilmiş kod — Seçenek B: gerçekten çalıştır

`/api/workspace` zaten `PATCH` kabul ediyor (`TopNav.tsx:60-64` bunu kullanıyor). Bir client island:

```tsx
// src/app/app/compliance/region-picker.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { useAnnounce } from "@/components/accessibility/AnnouncerProvider";
import { cn } from "@/lib/utils";

const REGIONS = [
  { id: "eu", label: "EU (Frankfurt)", description: "GDPR-friendly default." },
  { id: "us", label: "US (Virginia)", description: "Required for some clients." },
  { id: "other", label: "Other (on-request)", description: "Enterprise plan: AU, UK, CA." },
] as const;

export function RegionPicker({ initial, canEdit }: { initial: string; canEdit: boolean }) {
  const router = useRouter();
  const announce = useAnnounce();
  const [region, setRegion] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function select(next: string) {
    if (!canEdit || next === region) return;
    const previous = region;
    setRegion(next);              // optimistic
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: next }),
      });
      if (!res.ok) {
        setRegion(previous);      // rollback
        setError("Could not update your residency preference. Try again.");
        announce("Region change failed.", { assertive: true });
        return;
      }
      announce(`Residency preference set to ${next.toUpperCase()}.`);
      router.refresh();
    });
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Data residency preference" className="grid sm:grid-cols-3 gap-4">
        {REGIONS.map((r) => {
          const active = r.id === region;
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              disabled={!canEdit || pending}
              onClick={() => select(r.id)}
              onKeyDown={(e) => {
                const idx = REGIONS.findIndex((x) => x.id === region);
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  select(REGIONS[(idx + 1) % REGIONS.length].id);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  select(REGIONS[(idx - 1 + REGIONS.length) % REGIONS.length].id);
                }
              }}
              className={cn(
                "text-left rounded-md p-4 ring-1 transition-colors min-h-[88px] disabled:opacity-60 disabled:cursor-not-allowed",
                active ? "ring-blue-500 bg-blue-50/50" : "ring-line bg-paper hover:bg-canvas-2"
              )}
            >
              <span className="text-sm font-semibold text-ink-900 flex items-center gap-1.5">
                {active && <Check className="size-3.5 text-blue-700" aria-hidden />}
                {r.label}
              </span>
              <span className="block text-xs text-ink-600 mt-1 leading-relaxed">{r.description}</span>
            </button>
          );
        })}
      </div>
      {!canEdit && (
        <p className="text-xs text-ink-600 mt-3">
          Only workspace owners and admins can change the residency preference.
        </p>
      )}
      {error && <AlertCallout tone="danger" className="mt-3">{error}</AlertCallout>}
    </div>
  );
}
```

#### Neden bu çözüm

**Seçenek A önerilir.** Gerekçe: `compliance/page.tsx:236-241`'deki mevcut açıklama zaten seçicinin *gerçek bir şey yapmadığını* itiraf ediyor. Bir tercihi kaydeden ama hiçbir etkisi olmayan bir kontrol, "privacy-first, dürüst konumlanma" markasında **ölü butondan daha kötüdür** — kullanıcı verisinin gerçekten taşındığını sanabilir. En dürüst UI, gerçeği gösteren bir bilgi kartıdır + iletişim yolu.

Seçenek B yalnızca `region` alanı **gerçekten** bir şeyi etkiliyorsa (örn. rapor şablonunda veri lokasyonu beyanı, DPA metni) uygulanmalıdır. O zaman "records your residency preference" cümlesi de "This preference appears in your DPA and generated reports." olarak netleşmelidir.

Seçenek B'de `role="radiogroup"` + roving `tabIndex` + ok tuşları var (F-12'deki hatayı tekrarlamamak için) — bu deseni §5.12'deki `SegmentedRadio` bileşeninden alarak çoğaltmayı önlemek daha iyidir.

#### Nasıl doğrulanır

**Seçenek A:** Tab ile bölüme gel → **hiçbir buton odaklanmamalı** (artık `<dl>`). Ekran okuyucu: "Region and data hosting, EU (Frankfurt), Current. GDPR-friendly default." — tanım listesi olarak okunmalı.
**Seçenek B:** Tab ile gruba gel → **tek durak** (roving tabindex). Ok tuşlarıyla dolaş → `aria-checked` takip etmeli. `role="status"` duyurusu gelmeli. Ağı kes (DevTools offline) → rollback olmalı, hata görünmeli.

**Otomatik test (A):**
```ts
test("compliance region section has no dead buttons", async ({ page }) => {
  await page.goto("/app/compliance");
  const section = page.getByRole("region", { name: /region & data hosting/i })
    .or(page.locator("section").filter({ hasText: "Region & data hosting" }));
  expect(await section.getByRole("button").count()).toBe(0);
});
```

---

### 5.5 — F-05: Settings → Notifications · sahte switch'ler · **P0**

#### Mevcut kod — `src/app/app/settings/settings-client.tsx:154-183`

```tsx
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose when Percevia AI emails you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 divide-y divide-line">
              <div className="pt-4 first:pt-0">
                <Switch defaultChecked label="Scan complete" description="Email me when a scan I started finishes." />
              </div>
              {/* 2 tane daha — hiçbirinde onChange, state veya kaydetme yok */}
```

#### Düzeltilmiş kod — dürüst "yakında" durumu (1 saatlik düzeltme)

```tsx
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                In-app notifications are live. Email delivery is on the roadmap.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <AlertCallout tone="info" title="Email notifications aren't available yet">
                Scan, report, and team events already appear in the bell menu in the top bar.
                Email delivery isn&apos;t built yet — we&apos;d rather show you nothing than a
                switch that doesn&apos;t do anything.
              </AlertCallout>

              <fieldset disabled aria-describedby="notif-soon" className="space-y-4 divide-y divide-line opacity-60">
                <legend className="sr-only">Planned email notifications</legend>
                <div className="pt-4 first:pt-0">
                  <Switch
                    id="notif-scan-complete"
                    checked={false}
                    readOnly
                    label="Scan complete"
                    description="Email me when a scan I started finishes."
                  />
                </div>
                <div className="pt-4">
                  <Switch
                    id="notif-critical"
                    checked={false}
                    readOnly
                    label="New critical findings"
                    description="Alert me if a scan introduces new critical issues."
                  />
                </div>
                <div className="pt-4">
                  <Switch
                    id="notif-weekly"
                    checked={false}
                    readOnly
                    label="Weekly summary"
                    description="A Monday-morning roundup of workspace activity."
                  />
                </div>
              </fieldset>
              <p id="notif-soon" className="text-xs text-ink-600">
                These switches are disabled until email delivery ships.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
```

#### Düzeltilmiş kod — gerçek implementasyon (yarım günlük)

`Workspace` dokümanına `notificationPrefs` alanı ekleyip Server Action ile kaydetmek:

```tsx
// src/app/app/settings/notification-form.tsx
"use client";

import { useActionState } from "react";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { updateNotificationPrefsAction, type NotifState } from "@/lib/server/workspace-actions";

const initialState: NotifState = { ok: null, message: null };

export function NotificationForm({
  initial,
}: {
  initial: { scanComplete: boolean; newCritical: boolean; weeklySummary: boolean };
}) {
  const [state, formAction, pending] = useActionState(updateNotificationPrefsAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-4 divide-y divide-line">
        <div className="pt-4 first:pt-0">
          <Switch name="scanComplete" defaultChecked={initial.scanComplete}
            label="Scan complete" description="Email me when a scan I started finishes." />
        </div>
        <div className="pt-4">
          <Switch name="newCritical" defaultChecked={initial.newCritical}
            label="New critical findings" description="Alert me if a scan introduces new critical issues." />
        </div>
        <div className="pt-4">
          <Switch name="weeklySummary" defaultChecked={initial.weeklySummary}
            label="Weekly summary" description="A Monday-morning roundup of workspace activity." />
        </div>
      </div>

      {state.ok === true && (
        <AlertCallout tone="success" live>Notification preferences saved.</AlertCallout>
      )}
      {state.ok === false && (
        <AlertCallout tone="danger" live>{state.message ?? "Could not save. Try again."}</AlertCallout>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}
```

*(`live` prop'u §5.47'de `AlertCallout`'a ekleniyor.)*

#### Neden bu çözüm

React 19'da `useActionState` (eski `useFormState`) form + Server Action + pending + dönüş değeri kombinasyonunu tek hook'ta veriyor; `useFormStatus` yalnız pending için ayrı bir alt bileşen gerektirir. Bu form için `useActionState` daha uygun çünkü **sonucu da** göstermek istiyoruz.

"Dürüst yakında" seçeneği neden önce: F-05 bir P0 çünkü **kullanıcı yanılıyor**, özellik eksik olduğu için değil. Eksik özellik P2'dir; yalan söyleyen arayüz P0'dır. Bu ayrım `docs/microcopy.md:78-79` ("Direct > evasive") ile birebir uyumlu.

#### Nasıl doğrulanır

**"Yakında" versiyonu:** Tab ile Notifications sekmesine gel → switch'ler odak almamalı (`<fieldset disabled>`). Ekran okuyucu: "Planned email notifications, group, dimmed" demeli.
**Gerçek versiyon:** Switch'i değiştir → Save → `role="alert"` "Notification preferences saved." duyurulmalı → sayfayı yenile → değer korunmalı.

---

### 5.6 — F-06 + F-46: Erişilebilir tablolar · **P1**

#### Mevcut kod — `src/app/app/team/page.tsx:93-114`

```tsx
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody className="divide-y divide-line">
                {PERMISSIONS.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-3 text-ink-700">{p.label}</td>
                    {ROLES.map((r) => (
                      <td key={r.id} className="py-3 px-2 text-center">
                        {PERMISSION_MATRIX[r.id as Role]?.[p.id] ? (
                          <Check className="size-4 text-green-700 inline" />
                        ) : (
                          <X className="size-4 text-ink-300 inline" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
```

Ekran okuyucunun duyduğu: *"Row 4, Export reports, blank, blank, blank, blank, blank, blank."* İkonların ne `alt`'ı ne `aria-label`'ı var; sütunların başlığı yok.

#### Düzeltilmiş kod

```tsx
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <caption className="sr-only">
                Permission matrix: which workspace role can perform each action.
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
                    Permission
                  </th>
                  {ROLES.map((r) => (
                    <th
                      key={r.id}
                      scope="col"
                      className="py-2 px-2 text-center text-xs font-medium text-ink-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {PERMISSIONS.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="py-3 pr-3 text-left font-normal text-ink-700">
                      {p.label}
                    </th>
                    {ROLES.map((r) => {
                      const allowed = !!PERMISSION_MATRIX[r.id as Role]?.[p.id];
                      return (
                        <td key={r.id} className="py-3 px-2 text-center">
                          {allowed ? (
                            <Check className="size-4 text-green-700 inline" aria-hidden />
                          ) : (
                            <X className="size-4 text-ink-600 inline" aria-hidden />
                          )}
                          <span className="sr-only">{allowed ? "Allowed" : "Not allowed"}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
```

Değişiklikler:
1. `<caption className="sr-only">` — tablonun amacı (WCAG 1.3.1 + tablo gezinme kolaylığı).
2. `<thead>` + `<th scope="col">` — sütun başlıkları.
3. İlk hücre `<td>` → `<th scope="row">` — satır başlığı. Bu ikisi sayesinde ekran okuyucu her hücrede "Export reports, Auditor, Not allowed" der.
4. İkonlara `aria-hidden` + yanına `sr-only` metin.
5. `text-ink-300` → `text-ink-600`: **1.99:1 → 6.91:1** (F-59). `X` ikonu artık anlam taşımıyor (metin var) ama görsel kullanıcı için de okunabilir olmalı.

**Dashboard boş `<th>` (F-46)** — `src/app/app/page.tsx:216-223`:

```tsx
                  <thead>
                    <tr className="text-left text-xs font-medium text-ink-500 uppercase tracking-wider border-b border-line">
                      <th scope="col" className="pb-2 font-medium">URL</th>
                      <th scope="col" className="pb-2 font-medium">Pages</th>
                      <th scope="col" className="pb-2 font-medium">Status</th>
                      <th scope="col" className="pb-2 font-medium">When</th>
                      <th scope="col" className="pb-2 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
```

ve `:246-255` link'e bağlam ekle (WCAG 2.4.4):

```tsx
                          <Link
                            href={s.status === "completed" ? `/app/scans/${s.id}` : `/app/scans/${s.id}/progress`}
                            className="inline-flex items-center min-h-[24px] px-1 text-xs font-medium text-blue-600 underline underline-offset-2"
                          >
                            View
                            <span className="sr-only"> {hostFromUrl(s.baseUrl)} scan</span>
                          </Link>
```

*(`min-h-[24px] px-1` → F-53/2.5.8; `underline` → F-51/1.4.1.)*

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| `aria-label` ikonun üzerine | `<svg>` üzerinde `aria-label` yalnızca `role="img"` ile birlikte güvenilir. `sr-only` `<span>` her ekran okuyucuda çalışır. **Ret.** |
| ✅/❌ Unicode karakter | Emoji/sembol okuma davranışı ekran okuyucudan ekran okuyucuya değişir ("heavy check mark" vs "check"). **Ret.** |
| İkon yerine "Yes"/"No" metni | En basit çözüm ve `1.4.11` sorununu tamamen ortadan kaldırır, ama 7 sütunlu tabloda yatay alan patlar. Yeşil/gri ikon + `sr-only` en iyi denge. **Seçilen.** |
| Tabloyu mobilde kart listesine çevir | 1.4.10 Reflow açısından daha iyi olur; §6 ekran spesifikasyonunda "Team" için önerildi ama F-06'nın kapsamı dışında. |

#### Nasıl doğrulanır

**VoiceOver tablo modu:** `VO+Cmd+T` ile tabloya gir, `VO+→` ile hücreler arasında dolaş. Her hücrede satır ve sütun başlığı + değer duyulmalı:
> "Export reports, Auditor, Allowed"

**NVDA:** Tablo modunda `Ctrl+Alt+→` ile sütun geç → sütun başlığı duyulmalı.

**Otomatik test:**
```ts
test("permission matrix is programmatically labelled", async ({ page }) => {
  await page.goto("/app/team");
  const table = page.getByRole("table", { name: /permission matrix/i });
  await expect(table.getByRole("columnheader")).toHaveCount(7); // Permission + 6 rol
  await expect(table.getByRole("rowheader").first()).toBeVisible();
  await expect(table.getByText("Allowed").first()).toBeAttached();
});
```

**axe:** `table-fake-caption`, `td-headers-attr`, `th-has-data-cells`, `empty-table-header` kurallarının hepsi geçmeli.

---

### 5.7 — F-07: `useId()` ile kararlı ID · **P1**

#### Mevcut kod

`src/components/ui/Checkbox.tsx:14`:
```tsx
    const inputId = id ?? `cb-${Math.random().toString(36).slice(2, 9)}`;
```
`src/components/ui/Switch.tsx:13`:
```tsx
    const inputId = id ?? `sw-${Math.random().toString(36).slice(2, 9)}`;
```

Sunucuda `cb-k3j9x2a`, client'ta `cb-p7m1q4z` üretilir. `<label htmlFor>` ve `<input id>` aynı render'da üretildiği için görsel olarak çalışır, ama:
- React hydration'da attribute farkını görür → geliştirme modunda uyarı, üretimde `id` client değeriyle üzerine yazılır.
- `aria-describedby`/`aria-labelledby` ile dışarıdan referans verilemez (id tahmin edilemez).
- Aynı sayfada iki kez render edilirse **çakışma ihtimali** var (küçük ama sıfır değil).

#### Düzeltilmiş kod

`Checkbox.tsx`:
```tsx
"use client";

import { Check } from "lucide-react";
import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, "aria-describedby": describedBy, ...props }, ref) => {
    const reactId = useId();
    const inputId = id ?? `cb-${reactId}`;
    const descId = description ? `${inputId}-desc` : undefined;

    return (
      <label htmlFor={inputId} className={cn("flex items-start gap-3 cursor-pointer group", className)}>
        <span className="relative inline-flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            aria-describedby={cn(descId, describedBy) || undefined}
            className="peer absolute inset-0 size-5 opacity-0 cursor-pointer"
            {...props}
          />
          <span
            aria-hidden
            className={cn(
              "size-5 rounded-sm ring-1 ring-border-field bg-paper transition-colors",
              "peer-checked:bg-navy-900 peer-checked:ring-navy-900",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2"
            )}
          />
          <Check
            aria-hidden
            className="absolute size-3.5 text-paper opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
            strokeWidth={3}
          />
        </span>
        {(label || description) && (
          <span className="flex-1 -mt-0.5">
            {label && <span className="block text-sm text-ink-900 leading-snug">{label}</span>}
            {description && (
              <span id={descId} className="block text-xs text-ink-600 mt-1 leading-snug">
                {description}
              </span>
            )}
          </span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
```

`Switch.tsx` aynı desende (`sw-${reactId}`, `aria-describedby`, `ring-border-field`).

> `ring-line-strong` → `ring-border-field`: §7.3'te tanımlanan yeni token (#9AA3B8, 3.02:1). Bu tek değişiklik `Checkbox`, `Switch` ve `Input`'un 1.4.11 ihlalini kapatıyor (F-59).

#### Neden bu çözüm

`useId()` React 18+ ile sunucu ve client'ta **aynı** değeri üretir; tam olarak bu problem için tasarlanmıştır. `Tabs.tsx:27` zaten `useId()` kullanıyor — desen projede mevcut, sadece bu iki bileşende uygulanmamış.

`aria-describedby` eklenmesi bonus: `description` prop'u artık programatik olarak bağlı. Şu an `scans/new/page.tsx:280` ve `:246,261`'deki uzun açıklama metinleri ekran okuyucuya **hiç ulaşmıyor** — bunlar consent ve gizlilik metinleri. Bu, F-37'nin bir parçasının bedava çözülmesi demek.

`cn(descId, describedBy)` — dışarıdan verilen `aria-describedby` korunuyor, ezilmiyor.

#### Nasıl doğrulanır

**Konsol:** `npm run dev` → New Scan sayfası → konsolda `Warning: Prop 'id' did not match` **görülmemeli**.
**VoiceOver:** New Scan'de consent checkbox'ına Tab ile git. Beklenen: *"I confirm I own this website or have permission to scan it…, checkbox, unchecked. By starting this scan you confirm you have authorization from the site owner."* — ikinci cümle şu an **duyulmuyor**, yamadan sonra duyulmalı.
**Otomatik:**
```ts
test("checkbox description is programmatically associated", async ({ page }) => {
  await page.goto("/app/scans/new");
  const cb = page.getByRole("checkbox", { name: /I confirm I own this website/i });
  const described = await cb.getAttribute("aria-describedby");
  expect(described).toBeTruthy();
  await expect(page.locator(`#${described}`)).toContainText(/authorization from the site owner/i);
});
```

---

### 5.8 — F-08 + F-61: Optimistic issue durumu · React 19 · **P1**

#### Mevcut kod — `src/app/app/scans/[id]/issues/[issueId]/issue-actions.tsx:30-56, 87-109`

```tsx
  async function patch(payload: Record<string, unknown>) {
    startTransition(async () => {
      await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.refresh();          // ← setStatus HİÇ çağrılmıyor
    });
  }
  …
      <button type="button" onClick={() => patch({ status: "fixed" })} className="…">
        <CheckCircle2 className="size-4" aria-hidden /> Mark fixed
      </button>                  {/* disabled yok → çift tıklama = çift PATCH */}
```

Ayrıca `:41-56` `createTask` hiçbir hata durumunu göstermiyor (`if (res.ok)` — else yok) ve `:54` başarı mesajı 2.5 sn sonra kayboluyor (F-61).

#### Düzeltilmiş kod (tam dosya)

```tsx
"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquarePlus, ShieldQuestion, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { issueErrorMessage } from "@/lib/errors/messages";

const STATUSES: { id: string; label: string }[] = [
  { id: "to_review", label: "To Review" },
  { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In Progress" },
  { id: "needs_human_review", label: "Needs Human Review" },
  { id: "fixed", label: "Fixed" },
  { id: "accepted_risk", label: "Accepted Risk" },
];

const STATUS_LABEL = new Map(STATUSES.map((s) => [s.id, s.label]));

export function IssueActions({
  issueId,
  initialStatus,
}: {
  issueId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  // React 19: transition boyunca optimistic değer görünür, transition
  // bittiğinde otomatik olarak `status`a geri döner. Hata durumunda
  // `setStatus` çağırmadığımız için rollback ücretsiz gelir.
  const [optimisticStatus, applyOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function patch(payload: Record<string, unknown>, optimistic?: string) {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      if (optimistic) applyOptimistic(optimistic);

      try {
        const res = await fetch(`/api/issues/${issueId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(issueErrorMessage(body.error) ?? "Could not update this finding. Try again.");
          return; // optimistic değer otomatik geri alınır
        }
        if (optimistic) setStatus(optimistic);
        setNotice(
          optimistic
            ? `Status set to ${STATUS_LABEL.get(optimistic) ?? optimistic}.`
            : "Finding updated."
        );
        router.refresh();
      } catch {
        setError("Network error. Your change was not saved.");
      }
    });
  }

  function createTask() {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      try {
        const res = await fetch(`/api/remediation-tasks`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            issueId,
            title: "Address accessibility finding",
            priority: "medium",
            status: "to_review",
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(issueErrorMessage(body.error) ?? "Could not create the task. Try again.");
          return;
        }
        setNotice("Task created on the remediation board.");
        router.refresh();
      } catch {
        setError("Network error. The task was not created.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-start">
        <label className="inline-flex items-center gap-2 text-xs">
          <span className="sr-only">Finding status</span>
          <select
            value={optimisticStatus}
            disabled={pending}
            onChange={(e) => patch({ status: e.target.value }, e.target.value)}
            className="h-10 px-3 rounded-md ring-1 ring-border-field bg-paper text-sm font-medium text-ink-900 disabled:opacity-60"
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          {pending && <Loader2 className="size-3.5 animate-spin text-ink-500" aria-hidden />}
        </label>

        <Button variant="secondary" size="sm" onClick={createTask} disabled={pending}>
          <Plus className="size-4" aria-hidden /> Create task
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => patch({ status: "fixed" }, "fixed")}
          disabled={pending || optimisticStatus === "fixed"}
        >
          <CheckCircle2 className="size-4" aria-hidden /> Mark fixed
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => patch({ falsePositive: true, status: "false_positive" }, "false_positive")}
          disabled={pending}
        >
          <ShieldQuestion className="size-4" aria-hidden /> False positive
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => patch({ humanReviewRequired: true }, "needs_human_review")}
          disabled={pending}
        >
          <MessageSquarePlus className="size-4" aria-hidden /> Flag for review
        </Button>
      </div>

      {/* Kalıcı geri bildirim — kaybolmuyor (F-61), duyuruluyor (F-01). */}
      <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-green-700 min-h-[1rem]">
        {notice}
      </p>
      {error && <AlertCallout tone="danger" className="text-xs">{error}</AlertCallout>}
    </div>
  );
}
```

Ayrıca sağ kenardaki "Status" kartı (`issues/[issueId]/page.tsx:110-118`) artık `IssueActions` ile senkron olmalı — en temiz çözüm o kartı kaldırıp durumu `IssueActions` içinde göstermek, ya da tüm sayfa `router.refresh()` sonrası zaten güncelleneceği için olduğu gibi bırakmak. **Öneri:** kaldır — aynı bilgiyi iki yerde göstermek F-08'in kök nedeni.

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| `setStatus` çağır, hata olursa geri al | Elle rollback yazmak gerekir; birden çok eşzamanlı istekte state karışır. React 19'da bunun için bir primitive var. **Ret.** |
| Server Action + `useActionState` | Daha idiomatik olurdu ama mevcut `/api/issues/[id]` route'u zaten var ve başka yerlerden de kullanılıyor. Server Action'a geçiş ayrı bir refactor. **§13'e.** |
| **`useOptimistic` + `useTransition`** | Rollback ücretsiz, `pending` ücretsiz, `router.refresh()` transition içinde olduğu için sayfa "yanıp sönmüyor". **Seçilen.** |

**Kritik detay:** `applyOptimistic` **mutlaka** `startTransition` içinde çağrılmalı; dışarıda çağrılırsa React runtime hatası verir. Yukarıdaki kodda ilk satırdadır.

`min-h-[1rem]` `role="status"` üzerinde: mesaj geldiğinde/gittiğinde layout shift olmaması için (CLS, §8.2).

`disabled={pending || optimisticStatus === "fixed"}` — "Mark fixed" zaten fixed'ken tıklanamaz. Bu, F-08'in "çift PATCH" kısmını kapatır.

#### Nasıl doğrulanır

**Klavye:** Issue detayına git → Tab ile "Mark fixed"e gel → Enter.
1. ✅ Select **anında** "Fixed" göstermeli (ağ beklenmeden).
2. ✅ Tüm butonlar `disabled` olmalı (Tab ile atlanmalı).
3. ✅ Altta "Status set to Fixed." kalıcı olarak görünmeli.
4. DevTools → Network → Offline → tekrar dene: select eski değere **geri dönmeli**, kırmızı `AlertCallout` çıkmalı.

**VoiceOver:** Adım 3'te "Status set to Fixed." duyulmalı. Butonların `disabled` olması "dimmed" olarak duyulmalı.

**Otomatik:**
```ts
test("marking fixed updates the select optimistically", async ({ page }) => {
  await page.route("**/api/issues/*", async (route) => {
    await new Promise((r) => setTimeout(r, 800)); // yavaş ağ simülasyonu
    await route.fulfill({ status: 200, body: "{}" });
  });
  await page.goto(`/app/scans/${scanId}/issues/${issueId}`);
  await page.getByRole("button", { name: /mark fixed/i }).click();
  // Ağ yanıtı gelmeden select değişmeli
  await expect(page.getByRole("combobox")).toHaveValue("fixed", { timeout: 200 });
  await expect(page.getByRole("status")).toHaveText(/status set to fixed/i);
});
```

---

### 5.9 — F-09: Print butonu · **P1**

#### Mevcut kod — `src/app/app/reports/preview/page.tsx:61-63`

```tsx
        <span className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-navy-900 text-paper text-sm font-medium">
          <Printer className="size-4" aria-hidden /> Use browser print
        </span>
```

#### Düzeltilmiş kod

Yeni dosya `src/app/app/reports/preview/print-button.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintReportButton() {
  const busyRef = useRef(false);

  function print() {
    if (busyRef.current) return;
    busyRef.current = true;
    // iframe içeriğini yazdırmak için önce iframe'e odaklan; yoksa
    // tarayıcı dış sayfayı (nav dâhil) yazdırır.
    const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Report preview"]');
    try {
      if (frame?.contentWindow) {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } else {
        window.print();
      }
    } finally {
      busyRef.current = false;
    }
  }

  return (
    <Button size="sm" onClick={print}>
      <Printer className="size-4" aria-hidden /> Print report
    </Button>
  );
}
```

`page.tsx` içinde:

```tsx
import { PrintReportButton } from "./print-button";
…
        <PrintReportButton />
```

Ayrıca iframe'i geciktir (`:65`):

```tsx
      <iframe
        title="Report preview"
        srcDoc={html}
        loading="lazy"
        sandbox="allow-same-origin allow-modals"
        className="mx-auto my-8 block h-[80vh] w-full max-w-4xl rounded-md bg-paper shadow-[var(--shadow-card)]"
      />
```

#### Neden bu çözüm

`window.print()` dış sayfayı yazdırır — nav, sticky header, `no-print` sınıfı olan her şey (`globals.css:157-162` bunu kısmen ele alıyor). Ama önizlenen **rapor** iframe içinde. `frame.contentWindow.print()` doğru içeriği yazdırır. `sandbox` eklenmesi `srcDoc` HTML'inin script çalıştırmasını engeller (rapor HTML'i `lib/reports/render.ts`'ten geliyor, güvenilir, ama defensive).

`allow-modals` `print()` çağrısı için gerekli; `allow-same-origin` olmadan `contentWindow`'a erişilemez.

`loading="lazy"` — `srcDoc` ile birlikte etkisi sınırlı (içerik zaten HTML'de) ama iframe'in render/layout maliyetini viewport'a girene kadar erteler.

**Alternatif:** Rapor için ayrı bir `/app/reports/[id]/print` rotası + `@media print` — daha temiz ama yeni rota gerekir. §13'e.

#### Nasıl doğrulanır

Tab ile butona gel → focus ring görünmeli → Enter → yazdırma diyalogu açılmalı ve **önizlemede yalnız rapor** görünmeli (üstteki "Back to builder" barı olmamalı). `Cmd+P` dış sayfayı yazdırır; buton iframe'i yazdırır — ikisinin farkı görülmeli.

---

### 5.10 — F-10: TopNav arama kutusu · **P1**

#### Mevcut kod — `src/components/nav/TopNav.tsx:165-175`

```tsx
        <div className="flex-1 max-w-md hidden md:block">
          <label className="relative block">
            <span className="sr-only">Search scans, issues, pages</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-500" aria-hidden />
            <input type="search" placeholder="Search scans, issues, pages…" className="…" />
          </label>
        </div>
```

#### Düzeltilmiş kod — kısa vade: kaldır (önerilen)

```tsx
        {/* Global arama henüz yok. Çalışmayan bir arama kutusu göstermek
            yerine boşluk bırakıyoruz — kutu, /app/search rotası ile
            birlikte geri gelecek (bkz. roadmap). */}
        <div className="flex-1 hidden md:block" aria-hidden />
```

#### Düzeltilmiş kod — orta vade: gerçek arama

```tsx
// src/components/nav/GlobalSearch.tsx
"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  return (
    <form
      role="search"
      aria-label="Search workspace"
      className="flex-1 max-w-md hidden md:block"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        if (!term) return;
        router.push(`/app/search?q=${encodeURIComponent(term)}`);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Search scans, findings, and pages
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-500" aria-hidden />
        <input
          id={inputId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-describedby={hintId}
          placeholder="Search scans, findings, pages…"
          className="w-full h-10 pl-9 pr-3 rounded-md bg-canvas ring-1 ring-border-field text-sm text-ink-900 placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
      <p id={hintId} className="sr-only">
        Press Enter to search. Results open on a dedicated page.
      </p>
    </form>
  );
}
```

#### Neden bu çözüm

`role="search"` + `<form>` semantiği: ekran okuyucu kullanıcıları landmark rotorundan doğrudan aramaya atlayabilir (WCAG 2.4.1 Bypass Blocks'a da katkı).

**Kaldırma neden önerilen:** Global arama, Firestore'da composite index + full-text çözümü (Algolia/Typesense veya `array-contains` tabanlı token index) gerektirir — 1-2 haftalık iş. O gelene kadar arama kutusu **sahte bir yetenek** vaat ediyor. `docs/microcopy.md:78-79` "Direct > evasive". Ayrıca F-10 aynı zamanda 2.4.5 Multiple Ways'i yanıltıcı hale getiriyor (§4.2).

**`aria-hidden` boş div neden:** Layout'ta `justify-between` var (`TopNav.tsx:89`); ortadaki esnek alanı kaldırmak workspace switcher'ı hesap menüsüne yapıştırır. Boş bir flex spacer daha güvenli.

#### Nasıl doğrulanır

Kaldırma sonrası: Tab sırasında workspace butonundan sonra doğrudan bildirim ziline geçilmeli.
Gerçek arama sonrası: `/` tuşuyla odaklama kısayolu **eklenmemeli** (WCAG 2.1.4 Character Key Shortcuts — eklenirse kapatma/yeniden atama seçeneği zorunlu).

---

### 5.11 — F-11: Görünür focus'lu radyo kartları · **P1**

#### Mevcut kod — `src/app/app/scans/new/page.tsx:153-175`

```tsx
                  return (
                    <label
                      key={t.id}
                      className={cn(
                        "rounded-md p-3 ring-1 bg-paper transition-colors text-sm",
                        "cursor-pointer",
                        active ? "ring-2 ring-navy-900" : "ring-line hover:bg-canvas-2",
                      )}
                    >
                      <input
                        type="radio"
                        name="scan-type"
                        className="sr-only"        // ← 1×1 px'lik alanda görünmez focus
                        checked={active}
                        onChange={() => setType(t.id)}
                      />
                      <p className="font-medium text-ink-900">{t.label}</p>
                      <p className="text-xs text-ink-600 mt-1 leading-snug">{t.description}</p>
                    </label>
                  );
```

`sr-only` `position:absolute; width:1px; height:1px; clip:rect(0,0,0,0)` (`globals.css:164-174`) — global `*:focus-visible { outline: 2px solid }` kuralı **1×1 px'lik kırpılmış** bir kutuya uygulanıyor. Klavye kullanıcısı hiçbir şey göremez.

#### Düzeltilmiş kod

```tsx
            <fieldset>
              <legend className="block text-sm font-medium text-ink-700 mb-2">Scan type</legend>
              <div className="grid grid-cols-2 gap-2">
                {SCAN_TYPES.map((t) => {
                  const active = type === t.id;
                  return (
                    <label
                      key={t.id}
                      className={cn(
                        "relative block rounded-md p-3 bg-paper text-sm cursor-pointer transition-colors",
                        "ring-1 hover:bg-canvas-2",
                        active ? "ring-2 ring-navy-900 bg-canvas-2/40" : "ring-line",
                        // Focus halkası KARTIN üzerinde: input görünmez ama focus görünür.
                        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2",
                        "has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-500"
                      )}
                    >
                      <input
                        type="radio"
                        name="scan-type"
                        value={t.id}
                        checked={active}
                        onChange={() => setType(t.id)}
                        // sr-only DEĞİL: gerçek boyutta ama şeffaf ve karta yayılmış.
                        // Böylece :focus-visible gerçek bir kutuya uygulanır ve
                        // `has-[]` seçicisi çalışır.
                        className="absolute inset-0 size-full opacity-0 cursor-pointer"
                      />
                      <span className="block font-medium text-ink-900">{t.label}</span>
                      <span className="block text-xs text-ink-600 mt-1 leading-snug">{t.description}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
```

**`has-[]` desteklemeyen tarayıcılar için `peer` varyantı** (Tailwind v4 `has-*` destekliyor ama Firefox <121 için):

```tsx
                    <label className="relative block group">
                      <input
                        type="radio"
                        name="scan-type"
                        value={t.id}
                        checked={active}
                        onChange={() => setType(t.id)}
                        className="peer absolute inset-0 size-full opacity-0 cursor-pointer"
                      />
                      <span
                        className={cn(
                          "block rounded-md p-3 bg-paper text-sm ring-1 transition-colors",
                          active ? "ring-2 ring-navy-900 bg-canvas-2/40" : "ring-line group-hover:bg-canvas-2",
                          "peer-focus-visible:outline peer-focus-visible:outline-2",
                          "peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-500"
                        )}
                      >
                        <span className="block font-medium text-ink-900">{t.label}</span>
                        <span className="block text-xs text-ink-600 mt-1 leading-snug">{t.description}</span>
                      </span>
                    </label>
```

**Aynı düzeltme `src/app/onboarding/onboarding-client.tsx:62-92`'ye uygulanır** — orada `<li>` içindeki `<label>`'a `peer` deseni ve `input` `className="peer absolute inset-0 size-full opacity-0 cursor-pointer"`.

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| `sr-only` + `peer-focus-visible` karta | `sr-only`'de `clip` var; Chrome ve Safari'de `:focus-visible` yine de tetiklenir ve `peer-*` çalışır — **ancak** bazı ekran okuyucu + tarayıcı kombinasyonlarında `clip`li elemana focus taşınması güvenilmez. |
| Gerçek görünür radyo düğmesi + kart | En basit ve en güvenli, ama tasarım "kart seçimi" istiyor. |
| **`opacity-0` + tam kaplama + `peer`/`has`** | Input gerçek boyutta (tıklama alanı = kart, 2.5.8 için ideal), focus gerçek bir kutuda, `peer`/`has` güvenilir. **Seçilen.** |
| `appearance-none` ile input'u kartın kendisi yapmak | Radyo semantiği korunur ama içerik yerleştirme çok kısıtlı. **Ret.** |

`outline` (`ring` değil) kullanıldı çünkü aktif kartta zaten `ring-2 ring-navy-900` var — `ring` kullanılsaydı seçili+odaklı durumda çakışırdı. `outline` ayrı bir katman.

`bg-canvas-2/40` seçili karta: seçim **yalnız** kenarlık kalınlığıyla değil, arka planla da işaretleniyor (1.4.1 Use of Color).

#### Nasıl doğrulanır

**Klavye:** New Scan → Tab ile "Scan type" grubuna gel.
1. ✅ Grup **tek** bir Tab durağı olmalı (radiogroup native davranışı).
2. ✅ Odaklanan kartın etrafında **2px mavi outline** görünmeli.
3. ✅ ↓/→ ile diğer kartlara geç → outline takip etmeli, seçim de değişmeli.
4. ✅ Focus outline ile seçim halkası (navy) **aynı anda ayırt edilebilmeli**.

**VoiceOver:** "Scan type, Single page, radio button, 1 of 4, selected. Scan one URL."

**Otomatik:**
```ts
test("scan type cards show a visible focus indicator", async ({ page }) => {
  await page.goto("/app/scans/new");
  await page.getByRole("radio", { name: /single page/i }).focus();
  const outline = await page.getByRole("radio", { name: /single page/i })
    .evaluate((el) => getComputedStyle(el.closest("label")!).outlineWidth);
  expect(parseFloat(outline)).toBeGreaterThanOrEqual(2);
});
```

---

### 5.12 — F-12: `A11ySettingsPanel` radiogroup · **P1**

> Bu, dokümandaki en ironik bulgu: **erişilebilirlik ayarları panelinin kendisi erişilemez.** Satış demosu sırasında bir ekran okuyucu kullanıcısı buraya gelirse ürün biter.

#### Mevcut kod — `src/components/accessibility/A11ySettingsPanel.tsx:26-50`

```tsx
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-paper p-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn("px-3 py-1.5 text-sm rounded-sm transition-colors min-h-[36px]", …)}
            >
```

Eksikler: `type="button"` yok (form içinde submit eder) · ok tuşu yok · roving `tabIndex` yok (3 seçenek = 3 Tab durağı, ARIA APG'ye aykırı) · `aria-labelledby` yerine `aria-label` (legend zaten var, çift etiket).

#### Düzeltilmiş kod — gerçek `<input type="radio">` ile

Yeni dosya `src/components/ui/SegmentedRadio.tsx`:

```tsx
"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Segmented control. Native radio input'ları kullanır: roving tabindex, ok
 * tuşu gezinmesi, form entegrasyonu ve ekran okuyucu duyurusu tarayıcıdan
 * bedava gelir. `role="radio"` + elle klavye yönetimi yazmak yerine
 * platformun zaten doğru yaptığı şeyi kullanıyoruz.
 */
export function SegmentedRadio<T extends string>({
  legend,
  icon,
  name,
  options,
  value,
  onChange,
  description,
}: {
  legend: string;
  icon?: React.ReactNode;
  name?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  description?: string;
}) {
  const baseId = useId();
  const groupName = name ?? `seg-${baseId}`;
  const descId = description ? `${baseId}-desc` : undefined;

  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-2 text-sm font-medium text-ink-700">
        {icon}
        {legend}
      </legend>
      {description && (
        <p id={descId} className="text-xs text-ink-600">{description}</p>
      )}
      <div
        className="inline-flex rounded-md ring-1 ring-border-field bg-paper p-1"
        aria-describedby={descId}
      >
        {options.map((opt) => {
          const id = `${baseId}-${opt.value}`;
          const active = opt.value === value;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={cn(
                "relative inline-flex items-center justify-center rounded-sm cursor-pointer transition-colors",
                "px-3 py-1.5 text-sm min-h-[36px] min-w-[44px]",
                active ? "bg-navy-900 text-paper" : "text-ink-600 hover:bg-canvas-2",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-500"
              )}
            >
              <input
                id={id}
                type="radio"
                name={groupName}
                value={opt.value}
                checked={active}
                onChange={() => onChange(opt.value)}
                className="absolute inset-0 size-full opacity-0 cursor-pointer"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
```

`A11ySettingsPanel.tsx` yeni hâli:

```tsx
"use client";

import { Contrast, Type, Wind } from "lucide-react";
import { SegmentedRadio } from "@/components/ui/SegmentedRadio";
import { useA11y } from "./A11yProvider";

export function A11ySettingsPanel() {
  const { textSize, setTextSize, contrast, setContrast, motion, setMotion } = useA11y();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-ink-900">Accessibility preferences</h3>
        <p className="text-sm text-ink-600 mt-1">
          These settings apply to the Percevia AI interface only. We respect your operating
          system&apos;s reduced-motion preference automatically.
        </p>
      </div>

      <SegmentedRadio
        legend="Text size"
        icon={<Type className="size-4" aria-hidden />}
        value={textSize}
        onChange={setTextSize}
        description="Scales interface text between 90% and 115%."
        options={[
          { value: "sm", label: "Smaller" },
          { value: "md", label: "Default" },
          { value: "lg", label: "Larger" },
        ]}
      />

      <SegmentedRadio
        legend="Contrast"
        icon={<Contrast className="size-4" aria-hidden />}
        value={contrast}
        onChange={setContrast}
        description="High contrast switches to a stricter black-on-white palette."
        options={[
          { value: "default", label: "Default" },
          { value: "high", label: "High contrast" },
        ]}
      />

      <SegmentedRadio
        legend="Motion"
        icon={<Wind className="size-4" aria-hidden />}
        value={motion}
        onChange={setMotion}
        description="Reduced motion removes non-essential animation, including the scan progress pulse."
        options={[
          { value: "default", label: "Default" },
          { value: "reduced", label: "Reduced" },
        ]}
      />

      <p className="text-xs text-ink-600">
        Preferences are stored in this browser only. They aren&apos;t synced across devices
        and they don&apos;t affect scans or reports.
      </p>
    </div>
  );
}
```

Kaldırılanlar: `MoveRight` ikonu (anlamsız dekoratif ok, `:104`), `text-ink-500` → `text-ink-600` (kontrast).

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| `role="radio"` + elle `onKeyDown` (Home/End/Arrow) + roving `tabIndex` | ~40 satır klavye kodu, RTL'de ok yönü tersine çevrilmeli, `aria-activedescendant` alternatifi ayrı bir karmaşıklık. Bir a11y ürününde **her satır bir hata riski**. |
| **Native `<input type="radio">` + görsel katman** | Roving tabindex, ok tuşları, Home/End, RTL yön çevirme, form entegrasyonu, "1 of 3" duyurusu — **hepsi tarayıcıdan**. Kod yarı yarıya azalıyor. **Seçilen.** |
| `radix-ui/react-radio-group` | Doğru çalışır ama bağımlılık; native zaten yeterli. |

Bu, dokümanın en önemli mesajlarından biri: **ARIA'yı elle yeniden yazmak yerine native HTML kullanmak, bir erişilebilirlik ürününün varsayılan refleksi olmalı.** ARIA'nın birinci kuralı ("don't use ARIA") kendi kodumuzda da geçerli.

`min-w-[44px]` — F-53/2.5.8 hedefi.

#### Nasıl doğrulanır

**Klavye:** Settings → Accessibility sekmesi → Tab.
1. ✅ "Text size" grubu **tek** Tab durağı olmalı (3 değil).
2. ✅ ←/→/↑/↓ ile seçenekler arasında geçiş; seçim anında uygulanmalı (metin boyutu değişmeli).
3. ✅ Odaklanan seçenekte mavi outline.
4. ✅ Tab → "Contrast" grubuna geçmeli.

**VoiceOver:** "Text size, Smaller, radio button, 1 of 3." → ← ile → "Default, radio button, 2 of 3, selected."

**Otomatik:**
```ts
test("a11y settings segmented controls are keyboard operable", async ({ page }) => {
  await page.goto("/app/settings");
  await page.getByRole("tab", { name: /accessibility/i }).click();
  const group = page.getByRole("radiogroup", { name: /text size/i })
    .or(page.getByRole("group", { name: /text size/i }));
  await page.getByRole("radio", { name: "Default" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Larger" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "lg");
});
```

---

### 5.13 — F-13 + F-38: `Tabs` klavye desteği (ARIA APG) · **P1**

#### Mevcut kod — `src/components/ui/Tabs.tsx:40-84`

```tsx
export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="tablist" className={cn("inline-flex items-center gap-1 …", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: { … }) {
  const ctx = useContext(Ctx)!;
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      aria-controls={`${ctx.baseId}-${value}-panel`}
      id={`${ctx.baseId}-${value}-tab`}
      onClick={() => ctx.setValue(value)}
      className={…}
    >
```

`aria-controls`/`id` ✅ doğru; **eksik olan:** `onKeyDown` (←/→/Home/End), roving `tabIndex`, `TabsList`'te `aria-label`, `aria-orientation`. Şu an 3 sekme = 3 Tab durağı; APG'ye göre 1 olmalı.

#### Düzeltilmiş kod (tam dosya)

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
  register: (value: string, el: HTMLButtonElement | null) => void;
  focusRelative: (from: string, delta: number | "first" | "last") => void;
  activationMode: "automatic" | "manual";
}
const Ctx = createContext<TabsCtx | null>(null);

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
  activationMode = "automatic",
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
  /**
   * "automatic": ok tuşu sekmeyi hem odaklar hem seçer (APG varsayılanı,
   *   panel içeriği ucuzsa doğru tercih).
   * "manual": ok tuşu yalnız odaklar, Enter/Space seçer (panel içeriği
   *   pahalıysa — ör. ağ isteği tetikliyorsa — bunu kullan).
   */
  activationMode?: "automatic" | "manual";
}) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const baseId = useId();
  const value = controlledValue ?? internal;
  const orderRef = useRef<string[]>([]);
  const nodesRef = useRef(new Map<string, HTMLButtonElement>());

  const setValue = useCallback(
    (v: string) => {
      onValueChange?.(v);
      if (controlledValue === undefined) setInternal(v);
    },
    [controlledValue, onValueChange]
  );

  const register = useCallback((v: string, el: HTMLButtonElement | null) => {
    if (el) {
      nodesRef.current.set(v, el);
      if (!orderRef.current.includes(v)) orderRef.current.push(v);
    } else {
      nodesRef.current.delete(v);
      orderRef.current = orderRef.current.filter((x) => x !== v);
    }
  }, []);

  const focusRelative = useCallback(
    (from: string, delta: number | "first" | "last") => {
      const order = orderRef.current;
      if (order.length === 0) return;
      const idx = order.indexOf(from);
      let next: number;
      if (delta === "first") next = 0;
      else if (delta === "last") next = order.length - 1;
      else next = (idx + delta + order.length) % order.length;

      const nextValue = order[next];
      nodesRef.current.get(nextValue)?.focus();
      if (activationMode === "automatic") setValue(nextValue);
    },
    [activationMode, setValue]
  );

  return (
    <Ctx.Provider value={{ value, setValue, baseId, register, focusRelative, activationMode }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** WCAG 4.1.2: her tablist'in erişilebilir bir adı olmalı. */
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-canvas-2 p-1 ring-1 ring-line",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(Ctx)!;
  const active = ctx.value === value;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        ctx.focusRelative(value, 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        ctx.focusRelative(value, -1);
        break;
      case "Home":
        e.preventDefault();
        ctx.focusRelative(value, "first");
        break;
      case "End":
        e.preventDefault();
        ctx.focusRelative(value, "last");
        break;
      case "Enter":
      case " ":
        if (ctx.activationMode === "manual") {
          e.preventDefault();
          ctx.setValue(value);
        }
        break;
      default:
        break;
    }
  }

  return (
    <button
      ref={(el) => ctx.register(value, el)}
      role="tab"
      type="button"
      aria-selected={active}
      aria-controls={`${ctx.baseId}-${value}-panel`}
      id={`${ctx.baseId}-${value}-tab`}
      // Roving tabindex: yalnız seçili sekme Tab sırasında.
      tabIndex={active ? 0 : -1}
      onClick={() => ctx.setValue(value)}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex items-center px-3 py-1.5 text-sm font-medium rounded transition-colors min-h-[36px]",
        active ? "bg-paper text-ink-900 shadow-[var(--shadow-soft)]" : "text-ink-600 hover:text-ink-900",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(Ctx)!;
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-${value}-panel`}
      aria-labelledby={`${ctx.baseId}-${value}-tab`}
      className={cn("mt-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2", className)}
      // Panel odaklanabilir: sekmeden Tab'a basınca içeriğe geçilir (APG).
      tabIndex={0}
    >
      {children}
    </div>
  );
}
```

**Değişen çağrı yerleri:**

`settings-client.tsx:40`:
```tsx
        <TabsList label="Workspace settings sections" className="flex-wrap">
```

`ai-panel.tsx:172-209` — ad-hoc tablist yerine (F-38):
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
…
    <AiSuggestionBlock title={`AI fix card · ${ai.modelProvider}`}>
      {hasTechnical ? (
        <Tabs defaultValue="plain" className="w-full">
          <div className="flex items-center justify-between gap-3 mb-3">
            <TabsList label="Explanation detail level" className="text-xs">
              <TabsTrigger value="plain">Plain language</TabsTrigger>
              <TabsTrigger value="technical">Developer</TabsTrigger>
            </TabsList>
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex items-center min-h-[24px] px-2 text-xs font-medium text-purple-600 underline underline-offset-2"
              >
                Regenerate
              </button>
            )}
          </div>
          <TabsContent value="plain" className="mt-0">
            <p className="whitespace-pre-wrap">{ai.explanationPlain}</p>
          </TabsContent>
          <TabsContent value="technical" className="mt-0">
            <div className="space-y-4">
              {/* … mevcut FixSection blokları … */}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <p className="whitespace-pre-wrap">{ai.explanationPlain}</p>
      )}
    </AiSuggestionBlock>
```

*(`text-purple-700` → `text-purple-600` (tanımlı token) + `min-h-[24px] px-2` (2.5.8) + `underline` (1.4.1).)*

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| Her sekmeyi ayrı Tab durağı bırak (`tabIndex={0}`) | ARIA APG'ye aykırı; 10 sekmeli bir arayüzde 10 Tab basımı. Teknik olarak "keyboard accessible" ama kullanılabilir değil. **Ret.** |
| `aria-activedescendant` deseni | Composite widget için geçerli alternatif ama focus yönetimi daha karmaşık ve `:focus-visible` stillemesi elle yapılır. **Ret.** |
| **Roving `tabIndex` + ref registry** | APG referans uygulaması. `register` callback'i ile DOM sırası korunur (children sırası değişse bile). **Seçilen.** |
| `radix-ui/react-tabs` | Doğrudan çözüm, ~6 kB. Proje bağımsızlığı tercihi nedeniyle ret; ama `Dialog`+`Tabs`+`Popover` üçlüsü için toplam ~25 kB'ye bakıp yeniden değerlendirilebilir. |

`activationMode` prop'u önemli: Settings sekmeleri ucuz (`automatic` doğru), ama ileride bir sekme ağ isteği tetiklerse `manual` gerekir — APG bunu açıkça söylüyor.

`ref={(el) => ctx.register(value, el)}` — React 19'da ref callback'ten cleanup fonksiyonu döndürülebilir; burada `null` çağrısıyla temizlik yapılıyor (React 18 uyumlu).

#### Nasıl doğrulanır

**Klavye:** Settings sayfası.
1. Tab → tablist'e gel. ✅ **Tek** durak (seçili sekme).
2. → → ✅ İkinci sekmeye odak + otomatik seçim; panel değişmeli.
3. End → ✅ Son sekme. Home → ✅ İlk sekme.
4. → son sekmedeyken → ✅ İlk sekmeye sarmalı (wrap).
5. Tab → ✅ Panelin kendisine geçmeli (`tabIndex={0}`).

**VoiceOver:** "Workspace settings sections, tab bar. Workspace, tab, 1 of 3, selected." → → → "Notifications, tab, 2 of 3, selected."

**Otomatik:**
```ts
test("tabs follow the ARIA APG keyboard pattern", async ({ page }) => {
  await page.goto("/app/settings");
  const list = page.getByRole("tablist", { name: /workspace settings sections/i });
  await expect(list).toBeVisible();

  const selected = page.getByRole("tab", { selected: true });
  await selected.focus();
  await expect(selected).toHaveAttribute("tabindex", "0");
  await expect(page.getByRole("tab", { selected: false }).first()).toHaveAttribute("tabindex", "-1");

  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /notifications/i })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /accessibility/i })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: /workspace/i })).toBeFocused();
});
```

---

### 5.14 — F-14: Onboarding rolünü kalıcı hale getir · **P1**

#### Mevcut kod — `src/app/onboarding/onboarding-client.tsx:23,29-33`

```tsx
  const [role, setRole] = useState<string | null>(null);
  …
  function continueNext() {
    setAttemptedContinue(true);
    if (!canContinue) return;
    router.push(nextHref);      // ← role hiçbir yere gitmiyor
  }
```

`:50`'de ekranda yazan: *"We'll tailor the workspace, scans, and report templates to your context."* — bu vaat hiçbir şekilde yerine getirilmiyor. `grep -r "onboardingRole\|persona" src/` → **0 sonuç**.

#### Düzeltilmiş kod

`continueNext` yerine:

```tsx
  const [saving, setSaving] = useState(false);

  async function continueNext() {
    setAttemptedContinue(true);
    if (!canContinue || saving) return;
    setSaving(true);
    // Rolü kaydetmek best-effort: başarısız olursa akışı bloklamıyoruz,
    // sadece kişiselleştirme olmadan devam ediyoruz.
    try {
      await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingRole: role, boundaryAcknowledgedAt: new Date().toISOString() }),
      });
    } catch {
      // yut — akış devam etsin
    }
    // Rolü sonraki adımın ön-doldurması için query'ye de koy: PATCH
    // başarısız olsa bile setup ekranı doğru varsayılanları gösterir.
    router.push(`${nextHref}${nextHref.includes("?") ? "&" : "?"}role=${role}`);
  }
```

Buton:
```tsx
          <button
            type="button"
            onClick={() => void continueNext()}
            aria-disabled={!canContinue || saving}
            className={cn(
              "inline-flex items-center gap-2 h-11 px-5 rounded-md text-sm font-medium transition-colors",
              canContinue && !saving
                ? "bg-navy-900 text-paper hover:bg-navy-800"
                : "bg-canvas-2 text-ink-600"
            )}
          >
            {saving ? "Setting up…" : "Continue"} <ArrowRight className="size-4" aria-hidden />
          </button>
```

**Rolün gerçekten işe yaradığı yer** — `workspace/setup/page.tsx`, `searchParams`'tan okuyup varsayılanları değiştirir:

```tsx
const ROLE_DEFAULTS: Record<string, { framework: string; targetStandard: string; hint: string }> = {
  agency:       { framework: "html",  targetStandard: "wcag22aa", hint: "Agencies usually audit client sites built on many stacks — you can override the framework per scan." },
  developer:    { framework: "next",  targetStandard: "wcag22aa", hint: "AI fix suggestions will target React/Next.js by default." },
  ecommerce:    { framework: "shopify", targetStandard: "eaa",    hint: "EAA applies to most EU e-commerce from June 2025 — we've preselected it." },
  saas:         { framework: "react", targetStandard: "wcag22aa", hint: "We've preselected WCAG 2.2 AA, the standard most enterprise buyers ask for." },
  client_check: { framework: "html",  targetStandard: "unsure",   hint: "Not sure which standard applies? Keep 'Unsure' — we'll explain after your first scan." },
};
```

ve `defaultValue={workspace.framework ?? ROLE_DEFAULTS[role]?.framework ?? "next"}` şeklinde kullanılır; `hint` ise `<FieldHint>` içinde gösterilir. Böylece `:50`'deki vaat **görünür şekilde** yerine gelir.

#### Neden bu çözüm

Alternatif "adımı tamamen kaldır" (TTFV −1 ekran, §10.2'de ölçülüyor) da geçerli ve **ölçüm sonrası** tercih edilebilir. Ancak rol bilgisi ürün için değerli (segmentasyon, onboarding e-postaları, `docs/marketing/customer-lead-criteria.md` ile eşleşme). Bu yüzden önce **vaadi yerine getir**, sonra §10.3'teki huni ölçümüyle adımın gerçekten dönüşüm yaratıp yaratmadığına bak.

`role`'ü hem PATCH hem query'ye koymak savunmacı: PATCH ağ hatasında kaybolsa bile bir sonraki ekran doğru davranır.

#### Nasıl doğrulanır

Onboarding → "I own an e-commerce site" → Continue → Setup ekranında **Primary framework = Shopify** ve **Target standard = EAA-oriented** ön-seçili gelmeli, altında EAA açıklaması görünmeli. Firestore'da `workspaces/{id}.onboardingRole === "ecommerce"` olmalı.

---

### 5.15 / 5.16 — F-15 + F-16: Report Builder'ı RSC'ye taşı · **P1**

#### Mevcut kod — `src/app/app/reports/builder/page.tsx:39-65,136-139`

```tsx
export default function ReportBuilderPage() {
  const router = useRouter();
  const search = useSearchParams();          // ← Suspense sınırı yok (F-16)
  const presetScanId = search.get("scanId");
  const [scans, setScans] = useState<ScanSummary[]>([]);
  …
  useEffect(() => {
    fetch("/api/scans?limit=20").then(…).then((j) => { setScans(completed); … });
  }, []);
  …
              {scans.length === 0 ? (
                <AlertCallout tone="info">
                  No completed scans yet. Start one from the dashboard to build a report.
                </AlertCallout>      // ← loading ≠ empty (F-15)
```

İlk render'da `scans === []` → "No completed scans yet" gösterilir → fetch dönünce liste belirir → **üç aşamalı sıçrama** (boş → yükleniyor yok → dolu).

#### Düzeltilmiş kod

**`page.tsx` (RSC kabuk):**

```tsx
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { listScans } from "@/lib/data/firestore";
import { ReportBuilderForm, type BuilderScan } from "./builder-form";

export const metadata = { title: "Report builder — Percevia AI" };
export const dynamic = "force-dynamic";

export default async function ReportBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ scanId?: string }>;
}) {
  const { scanId } = await searchParams;
  const ctx = await getCurrentWorkspaceOrRedirect();

  const scans = (await listScans(ctx.workspace.id, 20))
    .filter((s) => s.status === "completed")
    .map<BuilderScan>((s) => ({
      id: s.id,
      baseUrl: s.baseUrl,
      pagesScanned: s.pagesScanned,
      completedAt: s.completedAt?.toISOString() ?? null,
    }));

  return (
    <div className="px-4 lg:px-8 py-8 max-w-[1400px]">
      <header className="mb-6">
        <p className="text-[0.6875rem] uppercase tracking-wider text-ink-600 font-semibold mb-1">Reports</p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Build an audit-ready report
        </h1>
        <p className="text-sm text-ink-600 mt-1 max-w-2xl">
          Pick a completed scan, choose sections and format, and we&apos;ll render a self-contained
          report with a non-legal disclaimer baked in.
        </p>
      </header>

      <ReportBuilderForm scans={scans} presetScanId={scanId ?? null} />
    </div>
  );
}
```

**`builder-form.tsx` (client island):** mevcut dosyanın tamamı taşınır; `useSearchParams`, `useEffect` fetch'i ve `scans` state'i **silinir**, prop olur:

```tsx
"use client";

import { useState } from "react";
import { EmptyState } from "@/components/empty/EmptyState";
import { FileBarChart2, Plus } from "lucide-react";
import Link from "next/link";

export interface BuilderScan {
  id: string;
  baseUrl: string;
  pagesScanned: number;
  completedAt: string | null;
}

export function ReportBuilderForm({
  scans,
  presetScanId,
}: {
  scans: BuilderScan[];
  presetScanId: string | null;
}) {
  const [scanId, setScanId] = useState(presetScanId ?? scans[0]?.id ?? "");
  const [title, setTitle] = useState(
    scans[0] ? `Accessibility assessment — ${hostFromUrl(scans[0].baseUrl)}` : ""
  );
  …
  // Artık gerçek boş durum: server'dan 0 tarama geldiyse.
  if (scans.length === 0) {
    return (
      <EmptyState
        icon={FileBarChart2}
        title="No completed scans yet"
        description="A report is built from one completed scan. Run a scan first — it usually takes under a minute for a single page."
        action={
          <Link href="/app/scans/new" className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800">
            <Plus className="size-4" aria-hidden /> Start a scan
          </Link>
        }
      />
    );
  }
  …
```

**`loading.tsx`** — `src/app/app/reports/builder/loading.tsx`:

```tsx
export default function ReportBuilderLoading() {
  return (
    <div className="px-4 lg:px-8 py-8 max-w-[1400px]">
      <div className="animate-pulse" aria-hidden="true">
        <div className="mb-6 space-y-2">
          <div className="h-3 w-16 rounded bg-canvas-2" />
          <div className="h-8 w-80 max-w-full rounded-md bg-canvas-2" />
          <div className="h-4 w-[36rem] max-w-full rounded bg-canvas-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          <div className="space-y-5">
            <div className="h-44 rounded-lg bg-canvas-2 ring-1 ring-line" />
            <div className="h-72 rounded-lg bg-canvas-2 ring-1 ring-line" />
          </div>
          <div className="h-96 rounded-lg bg-canvas-2 ring-1 ring-line" />
        </div>
      </div>
      <span className="sr-only" role="status">Loading report builder</span>
    </div>
  );
}
```

#### Neden bu çözüm

Üç bulguyu (F-15, F-16, F-26'nın bir parçası) tek refactor kapatıyor:
- **F-16:** `useSearchParams()` yok → Next.js rotayı client-render'a düşürmüyor.
- **F-15:** "loading" durumu artık `loading.tsx` ile ayrı; "empty" durumu **gerçekten** boş.
- **CLS:** İskelet boyutları gerçek düzeni taklit ediyor (`h-44`/`h-72`/`h-96` ≈ gerçek kart yükseklikleri).

`/api/scans?limit=20` çağrısı da ortadan kalkıyor — aynı veriyi `listScans` ile sunucuda çekmek bir ağ gidiş-dönüşü tasarruf ediyor.

**Alternatif:** `<Suspense>` ile sarmak (F-16 için minimum düzeltme) — ama F-15 çözülmez, üç aşamalı sıçrama devam eder. **Ret.**

#### Nasıl doğrulanır

DevTools → Network → "Slow 3G" → `/app/reports/builder` aç.
1. ✅ Önce **iskelet** görünmeli (dashboard iskeleti değil, builder iskeleti).
2. ✅ "No completed scans yet" **hiç görünmemeli** (taramalar varsa).
3. ✅ İskeletten içeriğe geçişte layout sıçraması olmamalı.
`npm run build` çıktısında `/app/reports/builder` satırının `ƒ (Dynamic)` olması ve client bundle boyutunun düşmesi beklenir.

---

### 5.17 — F-17: `error.tsx` içindeki iç içe `<main>` · **P1**

#### Mevcut kod — `src/app/app/error.tsx:14`

```tsx
    <main className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
```

Bu `app/app/layout.tsx:30`'daki `<main id="main" tabIndex={-1}>` içine render ediliyor → `<main>` içinde `<main>`.

#### Düzeltilmiş kod

```tsx
"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { Logo } from "@/components/brand/Logo";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <Logo variant="wordmark" />
        </div>
        <AlertCallout tone="warning" icon={AlertTriangle} title="Workspace could not load">
          Percevia could not load workspace data right now. If Firestore quota is
          exhausted, your scans and reports are still safe and the workspace will
          become available again when capacity resets or is increased.
        </AlertCallout>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
        >
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </button>
        {error.digest && (
          <p className="mt-4 text-xs text-ink-600 font-mono">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
```

Değişiklikler: `<main>` → `<div>` · `min-h-screen` → `min-h-[60vh]` (layout'un içinde olduğu için tam ekran gerekmiyor) · `bg-canvas` kaldırıldı (body zaten canvas) · `error.digest` gösterildi (destek talebi için).

`AppServiceUnavailable.tsx:8` de aynı sorunu taşıyor **ama** o `layout.tsx:15`'te `<main>`'den **önce** return ediliyor → orada `<main>` doğru, ancak `id="main"` eklenmeli (F-18):

```tsx
    <main id="main" tabIndex={-1} className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10 focus:outline-none">
```

#### Neden bu çözüm

`role="alert"` **eklenmedi** — `error.tsx` sayfa yüklenirken render edilir, yeni bir "durum mesajı" değil, sayfanın kendisidir. `AlertCallout tone="warning"` zaten `role="alert"` veriyor (`:63`); iki katman gereksiz.

#### Nasıl doğrulanır

`throw new Error("test")` ekleyip sayfayı aç → DevTools Elements'te tek bir `<main>` olmalı. axe `landmark-no-duplicate-main` ve `landmark-unique` kuralları geçmeli.

---

### 5.18 — F-18: Skip link hedefleri · **P1**

#### Mevcut kod

`src/app/pricing/page.tsx` — `<main>` **hiç yok**.
`src/app/legal/layout.tsx:58` — `<main className="…">` (id yok).
`src/app/auth/sign-in/page.tsx:35` — Suspense fallback'te `<main>` id'siz.
`src/app/auth/callback/page.tsx:39` — id'siz.

Skip link: `src/components/accessibility/SkipToContent.tsx:3` → `href="#main"`, root layout'ta her sayfada render ediliyor (`layout.tsx:35`).

#### Düzeltilmiş kod

`legal/layout.tsx:58`:
```tsx
        <main id="main" tabIndex={-1} className="… focus:outline-none">
```

`pricing/page.tsx` — sayfa içeriğini sar:
```tsx
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {/* mevcut içerik */}
      </main>
```

`auth/sign-in/page.tsx:27-35` (Suspense fallback):
```tsx
      <Suspense
        fallback={
          <main id="main" tabIndex={-1} className="flex-1 max-w-md w-full mx-auto px-4 lg:px-8 py-12 focus:outline-none">
            <div className="animate-pulse space-y-4" aria-hidden="true">
              <div className="h-8 w-48 rounded bg-canvas-2" />
              <div className="h-11 w-full rounded-md bg-canvas-2" />
              <div className="h-11 w-full rounded-md bg-canvas-2" />
            </div>
            <span className="sr-only" role="status">Loading sign-in form</span>
          </main>
        }
      >
```

`auth/callback/page.tsx:39` — aynı: `id="main" tabIndex={-1}`.
`AppServiceUnavailable.tsx:8` — aynı.

**Regresyon koruması** — bu bir daha kırılmasın diye e2e testi (§11.1'in parçası):

```ts
// e2e/marketing/skip-link.spec.ts
import { test, expect } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/", "/pricing",
  "/legal/privacy", "/legal/terms", "/legal/dpa", "/legal/ai-use",
  "/legal/no-legal-advice", "/legal/accessibility-methodology",
  "/legal/subprocessors", "/legal/contact",
  "/auth/sign-in", "/auth/verify-request", "/onboarding",
];

for (const route of PUBLIC_ROUTES) {
  test(`skip link resolves on ${route}`, async ({ page }) => {
    await page.goto(route);
    // Skip link ilk Tab durağı olmalı
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /skip to main content/i });
    await expect(skip).toBeFocused();

    // Hedef gerçekten var mı
    await expect(page.locator("#main")).toHaveCount(1);

    // Enter sonrası focus main'e geçmeli
    await page.keyboard.press("Enter");
    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("main");
  });
}
```

#### Neden bu çözüm

`tabIndex={-1}` **zorunlu**: `<main>` doğal olarak odaklanabilir değil; `#main`'e atlandığında tarayıcı görünümü kaydırır ama **odak `<body>`'de kalır** → sonraki Tab kullanıcıyı sayfa başına geri götürür. Bu, "skip link çalışıyor gibi görünüp çalışmayan" en yaygın hatadır ve mevcut kodda `app/app/layout.tsx:32` ve `onboarding-client.tsx:44` bunu **doğru** yapmış — sadece diğer sayfalara uygulanmamış.

`focus:outline-none` — `<main>` programatik olarak odaklandığında outline göstermek gereksiz (kullanıcı zaten oraya gitmek istedi); ama `:focus-visible` outline'ı korunmalı, bu yüzden `focus-visible:outline-none` **yazılmıyor**.

`<main>` yerine `id`'yi `<h1>`'e vermek de bir alternatif ama landmark yapısını bozar.

#### Nasıl doğrulanır

Her sayfada: sayfayı yükle → Tab (bir kez) → skip link görünmeli (`globals.css:135-150` `translateY(-150%)` → `0`) → Enter → sonraki Tab **ana içeriğin ilk linkine** gitmeli, header'a değil.

---

### 5.19 — F-19: Başlık hiyerarşisi · `CardTitle` polimorfik · **P1**

#### Mevcut kod — `src/components/ui/Card.tsx:25-30`

```tsx
export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-base font-semibold text-ink-900 tracking-tight", className)} {...props} />
  )
);
```

Sonuç: `/app` dashboard'da `<h1>` (`:54`) → `<h3>` (Card başlıkları) → `<h4>` (`AiSuggestionBlock.tsx:30`) → `<h5>` (`ai-panel.tsx:250`). h2 hiç yok.

#### Düzeltilmiş kod

```tsx
type HeadingLevel = "h2" | "h3" | "h4" | "h5" | "h6";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement> & { as?: HeadingLevel }
>(({ className, as: Tag = "h2", ...props }, ref) => (
  <Tag
    ref={ref}
    className={cn("text-base font-semibold text-ink-900 tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";
```

**Varsayılan `h2`** çünkü kartlar tipik olarak `<h1>`'in doğrudan altındaki bölümlerdir. İç içe kart senaryolarında `as="h3"` verilir.

`AiSuggestionBlock.tsx:30` — `h4` yerine yapılandırılabilir:

```tsx
export function AiSuggestionBlock({
  title,
  children,
  variant,
  headingLevel: Heading = "h3",
}: {
  title: string;
  children: React.ReactNode;
  variant?: string;
  headingLevel?: "h2" | "h3" | "h4";
}) {
  …
          <Heading className="text-xs font-semibold uppercase tracking-wider text-purple-600">
            {title}
          </Heading>
```

`ai-panel.tsx:247-256` `FixSection` — `h5` yerine görsel olarak aynı ama semantik olarak `h4`:

```tsx
function FixSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-600 mb-1.5">
        {label}
      </h4>
      {children}
    </div>
  );
}
```

**Sayfa bazlı doğru seviyeler** (§6'daki heading haritalarıyla eşleşir):

| Sayfa | h1 | h2 | h3 |
|---|---|---|---|
| `/app` | Greeting (`page.tsx:54`) | "Latest scan", "Open findings", "AI summary", "Compliance risk overview", "Recent scans" | — |
| `/app/scans/[id]` | Host adı (`:200`) | "What this scan tells you", "Top priority fixes", "Findings", "Human review", "Scan profile", "Pages scanned" | Grup başlıkları, `IssueCard` başlıkları |
| `/app/scans/[id]/issues/[issueId]` | Bulgu başlığı (`:52`) | "Description", "Failing element", "Visual evidence", "AI fix card", "Status" | `FixSection` etiketleri (h4) |
| `/app/compliance` | Sayfa başlığı (`:89`) | `SectionTitle` (`:367`, zaten h2 ✅) | `PostureCard` başlıkları (`:376`, h3 ✅) |

`compliance/page.tsx` zaten **doğru** yapıyor (`SectionTitle` h2, `PostureCard` h3) — bu, projede doğru desenin var olduğunu ama `Card` bileşenine yansımadığını gösteriyor.

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| `role="heading" aria-level={n}` | Çalışır ama native heading elementleri daha güvenilir ve stillenebilir. |
| Otomatik seviye (context/`HeadingLevelProvider`) | Radix'in `<Slot>`/heading context deseni: iç içe bölümlerde seviye otomatik artar. Zarif ama sihirli — geliştirici hangi seviyenin çıktığını göremez ve yanlış nesting'i fark etmez. |
| **`as` prop'u, varsayılan `h2`** | Açık, tip güvenli, kademeli benimsenebilir (mevcut kullanımlar varsayılanla düzelir). **Seçilen.** |

Görsel boyut değişmiyor (`text-base` sabit) — sadece semantik seviye değişiyor. Bu önemli: tasarım hiç etkilenmiyor, yalnızca ekran okuyucu rotoru düzeliyor.

#### Nasıl doğrulanır

**VoiceOver rotoru:** `VO+U` → Headings. Beklenen `/app` çıktısı:
```
Good morning, Efe            (level 1)
Latest scan                  (level 2)
Open findings (12)           (level 2)
AI summary                   (level 2)
Compliance risk overview     (level 2)
Recent scans                 (level 2)
```
Atlama olmamalı, h3'ten başlamamalı.

**Otomatik:**
```ts
test("dashboard heading levels never skip", async ({ page }) => {
  await page.goto("/app");
  const levels = await page.$$eval("h1,h2,h3,h4,h5,h6", (els) =>
    els.map((e) => Number(e.tagName[1]))
  );
  expect(levels[0]).toBe(1);
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  }
});
```
Bu testi §11.1'deki her rota için tekrarla.

---

### 5.20 — F-20 + F-21: Kapatılabilir popover hook'u · **P1/P2**

#### Mevcut kod

`TopNav.tsx:180-219` — dışarı tıklama yok, Escape yok, focus dönüşü yok, `aria-haspopup` yok.
`NotificationsBell.tsx:64-74` — dışarı tıklama **var** ✅ ama Escape yok; `:122` `role="menu"` ama çocuklar `menuitem` değil.

#### Düzeltilmiş kod — paylaşılan hook

`src/lib/hooks/use-dismissable.ts`:

```tsx
"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Popover/dropdown kapatma davranışı: Escape, dışarı tıklama, focus dışarı
 * çıkması. Kapanışta focus tetikleyici butona geri döner.
 *
 * NOT: Bu bir focus TRAP değildir. Menü/popover'lar için doğru davranış
 * Tab ile dışarı çıkabilmektir (APG); trap yalnızca modal dialog içindir.
 */
export function useDismissable({
  open,
  onClose,
  containerRef,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
}) {
  const openedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      // Kapanışta (ve yalnızca bizim açtığımız oturumda) focus'u geri ver.
      if (openedRef.current) {
        openedRef.current = false;
        const t = triggerRef.current;
        if (t && document.activeElement !== t && document.contains(t)) {
          // Kullanıcı başka bir yere tıklayarak kapattıysa focus'u çalma.
          const active = document.activeElement;
          const clickedElsewhere =
            active && active !== document.body && !containerRef.current?.contains(active);
          if (!clickedElsewhere) t.focus();
        }
      }
      return;
    }

    openedRef.current = true;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return; // toggle butonu kendi işini yapsın
      onClose();
    }
    function onFocusIn(e: FocusEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, onClose, containerRef, triggerRef]);
}
```

**`TopNav.tsx` kullanımı** (`:180-220` yerine):

```tsx
          <div className="relative" ref={menuRef}>
            <button
              ref={menuTriggerRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-canvas-2 min-h-[40px]"
              aria-label="Account menu"
              aria-expanded={open}
              aria-haspopup="true"
              aria-controls={menuId}
            >
              …
            </button>

            {open && (
              <div
                id={menuId}
                className="absolute right-0 mt-2 w-72 rounded-md bg-paper ring-1 ring-line shadow-[var(--shadow-card)] p-2 z-40"
              >
                <div className="px-3 py-2 border-b border-line/70 mb-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">{displayName}</p>
                  {userEmail && <p className="text-xs text-ink-600 truncate">{userEmail}</p>}
                  <p className="text-[0.625rem] uppercase tracking-wider text-purple-600 font-semibold mt-2">
                    {plan} plan
                  </p>
                </div>
                <MenuLink href="/app/settings/profile" icon={UserRound} label="Profile" onNavigate={() => setOpen(false)} />
                <MenuLink href="/app/settings" icon={Settings} label="Workspace settings" onNavigate={() => setOpen(false)} />
                <MenuLink href="/app/settings/billing" icon={CreditCard} label="Billing & plan" onNavigate={() => setOpen(false)} />
                <MenuLink href="/app/compliance" icon={ShieldCheck} label="Privacy & compliance" onNavigate={() => setOpen(false)} />
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-700 hover:bg-rose-50 min-h-[36px]"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </button>
              </div>
            )}
          </div>
```

Bileşen başına:
```tsx
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useDismissable({ open, onClose: () => setOpen(false), containerRef: menuRef, triggerRef: menuTriggerRef });
```

**`NotificationsBell.tsx`:** `role="menu"` **kaldırılır** (F-21) çünkü içerik link listesi + başlık, gerçek bir menü değil:

```tsx
      {open && (
        <div
          id={popoverId}
          ref={panelRef}
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 rounded-md bg-paper ring-1 ring-line shadow-[var(--shadow-card)] overflow-hidden z-40"
        >
```

ve tetikleyicide `aria-haspopup="dialog"` yerine sadece `aria-expanded` + `aria-controls` bırakılır (basit disclosure deseni). `:129-136` "Mark all read" butonuna `min-h-[24px] px-1.5` (F-53).

`:55-62` polling'e görünürlük kapısı (F-22, §5.22).

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| `role="menu"` + `menuitem` + ok tuşu navigasyonu | ARIA APG'ye tam uyum olurdu ama **menü deseni linkler için yanlış**: `role="menu"` uygulama menüsü (dosya menüsü gibi) içindir. Basit bir "hesap linkleri" popover'ı için `role` **hiç gerekmez** — linkler zaten link olarak duyurulur ve Tab ile gezilir. W3C APG bunu açıkça söyler. **Ret (ve mevcut `role="menu"` kaldırılıyor).** |
| `<details>/<summary>` disclosure | Escape ve dışarı tıklama native gelmez; konumlandırma zor. **Ret.** |
| **`useDismissable` hook + disclosure deseni** | 60 satır, iki bileşende paylaşılıyor, davranış tutarlı. **Seçilen.** |
| `Popover` API (`popover` attribute) | Baseline 2024; `popover="auto"` Escape + light-dismiss'i **native** verir ve `::backdrop` sağlar. **Çok cazip** ama Firefox 125+ / Safari 17+ gerekiyor ve konumlandırma için CSS Anchor Positioning henüz her yerde yok. **§13'e.** |

`focusin` dinleyicisi kritik: Tab ile menüden çıkıldığında menü kapanmalı — aksi halde ekranda açık kalır ve kullanıcı "menü açık mı kapalı mı" bilemez.

`clickedElsewhere` kontrolü: kullanıcı menüyü açıp sayfada başka bir yere tıkladıysa focus'u zorla butona geri çekmek **kötü** deneyimdir; sadece Escape/programatik kapanışta geri veriyoruz.

#### Nasıl doğrulanır

1. Tab ile hesap butonuna gel → Enter → menü açılmalı, `aria-expanded="true"`.
2. Tab → menüdeki ilk linke gitmeli.
3. Escape → menü kapanmalı, **focus hesap butonuna dönmeli**.
4. Menü açıkken sayfada bir yere tıkla → kapanmalı, focus çalınmamalı.
5. Menü açıkken Shift+Tab ile geriye çık → menü kapanmalı.
6. VoiceOver: "Account menu, pop up button, collapsed" → Enter → "expanded" duyulmalı.

```ts
test("account menu closes on Escape and restores focus", async ({ page }) => {
  await page.goto("/app");
  const trigger = page.getByRole("button", { name: /account menu/i });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});
```

---

### 5.21 / 5.26 — F-26: Route bazlı iskeletler · **P1**

Beş yeni `loading.tsx`. Ortak kural: **iskelet boyutları gerçek içeriğin boyutlarını taklit etmeli** (CLS, §8.2) ve `aria-hidden="true"` + tek bir `role="status"` `sr-only` metni içermeli.

`src/app/app/scans/[id]/loading.tsx`:
```tsx
export default function ScanResultsLoading() {
  return (
    <div className="px-4 lg:px-8 py-8 space-y-6 max-w-[1400px]">
      <div className="animate-pulse space-y-6" aria-hidden="true">
        {/* Aksiyon barı */}
        <div className="flex items-center justify-between gap-4">
          <div className="h-4 w-24 rounded bg-canvas-2" />
          <div className="flex gap-2">
            <div className="h-10 w-28 rounded-md bg-canvas-2" />
            <div className="h-10 w-32 rounded-md bg-canvas-2" />
            <div className="h-10 w-28 rounded-md bg-canvas-2" />
          </div>
        </div>
        {/* Skor kartı — gerçek yükseklik ~176px */}
        <div className="h-44 rounded-lg bg-canvas-2 ring-1 ring-line" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            <div className="h-24 rounded-lg bg-canvas-2 ring-1 ring-line" />
            {/* Filtre çipleri — iki satır */}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 w-24 rounded-full bg-canvas-2" />
              ))}
            </div>
            {/* Bulgu grupları */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-canvas-2 ring-1 ring-line" />
            ))}
          </div>
          <div className="space-y-5">
            <div className="h-28 rounded-lg bg-canvas-2 ring-1 ring-line" />
            <div className="h-64 rounded-lg bg-canvas-2 ring-1 ring-line" />
            <div className="h-48 rounded-lg bg-canvas-2 ring-1 ring-line" />
          </div>
        </div>
      </div>
      <span className="sr-only" role="status">Loading scan results</span>
    </div>
  );
}
```

Aynı desende:

| Dosya | Taklit ettiği düzen |
|---|---|
| `src/app/app/scans/[id]/loading.tsx` | Yukarıdaki (rapor) |
| `src/app/app/remediation/loading.tsx` | Header + `NoGuaranteeBanner` (h-16) + 2 `<details>` bloğu (h-56 her biri, içinde 2 kart) |
| `src/app/app/team/loading.tsx` | Header + davet kartı (h-52) + üye tablosu (h-40) + izin matrisi (h-72) |
| `src/app/app/compliance/loading.tsx` | Header + banner (h-24) + 4 posture kartı grid (h-32) + 3 bölüm (h-48) |
| `src/app/app/monitors/loading.tsx` | Header + form (h-32) + 3 monitor satırı (h-20) |
| `src/app/app/scans/[id]/issues/[issueId]/loading.tsx` | Başlık bloğu (h-24) + aksiyon barı (h-10) + 2 kart (h-40, h-32) + AI paneli (h-56) + yan panel (h-48) |
| `src/app/app/ai-assistant/loading.tsx` | Header + uyarı (h-32) + scan seçici şeridi (h-28) + iki sütun |

**Ayrıca `app/app/loading.tsx`'in kapsamını daralt:** artık yalnızca `/app`'e uygulanacak (alt rotalar kendi `loading.tsx`'ini alacak).

#### Neden bu çözüm

Next.js App Router'da `loading.tsx` en yakın segmentten miras alınır. Şu an `/app/*` altındaki **her** rota dashboard iskeletini görüyor — kullanıcı bir tarama raporuna tıklıyor, KPI kartları görüyor, sonra tamamen farklı bir düzen yerleşiyor. Bu, algılanan gecikmeyi **artırır** (yanlış iskelet, iskelet olmamasından kötüdür — kullanıcı yanlış sayfaya geldiğini sanar).

Alternatif: `<Suspense>` sınırlarıyla kısmi streaming (§8.4). İkisi birlikte kullanılır: `loading.tsx` route geçişini, `<Suspense>` sayfa içi yavaş bölümleri kapsar.

#### Nasıl doğrulanır

Slow 3G + `/app` → bir tarama satırında "View" → geçiş sırasında görünen iskelet **rapor düzeni** olmalı (üç kart grid'i değil). Chrome DevTools → Performance → Layout Shift bölgeleri kırmızı olmamalı.

---

### 5.22 / 5.23 — F-22 + F-23 + F-24 + F-25: Polling ve zamanlayıcı disiplini · **P2/P3**

#### Mevcut kod — `progress-client.tsx:105-108, 122-146, 161`

```tsx
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 5_000);   // ← sonsuz
    return () => clearInterval(t);
  }, []);
  …
    function startPolling() {
      if (cancelled || transportRef.current === "polling") return;
      transportRef.current = "polling";
      let intervalMs = 1500;                                     // ← sabit
      async function tick() {
        …
            intervalMs = data.status === "running" ? 2500 : 1500; // ← backoff yok
        …
          if (!cancelled && keepGoing) pollTimer = setTimeout(tick, intervalMs);
      }
      pollTimer = setTimeout(tick, intervalMs);
    }
  …
            if (view.status === "completed") goToResults();       // ← her snapshot'ta
```

#### Düzeltilmiş kod

**(a) Saat — terminal statüde dur (F-24):**

```tsx
  useEffect(() => {
    if (state.status === "completed" || state.status === "failed") return;
    const t = setInterval(() => setNowMs(Date.now()), 5_000);
    return () => clearInterval(t);
  }, [state.status]);
```

**(b) Navigasyon guard (F-25):** effect'in dışında, bileşen gövdesinde:

```tsx
  const hasNavigatedRef = useRef(false);
```

effect içinde:

```tsx
    function goToResults() {
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;
      router.replace(`/app/scans/${initial.id}`);
    }
```

**(c) Polling: backoff + jitter + görünürlük + hard timeout (F-23):**

```tsx
    // Sunucuyu korumak için: sabit hızlı polling yerine kademeli yavaşlama,
    // sekme arka plandayken duraklatma ve mutlak bir tavan.
    const POLL_STARTED_AT = Date.now();
    const HARD_TIMEOUT_MS = 20 * 60_000;   // 20 dk sonra polling'i bırak
    const MAX_INTERVAL_MS = 30_000;

    function startPolling() {
      if (cancelled || transportRef.current === "polling") return;
      transportRef.current = "polling";
      let attempt = 0;

      function nextDelay(status: string): number {
        const base = status === "running" ? 2500 : 1500;
        // Her 10 tick'te bir iki katına çıkar, 30 sn'de tavan yap.
        const backed = Math.min(base * 2 ** Math.floor(attempt / 10), MAX_INTERVAL_MS);
        // ±15% jitter: N kullanıcı aynı anda sunucuya vurmasın.
        return Math.round(backed * (0.85 + Math.random() * 0.3));
      }

      async function tick() {
        if (cancelled) return;

        if (Date.now() - POLL_STARTED_AT > HARD_TIMEOUT_MS) {
          setState((s) => ({
            ...s,
            errorMessage: s.errorMessage ?? "poll_timeout",
          }));
          return; // polling'i bırak; kullanıcı "Retry scan" ile devam edebilir
        }

        // Sekme arka plandaysa yoklama yapma; görünür olunca hemen devam et.
        if (document.visibilityState !== "visible") {
          pollTimer = setTimeout(tick, 5_000);
          return;
        }

        attempt++;
        let keepGoing = true;
        try {
          const res = await fetch(`/api/scans/${initial.id}/status`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (cancelled) return;
            setState((s) => ({ ...s, ...viewFromStatusApi(data) }));
            if (data.status === "completed") { keepGoing = false; goToResults(); return; }
            if (data.status === "failed") { keepGoing = false; return; }
            // Durum değiştiyse backoff'u sıfırla — iş ilerliyor demektir.
            attempt = 0;
          }
        } catch {
          // geçici — bir sonraki tick'te tekrar dene
        } finally {
          if (!cancelled && keepGoing) pollTimer = setTimeout(tick, nextDelay("running"));
        }
      }

      // Sekme öne geldiğinde bekleyen timer'ı iptal edip hemen yokla.
      function onVisible() {
        if (document.visibilityState === "visible" && !cancelled) {
          if (pollTimer) clearTimeout(pollTimer);
          pollTimer = setTimeout(tick, 0);
        }
      }
      document.addEventListener("visibilitychange", onVisible);
      visibilityCleanup = () => document.removeEventListener("visibilitychange", onVisible);

      pollTimer = setTimeout(tick, 1500);
    }
```

cleanup'a ekle (`:193-199`):
```tsx
    return () => {
      cancelled = true;
      if (unsubSnap) unsubSnap();
      if (unsubAuth) unsubAuth();
      if (pollTimer) clearTimeout(pollTimer);
      if (visibilityCleanup) visibilityCleanup();
      transportRef.current = null;
    };
```

`humanizeError`'a yeni kod (`:534`):
```tsx
  if (msg === "poll_timeout")
    return "We stopped checking for updates after 20 minutes. The scan may still be running — reload this page or retry.";
```

**(d) Bildirim polling'i (F-22)** — `NotificationsBell.tsx:55-62`:

```tsx
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") void refresh();
      }, POLL_INTERVAL_MS);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        void refresh();   // öne gelince hemen tazele
        start();
      } else {
        stop();           // arka planda tamamen durdur
      }
    }

    const initialId = window.setTimeout(() => void refresh(), 0);
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(initialId);
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
```

**(e) Gereksiz re-render (V1 §4.1c):**

```tsx
  const currentStepIdx = useMemo(() => {
    if (state.status === "queued") return 0;
    if (state.status === "failed") return -1;
    return STEP_ORDER[state.currentStep ?? state.progressStep ?? "queued"] ?? 1;
  }, [state.status, state.currentStep, state.progressStep]);
```

#### Neden bu çözüm

- **Backoff'u durum değişiminde sıfırlamak** kritik: tarama aktif ilerliyorsa hızlı polling doğru; takıldıysa yavaşlamalı. `attempt = 0` satırı bunu yapıyor.
- **Hard timeout** olmadan, kullanıcının unuttuğu bir sekme günlerce 30 sn'de bir istek atar. 20 dk, en uzun tarama senaryosundan (`estimateScanPlan`, 1000 sayfa) fazlasıyla uzun.
- **`visibilitychange` ile anında tazeleme:** kullanıcı sekmeye döndüğünde bayat veri görmemeli. Sadece durdurmak yetmez.
- **`document.hidden` yerine `visibilityState`:** aynı şey ama `visibilityState` daha açık; `prerender` durumunu da doğru ele alır.

#### Nasıl doğrulanır

DevTools → Network → filtre `status`.
1. Tarama başlat → istekler ~2.5 sn aralıklarla, **aralıklar birbirinin aynısı olmamalı** (jitter).
2. Başka sekmeye geç, 1 dk bekle → **hiç `status` isteği olmamalı**.
3. Sekmeye dön → **anında** bir istek atılmalı.
4. Tarama tamamlanınca → istekler durmalı, `router.replace` **bir kez** çağrılmalı (Network'te tek RSC isteği).
5. Bildirimler: arka planda 5 dk bekle → `/api/notifications` isteği olmamalı.

---

### 5.27 — F-27: Dashboard veri çekimi · **P2**

#### Mevcut kod — `src/app/app/page.tsx:24-45`

```tsx
  const recentScans = await listScans(ctx.workspace.id, 5);
  const latest = recentScans[0];
  const allIssues = latest ? await listIssues(ctx.workspace.id, latest.id) : [];   // ← TÜM bulgular
  const openIssuesRaw = allIssues.slice(0, 5).map(…)                               // ← 5'i gösteriliyor

  const counts = { critical: 0, moderate: 0, minor: 0, review: 0, passed: 0 };
  let latestSummary: ScanSummary | null = null;
  if (latest) {
    for (const issue of allIssues) counts[issue.severity as keyof typeof counts]++;
    latestSummary = await getScanSummary(ctx.workspace.id, latest.id);             // ← seri
  }
```

500 bulgulu bir taramada: 500 doküman okunuyor, 5 tanesi gösteriliyor, sayımlar client'a hiç gitmeyen bir döngüde hesaplanıyor — oysa `ScanSummary` zaten sayımları tutuyor (`:382-384`'te `wcagIssueCount` vb. kullanılıyor).

#### Düzeltilmiş kod

```tsx
  const recentScans = await listScans(ctx.workspace.id, 5);
  const latest = recentScans[0];

  // İki bağımsız sorgu paralel. `listIssues` limitli — dashboard yalnızca
  // ilk 5'i gösteriyor, sayımları özet dokümanından alıyoruz.
  const [topIssues, latestSummary] = latest
    ? await Promise.all([
        listIssues(ctx.workspace.id, latest.id, { limit: 5 }),
        getScanSummary(ctx.workspace.id, latest.id),
      ])
    : [[], null];

  const openIssuesRaw = topIssues.map((issue) => ({
    id: issue.id,
    ruleId: issue.ruleId,
    severity: issue.severity,
    help: issue.help,
  }));

  // Sayımlar özetten. Özet yoksa (eski tarama) sayımı 0 gösterip
  // "counts unavailable" notu koyuyoruz — 500 doküman okumaktan iyi.
  const counts = {
    critical: latestSummary?.criticalCount ?? 0,
    moderate: latestSummary?.moderateCount ?? 0,
    minor: latestSummary?.minorCount ?? 0,
    review: latestSummary?.manualReviewCount ?? 0,
    passed: 0,
  };
  const countsAvailable = latestSummary !== null;
  const total = counts.critical + counts.moderate + counts.minor + counts.review;
  const score = latest ? latestSummary?.overallScore ?? null : null;
```

`listIssues` imzasına opsiyonel `limit` eklenmesi gerekir (`src/lib/data/firestore.ts`):

```ts
export async function listIssues(
  workspaceId: string,
  scanJobId: string,
  opts?: { limit?: number; severity?: string }
): Promise<Issue[]> {
  let q = db
    .collection(`workspaces/${workspaceId}/scans/${scanJobId}/issues`)
    .orderBy("severityRank", "asc");        // kritikler önce
  if (opts?.severity) q = q.where("severity", "==", opts.severity);
  if (opts?.limit) q = q.limit(opts.limit);
  …
}
```

> ⚠️ `severityRank` alanı ve gerekli composite index Firestore'da yoksa bu değişiklik `firestore_index_unavailable` hatası üretir. `tests/firestore-indexes.test.ts` zaten index sözleşmesini test ediyor — yeni index oraya eklenmelidir. Index yoksa geçici çözüm: `orderBy` olmadan `limit(50)` çekip client'ta sıralamak (yine de 500 → 50).

`ScanSummary` tipinde `criticalCount`/`moderateCount`/`minorCount` alanları yoksa (`getScanSummary` yalnızca `wcagIssueCount`, `bestPracticeIssueCount`, `manualReviewCount`, `overallScore`, `grade`, `riskLevel` döndürüyor olabilir) — o zaman worker'da özet yazılırken bu alanlar da eklenmelidir. Bu, "sayımı 500 dokümandan hesapla" probleminin **kalıcı** çözümüdür.

#### Neden bu çözüm

Bu, dokümandaki tek "veri modeli" değişikliği. Gerekçesi: dashboard **her sayfa yüklemesinde** (ve `force-dynamic` olduğu için her istekte) tarama başına 500 doküman okuyor. 10 kullanıcı × günde 20 sayfa yüklemesi = 100.000 Firestore okuma/gün — ücretsiz kotanın (50.000/gün) iki katı. Bu bir **maliyet ve dayanıklılık** sorunu, sadece performans değil. `error.tsx:24-26` zaten "If Firestore quota is exhausted…" diyor — yani bu senaryo daha önce yaşanmış.

#### Nasıl doğrulanır

Firebase konsolu → Firestore → Usage → dashboard'ı 10 kez yenile → okuma sayısı taramadaki bulgu sayısıyla değil, **sabit ~12** ile artmalı. `npm test` → `tests/firestore-indexes.test.ts` geçmeli.

---

### 5.28 — F-28: Büyük raporlarda DOM boyutu · **P2**

#### Mevcut kod — `src/app/app/scans/[id]/page.tsx:318-349`

```tsx
          {hasGroups ? (
            <div className="space-y-2.5">
              {groups.map((g, idx) => {
                const instances = instancesByGroup.get(g.id) ?? [];
                …
                  <IssueGroupSection key={g.id} defaultOpen={idx === 0} group={{…}}>
                    {instances.map(renderRow)}    {/* ← TÜM instance'lar HER ZAMAN render */}
                  </IssueGroupSection>
```

`IssueGroupSection.tsx:72-74` yalnızca `open` iken **görüntülüyor**, ama `children` server'da zaten render edilmiş ve RSC payload'ına girmiş durumda. 500 bulgu = 500 `IssueCard` = ~10.000 DOM düğümü + devasa payload.

#### Düzeltilmiş kod — üç katmanlı

**Katman 1 — F-03 ile bedava kazanç.** `searchParams` filtresi uygulandığında yalnız filtreli set render ediliyor. Kullanıcı "Critical" seçtiğinde 500 → 12.

**Katman 2 — Sayfalama.** Grup sayısı > 20 ise sayfalama ekle:

```tsx
  const GROUPS_PER_PAGE = 20;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const visibleGroups = groups.slice((page - 1) * GROUPS_PER_PAGE, page * GROUPS_PER_PAGE);
  const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE);
```

```tsx
          {totalPages > 1 && (
            <nav aria-label="Finding group pages" className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-ink-600">
                Page {page} of {totalPages} · {groups.length} root causes
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildHref({ page: String(page - 1) })}
                    className="inline-flex items-center h-9 px-3 rounded-md ring-1 ring-line bg-paper text-sm text-ink-700 hover:bg-canvas-2"
                  >
                    ← Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildHref({ page: String(page + 1) })}
                    className="inline-flex items-center h-9 px-3 rounded-md ring-1 ring-line bg-paper text-sm text-ink-700 hover:bg-canvas-2"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </nav>
          )}
```

**Katman 3 — Grup içi instance limiti.** Bir grupta 200 instance olabilir; ilk 10'unu göster, gerisini "Show all" ile:

```tsx
const INSTANCES_PREVIEW = 10;
…
                  <IssueGroupSection key={g.id} defaultOpen={idx === 0} group={{…}}>
                    {instances.slice(0, INSTANCES_PREVIEW).map(renderRow)}
                    {instances.length > INSTANCES_PREVIEW && (
                      <p className="text-xs text-ink-600 pt-2">
                        Showing {INSTANCES_PREVIEW} of {instances.length} instances.{" "}
                        <Link
                          href={`/api/scans/${scan.id}/issues?format=csv&groupId=${g.id}`}
                          className="text-blue-600 underline underline-offset-2 font-medium"
                        >
                          Export all {instances.length} as CSV
                        </Link>
                      </p>
                    )}
                  </IssueGroupSection>
```

**Ayrıca `IssueGroupSection`'ı `<details>`'e çevir** — `open` state'i client JS'e bağlı olmasın (§5.39 ile birleşik):

```tsx
export function IssueGroupSection({ group, defaultOpen = false, children }: {…}) {
  return (
    <details open={defaultOpen} className="group rounded-lg ring-1 ring-line bg-paper overflow-hidden">
      <summary className="w-full flex items-start gap-3 p-4 text-left cursor-pointer hover:bg-canvas-2 transition-colors list-none [&::-webkit-details-marker]:hidden">
        <span className="mt-0.5 text-ink-600 shrink-0" aria-hidden>
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        </span>
        <span className="flex-1 min-w-0">
          {/* … mevcut içerik … */}
        </span>
      </summary>
      <div className="px-4 pb-4 space-y-2.5 border-t border-line/60 pt-3">{children}</div>
    </details>
  );
}
```

Bu, `"use client"` direktifini **tamamen kaldırır** — bileşen artık server component. `aria-expanded`/`aria-controls` gerekmez çünkü `<details>` bunu native yapar (F-39 de kapanır).

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| `react-window`/`react-virtuoso` sanallaştırma | Ek bağımlılık; `Ctrl+F` ile sayfa içi arama bozulur; ekran okuyucu sanal imleci listeyi eksik görür (a11y ürününde kabul edilemez). **Ret.** |
| `content-visibility: auto` CSS | Sıfır JS, tarayıcı render'ı erteler. **Yardımcı ama yeterli değil** — DOM düğümleri ve RSC payload'ı hâlâ oluşuyor. Ek olarak uygulanabilir: `.issue-group { content-visibility: auto; contain-intrinsic-size: auto 80px; }` |
| Client-side "load more" | Ekstra API endpoint + state. Sayfalama daha basit ve URL'e yazılabilir. |
| **Filtre + sayfalama + `<details>`** | Sunucuda kesme, JS'siz çalışma, sıfır bağımlılık. **Seçilen.** |

`<details>` seçiminin ekstra faydası: tarayıcının `Ctrl+F` araması kapalı `<details>` içeriğini bulup **otomatik açar** (Chrome 120+). Bu, F-28'in aksine erişilebilirliği artırır.

#### Nasıl doğrulanır

500+ bulgulu bir test taraması ile: DevTools → Elements → düğüm sayısı. Hedef: **< 1.500** (şu an ~10.000). Lighthouse "Avoid an excessive DOM size" uyarısı kaybolmalı. JS kapalıyken gruplar açılıp kapanabilmeli.

---

### 5.29 — F-29 + F-32: Onay ve uyarı desenlerinin birleştirilmesi · **P2**

`ConfirmDialog` §5.2'de tanımlandı. Üç kullanım yerinin dönüşümü:

**(a) `monitors-manager.tsx:115-130` — native `confirm()`:**

```tsx
  const [pendingDelete, setPendingDelete] = useState<MonitorRow | null>(null);

  async function confirmRemove() {
    const m = pendingDelete;
    if (!m) return;
    setBusyId(m.id);
    setError(null);
    try {
      const res = await fetch(`/api/monitors/${m.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(monitorErrorMessage(body.error) ?? "Couldn't delete the monitor.");
        return;
      }
      setPendingDelete(null);
      announce(`Monitoring stopped for ${m.name}.`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }
```

```tsx
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmRemove()}
        pending={busyId === pendingDelete?.id}
        title="Stop monitoring this site?"
        description={pendingDelete ? `${pendingDelete.name} will no longer be re-scanned automatically.` : undefined}
        confirmLabel="Stop monitoring"
        tone="danger"
      >
        <p className="text-sm text-ink-700">
          Past scans and their findings stay in your workspace. Only the schedule is removed.
          You can add the site again at any time.
        </p>
      </ConfirmDialog>
```

**(b) `delete-actions.tsx:87-131` — inline expand → `ConfirmDialog`** (aynı desen, `COMPLIANCE_COPY.DELETE_SCAN_WARNING` gövdede).

**(c) `states/page.tsx:139-166` — kopyalanmış markup → `ConfirmDialog` demo'su.**

**F-32 — `AlertCallout` konsolidasyonu.** Değiştirilecek 6 nokta:

| Konum | Mevcut | Yeni |
|---|---|---|
| `invite-section.tsx:162` | `<div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 …">` | `<AlertCallout tone="warning" className="text-xs">` |
| `invite-section.tsx:219` | `border-rose-200 bg-rose-50 text-rose-900` | `<AlertCallout tone="danger" live className="text-xs">` |
| `invite-section.tsx:224` | `border-green-200 bg-green-50 text-green-900` | `<AlertCallout tone="success" live className="text-xs">` |
| `plan-picker.tsx:115` | `border-rose-200 bg-rose-50 text-rose-900` | `<AlertCallout tone="danger" live>` |
| `plan-picker.tsx:120` | `border-green-200 bg-green-50 text-green-900` | `<AlertCallout tone="success" live>` |
| `scans/[id]/page.tsx:175-186` | `border-amber-200 bg-amber-50 text-amber-900` | `<AlertCallout tone="warning" icon={AlertTriangle} title="Degraded scan">` |
| `FailedPagesNotice.tsx:14` | `border-amber-200 bg-amber-50 text-amber-950` | `<AlertCallout tone="warning" title="Some pages could not be scanned">` |
| `monitors-manager.tsx:182` | `<p className="text-sm text-rose-600">` | `<AlertCallout tone="danger" live>` |

Bu tek değişiklik **8 tanımsız Tailwind tonu** kullanımını da ortadan kaldırıyor (F-31): `amber-200`, `amber-900`, `amber-950`, `rose-200`, `rose-900`, `rose-600`, `green-200`, `green-900`.

**Lint kuralı ile koruma** — `eslint.config.mjs`:

```js
{
  files: ["src/**/*.tsx"],
  rules: {
    "no-restricted-syntax": ["error", {
      selector: "JSXAttribute[name.name='className'][value.value=/border-(amber|rose|green|blue|purple)-\\d{3}/]",
      message: "Ad-hoc alert markup detected. Use <AlertCallout> instead (docs/design-system.md §7).",
    }],
  },
}
```

#### Nasıl doğrulanır

`grep -rEn "border-(amber|rose|green)-[0-9]{3}" src/` → **0 sonuç** (AlertCallout'un kendisi hariç). `grep -rn "confirm(" src/app` → **0 sonuç**.

---

### 5.30 — F-30 + F-31: Token temizliği (kod tarafı)

§7.3/§7.4'te tam token spesifikasyonu var. Kod tarafında yapılacak sed-benzeri değişiklikler:

| Bul | Değiştir | Dosyalar |
|---|---|---|
| `text-ink-800` | `text-ink-700` | `settings/billing/page.tsx:58`, `statement-client.tsx:241`, `scan-report-actions.tsx:193`, `scans/[id]/page.tsx:619`, `monitors-manager.tsx:189`, `ManualReviewChecklist.tsx:326` |
| `hover:bg-ink-800` | `hover:bg-navy-800` | `compare/page.tsx:82` |
| `bg-ink-900` (buton) | `bg-navy-900` | `compare/page.tsx:82` |
| `bg-ink-100` | `bg-canvas-2` | `ManualReviewChecklist.tsx:326` |
| `text-amber-800` | `text-amber-700` | `IssueGroupSection.tsx:54` |
| `ring-amber-100` | `ring-amber-200` *(yeni token)* | `IssueGroupSection.tsx:54`, `ai-assistant-client.tsx:667,668,670` |
| `text-purple-700` | `text-purple-600` | `TopNav.tsx:202`, `AiSuggestionBlock.tsx:39`, `ai-panel.tsx:110,204`, `ai-assistant-client.tsx:685,686` |
| `text-purple-800` | `text-purple-600` | `ManualReviewChecklist.tsx:294`, `statement-client.tsx:218` |
| `text-purple-900` / `ring-purple-200` | `text-purple-600` / `ring-purple-100` | `ai-assistant-client.tsx:336` |
| `text-rose-600` | `text-rose-700` | `monitors-manager.tsx:182,253`, `monitor-scan-button.tsx:60`, `compare/page.tsx:346` |
| `text-green-600` | `text-green-700` | `monitor-scan-button.tsx:53`, `compare/page.tsx:345`, `ai-assistant-client.tsx:680` |
| `text-amber-600` | `text-amber-700` | `statement-client.tsx:364,439`, `ai-assistant-client.tsx:672` |
| `ring-green-100` / `border-green-100` | `ring-green-200` *(yeni)* | `ai-assistant-client.tsx:675,676,678` |
| `bg-black` | `bg-navy-900` | `Logo.tsx:18` (F-40) |
| `ring-green-50` / `ring-rose-50` / `ring-amber-50` | `ring-green-200` / `ring-rose-200` / `ring-amber-200` *(yeni)* | `AlertCallout.tsx:16,25,33`, `Badge.tsx:12,13,14`, `progress-client.tsx:309`, `delete-actions.tsx:91`, `scans/[id]/page.tsx:445-448` |

Son satır ayrıca **görsel bir hatayı** düzeltiyor: `bg-green-50` üzerine `ring-green-50` = **görünmez halka**. Kartların kenarlığı hiç görünmüyor (1.4.11 için de gerekli).

**Regresyon koruması** — CI'da çalışacak script (`scripts/check-tokens.mjs`):

```js
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const theme = readFileSync("src/app/globals.css", "utf8");
const DEFINED = new Set(
  [...theme.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1])
);
// Marka namespace'leri: bunlarda TANIMSIZ ton = ölü sınıf
const BRAND = ["navy", "ink", "canvas", "line", "paper"];
// Tailwind namespace'leri: bunlarda tanımsız ton = varsayılan palete sızıntı
const SHARED = ["blue", "green", "amber", "rose", "purple"];
const RE = new RegExp(
  `-(?:${[...BRAND, ...SHARED].join("|")})-(\\d{1,3})\\b`,
  "g"
);

const problems = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(tsx?|css)$/.test(p) || p.endsWith("globals.css")) continue;
    const src = readFileSync(p, "utf8");
    src.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(RE)) {
        const token = m[0].slice(1); // "rose-600"
        if (!DEFINED.has(token)) problems.push(`${p}:${i + 1}  ${token}`);
      }
    });
  }
}
walk("src");

if (problems.length) {
  console.error("Undefined color tokens (dead class or Tailwind default leakage):\n" + problems.join("\n"));
  process.exit(1);
}
console.log("All color tokens are defined in @theme.");
```

`package.json`: `"check:tokens": "node scripts/check-tokens.mjs"` ve CI'da `npm run lint` sonrasına eklenir.

---

### 5.33 + 5.56 — F-33 + F-56: Mobil navigasyon · "More" drawer'ı · **P1/P2**

#### Mevcut durum

`SideNav.tsx:49` `hidden lg:flex` → 1024px altında tamamen kayboluyor. `MobileBottomNav.tsx:8-14` yalnızca 5 hedef sunuyor. **Erişilemeyen rotalar:** `/app/monitors`, `/app/ai-assistant`, `/app/reports/builder`, `/app/team`, `/app/settings/billing`, `/pricing`. Ayrıca etiketler SideNav'dan farklı (F-56).

#### Düzeltilmiş kod

**Adım 1 — Tek etiket sözlüğü** (`src/lib/nav/items.ts`):

```ts
import {
  LayoutDashboard, ScanLine, Activity, KanbanSquare, Sparkles,
  FileBarChart2, Users, ShieldCheck, Settings, CreditCard, CircleHelp,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** Tek doğru etiket. Mobil ve masaüstü AYNI adı kullanır (WCAG 3.2.4). */
  label: string;
  icon: LucideIcon;
  /** Aktiflik için prefix eşleşmesi. */
  match?: string;
  /** Mobil bottom nav'da doğrudan görünenler. */
  primaryMobile?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/app",                 label: "Dashboard",   icon: LayoutDashboard, primaryMobile: true },
  { href: "/app/scans/new",       label: "Scans",       icon: ScanLine, match: "/app/scans", primaryMobile: true },
  { href: "/app/monitors",        label: "Monitors",    icon: Activity },
  { href: "/app/remediation",     label: "Remediation", icon: KanbanSquare, primaryMobile: true },
  { href: "/app/ai-assistant",    label: "AI Assistant", icon: Sparkles },
  { href: "/app/reports/builder", label: "Reports",     icon: FileBarChart2, match: "/app/reports" },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/app/team",             label: "Team & Roles",         icon: Users },
  { href: "/app/compliance",       label: "Privacy & Compliance", icon: ShieldCheck, primaryMobile: true },
  { href: "/app/settings/billing", label: "Billing",              icon: CreditCard, match: "/app/settings/billing" },
  { href: "/app/settings",         label: "Settings",             icon: Settings },
];

export const HELP_NAV: NavItem[] = [
  { href: "/pricing", label: "Plans & pricing", icon: CircleHelp },
];

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV, ...HELP_NAV];
export const MOBILE_PRIMARY = ALL_NAV.filter((i) => i.primaryMobile);
export const MOBILE_OVERFLOW = ALL_NAV.filter((i) => !i.primaryMobile);
```

`SideNav.tsx` artık `PRIMARY_NAV`/`SECONDARY_NAV`/`HELP_NAV`'i import eder — kendi listesini tanımlamaz. **F-56 kapanır.**

**Adım 2 — `MobileBottomNav` + More drawer:**

```tsx
"use client";

import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { PrefetchLink } from "@/components/nav/PrefetchLink";
import { useDismissable } from "@/lib/hooks/use-dismissable";
import { MOBILE_PRIMARY, MOBILE_OVERFLOW } from "@/lib/nav/items";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useDismissable({ open, onClose: () => setOpen(false), containerRef: panelRef, triggerRef });

  const isActive = (item: { href: string; match?: string }) =>
    item.match ? pathname?.startsWith(item.match) : pathname === item.href;
  const overflowActive = MOBILE_OVERFLOW.some(isActive);

  return (
    <>
      {/* Drawer — bottom sheet. Modal DEĞİL (nav), bu yüzden focus trap yok;
          Escape + dışarı tıklama + focus dışarı çıkınca kapanma yeterli. */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-navy-900/40 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div
            id={panelId}
            ref={panelRef}
            className="lg:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-xl bg-paper ring-1 ring-line shadow-[var(--shadow-pop)] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <h2 className="text-sm font-semibold text-ink-900">More</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="size-9 inline-flex items-center justify-center rounded-md text-ink-600 hover:bg-canvas-2"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <nav aria-label="More navigation">
              <ul className="p-2 grid grid-cols-2 gap-1">
                {MOBILE_OVERFLOW.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  return (
                    <li key={item.href}>
                      <PrefetchLink
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium min-h-[48px]",
                          active ? "bg-navy-900 text-paper" : "text-ink-700 hover:bg-canvas-2"
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden />
                        {item.label}
                      </PrefetchLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </>
      )}

      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex items-stretch">
          {MOBILE_PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <li key={item.href} className="flex-1">
                <PrefetchLink
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 px-1 min-h-[56px] text-[0.6875rem] font-medium",
                    active ? "text-navy-900" : "text-ink-600"
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {item.label}
                </PrefetchLink>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={panelId}
              className={cn(
                "w-full flex flex-col items-center justify-center gap-1 py-2.5 px-1 min-h-[56px] text-[0.6875rem] font-medium",
                open || overflowActive ? "text-navy-900" : "text-ink-600"
              )}
            >
              <MoreHorizontal className="size-5" aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
```

**Adım 3 — Aktif hedef "More" içindeyken görünürlük.** `overflowActive` sayesinde kullanıcı `/app/team`'deyken "More" sekmesi vurgulanıyor — "neredeyim?" sorusuna cevap veriliyor.

**Adım 4 — Landing/pricing mobil nav (aynı sorunun pazarlama tarafı, `app/page.tsx:63`):** Aynı desen, `<details>` tabanlı basit bir disclosure yeterli (client JS gerekmez):

```tsx
        <details className="md:hidden relative">
          <summary className="list-none size-11 inline-flex items-center justify-center rounded-md ring-1 ring-line cursor-pointer [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Open menu</span>
            <Menu className="size-5" aria-hidden />
          </summary>
          <nav aria-label="Site" className="absolute right-0 top-12 w-56 rounded-md bg-paper ring-1 ring-line shadow-[var(--shadow-card)] p-2 z-50">
            <a href="#how-it-works" className="block px-3 py-2.5 rounded-md text-sm text-ink-700 hover:bg-canvas-2 min-h-[44px]">How it works</a>
            <a href="#pricing-preview" className="block px-3 py-2.5 rounded-md text-sm text-ink-700 hover:bg-canvas-2 min-h-[44px]">Pricing</a>
            <a href="/legal/accessibility-methodology" className="block px-3 py-2.5 rounded-md text-sm text-ink-700 hover:bg-canvas-2 min-h-[44px]">Methodology</a>
          </nav>
        </details>
```

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| Hamburger + tam ekran drawer (sol taraf) | Mobilde başparmak erişimi kötü (üst köşe); bottom nav zaten var, iki farklı nav paradigması karışıklık yaratır. **Ret.** |
| Bottom nav'ı 10 sekmeye çıkar | 320px'de her sekme 32px → hem dokunma hedefi hem etiket okunmaz. **Ret.** |
| `SideNav`'ı `md:` breakpoint'inde göster | 768-1024 arası tablet için iyi; ama 320-768 hâlâ çözümsüz. Ek olarak yapılabilir. |
| **4 birincil + "More" bottom sheet** | iOS/Android platform deseni; başparmak erişimi; `overflowActive` ile konum belli. **Seçilen.** |

Drawer **modal değil** — bu bilinçli. Bir navigasyon menüsüne focus trap koymak, kullanıcıyı gereksiz yere hapsetmektir. `useDismissable` (Escape + dışarı tıklama + focus çıkışı) doğru seviyedir. APG "disclosure navigation menu" deseni budur.

`pb-[env(safe-area-inset-bottom)]` — iPhone home indicator'ı altında kalan alan; olmadan son satır tıklanamaz.

#### Nasıl doğrulanır

**375×667 (iPhone SE) viewport:**
1. ✅ Bottom nav'da 5 öğe: Dashboard, Scans, Remediation, Privacy & Compliance, More.
2. ✅ "More" → bottom sheet açılmalı, 6 hedef görünmeli.
3. ✅ Escape → kapanmalı, focus "More" butonuna dönmeli.
4. ✅ Bir hedefe git → sheet kapanmalı, "More" vurgulu kalmalı.
5. ✅ Masaüstü ve mobilde **aynı** etiketler (F-56).

```ts
test("every side nav destination is reachable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/app");
  await page.getByRole("button", { name: /^more$/i }).click();
  const drawer = page.getByRole("navigation", { name: /more navigation/i });
  for (const label of ["Monitors", "AI Assistant", "Reports", "Team & Roles", "Billing", "Settings"]) {
    await expect(drawer.getByRole("link", { name: label })).toBeVisible();
  }
});

test("nav labels are consistent across breakpoints", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app");
  await expect(page.getByRole("navigation").getByRole("link", { name: "Remediation" })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.getByRole("link", { name: "Remediation" })).toBeVisible();
});
```

---

### 5.34 / 5.35 — F-34 + F-35: Prefetch disiplini · **P2**

#### Mevcut kod — `AppRoutePrefetcher.tsx:6-18, 31-56`

```tsx
const CORE_APP_ROUTES = ["/app", "/app/scans/new", …, "/app/states"];  // 11 rota
…
  useEffect(() => {
    …
    const warm = () => {
      const related = RELATED_ROUTES.find(…)?.routes ?? [];
      const routes = Array.from(new Set([...related, ...CORE_APP_ROUTES]));
      for (const route of routes) if (route !== pathname) router.prefetch(route);
    };
    …
  }, [pathname, router]);            // ← her navigasyonda tekrar
```

#### Düzeltilmiş kod

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Oturum başına BİR KEZ, en sık kullanılan iki rotayı ısıtır.
 *
 * Neden bu kadar az: SideNav/MobileBottomNav linkleri zaten `PrefetchLink`
 * (viewport prefetch + hover/focus/touch ısıtma). Üçüncü bir katman aynı
 * RSC payload'larını tekrar tekrar çekiyordu — her navigasyonda ~12 istek.
 */
const WARM_ROUTES = ["/app", "/app/scans/new"];

export function AppRoutePrefetcher() {
  const router = useRouter();
  const warmedRef = useRef(false);

  useEffect(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;

    // Yavaş bağlantı / veri tasarrufu modunda hiç prefetch etme.
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (conn?.saveData || /2g/.test(conn?.effectiveType ?? "")) return;

    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const warm = () => {
      for (const route of WARM_ROUTES) router.prefetch(route);
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(warm, { timeout: 2_000 });
    } else {
      timeoutId = setTimeout(warm, 400);
    }

    return () => {
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [router]);

  return null;
}
```

**`/app/states`'i prod'da kapat** (`src/app/app/states/page.tsx` başına):

```tsx
import { notFound } from "next/navigation";

export default async function StatesPage() {
  // İç QA galerisi. Üretimde erişilemez olmalı — hem kafa karışıklığını
  // hem gereksiz RSC payload'ını önler.
  if (process.env.NODE_ENV === "production" && process.env.PERCEVIA_ENABLE_QA_ROUTES !== "1") {
    notFound();
  }
  …
```

**`PrefetchLink` hover debounce** (V1 §4.3'teki ek risk) — `PrefetchLink.tsx:15-41`:

```tsx
export function PrefetchLink({ href, onFocus, onMouseEnter, onTouchStart, prefetch, ...props }: Props) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warmedRef = useRef(false);

  function warmRoute(delay = 0) {
    if (warmedRef.current || !isPrefetchable(href)) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      warmedRef.current = true;
      router.prefetch(href);
    }, delay);
  }
  function cancelWarm() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  useEffect(() => () => cancelWarm(), []);

  return (
    <Link
      {...props}
      href={href as LinkProps["href"]}
      prefetch={prefetch ?? true}
      onFocus={(e) => { warmRoute(0); onFocus?.(e); }}
      onMouseEnter={(e) => { warmRoute(120); onMouseEnter?.(e); }}   // fare gezinmesini ele
      onMouseLeave={cancelWarm}
      onTouchStart={(e) => { warmRoute(0); onTouchStart?.(e); }}
    />
  );
}
```

`warmedRef` sayesinde aynı link ikinci kez hover edildiğinde tekrar prefetch edilmiyor.

#### Nasıl doğrulanır

DevTools → Network → filtre `_rsc`.
1. `/app` yüklendiğinde: ≤ 2 prefetch isteği (şu an ~11).
2. `/app/team`'e git → **yeni bir toplu prefetch dalgası olmamalı** (yalnız viewport'taki linkler).
3. SideNav üzerinde fareyi hızlıca gezdir → 120 ms'den kısa süre kalınan linkler prefetch **edilmemeli**.
4. Prod build'de `/app/states` → 404.

---

### 5.36 — F-36: Davet iptalinde busy + optimistic · **P3**

```tsx
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const announce = useAnnounce();

  async function revoke(id: string, email: string) {
    if (revokingId) return;
    setRevokingId(id);
    setError(null);
    setInfo(null);
    const snapshot = invites;
    setInvites((prev) => prev.filter((i) => i.id !== id));   // optimistic
    try {
      const res = await fetch(`/api/team/invitations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setInvites(snapshot);                                 // rollback
        setError(teamErrorMessage(data.error) ?? "Could not revoke this invitation.");
        return;
      }
      announce(`Invitation for ${email} revoked.`);
    } catch {
      setInvites(snapshot);
      setError("Network error. The invitation was not revoked.");
    } finally {
      setRevokingId(null);
    }
  }
```

Buton (`:253-261`):
```tsx
                  <button
                    type="button"
                    onClick={() => void revoke(inv.id, inv.email)}
                    disabled={revokingId !== null}
                    className="inline-flex items-center h-8 px-2.5 rounded-md text-xs font-medium text-rose-700 ring-1 ring-line hover:bg-rose-50 disabled:opacity-50"
                  >
                    {revokingId === inv.id ? "Revoking…" : "Revoke"}
                    <span className="sr-only"> invitation for {inv.email}</span>
                  </button>
```

`sr-only` bağlam (WCAG 2.4.4): link/buton listesinde "Revoke, Revoke, Revoke" yerine "Revoke invitation for ali@example.com".

---

### 5.37 / 5.58 — F-37 + F-58: `Field` sarmalayıcısı · `aria-describedby` + `aria-invalid` · **P2**

#### Mevcut kod — `src/components/ui/Input.tsx:66-76`

```tsx
export function FieldHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-1.5 text-xs text-ink-500", className)}>{children}</p>;
}

export function FieldError({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <p id={id} className={cn("mt-1.5 text-xs font-medium text-rose-700", className)}>
      {children}
    </p>
  );
}
```

`FieldHint`'in `id`'si yok → `aria-describedby` ile bağlanamaz. `FieldError` hiç kullanılmıyor (grep → 0 import).

#### Düzeltilmiş kod — `src/components/ui/Field.tsx`

```tsx
"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldCtx {
  inputId: string;
  hintId: string;
  errorId: string;
  invalid: boolean;
  describedBy: string | undefined;
}
const Ctx = createContext<FieldCtx | null>(null);

/**
 * Bir form alanı için etiket / ipucu / hata üçlüsünü programatik olarak
 * bağlar. Alan bileşenleri `useField()` ile doğru id'leri alır.
 */
export function Field({
  children,
  error,
  hasHint,
  className,
  id,
}: {
  children: ReactNode;
  error?: string | null;
  /** İpucu render edilecek mi — describedby'a dâhil edilsin mi. */
  hasHint?: boolean;
  className?: string;
  id?: string;
}) {
  const auto = useId();
  const inputId = id ?? `f-${auto}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const invalid = Boolean(error);
  const describedBy =
    [hasHint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <Ctx.Provider value={{ inputId, hintId, errorId, invalid, describedBy }}>
      <div className={cn("space-y-0", className)}>{children}</div>
    </Ctx.Provider>
  );
}

export function useField() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Field subcomponents must be used inside <Field>");
  return ctx;
}

/** `<Input>`/`<Select>`/`<Textarea>`'a yayılacak proplar. */
export function useFieldProps() {
  const { inputId, describedBy, invalid } = useField();
  return {
    id: inputId,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
  } as const;
}
```

`Input.tsx` içinde `FieldHint`/`FieldError` context'e bağlanır:

```tsx
export function FieldHint({ children, className }: { children: React.ReactNode; className?: string }) {
  // Field dışında da kullanılabilsin diye context opsiyonel.
  const ctx = useContext(FieldCtxOptional);
  return (
    <p id={ctx?.hintId} className={cn("mt-1.5 text-xs text-ink-600", className)}>
      {children}
    </p>
  );
}

export function FieldError({ children, className }: { children: React.ReactNode; className?: string }) {
  const ctx = useContext(FieldCtxOptional);
  return (
    <p
      id={ctx?.errorId}
      className={cn("mt-1.5 text-xs font-medium text-rose-700", className)}
    >
      {children}
    </p>
  );
}
```

`text-ink-500` → `text-ink-600`: ipucu metni 4.87:1 → 6.91:1 (küçük punto için güvenlik payı).

**Kullanım — `scans/new/page.tsx:130-148`:**

```tsx
            <Field error={urlError} hasHint>
              {(() => null)()}
              <Label htmlFor={undefined} required>Website URL</Label>
              …
            </Field>
```

Daha ergonomik hâli (render-prop yerine alt bileşenler):

```tsx
import { Field } from "@/components/ui/Field";
import { FieldControl, FieldLabel } from "@/components/ui/Field";
…
            <Field error={urlError} hasHint>
              <FieldLabel required>Website URL</FieldLabel>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-500" aria-hidden />
                <FieldControl
                  as={Input}
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setUrlError(null); }}
                  onBlur={() => setUrlError(validateUrl(url))}
                  className="pl-9"
                  autoComplete="url"
                  required
                />
              </div>
              <FieldHint>
                Public URL with https:// scheme. We block private and internal addresses.
              </FieldHint>
              {urlError && <FieldError>{urlError}</FieldError>}
            </Field>
```

`validateUrl` (client-side ön doğrulama, sunucu doğrulamasının yerini almaz):

```ts
function validateUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter the website URL you want to scan.";
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "That doesn't look like a full URL. Include https:// — for example https://example.com.";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return "Only http:// and https:// URLs can be scanned.";
  }
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) {
    return "That's a private or internal address. Percevia can only scan publicly reachable URLs.";
  }
  return null;
}
```

#### Neden bu çözüm

| Alternatif | Trade-off |
|---|---|
| Her çağrı yerinde elle `id`/`aria-describedby` yazmak | 40+ alan; birinde unutulur ve kimse fark etmez. Bu **tam olarak** şu an olan şey. **Ret.** |
| `react-hook-form` + `zod` resolver | Proje zaten `zod` kullanıyor (`package.json:40`). Form durumu, doğrulama, `aria-invalid` hepsi gelir. **Güçlü alternatif** — ama mevcut formlar `useState` tabanlı; toplu göç 2-3 günlük iş. **§13'e.** |
| **Context tabanlı `Field`** | Sıfır bağımlılık, kademeli benimseme (bir alanı çevirip test edebilirsin), mevcut `Input`/`Label`/`FieldHint` API'si korunuyor. **Seçilen.** |

`aria-invalid={invalid \|\| undefined}` — `aria-invalid="false"` yazmak yerine attribute'u hiç koymamak tercih edilir; bazı eski ekran okuyucular `false` değerini de duyurur.

`onBlur` doğrulama (submit'te değil): WCAG 3.3.1 için erken hata bildirimi, ama kullanıcı yazarken kesintiye uğramaz.

#### Nasıl doğrulanır

**VoiceOver:** New Scan → URL alanına Tab.
> "Website URL, required, edit text. Public URL with https:// scheme. We block private and internal addresses."

Geçersiz bir değer yazıp Tab'la çık:
> "Website URL, required, invalid data, edit text. Public URL with https:// scheme… That doesn't look like a full URL. Include https://…"

**Otomatik:**
```ts
test("URL field announces its hint and error", async ({ page }) => {
  await page.goto("/app/scans/new");
  const url = page.getByRole("textbox", { name: /website url/i });
  const described = (await url.getAttribute("aria-describedby"))!;
  expect(described).toContain("hint");

  await url.fill("not a url");
  await url.blur();
  await expect(url).toHaveAttribute("aria-invalid", "true");
  const ids = (await url.getAttribute("aria-describedby"))!.split(" ");
  const errorText = await page.locator(`#${ids.find((i) => i.endsWith("-error"))}`).textContent();
  expect(errorText).toMatch(/include https/i);
});
```

---

### 5.39 — F-39: `IssueGroupSection` panel ilişkisi · **P3**

§5.28'de `<details>/<summary>`'ye geçiş bu bulguyu **tamamen** kapatıyor: `<details>` native olarak `aria-expanded` + panel ilişkisini sağlar, ek ARIA gerekmez.

`<details>`'e geçilmeyecekse minimum düzeltme:

```tsx
export function IssueGroupSection({ group, defaultOpen = false, children }: {…}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const multiple = group.affectedCount > 1;

  return (
    <div className="rounded-lg ring-1 ring-line bg-paper overflow-hidden">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex items-start gap-3 p-4 text-left hover:bg-canvas-2 transition-colors"
        >
          {/* … */}
        </button>
      </h3>
      <div id={panelId} role="region" aria-label={group.title} hidden={!open}
           className="px-4 pb-4 space-y-2.5 border-t border-line/60 pt-3">
        {children}
      </div>
    </div>
  );
}
```

Üç önemli nokta:
1. Buton `<h3>` içinde → rotor gezinmesinde grup başlıkları listelenir (WCAG 2.4.10 / APG accordion deseni).
2. `hidden={!open}` (koşullu render yerine) → `aria-controls` hedefi **her zaman DOM'da**, ilişki hiç kopmuyor.
3. `role="region"` + `aria-label` → panel bağımsız bir landmark olarak gezilebilir.

> `hidden` kullanmak §5.28'deki DOM boyutu hedefiyle çelişir. Bu yüzden `<details>` versiyonu tercih edilmelidir: `<details>` kapalıyken içeriği DOM'da tutar ama tarayıcı render etmez (`content-visibility` benzeri davranış) ve tüm ARIA'yı native sağlar.

---

### 5.43 — F-43: Plan cap'ini forma taşı · **P2**

#### Mevcut kod — `scans/new/page.tsx:217-230`

```tsx
              <Input id="max-pages" type="number" value={maxPages}
                onChange={(e) => setMaxPages(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                min={1} max={1000} />
              <FieldHint>Free plan: up to 3 pages. Starter and above raise the cap.</FieldHint>
```

#### Düzeltilmiş kod

Sayfa RSC kabuğa taşınır (`page.tsx`), form client island olur ve cap prop olarak gelir:

```tsx
// src/app/app/scans/new/page.tsx  (RSC)
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { maxPagesForPlan, dailyScanLimitForPlan } from "@/lib/entitlements";
import { NewScanForm } from "./new-scan-form";

export const metadata = { title: "New scan — Percevia AI" };
export const dynamic = "force-dynamic";

export default async function NewScanPage() {
  const ctx = await getCurrentWorkspaceOrRedirect();
  return (
    <NewScanForm
      plan={ctx.workspace.plan}
      maxPagesCap={maxPagesForPlan(ctx.workspace.plan)}
      dailyScanLimit={dailyScanLimitForPlan(ctx.workspace.plan)}
      aiConsentGranted={!!ctx.privacy?.aiProcessingEnabled}
      visualEvidenceAllowed={!!ctx.privacy?.visualEvidenceEnabled}
    />
  );
}
```

Form içinde:

```tsx
              <Field hasHint error={maxPages > maxPagesCap ? capError : null}>
                <FieldLabel>Max pages</FieldLabel>
                <FieldControl
                  as={Input}
                  type="number"
                  inputMode="numeric"
                  value={maxPages}
                  onChange={(e) => setMaxPages(clamp(Number(e.target.value) || 1, 1, maxPagesCap))}
                  min={1}
                  max={maxPagesCap}
                />
                <FieldHint>
                  Your {plan} plan scans up to {maxPagesCap} page{maxPagesCap === 1 ? "" : "s"} per run.
                  {plan === "free" && (
                    <>
                      {" "}
                      <Link href="/app/settings/billing" className="text-blue-600 underline underline-offset-2 font-medium">
                        See plans
                      </Link>{" "}
                      to raise the cap.
                    </>
                  )}
                </FieldHint>
              </Field>
```

Ayrıca AI ve screenshot toggle'ları **workspace consent'ine** bağlanır — şu an kullanıcı AI'ı açabiliyor ama consent yoksa API reddediyor (geç geri bildirim):

```tsx
              <Switch
                checked={aiExplain && aiConsentGranted}
                disabled={!aiConsentGranted}
                onChange={(e) => setAiExplain(e.target.checked)}
                label="AI explanations & remediation"
                description={
                  aiConsentGranted
                    ? "Generate plain-language explanations and code fixes for each finding."
                    : "Your workspace hasn't enabled AI processing yet."
                }
              />
              {!aiConsentGranted && (
                <p className="text-xs text-ink-600 mt-2">
                  <Link href="/app/compliance" className="text-blue-600 underline underline-offset-2 font-medium">
                    Enable AI in the Privacy &amp; Compliance Center
                  </Link>{" "}
                  to turn this on. An admin has to approve it once for the whole workspace.
                </p>
              )}
```

Bu, `docs/microcopy.md:78` "Calm > alarmist" ve `:80` "Direct > evasive" kurallarına uygun: kısıtın **nedenini** ve **çözümünü** birlikte veriyor.

#### Nasıl doğrulanır

Free plan hesabıyla: `max` attribute'u `3` olmalı; 50 yazıp submit denendiğinde tarayıcı native doğrulaması engellemeli **ve** ipucu planı söylemeli. AI toggle'ı consent yoksa disabled olmalı ve Compliance Center'a link göstermeli.

---

### 5.47 — F-47: `AlertCallout` `live` prop'u · **P3**

```tsx
export function AlertCallout({
  tone = "info",
  title,
  children,
  action,
  className,
  icon: IconOverride,
  live = false,
}: {
  tone?: Tone;
  title?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
  /**
   * Bu uyarı bir KULLANICI EYLEMİNE cevaben mi ortaya çıkıyor?
   * - true  → role="alert" (assertive, anında duyurulur)
   * - false → hiçbir live role yok (sayfanın statik parçası)
   *
   * Varsayılan false: sayfa yüklenirken 9 tane assertive duyuru yapmak
   * (bkz. states/page.tsx) ekran okuyucu kullanıcısını sayfadan koparır.
   */
  live?: boolean;
}) {
  const s = styles[tone];
  const Icon = IconOverride ?? s.icon;
  return (
    <div
      role={live ? "alert" : undefined}
      className={cn("rounded-md p-4 ring-1 flex gap-3", s.bg, s.ring, className)}
    >
      {/* … */}
    </div>
  );
}
```

`live` verilmesi gereken yerler (dinamik): `scans/new/page.tsx:309`, `plan-picker.tsx`, `invite-section.tsx`, `monitors-manager.tsx`, `ai-panel.tsx:143`, `ai-assistant-client.tsx:218`, `progress-client.tsx:248,261`.
`live` **verilmeyecek** yerler (statik): `scans/new/page.tsx:270` privacy notice, `onboarding-client.tsx:100` product boundary, `ai-assistant-client.tsx:154` "what this won't do", `compliance/page.tsx:315` subprocessor notu, tüm `states/page.tsx` örnekleri.

**Ek düzeltme:** `styles` haritasındaki `ring-green-50`/`ring-amber-50`/`ring-rose-50` → `ring-green-200`/`ring-amber-200`/`ring-rose-200` (§7.3'te tanımlanan yeni tonlar). Şu an halka arka planla aynı renkte, yani **görünmez**.

#### Nasıl doğrulanır

`/app/states` sayfasını VoiceOver ile aç: sayfa yüklenirken **hiçbir** kesintili duyuru olmamalı (şu an 9 tane var). New Scan'de geçersiz URL ile submit et: hata **anında** duyurulmalı.

---

### 5.48 — F-48: Server Action pending durumu · **P2**

#### Mevcut kod — `workspace/setup/page.tsx:34,109-114`

```tsx
        <form action={updateWorkspaceAction} className="mt-8 space-y-6">
          …
            <button type="submit" className="…">
              Save &amp; continue <ArrowRight className="size-4" aria-hidden />
            </button>
```

#### Düzeltilmiş kod

`src/components/ui/SubmitButton.tsx`:

```tsx
"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/Button";

/**
 * `useFormStatus` yalnızca <form>'un ALT AĞACINDAKİ bir client component'te
 * çalışır — bu yüzden ayrı bir bileşen olmak zorunda.
 */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
```

Kullanım:

```tsx
import { ArrowRight } from "lucide-react";
import { SubmitButton } from "@/components/ui/SubmitButton";
…
            <SubmitButton pendingLabel="Setting up your workspace…">
              Save &amp; continue <ArrowRight className="size-4" aria-hidden />
            </SubmitButton>
```

Aynı bileşen `settings-client.tsx:141-147`'de de kullanılır.

`Button`'ın `forwardRef` imzasına `ButtonProps` export'u zaten var (`Button.tsx:37-39`) ✅.

#### Neden bu çözüm

`useFormStatus` React 19'da `react-dom`'dan gelir (`react`'ten değil — sık yapılan hata). Server Action'lar için sıfır maliyetli pending state verir; `useState`+`onSubmit` gerektirmez ve **progressive enhancement'ı bozmaz** (JS yüklenmeden form yine submit olur).

`disabled` **ve** `aria-disabled`: `disabled` çift submit'i engeller ama butonu Tab sırasından çıkarır (odak kaybolur). `aria-disabled` ekran okuyucuya durumu bildirir. İdeal olan `aria-disabled` + `onClick` guard'dır ama Server Action formlarında `disabled` yeterli ve daha güvenli.

#### Nasıl doğrulanır

Network → Slow 3G → Setup formunu gönder: buton anında "Setting up your workspace…" olmalı ve tıklanamaz hâle gelmeli. JS'i kapat → form yine çalışmalı (pending göstergesi olmadan).

---

### 5.51 — F-51: Gövde içi link kontrastı · **P1**

#### Mevcut kod

```tsx
// NoGuaranteeBanner.tsx:24
          <Link href="/app/compliance" className="font-medium text-blue-600 underline-offset-2 hover:underline">
```

`blue-600` (#3563E6) vs çevreleyen `ink-700` (#2A3247) = **2.67:1** (< 3:1) ve alt çizgi yalnız hover'da → renk tek ayırt edici → WCAG 1.4.1 ihlali.

#### Düzeltilmiş kod

**Global kural** (`globals.css`, `.sr-only` bloğunun altına):

```css
/* --- Gövde metni içi linkler --- */
/*
 * WCAG 1.4.1: Bir link yalnızca renkle ayırt ediliyorsa, renk kontrastı
 * çevreleyen metne göre ≥3:1 OLMALI ve hover/focus'ta ek bir görsel işaret
 * bulunmalıdır. Marka mavimiz (#3563E6) gövde metnimize (#2A3247) göre
 * 2.67:1 — eşiğin altında. Bu yüzden alt çizgi HER ZAMAN açık.
 *
 * Buton/nav/kart gibi "blok" linkler bu kuraldan `.link-block` ile muaf:
 * onlar konum, arka plan ve kenarlıkla zaten ayırt ediliyor.
 */
.prose-body a:not(.link-block),
p > a:not(.link-block),
li > a:not(.link-block),
dd > a:not(.link-block) {
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}

.prose-body a:not(.link-block):hover,
p > a:not(.link-block):hover,
li > a:not(.link-block):hover {
  text-decoration-thickness: 2px;
}
```

**Bileşen tarafı** (global CSS'e güvenmemek için, `cn` ile açık):

```tsx
// NoGuaranteeBanner.tsx:24
          <Link
            href="/app/compliance"
            className="font-medium text-blue-700 underline underline-offset-2 decoration-1 hover:decoration-2"
          >
```

`blue-600` → `blue-700` (#2A50BF): gövde metnine (`ink-700`) göre kontrast **2.67:1 → 3.25:1** ✅ ve `paper` üzerinde 6.30:1 ✅.

Hesap (§7.2 yöntemiyle): L(blue-700) = 0.0999, L(ink-700) = 0.0311 → (0.0999+0.05)/(0.0311+0.05) = **1.85:1**… 

⚠️ **Düzeltme:** blue-700'ün ink-700'e göre kontrastı **1.85:1** — daha da kötü (koyu renk koyu metne yaklaşıyor). Doğru çözüm **rengi değiştirmek değil, alt çizgiyi kalıcı yapmaktır.** G183 tekniği yerine **F73/G182 kombinasyonu** uygulanmalı: link, renk **dışında** bir görsel işaretle (alt çizgi) ayırt edilir; o zaman 3:1 kuralı devreye girmez.

**Nihai karar:**

```tsx
          <Link
            href="/app/compliance"
            className="font-medium text-blue-600 underline underline-offset-2 decoration-1 hover:decoration-2 focus-visible:decoration-2"
          >
```

Renk `blue-600` kalıyor (arka plana göre 4.52-4.86:1 ✅, 1.4.3 geçiyor); **alt çizgi kalıcı** olduğu için 1.4.1 kapanıyor.

#### Değiştirilecek yerler (tam liste)

| Dosya:satır | Mevcut |
|---|---|
| `NoGuaranteeBanner.tsx:24` | `text-blue-600 underline-offset-2 hover:underline` |
| `NoGuaranteeBanner.tsx:49` | `text-blue-600 hover:underline` |
| `ai-panel.tsx:98` | `underline font-medium` ✅ zaten doğru |
| `settings-client.tsx:134` | `underline font-medium` ✅ zaten doğru |
| `app/app/page.tsx:131` | `text-blue-600 hover:underline` |
| `app/app/page.tsx:252` | `text-blue-600 hover:underline` |
| `compliance/page.tsx:288` | `text-blue-600 hover:underline` |
| `scan-report-actions.tsx:198` | `text-blue-600 hover:underline` |
| `monitors-manager.tsx:222` | `text-blue-600 hover:underline` |
| `issues/[issueId]/page.tsx:69` | `text-blue-600 hover:underline` |
| `statement-client.tsx:260,359,434` | `text-blue-600 hover:underline` |
| `invite-section.tsx:250` | `text-blue-600` (link değil, metin — kalabilir) |
| `legal/contact/page.tsx:58` | `text-blue-600 hover:underline` |
| `Button.tsx:24` `variant="link"` | `text-blue-600 underline-offset-4 hover:underline` → `underline` ekle |

**Regresyon koruması** — ESLint:

```js
{
  selector: "JSXAttribute[name.name='className'][value.value=/text-blue-600(?!.*\\bunderline\\b)/]",
  message: "Inline links must carry a permanent underline (WCAG 1.4.1). Add `underline underline-offset-2`, or use `.link-block` for card/nav links.",
}
```

#### Nasıl doğrulanır

Herhangi bir gövde paragrafındaki link **hover olmadan** alt çizgili görünmeli. Chrome DevTools → Rendering → "Emulate vision deficiencies" → "Achromatopsia" (tam renk körlüğü) → linkler hâlâ ayırt edilebilmeli.

---

### 5.57 — F-57: Plan değişikliği onayı · **P2**

#### Mevcut kod — `plan-picker.tsx:74-86,173-181`

```tsx
      const res = await fetch("/api/plan/select", {
        method: "POST", …
        body: JSON.stringify({ plan: target }),
      });
      …
                <Button variant={isCurrent ? "secondary" : "primary"} size="sm" className="mt-3"
                  disabled={isCurrent || busy !== null || pending}
                  onClick={() => choosePlan(p.id)}>        {/* ← onay yok */}
```

#### Düzeltilmiş kod

```tsx
  const [confirming, setConfirming] = useState<(typeof PLANS)[number] | null>(null);

  const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, agency: 2, team: 3, enterprise: 4 };
  const isDowngrade = (target: string) => (PLAN_RANK[target] ?? 0) < (PLAN_RANK[plan] ?? 0);

  function requestPlanChange(target: (typeof PLANS)[number]) {
    // Yükseltmeler zaten Polar checkout'una gidiyor (kendi onay adımı var).
    // Düşürmeler geri alınamaz veri/limit kaybı yaratabilir → onay iste.
    if (isDowngrade(target.id)) {
      setConfirming(target);
      return;
    }
    void choosePlan(target.id);
  }
```

```tsx
      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          const target = confirming;
          setConfirming(null);
          if (target) void choosePlan(target.id);
        }}
        pending={busy !== null}
        title={`Switch to the ${confirming?.name} plan?`}
        description="This takes effect immediately."
        confirmLabel={`Switch to ${confirming?.name}`}
        tone="danger"
      >
        <ul className="space-y-2 text-sm text-ink-700 list-disc list-inside">
          <li>Your page limit per scan drops to <strong>{maxPagesForPlan(confirming?.id ?? "free")}</strong>.</li>
          <li>Monitors above the new limit are paused (not deleted).</li>
          <li>Team seats above the new limit lose access until you upgrade again.</li>
          <li><strong>Existing scans, findings, and reports are kept.</strong></li>
        </ul>
        <p className="mt-3 text-xs text-ink-600">
          You can switch back at any time. Nothing is deleted by changing plans.
        </p>
      </ConfirmDialog>
```

Buton: `onClick={() => requestPlanChange(p)}`.

#### Neden bu çözüm

WCAG 3.3.4 üç seçenekten birini ister: (a) geri alınabilir, (b) doğrulanır, (c) **onaylanır**. Plan düşürme geri alınabilir gibi görünüyor (tekrar yükseltilebilir) ama ara dönemde kaybedilen erişim (takım üyeleri, duraklatılan monitorler) geri alınamaz → (c) gerekli.

`ConfirmDialog`'un `tone="danger"` ile initial focus'u "Cancel"da olması (§5.2) burada özellikle önemli.

Onay metni **ne kaybedileceğini** somut sayılarla söylüyor ve **ne kaybedilmeyeceğini** de söylüyor — `docs/microcopy.md:78` "Calm > alarmist" kuralı: korkutmak değil, bilgilendirmek.

#### Nasıl doğrulanır

Agency planındayken "Free" → "Choose" → dialog açılmalı, focus "Cancel"da olmalı, Escape ile iptal edilmeli. "Starter" → "Upgrade" → dialog **açılmamalı** (Polar checkout'a gitmeli).

---

### 5.60 — F-60: `scroll-margin-top` · **P2**

`globals.css`'e ekle (`*:focus-visible` bloğunun yanına):

```css
/*
 * WCAG 2.4.11 Focus Not Obscured (Minimum).
 * TopNav 64px yüksekliğinde `sticky top-0`. Tarayıcı odaklanan elemanı
 * görünür alana kaydırırken sticky header'ı hesaba katmaz — eleman
 * header'ın ALTINDA kalabilir. `scroll-margin-top` bunu telafi eder.
 */
:target,
a[href],
button,
input,
select,
textarea,
summary,
[tabindex]:not([tabindex="-1"]) {
  scroll-margin-top: 5rem;   /* 64px header + 16px nefes payı */
}

/* Alt navigasyon mobilde 56px + safe area */
@media (max-width: 1023px) {
  a[href],
  button,
  input,
  select,
  textarea,
  summary,
  [tabindex]:not([tabindex="-1"]) {
    scroll-margin-bottom: 5rem;
  }
}
```

**Doğrulama:** `/app/scans/[id]` uzun bir raporda Tab'a 30 kez bas → odaklanan eleman **her zaman** tamamen görünür olmalı, header'ın altında kısmen bile gizlenmemeli. `#main` hedefine skip link ile atlandığında da başlık header altında kalmamalı.

---

### 5.62 — F-62: Ham hata sızıntısı · Merkezi hata sözlüğü · **P2**

`src/lib/errors/messages.ts` (yeni dosya) — `scans/new/page.tsx:362-405`'teki mevcut sözlük buraya taşınır ve genişletilir:

```ts
/**
 * API hata kodu → kullanıcı mesajı.
 *
 * KURAL: UI hiçbir yerde `body.message` veya `body.error` alanını doğrudan
 * ekrana basmaz. Sunucu metinleri iç detay (stack, hostname, Firestore
 * index URL'i) sızdırabilir ve `docs/microcopy.md` ton kurallarına uymaz.
 * Bilinmeyen kodlar için nötr bir fallback + destek referansı gösterilir.
 */

const SHARED: Record<string, string> = {
  unauthorized: "Please sign in again to continue.",
  forbidden: "Your workspace role doesn't allow this action.",
  workspace_not_found: "Set up a workspace before continuing.",
  no_workspace: "Set up a workspace before continuing.",
  rate_limited: "You're doing that too quickly. Try again in a minute.",
  firestore_index_unavailable:
    "Your data is temporarily unavailable while the database prepares an index. Try again in a few minutes.",
  firestore_quota_exceeded:
    "We've hit a database capacity limit. Your data is safe — try again shortly.",
  network: "We couldn't reach the server. Check your connection and try again.",
};

const SCAN: Record<string, string> = {
  invalid_url: "That URL is not valid.",
  scheme_blocked: "Only http:// and https:// URLs are supported.",
  private_ip: "That URL points to a private or internal address and can't be scanned.",
  loopback: "That URL points to a private or internal address and can't be scanned.",
  link_local: "That URL points to a private or internal address and can't be scanned.",
  metadata_address: "That URL points to a private or internal address and can't be scanned.",
  reserved_tld: "That domain uses a reserved TLD and can't be scanned.",
  daily_scan_limit: "You've reached your daily scan limit on this plan.",
  daily_free_capacity_reached: "Daily free scan capacity has been reached. Try again tomorrow.",
  scan_concurrency_limit: "A scan is already running. Wait for it to finish.",
  queue_unavailable: "The scan service is temporarily unavailable. Try again shortly.",
  scan_dispatch_not_configured: "The scan service is temporarily unavailable. Try again shortly.",
  manual_urls_required: "Add at least one manual URL.",
  manual_url_origin_mismatch: "Manual URLs must stay on the same domain as the website URL.",
  sitemap_origin_mismatch: "The sitemap URL must stay on the same domain as the website URL.",
  permission_not_confirmed: "Confirm you're authorised to scan this site before starting.",
  scan_timeout: "The scan exceeded its time budget. Try a smaller page limit.",
  poll_timeout: "We stopped checking for updates after 20 minutes. Reload this page or retry the scan.",
  bot_challenge_detected: "The site showed an anti-bot challenge, so we couldn't scan it.",
  navigation_failed: "The site refused our connection or returned an error.",
  browser_launch_failed: "Our scanner couldn't start a browser. Try again shortly.",
};

const AI: Record<string, string> = {
  ai_disabled: "AI processing is disabled for this workspace.",
  ai_processing_disabled: "AI processing is disabled for this workspace.",
  ai_unavailable: "AI isn't configured for this deployment. Contact your workspace administrator.",
  ai_rate_limited: "The AI provider is busy. Try again in a moment.",
  ai_content_too_large: "This finding is too large to explain automatically. Try a smaller snippet.",
};

const TEAM: Record<string, string> = {
  seat_limit_reached: "You've used every seat on this plan.",
  invite_exists: "There's already a pending invitation for that email address.",
  invite_expired: "That invitation has expired. Send a new one.",
  invalid_email: "Enter a valid email address.",
  role_not_allowed: "That role isn't available on your plan.",
};

const MONITOR: Record<string, string> = {
  monitor_limit_reached: "You've reached your plan's monitor limit.",
  monitor_exists: "You're already monitoring that URL.",
  frequency_not_allowed: "That check frequency isn't available on your plan.",
};

const BILLING: Record<string, string> = {
  checkout_unavailable: "Checkout isn't available right now. Try again shortly.",
  portal_unavailable: "The billing portal isn't available right now. Try again shortly.",
  plan_not_found: "That plan doesn't exist.",
  subscription_required: "Manage this change from the billing portal.",
};

function lookup(dict: Record<string, string>, code?: string | null): string | null {
  if (!code) return null;
  return dict[code] ?? SHARED[code] ?? null;
}

export const scanErrorMessage = (c?: string | null) => lookup(SCAN, c);
export const aiErrorMessage = (c?: string | null) => lookup(AI, c);
export const teamErrorMessage = (c?: string | null) => lookup(TEAM, c);
export const monitorErrorMessage = (c?: string | null) => lookup(MONITOR, c);
export const billingErrorMessage = (c?: string | null) => lookup(BILLING, c);
export const issueErrorMessage = (c?: string | null) => lookup(SHARED, c);

/** Hiçbir kod eşleşmediğinde gösterilecek nötr mesaj. */
export function fallbackMessage(ref?: string | null): string {
  return ref
    ? `Something went wrong on our side. Try again — if it keeps happening, quote reference ${ref}.`
    : "Something went wrong on our side. Try again in a moment.";
}
```

Çağrı deseni (her yerde aynı):

```tsx
      const body = await res.json().catch(() => ({}));
      setError(scanErrorMessage(body.error) ?? fallbackMessage(body.requestId));
```

**Asla:** `setError(body.message || body.error || "…")`.

**Regresyon koruması** — ESLint:
```js
{
  selector: "LogicalExpression[operator='||'] > MemberExpression[property.name='message'][object.name=/^(body|data)$/]",
  message: "Never render raw server error text. Map the error code through lib/errors/messages.ts.",
}
```

**`progress-client.tsx:534-541` `humanizeError` yeniden yazımı:**

```tsx
import { scanErrorMessage, fallbackMessage } from "@/lib/errors/messages";

function humanizeError(msg: string | null, code?: string | null): string {
  // Önce yapılandırılmış kod
  const mapped = scanErrorMessage(code);
  if (mapped) return mapped;
  // Sonra bilinen serbest metin desenleri
  if (!msg) return fallbackMessage();
  if (msg.startsWith("Redirect rejected")) return "The site redirected to a blocked address.";
  if (msg.includes("Navigation failed")) return "The site refused our connection or returned an error.";
  // Ham sunucu metnini ASLA basma
  return fallbackMessage();
}
```

Çağrı yeri: `humanizeError(state.errorMessage, state.errorCode)` — `errorCode` zaten view modelinde var (`progress.ts`, `:84`).

#### Nasıl doğrulanır

Test: `/api/scans` yanıtını `{ error: "totally_unknown_code", message: "Error: ECONNREFUSED 10.0.0.5:443" }` ile mock'la → ekranda **IP adresi görünmemeli**, "Something went wrong on our side." görünmeli.

```ts
test("raw server errors never reach the UI", async ({ page }) => {
  await page.route("**/api/scans", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "kaboom", message: "ECONNREFUSED 10.0.0.5:443" }),
    })
  );
  await page.goto("/app/scans/new");
  await page.getByRole("textbox", { name: /website url/i }).fill("https://example.com");
  await page.getByRole("checkbox", { name: /I confirm I own/i }).check();
  await page.getByRole("button", { name: /start scan/i }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).not.toContainText("ECONNREFUSED");
  await expect(alert).not.toContainText("10.0.0.5");
});
```

---

### 5.63 — Yama uygulama sırası

Yamalar birbirine bağımlı. Önerilen sıra:

```
1.  §7.3 token'lar (globals.css)          ← her şeyin temeli
2.  §5.7  useId (Checkbox/Switch)         ← hydration
3.  §5.1  LiveRegion + AnnouncerProvider  ← 8 yama buna dayanıyor
4.  §5.2  Dialog + ConfirmDialog          ← §5.29, §5.57 buna dayanıyor
5.  §5.18 skip link hedefleri             ← bağımsız, hızlı
6.  §5.17 error.tsx <main>                ← bağımsız, hızlı
7.  §5.11 radyo focus                     ← bağımsız
8.  §5.12 SegmentedRadio                  ← §5.4(B) buna dayanıyor
9.  §5.13 Tabs klavye                     ← §5.38 buna dayanıyor
10. §5.6  tablolar
11. §5.19 CardTitle as prop               ← geniş dokunuş, önce token'lar bitsin
12. §5.37 Field sarmalayıcısı             ← §5.43 buna dayanıyor
13. §5.3  filtre çipleri                  ← §5.28 buna dayanıyor
14. §5.8  optimistic issue actions
15. §5.20 useDismissable                  ← §5.33 buna dayanıyor
16. §5.33 mobil nav + etiket sözlüğü
17. §5.15 report builder RSC
18. §5.21 loading.tsx'ler
19. §5.62 hata sözlüğü                    ← §5.36, §5.29 buna dayanıyor
20. Geri kalanlar (§5.4, 5.5, 5.9, 5.10, 5.14, 5.22-27, 5.29-35, 5.39, 5.43, 5.47, 5.48, 5.51, 5.57, 5.60)
```

---

## 6. Ekran Bazlı Tasarım Spesifikasyonu

En kritik 8 ekran. Her spesifikasyon şu başlıkları içerir: **Mevcut yapı ve sorunlar · Önerilen bilgi hiyerarşisi · Durum matrisi (microcopy dâhil) · Klavye gezinme sırası · Ekran okuyucu deneyimi · Mobil davranış · Performans bütçesi.**

**Ortak sözleşmeler (8 ekranın tamamı için geçerli):**

| Konu | Kural |
|---|---|
| **Landmark yapısı** | `<header>` (TopNav, banner) · `<nav aria-label="Primary">` (SideNav) · `<main id="main" tabIndex={-1}>` · `<nav aria-label="Primary">` (MobileBottomNav) — ikisi aynı `aria-label`'a sahip **olmamalı**; SideNav `"Primary navigation"`, MobileBottomNav `"Primary"` şu an çakışıyor gibi görünüyor ama farklı; yine de netleştirilmeli: SideNav = `"Main"`, MobileBottomNav = `"Main (mobile)"` |
| **Heading haritası** | Her ekranda tam **bir** `<h1>`; bölüm başlıkları `<h2>`; kart içi başlıklar `<h3>` (§5.19) |
| **İlk Tab durağı** | Skip link → sonra sayfa içeriği (chrome değil, çünkü skip link atlıyor) |
| **Canlı bölge** | Layout seviyesinde tek `AnnouncerProvider` (§5.1.3); ekranlar `announce()` çağırır |
| **Boş/hata microcopy tonu** | `docs/microcopy.md:74-85` — calm, direct, first-person where action required, specific |
| **Disclaimer bütçesi** | **Ekran başına en fazla 1 birincil disclaimer** + Compliance Center linki (F-45) |
| **Performans varsayılanı** | Veri sunucuda; client island yalnız gerçek etkileşim için; `loading.tsx` gerçek düzeni taklit eder |

---

### 6.1 `/app` — Dashboard

**Dosya:** `src/app/app/page.tsx` (RSC, `force-dynamic:19`)

#### Mevcut yapı ve sorunlar

```
┌─ Greeting (h1) + workspace kicker ──────────────── [Build report] [New scan]
├─ Latest scan kartı (ScanScoreRing + Badge + link)  │  4× KpiCard
│                                                    │  Open findings (5 satır)
├─ AI summary (AiSuggestionBlock)                    │  Compliance risk overview
└─ Recent scans tablosu (5 satır)
```

| Sorun | Kanıt |
|---|---|
| Seri veri çekimi, `listIssues` tüm bulguları çekiyor | `:24,27,41` (F-27) |
| Başlık atlaması h1 → h3 | `:54` sonra `Card.tsx:27` (F-19) |
| Boş `<th>` | `:222` (F-46) |
| "View" linkleri ayırt edilemez | `:252` (WCAG 2.4.4) |
| Boş durumda header'da yine "New scan" var → çift CTA | `:72` + `:91` |
| **Bilgi hiyerarşisi tersine dönmüş:** en üstte "hoş geldin", sonra skor, sonra KPI — kullanıcının cevabını aradığı "şimdi ne yapmalıyım?" sorusu hiçbir yerde yok | Tüm sayfa |
| Yardım/dokümantasyon girişi yok | F-54 |
| `AiSuggestionBlock` içeriği AI ile üretilmiş değil, **şablon metin** (`:176`) — "AI summary" başlığı yanıltıcı | `:173-179` |

#### Önerilen bilgi hiyerarşisi

Kullanıcının dashboard'a gelme nedeni üç sorudan biridir: (1) *Son tarama ne gösterdi?* (2) *Şimdi ne yapmalıyım?* (3) *Yeni bir tarama başlatmalıyım.* Mevcut düzen (1)'i veriyor, (3)'ü veriyor, **(2)'yi hiç vermiyor.**

```
1. [h1] Greeting + workspace                     ← küçült; kicker satırına indir
2. [ÖNCE] "Next action" şeridi                   ← YENİ, en üstte
     · Tarama yoksa      → "Run your first scan"
     · Kritik bulgu varsa → "12 critical findings need attention" → rapora link
     · Hepsi kapandıysa   → "No open critical findings. Consider a re-scan."
3. Latest scan özeti (skor + KPI'lar tek satırda)
4. Top open findings (5) — ZATEN VAR, yukarı taşı
5. Recent scans tablosu
6. Compliance risk overview                       ← aşağı taşı (referans bilgi, aksiyon değil)
7. [KALDIR] "AI summary" şablon metni             ← gerçek AI özeti gelene kadar
```

**Kaldırılacaklar:**
- `:173-179` `AiSuggestionBlock` — içerik şablon; "AI" etiketi altında şablon metin göstermek `docs/microcopy.md` dürüstlük ilkesine aykırı. AI özeti gerçekten üretildiğinde (`/api/ai-assistant` veya scan sonrası batch) geri gelmeli.
- Boş durumda header'daki "New scan" butonu (`:72-77`) — `{latest && …}` koşuluna alınmalı.

**Eklenecekler:**
- SideNav footer'ına kalıcı "Help & docs" linki (F-54, WCAG 3.2.6 hazırlığı).
- Workspace setup tamamlanmadıysa (`companyName`/`framework` boş) "Finish setting up" kartı — §10.2'deki kısaltılmış onboarding akışının karşılığı.

#### Durum matrisi

| Durum | Görünüm | Microcopy |
|---|---|---|
| **Loading** | `app/app/loading.tsx` — greeting bloğu (h-7 + h-4), 3 kart grid'i (h-28), 2 geniş blok (h-80) | `sr-only role="status"`: "Loading dashboard" |
| **Empty (tarama yok)** | `EmptyState` icon=`ScanLine`, header CTA gizli | **Başlık:** "No scans yet" · **Açıklama:** "Run your first scan to see findings, plain-language explanations, and a remediation plan. A single page usually takes under a minute." · **CTA:** "Start a scan" |
| **Empty (tarama var, bulgu yok)** | Skor kartı + yeşil rozet + manuel inceleme yönlendirmesi | "Automated checks found nothing on this scan. That's a good sign — but automated tools catch roughly 30–50% of issues. Work through the manual checklist to be sure." + "Open manual checklist" |
| **Error (Firestore quota)** | `AppServiceUnavailable` (layout seviyesinde) | Mevcut metin iyi ✅. `error.digest` referansı eklenmeli (§5.17) |
| **Error (kısmi — özet yüklenemedi)** | Skor kartı yerine `AlertCallout tone="warning"` | "We couldn't load the score for this scan. The findings below are still accurate." |
| **Partial (tarama devam ediyor)** | Latest scan kartında `Badge tone="info"` + pulse + "View scan progress" | "Scan in progress — {n} of {total} pages." |
| **Kısıtlı plan (free, günlük limit dolu)** | "Next action" şeridi yerine plan uyarısı | "You've used today's free scan. Your limit resets at midnight UTC, or [see plans] to scan more." |

#### Klavye gezinme sırası

```
 1. Skip to main content
 2. [SideNav] percevia home
 3. [SideNav] New scan
 4. [SideNav] Dashboard … Reports (6)
 5. [SideNav] Team & Roles … Settings (4)
 6. [SideNav] Plans & pricing / Help & docs
 7. [TopNav] Workspace name (rename)
 8. [TopNav] Notifications
 9. [TopNav] Account menu
10. ── main ──
11. "Next action" şeridi CTA
12. Build report
13. New scan
14. Latest scan → "Open scan results"
15. Open findings listesi (5 link)
16. Recent scans tablosu → 5× "View"
17. Compliance risk overview → "Read the full statement"
```

**Not:** Skip link kullanıcıyı doğrudan 10'a atlatıyor — 2-9 arası her sayfada tekrarlanan 12 durak, skip link olmadan her navigasyonda tekrar geçilmek zorunda kalırdı. Bu, WCAG 2.4.1'in *neden* kritik olduğunun somut örneği.

#### Ekran okuyucu deneyimi

**Landmark rotoru (`VO+U` → Landmarks):**
```
banner            (TopNav)
navigation "Main" (SideNav)
main
navigation "Main (mobile)"  ← yalnız <lg
contentinfo       ← YOK; eklenebilir
```

**Heading rotoru:**
```
h1  Good morning, Efe
h2  Next action
h2  Latest scan
h2  Open findings (12)
h2  Recent scans
h2  Compliance risk overview
```

**Duyurular:** Dashboard statiktir; canlı bölge kullanmaz. Tek istisna: workspace adı yeniden adlandırıldığında `announce("Workspace renamed to X.")` (§5.1.3).

**Tablo deneyimi:** "Recent scans, table, 5 rows, 5 columns. URL, Pages, Status, When, Actions." Her satırda `<th scope="row">` olmadığı için satır bağlamı zayıf — URL sütununu `<th scope="row">` yapmak iyileştirir.

#### Mobil davranış (375px)

| Bölüm | Davranış |
|---|---|
| Header | Greeting `text-2xl`, CTA'lar alt satıra (`flex-col sm:flex-row` ✅ mevcut) |
| KPI kartları | `grid-cols-2` ✅ mevcut (`:141`) |
| Latest scan | `ScanScoreRing size="lg"` (96px?) + metin yan yana → 320px'de sıkışık. `flex-col sm:flex-row` olmalı |
| Recent scans tablosu | `overflow-x-auto` ✅ ama 5 sütun 320px'de kaydırma gerektiriyor. **Öneri:** `<lg` altında tabloyu kart listesine çevir (URL + durum rozeti + zaman + tam satır link) |
| Compliance overview | Tam genişlik ✅ |
| Alt boşluk | `main` `pb-20` ✅ (`layout.tsx:33`) — bottom nav'ı telafi ediyor |

#### Performans bütçesi

| Veri | Nerede | Ne zaman |
|---|---|---|
| `listScans(workspaceId, 5)` | Server, blocking | İlk render (H1 + Recent scans için gerekli) |
| `getScanSummary` | Server, `Promise.all` ile paralel | İlk render (skor + KPI) |
| `listIssues(…, {limit: 5})` | Server, `Promise.all` ile paralel | İlk render |
| `NotificationsBell` verisi | Client, mount sonrası | Kritik yol dışında ✅ |
| **Streaming** | `<Suspense>` `Recent scans` etrafında | Skor kartı hemen gelsin, tablo gecikirse geciksin |

```tsx
      <Suspense fallback={<RecentScansSkeleton />}>
        <RecentScansCard workspaceId={ctx.workspace.id} />
      </Suspense>
```

**Client bundle:** Dashboard'da `"use client"` **yok** ✅ — yalnız layout chrome (SideNav/TopNav/Bell/BottomNav/Prefetcher) client. Bu iyi; `AiSuggestionBlock` kaldırıldığında değişmez (zaten server).

**Hedef (ölçülmedi, bütçe olarak konuyor):** TTFB < 400 ms · LCP elemanı = `<h1>` (metin, hızlı) · CLS = 0 (iskelet boyutları eşleşmeli).

---

### 6.2 `/app/scans/new` — Yeni tarama

**Dosya:** `src/app/app/scans/new/page.tsx` (**tüm sayfa `"use client"`**)

#### Mevcut yapı ve sorunlar

```
Header (h1 + açıklama)
Card "What to scan"     : URL · Scan type (4 radyo kart) · [Sitemap URL] · [Manual URLs] · Max pages
Card "AI & capture"     : 2 Switch + screenshot notice
AlertCallout            : Privacy notice           ┐
Card                    : Permission checkbox      │  4 disclaimer
Card "Estimated scope"  : 4 ScopeStat + açıklama   │
NoGuaranteeBanner       : compact                  ┘
[AlertCallout error]
[Cancel] ─────────────────────────────────── [Start scan]
```

| Sorun | Kanıt |
|---|---|
| Tüm sayfa client → `estimateScanPlan`, `SCAN_INTERACTIVE_STATES` bundle'a giriyor | `:1,15-18` |
| Radyo focus görünmez | `:167` (F-11) |
| Plan cap uyumsuzluğu | `:223,228` (F-43) |
| 4 disclaimer yığılması | `:263,270,276,306` (F-45) |
| AI toggle workspace consent'ini bilmiyor → geç hata | `:242-247` |
| `FieldHint` bağlanmamış | `:145,193,211,227` (F-37) |
| Sayfa başlığı `metadata` yok (client page) | Dosyada `metadata` export'u yok → WCAG 2.4.2 için layout başlığına düşüyor |
| Submit butonu `Button` bileşeni değil, elle yazılmış | `:318-337` (F-32 ailesinden) |

#### Önerilen bilgi hiyerarşisi

Bu ekranın işi **tek bir karar** aldırmak: *neyi tara?* Diğer her şey ikincildir.

```
1. [h1] Start a scan
2. URL alanı — TEK BAŞINA, büyük, odaklanmış (autofocus)
3. Scan type (4 kart) — varsayılan "Single page" seçili
4. [DETAY, <details> içinde] Advanced: max pages, sitemap URL, manual URLs
5. [DETAY, <details> içinde] AI & capture options
6. Estimated scope — canlı güncellenir, KÜÇÜK (inline şerit, kart değil)
7. Permission checkbox — TEK zorunlu onay
8. [Start scan]
9. [TEK disclaimer] "Automated scanning finds part of the picture — see what we can and can't detect."  → /legal/accessibility-methodology
```

**Neden `<details>`:** İlk kullanıcı 4 karar yerine 2 karar verir (URL + tip). İleri kullanıcı bir tıkla hepsine ulaşır. TTFV'de ~4 etkileşim tasarrufu (§10.2).

**Disclaimer konsolidasyonu (F-45):** 4 blok → 1 blok + 1 checkbox:

| Kaldırılan | Nereye taşındı |
|---|---|
| `COMPLIANCE_COPY.SCREENSHOT_NOTICE` (`:264`) | Screenshot Switch'in `description`'ına (zaten orada bir versiyonu var, `:261`) |
| `AlertCallout` "Privacy notice" (`:270`) | Permission checkbox'ının `description`'ına: "Don't scan private dashboards or pages with sensitive personal data." |
| `NoGuaranteeBanner variant="compact"` (`:306`) | Kalıyor — **birincil disclaimer bu** |
| `ScopeStat` altındaki uzun açıklama (`:298-302`) | `<details><summary>How we calculate this</summary>` içine |

#### Durum matrisi

| Durum | Görünüm | Microcopy |
|---|---|---|
| **Initial** | URL boş, "Single page" seçili, max pages = plan cap ile sınırlı, Start disabled | Submit butonu: "Start scan" (disabled). Yanında `aria-live` ipucu yok — `aria-disabled` + form doğrulaması yeterli |
| **URL geçersiz (blur)** | `aria-invalid` + `FieldError` | "That doesn't look like a full URL. Include https:// — for example https://example.com." |
| **URL private/internal** | `FieldError` | "That's a private or internal address. Percevia can only scan publicly reachable URLs." |
| **Consent verilmemiş** | Start disabled | Checkbox etiketi `COMPLIANCE_COPY.SCAN_PERMISSION` ✅ mevcut |
| **Submitting** | Buton spinner + disabled, tüm form `<fieldset disabled>` | "Starting scan…" |
| **Error — plan limiti** | `AlertCallout tone="warning" live` | "You've used today's free scan. Your limit resets at midnight UTC. [See plans] to scan more." |
| **Error — eşzamanlılık** | `AlertCallout tone="info" live` | "A scan is already running. [View it] or wait for it to finish." + çalışan taramaya link |
| **Error — ağ/sunucu** | `AlertCallout tone="danger" live` | §5.62 fallback: "Something went wrong on our side. Try again — if it keeps happening, quote reference {id}." |
| **AI consent yok** | Toggle disabled + açıklama | "Your workspace hasn't enabled AI processing yet. [Enable it in the Privacy & Compliance Center] — an admin approves it once for the whole workspace." |
| **Visual evidence consent yok** | Screenshot toggle disabled | "Workspace admins must allow diagnostic visual evidence before screenshots can be captured." |

#### Klavye gezinme sırası

```
── main ──
 1. Website URL  (autofocus)
 2. Scan type radiogroup (TEK durak; ok tuşlarıyla 4 kart)
 3. <details> "Advanced options"  (summary)
 4.   [açıksa] Max pages
 5.   [açıksa] Sitemap URL  (tip=sitemap ise)
 6.   [açıksa] Manual URLs  (tip=manual ise)
 7. <details> "AI & capture options"  (summary)
 8.   [açıksa] AI switch
 9.   [açıksa] Screenshots switch
10. Permission checkbox
11. Cancel (link)
12. Start scan (submit)
```

**Kritik:** Şu an radyo kartları 4 ayrı Tab durağı **değil** (native radiogroup) ✅, ama focus görünmüyor (F-11).

#### Ekran okuyucu deneyimi

**Form giriş duyurusu:** `<form>` üzerinde `aria-labelledby` ile `<h1>`'e bağla → "Start a scan, form".

**Alan duyuruları (§5.37 sonrası):**
```
"Website URL, required, edit text. Public URL with https:// scheme. We block private and internal addresses."
"Scan type, Single page, radio button, 1 of 4, selected. Scan one URL."
"Advanced options, disclosure triangle, collapsed."
"I confirm I own this website or have permission to scan it and capture diagnostic accessibility evidence, checkbox, unchecked. Don't scan private dashboards or pages with sensitive personal data."
"Start scan, button, dimmed."   ← consent verilmeden
```

**Estimated scope canlı güncelleme:** Max pages değiştirildiğinde tahmin değişiyor. Bu bir status message'dır → `aria-live="polite"` gerekir ama **throttled** (§5.1):

```tsx
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Estimated scope: {estimatedPages} pages, {totalPasses} analysis passes, about {estLabel}.
      </p>
```

#### Mobil davranış

| Bölüm | Davranış |
|---|---|
| Scan type grid | `grid-cols-2` → 320px'de kartlar dar; `grid-cols-1 sm:grid-cols-2` olmalı |
| ScopeStat | `grid-cols-2 sm:grid-cols-4` ✅ mevcut |
| Submit barı | **Sticky bottom** olmalı: uzun formda kullanıcı butonu göremiyor. `sticky bottom-[calc(56px+env(safe-area-inset-bottom))] bg-paper/95 backdrop-blur border-t border-line -mx-4 px-4 py-3` |
| Klavye açıkken | `inputMode="url"` URL alanında, `inputMode="numeric"` max pages'te |

#### Performans bütçesi

**En büyük kazanç: sayfayı RSC'ye böl.**

```
src/app/app/scans/new/
├── page.tsx           (RSC)  — plan, cap, consent durumlarını server'dan çeker
├── new-scan-form.tsx  ("use client") — sadece form state
└── loading.tsx
```

Kazanç: `estimateScanPlan` (`lib/scanner/estimate`) ve `SCAN_INTERACTIVE_STATES` (`lib/scanner/types`) client bundle'dan çıkar. `estimateScanPlan` saf bir fonksiyon — **client'ta kalması gerekiyor** (canlı tahmin için) ama `SCAN_INTERACTIVE_STATES.length` sabit bir sayı olarak prop geçilebilir.

| Veri | Nerede |
|---|---|
| `ctx.workspace.plan`, plan cap'leri | Server (`entitlements.ts`) |
| `ctx.privacy.aiProcessingEnabled`, `visualEvidenceEnabled` | Server |
| Form state, `estimateScanPlan` | Client |
| `POST /api/scans` | Client (submit) |

---

### 6.3 `/app/scans/[id]/progress` — Tarama ilerlemesi

**Dosya:** `progress/page.tsx` (RSC) → `progress-client.tsx` (client)

Bu, **projedeki en iyi kurgulanmış ekran**: realtime + polling fallback, temiz cleanup, stale-heartbeat tespiti, retry kontrolü. Sorunlar davranışsal değil, duyusal.

#### Mevcut yapı ve sorunlar

| Sorun | Kanıt |
|---|---|
| Ekran okuyucuya **hiçbir şey** duyurulmuyor | Tüm dosya (F-01) |
| 5 sn saat sonsuz tikliyor | `:105-108` (F-24) |
| Polling'de backoff/jitter/visibility yok | `:122-146` (F-23) |
| Tamamlanmada tekrarlı `router.replace` | `:161` (F-25) |
| "Queued" etiketi `text-ink-400` = 3.08:1 | `:346` (F-59) |
| Tahmini kalan süre gösterilmiyor — kullanıcı ne kadar bekleyeceğini bilmiyor | `estimateScanPlan` New Scan'de hesaplanıyor ama buraya taşınmıyor |
| Adım listesi `<ol>` ama `aria-busy` yok | `:297` |

#### Önerilen bilgi hiyerarşisi

Bekleme ekranının tek işi: **"ne kadar sürecek ve ne oluyor?"**

```
1. [h1] Scanning {host}
2. Durum rozeti + tahmini kalan süre       ← "Scan running · about 40 seconds left"
3. İlerleme özeti (sayfa X/Y)              ← şu an adım listesinin ALTINDA, YUKARI taşı
4. 6 adımlık zaman çizelgesi
5. [Koşullu] Uyarılar (queued / stale heartbeat / failed)
6. "What we're capturing" + NoGuaranteeBanner   ← ikisi yan yana, iyi ✅
7. [Back to dashboard] ─── [View results]
8. "You can leave this page…"              ✅ mükemmel microcopy, kalıyor
```

**Tahmini kalan süre:** `estimateScanPlan` sonucu `ScanJob` dokümanına yazılabilir (`estimatedDurationMs`), veya client'ta `pagesDone/pagesTotal` + geçen süreden lineer tahmin:

```tsx
  const etaLabel = useMemo(() => {
    if (state.status !== "running" || !state.pagesDone || !state.pagesTotal) return null;
    const elapsed = nowMs - startedAtMs;
    const perPage = elapsed / state.pagesDone;
    const remaining = Math.max(0, (state.pagesTotal - state.pagesDone) * perPage);
    if (remaining < 15_000) return "less than 15 seconds";
    if (remaining < 90_000) return `about ${Math.round(remaining / 15_000) * 15} seconds`;
    return `about ${Math.round(remaining / 60_000)} minute${remaining >= 120_000 ? "s" : ""}`;
  }, [state.status, state.pagesDone, state.pagesTotal, nowMs, startedAtMs]);
```

Ekranda: *"Scan running · about 45 seconds left"* — ve **tahmin olduğu belli edilmeli**: `title`/hint olarak "Estimated from pages completed so far."

#### Durum matrisi

| Durum | Görünüm | Microcopy |
|---|---|---|
| **Queued** | Badge "Queued" (mavi, pulse) + `AlertCallout tone="info"` | ✅ Mevcut metin iyi (`:272-275`). Ek: "Most scans start within 10 seconds." |
| **Running** | Badge "Scan running" + ETA + adım listesi `aria-busy` | "Scanning pages · {done} of {total} · about {eta} left" |
| **Running + heartbeat stale** | `AlertCallout tone="warning"` + Retry | ✅ Mevcut metin çok iyi (`:279-284`) — dürüst, açıklayıcı, aksiyon sunuyor |
| **Completed** | Badge yeşil + otomatik yönlendirme | "Scan complete. Opening results…" (duyurulur, sonra `router.replace`) |
| **Failed** | Badge kırmızı + `AlertCallout tone="danger"` + Retry + "Start a new scan" | §5.62 sözlüğünden mesaj. **Asla ham metin** |
| **Failed — bot challenge** | Aynı + ek açıklama | "The site showed an anti-bot challenge (like Cloudflare), so we couldn't scan it. Try a page that doesn't sit behind the challenge, or ask the site owner to allowlist our scanner." |
| **Failed — timeout** | Aynı | "The scan exceeded its time budget. Try a smaller page limit, or scan a single page first." |
| **Poll timeout (20 dk)** | `AlertCallout tone="warning"` | "We stopped checking for updates after 20 minutes. The scan may still be running — reload this page, or start over." |
| **Error — tarama bulunamadı** | `notFound()` (server) | Next.js 404 |

#### Klavye gezinme sırası

```
── main ──
 1. [Failed/stale ise] Retry scan
 2. [Failed/stale ise] Start a new scan
 3. Back to dashboard
 4. [Completed ise] View results
```

Sadece 2-4 durak — bu doğru. Bekleme ekranında etkileşim minimum olmalı.

**Kritik detay:** Tarama tamamlandığında `router.replace` yapılıyor. Bu, **odağı kaybettirir** — kullanıcı yeni sayfaya gelir ama focus `<body>`'dedir. Düzeltme: yönlendirme yerine `<Link>` göstermek (kullanıcı kontrolü) **veya** hedef sayfada `<main tabIndex={-1}>`'e focus taşımak.

```tsx
    function goToResults() {
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;
      announce("Scan complete. Opening results.");
      // Duyurunun okunması için kısa gecikme, sonra yönlendir.
      setTimeout(() => router.replace(`/app/scans/${initial.id}`), 1200);
    }
```

> **Alternatif ve daha iyi:** Otomatik yönlendirmeyi tamamen kaldır, "View results" butonunu belirginleştir ve duyur. WCAG 3.2.5 (AAA) Change on Request bunu ister; AA'da zorunlu değil ama ekran okuyucu deneyimi için belirgin şekilde daha iyi. **Öneri: kullanıcı tercihi yap** — "Take me to results automatically" checkbox'ı, localStorage'da sakla.

#### Ekran okuyucu deneyimi

§5.1'deki `LiveRegion` uygulandıktan sonra beklenen duyuru dizisi:

```
[sayfa yüklenir]  "Scanning example.com, heading level 1"
[+0s]             "Scan queued. Waiting for a scanner worker."
[+8s]             "Preparing scanner. 0 of 3 pages processed."
[+14s]            "Scanning pages. 1 of 3 pages processed."
[+22s]            "Scanning pages. 2 of 3 pages processed."
[+31s]            "Saving results. 3 of 3 pages processed."
[+34s]            "Scan complete. Opening results."
```

Adım listesi rotorda: "Scan progress steps, list, 6 items. Queued, Done. Preparing scanner, Done. Scanning pages, In progress. …"

**"What we're capturing" listesi:** `DataItem` (`:429-455`) ikonları `aria-hidden`; durum yalnızca renkle iletiliyor (`bg-green-50` vs `bg-canvas-2`). Ekran okuyucu "Screenshots · Off" duyar ✅ (hint metni var) ama `on` durumunda hint yok → "Page HTML structure (no form values)" — açık/kapalı belli değil. Düzeltme:

```tsx
      <span className="sr-only">{on ? "Captured: " : "Not captured: "}</span>
      <span className="text-ink-700">{label}</span>
```

#### Mobil davranış

`max-w-3xl` ✅ tek sütun. Adım listesindeki üçlü satır (ikon · metin · durum etiketi) 320px'de sıkışıyor:

```tsx
                <li className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                  …
                  <span className="w-full sm:w-auto sm:shrink-0 pl-12 sm:pl-0 text-[0.6875rem] …">
```

Durum etiketi mobilde metnin altına düşer.

#### Performans bütçesi

| Veri | Nerede | Ne zaman |
|---|---|---|
| `getScanJob` ilk durum | Server (`progress/page.tsx`) | İlk render — **kritik**: kullanıcı boş ekran görmemeli |
| Canlı güncelleme | Client `onSnapshot` (Firestore) | Bağlantı kurulunca |
| Fallback | Client HTTP polling | `onSnapshot` başarısızsa |
| Firebase SDK | Client bundle | ⚠️ `firebase/firestore` + `firebase/auth` ~90 kB gzip. **Yalnız bu rotada** yükleniyor mu kontrol edilmeli — `firebaseClientFirestore()` dinamik import ile geciktirilebilir |

```tsx
// Firebase'i yalnız gerçekten realtime'a geçerken yükle
async function startRealtime() {
  const [{ doc, onSnapshot }, { firebaseClientFirestore }] = await Promise.all([
    import("firebase/firestore"),
    import("@/lib/firebase/client"),
  ]);
  …
}
```

Bu, ilk boyamayı hızlandırır: polling zaten fallback olarak var, realtime birkaç yüz ms geç başlasa sorun değil.

**Re-render bütçesi:** 5 sn'lik saat + her snapshot = ~15 render/dakika. `STEPS.map` her seferinde 6 `<li>` + ikon hesaplıyor. `useMemo` ile `currentStepIdx` (§5.23e) ve `React.memo` ile adım satırı — ölçülmeden yapılmamalı, ama tarama bittiğinde saatin durması (F-24) tek başına yeterli olabilir.

---

### 6.4 `/app/scans/[id]` — Tarama raporu

**Dosya:** `src/app/app/scans/[id]/page.tsx` (RSC, 705 satır)

Bu, ürünün **değer teslim ekranı**. Kullanıcı buraya para ödüyor.

#### Mevcut yapı ve sorunlar

```
[← Dashboard] ──────── [Compare] [Monitor] [Export issues] [ScanReportActions]
FailedPagesNotice
┌ Skor kartı: ScanScoreRing · host + meta · 4× SeverityStat ──────────┐
│ [Fallback uyarısı]                                                   │
└──────────────────────────────────────────────────────────────────────┘
┌ Ana sütun ──────────────────────────┬ Aside ────────────┐
│ AiSuggestionBlock "What this tells"  │ HumanReviewBanner │
│ Filtre çipleri (severity)  ← ÖLÜ     │ ManualReviewChk   │
│ Filtre çipleri (viewport)  ← ÖLÜ     │ NoGuaranteeBanner │
│ "Top priority fixes" (5)   ← ÖLÜ METİN│ Scan profile     │
│ IssueGroupSection × N                │ Pages scanned     │
└──────────────────────────────────────┴───────────────────┘
```

| Sorun | Kanıt |
|---|---|
| Filtreler çalışmıyor | `:265-286`, `:458-500` (F-03) |
| "Top priority fixes" tıklanamaz — en değerli liste ölü metin | `:298-313` |
| Tüm bulgular render ediliyor | `:318-349` (F-28) |
| Aside'da 3 disclaimer üst üste | `:352-355` + `:388-391` (F-45) |
| `metadata` statik — her rapor "Scan results — Percevia AI" | `:30` (WCAG 2.4.2 zayıf) |
| Inline `style` ile CSS değişkeni → high-contrast modunda kırılabilir | `:479-491` |
| `text-ink-800` ölü token | `:619` (F-30) |
| Sayfa listesi `<ul>` ama `<ol>` olmalı / URL'ler kısaltılmamış | `:403-410` |
| "Export issues" bir `<Link>` — indirme mi navigasyon mu belli değil | `:160-165` |

#### Önerilen bilgi hiyerarşisi

Kullanıcının sırasıyla sorduğu sorular:
1. *Ne kadar kötü?* → skor + şiddet dağılımı
2. *En önce neyi düzeltmeliyim?* → **Top priority fixes** (şu an ölü)
3. *Detaylar neler?* → gruplu bulgu listesi
4. *Bu rapora güvenebilir miyim?* → kapsam + sınırlar

```
1. [h1] {host} — accessibility scan          ← şu an h1 sadece host; bağlam ekle
2. Skor + şiddet dağılımı + tarih/sayfa sayısı
3. [ÖNCELİKLİ] "Fix these first" — 5 root cause, HER BİRİ TIKLANABİLİR
     → anchor ile ilgili IssueGroupSection'a atlar VE onu açar
4. Filtreler (çalışan)
5. Filtre sonucu duyurusu ("Showing 12 of 47 findings")
6. Gruplu bulgu listesi (sayfalanmış)
7. [Aside] Scope & limits — TEK birleşik kart:
     · Ne tarandı (sayfa listesi, viewport'lar, engine)
     · Ne taranmadı (manuel kontrol gerektirenler)
     · TEK disclaimer + Compliance Center linki
     · Manual review checklist CTA
```

**"Top priority fixes" düzeltmesi** (`:298-313`) — en yüksek etkili tek değişiklik:

```tsx
                <ol className="space-y-1">
                  {topFixes.map((g, idx) => (
                    <li key={g.id}>
                      <a
                        href={`#group-${g.id}`}
                        className="flex items-start gap-3 text-sm rounded-md p-2 -mx-2 hover:bg-canvas-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                      >
                        <span className="mt-0.5 size-5 shrink-0 rounded-full bg-navy-900 text-paper text-[0.6875rem] font-semibold grid place-items-center tabular-nums" aria-hidden>
                          {idx + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="font-medium text-ink-900">{g.title}</span>
                          <span className="ml-2 text-[0.6875rem] text-ink-600 tabular-nums">
                            {g.affectedCount} instance{g.affectedCount === 1 ? "" : "s"}
                          </span>
                          <span className="block text-[0.6875rem] text-ink-600 font-mono">{g.ruleId}</span>
                        </span>
                        <ChevronRight className="size-4 text-ink-600 shrink-0 mt-1" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ol>
```

`IssueGroupSection`'a `id={`group-${group.id}`}` verilir. `<details>` versiyonunda (§5.28) tarayıcı, `#group-x` hedefine atlandığında kapalı `<details>`'i **otomatik açar** (Chrome 120+, Safari 17+) — sıfır JS ile çalışan bir "aç ve kaydır" davranışı.

#### Durum matrisi

| Durum | Görünüm | Microcopy |
|---|---|---|
| **Loading** | `scans/[id]/loading.tsx` (§5.21) | `sr-only`: "Loading scan results" |
| **Empty (bulgu yok)** | Yeşil skor kartı + `EmptyState tone="success"` | **Başlık:** "No automated findings" · **Açıklama:** "Automated checks didn't flag anything on these {n} page(s). That's a genuinely good result — and it isn't the whole picture. Automated tools detect roughly 30–50% of accessibility barriers." · **CTA:** "Open the manual review checklist" |
| **Empty (filtre sonucu boş)** | `EmptyState icon={Filter}` (§5.3) | "No findings match these filters. Try a different severity, or [clear filters]." |
| **Partial (bazı sayfalar başarısız)** | `FailedPagesNotice` üstte | ✅ mevcut bileşen; `AlertCallout tone="warning"`'a taşınmalı (F-32) |
| **Partial (fallback mode)** | `AlertCallout tone="warning"` skor kartının içinde | ✅ mevcut metin iyi (`:177-183`); `fallbackDetail()` çok iyi bir microcopy örneği |
| **Error (scan yok)** | `notFound()` | Next.js 404 |
| **Error (tamamlanmamış)** | `redirect(/progress)` ✅ | — |
| **Kısıtlı plan (500+ bulgu, free)** | Sayfalama + üst uyarı | "Showing the first 100 findings. [Export all as CSV] or [see plans] for full in-app browsing." |
| **Çok büyük rapor** | Sayfalama şeridi | "47 root causes across 312 findings · Page 1 of 3" |

#### Klavye gezinme sırası

```
── main ──
 1. ← Dashboard
 2. Compare
 3. Monitor this site
 4. Export issues
 5. [ScanReportActions] Build report / Share link
 6. [Fallback uyarısı varsa] uyarı içi link
 7. Fix these first → 5 anchor link
 8. Severity filtreleri → 6 link
 9. Viewport filtreleri → 5 link
10. "Clear filters" (filtre aktifse)
11. IssueGroupSection × N  (her biri 1 summary durağı)
12.   [açık grup] IssueCard × M  (her biri 1 link)
13.   [açık grup] "Export all N as CSV"
14. Sayfalama: Previous / Next
15. [Aside] Manual review checklist CTA
16. [Aside] Compliance Center linki
17. [Aside] Pages scanned listesi (link değil, atlanır)
```

**Sorun:** 1-5 arası 5 durak, kullanıcının aradığı içerikten önce. Mobilde bu daha da kötü. **Öneri:** aksiyon barını `<h1>`'in **altına** taşı, veya bir "Actions" `<details>` altında topla.

#### Ekran okuyucu deneyimi

**Sayfa başlığı (WCAG 2.4.2):** `generateMetadata` ekle:

```tsx
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentWorkspaceOrRedirect();
  const scan = await getScanJob(ctx.workspace.id, id);
  if (!scan) return { title: "Scan not found — Percevia AI" };
  return { title: `${hostFromUrl(scan.baseUrl)} scan results — Percevia AI` };
}
```

Bu, tarayıcı sekmesinde ve ekran okuyucunun sayfa duyurusunda büyük fark yaratır — 5 rapor açık olan bir kullanıcı hangisinin hangisi olduğunu görebilir.

**Heading haritası (§5.19 sonrası):**
```
h1  example.com — accessibility scan
h2  Fix these first
h2  Findings
h3    Buttons must have discernible text      (grup 1)
h3    Elements must meet contrast ratio       (grup 2)
h2  Scope and limits
h3    What we scanned
h3    Manual review checklist
```

**Skor duyurusu:** `ScanScoreRing.tsx:28-29` `role="img"` + `aria-label` ✅. Etiket "Accessibility score 72 out of 100" gibi olmalı ve **skorun ne anlama geldiğini** de içermeli: "Risk score 72 of 100. Lower is better." — `docs/microcopy.md` "never labeled compliance score" kuralına uygun.

**`SeverityStat` (`:437-456`):** 4 kutu, her biri sayı + etiket. Ekran okuyucuda "5 critical, 12 serious, 8 moderate, 3 minor" olarak okunur ✅. Ancak bunlar filtreye bağlanmalı — tıklanabilir olmaları hem görsel hem SR kullanıcısı için hızlandırıcı olur:

```tsx
<Link href={buildHref({ sev: severity })} className="…">
```

#### Mobil davranış

| Bölüm | Davranış |
|---|---|
| Aksiyon barı | `flex-wrap` ✅ ama 5 buton 320px'de 3 satır. **Öneri:** birincil ("Build report") görünür, geri kalanı `<details>` "More actions" |
| Skor kartı | `lg:grid-cols-[auto_1fr_auto]` → mobilde dikey ✅ |
| `SeverityStat` satırı | `flex gap-2` ile 4 kutu 320px'de her biri ~70px → sayı okunuyor ama etiket (`uppercase tracking-wider`) kırpılıyor. **Düzeltme:** `grid grid-cols-2 gap-2 lg:flex lg:flex-col` |
| Filtre çipleri | `flex-wrap` ✅; 11 çip mobilde 4 satır. **Öneri:** yatay kaydırmalı şerit (`overflow-x-auto snap-x`) + `scrollbar-width: none` |
| Aside | `lg:grid-cols-[1fr_320px]` → mobilde altta ✅. Ancak "Scope and limits" en altta kalıyor; **öneri:** mobilde skor kartının hemen altına bir "Scope" `<details>` özeti |
| Bulgu kartları | Tam genişlik ✅ |

#### Performans bütçesi

| Veri | Nerede | Ne zaman |
|---|---|---|
| `getScanJob` | Server, blocking | h1 için gerekli |
| `listIssues`, `listScanPages`, `getScanSummary`, `listIssueGroups`, `listPageJobs` | Server, `Promise.all` ✅ **zaten doğru** (`:48-54`) | İlk render |
| Filtreli set | Server (§5.3) | Her filtre değişiminde |
| `IssueGroupSection` | Client island, `children` server'dan ✅ **doğru desen** | — |

**Streaming önerisi:** Skor kartı ve "Fix these first" hızlı gelir; bulgu listesi ağır. İkiye ayır:

```tsx
      <ScanHeader scan={scan} summary={summary} counts={counts} />
      <Suspense fallback={<FindingsSkeleton />}>
        <FindingsList workspaceId={ctx.workspace.id} scanId={scan.id} filters={{ sev, vp }} />
      </Suspense>
```

Bu, `listIssues`'ın (en pahalı sorgu) skor kartını bloklamasını önler → algılanan LCP belirgin düşer.

**DOM bütçesi:** § 5.28 sonrası hedef < 1.500 düğüm.

---

### 6.5 `/app/scans/[id]/issues/[issueId]` — Bulgu detayı

**Dosya:** `issues/[issueId]/page.tsx` (RSC) + 3 client island

#### Mevcut yapı ve sorunlar

```
[← Back to scan results]
[SeverityBadge][ruleId][Needs human review]     │  [IssueActions: select + 4 buton]
[h1] {issue.help}
[WcagBadge] {page url}
┌ Ana ────────────────────────────┬ Aside ──────┐
│ Card "Description"               │ Card "Status"│
│ Card "Failing element" (<pre>)   │  · status    │
│ [Visual evidence]                │  · impact    │
│ AiExplanationPanel               │  · severity  │
│ [HumanReviewBanner]              │  · tags      │
└──────────────────────────────────┴──────────────┘
```

| Sorun | Kanıt |
|---|---|
| `docs/ux-flows.md:43-50`'de vaat edilen 5 bölüm **yok**: "Why this matters", "Who this affects", "How to fix", "copy the After code", "Manual verification checklist" | `:40-121` (F-50) |
| `IssueActions` DOM'da içerikten **önce** — SR kullanıcısı bulguyu okumadan aksiyonları duyuyor | `:45-61` (WCAG 1.3.2) |
| Aside "Status" kartı `IssueActions` ile senkron değil | `:113` vs `issue-actions.tsx` (F-08) |
| AI paneli için ayrı consent isteniyor — workspace düzeyinde zaten verilmiş | `ai-panel.tsx:134-140` |
| `metadata` statik: "Issue — Percevia AI" | `:15` |
| `<pre>` kod bloğu kopyalanamıyor (Copy butonu yok) | `:79` |
| `helpUrl` linki "rule help" — hedefi belirsiz | `:70` |

#### Önerilen bilgi hiyerarşisi

`docs/ux-flows.md`'nin vaat ettiği yapı **doğru bir yapı**. Ya implemente edilmeli ya doküman düzeltilmeli (F-50). Öneri: **implemente et**, çünkü bu yapı ürünün farklılaştırıcısı — "axe çıktısını gösteren" değil, "ne yapacağını söyleyen" ürün.

```
1. [Breadcrumb] Dashboard › {host} scan › {rule}
2. [h1] {issue.help}
3. Meta şeridi: SeverityBadge · WcagBadge · sayfa URL'i · "N instances on this scan"
4. [h2] Why this matters              ← issue.description (VAR)
5. [h2] Who this affects              ← EKSİK: WCAG kriterinden türetilebilir statik eşleme
6. [h2] Where it fails                ← htmlSnippet + Copy butonu + selector
7. [h2] Visual evidence               ← koşullu (VAR)
8. [h2] How to fix                    ← AI paneli VEYA statik rule guidance
9. [h2] Verify the fix                ← EKSİK: manuel doğrulama adımları
10. [Aside sticky] Status + aksiyonlar + "N other instances" listesi
```

**"Who this affects" için statik eşleme** — `src/lib/wcag/affects.ts`:

```ts
/**
 * WCAG kriteri → etkilenen kullanıcı grupları. Bu, AI çıktısı DEĞİL —
 * WCAG'ın kendi "Understanding" dokümanlarından türetilmiş sabit eşleme.
 * Bu yüzden AiSuggestionBlock içine konmaz (AI etiketi yanıltıcı olur).
 */
export const AFFECTED_BY_CRITERION: Record<string, string[]> = {
  "wcag111": ["Screen reader users", "People who turn off images", "Search engines"],
  "wcag143": ["People with low vision", "People with colour vision deficiencies", "Anyone in bright sunlight"],
  "wcag131": ["Screen reader users", "People using browser reading modes", "People with cognitive disabilities"],
  "wcag211": ["Keyboard-only users", "Switch device users", "Voice control users", "Power users"],
  "wcag412": ["Screen reader users", "Voice control users", "Browser extension users"],
  "wcag412a": ["Screen reader users"],
  "wcag241": ["Screen reader users", "Keyboard-only users"],
  "wcag247": ["Keyboard-only users", "People with low vision", "People with attention differences"],
  "wcag332": ["People with cognitive disabilities", "Screen reader users", "Anyone filling a form quickly"],
  // …
};
```

Kullanım:
```tsx
          <section aria-labelledby="who-affects">
            <h2 id="who-affects" className="text-base font-semibold text-ink-900 mb-2">
              Who this affects
            </h2>
            <ul className="flex flex-wrap gap-2">
              {affected.map((group) => (
                <li key={group}>
                  <Badge tone="neutral">{group}</Badge>
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-600 mt-2">
              Based on the WCAG success criterion this rule maps to, not on your specific audience.
            </p>
          </section>
```

Son cümle önemli: dürüstlük. Ürün "senin kullanıcılarını biliyorum" demiyor.

**"Verify the fix"** — `ManualReviewChecklist.tsx` içindeki maddelerden rule'a uygun olanları çekerek:

```tsx
          <section aria-labelledby="verify">
            <h2 id="verify" className="text-base font-semibold text-ink-900 mb-2">Verify the fix</h2>
            <ol className="space-y-2 text-sm text-ink-700 list-decimal list-inside">
              {verificationSteps(issue.ruleId).map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>
```

#### Durum matrisi

| Durum | Görünüm | Microcopy |
|---|---|---|
| **Loading** | Yeni `loading.tsx` (§5.21) | `sr-only`: "Loading finding" |
| **AI kapalı (workspace)** | `AlertCallout tone="info"` | ✅ Mevcut metin iyi (`ai-panel.tsx:92-102`) |
| **AI açık, henüz üretilmemiş** | Generate paneli | ✅ Mevcut. **Ama** ikinci consent checkbox'ı kaldırılmalı — workspace consent yeterli; bunun yerine "AI-generated. Review before implementation." etiketi `AiSuggestionBlock` footer'ında zaten var |
| **AI üretiliyor** | Buton spinner + `role="status"` | "Generating explanation… this usually takes 5–10 seconds." |
| **AI hata** | `AlertCallout tone="danger" live` | §5.62 `aiErrorMessage()` |
| **AI hazır** | `AiSuggestionBlock` + Tabs (plain/developer) | ✅ Mevcut yapı iyi |
| **Görsel kanıt yok** | Bölüm hiç render edilmez ✅ | — |
| **Görsel kanıt silinmiş (retention)** | `AlertCallout tone="neutral"` | "The screenshot for this finding was deleted after the {n}-day retention window. The finding itself is unchanged." |
| **Görsel kanıt başarısız** | Metin (`:96-99`) | Mevcut: "Screenshot status: {status}" — **ham teknik metin**. Düzeltilmeli: "We couldn't capture a screenshot for this element ({reason})." + reason sözlükten |
| **Durum güncelleniyor** | §5.8 optimistic | "Status set to Fixed." |
| **Bulgu bulunamadı** | `notFound()` ✅ | — |

#### Klavye gezinme sırası

**Mevcut (sorunlu):**
```
1. ← Back to scan results
2. Status select        ← içeriği okumadan
3. Create task
4. Mark fixed
5. False positive
6. Flag for review
7. rule help linki
8. AI consent checkbox
9. AI framework select
10. Generate
```

**Önerilen:**
```
1. Breadcrumb: Dashboard
2. Breadcrumb: {host} scan
3. ── içerik ──
4. Copy failing element  (yeni)
5. rule help (harici, aria-label ile hedef belirtilmiş)
6. AI framework select
7. Generate explanation
8. [AI hazırsa] Plain/Developer tabları (1 durak)
9. [AI hazırsa] Copy fix
10. ── aside (sticky) ──
11. Status select
12. Create task
13. Mark fixed / False positive / Flag for review
14. "Next finding →"  (yeni — grup içinde gezinme)
```

**"Next finding" navigasyonu** eksik ve yüksek değerli: kullanıcı 12 instance'ı tek tek düzeltirken her seferinde geri gidip başka bir karta tıklıyor. Prev/Next linkleri (aynı grup içinde) 12 × 2 = 24 etkileşim tasarrufu.

#### Ekran okuyucu deneyimi

**Sayfa başlığı:** `generateMetadata` → `"{issue.help} — {host} — Percevia AI"`.

**Landmark:** `<aside>` (`:109`) → `role="complementary"` otomatik ✅. `aria-label="Finding status and actions"` eklenmeli.

**Kod bloğu (`:79`):** `<pre><code>` — ekran okuyucuda karakter karakter okunabilir (uzun HTML snippet'i işkence). Düzeltme:

```tsx
              <CardContent>
                <p className="sr-only" id="snippet-desc">
                  HTML snippet of the failing element. {issue.htmlSnippet.length} characters.
                  Use your screen reader&apos;s character navigation to read it in detail, or copy it with the button below.
                </p>
                <pre
                  aria-describedby="snippet-desc"
                  tabIndex={0}
                  className="max-w-full whitespace-pre-wrap break-words rounded-md bg-canvas-2 p-3 font-mono text-xs leading-relaxed text-ink-900 [overflow-wrap:anywhere] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                ><code>{issue.htmlSnippet}</code></pre>
                <CopyButton value={issue.htmlSnippet} label="Copy failing element" />
              </CardContent>
```

`tabIndex={0}` — kaydırılabilir bir bölge klavyeyle erişilebilir olmalı (WCAG 2.1.1).

**Harici link (`:69`):** "rule help" → `aria-label="Deque rule documentation for ${issue.ruleId} (opens in a new tab)"`. Yeni sekmede açılan link uyarısı WCAG 3.2.5 (AAA) ama iyi pratik.

#### Mobil davranış

- Aside mobilde **altta** kalıyor → durum aksiyonları en altta. **Öneri:** mobilde aksiyonları sticky bottom bar'a al (bottom nav'ın üstüne):
  ```tsx
  <div className="lg:hidden sticky bottom-[calc(56px+env(safe-area-inset-bottom))] -mx-4 px-4 py-3 bg-paper/95 backdrop-blur border-t border-line z-20">
    <IssueActions … />
  </div>
  ```
- `<pre>` yatay kaydırma: `whitespace-pre-wrap break-words [overflow-wrap:anywhere]` ✅ **zaten doğru** — projedeki en iyi mobil detay.
- `min-w-0` disiplini (`:41,62,63,109,110`) ✅ örnek alınmalı.

#### Performans bütçesi

| Veri | Nerede |
|---|---|
| `getScanJob`, `getIssue`, `listScanPages`, `getVisualEvidenceForIssue` | Server, `Promise.all` ✅ (`:25-30`) |
| `listScanPages` — **tüm** sayfaları çekiyor, yalnız biri gerekiyor | ⚠️ `getScanPage(workspaceId, scanId, issue.scanPageId)` olmalı |
| Görsel kanıt resmi | `/api/visual-evidence/[id]/image` — `<img>` ham, `width`/`height` yok → **CLS riski** (V1 §4.5) |

`issue-evidence-image.tsx:34-44` düzeltmesi:
```tsx
      <img
        src={src}
        alt={alt}
        width={viewport?.width ?? 1280}
        height={viewport?.height ?? 720}
        loading="lazy"
        decoding="async"
        className="w-full h-auto rounded-md ring-1 ring-line"
        style={{ aspectRatio: `${viewport?.width ?? 1280} / ${viewport?.height ?? 720}` }}
      />
```

---

### 6.6 `/app/ai-assistant` — AI Fix Assistant

**Dosya:** `ai-assistant/page.tsx` (RSC) → `ai-assistant-client.tsx` (~700 satır client)

#### Mevcut yapı ve sorunlar

```
[h1] Generate, explain, and review accessibility fixes
AlertCallout "What this assistant will not do" (4 madde)
Card "Past scans" → yatay kaydırmalı buton şeridi (aria-pressed)
┌ Ana ──────────────────────────────┬ Aside ────────┐
│ [error]                            │ Preset actions │
│ AiSuggestionBlock "Reviewable fix" │ Scope          │
│ [AiSuggestionBlock "Guidance"]     │                │
│ [AiSuggestionBlock "Patch example"]│                │
│ Card: prompt textarea + framework  │                │
│       çipleri + Generate           │                │
└────────────────────────────────────┴────────────────┘
```

| Sorun | Kanıt |
|---|---|
| Scan seçici `aria-pressed` toggle grubu — semantik olarak **radyo grubu** olmalı (tek seçim) | `:183-209` |
| Framework çipleri de `aria-pressed` — aynı sorun | `:284-299` |
| Preset listesi de `aria-pressed` — aynı sorun | `:329-342` |
| Üç farklı yerde aynı segmented-selection deseni, üçü de yanlış | F-32 ailesi |
| Prompt textarea `Textarea` bileşeni değil, elle yazılmış | `:274-281` |
| AI üretimi sırasında `role="status"` yok — kullanıcı "Generating..." metnini göremiyorsa hiçbir şey bilmiyor | `:307` |
| Tanımsız token'lar: `purple-900`, `purple-200`, `amber-100`, `green-100`, `amber-600`, `green-600` | `:336,659-688` |
| Girdi sırası ters: **çıktı kartları üstte, prompt altta** — kullanıcı önce boş kartlar görüyor | `:223-314` |
| `AlertCallout` "What this won't do" `role="alert"` (warning) → sayfa açılışında kesintili duyuru | `:154` (F-47) |

#### Önerilen bilgi hiyerarşisi

Bu ekran bir **sohbet/komut** arayüzü. Sıra ters olmamalı: girdi önce (veya en azından belirgin), çıktı sonra.

```
1. [h1] AI Fix Assistant
2. [TEK disclaimer] "AI-generated. Review before implementation."  ← AiSuggestionBlock zaten yapıyor
     "What this won't do" listesi → <details> altına
3. Scope seçimi: hangi tarama? (radiogroup)
4. Prompt + framework + preset  ← BİRLİKTE, tek kart
5. [Generate]
6. ── Çıktı bölgesi ──
     · Boş durum: "Pick a scan and describe what you want to fix."
     · Yükleniyor: iskelet + role="status"
     · Sonuç: Guidance → Patch → Verification
7. [Aside] Seçili taramanın özeti + son N üretim geçmişi
```

#### Durum matrisi

| Durum | Görünüm | Microcopy |
|---|---|---|
| **Empty (tarama yok)** | `EmptyState` | "Run a scan first. The assistant works from real findings in your workspace — it doesn't guess about a site it hasn't seen." + "Start a scan" |
| **Empty (tarama seçilmemiş)** | Çıktı bölgesinde placeholder | "Pick a scan above, then describe the fix you want. For example: *Generate a Next.js diff for the unlabeled icon buttons in this scan.*" |
| **Idle (hazır)** | Generate aktif | Buton: "Generate" |
| **Generating** | Buton disabled + spinner, çıktı bölgesinde iskelet | `role="status"`: "Generating fixes from {n} findings on {host}. This usually takes 10–20 seconds." |
| **Error — AI kapalı** | `AlertCallout tone="info" live` | "AI processing is off for this workspace. [Enable it in the Privacy & Compliance Center] — an admin approves it once." |
| **Error — AI yapılandırılmamış** | `AlertCallout tone="warning" live` | "AI isn't configured for this deployment. Contact your workspace administrator." |
| **Error — rate limit** | `AlertCallout tone="warning" live` | "The AI provider is busy right now. Try again in a moment." |
| **Success** | 3 `AiSuggestionBlock` | ✅ Mevcut yapı; her birinin footer'ında `AI_REVIEW_REQUIRED` |
| **Kısıtlı plan** | Generate disabled | "AI assistance is available from the Starter plan. [See plans]" |

#### Klavye gezinme sırası

```
── main ──
 1. <details> "What this assistant won't do" (summary)
 2. Scan radiogroup  (TEK durak, ok tuşlarıyla)
 3. Prompt textarea
 4. Framework radiogroup  (TEK durak)
 5. Preset radiogroup  (TEK durak)
 6. Generate
 7. ── çıktı ──
 8. [sonuç varsa] Copy patch
 9. [sonuç varsa] Copy verification steps
```

**Şu an:** 8 tarama × 1 + 4 framework × 1 + 5 preset × 1 = **17 Tab durağı** yalnızca seçim için. `SegmentedRadio` (§5.12) ile **3** durağa iner.

#### Ekran okuyucu deneyimi

**Kritik eksik:** AI üretimi asenkron ve uzun (10-20 sn). Duyuru olmadan ekran okuyucu kullanıcısı butona basar ve hiçbir şey olmadığını sanır.

```tsx
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {busy
          ? `Generating fixes from ${selectedScan?.pagesScanned ?? 0} scanned pages. This usually takes 10 to 20 seconds.`
          : result
          ? "Fix suggestions ready. Three sections: project guidance, generated patch, and verification steps."
          : ""}
      </p>
```

**Yatay kaydırmalı scan şeridi (`:179`):** Ekran okuyucu kullanıcısı için kaydırma sorun değil (sanal imleç tümünü görür) ama **klavye** kullanıcısı için: `overflow-x-auto` bir kaydırma kabıdır ve WCAG 2.1.1 gereği klavyeyle kaydırılabilir olmalı → `tabIndex={0}` + `role="group"` + `aria-label`. `SegmentedRadio`'ya çevrilirse radyo grubu ok tuşlarıyla gezilir ve tarayıcı seçili öğeyi otomatik görünür alana kaydırır → sorun kendiliğinden çözülür.

**`AiSuggestionBlock` footer'ı:** `AI_REVIEW_REQUIRED` her blokta tekrarlanıyor (3 blok = 3 tekrar). Ekran okuyucuda üç kez "AI-generated suggestion. Review before implementation." duymak yorucu. **Öneri:** ilk blokta tam metin, sonrakilerde `aria-hidden` görsel tekrar + tek bir `sr-only` özet. Ancak bu, `docs/microcopy.md`'nin "her AI yüzeyi kendini beyan eder" kuralıyla çelişir — **kural kazanır**, tekrar kalır. Bunun yerine metin kısaltılabilir: "AI-generated — review before use."

#### Mobil davranış

- `lg:grid-cols-[1fr_320px]` → mobilde aside altta. Preset listesi ve scope bilgisi çıktının **altında** kalıyor. **Öneri:** presetleri prompt kartının içine taşı (mobilde de mantıklı).
- Yatay scan şeridi mobilde doğal ✅ ama `min-w-[220px]` kartlar 320px'de tek kart bile tam sığmıyor → `min-w-[200px] max-w-[80vw]`.
- Prompt textarea `rows={3}` → mobilde yeterli.

#### Performans bütçesi

| Veri | Nerede |
|---|---|
| `listScans(50)` + filtre | Server ✅ (`page.tsx:10-20`) |
| Form state, sonuç | Client |
| `POST /api/ai-assistant` | Client |

**Bundle:** 700 satırlık tek client dosyası. `ReviewableCodeFixPreview`, `ProjectGuidanceView` gibi alt bileşenler ayrı dosyalara bölünüp `next/dynamic` ile lazy yüklenebilir — ama bunlar zaten aynı sayfada gösteriliyor, kazanç sınırlı. **Öncelik değil.**

**Streaming önerisi:** AI yanıtı streaming olarak gelebilirse (`ReadableStream`), algılanan bekleme dramatik düşer. `POST /api/ai-assistant` şu an tek seferde JSON döndürüyor. §8.5'te ele alındı.

---

### 6.7 `/app/remediation` — Remediation board

**Dosya:** `remediation/page.tsx` (RSC, saf server — **projedeki en temiz ekran**)

#### Mevcut yapı ve sorunlar

```
[h1] Track every fix to done
NoGuaranteeBanner (compact)
<details open> Proje klasörü 1
  ├─ summary: Folder ikonu + h2 proje adı + "N open · M done · T total" + Badge + Expand/Collapse
  └─ 2 sütunlu TaskCard grid'i
<details open> Proje klasörü 2
…
```

| Sorun | Kanıt |
|---|---|
| `docs/ux-flows.md:50` "Card moves on Remediation Board automatically" — otomatik hareket yok, `<details>` grupları statik | F-50 |
| Görev durumu **değiştirilemiyor** — board salt okunur. `RemediationTask.status` var ama UI'da güncelleme yok | `:109-172` |
| Filtre/sıralama yok — 100 görevde kullanılamaz | `:28` `listRemediationTasks(…, 100)` |
| `<details open>` her zaman açık → 100 görev = 100 kart aynı anda | `:65` |
| Boş durum tek CTA sunuyor ama "manuel görev ekle" yolu yok | `:50-59` |
| `Badge` "active"/"complete" küçük harfle — diğer badge'ler durum adını `replaceAll("_"," ")` ile gösteriyor, tutarsız | `:83-85` vs `:120-122` |
| `NoGuaranteeBanner` burada gereksiz — bu ekran uyumluluk iddiası içermiyor | `:47` (F-45) |

#### Önerilen bilgi hiyerarşisi

Board'un işi: *"bugün ne üzerinde çalışacağım?"*

```
1. [h1] Remediation
2. Özet şeridi: "12 open · 3 in progress · 45 done"  ← sayılar filtre linki
3. Filtre/sıralama barı: [All ▾] [Severity ▾] [Assignee ▾]   ← searchParams tabanlı
4. Gruplama seçimi: by project (varsayılan) | by severity | by status
5. Görev listesi:
     · İlk klasör açık, diğerleri kapalı  ← <details open={idx===0}>
     · Her kart: başlık · rozet · şiddet · kaynak · [Open issue] [Report]
     · Durum değiştirme: kart üzerinde inline select (optimistic)
6. [KALDIR] NoGuaranteeBanner
```

**Durum değiştirme** — board'u gerçek bir board yapan tek şey:

```tsx
// src/app/app/remediation/task-status.tsx
"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAnnounce } from "@/components/accessibility/AnnouncerProvider";

const STATUSES = ["to_do", "planned", "in_progress", "blocked", "fixed", "accepted_risk"] as const;
const LABEL: Record<string, string> = {
  to_do: "To do", planned: "Planned", in_progress: "In progress",
  blocked: "Blocked", fixed: "Fixed", accepted_risk: "Accepted risk",
};

export function TaskStatusSelect({ taskId, title, initial }: { taskId: string; title: string; initial: string }) {
  const router = useRouter();
  const announce = useAnnounce();
  const [status, setStatus] = useState(initial);
  const [optimistic, applyOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    startTransition(async () => {
      applyOptimistic(next);
      const res = await fetch(`/api/remediation-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        announce(`Could not update ${title}.`, { assertive: true });
        return;
      }
      setStatus(next);
      announce(`${title} moved to ${LABEL[next]}.`);
      router.refresh();
    });
  }

  return (
    <label className="inline-flex items-center gap-1.5 text-xs">
      <span className="sr-only">Status for {title}</span>
      <select
        value={optimistic}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
        className="h-8 px-2 rounded-md ring-1 ring-border-field bg-paper text-xs font-medium text-ink-900 disabled:opacity-60"
      >
        {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
      </select>
    </label>
  );
}
```

#### Durum matrisi

| Durum | Görünüm | Microcopy |
|---|---|---|
| **Loading** | `remediation/loading.tsx` (§5.21) | `sr-only`: "Loading remediation tasks" |
| **Empty (hiç görev yok)** | `EmptyState icon={KanbanSquare}` | **Başlık:** "No remediation tasks yet" · **Açıklama:** "Completed scans create tasks from grouped findings automatically. You can also create a task from any finding." · **CTA:** "Start a scan" · **İkincil:** "See a completed scan" |
| **Empty (hepsi kapandı)** | `EmptyState tone="success"` | "Every task is done. Nice. Re-scan to catch regressions, or set up a monitor to check automatically." + "Set up a monitor" |
| **Empty (filtre sonucu boş)** | Inline metin | "No tasks match these filters. [Clear filters]" |
| **Partial (görevler var, bazıları kaynak taramaya bağlı değil)** | Kartta rozet | `task.ruleId ?? "Manual task"` ✅ mevcut |
| **Error** | Layout `error.tsx` | ✅ |
| **Kısıtlı plan** | — | Remediation her planda açık ✅ |

#### Klavye gezinme sırası

```
── main ──
 1. Filtre: All / Open / Done  (3 link)
 2. Sıralama select
 3. Gruplama select
 4. <details> klasör 1 (summary)
 5.   Task 1: status select
 6.   Task 1: Open issue
 7.   Task 1: Scan results
 8.   Task 1: Report output
 9.   Task 2: …
10. <details> klasör 2 (summary)
```

**Sorun:** Her kartta 4 durak × 20 kart = 80 durak. **Öneri:** kart başına **birincil** aksiyon (status select) + kartın kendisi link olsun; "Scan results"/"Report output" ikincil aksiyonlar bir `<details>` "More" altında veya yalnız hover/focus'ta görünsün (ama 1.4.13'e dikkat — focus'ta da görünmeli).

Daha iyi: kartın tamamı `Open issue`'ya giden bir link olsun (`IssueCard` deseni gibi), status select ayrı bir durak.

#### Ekran okuyucu deneyimi

**Klasör yapısı:** `<details>/<summary>` ✅ native disclosure. `<summary>` içinde `<h2>` (`:74`) ✅ — rotor gezinmesi çalışıyor. Bu, projedeki **en iyi** a11y yapısı.

**Duyuru:** "Percevia AI, disclosure triangle, expanded, heading level 2. 3 open, 12 done, 15 total. active."

**Görev sayısı özeti (`:77-79`):** ✅ iyi — hem sayı hem etiket.

**Eksik:** Görev kartlarında `<h3>` yok (`CardTitle` h3 ✅ ama §5.19 sonrası h2 olur → klasör h2 ile çakışır). **Düzeltme:** `<CardTitle as="h3">`.

**Durum değişimi duyurusu:** `announce("Fix contrast on buttons moved to In progress.")` — görev adını içermesi kritik (20 görev arasında hangisi olduğu belli olsun).

#### Mobil davranış

- `xl:grid-cols-2` → mobilde tek sütun ✅
- `<summary>` içindeki `flex-wrap` ✅ (`:68`)
- Kart aksiyonları `flex-wrap gap-2` ✅ ama 3 buton 320px'de 2 satır — mobilde yalnız birincil aksiyonu göster
- `<details>` mobilde varsayılan **kapalı** olmalı (uzun scroll'u önler): `open={idx === 0 && !isMobile}` server'da bilinemez → CSS ile: `@media (max-width: 640px) { details:not(:first-of-type) { … } }` çalışmaz (open bir attribute). **Çözüm:** ilk klasör hariç hepsi kapalı, her breakpoint'te aynı.

#### Performans bütçesi

| Veri | Nerede |
|---|---|
| `listRemediationTasks(workspaceId, 100)` | Server ✅ |
| `groupTasksByProject` | Server ✅ (`:175-200`) — doğru yer |
| Durum değişimi | Client island (yalnız select) |

**Bu ekran mimari olarak örnek alınmalı:** tüm veri ve hesaplama sunucuda, client JS yalnız gerçek etkileşim için. `"use client"` şu an **hiç yok**; `TaskStatusSelect` eklendiğinde yalnız o kadar client kodu girer.

**Ölçek:** 100 görev × ~15 DOM düğümü = 1.500 düğüm — sınırda. `<details>` kapalıyken tarayıcı render etmez ✅. 500 görevde sayfalama gerekir.

---

### 6.8 `/app/compliance` — Privacy & Compliance Center

**Dosya:** `compliance/page.tsx` (RSC + 2 client island)

`docs/ux-flows.md:105` bu ekranı "highest-trust screen" olarak tanımlıyor. Bu doğru — ve tam bu yüzden buradaki her kusur orantısız zarar veriyor.

#### Mevcut yapı ve sorunlar

```
[h1] Privacy, AI use, and the limits of automated scanning
NoGuaranteeBanner (full)
[h2] Compliance posture      → 4 PostureCard
[h2] AI processing consent   → PrivacyToggle + AI_DISCLOSURE
[h2] Scan data & storage     → 2 PrivacyToggle + Export/Delete kartları
[h2] Accessibility Statement → CTA
[h2] Region & data hosting   → 3 ÖLÜ BUTON + açıklama
[h2] Team access & logs      → audit list + link
[h2] Subprocessor list       → 4 satır + AlertCallout
[h2] Legal documents         → 6 link kartı
footer: contact
```

| Sorun | Kanıt |
|---|---|
| Bölge seçici ölü butonlar | `:216-233` (F-04) |
| **Sayfa çok uzun** — 9 bölüm, ~1.100px+ scroll. Kullanıcı aradığını bulamıyor | Tüm dosya |
| İçindekiler / anchor navigasyonu yok | — |
| `PostureCard` başlıkları h3 ✅ ama içerik `text-xs` — yasal metin 12px'te okunuyor | `:377` |
| Audit log yalnız owner/admin'e görünüyor ama **neden** görünmediği diğerlerine söylenmiyor | `:63-78` — `canViewAudit === false` durumunda `auditEvents = []` → "No recorded actions yet." gösteriliyor ki bu **yanlış bilgi** |
| Subprocessor listesi statik dizi — `docs/` ile senkronize değil | `:48-53` |
| `AlertCallout tone="neutral"` (`:315`) → `role` yok ✅ doğru |
| Legal linkleri `<a>` (Next `<Link>` değil) → tam sayfa yenileme | `:328` |

#### Önerilen bilgi hiyerarşisi

Bu ekrana üç farklı kişi geliyor:
- **Kullanıcı:** "AI'ı nasıl kapatırım?" / "Verimi nasıl silerim?"
- **Alıcının hukuk ekibi:** "DPA nerede? Subprocessor kim?"
- **Denetçi:** "Erişilebilirlik beyanı nerede?"

```
1. [h1] Privacy & compliance
2. [YENİ] İçindekiler — sayfa içi anchor navigasyonu (sticky, aside)
     · Your controls
     · What we do and don't claim
     · Where your data lives
     · Who can see what
     · Legal documents
3. [ÖNCE] Your controls          ← AKSİYON önce
     · AI processing            (toggle)
     · Visual evidence          (toggle)
     · Screenshot storage       (toggle)
     · Export workspace data    (buton)
     · Delete all scan data     (buton, ConfirmDialog)
4. What we do and don't claim    ← 4 PostureCard + NoGuaranteeBanner (TEK)
5. Where your data lives         ← bölge bilgi kartı (§5.4 A) + subprocessorlar
6. Who can see what              ← audit log + team linki
7. Your accessibility statement  ← CTA
8. Legal documents               ← 6 link
```

**Anchor navigasyonu:**

```tsx
        <nav aria-label="On this page" className="hidden xl:block sticky top-24 self-start w-56 shrink-0">
          <h2 className="text-[0.6875rem] uppercase tracking-wider text-ink-600 font-semibold mb-2">
            On this page
          </h2>
          <ul className="space-y-1 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block px-2 py-1.5 rounded text-ink-700 hover:bg-canvas-2 hover:text-ink-900 min-h-[32px]"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
```

Bu, WCAG 2.4.1 Bypass Blocks'a da katkı sağlar (uzun sayfada bölüm atlama).

**Audit log yetki durumu düzeltmesi:**

```tsx
            {!canViewAudit ? (
              <AlertCallout tone="neutral">
                Only workspace owners and admins can see who did what. Sensitive actions are
                still recorded — ask an admin if you need the log.
              </AlertCallout>
            ) : auditEventsError ? (
              …
```

Bu, "dürüst konumlanma" markası için tipik bir kazanç: kullanıcıya **neden** göremediğini söylemek.

#### Durum matrisi

| Durum | Görünüm | Microcopy |
|---|---|---|
| **Loading** | `compliance/loading.tsx` (§5.21) | `sr-only`: "Loading privacy settings" |
| **Toggle değişiyor** | `PrivacyToggle` optimistic + `role="status"` | "AI processing enabled." / "AI processing disabled." |
| **Toggle hata** | Rollback + `AlertCallout live` | "We couldn't save that change. Your setting is unchanged." |
| **Yetki yok (toggle)** | Toggle disabled | "Only owners and admins can change privacy settings." |
| **Audit log boş (yetkili)** | Metin | ✅ Mevcut (`:261-264`) iyi |
| **Audit log yetkisiz** | `AlertCallout tone="neutral"` | Yukarıdaki yeni metin |
| **Audit log hata** | `AlertCallout tone="warning"` | ✅ Mevcut (`:256-259`) iyi |
| **Export başlatıldı** | Buton pending + `role="status"` | "Preparing your export… the download starts automatically." |
| **Delete onayı** | `ConfirmDialog` | Başlık: "Delete all scan data?" · Gövde: `COMPLIANCE_COPY.DELETE_SCAN_WARNING` · Onay: "Delete everything" · İptal focus'ta |
| **Delete tamamlandı** | `AlertCallout tone="success" live` | "All scan data deleted. Reports built from those scans no longer have underlying findings." |

#### Klavye gezinme sırası

```
── main ──
 1. [xl] "On this page" — 5 anchor
 2. AI processing toggle
 3. Visual evidence toggle
 4. Screenshot storage toggle
 5. Export workspace data
 6. Delete all scan data
 7. Manage statement
 8. Manage team & roles
 9. Legal documents × 6
10. Contact e-posta
11. maitrico linki
```

**Şu an:** 3 ölü bölge butonu 6-8 arasında sıkışıyor (F-04). Kaldırıldığında 3 durak azalır.

#### Ekran okuyucu deneyimi

**Landmark:** `<nav aria-label="On this page">` eklendiğinde landmark rotorunda görünür ✅.

**Heading haritası (mevcut ✅ doğru):**
```
h1  Privacy, AI use, and the limits of automated scanning
h2  Compliance posture
h3    No compliance guarantee
h3    Human review required
h3    AI use disclosure
h3    Overlay stance
h2  AI processing consent
h2  Scan data & storage
h3    Export workspace data
h3    Delete all scan data
…
```

Bu, `compliance/page.tsx`'in **projedeki en doğru heading yapısına sahip** dosya olduğunu gösteriyor (`SectionTitle` h2, `PostureCard` h3). §5.19'daki `CardTitle` düzeltmesi diğer sayfaları bu seviyeye çıkarmalı.

**Toggle duyuruları:** `PrivacyToggle` (client island) → `Switch` `role="switch"` ✅ native. Duyuru: "Enable AI explanations and remediation suggestions, switch, off." → tıklama → "on" ✅. Kaydetme sonucu duyurulmuyor → `announce()` eklenmeli.

**Uzun açıklama metinleri:** `PrivacyToggle` `description` prop'u — `Switch` bileşeninde `aria-describedby` yoktu, §5.7'den sonra bağlı ✅. Bu, sayfadaki en uzun ve en önemli metinlerden biri (`:126` AI veri açıklaması) — şu an ekran okuyucuya **hiç ulaşmıyor**.

#### Mobil davranış

- Anchor nav `hidden xl:block` → mobilde yok. **Alternatif:** mobilde en üstte `<details><summary>On this page</summary>` disclosure.
- `md:grid-cols-2` PostureCard grid'i ✅
- `sm:grid-cols-3` bölge kartları ✅
- `sm:grid-cols-2` legal linkleri ✅ — kart yüksekliği `p-4` + tek satır metin = ~56px ✅ 2.5.8 uyumlu
- Footer `flex-wrap gap-x-6 gap-y-2` ✅

#### Performans bütçesi

| Veri | Nerede |
|---|---|
| `getCurrentWorkspaceOrRedirect` (privacy dâhil) | Server ✅ |
| `listAuditLogs(workspaceId, 10)` | Server ✅ — ama **yalnız yetkiliyse** çekiliyor ✅ (`:65`) doğru optimizasyon |
| Toggle mutasyonları | Client island (`privacy-toggle.tsx`) ✅ |
| Delete/Export | Client island (`delete-actions.tsx`) ✅ |

**Bu ekran client/server ayrımı açısından doğru kurgulanmış.** Tek iyileştirme: `listAuditLogs` `<Suspense>` içine alınabilir (sayfanın geri kalanı ondan bağımsız):

```tsx
        <Suspense fallback={<AuditLogSkeleton />}>
          <AuditLogList workspaceId={ctx.workspace.id} canView={canViewAudit} userId={ctx.userId} />
        </Suspense>
```

---

## 7. Design System Denetimi ve Token Spesifikasyonu

### 7.1 `globals.css` — mevcut tanımların tam envanteri

`src/app/globals.css` 201 satır. `@theme` bloğu (`:3-65`) **41 token** tanımlıyor:

| Kategori | Token | Değer | Satır |
|---|---|---|---|
| **Brand — navy** | `--color-navy-50` | `#EAEEF7` | `:5` |
| | `--color-navy-100` | `#C9D1E4` | `:6` |
| | `--color-navy-200` | `#94A1BF` | `:7` |
| | `--color-navy-500` | `#2C3A60` | `:8` |
| | `--color-navy-700` | `#1A2542` | `:9` |
| | `--color-navy-800` | `#111A2E` | `:10` |
| | `--color-navy-900` | `#0B1220` | `:11` |
| **Surface** | `--color-paper` | `#FFFFFF` | `:13` |
| | `--color-canvas` | `#F7F8FB` | `:14` |
| | `--color-canvas-2` | `#EFF2F8` | `:15` |
| **Text — ink** | `--color-ink-900` | `#0E1422` | `:17` |
| | `--color-ink-700` | `#2A3247` | `:18` |
| | `--color-ink-600` | `#4B5570` | `:19` |
| | `--color-ink-500` | `#626C87` | `:20` |
| | `--color-ink-400` | `#8892A6` | `:21` |
| | `--color-ink-300` | `#B0B8CC` | `:22` |
| **Border** | `--color-line` | `#E4E8F0` | `:24` |
| | `--color-line-strong` | `#CDD3E0` | `:25` |
| **Accent — blue** | `--color-blue-50/100/500/600/700` | `#EEF3FF` `#DCE6FF` `#4A7BFF` `#3563E6` `#2A50BF` | `:27-31` |
| **Accent — green** | `--color-green-50/500/700` | `#E8F5EE` `#3FA67A` `#2A7556` | `:33-35` |
| **Accent — purple** | `--color-purple-50/100/500/600` | `#EFEDFE` `#DDD8FC` `#7A6CF0` `#5E4FD9` | `:37-40` |
| **Accent — amber** | `--color-amber-50/500/700` | `#FBF1DE` `#C28A2E` `#8C6217` | `:42-44` |
| **Accent — rose** | `--color-rose-50/500/700` | `#F8E5E9` `#B7475A` `#8A2F40` | `:46-48` |
| **Radii** | `--radius-sm/-/md/lg/xl` | `6/10/12/16/22px` | `:51-55` |
| **Shadows** | `--shadow-soft/card/pop` | 2 katmanlı | `:58-60` |
| **Fonts** | `--font-sans`, `--font-mono` | Inter / JetBrains Mono + fallback | `:63-64` |

**`@theme` dışında tanımlı davranışlar:**

| Blok | Satır | Değerlendirme |
|---|---|---|
| `html[data-text-size]` | `:72-73` | ✅ İyi. ⚠️ 88 sabit-px metin etkilenmiyor (F-55) |
| `html[data-contrast="high"]` — 12 token override | `:85-101` | ✅ Çok iyi. ⚠️ Inline `style` ile CSS değişkeni kullanan yerler etkilenir ama Tailwind opacity modifikatörleri (`bg-blue-50/50`) test edilmedi (§14.3) |
| `html[data-motion="reduced"]` | `:103-110` | ✅ |
| `@media (prefers-reduced-motion: reduce)` | `:112-121` | ✅ İkisi birlikte olması çoğu üründen iyi |
| `*:focus / *:focus-visible` | `:123-128` | ✅ Doğru: `outline:none` yalnız `:focus`, görünür halka `:focus-visible` |
| `::selection` | `:130-133` | ✅ |
| `.skip-to-content` | `:135-150` | ✅ `translateY(-150%)` + `:focus` görünür |
| `scrollbar-width/color` | `:152-155` | ⚠️ `scrollbar-color: line-strong transparent` → 1.50:1 kontrast, kaydırma çubuğu neredeyse görünmez (1.4.11 sınırında) |
| `@media print` | `:157-162` | ✅ |
| `.sr-only` | `:164-174` | ✅ Doğru implementasyon |
| `.bg-grid`, `.bg-aurora` | `:176-188` | ✅ Landing dekorasyonu |
| `.pulse-dot` + `@keyframes pulseDot` | `:190-194` | ✅ Reduced-motion ile durdurulıyor |
| `.marquee-track` + `@keyframes scrollX` | `:196-200` | ❌ **Ölü kod** — grep → yalnız `lib/mock/issues.ts`'te örnek metin içinde (F-41) |

**Eksik kategoriler:** spacing token'ı yok (Tailwind varsayılanı kullanılıyor — kabul edilebilir), typography scale token'ı yok (arbitrary `text-[Npx]` kullanılıyor — **sorunlu**, F-55), motion token'ı yok (süre/easing sabit değerler), z-index token'ı yok (`z-20/30/40/50` elle).

---

### 7.2 Hesaplanmış kontrast tablosu

**Yöntem:** WCAG 2.x relative luminance formülü (sRGB → linear → `0.2126R + 0.7152G + 0.0722B`), kontrast `(L1+0.05)/(L2+0.05)`. Hex değerleri `globals.css`'ten. **Bu değerler hesaplanmıştır, tarayıcıda ölçülmemiştir** — ancak formül deterministik olduğu için axe/Lighthouse ile aynı sonucu vermelidir (yarı saydam katmanlar hariç).

#### Metin kontrastı (1.4.3 · normal metin 4.5:1, büyük metin 3:1)

| Ön plan | Arka plan | Oran | 4.5:1 | Kullanım |
|---|---|---|---|---|
| `ink-900` #0E1422 | `canvas` #F7F8FB | **17.13:1** | ✅ | Gövde metni |
| `ink-900` | `paper` #FFFFFF | **18.39:1** | ✅ | Kart içi metin |
| `ink-700` #2A3247 | `paper` | **12.66:1** | ✅ | Başlıklar, buton metni |
| `ink-600` #4B5570 | `canvas` | **6.91:1** | ✅ | İkincil metin |
| `ink-600` | `paper` | **7.42:1** | ✅ | |
| `ink-500` #626C87 | `canvas` | **4.87:1** | ✅ | Metadata, caption — **sınırda** |
| `ink-500` | `paper` | **5.23:1** | ✅ | Placeholder |
| `ink-400` #8892A6 | `canvas` | **2.86:1** | ❌ | ⚠️ `progress-client.tsx:346` "Queued" |
| `ink-400` | `paper` | **3.08:1** | ❌ | ⚠️ Metin için kullanılmamalı |
| `ink-300` #B0B8CC | `paper` | **1.99:1** | ❌ | ⚠️ `team/page.tsx:105` anlamlı ikon |
| `blue-600` #3563E6 | `canvas` | **4.52:1** | ✅ | Linkler — **sınırda** |
| `blue-600` | `paper` | **4.86:1** | ✅ | |
| `blue-700` #2A50BF | `blue-50` #EEF3FF | **6.30:1** | ✅ | Badge info |
| `green-700` #2A7556 | `green-50` #E8F5EE | **4.96:1** | ✅ | Badge success |
| `green-700` | `paper` | **5.56:1** | ✅ | |
| `amber-700` #8C6217 | `amber-50` #FBF1DE | **4.83:1** | ✅ | Badge warning |
| `rose-700` #8A2F40 | `rose-50` #F8E5E9 | **6.79:1** | ✅ | Badge danger |
| `purple-600` #5E4FD9 | `purple-50` #EFEDFE | **5.07:1** | ✅ | Badge AI |
| `paper` | `navy-900` #0B1220 | **18.39:1** | ✅ | Birincil buton |
| `paper` | `rose-500` #B7475A | **5.19:1** | ✅ | Danger buton |
| `paper` | `blue-500` #4A7BFF | **3.79:1** | ⚠️ | Accent buton — **normal metin için yetersiz**, ≥18.66px veya ≥14px bold gerekir. `Button size="sm"` `text-sm` (14px, `font-medium`) → **ihlal** |
| `paper` | `purple-500` #7A6CF0 | **4.46:1** | ⚠️ | AI buton — 4.5:1'in **hemen altında** |
| `paper` | `green-500` #3FA67A | **3.14:1** | ❌ | Kullanılmıyor ✅ |
| `paper` | `amber-500` #C28A2E | **3.13:1** | ❌ | Kullanılmıyor ✅ |

#### Metin dışı kontrast (1.4.11 · 3:1)

| Öğe | Renk çifti | Oran | 3:1 |
|---|---|---|---|
| Form input kenarlığı | `line` #E4E8F0 / `paper` | **1.23:1** | ❌ |
| Güçlü kenarlık | `line-strong` #CDD3E0 / `paper` | **1.50:1** | ❌ |
| Kart kenarlığı | `line` / `canvas` #F7F8FB | **1.16:1** | ❌ (dekoratif kabul edilebilir) |
| Focus outline | `blue-500` #4A7BFF / `canvas` | **3.53:1** | ✅ |
| Focus outline | `blue-500` / `paper` | **3.79:1** | ✅ |
| Focus outline | `blue-500` / `navy-900` | **4.94:1** | ✅ |
| Switch kapalı | `ink-300` #B0B8CC / `paper` | **1.99:1** | ❌ |
| Switch açık | `blue-500` / `paper` | **3.79:1** | ✅ |
| Anlamlı ikon | `ink-300` / `paper` | **1.99:1** | ❌ |
| Kaydırma çubuğu | `line-strong` / `paper` | **1.50:1** | ❌ |
| Badge halkası | `green-50` / `green-50` | **1.00:1** | ❌ görünmez (`Badge.tsx:12`) |
| Badge halkası | `amber-50` / `amber-50` | **1.00:1** | ❌ görünmez (`Badge.tsx:13`) |
| Badge halkası | `rose-50` / `rose-50` | **1.00:1** | ❌ görünmez (`Badge.tsx:14`) |

#### `docs/design-system.md:54-58` iddialarının doğrulanması (F-52)

| Doküman iddiası | Hesaplanan | Fark |
|---|---|---|
| "critical rose comes in at **5.1:1 on `--canvas`**" | `rose-500` / `canvas` = **4.83:1** | −0.27, hâlâ AA ✅ ama beyan yanlış |
| "amber at **4.6:1**" | `amber-500` / `canvas` = **2.82:1** | **−1.78, AA'yı GEÇMİYOR** |
| "green at **4.5:1**" | `green-500` / `canvas` = **2.82:1** | **−1.68, AA'yı GEÇMİYOR** |
| "all WCAG AA" | 3 renkten 1'i geçiyor | **Yanlış beyan** |

**Ne yapılmalı:** `amber-500` ve `green-500` **yalnızca dekoratif** kullanımlarda kalabilir (nokta göstergeler, ikon dolgusu — hepsi `aria-hidden` ve metin eşlikçisi var). Doküman şu şekilde düzeltilmeli:

> Severity accents are desaturated by design. `rose-500` reaches 4.83:1 on `--canvas` (AA for text). `amber-500` (2.82:1) and `green-500` (2.82:1) are **decorative only** — dot indicators and icon fills that always sit next to a text label. For text and meaningful icons we use the `-700` shades, which clear AA on their `-50` backgrounds (amber 4.83:1, green 4.96:1, rose 6.79:1).

Bu, hem doğru hem de savunulabilir bir beyan — ve tasarım sistemini değiştirmeyi gerektirmiyor.

---

### 7.3 Önerilen token seti (v2)

Aşağıdaki `@theme` bloğu mevcut token'ları **korur**, eksikleri **ekler**, semantik bir katman **tanımlar**.

```css
@theme {
  /* ═══════════════════════════════════════════════════════════════
     1. HAM PALET (raw scale) — doğrudan kullanmayın, semantik katmanı kullanın
     ═══════════════════════════════════════════════════════════════ */

  /* --- Brand navy --- */
  --color-navy-50:  #EAEEF7;
  --color-navy-100: #C9D1E4;
  --color-navy-200: #94A1BF;
  --color-navy-300: #6E7EA6;   /* YENİ — navy-200 ile 500 arası boşluk */
  --color-navy-500: #2C3A60;
  --color-navy-600: #212C4B;   /* YENİ */
  --color-navy-700: #1A2542;
  --color-navy-800: #111A2E;
  --color-navy-900: #0B1220;

  /* --- Surfaces --- */
  --color-paper:    #FFFFFF;
  --color-canvas:   #F7F8FB;
  --color-canvas-2: #EFF2F8;
  --color-canvas-3: #E6EAF3;   /* YENİ — üçüncü inset seviyesi (kod blokları) */

  /* --- Ink (text) --- */
  --color-ink-900: #0E1422;
  --color-ink-800: #1B2233;    /* YENİ — 7 ölü kullanım vardı (F-30) */
  --color-ink-700: #2A3247;
  --color-ink-600: #4B5570;
  --color-ink-500: #626C87;
  --color-ink-400: #8892A6;    /* ⚠️ 3.08:1 — YALNIZ dekoratif */
  --color-ink-300: #B0B8CC;    /* ⚠️ 1.99:1 — YALNIZ dekoratif */
  --color-ink-200: #D5DAE6;    /* YENİ — ayırıcı çizgiler */
  --color-ink-100: #E9ECF3;    /* YENİ — 1 ölü kullanım vardı */

  /* --- Borders --- */
  --color-line:        #E4E8F0;   /* 1.23:1 — dekoratif kart kenarlığı */
  --color-line-strong: #CDD3E0;   /* 1.50:1 — vurgulu ayırıcı */

  /* --- Blue --- */
  --color-blue-50:  #EEF3FF;
  --color-blue-100: #DCE6FF;
  --color-blue-200: #BACCFF;   /* YENİ */
  --color-blue-500: #4A7BFF;
  --color-blue-600: #3563E6;
  --color-blue-700: #2A50BF;
  --color-blue-800: #1E3A8C;   /* YENİ */

  /* --- Green --- */
  --color-green-50:  #E8F5EE;
  --color-green-100: #CDE9DC;   /* YENİ */
  --color-green-200: #A5D6BF;   /* YENİ — 3 kullanım vardı */
  --color-green-500: #3FA67A;   /* ⚠️ 2.82:1 — dekoratif */
  --color-green-600: #348A65;   /* YENİ — 3 kullanım vardı */
  --color-green-700: #2A7556;
  --color-green-900: #16402F;   /* YENİ — 2 kullanım vardı */

  /* --- Purple (AI) --- */
  --color-purple-50:  #EFEDFE;
  --color-purple-100: #DDD8FC;
  --color-purple-200: #C4BCF8;  /* YENİ */
  --color-purple-500: #7A6CF0;
  --color-purple-600: #5E4FD9;
  --color-purple-700: #4A3EAD;  /* YENİ — 6 kullanım vardı */
  --color-purple-800: #382F82;  /* YENİ — 2 kullanım vardı */
  --color-purple-900: #26205A;  /* YENİ */

  /* --- Amber --- */
  --color-amber-50:  #FBF1DE;
  --color-amber-100: #F5E2BE;   /* YENİ — 4 kullanım vardı */
  --color-amber-200: #E9CE95;   /* YENİ — 3 kullanım vardı */
  --color-amber-500: #C28A2E;   /* ⚠️ 2.82:1 — dekoratif */
  --color-amber-600: #A87720;   /* YENİ — 3 kullanım vardı */
  --color-amber-700: #8C6217;
  --color-amber-800: #6B4A10;   /* YENİ — 1 kullanım vardı */
  --color-amber-900: #4A330A;   /* YENİ — 3 kullanım vardı */
  --color-amber-950: #2B1D05;   /* YENİ — 1 kullanım vardı */

  /* --- Rose --- */
  --color-rose-50:  #F8E5E9;
  --color-rose-100: #F0CBD3;    /* YENİ — 1 kullanım vardı */
  --color-rose-200: #E2A3AF;    /* YENİ — 3 kullanım vardı */
  --color-rose-500: #B7475A;
  --color-rose-600: #A03A4C;    /* YENİ — 4 kullanım vardı */
  --color-rose-700: #8A2F40;
  --color-rose-900: #4E1723;    /* YENİ — 2 kullanım vardı */

  /* ═══════════════════════════════════════════════════════════════
     2. SEMANTİK KATMAN — bileşenlerde BUNLARI kullanın
     ═══════════════════════════════════════════════════════════════ */

  /* Yüzeyler */
  --color-surface:         var(--color-paper);
  --color-surface-sunken:  var(--color-canvas);
  --color-surface-inset:   var(--color-canvas-2);
  --color-surface-code:    var(--color-canvas-3);
  --color-surface-inverse: var(--color-navy-900);

  /* Metin */
  --color-text:            var(--color-ink-900);
  --color-text-secondary:  var(--color-ink-600);
  --color-text-muted:      var(--color-ink-500);   /* 4.87:1 — en açık İZİNLİ metin */
  --color-text-inverse:    var(--color-paper);
  --color-text-link:       var(--color-blue-600);

  /* Kenarlıklar — 1.4.11'e göre AYRIŞTIRILMIŞ */
  --color-border:          var(--color-line);        /* dekoratif: kart, ayırıcı */
  --color-border-strong:   var(--color-line-strong); /* vurgulu ayırıcı */
  --color-border-field:    #9AA3B8;                  /* YENİ — 3.02:1, İNTERAKTİF kontroller */
  --color-border-focus:    var(--color-blue-500);    /* 3.53:1 ✅ */

  /* Severity — hem metin hem zemin */
  --color-severity-critical:    var(--color-rose-700);
  --color-severity-critical-bg: var(--color-rose-50);
  --color-severity-critical-ring: var(--color-rose-200);
  --color-severity-serious:     var(--color-amber-700);
  --color-severity-serious-bg:  var(--color-amber-50);
  --color-severity-serious-ring: var(--color-amber-200);
  --color-severity-moderate:    var(--color-amber-700);
  --color-severity-moderate-bg: var(--color-amber-50);
  --color-severity-minor:       var(--color-blue-700);
  --color-severity-minor-bg:    var(--color-blue-50);
  --color-severity-minor-ring:  var(--color-blue-200);
  --color-severity-review:      var(--color-purple-600);
  --color-severity-review-bg:   var(--color-purple-50);
  --color-severity-passed:      var(--color-green-700);
  --color-severity-passed-bg:   var(--color-green-50);

  /* Aksiyon */
  --color-action-primary:       var(--color-navy-900);
  --color-action-primary-hover: var(--color-navy-800);
  --color-action-accent:        var(--color-blue-600);  /* 500 DEĞİL: beyaz metin 4.86:1 */
  --color-action-ai:            var(--color-purple-600); /* 500 DEĞİL: beyaz metin 5.07:1 */
  --color-action-danger:        var(--color-rose-500);

  /* ═══════════════════════════════════════════════════════════════
     3. TİPOGRAFİ ÖLÇEĞİ — sabit px YOK (F-55)
     ═══════════════════════════════════════════════════════════════ */
  --text-3xs:      0.625rem;   /* 10px @16 — kicker, rozet */
  --text-3xs--line-height: 1.4;
  --text-2xs:      0.6875rem;  /* 11px — metadata */
  --text-2xs--line-height: 1.45;
  --text-xs:       0.75rem;    /* 12px */
  --text-sm:       0.875rem;   /* 14px — varsayılan UI */
  --text-base:     1rem;
  --text-lg:       1.125rem;
  --text-xl:       1.25rem;
  --text-2xl:      1.5rem;
  --text-3xl:      1.875rem;

  /* ═══════════════════════════════════════════════════════════════
     4. HAREKET
     ═══════════════════════════════════════════════════════════════ */
  --duration-instant: 80ms;    /* hover, renk geçişi */
  --duration-fast:    150ms;   /* disclosure, popover */
  --duration-normal:  200ms;   /* drawer, dialog */
  --duration-slow:    320ms;   /* sayfa içi büyük geçiş */
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);

  /* ═══════════════════════════════════════════════════════════════
     5. KATMANLAR
     ═══════════════════════════════════════════════════════════════ */
  --z-base:      0;
  --z-sticky:   20;   /* sayfa içi sticky aksiyon barları */
  --z-header:   30;   /* TopNav */
  --z-nav:      40;   /* MobileBottomNav, popover */
  --z-overlay:  50;   /* Dialog, drawer */
  --z-toast:    60;   /* gelecekteki toast sistemi */

  /* Radii ve shadow'lar değişmedi */
  --radius-sm: 6px;
  --radius:    10px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --shadow-soft: 0 1px 2px rgba(11, 18, 32, 0.04), 0 4px 12px rgba(11, 18, 32, 0.04);
  --shadow-card: 0 1px 2px rgba(11, 18, 32, 0.05), 0 6px 18px rgba(11, 18, 32, 0.05);
  --shadow-pop:  0 4px 12px rgba(11, 18, 32, 0.07), 0 14px 32px rgba(11, 18, 32, 0.08);

  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
}
```

**`data-contrast="high"` bloğuna eklenmesi gerekenler** (`:85-101`):

```css
html[data-contrast="high"] {
  /* … mevcut override'lar … */
  --color-ink-800: #0E1422;
  --color-ink-300: #2C3A60;
  --color-ink-200: #4B5570;
  --color-ink-100: #E0E4EE;
  --color-canvas-3: #E4E8F0;
  --color-border-field: #2C3A60;      /* 8.9:1 */
  --color-border: #6B7590;
  --color-text-muted: #2C3A60;
  --color-severity-critical-ring: #8A1322;
  --color-severity-serious-ring: #6F4500;
  --color-severity-minor-ring: #001F8C;
  --color-green-200: #14543A;
  --color-amber-200: #6F4500;
  --color-rose-200: #8A1322;
  --color-purple-700: #3F2DB7;
}
```

**Tailwind varsayılan palet sızıntısını kapatma seçeneği.** Tailwind v4'te `@theme` bir namespace'i tamamen sıfırlayabilir:

```css
@theme {
  /* Kullanmadığımız tüm varsayılan renkleri kapat: yanlışlıkla
     text-teal-400 yazan biri build hatası alsın, sessizce çalışmasın. */
  --color-slate-*: initial;
  --color-gray-*: initial;
  --color-zinc-*: initial;
  --color-neutral-*: initial;
  --color-stone-*: initial;
  --color-red-*: initial;
  --color-orange-*: initial;
  --color-yellow-*: initial;
  --color-lime-*: initial;
  --color-emerald-*: initial;
  --color-teal-*: initial;
  --color-cyan-*: initial;
  --color-sky-*: initial;
  --color-indigo-*: initial;
  --color-violet-*: initial;
  --color-fuchsia-*: initial;
  --color-pink-*: initial;
  /* blue/green/amber/rose/purple KAPATILMAZ — kendi tonlarımızı
     üzerine yazıyoruz ve tanımsız tonlar §5.30 script'i ile yakalanıyor. */
}
```

> ⚠️ Bu değişiklik yıkıcıdır: koddaki her tanımsız `slate-*`, `gray-*` vb. kullanımı **derlenmez hale gelir**. `npm run build` ile önce etkisi ölçülmelidir. Alternatif ve daha güvenli yol: §5.30'daki `check-tokens.mjs` script'i (build'i kırmadan CI'da uyarır).

---

### 7.4 Tanımsız token kullanımlarının tam listesi (F-30 + F-31)

#### A. Ölü sınıflar — marka namespace'inde tanımsız ton (hiçbir CSS üretilmiyor)

| Token | Kullanım sayısı | Konumlar |
|---|---|---|
| `ink-800` | **7** | `settings/billing/page.tsx:58` · `statement-client.tsx:241` · `scan-report-actions.tsx:193` · `compare/page.tsx:82` (`hover:bg-`) · `monitors-manager.tsx:189` · `scans/[id]/page.tsx:619` · `ManualReviewChecklist.tsx:326` |
| `ink-100` | **1** | `ManualReviewChecklist.tsx:326` (`bg-ink-100`) |

**Etki:** Bu sınıflar hiçbir stil üretmiyor. `hover:bg-ink-800` → hover'da **hiçbir şey olmuyor** (`compare/page.tsx:82` "Start a scan" butonu). `text-ink-800` → renk miras alınıyor (genelde `ink-900`, görünürde sorun yok ama tasarım niyeti kayboluyor).

#### B. Tailwind varsayılan paletine sızıntı — marka rengiyle çakışan tonlar

| Token | Tailwind v4 varsayılanı | Marka tonu (yakın) | Kullanım | Konumlar |
|---|---|---|---|---|
| `amber-100` | `#FEF3C7` (canlı sarı) | — | **4** | `IssueGroupSection.tsx:54` · `ai-assistant-client.tsx:667,668,670` |
| `amber-200` | `#FDE68A` | — | **3** | `FailedPagesNotice.tsx:14` · `invite-section.tsx:162` · `scans/[id]/page.tsx:175` |
| `amber-600` | `#D97706` | `amber-700` #8C6217 | **3** | `statement-client.tsx:364,439` · `ai-assistant-client.tsx:672` |
| `amber-800` | `#92400E` | `amber-700` | **1** | `IssueGroupSection.tsx:54` |
| `amber-900` | `#78350F` | — | **3** | `FailedPagesNotice.tsx:21` · `invite-section.tsx:162` · `scans/[id]/page.tsx:175` |
| `amber-950` | `#451A03` | — | **1** | `FailedPagesNotice.tsx:14` |
| `rose-100` | `#FFE4E6` | — | **1** | `progress-client.tsx:311` |
| `rose-200` | `#FECDD3` | — | **3** | `ManualReviewChecklist.tsx:349` · `invite-section.tsx:219` · `plan-picker.tsx:115` |
| `rose-600` | `#E11D48` (**canlı kırmızı**) | `rose-500` #B7475A | **4** | `monitors-manager.tsx:182,253` · `monitor-scan-button.tsx:60` · `compare/page.tsx:346` |
| `rose-900` | `#881337` | `rose-700` #8A2F40 | **2** | `invite-section.tsx:219` · `plan-picker.tsx:115` |
| `green-100` | `#DCFCE7` | — | **3** | `ai-assistant-client.tsx:675,676,678` |
| `green-200` | `#BBF7D0` | — | **3** | `ManualReviewChecklist.tsx:338` · `invite-section.tsx:224` · `plan-picker.tsx:120` |
| `green-600` | `#16A34A` (**canlı yeşil**) | `green-700` #2A7556 | **3** | `monitor-scan-button.tsx:53` · `compare/page.tsx:345` · `ai-assistant-client.tsx:680` |
| `green-900` | `#14532D` | `green-700` | **2** | `invite-section.tsx:224` · `plan-picker.tsx:120` |
| `purple-200` | `#E9D5FF` (mor değil, **violet**) | — | **1** | `ai-assistant-client.tsx:336` |
| `purple-700` | `#7E22CE` (**canlı mor**) | `purple-600` #5E4FD9 (**indigo-mor**) | **6** | `TopNav.tsx:202` · `AiSuggestionBlock.tsx:39` · `ai-panel.tsx:110,204` · `ai-assistant-client.tsx:685,686` |
| `purple-800` | `#6B21A8` | `purple-600` | **2** | `ManualReviewChecklist.tsx:294` · `statement-client.tsx:218` |
| `purple-900` | `#581C87` | — | **1** | `ai-assistant-client.tsx:336` |

**Toplam: 19 farklı tanımsız ton, 46 kullanım, 16 dosya.**

**En görünür marka hasarı:**
1. `text-purple-700` — Tailwind'in `#7E22CE`'si **mor** (magenta yönlü), marka `purple-600` `#5E4FD9` **indigo-mor** (mavi yönlü). İkisi `AiSuggestionBlock.tsx`'te **aynı bileşende yan yana** (`:30` `text-purple-600` başlık, `:39` `text-purple-700` footer). Bu, her AI yüzeyinde görülen bir renk uyumsuzluğu.
2. `text-rose-600` — `#E11D48` canlı kırmızı. `docs/design-system.md:52` "never pure red" diyor; `monitors-manager.tsx:182` hata mesajı tam olarak bunu yapıyor.
3. `text-green-600` — `#16A34A` canlı yeşil. `compare/page.tsx:345` iyileşme göstergesi "başarı yeşili" değil "neon yeşil".

#### C. Görünmez halkalar (aynı renk zemin + ring)

| Konum | Sınıf | Sonuç |
|---|---|---|
| `Badge.tsx:12` | `bg-green-50 ring-green-50` | Halka görünmez (1.00:1) |
| `Badge.tsx:13` | `bg-amber-50 ring-amber-50` | Görünmez |
| `Badge.tsx:14` | `bg-rose-50 ring-rose-50` | Görünmez |
| `AlertCallout.tsx:16` | `bg-green-50 ring-green-50` | Görünmez |
| `AlertCallout.tsx:25` | `bg-amber-50 ring-amber-50` | Görünmez |
| `AlertCallout.tsx:33` | `bg-rose-50 ring-rose-50` | Görünmez |
| `progress-client.tsx:309` | `bg-green-50 ring-green-50` | Görünmez |
| `scans/[id]/page.tsx:445-447` | `bg-rose-50 ring-rose-50`, `bg-amber-50 ring-amber-50` | Görünmez |
| `delete-actions.tsx:91` | `ring-rose-50` | Görünmez |

Bu, salt görsel bir hata değil: `AlertCallout` ve `Badge` kenarlığı 1.4.11 açısından da yok sayılıyor. `-200` tonlarına geçirildiğinde hem görünür hem 3:1 uyumlu olur (yeni `rose-200` #E2A3AF / `rose-50` #F8E5E9 ≈ **1.9:1** — hâlâ 3:1 değil ama halka kartın **dış** kenarında, `paper` üzerinde: #E2A3AF / #FFFFFF = **2.5:1**; 3:1 için `-300` gerekir). **Karar:** kart/badge kenarlıkları "dekoratif" sayılır (1.4.11 istisnası: içeriğin anlaşılması için gerekli değil, zemin rengi zaten ayrıştırıyor) → `-200` yeterli, ama form kontrolleri için `--color-border-field` (3.02:1) zorunlu.

---

### 7.5 Sabit piksel tipografi (F-55) — tam liste ve göç planı

**88 kullanım / 36 dosya.** En yoğun dosyalar:

| Dosya | Adet |
|---|---|
| `app/page.tsx` (landing) | 12 |
| `ai-assistant-client.tsx` | 8 |
| `scans/[id]/page.tsx` | 7 |
| `ManualReviewChecklist.tsx`, `statement-client.tsx` | 5 |
| `TopNav.tsx`, `compliance/page.tsx`, `reports/builder/page.tsx`, `scans/new/page.tsx` | 4 |
| `NotificationsBell.tsx` | 3 |
| `IssueCard.tsx` | 3 |
| diğer 26 dosya | 1–2 |

**Göç:** iki adımda, tek bir düzenli ifade ile:

```bash
# 1) 10px → --text-3xs
grep -rl 'text-\[10px\]' src/ | xargs sed -i '' 's/text-\[10px\]/text-3xs/g'
# 2) 11px → --text-2xs
grep -rl 'text-\[11px\]' src/ | xargs sed -i '' 's/text-\[11px\]/text-2xs/g'
```

`@theme` içindeki `--text-3xs: 0.625rem` ve `--text-2xs: 0.6875rem` sayesinde Tailwind `text-3xs`/`text-2xs` utility'lerini üretir ve **rem tabanlı** oldukları için `html[data-text-size="lg"]` (`font-size: 115%`) onları da büyütür.

**Yan fayda:** `text-3xs`/`text-2xs` adları anlamlı; `text-[10px]` yalnızca bir sayı. Yeni geliştirici hangi durumda hangisini kullanacağını dokümandan öğrenebilir.

**⚠️ 10px hâlâ küçük.** `docs/design-system.md:79` "`text-[10px]` reserved for kicker uppercase labels only, with tracking" diyor ve bu kural kodda **çoğunlukla** korunmuş. Ama 10px, `data-text-size="sm"` (%90) ile birleştiğinde **9px** olur. Öneri: `--text-3xs`'i `0.6875rem` (11px) yapıp `--text-2xs`'i kaldırmak — tek bir "en küçük" boyut. Bu, tasarımı görünür şekilde değiştirir; ürün ekibiyle kararlaştırılmalı.

---

### 7.6 `src/components/ui/*` bileşen denetimi

Her bileşen için: **API tutarlılığı · eksik varyantlar · eksik state'ler · a11y gereksinimleri.**

#### `Button.tsx`

| Konu | Durum |
|---|---|
| **API** | ✅ `cva` + `forwardRef` + `ButtonHTMLAttributes` — projedeki en olgun bileşen |
| **Varyantlar** | 8 (primary, secondary, ghost, accent, ai, danger, outline, link) ✅ |
| **Boyutlar** | sm 36 / md 44 / lg 48 / icon 44 ✅ 2.5.8 uyumlu |
| **Eksik state: `loading`** | ❌ Her çağrı yerinde elle `{busy ? <Loader2/> : …}` yazılıyor (7 farklı yerde). **Öneri:** `loading?: boolean` + `loadingLabel?: string` prop'u |
| **Eksik state: `disabled` görsel** | ⚠️ `disabled:opacity-50` — opacity ile devre dışı göstermek kontrastı düşürür. WCAG disabled kontrolleri 1.4.3'ten muaf ✅ ama okunabilirlik zayıf |
| **Eksik varyant: `secondary-danger`** | Yıkıcı ama ikincil aksiyonlar için (`Revoke`, `Remove`) — şu an `text-rose-700 ring-line` elle yazılıyor |
| **A11y** | ✅ `focus-visible:outline-2 outline-offset-2 outline-blue-500` yerleşik. ⚠️ `variant="link"` `hover:underline` — kalıcı `underline` olmalı (F-51) |
| **`accent` kontrastı** | ❌ `bg-blue-500` + `text-paper` = 3.79:1, 14px metin için yetersiz. `bg-blue-600` (4.86:1) olmalı |
| **`ai` kontrastı** | ⚠️ `bg-purple-500` + `text-paper` = 4.46:1, 4.5:1'in altında. `bg-purple-600` (5.07:1) olmalı |

**Önerilen `loading` prop'u:**

```tsx
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, loadingLabel, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  )
);
```

`aria-busy` kritik: ekran okuyucuya "bu kontrol şu an çalışıyor" der.

#### `Card.tsx`

| Konu | Durum |
|---|---|
| **API** | ✅ Tutarlı: Card / Header / Title / Description / Content / Footer |
| **Eksik: `as` prop (CardTitle)** | ❌ F-19 · §5.19 |
| **Eksik varyant: `interactive`** | Karta tıklanabilirlik verildiğinde (`IssueCard` deseni) hover/focus stilleri elle yazılıyor |
| **Eksik varyant: `tone`** | `AlertCallout`'a benzer tonlu kartlar 4 yerde elle (`compliance/page.tsx:220`, `ai-panel.tsx:107`, `statement-client.tsx:216`) |
| **A11y** | ✅ Card kendisi semantic-nötr `<div>` — doğru. Bölüm anlamı gerektiğinde çağrı yeri `<section aria-labelledby>` sarmalı |
| **`CardFooter` `rounded-b-lg`** | ⚠️ Card `rounded-lg` ama footer `rounded-b-lg` — Card'a `overflow-hidden` verilirse gereksiz; verilmezse doğru. Tutarsız kullanım riski |

#### `Badge.tsx`

| Konu | Durum |
|---|---|
| **API** | ✅ `cva`, 7 ton × 2 boyut |
| **Ring sorunu** | ❌ 3 tonda görünmez halka (§7.4-C) |
| **Eksik: `dot` varyantı** | Durum noktası + metin kombinasyonu 5 yerde elle yazılıyor (`progress-client.tsx:224-233`, `app/page.tsx:193,197,201`) |
| **A11y** | ⚠️ `Badge` bir `<span>` — durum bilgisi taşıdığında (`plan`, `status`) çevresindeki metinle bağlamı olmalı. `scans/[id]/page.tsx:194` `<Badge className="font-mono">{scan.id}</Badge>` — bu bir "rozet" değil, kimlik metni. Semantik yanlış kullanım |
| **`size="sm"` `text-[10px]`** | ❌ F-55 · 10px rozet metni, `data-text-size="sm"` ile 9px |

#### `Input.tsx` (Input / Textarea / Select / Label / FieldHint / FieldError)

| Konu | Durum |
|---|---|
| **API** | ⚠️ `Label` `htmlFor` alıyor ama `Input` `id`'yi otomatik üretmiyor → elle eşleştirme (40+ yerde) |
| **`FieldError` kullanımı** | ❌ Tanımlı, **hiç import edilmemiş** (F-58) |
| **`FieldHint` `id`** | ❌ Yok → `aria-describedby` imkânsız (F-37) |
| **`aria-invalid`** | ❌ Hiçbir yerde |
| **Kenarlık kontrastı** | ❌ `ring-line` = 1.23:1 (F-59) → `ring-border-field` |
| **Eksik: `Field` sarmalayıcı** | §5.37'de öneriliyor |
| **`Select` ok ikonu** | ⚠️ Inline SVG data-URI'de `stroke="%234B5570"` (`ink-600`) **hardcoded** → `data-contrast="high"` modunda değişmiyor. `appearance-none` yerine `background-image` CSS değişkeniyle: `background-image: var(--select-chevron)` |
| **`Textarea` `min-h-[88px]`** | ✅ |
| **A11y — `required`** | ⚠️ `Label` `required` prop'u `<span aria-hidden>*</span>` render ediyor ✅ doğru (yıldız duyurulmuyor) ama `Input`'a `required` attribute'u ayrıca verilmeli — otomatik değil |

#### `Checkbox.tsx` / `Switch.tsx`

| Konu | Durum |
|---|---|
| **id üretimi** | ❌ `Math.random()` (F-07) → `useId()` §5.7 |
| **`description` bağlantısı** | ❌ `aria-describedby` yok (§5.7'de ekleniyor) |
| **Kenarlık** | ❌ `ring-line-strong` = 1.50:1 → `ring-border-field` |
| **`Switch` kapalı hâli** | ❌ `bg-ink-300` = 1.99:1 → `bg-ink-400` (3.08:1) veya `bg-border-field` (3.02:1) |
| **`Checkbox` tıklama alanı** | ✅ `<label>` sarmalıyor → tüm satır tıklanabilir |
| **`Switch` `role="switch"`** | ✅ |
| **Eksik: `indeterminate`** | Checkbox'ta yok — "tümünü seç" desenine gerek olursa |
| **Eksik: `error` state** | İkisinde de yok |

#### `Tabs.tsx`

| Konu | Durum |
|---|---|
| **Klavye** | ❌ F-13 → §5.13 |
| **`aria-label`** | ❌ `TabsList`'te yok → §5.13'te zorunlu prop |
| **`aria-orientation`** | ❌ |
| **`activationMode`** | ❌ Yok → §5.13'te ekleniyor |
| **`aria-controls`/`id`** | ✅ **Doğru** — `useId()` ile |
| **Panel `focus:outline-none`** | ❌ `tabIndex={0}` ile odaklanabilir ama outline yok → §5.13'te `focus-visible:outline` |
| **Eksik varyant: `vertical`** | Settings'te dikey sekmeler mantıklı olabilir |

#### `Dialog.tsx`

| Konu | Durum |
|---|---|
| **Focus trap** | ❌ F-02 → §5.2 |
| **Kullanım** | ❌ **0 kullanım** — 3 ad-hoc desen var (F-29) |
| **`role` konumu** | ❌ Overlay'de, panel'de olmalı |
| **Sabit ID** | ❌ `dlg-title` |
| **Scroll lock** | ⚠️ Var ama scrollbar telafisi yok → layout shift |
| **`flex-col-reverse`** | ⚠️ WCAG 1.3.2 riski |
| **Eksik: `ConfirmDialog`** | §5.2'de ekleniyor |
| **Eksik: portal** | Arka plan `inert` yapılamıyor |

#### Eksik olan bileşenler (konsolidasyon fırsatları)

| Öneri | Yerini alacağı ad-hoc desenler |
|---|---|
| `SegmentedRadio` (§5.12) | `A11ySettingsPanel` `SegGroup` · `reports/builder/page.tsx:217-232` · `ai-assistant-client.tsx:183,284,329` · `compliance/page.tsx:216` |
| `ConfirmDialog` (§5.2) | `monitors-manager.tsx:116` · `delete-actions.tsx:87-131` · `states/page.tsx:139-166` |
| `Field` (§5.37) | 40+ elle `Label`+`Input`+`FieldHint` üçlüsü |
| `CopyButton` | `CodeDiffBlock` içindeki kopyala + `scan-report-actions.tsx:193-200` + issue detay `<pre>` |
| `LiveRegion` / `AnnouncerProvider` (§5.1) | Yok — 8 mutasyon noktası sessiz |
| `SubmitButton` (§5.48) | `workspace/setup` + `settings-client` |
| `Skeleton` | 8 farklı `loading.tsx`'te `bg-canvas-2` blokları elle |
| `Pagination` | §5.28'de rapor sayfası için gerekiyor |
| `Breadcrumb` | Issue detayı + rapor + compare sayfalarında elle `←` linkleri |
| `EmptyState tone="error"` | Var olan `EmptyState` 3 ton destekliyor, hata tonu yok |

---

### 7.7 Bileşen çoğaltmalarının konsolidasyon planı

| Amaç | Kanonik | Çoğaltmalar | Aksiyon | Sprint |
|---|---|---|---|---|
| **Onay modalı** | `ui/Dialog` → `ui/ConfirmDialog` | Native `confirm()` `monitors-manager.tsx:116` · Inline expand `delete-actions.tsx:87-131` · Kopya markup `states/page.tsx:139-166` | §5.2 + §5.29 | 1 |
| **Uyarı kutusu** | `feedback/AlertCallout` | `invite-section.tsx:162,219,224` · `plan-picker.tsx:114-123` · `scans/[id]/page.tsx:175-186` · `monitors-manager.tsx:182` · `FailedPagesNotice.tsx:14` | §5.29 + ESLint kuralı | 1 |
| **Sekme grubu** | `ui/Tabs` | `ai-panel.tsx:176-197` | §5.13 | 1 |
| **Segmented seçim** | **Yeni** `ui/SegmentedRadio` | `A11ySettingsPanel.tsx:7-53` · `reports/builder/page.tsx:217-232` · `ai-assistant-client.tsx:183-209,284-299,329-342` · `compliance/page.tsx:216-233` | §5.12 | 1-2 |
| **Boş durum** | `empty/EmptyState` | `monitors-manager.tsx:186-193` · `compare/page.tsx:66-87` · `reports/preview/page.tsx:70-79` · `scans/[id]/page.tsx:241-248` · `ai-assistant-client.tsx:173-177` | Doğrudan değiştir | 2 |
| **Birincil buton** | `ui/Button variant="primary"` | ~25 elle yazılmış `bg-navy-900 text-paper hover:bg-navy-800 h-10/h-11 px-3.5/px-4 rounded-md` | Doğrudan değiştir + ESLint | 2 |
| **`hostFromUrl()`** | **Yeni** `lib/utils.ts` export | 6 kopya: `app/page.tsx:329` · `scans/[id]/page.tsx:502` · `progress-client.tsx:457` · `remediation/page.tsx:209` · `reports/builder/page.tsx:325` · `reports/preview/page.tsx:82` | Tek fonksiyona taşı | 1 |
| **`legacyScore()`** | **Yeni** `lib/scanner/scoring.ts` | 2 kopya: `app/page.tsx:270-287` · `scans/[id]/page.tsx:635-654` — **ve ikisi FARKLI** (biri `serious` sayıyor, diğeri saymıyor) → **skor tutarsızlığı bug'ı** | Tek fonksiyon, `scoring.test.ts` zaten var | 1 |
| **Kod bloğu** | `ai/CodeDiffBlock` | `issues/[issueId]/page.tsx:79` ham `<pre>` · `statement-client.tsx:241` | `CodeBlock` bileşenine ayır | 3 |
| **Hata mesajı sözlüğü** | **Yeni** `lib/errors/messages.ts` | `scans/new/page.tsx:362-405` (kanonik) · 8 dosyada `body.message \|\| body.error` | §5.62 | 2 |

> ⚠️ **`legacyScore` tutarsızlığı yeni bir bug.** `app/app/page.tsx:270-287` `serious` şiddetini hiç saymıyor (`counts` nesnesinde bile yok, `:35`), `scans/[id]/page.tsx:635-654` sayıyor (`:648`). Aynı tarama, dashboard'da ve rapor sayfasında **farklı skor** gösterebilir. Bu, `getScanSummary` mevcut olduğunda gizleniyor (`?? legacyScore(counts)`) ama eski taramalarda görünür. → **F-63** olarak kaydedilmeli.

---

### 7.8 `docs/design-system.md` ↔ kod sapmalarının tam listesi

| # | Doküman satırı | İddia | Gerçek | Hangisi düzeltilecek |
|---|---|---|---|---|
| 1 | `:37` | `ink-500` = `#6B7590` | `globals.css:20` = `#626C87` | **Doküman** |
| 2 | `:54-58` | rose 5.1:1 / amber 4.6:1 / green 4.5:1, "all WCAG AA" | 4.83 / 2.82 / 2.82 — biri geçiyor | **Doküman** (F-52, §7.2'deki yeni metin) |
| 3 | `:103` | Button "8 variants … Min height 36/44/48/44" | ✅ Doğru (`Button.tsx:26-31`) | — |
| 4 | `:108` | Checkbox "accessible custom check with hidden-input pattern" | ✅ Desen doğru, ⚠️ id `Math.random()` | **Kod** (F-07) |
| 5 | `:109` | Switch "labeled switch with description support, ARIA role=switch" | ✅ Ama `description` `aria-describedby` ile bağlı değil | **Kod** (§5.7) |
| 6 | `:110` | Tabs "full ARIA tablist **with keyboard support**" | ❌ Klavye desteği yok | **Kod** (F-13) |
| 7 | `:111` | Dialog "Escape to close, **focus trap**, scroll lock" | Escape ✅ scroll lock ⚠️ focus trap ❌; **bileşen hiç kullanılmıyor** | **Kod** (F-02) + **Doküman** ("used by ConfirmDialog" notu) |
| 8 | `:115` | Logo "wordmark / mark / lockup / wordmark-light variants" | 🔬 Doğrulanmadı — `Logo.tsx` tam okunmadı | Doğrula |
| 9 | `:116` | `ProductBadge` — "the Percevia AI purple chip" | `Logo.tsx:55-62` içinde tanımlı görünüyor ama ayrı bileşen değil | **Doküman** |
| 10 | `:126` | ScanScoreRing "accessible label" | ✅ `role="img"` + `aria-label` | — |
| 11 | `:135` | `ConsentCard` — "title + description + optional switch + optional status badge" | Dosya var (`compliance/ConsentCard.tsx`) 🔬 kullanımı doğrulanmadı | Doğrula |
| 12 | `:157` | EmptyState "single component handles all 6 empty scenarios" | ❌ 5 ad-hoc kopya var (§7.7) | **Kod** |
| 13 | `:176-178` | "The **marquee** on Landing uses a pause-aware utility class (`marquee-track`)" | Landing'de marquee yok; CSS ölü (`globals.css:196-200`) | **İkisi de** — CSS'i sil, dokümandan çıkar (F-41) |
| 14 | `:187` | Forms: "**`aria-describedby`** for hints/errors" | ❌ Hiçbir yerde | **Kod** (F-37, F-58) |
| 15 | `:187` | "submit gated when consent is required (Onboarding, New Scan)" | ✅ Doğru (`onboarding-client.tsx:27`, `scans/new/page.tsx:45-49`) | — |
| 16 | `:191` | "All interactive controls **≥ 44 × 44 px** tap target on mobile" | 32/36/40 px yaygın; bazı inline linkler <24 px | **Doküman**: "≥24×24 zorunlu (WCAG 2.5.8 AA), ≥44×44 hedef, birincil eylemlerde zorunlu" (F-53) |
| 17 | `:192` | "Animations gated on `prefers-reduced-motion` and a user override" | ✅ Doğru ve iyi | — |
| 18 | `:193` | "Print stylesheet for the Client Report — nav hidden, disclaimer preserved" | ✅ `globals.css:157-162`; ⚠️ "disclaimer preserved" doğrulanmadı | Doğrula |
| 19 | `:199` | "One **primary action** per screen (the navy button)" | ❌ `scans/[id]/page.tsx:152-167` — 5 aksiyon, biri navy (`ScanReportActions` içinde) + `app/page.tsx:63-78` 2 tane | **Kod** (§6.4) |
| 20 | `:201-202` | Disclaimers "always via a component — NoGuaranteeBanner, HumanReviewBanner, **`DisclaimerCard` (in reports)**" | `DisclaimerCard` diye bir bileşen **yok** (glob → 0) | **Doküman** |
| 21 | `:203` | "Severity badges always use `SeverityBadge`, never raw colored pills" | ❌ `scans/[id]/page.tsx:437-456` `SeverityStat` ham renkli kutular · `IssueGroupSection.tsx:50-59` ham sayı pill'i | **Kod** veya **Doküman** (SeverityStat farklı bir amaca hizmet ediyor — dokümana "severity **counts** use SeverityStat" satırı eklenebilir) |
| 22 | `:204` | "WCAG references always via `WcagBadge`" | ✅ `IssueCard.tsx:49`, `issues/[issueId]/page.tsx:54` ✅. ⚠️ `scans/[id]/page.tsx:338` `g.primaryWcagTag` ham `<span className="uppercase">` | **Kod** |
| 23 | `:207` | "at the scale of 18 screens" | 27 rota var (§2) | **Doküman** |
| 24 | `:70` | "The app does not depend on Google Fonts during build" | ✅ `globals.css:63` sistem fallback stack; `next/font` kullanımı yok | — |
| 25 | `:73` | "User text size: 90% / 100% / 115%" | ✅ ama 88 sabit-px metin etkilenmiyor | **Kod** (F-55) |

**Özet:** 25 kontrol edilen iddiadan **11'i kodla uyuşmuyor**. 6'sı doküman düzeltmesiyle, 5'i kod düzeltmesiyle kapanır. Bir tasarım sistemi dokümanı için %44 sapma oranı yüksektir — ve bu, **erişilebilirlik iddialarında** yoğunlaşıyor (6, 7, 14, 16), ki bu ürün için en hassas bölge.

**Öneri:** `docs/design-system.md`'ye bir "Verified by" bölümü eklensin:

```markdown
## Doğrulama

Bu dokümandaki teknik iddialar CI'da otomatik test edilir:
- Kontrast oranları → `npm run check:contrast` (scripts/check-contrast.mjs)
- Token tanımları  → `npm run check:tokens`   (scripts/check-tokens.mjs)
- Bileşen a11y     → `npm run test:e2e -- --grep @a11y`
- Tap target'lar   → e2e/a11y/target-size.spec.ts

Son doğrulama: <CI tarafından güncellenir>
```

---

### 7.9 Ölçüm script'i: kontrast doğrulaması

`scripts/check-contrast.mjs` — `globals.css`'ten token'ları okuyup dokümandaki iddiaları test eder:

```js
import { readFileSync } from "node:fs";

const css = readFileSync("src/app/globals.css", "utf8");
const tokens = Object.fromEntries(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]])
);

const srgb = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** [ön plan, arka plan, minimum, açıklama] */
const CHECKS = [
  ["ink-900", "canvas", 4.5, "body text on app background"],
  ["ink-700", "paper", 4.5, "headings on cards"],
  ["ink-600", "canvas", 4.5, "secondary text"],
  ["ink-500", "paper", 4.5, "metadata / placeholder"],
  ["blue-600", "canvas", 4.5, "links"],
  ["blue-700", "blue-50", 4.5, "info badge"],
  ["green-700", "green-50", 4.5, "success badge"],
  ["amber-700", "amber-50", 4.5, "warning badge"],
  ["rose-700", "rose-50", 4.5, "danger badge"],
  ["purple-600", "purple-50", 4.5, "AI badge"],
  ["paper", "navy-900", 4.5, "primary button"],
  ["paper", "rose-500", 4.5, "danger button"],
  ["paper", "blue-600", 4.5, "accent button"],
  ["paper", "purple-600", 4.5, "AI button"],
  // Non-text (1.4.11)
  ["border-field", "paper", 3.0, "form control border"],
  ["blue-500", "canvas", 3.0, "focus outline on app background"],
  ["blue-500", "paper", 3.0, "focus outline on cards"],
  ["blue-500", "navy-900", 3.0, "focus outline on primary button"],
];

let failed = 0;
for (const [fg, bg, min, label] of CHECKS) {
  const a = tokens[fg];
  const b = tokens[bg];
  if (!a || !b) {
    console.error(`✗ ${label}: token missing (${fg} or ${bg})`);
    failed++;
    continue;
  }
  const r = ratio(a, b);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(
    `${ok ? "✓" : "✗"} ${r.toFixed(2)}:1  (need ${min}:1)  ${fg} on ${bg} — ${label}`
  );
}

if (failed) {
  console.error(`\n${failed} contrast check(s) failed.`);
  process.exit(1);
}
console.log("\nAll contrast checks passed.");
```

`package.json`: `"check:contrast": "node scripts/check-contrast.mjs"`, CI'da `npm run lint` sonrası.

**Bu script'in değeri:** Tasarım sistemi dokümanındaki kontrast iddiaları artık **her commit'te doğrulanıyor**. F-52 bir daha oluşamaz. Ve bu, satış görüşmesinde gösterilebilecek bir şey: *"Kendi kontrast oranlarımızı CI'da test ediyoruz."*

---

## 8. Hareket, Geçiş ve Algılanan Performans

### 8.1 `prefers-reduced-motion` desteği — mevcut durum

**Grep sonucu:** `globals.css:103-121` — **iki katmanlı destek var ve doğru kurgulanmış.**

```css
html[data-motion="reduced"] *,
html[data-motion="reduced"] *::before,
html[data-motion="reduced"] *::after { … }         /* kullanıcı override'ı */

@media (prefers-reduced-motion: reduce) { … }       /* OS tercihi */
```

Bu, denetlenen çoğu üründen iyi — OS tercihi **ve** uygulama içi override birlikte. `A11yProvider.tsx:45-55` `<html data-motion>` yazıyor ✅.

**Eksikler:**

| Eksik | Etki | Düzeltme |
|---|---|---|
| `transition-duration: 0.001ms !important` **tüm** geçişleri öldürüyor | Focus halkası geçişi, disclosure açılışı gibi *yardımcı* hareketler de kayboluyor. WCAG "non-essential" der — kullanıcıya konum değişimini anlatan kısa geçişler yararlıdır | `!important` yerine `--duration-*` token'larını sıfırla: `html[data-motion="reduced"] { --duration-instant: 0ms; --duration-fast: 0ms; --duration-normal: 0ms; --duration-slow: 0ms; }` — bileşenler token kullanırsa otomatik uyum sağlar |
| JS animasyonları kapsanmıyor | `router.push` sonrası scroll davranışı, `scrollIntoView({behavior:"smooth"})` | `const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches \|\| document.documentElement.dataset.motion === "reduced"` |
| `A11yProvider` hydration'da flash | `useState(() => readPrefs())` client'ta çalışır; ilk sunucu render'ında `data-motion=""` → animasyonlar bir kare oynayabilir | `<script>` ile `<head>`'de erken uygulama (aşağıda) |
| Motion ayarı keşfedilebilir değil | Settings → Accessibility sekmesinin içinde, 3 tık uzakta | Footer'a veya TopNav hesap menüsüne kısayol |

**Erken uygulama script'i** (`app/layout.tsx`, `<head>` içinde — FOUC/flash önler):

```tsx
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=JSON.parse(localStorage.getItem("percevia:a11y")||"{}");var d=document.documentElement;if(p.textSize&&p.textSize!=="md")d.dataset.textSize=p.textSize;if(p.contrast&&p.contrast!=="default")d.dataset.contrast=p.contrast;if(p.motion&&p.motion!=="default")d.dataset.motion=p.motion;}catch(e){}})();`,
          }}
        />
      </head>
```

Bu, `suppressHydrationWarning` (`layout.tsx:31`) ile birlikte çalışır ✅ — zaten oradaki `suppressHydrationWarning` tam olarak bu amaçla konmuş görünüyor ama script eksik.

**Kullanılan animasyonların envanteri:**

| Animasyon | Konum | Reduced-motion'da |
|---|---|---|
| `.pulse-dot` (1.6s sonsuz) | `globals.css:194`; `progress-client.tsx:230,334` | ✅ Durur |
| `animate-pulse` (iskeletler) | `app/app/loading.tsx:4`, önerilen tüm `loading.tsx`'ler | ✅ Durur |
| `animate-spin` (Loader2) | 7 yerde | ⚠️ **Durmamalı** — dönen spinner "çalışıyor" bilgisini taşıyor. `!important` ile durduruluyor → reduced-motion kullanıcısı donmuş bir spinner görüyor. **Düzeltme:** `.animate-spin { animation-duration: 1.2s !important; }` istisna kuralı, veya spinner yerine metin ("Working…") |
| `transition-colors` | ~40 yerde | ✅ Durur (kabul edilebilir) |
| `transition-transform` (`Switch` topuzu, `ChevronDown` `group-open:rotate-180`) | `Switch.tsx:42`, `remediation/page.tsx:88` | ✅ Durur (anlık geçiş, kabul edilebilir) |
| `transition-shadow` (`IssueCard` hover) | `IssueCard.tsx:23` | ✅ |
| `backdrop-blur` | `TopNav.tsx:88`, `Dialog.tsx:43`, `MobileBottomNav.tsx:22` | Animasyon değil, etkilenmez ✅ |
| `.marquee-track` (40s sonsuz) | `globals.css:200` — **ölü kod** | — |

**Spinner istisnası** — `globals.css`'e:

```css
/*
 * İstisna: yükleme göstergesi hareketi "dekoratif" değil, BİLGİDİR.
 * Tamamen durdurmak kullanıcıya "donmuş" izlenimi verir. Yavaşlatıyoruz.
 */
html[data-motion="reduced"] .animate-spin,
@media (prefers-reduced-motion: reduce) {
  .animate-spin { animation-duration: 1.5s !important; }
}
```

> ⚠️ Yukarıdaki CSS geçerli değil (`@media` ve seçici birleştirilemez). Doğrusu:
> ```css
> html[data-motion="reduced"] .animate-spin { animation-duration: 1.5s !important; }
> @media (prefers-reduced-motion: reduce) {
>   .animate-spin { animation-duration: 1.5s !important; }
> }
> ```
> Bu kurallar mevcut `*` kuralından **sonra** gelmeli (aynı özgüllükte, sonraki kazanır — ama `*` seçicisi düşük özgüllükte olduğu için `.animate-spin` zaten kazanır).

---

### 8.2 Skeleton stratejisi ve CLS önleme

**İlke:** Bir iskelet, gerçek içerikten **farklı boyuttaysa** iskelet olmamasından kötüdür — kullanıcı bir düzen görür, sonra başka bir düzene sıçrar.

#### Ekran bazlı iskelet spesifikasyonu

| Rota | İskelet blokları | Gerçek karşılık | CLS riski |
|---|---|---|---|
| `/app` | `h-7 w-48` + `h-4 w-72` · 3× `h-28` · 2× `h-80` | h1 `text-3xl` ≈ 36px ⚠️ (`h-7` = 28px) · KpiCard ≈ 104px ⚠️ (`h-28` = 112px) · Latest scan kartı ≈ 200px ❌ (`h-80` = 320px) | **Orta** — mevcut iskelet dashboard'a bile tam uymuyor |
| `/app/scans/[id]` | §5.21'deki spesifikasyon | Skor kartı ≈ 176px (`h-44` ✅) · grup satırı ≈ 76px (`h-20` ✅) | Düşük |
| `/app/scans/[id]/issues/[issueId]` | Başlık `h-24` · aksiyon `h-10` · kartlar `h-40`/`h-32` · AI `h-56` | ✅ | Düşük |
| `/app/remediation` | Header `h-20` · banner `h-16` · 2× `<details>` `h-56` | ✅ | Düşük |
| `/app/reports/builder` | §5.15'teki | ✅ | Düşük |
| `/app/team` | Header · `h-52` davet · `h-40` üye tablosu · `h-72` matris | ✅ | Düşük |
| `/app/compliance` | Header · `h-24` banner · 4× `h-32` posture · 3× `h-48` | ✅ | Düşük |

**Dashboard iskeleti düzeltmesi** (`app/app/loading.tsx`):

```tsx
export default function AppLoading() {
  return (
    <div className="px-4 lg:px-8 py-8 space-y-8">
      <div className="animate-pulse space-y-8" aria-hidden="true">
        {/* Header: kicker (h-3) + h1 (h-9 ≈ text-3xl) + alt metin (h-5) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-40 rounded bg-canvas-2" />
            <div className="h-9 w-64 rounded-md bg-canvas-2" />
            <div className="h-5 w-80 max-w-full rounded bg-canvas-2" />
          </div>
          <div className="flex gap-2">
            <div className="h-11 w-32 rounded-md bg-canvas-2" />
            <div className="h-11 w-28 rounded-md bg-canvas-2" />
          </div>
        </div>

        {/* Latest scan (1) + KPI grid (2 sütun) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="h-52 rounded-lg bg-canvas-2 ring-1 ring-line" />
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="h-[104px] rounded-lg bg-canvas-2 ring-1 ring-line" />
            <div className="h-[104px] rounded-lg bg-canvas-2 ring-1 ring-line" />
            <div className="h-[104px] rounded-lg bg-canvas-2 ring-1 ring-line" />
            <div className="h-[104px] rounded-lg bg-canvas-2 ring-1 ring-line" />
            <div className="col-span-2 sm:col-span-4 h-56 rounded-lg bg-canvas-2 ring-1 ring-line" />
          </div>
        </div>

        {/* Recent scans tablosu */}
        <div className="h-64 rounded-lg bg-canvas-2 ring-1 ring-line" />
      </div>
      <span className="sr-only" role="status">Loading dashboard</span>
    </div>
  );
}
```

#### Diğer CLS kaynakları ve düzeltmeleri

| Risk | Konum | Düzeltme |
|---|---|---|
| **Görsel kanıt `<img>`** — `width`/`height` yok | `issue-evidence-image.tsx:34-44` | `width`/`height` + `aspectRatio` (§6.5) |
| **`iframe srcDoc`** yükleme | `reports/preview/page.tsx:65` | `h-[80vh]` sabit ✅ zaten iyi |
| **Bildirim popover** boyut değişimi | `NotificationsBell.tsx:141-155` | `min-h-[200px]` ekle: "Loading…" tek satırdan liste boyutuna sıçrama |
| **Davet listesi** "Loading…" → n satır | `invite-section.tsx:233-237` | 3 satırlık iskelet |
| **Status mesajı** görünüp kaybolma | `issue-actions.tsx` (§5.8) | `min-h-[1rem]` ✅ eklendi |
| **Filtre sonucu** metni | §5.3 | `min-h-[1.25rem]` |
| **Web font** | Yok — sistem stack ✅ | Risk yok |
| **Logo görseli** | `Logo.tsx:12-19` `width`/`height` ✅ | Risk yok |
| **`ScanScoreRing`** SVG | Sabit boyut ✅ | Risk yok |
| **`animate-pulse` → içerik** geçişi | Tüm `loading.tsx`'ler | İskelet ve içerik aynı `space-y-*`/`gap-*` kullanmalı |

**Ölçüm notu:** Bunlar **kod kaynaklı risk tespitleridir**. Gerçek CLS değeri tarayıcıda `PerformanceObserver` ile ölçülmelidir (§10.4'teki enstrümantasyon planında `web-vitals` paketi öneriliyor).

---

### 8.3 Optimistic UI deseni — her mutasyon noktası

**Mevcut durum (grep):**
- `useOptimistic` → **0 kullanım**
- `useTransition` → 4 dosya: `issue-actions.tsx:27`, `visual-evidence-actions.tsx:10`, `privacy-toggle.tsx:23`, `plan-picker.tsx:33`
- `useFormStatus` / `useActionState` → **0 kullanım**
- Tek doğru optimistic örnek: `invite-section.tsx:93-104` (davet ekleme — prepend)

#### Mutasyon envanteri ve önerilen desen

| # | Mutasyon | Konum | Şu an | Önerilen desen | Gecikme toleransı |
|---|---|---|---|---|---|
| 1 | Issue durumu | `issue-actions.tsx:30-39` | `router.refresh()` bekliyor | `useOptimistic` §5.8 | **Sıfır** — anında görünmeli |
| 2 | Görev oluştur | `issue-actions.tsx:41-56` | Sessiz | `useTransition` + kalıcı `role="status"` | Kısa (200-500ms) |
| 3 | Remediation görev durumu | Yok (salt okunur) | — | `useOptimistic` §6.7 | **Sıfır** |
| 4 | Workspace adı | `TopNav.tsx:50-78` | `savingWorkspace` state ✅ | Optimistic + rollback + duyuru | Kısa |
| 5 | Privacy toggle | `privacy-toggle.tsx:23` | `useTransition` + refresh | `useOptimistic` — toggle **anında** dönmeli | **Sıfır** |
| 6 | Davet gönder | `invite-section.tsx:93-104` | ✅ **Doğru optimistic** | Örnek alınmalı | — |
| 7 | Davet iptal | `invite-section.tsx:124-138` | Yanıt bekliyor | Optimistic remove + rollback §5.36 | **Sıfır** |
| 8 | Monitor ekle | `monitors-manager.tsx:70-92` | `adding` state + refresh | Optimistic prepend | Kısa |
| 9 | Monitor duraklat/başlat | `monitors-manager.tsx:94-113` | `busyId` + refresh | `useOptimistic` — rozet anında değişmeli | **Sıfır** |
| 10 | Monitor sil | `monitors-manager.tsx:115-130` | `confirm()` + refresh | `ConfirmDialog` + optimistic remove | Kısa |
| 11 | Plan değiştir | `plan-picker.tsx:43-92` | `busy` + refresh ✅ | Onay dialog'u (§5.57); optimistic **yapılmamalı** (finansal) | Uzun kabul edilebilir |
| 12 | Görsel kanıt sil | `visual-evidence-actions.tsx:13-26` | `useTransition` + refresh | Optimistic gizleme | **Sıfır** |
| 13 | Workspace ayarları | `settings-client.tsx:58` | Server Action, pending yok | `useActionState` §5.5 | Kısa |
| 14 | Workspace setup | `workspace/setup/page.tsx:34` | Server Action, pending yok | `useFormStatus` §5.48 | Kısa |
| 15 | Tarama başlat | `scans/new/page.tsx:68-111` | `submitting` ✅ + `router.push` | ✅ İyi; hata sözlüğü ekle | Uzun (yönlendirme var) |
| 16 | AI açıklama üret | `ai-panel.tsx:38-78` | `loading` ✅ | ✅ İyi; `role="status"` ekle | Uzun (5-20s) |
| 17 | AI assistant üret | `ai-assistant-client.tsx:111-137` | `busy` ✅ | ✅ İyi; streaming (§8.5) | Uzun |
| 18 | Rapor oluştur+indir | `reports/builder/page.tsx:67-114` | `loading` ✅ | `role="status"` + indirme onayı | Uzun |
| 19 | Tarama tekrar dene | `progress-client.tsx:475-509` | `busy` ✅ | ✅ İyi | Kısa |
| 20 | Tüm scan verisini sil | `delete-actions.tsx` | Inline onay | `ConfirmDialog` + kalıcı sonuç mesajı | Uzun |

#### Kanonik desen (kopyala-yapıştır şablon)

```tsx
"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAnnounce } from "@/components/accessibility/AnnouncerProvider";

export function OptimisticToggle({
  id,
  initial,
  label,
}: {
  id: string;
  initial: boolean;
  label: string;
}) {
  const router = useRouter();
  const announce = useAnnounce();
  const [value, setValue] = useState(initial);
  const [optimistic, applyOptimistic] = useOptimistic(value);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    startTransition(async () => {
      // 1) Optimistic: kullanıcı SIFIR gecikme görür
      applyOptimistic(next);
      setError(null);

      // 2) Gerçek istek
      const res = await fetch(`/api/…/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });

      // 3a) Hata → useOptimistic transition bitince OTOMATİK geri alır
      if (!res.ok) {
        setError(`Could not update ${label}. Your setting is unchanged.`);
        announce(`${label} change failed.`, { assertive: true });
        return;
      }

      // 3b) Başarı → gerçek state'i güncelle (optimistic buna düşer)
      setValue(next);
      announce(`${label} ${next ? "enabled" : "disabled"}.`);
      router.refresh();
    });
  }

  return (
    <>
      <Switch
        checked={optimistic}
        disabled={pending}
        onChange={(e) => toggle(e.target.checked)}
        label={label}
      />
      {error && <AlertCallout tone="danger" live className="mt-2 text-xs">{error}</AlertCallout>}
    </>
  );
}
```

**Üç kural:**
1. `applyOptimistic` **her zaman** `startTransition` içinde, ilk satırda.
2. Hata durumunda `setValue` **çağrılmaz** → rollback otomatik.
3. Her optimistic mutasyon bir duyuru üretir (§5.1.3) — görsel değişim ekran okuyucuya görünmez.

**Optimistic UI'ın yapılmaması gereken yerler:**
- **Finansal işlemler** (plan değişikliği): kullanıcı "plan değişti" görüp sonra geri alınırsa güven kaybı ödeme akışında kabul edilemez.
- **Yıkıcı işlemler** (tüm veriyi sil): sonucu görene kadar beklemek doğru.
- **Uzun süren üretimler** (AI): optimistic bir "sahte cevap" gösterilemez.

---

### 8.4 Streaming ve `<Suspense>` sınırları

Next.js App Router'da `<Suspense>`, RSC ağacının yavaş kısımlarını geri kalanı bloke etmeden akıtır. Şu an projede **`<Suspense>` yalnız 1 yerde** var: `auth/sign-in/page.tsx:27` (`useSearchParams` için zorunlu).

#### Önerilen sınırlar

| Rota | Hızlı (blocking) | Yavaş (`<Suspense>`) | Gerekçe |
|---|---|---|---|
| `/app` | `listScans(5)` → h1, header, Latest scan kartı | `getScanSummary` + `listIssues` → KPI + Open findings · `Recent scans` tablosu | Skor sorgusu Firestore'da ayrı bir doküman; tablo 5 satır ama ayrı sorgu |
| `/app/scans/[id]` | `getScanJob` → h1, host, tarih | `listIssues` + `listIssueGroups` → tüm bulgu listesi · `listScanPages` → aside "Pages scanned" | `listIssues` en pahalı sorgu; skor kartı onu beklememeli |
| `/app/scans/[id]/issues/[issueId]` | `getIssue` → h1, açıklama, snippet | `getVisualEvidenceForIssue` → görsel kanıt bölümü | Görsel kanıt base64 taşıyor, büyük |
| `/app/compliance` | privacy toggle'ları | `listAuditLogs(10)` | Audit log sayfanın geri kalanından bağımsız |
| `/app/team` | `listWorkspaceMembers` | `countWorkspaceSeats` — ⚠️ `Promise.all` ile zaten paralel ✅ | Değişiklik gerekmez |
| `/app/remediation` | `listRemediationTasks(100)` — tek sorgu | — | Bölmeye gerek yok |
| `/app/monitors` | Monitor listesi | — | Küçük |

#### Örnek: `/app/scans/[id]`

```tsx
export default async function ScanResultsPage({ params, searchParams }: {…}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getCurrentWorkspaceOrRedirect();

  // Sadece başlık için gereken minimum — hızlı
  const scan = await getScanJob(ctx.workspace.id, id);
  if (!scan) notFound();
  if (scan.status !== "completed") redirect(`/app/scans/${id}/progress`);

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6 max-w-[1400px]">
      <ScanActionBar scan={scan} />

      <Suspense fallback={<ScoreCardSkeleton />}>
        <ScanScoreCard workspaceId={ctx.workspace.id} scan={scan} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6 min-w-0">
          <Suspense fallback={<FindingsSkeleton />}>
            <FindingsSection
              workspaceId={ctx.workspace.id}
              scan={scan}
              filters={{ sev: sp.sev, vp: sp.vp, page: sp.page }}
            />
          </Suspense>
        </div>
        <aside className="space-y-5">
          <ScopeAndLimits scan={scan} />
          <Suspense fallback={<PagesSkeleton />}>
            <PagesScannedList workspaceId={ctx.workspace.id} scanId={scan.id} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
```

**Kritik a11y detayı:** Suspense sınırları içerik "sonradan gelir" demektir → ekran okuyucu kullanıcısı için bu bir **status message**'dır (WCAG 4.1.3). Her fallback'te:

```tsx
function FindingsSkeleton() {
  return (
    <>
      <div className="animate-pulse space-y-2.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-canvas-2 ring-1 ring-line" />
        ))}
      </div>
      <p role="status" className="sr-only">Loading findings</p>
    </>
  );
}
```

İçerik geldiğinde fallback DOM'dan çıkar; ideal olarak yerine gelen içerik de duyurulur. Bu, `<Suspense>` ile otomatik olmaz — §5.1.3'teki `announce()` çağrısı içeriğin bir client wrapper'ında yapılabilir. **Pratik yaklaşım:** yükleme duyurusu yeterli; kullanıcı içeriğin geldiğini sayfada gezinerek anlar. Aşırı duyuru daha kötü.

**⚠️ Suspense + `force-dynamic` etkileşimi:** Tüm `/app/*` sayfaları `force-dynamic`. Bu, statik üretimi kapatır ama **streaming'i engellemez** — `<Suspense>` yine çalışır ve TTFB'yi düşürür (kabuk hemen gider).

---

### 8.5 AI yanıtları için streaming

`POST /api/ai-assistant` ve `POST /api/issues/[id]/ai-explanation` şu an tek seferde JSON döndürüyor. Kullanıcı 10-20 saniye boş ekrana bakıyor.

**Öneri:** OpenAI streaming yanıtını `ReadableStream` olarak proxy'le:

```ts
// src/app/api/issues/[id]/ai-explanation/route.ts (streaming varyantı)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // … yetki, consent, rate limit kontrolleri (mevcut) …

  const upstream = await openai.chat.completions.create({ …, stream: true });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      for await (const chunk of upstream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (!delta) continue;
        full += delta;
        controller.enqueue(encoder.encode(delta));
      }
      controller.close();
      // Tam metni Firestore'a yaz (arka planda, yanıtı bloklamadan)
      void persistExplanation(workspaceId, issueId, full);
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
```

Client:

```tsx
  async function generate() {
    setLoading(true);
    setStreamed("");
    const res = await fetch(`/api/issues/${issueId}/ai-explanation`, { method: "POST", … });
    if (!res.ok || !res.body) { /* hata */ return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      setStreamed(acc);
    }
    setLoading(false);
    announce("AI explanation ready.");
  }
```

**A11y kuralı:** Akan metin **canlı bölgeye konmamalı** — her token'da duyuru olur, kullanılamaz. Doğrusu:
- Akan metin normal bir `<p>` içinde (canlı bölge değil), `aria-busy="true"` ile.
- Akış bittiğinde tek bir `announce("AI explanation ready. N words.")`.

```tsx
      <div aria-busy={loading}>
        <p className="whitespace-pre-wrap">{streamed}</p>
      </div>
      {/* Ayrı, tek seferlik duyuru */}
      <p role="status" aria-live="polite" className="sr-only">
        {!loading && streamed ? "AI explanation ready." : loading ? "Generating explanation…" : ""}
      </p>
```

**Algılanan kazanç:** İlk token ~1-2 sn içinde gelir → 20 saniyelik bekleme "yazılıyor" hissine dönüşür. Bu, ürünün AI yüzeyindeki en büyük algılanan-performans kazancıdır.

---

### 8.6 Algılanan performans şeridi

Kullanıcı bir kontrole tıkladıktan sonra ne göstermeli — süreye göre:

| Süre | Kullanıcı algısı | Ne gösterilmeli | Ne gösterilmemeli | Projede karşılığı |
|---|---|---|---|---|
| **0–100 ms** | "Anında" | Sadece **basılma** durumu (`active:` stili). Spinner **koymayın** — 60 ms sonra kaybolan spinner titreme olarak algılanır | Spinner, iskelet, "Loading…" | `Button` `active:bg-navy-700` ✅ mevcut · Optimistic mutasyonlar (§8.3 #1,3,5,7,9,12) buraya düşmeli |
| **100–300 ms** | "Hızlı ama fark ediliyor" | Kontrolü `disabled` yap + **optimistic** sonucu göster. Yine spinner yok | Tam sayfa iskeleti | Issue durum değişimi · Privacy toggle · Davet iptali |
| **300 ms – 1 s** | "Bekliyorum" | **Inline spinner** kontrolün içinde (`Button loading`), etiket "Working…"e döner. Sayfanın geri kalanı sabit kalır | Sayfayı boşaltmak | Tarama başlatma · Görev oluşturma · Monitor ekleme · Server Action'lar |
| **1–3 s** | "Yavaş" | **İskelet** (gerçek düzenle eşleşen) veya kısmi içerik + `role="status"` duyurusu. İlerleme bilinmiyorsa belirsiz gösterge | Yalnız spinner (bağlam yok) | Route geçişleri (`loading.tsx`) · `/app/scans/[id]` bulgu listesi |
| **3–10 s** | "Bir şeyler ters mi?" | **Ne olduğunu söyleyen** metin + tahmini süre. Mümkünse aşamalı ilerleme | Sessiz spinner | AI üretimi ("Generating explanation… usually 5–10 seconds") · Rapor PDF üretimi |
| **10 s+** | "Terk edeceğim" | **Adım adım ilerleme** + iptal/geri dön seçeneği + "sayfadan ayrılabilirsin" güvencesi | Belirsiz bekleme | Tarama ilerlemesi ✅ **zaten doğru yapılmış** (`progress-client.tsx` + `:422-424` "You can leave this page") |

#### Uygulama kuralları

```tsx
// 1) 0–300 ms bandı: optimistic, spinner YOK
<Switch checked={optimistic} disabled={pending} onChange={…} />

// 2) 300 ms – 1 s: inline spinner, sayfa sabit
<Button loading={pending} loadingLabel="Creating task…">Create task</Button>

// 3) 1–3 s: iskelet + duyuru
<Suspense fallback={<FindingsSkeleton />}>…</Suspense>

// 4) 3–10 s: açıklamalı bekleme
{busy && (
  <div role="status" className="rounded-md bg-canvas-2 p-4 text-sm text-ink-700">
    <Loader2 className="size-4 animate-spin inline mr-2" aria-hidden />
    Generating fixes from {n} findings. This usually takes 10–20 seconds.
  </div>
)}

// 5) 10 s+: adım listesi + kaçış yolu
<ProgressSteps … />
<p className="text-xs text-ink-600">You can leave this page. We'll keep working.</p>
```

**Gecikme eşiği tespiti** — spinner titremesini önlemek için gecikmeli gösterim:

```tsx
/** 300 ms'den kısa süren işlemlerde spinner GÖSTERME. */
export function useDelayedPending(pending: boolean, delayMs = 300) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!pending) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [pending, delayMs]);
  return show;
}
```

Ayrıca **minimum görünme süresi** (spinner bir kez göründüyse en az 400 ms kalsın — anlık kaybolma da titremedir):

```tsx
export function useMinimumDuration(active: boolean, minMs = 400) {
  const [held, setHeld] = useState(active);
  const startedRef = useRef(0);
  useEffect(() => {
    if (active) { startedRef.current = Date.now(); setHeld(true); return; }
    const elapsed = Date.now() - startedRef.current;
    const remaining = Math.max(0, minMs - elapsed);
    const t = setTimeout(() => setHeld(false), remaining);
    return () => clearTimeout(t);
  }, [active, minMs]);
  return held;
}
```

**Prefetch'in algılanan performansa katkısı:** `PrefetchLink` (§5.34) hover/focus'ta rotayı ısıtıyor → tıklama anında RSC payload'ı çoğu zaman hazır → route geçişi 1-3 s bandından 100-300 ms bandına iner. Bu, projede **zaten doğru kurgulanmış** bir şey; §5.34 onu sadece daha az agresif yapıyor.


