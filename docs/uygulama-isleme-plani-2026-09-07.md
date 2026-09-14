# Percevia — Uygulama ve İşleme Planı

Bu plan, `birlesik-durum-ve-kalan-isler-2026-09-07.md` raporundaki bulguları uygulanabilir iş paketlerine dönüştürür. Hedef, sistemi yalnızca kodda uygulanmış özellikler düzeyinden; güvenli, kanıtlanabilir, yayınlanabilir ve ürün sözüyle tutarlı bir seviyeye taşımaktır.

## Hedef durum

Yayın kararı ancak aşağıdaki dört koşul birlikte sağlandığında verilmelidir:

1. Tarama ve manuel inceleme verileri silme veya retention işlemlerinden sonra geride kalmaz.
2. CI, gerçek Firebase oturumlu kritik uçtan uca testi gerçekten çalıştırır; test atlanmışsa başarılı görünmez.
3. Karşılaştırma sonucu yalnız teknik olarak eşdeğer ve tamamlanmış iki tarama arasında üretilir.
4. Staging'de doğrulanmış commit/build/motor sürümü ile üretimde çalışan sürüm izlenebilir biçimde eşleşir.

## Faz 0 — Kontrol, sahiplik ve sürüm dondurma

### Amaç

Geniş, commit edilmemiş çalışma ağacındaki değişiklikleri kaybetmeden kontrol altına almak.

### İş kalemleri

- Mevcut diff'i alanlara göre sınıflandırın: güvenlik/izin, ödeme, tarama-karşılaştırma, manuel inceleme, CI, UI-i18n, test ve yardımcı çıktılar.
- Kullanıcı kaynaklı veya önceki çalışmalardan kalan değişiklikleri ayrı tutun; hepsini tek bir feature commit'ine toplamayın.
- Mantıksal commit grupları oluşturun:
  - `fix(data): delete manual reviews with scan lifecycle`
  - `fix(compare): require equivalent completed scan scope`
  - `ci(e2e): enforce authenticated staging tests`
  - `feat(release): add deployable build manifest`
- Her deploy edilebilir build için manifest üretin:
  - Git commit SHA
  - Build zamanı ve ortamı
  - Node sürümü
  - Uygulama sürümü
  - Worker/tarama motoru sürümü
  - Fingerprint ve skorlama sürümü
  - Firebase proje kimliği
- Staging ve production'da bu manifestin erişilebildiği, ancak hassas bilgi sızdırmadığı bir yönetici/health endpoint'i veya deploy metadatası oluşturun.

### Kabul ölçütü

Her staging deploy'unun hangi commit ve motor sürümünden geldiği görülebilir; test edilen commit ile dağıtılan commit karşılaştırılabilir.

## Faz 1 — P1 veri silme yaşam döngüsü: B01

### Amaç

`scans/{scanId}/manualReviews/{checkId}` alt koleksiyonunun silinen tarama veya workspace sonrasında yetim kalmasını engellemek.

### Uygulama adımları

1. Tüm silme giriş noktalarını çıkarın: tek tarama silme, workspace silme, retention/otomatik temizlik, yönetici araçları ve toplu silme işleri.
2. `manualReviews` koleksiyonunu ortak silme yardımcılarına ekleyin.
3. Firestore alt koleksiyonlarının üst belge silinince otomatik silinmediğini gözeten, sayfalı/batch çalışan güvenli silme yaklaşımı kullanın.
4. Silme sayımlarına silinen `manualReviews` belge sayısını, başarısız silme sayısını ve tekrar denenmesi gereken işleri ekleyin.
5. İşlem yarıda kesilirse tekrar çalıştırılabilen/idempotent bir tasarım kurun.
6. Geçmişten kalmış yetim kayıtları bulmak için denetim/migrasyon işi hazırlayın:
   - Ana `scan` belgesi olmayan manual review kayıtlarını tespit etsin.
   - İlk çalıştırma yalnız raporlama modunda olsun.
   - Onaylı ikinci adımda silsin veya inceleme kuyruğuna alsın.
