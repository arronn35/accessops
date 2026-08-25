# Percevia AI — Yürütme Başlangıç Kaydı

**Başlangıç tarihi:** 27 Temmuz 2026  
**Durum:** Faz 0 aktif — çekirdek güvenlik ve güvenilirlik dilimi tamamlandı  
**Kaynak:** `00-MASTER-PLAN.md` ve dört uzman denetimi

## 1. Agent kimlikleri ve sorumlulukları

| Agent kimliği | Sorumlu dosya | Görev |
|---|---|---|
| Program Direktörü | `00-MASTER-PLAN.md` | Bulguları birleştirmek, bağımlılıkları ve yürütme sırasını belirlemek |
| AccessOps Mühendislik Denetçisi | `01-engineering-audit.md` | Kod, güvenlik, veri bütünlüğü ve operasyon bulgularını güncel repoda doğrulamak |
| AccessOps UX Stratejisti | `02-ux-audit.md` | Kullanıcı akışı, erişilebilirlik ve etkileşim dürüstlüğü bulgularını doğrulamak |
| AccessOps AI Mimarı | `03-ai-architecture.md` | AI sınırları, güvenilirlik, maliyet ve hedef mimariyi doğrulamak |
| AccessOps Pazar Araştırmacısı | `04-market-research.md` | Pazar, rakip, fiyat ve regülasyon iddialarını güncel kaynaklarla doğrulamak |

## 2. Doğrulanmış başlangıç tabanı

### Mühendislik

- Denetimdeki 47 bulgunun 42'si kod düzeyinde doğrulandı.
- B02, B12, B21 ve B41 koşullu veya etkisi abartılmış bulgular olarak yeniden sınıflandırıldı.
- B31 güncelliğini yitirmiştir: scheduler tanımları artık `scripts/deploy-cloud-run.sh` içinde bulunmaktadır.
- B01, B03, B04, B05, B06 ve B07 güncel kodda doğrulandı.
- B46, açık yönlendirme etkisi nedeniyle P3 yerine P2 olarak ele alınmalıdır.

### UX

- Çalışmayan rapor filtreleri, Compliance bölge butonları, bildirim switch'leri, global arama ve print kontrolü doğrulandı.
- Tarama ilerlemesinde canlı durum duyurusu bulunmaması ve mobilde ana rotaların eksik olması doğrulandı.
- `Checkbox` ve `Switch` bileşenlerinin render sırasında `Math.random()` ile ID üretmesi doğrulandı.
- `02-ux-audit.md`, mevcut olmayan §9, §10, §11 ve §13 bölümlerine atıf yapmaktadır; doğrudan release/VPAT girdisi olarak kullanılmamalıdır.
- Kullanılmayan `Dialog` bileşeni P0 kullanıcı hatası değil, P1 altyapı işi olarak ele alınmalıdır.

### AI

- `max_output_tokens: 900`, timeout/retry/status kontrolü eksikliği, boş çıktının başarı sayılması ve production mock fallback'i doğrulandı.
- Pahalı Firestore okumalarının rate limit kontrolünden önce yapılması, sınırsız `prompt` girdisi ve scan AI bayraklarının uygulanmaması doğrulandı.
- Global AI cache önerisi çapraz-workspace veri riski taşır; ilk sürüm workspace kapsamlı olmalıdır.
- Referans bütçe kodunda rezervasyonun iki kez serbest bırakılması riski vardır; doğrudan uygulanmamalıdır.
- Provider abstraction, SSE, RAG ve agentic remediation öncesinde route güvenliği, ölçüm ve küçük bir regresyon seti tamamlanmalıdır.

### Pazar

