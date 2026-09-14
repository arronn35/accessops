import { SolutionPage } from "@/components/marketing/SolutionPage";
import { canonical } from "@/lib/seo/canonical";
import { verifySessionCookie } from "@/lib/auth/session";

export const metadata = {
  ...canonical("/solutions/turkiye"),
  title: "Türkiye ekipleri için erişilebilirlik operasyonu — Percevia AI",
  description: "Türkiye'deki ürün ve ajans ekipleri için erişilebilirlik taraması, iyileştirme yönetimi ve şeffaf raporlama.",
};
export const dynamic = "force-dynamic";

export default async function TurkiyeSolutionPage() {
  const signedIn = Boolean(await verifySessionCookie().catch(() => null));

  return (
    <div lang="tr">
      <SolutionPage
        locale="tr"
        signedIn={signedIn}
        eyebrow="Türkiye için"
        title="Erişilebilirlik bulgularını uygulanabilir işe dönüştürün"
        description="Percevia AI; ajansların, SaaS ekiplerinin ve e-ticaret ürünlerinin kritik kullanıcı akışlarını taramasına, tekrar eden sorunları gruplamasına ve ekiplerin anlayacağı raporlar üretmesine yardımcı olur. Tek tıkla uyumluluk veya sertifika vaat etmez."
        aside="Türkçe anlatım, açık kapsam, gerçek iyileştirme"
        problems={[
          { title: "Önce kritik akışlar", body: "Kayıt, giriş, satın alma ve form gönderimi gibi iş sonucunu etkileyen yolculukları temsil eden sayfalarla başlayın." },
          { title: "Tekrarlanan sorunları gruplayın", body: "Her sayfadaki aynı ihlali ayrı görev yapmak yerine ortak bileşen veya şablon kök nedenine bağlayın." },
          { title: "Yönetilebilir rapor üretin", body: "Otomatik bulguları, manuel inceleme gereksinimlerini ve çözüm sahiplerini aynı iş kaydında tutun." },
        ]}
        outcomes={[
          "Kamuya açık tek bir sayfayı hesap açmadan ön kontrol edin.",
          "Aynı URL'yi kayıt sonrasında tam tarama formuna taşıyın.",
          "WCAG eşlemeli PDF, HTML ve CSV çıktıları üretin.",
          "Bulguları geliştirici ve ürün ekibi arasında sahipli görevlere dönüştürün.",
        ]}
        pilotTitle="Temsilî bir web sitesiyle yedi günlük erişilebilirlik pilotu çalıştırın"
      />
    </div>
  );
}