7. Firestore güvenlik kurallarının silinmiş veya yetkisiz scan altında kalan inceleme kayıtlarına erişime izin vermediğini tekrar doğrulayın.

### Gerekli testler

- Scan silindiğinde `manualReviews` dahil tüm ilişkili veri sıfırlanır.
- Workspace silindiğinde tüm scan'lerin altındaki kayıtlar temizlenir.
- Retention işi aynı sonucu üretir.
- Batch sınırı, yeniden deneme ve kısmi hata senaryosu test edilir.
- Yetim-temizleme işi aktif scan verisini silmez.

### Kabul ölçütü

Staging'de oluşturulan manuel inceleme; scan silme, workspace silme ve retention akışlarının her birinden sonra Firestore sorgusunda sıfır sonuç verir.

## Faz 2 — P1 gerçek oturumlu CI yayın kapısı: B02

### Amaç

CI'ın “oturumlu E2E çalıştı” iddiasını gerçek kanıta bağlamak ve eksik secret'larla yanlış yeşil sonuç üretmesini önlemek.

### Uygulama adımları

1. Oturumlu E2E için gereken tüm ortam değişkenlerini belgeleyin:
   - Firebase project ID
   - İstemci e-posta/servis hesabı
   - Private key
   - Public API key
   - Gerekirse test kullanıcısı, test workspace'i ve callback URL'leri
2. GitHub Actions workflow'unda gerekli secret'ları yalnız ilgili test adımına aktarın.
3. Secret eksikliği durumunu iki ayrı moda ayırın:
   - Pull request/fork güvenlik modu: açık “authenticated E2E skipped” sonucu.
   - Korunan branch/release modu: zorunlu kontrol başarısız olmalı; uyarıyla geçmemeli.
4. Test başlamadan yapılandırma doğrulaması ekleyin: zorunlu değişkenlerin varlığı, hedef Firebase projesi ve kimlik bilgisinin parse edilebilirliği.
5. Test çıktısında gerçek koşum kanıtı üretin: hedef Firebase proje kimliği, auth fixture başlatma bilgisi, test sayısı/sonucu ve koşum artifaktı.
6. “Ran against staging Firebase” metnini yalnız doğrulanmış koşumdan sonra yazdırın.
7. Branch protection veya deployment ortamı kuralıyla lint, typecheck, unit test, authenticated E2E ve gerekli motor/worker testlerini zorunlu yapın.
8. Secret'ların loglara yazılmadığını; private key'in çok satırlı biçimde güvenli taşındığını doğrulayın.
9. Node 22'yi CI'daki desteklenen çalışma zamanı olarak sabitleyin; yerelde Node 25 ile geçen testleri yayın kanıtı saymayın.

### Gerekli testler

- Tüm secret'lar varken authenticated suite çalışır ve rapor üretir.
- Bir zorunlu secret eksik olduğunda release pipeline başarısız olur.
- Fork PR'larında secret sızdırmadan kontrollü skipped davranışı oluşur.
- CI'ın başarı metni, gerçek test raporu olmadan yazılamaz.

### Kabul ölçütü

Korunan ana dalda oturumlu E2E'ın atlanması veya yapılandırılamaması deploy'u engeller; her başarılı koşumun indirilebilir test artifaktı bulunur.

## Faz 3 — P1 güvenilir karşılaştırma ve F02 kapanışı: B03

### Amaç

“İyileşti”, “geriledi” veya “değişmedi” sonucunun yalnız eşdeğer taramalar için üretilmesi; belirsizliğin kesin sonuç gibi gösterilmemesi.

### Karşılaştırılabilirlik sözleşmesi