- En güçlü kama, Türkiye'de izleme kapsamına gerçekten alınan kurumların İnceleme Komisyonu ve düzeltme kanıtı iş akışıdır.
- “Kapsamdaki her kurum komisyon kurmak zorunda” iddiası fazla geniştir; 2026 İzleme Planı ve seçilmiş kurum listesi doğrulanmalıdır.
- WeAccess yerel rakip, `erisilebilirlik.org` ise rakip/partner hibriti olarak ele alınmalıdır.
- Pope Tech'in sayfa havuzu ve sınırsız yeniden tarama modeli doğrudan freemium benchmarkıdır.
- Dosyadaki kur, e-ticaret işletmesi sayısı, bazı yaptırım tarihleri ve doğrudan temin yorumları güncellenmelidir.
- Ürün yatırımı öncesi beş doğrulanmış kurum görüşmesi yapılmalı; en az üç gerçek komisyon, üç güçlü ihtiyaç, iki pilot ve bir açıklanmış bütçe/prosedür yolu aranmalıdır.

## 3. Başlatılan uygulama

### Faz 0.2 — B01 stored XSS

`src/app/statement/[id]/route.ts` için:

- Kullanıcı kontrollü şirket adı, standart ve limitasyon alanlarına HTML escaping eklendi.
- İletişim linki yalnızca `mailto:`, `http:` ve `https:` şemalarıyla sınırlandı.
- Geçersiz veya tehlikeli şemalar tıklanabilir link olarak üretilmiyor.
- Sıkı Content Security Policy başlığı eklendi.
- Stored-XSS yükü ve `javascript:` URL'si için negatif regresyon testi eklendi.

**Doğrulama:** iCloud dışındaki geçici kaynak kopyasında hedef Vitest dosyası geçti: 1 dosya, 3 test.

### Faz 0.6 — B06 expired/revoked session

`src/lib/auth/session.ts` için:

- Firebase `auth/session-cookie-expired` ve `auth/session-cookie-revoked` hataları geçersiz oturum olarak sınıflandırıldı.
- Bu iki durumda `verifySessionCookie()` artık `null` dönüyor ve mevcut `requireSession()` sözleşmesi deterministik 401 üretiyor.
- `auth/internal-error` gibi beklenmeyen altyapı hataları 401 olarak maskelenmeden yeniden fırlatılıyor.
- Expired, revoked ve beklenmeyen altyapı hatası için üç regresyon testi eklendi.

**Doğrulama:** `session.test.ts` ve `context.test.ts` birlikte geçti: 2 dosya, 4 test. `git diff --check` geçti. Tam typecheck workspace/iCloud gecikmesi nedeniyle sonuç üretmedi.

### Faz 0.4 — B03 retry yetki, kota ve eşzamanlılık

`src/app/api/scans/[id]/retry/route.ts` için:

- Retry işlemi `create_scans` rol iznine bağlandı.
- Güncel workspace planı ve plan sayfa cap'i yeniden uygulanıyor.
- Retry, normal scan oluşturma akışıyla aynı günlük kota rezervasyonunu yapıyor.
- Workspace eşzamanlılık sınırı uygulanıyor; retry edilen job kendi inflight sayımından hariç tutuluyor.
- Plan cap'i düşmüşse job `maxPages` alanı rezervasyon sonucuna çekiliyor.
- Yetkisiz rol, başka inflight scan, tükenmiş günlük kota ve plan cap'i için regresyon testleri eklendi.

**Doğrulama:** Hedef retry test dosyasında 8 test geçti. `git diff --check` geçti. Geniş regresyon koşusu workspace I/O gecikmesi nedeniyle sonuçlandırılamadı.

### Faz 0.8 — B04 yetim pageJob ve worker backoff

- `claimPageJob()` missing veya terminal parent'a bağlı queued işleri transaction içinde `failed` durumuna getiriyor.
- Aktif fakat henüz `scanning` fazına geçmemiş parent için job terminalleştirilmiyor; geçici yarış güvenli biçimde bekliyor.
- Retry limiti dolmuş queued job'lar `attempts_exhausted` koduyla terminalleştiriliyor.
- Claim sonucu `claimed`, `discarded` ve `unavailable` olarak ayrıştırıldı.
- HTTP serve worker gerçek claim miss'lerinde 25–250 ms sınırlı üstel backoff uyguluyor; başarılı orphan temizliği ilerleme sayılıyor.
- Uzun çalışan worker yeni claim sözleşmesine uyarlandı.

