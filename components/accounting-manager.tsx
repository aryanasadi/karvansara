"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpLeft,
  TrendingUp,
  TrendingDown,
  Scale,
  Pencil,
  Trash2,
  ReceiptText,
  Search,
} from "lucide-react";
import clsx from "clsx";
import { Modal, Field, SubmitButton, Notice } from "@/components/manager-ui";
import { EmptyState, Badge, SectionTitle, Stat, ExportButton } from "@/components/ui";
import { BarsChart, Donut } from "@/components/charts";
import { faNum, formatToman, formatTomanShort, faDate, TX_CATEGORIES } from "@/lib/format";
import {
  addTransactionAction,
  updateTransactionAction,
  deleteTransactionAction,
  type Result,
} from "@/app/dashboard/actions";

export type TxItem = {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  date: string;
};

const DONUT_COLORS = ["#f0657e", "#e6b43e", "#6c93f2", "#a78bfa", "#fb923c", "#5fe8da", "#94a3b8"];

type Filter = "all" | "income" | "expense";

export function AccountingManager({ initial }: { initial: TxItem[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; tx: TxItem } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  const stats = useMemo(() => {
    const since30 = Date.now() - 30 * 86400000;
    const since6 = new Date();
    since6.setDate(1);
    since6.setMonth(since6.getMonth() - 5);
    since6.setHours(0, 0, 0, 0);

    const recent = initial.filter((t) => new Date(t.date).getTime() >= since30);
    const income = recent.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = recent.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(since6);
      start.setMonth(since6.getMonth() + i);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      const bucket = initial.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d < end;
      });
      months.push({
        label: new Intl.DateTimeFormat("fa-IR", { month: "long" }).format(start),
        income: bucket.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: bucket.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }

    const catMap = new Map<string, number>();
    recent.filter((t) => t.type === "expense").forEach((t) => {
      const key = t.category || "متفرقه";
      catMap.set(key, (catMap.get(key) ?? 0) + t.amount);
    });
    const donut = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([label, value], i) => ({ label, value, color: DONUT_COLORS[i % DONUT_COLORS.length] }));

    return { income, expense, balance: income - expense, months, donut, recentCount: recent.length };
  }, [initial]);

  const filtered = useMemo(
    () =>
      initial.filter((t) => {
        if (filter !== "all" && t.type !== filter) return false;
        const q = search.trim();
        if (q && !(t.description.includes(q) || t.category.includes(q))) return false;
        return true;
      }),
    [initial, filter, search]
  );

  function run(fn: () => Promise<Result>, close = true) {
    start(async () => {
      const res = await fn();
      if (res?.error) setNotice({ error: res.error });
      else {
        setNotice(null);
        if (close) setModal(null);
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <SectionTitle
        title="دفتر حسابداری"
        subtitle={`${faNum(stats.recentCount)} تراکنش در ۳۰ روز اخیر`}
        action={
          <>
            <ExportButton entity="transactions" />
            <button onClick={() => setModal({ mode: "add" })} className="btn-primary">
              <Plus size={17} />
              ثبت تراکنش
            </button>
          </>
        }
      />

      {notice?.error && <Notice kind="error">{notice.error}</Notice>}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat icon={TrendingUp} tone="brand" label="درآمد ۳۰ روز" value={formatTomanShort(stats.income)} title={formatToman(stats.income)} />
        <Stat icon={TrendingDown} tone="crimson" label="هزینه ۳۰ روز" value={formatTomanShort(stats.expense)} title={formatToman(stats.expense)} />
        <Stat
          icon={Scale}
          tone={stats.balance >= 0 ? "gold" : "crimson"}
          label="تراز ماه"
          value={formatTomanShort(stats.balance)}
          title={formatToman(stats.balance)}
        />
        <Stat icon={ReceiptText} tone="lapis" label="کل تراکنش‌ها" value={faNum(initial.length)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-black text-white">روند ۶ ماه اخیر</h2>
          <BarsChart items={stats.months} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-black text-white">هزینه‌ها بر اساس سرفصل</h2>
          {stats.donut.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500">هزینه‌ای در ۳۰ روز اخیر ثبت نشده است.</p>
          ) : (
            <Donut segments={stats.donut} centerValue={formatToman(stats.expense)} centerLabel="هزینه ۳۰ روز" />
          )}
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-xl border border-white/8">
            {(
              [
                ["all", "همه"],
                ["income", "درآمدها"],
                ["expense", "هزینه‌ها"],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={clsx(
                  "px-4 py-2 text-xs font-bold transition",
                  filter === key ? "bg-brand-400/15 text-brand-300" : "bg-white/3 text-slate-400 hover:text-slate-200"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative block w-full max-w-xs">
            <Search size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجو در شرح و سرفصل…" className="field pr-10" />
          </label>
        </div>

        {initial.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="هنوز تراکنشی ثبت نشده"
            hint="اولین درآمد یا هزینه‌ات را ثبت کن تا گزارش‌ها و نمودارهای حسابداری زنده شوند."
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="تراکنشی پیدا نشد" />
        ) : (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-white/5">
              {filtered.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/2">
                  <span
                    className={clsx(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                      t.type === "income" ? "bg-brand-400/12 text-brand-300" : "bg-crimson-400/12 text-crimson-400"
                    )}
                  >
                    {t.type === "income" ? <ArrowDownLeft size={17} /> : <ArrowUpLeft size={17} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">{t.description || t.category || "بدون شرح"}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                      {t.category && <Badge tone="slate">{t.category}</Badge>}
                      {faDate(t.date)}
                    </span>
                  </span>
                  <span className={clsx("shrink-0 text-sm font-black tabular-nums", t.type === "income" ? "text-brand-300" : "text-crimson-400")}>
                    {t.type === "income" ? "+" : "−"}
                    {formatToman(t.amount)}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setModal({ mode: "edit", tx: t })}
                      className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-gold-400/12 hover:text-gold-300"
                      title="ویرایش"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("این تراکنش حذف شود؟")) run(() => deleteTransactionAction(t.id), false);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-crimson-400/12 hover:text-crimson-400"
                      title="حذف"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "ویرایش تراکنش" : "ثبت تراکنش تازه"}>
        <TxForm
          key={modal?.mode === "edit" ? modal.tx.id : "add"}
          tx={modal?.mode === "edit" ? modal.tx : undefined}
          pending={pending}
          onSubmit={(fd) => run(() => (modal?.mode === "edit" ? updateTransactionAction(fd) : addTransactionAction(fd)))}
        />
      </Modal>
    </div>
  );
}

function TxForm({
  tx,
  pending,
  onSubmit,
}: {
  tx?: TxItem;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  const [type, setType] = useState<"income" | "expense">(tx?.type ?? "expense");
  const dateValue = tx ? tx.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return (
    <form
      action={(fd) => {
        fd.set("type", type);
        if (tx) fd.set("id", tx.id);
        onSubmit(fd);
      }}
      className="grid gap-4"
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType("income")}
          className={clsx(
            "rounded-xl border py-2.5 text-sm font-bold transition",
            type === "income" ? "border-brand-400/50 bg-brand-400/12 text-brand-300" : "border-white/8 bg-white/3 text-slate-400"
          )}
        >
          درآمد
        </button>
        <button
          type="button"
          onClick={() => setType("expense")}
          className={clsx(
            "rounded-xl border py-2.5 text-sm font-bold transition",
            type === "expense" ? "border-crimson-400/50 bg-crimson-400/12 text-crimson-400" : "border-white/8 bg-white/3 text-slate-400"
          )}
        >
          هزینه
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="مبلغ (تومان)">
          <input name="amount" type="number" min="1" required defaultValue={tx?.amount ?? ""} className="field" placeholder="1500000" />
        </Field>
        <Field label="سرفصل">
          <select name="category" className="field" defaultValue={tx?.category ?? ""}>
            <option value="">انتخاب کن…</option>
            {TX_CATEGORIES[type].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="تاریخ">
        <input name="date" type="date" dir="ltr" required defaultValue={dateValue} className="field text-left" />
      </Field>
      <Field label="شرح تراکنش">
        <textarea name="description" rows={2} defaultValue={tx?.description} className="field" placeholder="مثلاً: فروش ۳ عدد چای لاهیجان به مشتری حضوری" />
      </Field>
      <SubmitButton pending={pending} variant={type === "income" ? "primary" : "gold"} className="w-full">
        {tx ? "ذخیره تغییرات" : `ثبت ${type === "income" ? "درآمد" : "هزینه"}`}
      </SubmitButton>
    </form>
  );
}
