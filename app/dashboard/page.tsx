import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  Boxes,
  Package,
  Wallet,
  AlertTriangle,
  Gem,
  ListChecks,
  Quote,
  ArrowDownLeft,
  ArrowUpLeft,
  Compass,
  BellRing,
} from "lucide-react";
import { db } from "@/db";
import { assets, notes, products, reminders, tasks, transactions, visions } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature, Stat, Badge, ProgressBar } from "@/components/ui";
import { BarsChart, ProgressRing } from "@/components/charts";
import {
  faNum,
  formatToman,
  formatTomanShort,
  faDate,
  relativeDay,
  daysUntil,
  STATUS_FA,
  REMINDER_TYPES,
} from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FALLBACK_QUOTES = [
  "هر صبح که برمی‌خیزی، کاروان عمرت یک روز به مقصد نزدیک‌تر است؛ امروز را به کار بگیر.",
  "پول در جیب نیست؛ پول در نظمی است که هر روز تکرارش می‌کنی.",
  "کسب‌وکارِ بزرگ، انبارِ کوچکی بود که صاحبش هر شب حسابش را می‌بست.",
];

export default async function DashboardHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="داشبورد با فعال‌سازی اشتراک باز می‌شود" />;
  }

  const since30 = new Date(Date.now() - 30 * 86400000);
  const since6 = new Date();
  since6.setDate(1);
  since6.setMonth(since6.getMonth() - 5);
  since6.setHours(0, 0, 0, 0);

  const [inv] = await db
    .select({
      count: sql<string>`count(*)::text`,
      units: sql<string>`coalesce(sum(${products.stock}),0)::text`,
      value: sql<string>`coalesce(sum(${products.price} * ${products.stock}),0)::text`,
    })
    .from(products)
    .where(eq(products.userId, user.id));

  const lowStock = await db
    .select()
    .from(products)
    .where(and(eq(products.userId, user.id), sql`${products.stock} <= ${products.lowStockThreshold}`))
    .orderBy(products.stock)
    .limit(5);

  const tx30 = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), gte(transactions.date, since6)))
    .orderBy(desc(transactions.date));

  const income30 = tx30.filter((t) => t.type === "income" && t.date >= since30).reduce((s, t) => s + t.amount, 0);
  const expense30 = tx30.filter((t) => t.type === "expense" && t.date >= since30).reduce((s, t) => s + t.amount, 0);

  const months: { label: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(since6);
    start.setMonth(since6.getMonth() + i);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    const bucket = tx30.filter((t) => t.date >= start && t.date < end);
    months.push({
      label: new Intl.DateTimeFormat("fa-IR", { month: "long" }).format(start),
      income: bucket.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: bucket.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    });
  }

  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, user.id))
    .orderBy(desc(tasks.updatedAt))
    .limit(50);
  const doneTasks = allTasks.filter((t) => t.status === "done").length;
  const taskPct = allTasks.length ? Math.round((doneTasks / allTasks.length) * 100) : 0;
  const openTasks = allTasks.filter((t) => t.status !== "done").slice(0, 4);

  const userVisions = await db
    .select()
    .from(visions)
    .where(eq(visions.userId, user.id))
    .orderBy(desc(visions.createdAt))
    .limit(3);

  const [assetSums] = await db
    .select({
      purchase: sql<string>`coalesce(sum(${assets.quantity} * ${assets.unitPurchasePrice}),0)::text`,
      current: sql<string>`coalesce(sum(${assets.quantity} * ${assets.unitCurrentValue}),0)::text`,
    })
    .from(assets)
    .where(eq(assets.userId, user.id));

  const quoteRows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, user.id), eq(notes.kind, "quote")))
    .orderBy(sql`random()`)
    .limit(1);
  const quote = quoteRows[0]?.content || FALLBACK_QUOTES[new Date().getDate() % FALLBACK_QUOTES.length];

  const recentTx = tx30.filter((t) => t.date >= since30).slice(0, 6);

  // upcoming / overdue reminders (next 14 days)
  const upcoming = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, user.id), eq(reminders.isDone, false)))
    .orderBy(reminders.dueDate)
    .limit(5);

  const assetCurrent = Number(assetSums?.current ?? 0);
  const assetPurchase = Number(assetSums?.purchase ?? 0);
  const assetProfit = assetCurrent - assetPurchase;

  return (
    <div className="grid gap-6">
      {/* welcome — mobile-first: stack vertically, compact ring */}
      <section className="card pattern-star relative overflow-hidden p-4 sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-brand-500/12 via-transparent to-gold-500/8" />
        <div className="relative grid gap-4 sm:gap-5">
          {/* top row: badge + ring */}
          <div className="flex items-center justify-between gap-3">
            <Badge tone={sub.isTrial ? "gold" : "brand"}>
              {sub.isTrial ? "هدیه آشنایی" : `پلن ${sub.planName}`}
            </Badge>
            <div className="flex items-center gap-3">
              <ProgressRing
                value={Math.min(100, Math.round((sub.daysLeft / Math.max(1, sub.totalDays)) * 100))}
                color={sub.isTrial ? "#e6b43e" : "#2fd6c6"}
                size={56}
              />
              <div className="text-left">
                <p className="text-sm font-black tabular-nums text-white">{faNum(sub.daysLeft)} روز</p>
                <p className="text-[9px] text-slate-500">{faDate(sub.endsAt)}</p>
              </div>
            </div>
          </div>

          {/* greeting */}
          <h1 className="text-lg font-black leading-8 text-white sm:text-xl lg:text-2xl">
            سلام {user.name.split(" ")[0]}؛ کاروانسرا آماده به راه است
          </h1>

          {/* quote — clamped to 2 lines on mobile */}
          <p className="line-clamp-2 flex items-start gap-2 text-xs leading-6 text-slate-400 sm:line-clamp-none sm:text-sm sm:leading-7">
            <Quote size={14} className="mt-0.5 shrink-0 text-gold-300" />
            {quote}
          </p>

          <Link href="/dashboard/subscription" className="text-xs font-bold text-brand-300 hover:text-brand-200">
            تمدید یا ارتقا ←
          </Link>
        </div>
      </section>

      {/* stats */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Package} label="محصولات انبار" value={faNum(Number(inv?.count ?? 0))} hint={`${faNum(Number(inv?.units ?? 0))} قلم کالا`} tone="brand" />
        <Stat
          icon={Boxes}
          label="ارزش انبار"
          value={formatTomanShort(Number(inv?.value ?? 0))}
          title={formatToman(Number(inv?.value ?? 0))}
          hint={lowStock.length ? `${faNum(lowStock.length)} کالا رو به اتمام` : "همه‌چیز مرتب است"}
          tone="lapis"
        />
        <Stat
          icon={Wallet}
          label="گردش ۳۰ روز اخیر"
          value={formatTomanShort(income30 - expense30)}
          title={formatToman(income30 - expense30)}
          hint={`${formatTomanShort(income30)} درآمد · ${formatTomanShort(expense30)} هزینه`}
          tone={income30 - expense30 >= 0 ? "brand" : "crimson"}
        />
        <Stat
          icon={Gem}
          label="ارزش پرتفولیو"
          value={formatTomanShort(assetCurrent)}
          title={formatToman(assetCurrent)}
          hint={`${assetProfit >= 0 ? "+" : "−"}${formatTomanShort(Math.abs(assetProfit))} نسبت به خرید`}
          tone="gold"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {/* chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black text-white">درآمد و هزینه ۶ ماه اخیر</h2>
            <Link href="/dashboard/accounting" className="text-xs font-bold text-brand-300 hover:text-brand-200">
              دفتر حسابداری ←
            </Link>
          </div>
          <BarsChart items={months} />
        </div>

        {/* tasks + visions */}
        <div className="grid gap-6">
          <div className="card flex items-center gap-4 p-5">
            <ProgressRing value={taskPct} size={76} color="#93b4f7" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-white">پیشرفت کارها</h2>
                <ListChecks size={18} className="text-lapis-300" />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {faNum(doneTasks)} از {faNum(allTasks.length)} کار انجام شده
              </p>
              <Link href="/dashboard/tasks" className="mt-1.5 inline-block text-xs font-bold text-brand-300 hover:text-brand-200">
                تخته کارها ←
              </Link>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-black text-white">
                <Compass size={17} className="text-gold-300" />
                چشم‌اندازها
              </h2>
              <Link href="/dashboard/tasks" className="text-xs font-bold text-brand-300 hover:text-brand-200">
                همه ←
              </Link>
            </div>
            {userVisions.length === 0 ? (
              <p className="text-xs leading-6 text-slate-500">هنوز چشم‌اندازی ننوشته‌ای؛ از تخته کارها اولین رؤیایت را تعریف کن.</p>
            ) : (
              <ul className="grid gap-3">
                {userVisions.map((v) => (
                  <li key={v.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-bold text-slate-200">{v.title}</span>
                      <span className="tabular-nums text-slate-400">{faNum(v.progress)}٪</span>
                    </div>
                    <ProgressBar value={v.progress} tone="gold" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* reminders */}
      {upcoming.length > 0 && (
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-black text-white">
              <BellRing size={17} className="text-crimson-400" />
              سررسیدهای پیش‌رو
            </h2>
            <Link href="/dashboard/reminders" className="text-xs font-bold text-brand-300 hover:text-brand-200">
              همه یادآوری‌ها ←
            </Link>
          </div>
          <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((r) => {
              const diff = daysUntil(r.dueDate);
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-xl bg-white/3 px-3 py-2.5">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      diff < 0 ? "bg-crimson-400/12 text-crimson-400" : diff <= 2 ? "bg-gold-400/12 text-gold-300" : "bg-lapis-400/12 text-lapis-300"
                    }`}
                  >
                    <BellRing size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-200">{r.title}</span>
                    <span className="block text-[10px] text-slate-500">
                      {REMINDER_TYPES[r.type] ?? r.type} · {relativeDay(r.dueDate)}
                    </span>
                  </span>
                  {r.amount > 0 && <span className="shrink-0 text-[11px] font-black tabular-nums text-gold-300">{faNum(r.amount)}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        {/* low stock */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-black text-white">
              <AlertTriangle size={17} className="text-gold-300" />
              کالاهای رو به اتمام
            </h2>
            <Link href="/dashboard/products" className="text-xs font-bold text-brand-300 hover:text-brand-200">
              انبار ←
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-xs leading-6 text-slate-500">کالایی به حد هشدار نرسیده است.</p>
          ) : (
            <ul className="grid gap-2.5">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/3 px-3 py-2.5">
                  <span className="truncate text-xs font-bold text-slate-200">{p.name}</span>
                  <Badge tone={p.stock === 0 ? "crimson" : "gold"}>{p.stock === 0 ? "تمام شد" : `${faNum(p.stock)} عدد`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* open tasks */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-black text-white">
              <ListChecks size={17} className="text-lapis-300" />
              کارهای در انتظار
            </h2>
            <Link href="/dashboard/tasks" className="text-xs font-bold text-brand-300 hover:text-brand-200">
              تخته ←
            </Link>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-xs leading-6 text-slate-500">کاری در صف نیست؛ وقت تجسم چشم‌انداز بعدی است.</p>
          ) : (
            <ul className="grid gap-2.5">
              {openTasks.map((t) => (
                <li key={t.id} className="rounded-xl bg-white/3 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-slate-200">{t.title}</span>
                    <Badge tone={t.status === "in_progress" ? "lapis" : "slate"}>{STATUS_FA[t.status]}</Badge>
                  </div>
                  {t.progress > 0 && <ProgressBar value={t.progress} className="mt-2" tone="lapis" />}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* recent transactions */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-black text-white">
              <Wallet size={17} className="text-brand-300" />
              آخرین تراکنش‌ها
            </h2>
            <Link href="/dashboard/accounting" className="text-xs font-bold text-brand-300 hover:text-brand-200">
              همه ←
            </Link>
          </div>
          {recentTx.length === 0 ? (
            <p className="text-xs leading-6 text-slate-500">هنوز تراکنشی ثبت نشده است.</p>
          ) : (
            <ul className="grid gap-2.5">
              {recentTx.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/3 px-3 py-2.5 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={
                        t.type === "income"
                          ? "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-400/12 text-brand-300"
                          : "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-crimson-400/12 text-crimson-400"
                      }
                    >
                      {t.type === "income" ? <ArrowDownLeft size={13} /> : <ArrowUpLeft size={13} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-slate-200">{t.description || t.category || "تراکنش"}</span>
                      <span className="block text-[10px] text-slate-500">{faDate(t.date)}</span>
                    </span>
                  </span>
                  <span className={`shrink-0 font-black tabular-nums ${t.type === "income" ? "text-brand-300" : "text-crimson-400"}`}>
                    {t.type === "income" ? "+" : "−"}{faNum(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