| Boyut | Karşılaştırma için koşul |
|---|---|
| Tarama durumu | Eski ve yeni tarama tamamlanmış |
| Hedef kapsam | Canonical URL/URL seti eşdeğer veya fark açıkça raporlanmış |
| Başarısız sayfalar | Sayı ve etkilenen URL'ler eşdeğer ya da sonuç `inconclusive` |
| Viewport | Aynı viewport profili |
| Tarama motoru | Aynı motor ve sürüm; farklıysa uyumsuz |
| Fingerprint | Aynı fingerprint sürümü veya açık migrasyon/eşleme kuralı |
| Skorlama | Aynı skorlama kuralı/sürümü |
| Tarama ayarları | Aynı cihaz, dil, kullanıcı akışı ve render modu |
| Zaman penceresi | Önceki uygun tarama seçiminde makul tarih ve site filtresi |

### Uygulama adımları

1. Her taramaya değişmez bir `scanContext` veya `comparisonProfile` ekleyin: viewport, engine/version, score version, fingerprint version, URL kapsam özeti/hash'i, başarısız/atlanmış sayfa listesi, locale, cihaz ve tarama ayarları.
2. `resolveComparison` içinde hem eski hem yeni taramanın tamamlanmasını zorunlu kılın.
3. Uyumsuzlukları boolean yerine neden kodlarıyla döndürün:
   - `NEW_SCAN_INCOMPLETE`
   - `OLD_SCAN_INCOMPLETE`
   - `VIEWPORT_MISMATCH`
   - `ENGINE_VERSION_MISMATCH`
   - `SCORE_VERSION_MISMATCH`
   - `SCOPE_MISMATCH`
   - `INSUFFICIENT_HISTORY`
4. Sonucu dört ayrı yaşam döngüsünde sunun: `verification_pending`, `verified_fixed`, `reopened`, `inconclusive`.
5. Son 50 workspace taramasıyla sınırlı aramayı kaldırın. Site/canonical URL ve uyumlu profil temelinde indeksli, sayfalı uygun önceki tarama sorgusu kullanın.
6. Geçmiş fingerprint v1/v2 kayıtları için açık politika belirleyin: güvenli migrasyon/eşleme veya yalnız “karşılaştırılamaz” gösterimi.
7. Kullanıcı arayüzünde belirsizlik nedeni ve eksik kapsam görünür olmalı; yeşil “düzeltildi” rozeti uyumsuz veride gösterilmemeli.
8. Rapor export'larında comparison profile ve belirsizlik gerekçelerini taşıyın.

### Gerekli testler

- Yeni scan tamamlanmadan sonuç üretilmez.
- Viewport, motor, skor sürümü ve fingerprint farklılıklarında `inconclusive` döner.
- Kapsamdan URL çıkarılması “düzeltildi” sayılmaz.
- 50'den eski ama uygun scan bulunabilir.
- Eşdeğer taramada gerçek düzeltme `verified_fixed`; tekrar oluşan sorun `reopened` olur.

### Kabul ölçütü

Yanlış olumlu “düzeltildi” senaryolarını temsil eden kabul testleri başarısız olmadan merge/deploy yapılamaz.

## Faz 4 — Staging uçtan uca kabul testi

### Amaç

Birim testlerin ötesinde, gerçek sistem zincirini güvenilir biçimde doğrulamak.

| Senaryo | Doğrulanacak sonuç |
|---|---|
| Rol matrisi | Viewer/editor/admin/export izinleri API ve server-rendered sayfalarda tutarlı |
| Kullanıcı kaydı/girişi | Signup ve login analitiği doğru ayrışır |
| Persona | Callback sonrası persona kaybolmaz; workspace önerileri doğru gelir |
| Tarama | Scan → queue → worker → rapor zinciri tamamlanır |
| Karşılaştırma | Eşdeğer taramada sonuç, uyumsuzlukta belirsizlik gösterilir |
| Manuel inceleme | İki kullanıcı kayıt oluşturur; revision ve erişim kontrolü çalışır |
| Silme/retention | Manuel kayıtlar dahil tüm bağlı veriler temizlenir |
| Bildirim | Yeni kritik bulgu/skor düşüşü için dedupe davranışı doğrulanır |
| Ödeme | Checkout, başarılı ödeme, webhook, plan güncellemesi ve başarısız webhook tekrar denemesi |
| Dil | Türkçe seçim, sayfalar arası devamlılık ve rapor dili |
| Release | Test edilen manifest ile staging deploy manifesti eşleşir |

