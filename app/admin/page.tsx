import { desc, eq, gte, sql } from "drizzle-orm";
import { Users, Crown, CreditCard, Landmark, Clock } from "lucide-react";
import { db } from "@/db";
import { gatewaySettings, payments, plans, subscriptions, users } from "@/db/schema";
import { Stat, SectionTitle, Badge } from "@/components/ui";
import { Donut } from "@/components/charts";
import { faNum, formatToman, faDate, faDateTime, STATUS_FA } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "نمای کلی — پنل مدیریت" };

const GATEWAY_COLORS = { zarinpal: "#93b4f7", zibal: "#5fe8da" } as const;

export default async function AdminHome() {
  const [u] = await db.select({ count: sql<string>`count(*)::text` }).from(users);
  const newUsers30 = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(users)
    .where(gte(users.createdAt, new Date(Date.now() - 30 * 86400000)));

  const now = new Date();
  const activeSubs = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(subscriptions)
    .where(sql`${subscriptions.status} = 'active' and ${subscriptions.endsAt} > ${now}`);

  const [rev] = await db
    .select({
      total: sql<string>`coalesce(sum(${payments.amount}),0)::text`,
      count: sql<string>`count(*)::text`,
    })
    .from(payments)
    .where(eq(payments.status, "paid"));

  const [pendingCount] = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(payments)
    .where(eq(payments.status, "pending"));

  const allPlans = await db.select().from(plans);
  const allSubs = await db.select().from(subscriptions);
  const planDist = allPlans
    .map((p) => ({
      label: p.isTrial ? "هدیه ۷ روزه" : `پلن ${p.name}`,
      value: allSubs.filter((s) => s.planId === p.id && s.status === "active" && s.endsAt > now).length,
      color: p.isTrial ? "#e6b43e" : ["#5fe8da", "#93b4f7", "#a78bfa", "#f0657e"][p.sortOrder % 4],
    }))
    .filter((x) => x.value > 0);

  const recentPayments = await db
    .select({ payment: payments, user: users })
    .from(payments)
    .innerJoin(users, eq(payments.userId, users.id))
    .orderBy(desc(payments.createdAt))
    .limit(8);

  const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(6);

  const gateways = await db.select().from(gatewaySettings);

  const planName = (id: string) => {
    const p = allPlans.find((pl) => pl.id === id);
    return p ? (p.isTrial ? "هدیه آشنایی" : p.name) : "—";
  };

  return (
    <div className="grid gap-6">
      <SectionTitle title="نمای کلی" subtitle="پالس زنده کاروانسرا" />

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat icon={Users} tone="lapis" label="کاربران" value={faNum(Number(u?.count ?? 0))} hint={`${faNum(Number(newUsers30[0]?.count ?? 0))} عضو تازه در ۳۰ روز`} />
        <Stat icon={Crown} tone="gold" label="اشتراک‌های فعال" value={faNum(Number(activeSubs[0]?.count ?? 0))} />
        <Stat icon={CreditCard} tone="brand" label="درآمد کل" value={formatToman(Number(rev?.total ?? 0))} hint={`${faNum(Number(rev?.count ?? 0))} پرداخت موفق`} />
        <Stat icon={Clock} tone="violet" label="پرداخت‌های در انتظار" value={faNum(Number(pendingCount?.count ?? 0))} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="mb-4 font-black text-white">اشتراک‌های فعال بر اساس پلن</h2>
          {planDist.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">هنوز اشتراک فعالی وجود ندارد.</p>
          ) : (
            <Donut segments={planDist} centerValue={faNum(Number(activeSubs[0]?.count ?? 0))} centerLabel="اشتراک فعال" />
          )}
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
            <h2 className="font-black text-white">آخرین پرداخت‌ها</h2>
            <Link href="/admin/payments" className="text-xs font-bold text-gold-300 hover:text-gold-200">
              همه پرداخت‌ها ←
            </Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-slate-500">هنوز پرداختی ثبت نشده است.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentPayments.map(({ payment, user }) => (
                <li key={payment.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-xs">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-white">{user.name}</span>
                    <span className="block text-[10px] text-slate-500">
                      پلن {planName(payment.planId)} · {faDateTime(payment.createdAt)}
                    </span>
                  </span>
                  <Badge tone="slate">{payment.gateway === "zarinpal" ? "زرین‌پال" : "زیبال"}</Badge>
                  <span className="font-black tabular-nums text-slate-200">{formatToman(payment.amount)}</span>
                  <Badge tone={payment.status === "paid" ? "emerald" : payment.status === "pending" ? "gold" : "crimson"}>
                    {STATUS_FA[payment.status] ?? payment.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black text-white">تازه‌ترین کاربران</h2>
            <Link href="/admin/users" className="text-xs font-bold text-gold-300 hover:text-gold-200">
              همه کاربران ←
            </Link>
          </div>
          <ul className="grid gap-2.5">
            {recentUsers.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-white/3 px-4 py-2.5 text-xs">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-lapis-400/15 font-black text-lapis-200">
                  {r.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">{r.name}</span>
                  <span className="block truncate text-[10px] text-slate-500" dir="ltr">
                    {r.email}
                  </span>
                </span>
                {r.role === "admin" && <Badge tone="gold">مدیر</Badge>}
                <span className="text-[10px] text-slate-500">{faDate(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-black text-white">
              <Landmark size={17} className="text-gold-300" />
              وضعیت درگاه‌ها
            </h2>
            <Link href="/admin/gateways" className="text-xs font-bold text-gold-300 hover:text-gold-200">
              تنظیمات ←
            </Link>
          </div>
          <ul className="grid gap-3">
            {(["zarinpal", "zibal"] as const).map((g) => {
              const row = gateways.find((x) => x.gateway === g);
              const ok = row?.isActive && row?.merchantId;
              return (
                <li key={g} className="flex items-center justify-between rounded-xl bg-white/3 px-4 py-3 text-xs">
                  <span className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: GATEWAY_COLORS[g] }} />
                    <span className="font-bold text-white">{g === "zarinpal" ? "زرین‌پال" : "زیبال"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {row?.isSandbox && <Badge tone="gold">آزمایشی</Badge>}
                    <Badge tone={ok ? "emerald" : "crimson"}>{ok ? "متصل" : "غیرفعال"}</Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
