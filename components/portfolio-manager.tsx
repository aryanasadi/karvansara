"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Gem, Banknote, Coins, TrendingUp, Building2, Bitcoin, LineChart, Shapes, PiggyBank } from "lucide-react";
import clsx from "clsx";
import { Modal, Field, SubmitButton, Notice } from "@/components/manager-ui";
import { EmptyState, Badge, SectionTitle, Stat, ExportButton } from "@/components/ui";
import { Donut } from "@/components/charts";
import { faNum, formatToman, formatTomanShort, faDate, ASSET_TYPES } from "@/lib/format";
import { addAssetAction, updateAssetAction, deleteAssetAction, type Result } from "@/app/dashboard/actions";

export type AssetItem = {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unitPurchasePrice: number;
  unitCurrentValue: number;
  purchaseDate: string;
  note: string;
};

const TYPE_ICONS: Record<string, typeof Gem> = {
  cash: Banknote,
  gold: Coins,
  currency: Shapes,
  stock: LineChart,
  crypto: Bitcoin,
  real_estate: Building2,
  other: Gem,
};

const DONUT_COLORS: Record<string, string> = {
  cash: "#5fe8da",
  gold: "#e6b43e",
  currency: "#93b4f7",
  stock: "#a78bfa",
  crypto: "#fb923c",
  real_estate: "#f0657e",
  other: "#94a3b8",
};

export function PortfolioManager({ initial }: { initial: AssetItem[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; a: AssetItem } | null>(null);
  const [notice, setNotice] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  const stats = useMemo(() => {
    const current = initial.reduce((s, a) => s + a.quantity * a.unitCurrentValue, 0);
    const purchase = initial.reduce((s, a) => s + a.quantity * a.unitPurchasePrice, 0);
    const profit = current - purchase;
    const pct = purchase > 0 ? Math.round((profit / purchase) * 1000) / 10 : 0;

    const byType = new Map<string, number>();
    initial.forEach((a) => byType.set(a.type, (byType.get(a.type) ?? 0) + a.quantity * a.unitCurrentValue));
    const donut = [...byType.entries()].map(([type, value]) => ({
      label: ASSET_TYPES[type] ?? type,
      value,
      color: DONUT_COLORS[type] ?? "#94a3b8",
    }));
    return { current, purchase, profit, pct, donut };
  }, [initial]);

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
        title="پرتفولیو دارایی و سرمایه‌ها"
        subtitle="طلا، ارز، سهام، ملک و هر دارایی‌ای که داری؛ همه در یک نگاه"
        action={
          <>
            <ExportButton entity="assets" />
            <button onClick={() => setModal({ mode: "add" })} className="btn-gold">
              <Plus size={17} />
              ثبت دارایی
            </button>
          </>
        }
      />

      {notice?.error && <Notice kind="error">{notice.error}</Notice>}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat icon={Gem} tone="gold" label="ارزش فعلی پرتفولیو" value={formatTomanShort(stats.current)} title={formatToman(stats.current)} />
        <Stat icon={PiggyBank} tone="lapis" label="بهای خرید" value={formatTomanShort(stats.purchase)} title={formatToman(stats.purchase)} />
        <Stat
          icon={TrendingUp}
          tone={stats.profit >= 0 ? "brand" : "crimson"}
          label={stats.profit >= 0 ? "سود" : "زیان"}
          value={`${stats.profit >= 0 ? "+" : "−"}${formatTomanShort(Math.abs(stats.profit))}`}
          title={formatToman(stats.profit)}
          hint={`${faNum(Math.abs(stats.pct))}٪ نسبت به بهای خرید`}
        />
        <Stat icon={Shapes} tone="violet" label="تعداد دارایی" value={faNum(initial.length)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="mb-4 font-black text-white">ترکیب دارایی‌ها</h2>
          {stats.donut.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500">دارایی ثبت نشده است.</p>
          ) : (
            <Donut segments={stats.donut} centerValue={formatToman(stats.current)} centerLabel="ارزش کل" />
          )}
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          {initial.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Gem}
                title="پرتفولیو خالی است"
                hint="دارایی‌هایت را ثبت کن؛ ارزش روزشان را هر از گاهی به‌روز کن و سود و زیانت را زیر نظر بگیر."
              />
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {initial.map((a) => {
                const Icon = TYPE_ICONS[a.type] ?? Gem;
                const total = a.quantity * a.unitCurrentValue;
                const spent = a.quantity * a.unitPurchasePrice;
                const pl = total - spent;
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-4 transition hover:bg-white/2">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/4 text-gold-300">
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-white">{a.name}</span>
                        <Badge tone="slate">{ASSET_TYPES[a.type] ?? a.type}</Badge>
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">
                        {faNum(a.quantity)} واحد · هر واحد {formatToman(a.unitCurrentValue)}
                        {a.purchaseDate && ` · خرید: ${faDate(a.purchaseDate)}`}
                      </span>
                      {a.note && <span className="mt-0.5 block truncate text-[10px] text-slate-500">{a.note}</span>}
                    </span>
                    <span className="hidden shrink-0 text-left sm:block">
                      <span className="block text-sm font-black tabular-nums text-white">{formatToman(total)}</span>
                      <span className={clsx("mt-0.5 block text-[10px] font-bold tabular-nums", pl >= 0 ? "text-brand-300" : "text-crimson-400")}>
                        {pl >= 0 ? "+" : "−"}{formatToman(Math.abs(pl))}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => setModal({ mode: "edit", a })}
                        className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-gold-400/12 hover:text-gold-300"
                        title="ویرایش"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`دارایی «${a.name}» حذف شود؟`)) run(() => deleteAssetAction(a.id), false);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-crimson-400/12 hover:text-crimson-400"
                        title="حذف"
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "ویرایش دارایی" : "ثبت دارایی تازه"} wide>
        <AssetForm
          key={modal?.mode === "edit" ? modal.a.id : "add"}
          asset={modal?.mode === "edit" ? modal.a : undefined}
          pending={pending}
          onSubmit={(fd) => run(() => (modal?.mode === "edit" ? updateAssetAction(fd) : addAssetAction(fd)))}
        />
      </Modal>
    </div>
  );
}

