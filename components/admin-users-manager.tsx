"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Crown, ShieldCheck, ShieldOff, Gift, XCircle, Users, Loader2 } from "lucide-react";
import { Modal, Field, Notice } from "@/components/manager-ui";
import { EmptyState, Badge, SectionTitle, Stat } from "@/components/ui";
import { faNum, formatToman, faDate } from "@/lib/format";
import {
  grantSubscriptionAction,
  revokeSubscriptionAction,
  setUserRoleAction,
  type AdminResult,
} from "@/app/admin/actions";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  businessName: string;
  createdAt: string;
  usedTrial: boolean;
  paidTotal: number;
  paidCount: number;
  activePlan: string;
  activeSource: string;
  daysLeft: number;
};

export type PlanOption = { id: string; name: string; durationDays: number };

export function AdminUsersManager({ initial, plans }: { initial: AdminUserRow[]; plans: PlanOption[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [grantFor, setGrantFor] = useState<AdminUserRow | null>(null);
  const [notice, setNotice] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initial;
    return initial.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        u.businessName.toLowerCase().includes(q)
    );
  }, [initial, search]);

  const stats = useMemo(
    () => ({
      total: initial.length,
      active: initial.filter((u) => u.activePlan).length,
      revenue: initial.reduce((s, u) => s + u.paidTotal, 0),
    }),
    [initial]
  );

  function run(fn: () => Promise<AdminResult>, close = false) {
    start(async () => {
      const res = await fn();
      setNotice(res);
      if (!res.error && close) setGrantFor(null);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <SectionTitle title="کاربران" subtitle={`${faNum(initial.length)} حساب ثبت‌شده`} />

      {notice?.error && <Notice kind="error">{notice.error}</Notice>}
      {notice?.message && <Notice kind="success">{notice.message}</Notice>}

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat icon={Users} tone="lapis" label="کل کاربران" value={faNum(stats.total)} />
        <Stat icon={Crown} tone="gold" label="اشتراک فعال" value={faNum(stats.active)} />
        <Stat icon={ShieldCheck} tone="brand" label="درآمد کل" value={formatToman(stats.revenue)} />
      </section>

      <label className="relative block w-full sm:max-w-sm">
        <Search size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجو: نام، ایمیل یا موبایل…" className="field pr-10" />
      </label>

      {list.length === 0 ? (
        <EmptyState icon={Users} title="کاربری یافت نشد" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((u) => (
            <div key={u.id} className="card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lapis-400/15 text-base font-black text-lapis-200">
                  {u.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-white">{u.name}</span>
                    {u.role === "admin" && <Badge tone="gold">مدیر</Badge>}
                    {u.activePlan ? (
                      <Badge tone={u.activeSource === "admin" ? "violet" : "brand"}>
                        {u.activePlan} · {faNum(u.daysLeft)} روز
                      </Badge>
                    ) : (
                      <Badge tone="slate">{u.usedTrial ? "آزمایشی مصرف‌شده" : "بدون اشتراک"}</Badge>
                    )}
                  </div>
                  <p className="mt-1 break-anywhere text-[10px] text-slate-500" dir="ltr">
                    {u.email}
                    {u.phone && ` · ${u.phone}`}
                  </p>
                  {u.businessName && <p className="mt-0.5 truncate text-[10px] text-slate-500">{u.businessName}</p>}
                  <p className="mt-1 text-[10px] text-slate-500">
                    عضویت {faDate(u.createdAt)} · خرید {formatToman(u.paidTotal)} ({faNum(u.paidCount)} پرداخت)
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={() => setGrantFor(u)} className="btn-gold flex-1 py-2 text-xs">
                  <Gift size={13} />
                  اعطای اشتراک
                </button>
                {u.activePlan && (
                  <button
                    onClick={() => window.confirm(`اشتراک «${u.name}» لغو شود؟`) && run(() => revokeSubscriptionAction(u.id))}
                    className="btn-soft border-crimson-400/30 py-2 text-xs text-crimson-300"
                  >
                    <XCircle size={13} />
                    لغو
                  </button>
                )}
                <button
                  onClick={() => run(() => setUserRoleAction(u.id, u.role === "admin" ? "user" : "admin"))}
                  className="btn-soft py-2 text-xs"
                  title={u.role === "admin" ? "تبدیل به کاربر عادی" : "ارتقا به مدیر"}
                >
                  {u.role === "admin" ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={grantFor !== null} onClose={() => setGrantFor(null)} title={`اعطای اشتراک به ${grantFor?.name ?? ""}`}>
        {grantFor && (
          <form
            action={(fd) => {
              fd.set("userId", grantFor.id);
              run(() => grantSubscriptionAction(fd), true);
            }}
            className="grid gap-4"
          >
            <div className="rounded-xl bg-white/3 px-4 py-3 text-[11px] leading-6 text-slate-400">
              اشتراک دستی بدون پرداخت فعال می‌شود و زمان باقی‌مانده اشتراک فعلی هم حفظ می‌شود.
            </div>
            <Field label="پلن">
              <select name="planId" required className="field" defaultValue={plans[1]?.id ?? plans[0]?.id}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({faNum(p.durationDays)} روز)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="مدت سفارشی (روز)" hint="خالی یا صفر یعنی همان مدت پیش‌فرض پلن">
              <input name="days" type="number" min={0} defaultValue={0} className="field" />
            </Field>
            <button type="submit" disabled={pending} className="btn-gold w-full">
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Crown size={15} />}
              فعال‌سازی اشتراک
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}