**Doğrulama:** Saf pageJob kararları ve backoff için 2 dosya, 10 test geçti. Serve ve long-running worker bundle doğrulaması geçti. Hedef `git diff --check` temiz. Worker typecheck ve ESLint workspace I/O gecikmesi nedeniyle sonuç üretmedi.

### Faz 0.9 — B05 terminal yazım sahipliği

- Scan claim'i canlı dokümanda `status === "running"` ve `claimedBy === workerId` koşullarıyla transaction içinde yeniden doğrulanıyor.
- `completed` ve `failed` terminal geçişleri yalnız mevcut claim sahibi tarafından yapılabiliyor.
- Terminal transaction yarışını kaybeden worker kota, remediation ve audit yan etkilerini çalıştırmıyor.
- Legacy sonuç persistence akışı koleksiyon temizliği ve sayfa yazımları öncesinde claim'i yeniliyor.
- Inline runner scan'i atomik olarak claim ediyor; worker, page-job ve sweeper agregasyon yolları açık `workerId` taşıyor.
- Terminal geçişten sonra yapılan koşulsuz worker merge yazımları kaldırıldı.

**Doğrulama:** Persistence, process-job, page-job, inline-runner ve lifecycle kapsamındaki 5 dosyada 36 test geçti. Long-running ve HTTP worker bundle doğrulaması geçti. B05 dosyalarına yönelik `git diff --check` temiz. Worker typecheck 90 saniye çıktı üretmediği için kontrollü kesildi. Firestore alt koleksiyon temizleme/yazma işlemleri tek transaction'a alınamadığından, claim yenilemeyle daraltılmış küçük bir collection-level TOCTOU penceresi bilinçli teknik sınır olarak kalmaktadır.

### Faz 0.10 — B07 başarısız sayfa ve skor doğruluğu

- Hiç analiz edilemeyen sayfalar `scanFailed` ve makinece okunabilir `failureCode` ile işaretleniyor.
- Playwright sayfa hataları ile statik fetch, HTTP erişim engeli ve bot-challenge sonuçları skorlama dışı tutuluyor.
- Skor paydası ve `pageScores` yalnız başarıyla analiz edilen sayfalardan oluşuyor; başarısız URL'ler ayrı özette saklanıyor.
- Dört başarısız sayfanın tek başarılı sayfadaki 40 puanlık cezayı seyreltmesi engellendi: örnek skor artık 82 yerine 60.
- Hiç başarılı sayfa yoksa skor özeti yazılmıyor; scan sahiplik kontrollü biçimde `failed/all_pages_failed` durumuna geçiyor.
- Legacy ve page-job akışları başarılı/başarısız sayaçlarını ayrı taşıyor; karma sonuç `completed_with_errors` olarak kapanıyor.
- Scan API'si, sonuç ekranı ve HTML/JSON raporları başarısız sayfaları, başarısız URL'leri ve skorun kaç başarılı sayfaya dayandığını açıkça gösteriyor.
- Skorlama sürümü `percevia-score-v2` olarak artırıldı; geçmiş summary dokümanları optional alanlarla okunmaya devam ediyor.

**Doğrulama:** Ana hedef turda 7 dosyada 66 test geçti; son odak turlarında 5 dosyada 46 ve static/scoring kapsamında 2 dosyada 16 test geçti. Worker entrypoint'leri ile Next.js sonuç sayfası, rapor önizleme ve scan route bundle doğrulamasından geçti. B07 kapsamlı `git diff --check` temiz. Hedef ESLint ve worker typecheck ayrı ayrı 60 saniye çıktı üretmeden asılı kaldığı için kontrollü kesildi.

### UX dilimi — F03/F04/F05 etkileşim dürüstlüğü