function AssetForm({
  asset,
  pending,
  onSubmit,
}: {
  asset?: AssetItem;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form
      action={(fd) => {
        if (asset) fd.set("id", asset.id);
        onSubmit(fd);
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="نام دارایی">
        <input name="name" required defaultValue={asset?.name} className="field" placeholder="مثلاً: سکه بهار آزادی، طلای ۱۸ عیار، بیت‌کوین…" />
      </Field>
      <Field label="نوع دارایی">
        <select name="type" className="field" defaultValue={asset?.type ?? "gold"}>
          {Object.entries(ASSET_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="تعداد / مقدار" hint="مثلاً: تعداد سکه، گرم طلا یا متراژ">
        <input name="quantity" type="number" min="1" required defaultValue={asset?.quantity ?? 1} className="field" />
      </Field>
      <Field label="بهای خرید هر واحد (تومان)">
        <input name="unitPurchasePrice" type="number" min="0" required defaultValue={asset?.unitPurchasePrice ?? ""} className="field" />
      </Field>
      <Field label="ارزش فعلی هر واحد (تومان)" hint="هر وقت قیمت عوض شد، همین‌جا به‌روزش کن">
        <input name="unitCurrentValue" type="number" min="0" required defaultValue={asset?.unitCurrentValue ?? ""} className="field" />
      </Field>
      <Field label="تاریخ خرید">
        <input name="purchaseDate" type="date" dir="ltr" defaultValue={asset?.purchaseDate ? asset.purchaseDate.slice(0, 10) : ""} className="field text-left" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="یادداشت (اختیاری)">
          <input name="note" defaultValue={asset?.note} className="field" placeholder="جزئیات بیشتر درباره این دارایی" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pending={pending} variant="gold" className="w-full">
          {asset ? "ذخیره تغییرات" : "افزودن به پرتفولیو"}
        </SubmitButton>
      </div>
    </form>
  );
}
