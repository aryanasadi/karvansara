"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  Search,
  Loader2,
  ExternalLink,
  Wallet,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import { Modal, Field, Notice } from "@/components/manager-ui";
import { EmptyState, Badge, SectionTitle, Stat } from "@/components/ui";
import { faNum, formatToman, formatTomanShort, faDateTime, STATUS_FA } from "@/lib/format";
import { approvePaymentAction, rejectPaymentAction, type AdminResult } from "@/app/admin/actions";

export type AdminPaymentRow = {
  id: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  planName: string;
  amount: number;
  originalAmount: number;
  discountCode: string;
  gateway: string;
  status: string;
  refId: string;
  receiptUrl: string;
  payerName: string;
  payerCard: string;
  paidAt: string;
  reviewNote: string;
  createdAt: string;
};

const GATEWAY_FA: Record<string, string> = {
  zarinpal: "زرین‌پال",
  zibal: "زیبال",
  variza: "واریزا",
  aban: "آبان گیت وی",
  manual_card: "کارت‌به‌کارت",
};

type Tab = "review" | "all";

export function PaymentsManager({ initial }: { initial: AdminPaymentRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initial.some((p) => p.status === "review") ? "review" : "all");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<AdminPaymentRow | null>(null);
  const [rejecting, setRejecting] = useState<AdminPaymentRow | null>(null);
  const [notice, setNotice] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();

  const pendingReview = initial.filter((p) => p.status === "review");

  const list = useMemo(() => {
    const base = tab === "review" ? pendingReview : initial;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (p) =>
        p.userName.toLowerCase().includes(q) ||
        p.userEmail.toLowerCase().includes(q) ||
        p.payerName.toLowerCase().includes(q) ||
        p.refId.toLowerCase().includes(q)
    );
  }, [initial, pendingReview, tab, search]);

  const stats = useMemo(
    () => ({
      revenue: initial.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
      paid: initial.filter((p) => p.status === "paid").length,
      review: pendingReview.length,
    }),
    [initial, pendingReview]
  );

  function run(fn: () => Promise<AdminResult>, after?: () => void) {
    start(async () => {
      const res = await fn();
      setNotice(res);
      if (!res.error) after?.();
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <SectionTitle title="پرداخت‌ها" subtitle="تراکنش درگاه‌ها و تأیید رسیدهای کارت‌به‌کارت" />

      {notice?.error && <Notice kind="error">{notice.error}</Notice>}
      {notice?.message && <Notice kind="success">{notice.message}</Notice>}
      {pendingReview.length > 0 && tab !== "review" && (
        <Notice kind="info">
          {faNum(pendingReview.length)} رسید کارت‌به‌کارت در انتظار بررسی شماست.
        </Notice>
      )}

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat icon={Wallet} tone="brand" label="درآمد تأییدشده" value={formatTomanShort(stats.revenue)} title={formatToman(stats.revenue)} />
        <Stat icon={CheckCircle2} tone="lapis" label="پرداخت موفق" value={faNum(stats.paid)} />
        <Stat icon={Clock} tone="gold" label="در انتظار تأیید" value={faNum(stats.review)} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/8 text-center sm:w-auto">
          {(
            [
              ["review", `در انتظار تأیید (${faNum(pendingReview.length)})`],
              ["all", "همه پرداخت‌ها"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                "px-4 py-2.5 text-xs font-bold transition",
                tab === key ? "bg-gold-400/15 text-gold-300" : "bg-white/3 text-slate-400 hover:text-slate-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجو…" className="field pr-10" />
        </label>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={tab === "review" ? CheckCircle2 : CreditCard}
          title={tab === "review" ? "رسیدی در انتظار بررسی نیست" : "پرداختی ثبت نشده"}
          hint={tab === "review" ? "همه رسیدهای کارت‌به‌کارت بررسی شده‌اند." : undefined}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((p) => (
            <div key={p.id} className={clsx("card p-4", p.status === "review" && "border-gold-400/30")}>
              <div className="flex items-start gap-3">
                <span
                  className={clsx(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
                    p.gateway === "manual_card"
                      ? "bg-lapis-400/12 text-lapis-300"
                      : p.gateway === "variza" || p.gateway === "aban"
                        ? "bg-violet-400/12 text-violet-300"
                        : "bg-gold-400/12 text-gold-300"
                  )}
                >
                  {p.gateway === "manual_card" ? <Receipt size={17} /> : p.gateway === "variza" || p.gateway === "aban" ? <Zap size={17} /> : <CreditCard size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-white">{p.userName}</span>
                    <Badge tone={p.status === "paid" ? "emerald" : p.status === "review" ? "gold" : p.status === "pending" ? "slate" : "crimson"}>
                      {p.status === "review" ? "در انتظار تأیید" : STATUS_FA[p.status] ?? p.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 break-anywhere text-[10px] text-slate-500" dir="ltr">
                    {p.userEmail}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    پلن {p.planName} · {GATEWAY_FA[p.gateway] ?? p.gateway} · {faDateTime(p.createdAt)}
                  </p>
                  {p.payerName && <p className="mt-0.5 text-[10px] text-slate-500">واریزکننده: {p.payerName}</p>}
                  {p.discountCode && (
                    <p className="mt-0.5 text-[10px] text-violet-300">
                      کد {p.discountCode} (از {faNum(p.originalAmount)})
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-black tabular-nums text-gold-300">{formatToman(p.amount)}</span>
              </div>

              {p.reviewNote && <p className="mt-2 rounded-lg bg-crimson-400/8 px-3 py-1.5 text-[10px] text-crimson-300">{p.reviewNote}</p>}

              {(p.status === "review" || p.receiptUrl) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {p.receiptUrl && (
                    <button onClick={() => setViewing(p)} className="btn-soft flex-1 py-2 text-xs">
                      <Receipt size={13} />
                      مشاهده رسید
                    </button>
                  )}
                  {p.status === "review" && (
                    <>
                      <button onClick={() => run(() => approvePaymentAction(p.id))} disabled={pending} className="btn-primary py-2 text-xs">
                        {pending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        تأیید
                      </button>
                      <button onClick={() => setRejecting(p)} className="btn-soft border-crimson-400/30 py-2 text-xs text-crimson-300">
                        <XCircle size={13} />
                        رد
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* receipt viewer */}
      <Modal open={viewing !== null} onClose={() => setViewing(null)} title="رسید کارت‌به‌کارت" wide>
        {viewing && (
          <div className="grid gap-4">
            <div className="grid gap-1.5 rounded-2xl bg-white/3 p-4 text-xs">
              <Row label="کاربر" value={`${viewing.userName} (${viewing.userEmail})`} />
              <Row label="پلن" value={viewing.planName} />
              <Row label="مبلغ" value={formatToman(viewing.amount)} />
              <Row label="نام واریزکننده" value={viewing.payerName || "—"} />
              {viewing.payerCard && <Row label="۴ رقم آخر کارت" value={viewing.payerCard} />}
              {viewing.paidAt && <Row label="زمان اعلامی واریز" value={viewing.paidAt} />}
            </div>
            {viewing.receiptUrl && (
              <>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewing.receiptUrl} alt="رسید" className="max-h-[420px] w-full object-contain" />
                </div>
                <a href={viewing.receiptUrl} target="_blank" rel="noreferrer" className="btn-soft">
                  <ExternalLink size={14} />
                  باز کردن تصویر در تب جدید
                </a>
              </>
            )}
            {viewing.status === "review" && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => run(() => approvePaymentAction(viewing.id), () => setViewing(null))}
                  disabled={pending}
                  className="btn-primary flex-1"
                >
                  {pending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  تأیید و فعال‌سازی اشتراک
                </button>
                <button
                  onClick={() => {
                    setRejecting(viewing);
                    setViewing(null);
                  }}
                  className="btn-soft border-crimson-400/30 text-crimson-300"
                >
                  <XCircle size={15} />
                  رد رسید
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* reject */}
      <Modal open={rejecting !== null} onClose={() => setRejecting(null)} title="رد رسید">
        {rejecting && (
          <form
            action={(fd) =>
              run(() => rejectPaymentAction(rejecting.id, String(fd.get("note") ?? "")), () => setRejecting(null))
            }
            className="grid gap-4"
          >
            <Field label="علت رد" hint="برای کاربر در سوابق پرداخت نمایش داده می‌شود">
              <textarea name="note" rows={3} className="field" placeholder="مثلاً: مبلغ واریزی با مبلغ پلن مطابقت ندارد." />
            </Field>
            <button type="submit" disabled={pending} className="btn-soft w-full border-crimson-400/40 text-crimson-300">
              {pending ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
              ثبت رد رسید
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="break-anywhere font-bold text-slate-200">{value}</span>
    </div>
  );
}
