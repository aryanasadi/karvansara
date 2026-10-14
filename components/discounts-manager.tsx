"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, TicketPercent, Trash2, Pencil, Copy, Check } from "lucide-react";
import clsx from "clsx";
import { Modal, Field, Notice } from "@/components/manager-ui";
import { EmptyState, Badge, SectionTitle, Stat } from "@/components/ui";
import { faNum, formatToman, faDate } from "@/lib/format";
import { saveDiscountAction, deleteDiscountAction, type AdminResult } from "@/app/admin/actions";

export type DiscountItem = {
  id: string;
  code: string;
  percent: number;
  amountOff: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  note: string;
};

export function DiscountsManager({ initial }: { initial: DiscountItem[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | { d?: DiscountItem }>(null);
  const [notice, setNotice] = useState<AdminResult | null>(null);
  const [copied, setCopied] = useState("");
  const [pending, start] = useTransition();

  const totalUses = initial.reduce((s, d) => s + d.usedCount, 0);
  const activeCount = initial.filter((d) => d.isActive).length;

  function run(fn: () => Promise<AdminResult>, close = false) {
    start(async () => {
      const res = await fn();
      setNotice(res);
      if (!res.error && close) setModal(null);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <SectionTitle
        title="کدهای تخفیف"
        subtitle="کد تخفیف درصدی یا مبلغی برای فروش اشتراک بساز"
        action={
          <button onClick={() => setModal({})} className="btn-gold">
            <Plus size={17} />
            کد تخفیف تازه
          </button>
        }
      />

      {notice?.error && <Notice kind="error">{notice.error}</Notice>}
      {notice?.message && <Notice kind="success">{notice.message}</Notice>}

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat icon={TicketPercent} tone="gold" label="کل کدها" value={faNum(initial.length)} />
        <Stat icon={Check} tone="brand" label="کدهای فعال" value={faNum(activeCount)} />
        <Stat icon={Copy} tone="lapis" label="دفعات استفاده" value={faNum(totalUses)} />
      </section>

      {initial.length === 0 ? (
        <EmptyState icon={TicketPercent} title="کد تخفیفی ساخته نشده" hint="مثلاً کد NOWRUZ40 با ۴۰٪ تخفیف برای کمپین نوروزی بساز." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {initial.map((d) => {
            const exhausted = d.maxUses > 0 && d.usedCount >= d.maxUses;
            const expired = Boolean(d.expiresAt) && new Date(d.expiresAt).getTime() < Date.now();
            return (
              <div key={d.id} className={clsx("card p-5", (!d.isActive || exhausted || expired) && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(d.code);
                      setCopied(d.code);
                      setTimeout(() => setCopied(""), 1500);
                    }}
                    className="group flex min-w-0 items-center gap-2 rounded-xl bg-gold-400/10 px-3 py-1.5 font-mono text-sm font-black text-gold-300 transition hover:bg-gold-400/20"
                    dir="ltr"
                  >
                    <span className="truncate">{d.code}</span>
                    {copied === d.code ? <Check size={13} /> : <Copy size={13} className="opacity-50 group-hover:opacity-100" />}
                  </button>
                  <Badge tone={expired || exhausted ? "crimson" : d.isActive ? "emerald" : "slate"}>
                    {expired ? "منقضی" : exhausted ? "تکمیل" : d.isActive ? "فعال" : "غیرفعال"}
                  </Badge>
                </div>

                <p className="mt-3 text-lg font-black text-white">
                  {d.percent > 0 ? `${faNum(d.percent)}٪ تخفیف` : formatToman(d.amountOff)}
                  {d.percent > 0 && d.amountOff > 0 && (
                    <span className="mr-1.5 text-xs font-medium text-slate-400">+ {formatToman(d.amountOff)}</span>
                  )}
                </p>

                <div className="mt-3 grid gap-1 text-[11px] text-slate-400">
                  <p>
                    استفاده‌شده: <span className="font-bold text-slate-200">{faNum(d.usedCount)}</span>
                    {d.maxUses > 0 ? ` از ${faNum(d.maxUses)}` : " (نامحدود)"}
                  </p>
                  <p>انقضا: {d.expiresAt ? faDate(d.expiresAt) : "بدون محدودیت زمانی"}</p>
                  {d.note && <p className="break-anywhere text-slate-500">{d.note}</p>}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => setModal({ d })} className="btn-soft flex-1 py-2 text-xs">
                    <Pencil size={13} />
                    ویرایش
                  </button>
                  <button
                    onClick={() => window.confirm(`کد ${d.code} حذف شود؟`) && run(() => deleteDiscountAction(d.id))}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-400 hover:bg-crimson-400/12 hover:text-crimson-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal?.d ? `ویرایش کد ${modal.d.code}` : "کد تخفیف تازه"}>
        <DiscountForm key={modal?.d?.id ?? "new"} d={modal?.d} pending={pending} onSubmit={(fd) => run(() => saveDiscountAction(fd), true)} />
      </Modal>
    </div>
  );
}

function DiscountForm({
  d,
  pending,
  onSubmit,
}: {
  d?: DiscountItem;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  const [active, setActive] = useState(d?.isActive ?? true);
  return (
    <form
      action={(fd) => {
        if (d) fd.set("id", d.id);
        fd.set("isActive", active ? "1" : "0");
        onSubmit(fd);
      }}
      className="grid gap-4"
    >
      <Field label="کد تخفیف" hint="فقط حروف انگلیسی و عدد؛ خودکار بزرگ می‌شود">
        <input name="code" required dir="ltr" defaultValue={d?.code} className="field text-left uppercase" placeholder="NOWRUZ40" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="درصد تخفیف">
          <input name="percent" type="number" min={0} max={100} defaultValue={d?.percent ?? 0} className="field" />
        </Field>
        <Field label="تخفیف مبلغی (تومان)">
          <input name="amountOff" type="number" min={0} defaultValue={d?.amountOff ?? 0} className="field" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="سقف استفاده" hint="۰ یعنی نامحدود">
          <input name="maxUses" type="number" min={0} defaultValue={d?.maxUses ?? 0} className="field" />
        </Field>
        <Field label="تاریخ انقضا">
          <input name="expiresAt" type="date" dir="ltr" defaultValue={d?.expiresAt ? d.expiresAt.slice(0, 10) : ""} className="field text-left" />
        </Field>
      </div>
      <Field label="یادداشت داخلی">
        <input name="note" defaultValue={d?.note} className="field" placeholder="کمپین نوروز ۱۴۰۴" />
      </Field>
      <button
        type="button"
        onClick={() => setActive((v) => !v)}
        className={clsx(
          "rounded-xl border px-4 py-3 text-right transition",
          active ? "border-brand-400/40 bg-brand-400/10" : "border-white/8 bg-white/3"
        )}
      >
        <span className={clsx("block text-xs font-black", active ? "text-brand-300" : "text-slate-400")}>
          {active ? "کد فعال است و قابل استفاده" : "کد غیرفعال است"}
        </span>
      </button>
      <button type="submit" disabled={pending} className="btn-gold w-full">
        ذخیره کد تخفیف
      </button>
    </form>
  );
}
