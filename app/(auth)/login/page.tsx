import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui";
import { LoginForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { getSmsConfig } from "@/lib/sms";
import { ensureSeedData } from "@/lib/seed";
import { redirect } from "next/navigation";

export const metadata = { title: "ورود — کاروانسرا" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await ensureSeedData();
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");
  const sms = await getSmsConfig();
  const smsEnabled = sms.isActive && sms.loginEnabled;

  return (
    <main className="pattern-star grid min-h-dvh lg:grid-cols-2">
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 inline-flex items-center gap-2 text-xs font-bold text-slate-400 transition hover:text-brand-300">
            <ArrowRight size={15} />
            بازگشت به خانه
          </Link>
          <Logo withText size={44} />
          <h1 className="mt-8 text-3xl font-black text-white">خوش برگشتی، ساربان</h1>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            کاروان منتظر توست؛ وارد شو و کاروانسرای کسب‌وکارت را بچرخان.
          </p>
          <div className="mt-8">
            <LoginForm smsEnabled={smsEnabled} />
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            حساب نداری؟{" "}
            <Link href="/register" className="font-bold text-gold-300 hover:text-gold-200">
              ۷ روز رایگان شروع کن
            </Link>
          </p>
        </div>
      </section>
      <aside className="relative hidden overflow-hidden border-r border-white/5 lg:block">
        <div className="absolute inset-0 bg-gradient-to-bl from-brand-500/15 via-night-900 to-night-950" />
        <div className="pattern-star-gold absolute inset-0" />
        <div className="absolute inset-0 flex flex-col items-start justify-center px-14">
          <p className="max-w-md text-3xl font-black leading-[1.6] text-white">
            «هر که در این سرا به کاروان رسید،
            <span className="text-gold-300"> بارِ غم از دل برکند</span>»
          </p>
          <p className="mt-4 text-sm text-slate-400">انبار، حساب‌ها و رؤیاهایت در یک جا.</p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              ["انبارداری", "همگام با ووکامرس"],
              ["حسابداری", "گزارش زنده"],
              ["پرتفولیو", "دارایی و سرمایه"],
            ].map(([t, s]) => (
              <div key={t} className="card animate-float-slow p-4">
                <p className="text-sm font-black text-brand-300">{t}</p>
                <p className="mt-1 text-[11px] text-slate-400">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