Her senaryo için test verisi oluşturma, temizleme ve ekran/API kanıtı üreten tekrar edilebilir bir runbook hazırlanmalıdır.

### Kabul ölçütü

Kritik akışların tamamı Node 22 üzerinde staging'de geçmiş; sonuçlar CI artifaktı, manifest ve test kayıtlarıyla kanıtlanmış olmalı.

## Faz 5 — Ürün sözü ile plan/izin uygulamasını eşleme

Raporun temel ürün açığı, fiyat sayfası vaatlerinin bir envanter/test registry seviyesinde kalmasıdır. Her vaat için tek bir ürün sözleşmesi oluşturun.

| Alan | Ürün kararı | Teknik uygulama |
|---|---|---|
| Website kotası | Plan başına sayı mı, aylık kullanım mı? | Workspace/plan bazlı quota, sayaç, limit API'si, anlaşılır hata |
| Web raporu | Hangi planda mevcut? | Feature flag değil, sunucu tarafı yetki denetimi |
| AI ve PDF | Kota, erişim, saklama süresi | Entitlement + kullanım kaydı + export erişim kontrolü |
| CSV/API | Plan ve rol sınırı | Export/API permission'ı ile plan entitlement'ını birlikte denetleme |
| Çoklu müşteri workspace'i | Hangi planlarda? | Workspace oluşturma/geçiş, müşteri izolasyonu, üyelik modeli |
| Remediation | Görünüm, düzenleme, görev atama kapsamı | Rol/plan matrisi, audit log |
| SLA/destek | Operasyonel olarak verilebilir mi? | Satış metni, destek kanalı, yanıt taahhüdü ve süreç |

### Uygulama adımları

1. Her fiyatlandırma satırını `plan × özellik × limit × rol × kullanıcı mesajı` biçiminde kayıt altına alın.
2. UI görünürlüğünden bağımsız, sunucuda çalışan merkezi entitlement denetimi uygulayın.
3. Checkout/webhook sonrası plan değişimi, indirim, iptal, gecikmiş ödeme ve webhook tekrarını modelleyin.
4. `ALLOW_DIRECT_PLAN_SELECT` benzeri geliştirme bayraklarının production'da yanlışlıkla açılmasını önleyin: production'da varsayılan reddetme, açık allowlist, deploy-time kontrol ve audit log.
5. Fiyatlandırma metni, ürün içi upgrade ekranı ve API hata mesajlarını aynı kaynaktan üretin veya sözleşme testleriyle bağlayın.

### Kabul ölçütü

Satıştaki her vaat, gerçek bir yetki/kota kuralına veya açıkça “yakında” etiketli ifadeye karşılık gelir.

## Faz 6 — Kalan fonksiyonel boşluklar

### 1. E-posta teslim zinciri

Sağlayıcı seçimi, bildirim tercihleri, unsubscribe, kuyruk, retry/backoff, idempotency, bounce/teslim olayları ve audit kaydı uygulayın. Uygulama içi bildirimle e-posta durumu ayrıştırılmalıdır.

### 2. Türkçe sunucu üretimli raporlar

Çeviri anahtarları, dinamik bulgu metinleri, PDF/CSV/AI çıktıları, tarih-sayı biçimleri, fallback dili ve çeviri kapsama testi eklenmelidir.

### 3. Eski manuel inceleme verisi geçişi