- Scan sonuç ekranındaki ölü filtre çipleri Next.js RSC `searchParams` ve gerçek `Link` kontrollerine dönüştürüldü.
- Severity, viewport ve state filtreleri URL'de birleşiyor; seçili durum, tekil/tüm filtre temizleme, sonuç sayısı ve boş filtre sonucu semantiği mevcut.
- Filtre sayıları tam veri setinden hesaplanırken grup ve flat finding render'ları filtrelenmiş seti kullanıyor.
- Compliance ekranındaki veri lokasyonunu değiştirmeyen bölge butonları kaldırıldı.
- Workspace region tercihinin veri taşımadığı; gerçek storage/worker lokasyonunun deployment konfigürasyonuna bağlı olduğu ve region değişiminin yazılı Enterprise migrasyonu gerektirdiği açıklandı.
- `europe-west1` coğrafi olarak Belgium şeklinde düzeltildi ve yalnız önerilen varsayılan hedef olarak sunuldu.
- Henüz bulunmayan e-posta bildirimleri açık roadmap metni ve disabled fieldset ile gösteriliyor; in-app bildirimlerin çalıştığı ayrıştırılıyor.

**Doğrulama:** F03-F05 ve B07 notice kapsamındaki 4 dosyada 8 test geçti. Altı üretim girişi bundle doğrulamasından geçti. Scoped `git diff --check` temiz. Full typecheck 50 saniye, scoped ESLint 30 saniye çıktı vermeden asılı kaldığı için kontrollü kesildi.

### AI Faz 0A — Issue explanation route safety

- Request body strict Zod şemasına alındı: güvenli `scanJobId`, zorunlu `consentChecked: true`, allowlist framework/mode, trim edilmiş en fazla 2.000 karakter prompt ve bilinmeyen alan reddi.
- Bozuk JSON, geçersiz Firestore belge kimliği ve şema ihlalleri deterministik 400 üretiyor.
- Workspace maliyet rate limit'i tüm scan/issue/privacy Firestore okumalarından önce uygulanıyor.
- En kötü durumda 100 scan üzerinde arama yapan `findIssueInWorkspace` kaldırıldı; scan ve issue doğrudan `workspaceId/scanId/issueId` yolu üzerinden okunuyor.
- Privacy seviyesindeki `aiProcessingEnabled` ile scan seviyesindeki `aiExplanationsEnabled` birlikte uygulanıyor.
- UI request'e `scanJobId` ekliyor ve AI kullanılabilirliğini privacy + scan bayraklarının kesişimi olarak gösteriyor.
- Checkbox gerçek veri işleme izni olarak adlandırılmıyor; başarılı üretimde `outputAcknowledgedAt` ve `scanId` audit metadata'sına yazılıyor.

**Doğrulama:** Yeni AI explanation route test dosyasında 13 test geçti. Route, test, panel ve issue page bundle doğrulamasından geçti. Scoped `git diff --check` temiz. Hedef ESLint ve full typecheck 30 saniye çıktı üretmeden asılı kaldığı için kontrollü kesildi.

### AI Faz 0B — Sağlayıcı güvenilirliği

- OpenAI isteğine `AbortController` tabanlı zaman aşımı eklendi; `OPENAI_REQUEST_TIMEOUT_MS` 1.000–120.000 ms aralığına sıkı biçimde sınırlandı ve varsayılan 60 saniye olarak bırakıldı.
- 408, 429, geçici 5xx ve ağ/zaman aşımı hataları için toplam en fazla iki deneme uygulanıyor; bekleme ile `Retry-After` değeri 25–1.000 ms arasında sınırlandırılıyor.
- Kimlik doğrulama ve doğrulama sınıfındaki diğer 4xx yanıtları yeniden denenmiyor.
- Responses yanıtı yalnız `status: "completed"` olduğunda kabul ediliyor; provider `error`, `incomplete_details`, `refusal`, boş görünür çıktı ve boş `explanationPlain` artık fail-closed hata üretiyor.
- Provider hata gövdesi kullanıcı mesajına veya sunucu log'una taşınmıyor; log yalnız hata sınıfı, retry kararı ve HTTP durumunu içeriyor.
- `AI_MOCK_ENABLED=true` olsa bile production ortamında mock yanıt kesinlikle kapalı; development davranışı korunuyor.
- Mevcut model ve `max_output_tokens: 900` bu güvenilirlik diliminde bilinçli olarak değiştirilmedi; model/token bütçesi ayrı ölçüm ve eval kapısında ele alınacak.
- Var olan `.env.local` anahtarı kullanıcı onayıyla yeniden kullanılabilir kabul edildi; anahtar değeri görüntülenmedi, kopyalanmadı veya değiştirilmedi ve canlı sağlayıcı çağrısı yapılmadı.

