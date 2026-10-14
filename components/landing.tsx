"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  Store,
  Wallet,
  Target,
  StickyNote,
  Gem,
  ArrowLeft,
  Check,
  Crown,
  Gift,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  LayoutDashboard,
  Zap,
  Quote,
  Printer,
} from "lucide-react";
import { Logo, Badge } from "@/components/ui";
import { faNum, formatToman } from "@/lib/format";

export type LandingPlan = {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  price: number;
  isTrial: boolean;
};

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

const FEATURES = [
  {
    icon: Package,
    title: "انبارداری دقیق",
    desc: "موجودی، حد هشدار اتمام کالا، سوابق کامل ورود و خروج، جست‌وجوی سریع و ارزش لحظه‌ای انبار.",
    tone: "from-brand-400/20 to-brand-400/5 text-brand-300",
  },
  {
    icon: Store,
    title: "اتصال به ووکامرس",
    desc: "فروشگاه وردپرسی‌ات را با کلید API وصل کن؛ محصولات خودکار وارد می‌شوند و تغییر موجودی دوطرفه همگام می‌ماند.",
    tone: "from-violet-400/20 to-violet-400/5 text-violet-300",
  },
  {
    icon: Printer,
    title: "فیش و فاکتور فروش",
    desc: "صدور فیش حرارتی ۸۰ و ۵۸ میلی‌متری مخصوص رستوران و فروشگاه، به‌همراه فاکتور رسمی A4 با لوگوی کسب‌وکار.",
    tone: "from-rose-400/20 to-rose-400/5 text-rose-300",
  },
  {
    icon: Wallet,
    title: "حسابداری جامع",
    desc: "ثبت درآمد و هزینه با سرفصل‌های فارسی، نمودار ۶ ماهه، تراز ماهانه و گزارش دسته‌بندی‌شده.",
    tone: "from-gold-400/20 to-gold-400/5 text-gold-300",
  },
  {
    icon: Target,
    title: "کارها و چشم‌اندازها",
    desc: "تخته کانبان کارها با درصد پیشرفت، مدیریت مهلت‌ها و تعریف چشم‌اندازهای بزرگ با حلقه پیشرفت.",
    tone: "from-lapis-400/20 to-lapis-400/5 text-lapis-300",
  },
  {
    icon: StickyNote,
    title: "دفترچه مدیر",
    desc: "یادداشت‌های شخصی و جمله‌های انگیزشی خودت؛ هر روز یکی از آن‌ها روی داشبوردت می‌درخشد.",
    tone: "from-crimson-400/20 to-crimson-400/5 text-crimson-400",
  },
  {
    icon: Gem,
    title: "پرتفولیو دارایی‌ها",
    desc: "طلا، ارز، سهام، ملک و رمزارز؛ ارزش روز و سود و زیان هر دارایی را در یک نگاه ببین.",
    tone: "from-teal-400/20 to-teal-400/5 text-teal-300",
  },
];

const MARQUEE = [
  "انبارداری هوشمند",
  "فیش حرارتی ۸۰ و ۵۸ میلی‌متری",
  "فاکتور فروش و خرید",
  "همگام‌سازی ووکامرس",
  "حسابداری جامع",
  "تخته کارها و کانبان",
  "چشم‌انداز و رؤیاها",
  "دفترچه مدیر",
  "جمله‌های انگیزشی",
  "پرتفولیو دارایی",
  "زرین‌پال",
  "زیبال",
];

