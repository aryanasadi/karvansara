import Link from "next/link";
import { ArrowRight, Gift, ShieldCheck, Zap } from "lucide-react";
import { Logo } from "@/components/ui";
import { RegisterForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "ثبت‌نام — ۷ روز رایگان" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");

  return (
    <main className="pattern-star grid min-h-dvh lg:grid-cols-2">
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 inline-flex items-center gap-2 text-xs font-bold text-slate-400 transition hover:text-brand-300">
            <ArrowRight size={15} />
            بازگشت به خانه
          </Link>
          <Logo withText size={44} />
          <h1 className="mt-8 text-3xl font-black text-white">کاروانسرای تو را بساز</h1>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            یک دقیقه‌ای ثبت‌نام کن و هدیه ۷ روزه دسترسی کامل را فعال کن؛ بدون نیاز به کارت بانکی.
          </p>
          <div className="mt-8">
            <RegisterForm />
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            قبلاً ثبت‌نام کرده‌ای؟{" "}
            <Link href="/login" className="font-bold text-brand-300 hover:text-brand-200">
              وارد شو
            </Link>
          </p>
        </div>
      </section>
      <aside className="relative hidden overflow-hidden border-r border-white/5 lg:block">
        <div className="absolute inset-0 bg-gradient-to-bl from-gold-500/12 via-night-900 to-night-950" />
        <div className="pattern-star-gold absolute inset-0" />
        <div className="absolute inset-0 flex flex-col items-start justify-center gap-6 px-14">
          {[
            [Gift, "هدیه آشنایی", "۷ روز دسترسی کامل به همه امکانات، رایگان"],
            [Zap, "اتصال فوری ووکامرس", "محصولات فروشگاهت در یک کلیک همگام می‌شوند"],
            [ShieldCheck, "پرداخت امن", "زرین‌پال و زیبال؛ تمدید با یک لمس"],
          ].map(([Icon, t, s], i) => {
            const I = Icon as typeof Gift;
            return (
              <div key={i} className="card flex items-start gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-400/25 to-gold-400/5 text-gold-300">
                  <I size={20} />
                </span>
                <span>
                  <span className="block font-black text-white">{t as string}</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-400">{s as string}</span>
                </span>
              </div>
            );
          })}
        </div>
      </aside>
    </main>
  );
}