LocalStorage kaynağı için kullanıcı onaylı import akışı oluşturun. Önizleme, çakışma çözümü, revision eşleme, hata raporu ve geri alınabilirlik gerektirir. Otomatik ve sessiz taşıma yapılmamalıdır.

### 4. Acknowledgement kalıcılığı

Tekrar erişim beklentisini doğru yansıtacak ürün kararı verin: kalıcı kayıt, oturumluk kayıt veya kaldırılmış mekanik. Metin ve veri modeli aynı davranmalıdır.

### 5. Kapsam/güven paneli

Kullanıcıya URL'ler, viewport, motor/skor sürümü, başarısız sayfalar, atlanan akışlar, manuel bekleyen işler ve karşılaştırma güven düzeyi tek yerde gösterilmelidir.

## Faz 7 — Deneyim ve büyüme

Mobil ana sayfa yaklaşık 24 ekran; fiyatlandırmanın yaklaşık 14 ekran aşağıda olması dönüşüm açısından risktir. Bu iş P1 teknik kapanışlardan sonra ele alınmalıdır.

- İlk ekranda değer önerisi, hedef kullanıcı, ana CTA ve kısa güven kanıtı bulunsun.
- Fiyatlandırmaya üst navigasyondan ve ilk 2–3 bölüm içinden erişim verin.
- Tekrarlanan açıklamaları birleştirin; ayrıntılı anlatımı açılır alanlar, örnek rapor veya ayrı kaynak sayfaya taşıyın.
- 320 px, 390×844, klavye navigasyonu, ekran okuyucu ve kontrast testlerini koruyun.
- Değişikliği CTA tıklaması, fiyat görüntüleme, signup başlatma/tamamlama, scroll derinliği ve mobil terk oranıyla ölçün.

### İnovasyon pilot sırası

1. Ortak manuel inceleme ve doğrulanmış düzeltme yaşam döngüsü.
2. Ajans/müşteri workspace'i.
3. PR preview/değişen kapsam denetimi.
4. Kaydedilebilir kullanıcı yolculukları.
5. Kanıta dayalı Türkçe AI düzeltme paketi.

Her pilot; müşteri problemi, hedef kullanıcı, başarı metriği, veri ihtiyacı, gizlilik sınırı ve devam/sonlandır kriteriyle başlatılmalıdır.

## Yayın karar kontrol listesi

- [ ] B01, B02 ve B03 için önce kırmızıya düşen sonra düzelen regresyon testleri var.
- [ ] Protected branch üzerinde authenticated E2E zorunlu.
- [ ] Staging'de rol, tarama, worker, rapor, karşılaştırma, inceleme, silme, retention ve ödeme senaryoları tamamlandı.
- [ ] Node 22 ile CI, typecheck, lint, test ve worker kontrolleri yeşil.
- [ ] Deploy manifest, test edilen ve yayımlanan commit/motor sürümünü eşleştiriyor.
- [ ] Fiyatlandırma vaatlerinin her biri gerçek yetki veya kota ile destekleniyor.
- [ ] E-posta, çeviri ve eski veri geçişi için kapsam/ürün kararları net.
- [ ] Veri silme, yetki ve ödeme ile ilgili staging kanıtları saklandı.
- [ ] Production doğrulaması, staging kanıtının yerine geçmeyecek ayrı bir kontrollü smoke-test ile yapıldı.

## Öncelik özeti

İlk teslim paketi B01–B03, staging kabulü ve release izlenebilirliği olmalıdır. Bu işler kapanmadan yeni büyüme özelliklerine yatırım yapmak, sistemin en yüksek riskleri çözülmeden kapsamı genişletir.

## Uygulama kaydı

7 Eylül 2026 ilk teknik paketinin durumu ve açık staging koşulları [uygulama durum kaydında](uygulama-durumu-2026-09-07.md), kabul adımları [staging runbook’unda](staging-kabul-runbook-2026-09-07.md) izlenir. Yerel testler, yayın kontrol listesinin tamamlandığı anlamına gelmez.