export function Landing({ plans, loggedIn }: { plans: LandingPlan[]; loggedIn: boolean }) {
  const ctaHref = loggedIn ? "/dashboard" : "/register";
  const trial = plans.find((p) => p.isTrial);
  const paid = plans.filter((p) => !p.isTrial);
  const featuredId = paid.find((p) => p.durationDays === 365)?.id;

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-night-950">
      {/* backdrop */}
      <div className="pointer-events-none fixed inset-0 pattern-star opacity-70" />
      <div className="pointer-events-none fixed -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-gold-500/8 blur-3xl" />

      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-night-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3.5 lg:px-6">
          <Logo withText size={38} />
          <nav className="hidden flex-1 items-center gap-6 text-xs font-bold text-slate-400 md:flex">
            <a href="#features" className="transition hover:text-brand-300">امکانات</a>
            <a href="#woo" className="transition hover:text-brand-300">اتصال ووکامرس</a>
            <a href="#pricing" className="transition hover:text-brand-300">تعرفه‌ها</a>
            <Link href="/blog" className="transition hover:text-brand-300">وبلاگ</Link>
          </nav>
          <div className="flex items-center gap-2">
            {loggedIn ? (
              <Link href="/dashboard" className="btn-primary">
                <LayoutDashboard size={16} />
                ورود به داشبورد
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-soft hidden sm:inline-flex">ورود</Link>
                <Link href="/register" className="btn-gold">
                  <Gift size={15} />
                  ۷ روز رایگان
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:px-6 lg:pt-24">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 text-[11px] font-bold text-gold-200">
            <Sparkles size={13} />
            کاروانسرای دیجیتال کسب‌وکار ایرانی
          </span>
          <h1 className="mt-6 text-4xl font-black leading-[1.35] text-white sm:text-5xl lg:text-[3.4rem]">
            انبار، حساب و{" "}
            <span className="bg-gradient-to-l from-brand-300 via-teal-200 to-gold-300 bg-clip-text text-transparent">
              رؤیای کسب‌وکارت
            </span>
            ؛ یک‌جا، یک‌دست
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-8 text-slate-400 sm:text-base">
            کاروانسرا، سامانه یکپارچه انبارداری با اتصال مستقیم به ووکامرس است؛ در کنار حسابداری جامع،
            مدیریت کارها، دفترچه مدیر و پرتفولیو دارایی‌ها. همه‌چیز برای این‌که کاروان تو همیشه به راه باشد.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={ctaHref} className="btn-gold px-7 py-3.5 text-base">
              <Gift size={19} />
              {loggedIn ? "رفتن به کاروانسرا" : "۷ روز رایگان شروع کن"}
            </Link>
            <a href="#features" className="btn-soft px-6 py-3.5 text-base">
              تماشای امکانات
              <ArrowLeft size={17} />
            </a>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck size={13} className="text-brand-300" />
            بدون نیاز به کارت بانکی برای شروع · پرداخت امن با زرین‌پال و زیبال
          </p>
        </motion.div>

        {/* hero art */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative mx-auto hidden w-full max-w-md sm:block"
          aria-hidden
        >
          <div className="arch pattern-star relative mx-auto aspect-[4/5] w-72 overflow-hidden border border-white/10 bg-gradient-to-b from-night-800 to-night-900 lg:w-80">
            <div className="absolute inset-0 bg-gradient-to-t from-brand-500/15 via-transparent to-gold-500/10" />
            <svg viewBox="0 0 200 200" className="animate-glow absolute left-1/2 top-1/2 w-40 -translate-x-1/2 -translate-y-1/2">
              <g fill="none" strokeWidth="1.6">
                <rect x="55" y="55" width="90" height="90" rx="10" stroke="#2fd6c6" opacity="0.9" />
                <rect x="55" y="55" width="90" height="90" rx="10" stroke="#e6b43e" opacity="0.9" transform="rotate(45 100 100)" />
                <rect x="70" y="70" width="60" height="60" rx="8" stroke="#93b4f7" opacity="0.6" />
                <rect x="70" y="70" width="60" height="60" rx="8" stroke="#f0657e" opacity="0.45" transform="rotate(45 100 100)" />
                <circle cx="100" cy="100" r="14" fill="#e6b43e" opacity="0.9" />
                <circle cx="100" cy="100" r="6" fill="#0d1426" />
              </g>
            </svg>
            <div className="absolute inset-x-0 bottom-0 p-5 text-center">
              <p className="text-xs font-black text-white">کاروانسرا</p>
              <p className="mt-0.5 text-[10px] text-slate-400">بانکدار، انباردار و دبیرِ خاطرات تو</p>
            </div>
          </div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="card absolute -right-6 top-10 flex items-center gap-2.5 px-4 py-3 shadow-2xl shadow-black/40"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-400/15 text-violet-300">
              <RefreshCw size={16} />
            </span>
            <span>
              <span className="block text-xs font-black text-white">{faNum(2400)} محصول</span>
              <span className="block text-[10px] text-slate-400">از ووکامرس همگام شد</span>
            </span>
          </motion.div>

          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            className="card absolute -left-8 top-1/2 flex items-center gap-2.5 px-4 py-3 shadow-2xl shadow-black/40"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-400/15 text-brand-300">
              <Zap size={16} />
            </span>
            <span>
              <span className="block text-xs font-black text-white">پرداخت موفق</span>
              <span className="block text-[10px] text-slate-400">پلن سالانه · زرین‌پال</span>
            </span>
          </motion.div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
            className="card absolute -bottom-4 right-8 flex items-center gap-2.5 px-4 py-3 shadow-2xl shadow-black/40"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-400/15 text-gold-300">
              <Target size={16} />
            </span>
            <span>
              <span className="block text-xs font-black text-white">چشم‌انداز: {faNum(1000)} فروش ماهانه</span>
              <span className="block text-[10px] text-slate-400">{faNum(80)}٪ طی شده</span>
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* marquee */}
      <div className="relative border-y border-white/5 bg-night-900/50 py-4">
        <div dir="ltr" className="flex overflow-hidden">
          <div className="animate-marquee flex shrink-0 items-center gap-10 pl-10">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} dir="rtl" className="flex items-center gap-2 whitespace-nowrap text-xs font-bold text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400/70" />
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* features */}
      <section id="features" className="relative mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <motion.div {...fadeUp} className="mx-auto max-w-xl text-center">
          <Badge tone="brand">همه‌چیز، زیر یک سقف</Badge>
          <h2 className="mt-4 text-3xl font-black text-white">هفت اتاق اصلی کاروانسرا</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            از قفسه‌های انبار تا دفتر حساب و رؤیاهایت؛ هر بخش با وسواس یک کدبانوی ایرانی طراحی شده است.
          </p>
        </motion.div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.07 }}
              className="card group relative overflow-hidden p-6 transition hover:-translate-y-1.5 hover:border-white/15"
            >
              <div className={`pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-50 blur-2xl transition-opacity group-hover:opacity-90 ${f.tone.split(" ").slice(0, 2).join(" ")}`} />
              <span className={`relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${f.tone}`}>
                <f.icon size={22} />
              </span>
              <h3 className="relative mt-5 text-lg font-black text-white">{f.title}</h3>
              <p className="relative mt-2 text-xs leading-7 text-slate-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* woo section */}
      <section id="woo" className="relative mx-auto max-w-6xl px-4 py-16 lg:px-6">
        <div className="card pattern-star relative grid gap-10 overflow-hidden p-8 lg:grid-cols-2 lg:p-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-violet-500/10 via-transparent to-brand-500/8" />
          <motion.div {...fadeUp} className="relative">
            <Badge tone="violet">پل مستقیم به فروشگاه</Badge>
            <h2 className="mt-4 text-2xl font-black leading-10 text-white lg:text-3xl">
              انبار تو و فروشگاه ووکامرسی‌ات،
              <span className="text-violet-300"> یک موجود زنده </span>
              هستند
            </h2>
            <ol className="mt-6 grid gap-4">
              {[
                "نشانی سایت و دو کلید REST API ووکامرس را وارد کن.",
                "دکمه همگام‌سازی را بزن؛ محصولات، قیمت و موجودی‌ها وارد انبار می‌شوند.",
                "هر بار که در کاروانسرا موجودی را کم یا زیاد کنی، به‌صورت خودکار سایت هم به‌روز می‌شود.",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-7 text-slate-300">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-violet-400/15 text-xs font-black text-violet-300">
                    {faNum(i + 1)}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
            <Link href={ctaHref} className="btn-primary mt-8">
              <Store size={17} />
              فروشگاهم را وصل کنم
            </Link>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.15 }} className="relative">
            <div className="rounded-3xl border border-white/10 bg-night-950/80 p-5 font-mono text-[11px] leading-6 shadow-2xl" dir="ltr">
              <div className="mb-3 flex items-center gap-1.5" dir="ltr">
                <span className="h-2.5 w-2.5 rounded-full bg-crimson-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-gold-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-400" />
                <span className="ml-2 text-[10px] text-slate-600">karvansara · woocommerce-sync</span>
              </div>
              {[
                ["GET", "/wp-json/wc/v3/products → 200 OK"],
                ["✓", "24 products imported"],
                ["✓", "prices & stock synced"],
                ["PUT", "/products/1288 stock_quantity=42 → 200"],
                ["✓", "anbar ⇄ woo · in sync"],
              ].map(([k, v], i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.25 }}
                  className="text-slate-400"
                >
                  <span className={k === "GET" ? "text-lapis-300" : k === "PUT" ? "text-gold-300" : "text-brand-300"}>{k}</span>{" "}
                  {v}
                </motion.p>
              ))}
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="mt-1 inline-block h-4 w-2 bg-brand-300 align-middle"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="relative mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <motion.div {...fadeUp} className="mx-auto max-w-xl text-center">
          <Badge tone="gold">
            <Crown size={12} />
            تعرفه‌های صادقانه
          </Badge>
          <h2 className="mt-4 text-3xl font-black text-white">اول بچش، بعد انتخاب کن</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            {trial ? `۷ روز کامل، رایگان و بدون کارت بانکی؛ بعدش هم ماهانه از ${formatToman(paid[0]?.price ?? 100000)}.` : "پلن‌ها آماده می‌شوند…"}
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {trial && (
            <motion.div {...fadeUp} className="card relative flex flex-col border-gold-400/35 p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-400/15 text-gold-300">
                <Gift size={20} />
              </span>
              <h3 className="mt-4 text-lg font-black text-gold-200">هدیه آشنایی</h3>
              <p className="mt-1 text-[11px] leading-6 text-slate-400">{trial.description}</p>
              <p className="mt-4 text-3xl font-black text-white">
                رایگان
                <span className="mr-2 text-xs font-medium text-slate-500">/ {faNum(trial.durationDays)} روز</span>
              </p>
              <ul className="mt-5 grid flex-1 content-start gap-2 text-[11px] text-slate-300">
                <Perk>دسترسی به همه بخش‌ها</Perk>
                <Perk>بدون نیاز به کارت بانکی</Perk>
                <Perk>فقط یک‌بار برای هر حساب</Perk>
              </ul>
              <Link href={ctaHref} className="btn-gold mt-6 justify-center">فعال‌سازی رایگان</Link>
            </motion.div>
          )}

          {paid.map((p, i) => {
            const featured = p.id === featuredId;
            const monthly = Math.round(p.price / (p.durationDays / 30));
            return (
              <motion.div
                key={p.id}
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.06 * (i + 1) }}
                className={`card relative flex flex-col p-6 ${featured ? "border-brand-400/45 shadow-2xl shadow-brand-500/10" : ""}`}
              >
                {featured && (
                  <span className="absolute -left-9 top-4 rotate-45 bg-gradient-to-l from-brand-400 to-teal-500 px-10 py-1 text-[10px] font-black text-night-950">
                    محبوب‌ترین
                  </span>
                )}
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${featured ? "bg-brand-400/15 text-brand-300" : "bg-lapis-400/15 text-lapis-300"}`}>
                  <Crown size={20} />
                </span>
                <h3 className="mt-4 text-lg font-black text-white">پلن {p.name}</h3>
                <p className="mt-1 text-[11px] leading-6 text-slate-400">{p.description}</p>
                <p className="mt-4 text-3xl font-black tabular-nums text-white">
                  {faNum(p.price)}
                  <span className="mr-2 text-xs font-medium text-slate-500">تومان / {faNum(p.durationDays)} روز</span>
                </p>
                <ul className="mt-5 grid flex-1 content-start gap-2 text-[11px] text-slate-300">
                  <Perk>دسترسی به همه بخش‌ها</Perk>
                  <Perk>معادل ماهانه {faNum(monthly)} تومان</Perk>
                  <Perk>پرداخت با زرین‌پال و زیبال</Perk>
                </ul>
                <Link href={ctaHref} className={`mt-6 justify-center ${featured ? "btn-primary" : "btn-soft"}`}>
                  انتخاب پلن {p.name}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* quote + cta */}
      <section className="relative mx-auto max-w-4xl px-4 pb-24 lg:px-6">
        <motion.div {...fadeUp} className="card pattern-star-gold relative overflow-hidden px-8 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold-500/10 to-transparent" />
          <Quote size={28} className="mx-auto text-gold-300" />
          <p className="mx-auto mt-5 max-w-2xl text-xl font-black leading-10 text-white lg:text-2xl">
            «کسب‌وکارِ بزرگ، انبارِ کوچکی بود که صاحبش هر شب حسابش را می‌بست.»
          </p>
          <p className="mt-3 text-xs text-slate-400">امشب، دفتر تو کاروانسراست.</p>
          <Link href={ctaHref} className="btn-gold relative mt-8 px-8 py-3.5 text-base">
            <Sparkles size={18} />
            همین حالا رایگان شروع کن
          </Link>
        </motion.div>
      </section>

      {/* footer */}
      <footer className="relative border-t border-white/5 bg-night-900/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-10 lg:px-6">
          <Logo withText size={36} />
          <nav className="flex flex-wrap items-center gap-5 text-xs font-bold text-slate-400">
            <a href="#features" className="transition hover:text-brand-300">امکانات</a>
            <a href="#woo" className="transition hover:text-brand-300">ووکامرس</a>
            <a href="#pricing" className="transition hover:text-brand-300">تعرفه‌ها</a>
            <Link href="/blog" className="transition hover:text-brand-300">وبلاگ</Link>
            <Link href="/login" className="transition hover:text-brand-300">ورود</Link>
          </nav>
          <p className="text-[10px] text-slate-600">© {faNum(1404)} کاروانسرا — ساخته‌شده با مهر برای کسب‌وکارهای ایرانی</p>
        </div>
      </footer>
    </div>
  );
}

function Perk({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check size={13} className="shrink-0 text-brand-300" />
      {children}
    </li>
  );
}