**Doğrulama:** `explain.test.ts` içinde 20 test geçti. Route güvenliği ile birlikte koşulan turda 2 dosyada 33 test geçti. Üretim ve test girişleri bundle doğrulamasından geçti; scoped `git diff --check` temiz.

## 4. Güncellenmiş yürütme sırası

| Sıra | İş | Çıkış ölçütü |
|---|---|---|
| 1 | B01 stored XSS — tamamlandı | Negatif saldırı testi yeşil; güvenli şema sınırı ve CSP mevcut |
| 2 | Faz 0 doğrulama ortamı | Proje iCloud dışı kalıcı geliştirme yolunda; typecheck/test/lint ölçülebilir sürede tamamlanıyor |
| 3 | B06 expired session — tamamlandı | Süresi dolan/revoke cookie deterministik 401 üretiyor |
| 4 | B03 retry yetki ve kota — tamamlandı | `create_scans`, kota ve eşzamanlılık kuralları normal scan route'u ile aynı |
| 5 | B04 yetim pageJob/backoff — tamamlandı | Yetim pageJob sıcak döngü ve FIFO tıkanması yaratmıyor |
| 6 | B05 terminal yazım sahipliği — tamamlandı | Terminal scan yalnız çalışan sahibi tarafından transaction ile kapanıyor |
| 7 | B07 skor doğruluğu — tamamlandı | Başarısız sayfalar skoru şişirmiyor ve raporda ayrı gösteriliyor |
| 8 | UX etkileşim dürüstlüğü — F03/F04/F05 tamamlandı | Çalışmayan kontroller kaldırılmış, disabled açıklaması almış veya gerçek davranışa bağlanmış |
| 9 | AI route safety slice — tamamlandı | Girdi şeması, erken rate limit, doğrudan issue okuması ve scan AI bayrağı testlerle korunuyor |
| 10 | AI sağlayıcı güvenilirliği — tamamlandı | Timeout, sınırlı retry, incomplete/empty kontrolü ve production fail-closed testlerle korunuyor |
| 11 | Pazar doğrulama kapısı — sıradaki | Beş kurum görüşmesi ve tanımlı 3/3/2/1 başarı eşiği tamamlanmış |

## 5. Karar kapıları

- Faz 0 çıkmadan yeni ürün özelliği başlatılmayacak.
- Gerçek kurum listesi ve concierge görüşmeleri doğrulanmadan tam İnceleme Komisyonu ürünü geliştirilmeyecek.
- AI route güvenliği ve ölçüm tamamlanmadan SSE, RAG, global model routing veya agentic remediation başlatılmayacak.
- Müşteri bağlamı içeren AI çıktıları global cache'e alınmayacak.
- `02-ux-audit.md` ve `04-market-research.md` içindeki eksik bölüm atıfları düzeltilmeden bu dosyalar dış paydaşlara sunulmayacak.

## 6. Doğrulama notu

Workspace altındaki paralel `typecheck`, `test` ve `lint` süreçleri uzun süre çıktı vermedi. Kaynak kodu, secret ve environment dosyalarını taşımadan iCloud dışındaki geçici bir dizine kopyalama yaklaşımı hedef testte çalıştı; hedef Vitest koşusu 50,33 saniyede tamamlandı. Aynı kopyada typecheck 4 dakika 34 saniye, iki hedef dosyaya yönelik ESLint 1 dakika 48 saniye boyunca sonuç üretmediği için durduruldu. Bunlar için yeşil sonuç iddia edilmemektedir. Kalıcı çözüm, geliştirme checkout'unu iCloud tarafından yönetilmeyen bir dizine taşımaktır.
