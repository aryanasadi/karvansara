"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Package,
  Store,
  Pencil,
  Trash2,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  Minus,
} from "lucide-react";
import clsx from "clsx";
import { Modal, Field, SubmitButton, Notice } from "@/components/manager-ui";
import { EmptyState, Badge, SectionTitle, ExportButton } from "@/components/ui";
import { ImageUpload } from "@/components/image-upload";
import { faNum, formatToman, faDateTime } from "@/lib/format";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  adjustStockAction,
  getStockHistoryAction,
  type Result,
} from "@/app/dashboard/actions";

export type ProductItem = {
  id: string;
  name: string;
  sku: string;
  price: number;
  buyPrice: number;
  stock: number;
  lowStockThreshold: number;
  category: string;
  imageUrl: string;
  source: string;
};

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; p: ProductItem }
  | { mode: "stock"; p: ProductItem }
  | { mode: "history"; p: ProductItem }
  | null;

export function ProductsManager({ initial }: { initial: ProductItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return initial;
    return initial.filter(
      (p) => p.name.includes(q) || p.sku.includes(q) || p.category.includes(q)
    );
  }, [initial, search]);

  const totals = useMemo(
    () => ({
      count: initial.length,
      units: initial.reduce((s, p) => s + p.stock, 0),
      value: initial.reduce((s, p) => s + p.stock * p.price, 0),
      low: initial.filter((p) => p.stock <= p.lowStockThreshold).length,
    }),
    [initial]
  );

  function run(fn: () => Promise<Result>, close = true) {
    start(async () => {
      const res = await fn();
      if (res?.error) {
        setNotice({ error: res.error });
      } else {
        setNotice(res?.message ? { message: res.message } : null);
        if (close) setModal(null);
      }
      router.refresh();
    });
  }

  return (
    <div>
      <SectionTitle
        title="انبار محصولات"
        subtitle={`${faNum(totals.count)} محصول · ${faNum(totals.units)} قلم کالا · ارزش انبار ${formatToman(totals.value)}`}
        action={
          <>
            <ExportButton entity="products" />
            <button onClick={() => setModal({ mode: "add" })} className="btn-primary">
              <Plus size={17} />
              محصول تازه
            </button>
          </>
        }
      />

      {notice?.error && <div className="mb-4"><Notice kind="error">{notice.error}</Notice></div>}
      {notice?.message && <div className="mb-4"><Notice kind="success">{notice.message}</Notice></div>}
      {totals.low > 0 && (
        <div className="mb-4">
          <Notice kind="info">
            {faNum(totals.low)} کالا به حد هشدار موجودی رسیده است؛ زمان شارژ انبار است.
          </Notice>
        </div>
      )}

      <div className="mb-5 flex items-center gap-3">
        <label className="relative block w-full max-w-sm">
          <Search size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جست‌وجو: نام، کد یا دسته‌بندی…"
            className="field pr-11"
          />
        </label>
      </div>

      {initial.length === 0 ? (
        <EmptyState
          icon={Package}
          title="انبار هنوز خالی است"
          hint="اولین محصولت را دستی اضافه کن، یا از بخش «اتصال ووکامرس» فروشگاهت را متصل کن تا محصولات خودکار وارد انبار شوند."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="چیزی پیدا نشد" hint="عبارت دیگری جست‌وجو کن." />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-12 gap-3 border-b border-white/6 px-5 py-3 text-[11px] font-bold text-slate-500 md:grid">
            <span className="col-span-4">محصول</span>
            <span className="col-span-2">قیمت</span>
            <span className="col-span-2">موجودی</span>
            <span className="col-span-2">وضعیت</span>
            <span className="col-span-2 text-left">اقدام‌ها</span>
          </div>
          <ul className="divide-y divide-white/5">
            {filtered.map((p) => {
              const low = p.stock <= p.lowStockThreshold;
              const out = p.stock === 0;
              return (
                <li key={p.id} className="grid grid-cols-2 items-center gap-3 px-5 py-3.5 transition hover:bg-white/2 md:grid-cols-12">
                  <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-4">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-11 w-11 shrink-0 rounded-xl border border-white/8 object-cover" />
                    ) : (
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400/20 to-brand-400/5 text-brand-300">
                        <Package size={19} />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-white">{p.name}</span>
                        {p.source === "woocommerce" && (
                          <span title="همگام با ووکامرس" className="grid h-5 w-5 place-items-center rounded-md bg-violet-400/15 text-violet-300">
                            <Store size={11} />
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {p.sku && <span dir="ltr">{p.sku}</span>}
                        {p.sku && p.category && " · "}
                        {p.category}
                      </span>
                    </span>
                  </div>
                  <div className="text-xs font-bold tabular-nums text-slate-300 md:col-span-2">{formatToman(p.price)}</div>
                  <div className="md:col-span-2">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black tabular-nums",
                        out
                          ? "border-crimson-400/30 bg-crimson-400/10 text-crimson-400"
                          : low
                            ? "border-gold-400/30 bg-gold-400/10 text-gold-300"
                            : "border-brand-400/25 bg-brand-400/8 text-brand-300"
                      )}
                    >
                      {faNum(p.stock)} عدد
                    </span>
                  </div>
                  <div className="hidden md:col-span-2 md:block">
                    <Badge tone={out ? "crimson" : low ? "gold" : "emerald"}>
                      {out ? "ناموجود" : low ? "رو به اتمام" : "موجود"}
                    </Badge>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5 md:col-span-2">
                    <div className="flex items-center rounded-xl border border-white/8 bg-white/3">
                      <button
                        disabled={pending}
                        onClick={() => run(() => adjustStockAction({ productId: p.id, delta: -1, note: "کسر سریع" }), false)}
                        title="کسر یک عدد"
                        className="grid h-8 w-8 place-items-center rounded-r-xl text-crimson-400 transition hover:bg-crimson-400/12 disabled:opacity-40"
                      >
                        <Minus size={13} />
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => run(() => adjustStockAction({ productId: p.id, delta: 1, note: "افزایش سریع" }), false)}
                        title="افزایش یک عدد"
                        className="grid h-8 w-8 place-items-center rounded-l-xl text-brand-300 transition hover:bg-brand-400/12 disabled:opacity-40"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <button
                      onClick={() => setModal({ mode: "stock", p })}
                      title="ورود / خروج موجودی"
                      className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-brand-400/12 hover:text-brand-300"
                    >
                      <ArrowDownToLine size={14} />
                    </button>
                    <button
                      onClick={() => setModal({ mode: "history", p })}
                      title="سوابق گردش"
                      className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-lapis-400/12 hover:text-lapis-300"
                    >
                      <History size={14} />
                    </button>
                    <button
                      onClick={() => setModal({ mode: "edit", p })}
                      title="ویرایش"
                      className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-gold-400/12 hover:text-gold-300"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`«${p.name}» برای همیشه حذف شود؟`)) {
                          run(() => deleteProductAction(p.id), false);
                        }
                      }}
                      title="حذف"
                      className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-crimson-400/12 hover:text-crimson-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* add / edit */}
      <Modal
        open={modal?.mode === "add" || modal?.mode === "edit"}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "ویرایش محصول" : "افزودن محصول تازه"}
        wide
      >
        <ProductForm
          key={modal?.mode === "edit" ? modal.p.id : "add"}
          product={modal?.mode === "edit" ? modal.p : undefined}
          pending={pending}
          onSubmit={(fd) =>
            run(() => (modal?.mode === "edit" ? updateProductAction(fd) : createProductAction(fd)))
          }
        />
      </Modal>

      {/* stock adjust */}
      <Modal open={modal?.mode === "stock"} onClose={() => setModal(null)} title="تنظیم موجودی انبار">
        {modal?.mode === "stock" && (
          <StockForm
            key={modal.p.id}
            product={modal.p}
            pending={pending}
            onSubmit={(delta, note) => run(() => adjustStockAction({ productId: modal.p.id, delta, note }))}
          />
        )}
      </Modal>

      {/* history */}
      <Modal open={modal?.mode === "history"} onClose={() => setModal(null)} title="سوابق گردش موجودی" wide>
        {modal?.mode === "history" && <HistoryPanel key={modal.p.id} productId={modal.p.id} />}
      </Modal>
    </div>
  );
}

/* --------------------------------- forms ----------------------------------- */

function ProductForm({
  product,
  pending,
  onSubmit,
}: {
  product?: ProductItem;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form
      action={(fd) => {
        if (product) fd.set("id", product.id);
        onSubmit(fd);
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="نام محصول">
        <input name="name" required defaultValue={product?.name} className="field" placeholder="مثلاً: چای لاهیجان ۵۰۰ گرمی" />
      </Field>
      <Field label="کد کالا / SKU">
        <input name="sku" dir="ltr" defaultValue={product?.sku} className="field text-left" placeholder="TEA-500" />
      </Field>
      <Field label="قیمت فروش (تومان)">
        <input name="price" type="number" min="0" required defaultValue={product?.price ?? ""} className="field" placeholder="250000" />
      </Field>
      <Field label="قیمت خرید (تومان)" hint="برای محاسبه سود؛ اختیاری">
        <input name="buyPrice" type="number" min="0" defaultValue={product?.buyPrice ?? ""} className="field" placeholder="180000" />
      </Field>
      {!product && (
        <Field label="موجودی اولیه">
          <input name="stock" type="number" min="0" defaultValue={0} className="field" />
        </Field>
      )}
      <Field label="حد هشدار موجودی" hint="وقتی موجودی به این عدد برسد، هشدار می‌گیری.">
        <input name="lowStockThreshold" type="number" min="0" defaultValue={product?.lowStockThreshold ?? 5} className="field" />
      </Field>
      <Field label="دسته‌بندی">
        <input name="category" defaultValue={product?.category} className="field" placeholder="نوشیدنی" />
      </Field>
      <div className="sm:col-span-2">
        <ImageUpload name="imageUrl" defaultValue={product?.imageUrl} label="تصویر محصول" />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pending={pending} className="w-full">
          {product ? "ذخیره تغییرات" : "افزودن به انبار"}
        </SubmitButton>
      </div>
    </form>
  );
}

function StockForm({
  product,
  pending,
  onSubmit,
}: {
  product: ProductItem;
  pending: boolean;
  onSubmit: (delta: number, note: string) => void;
}) {
  const [dir, setDir] = useState<"in" | "out">("in");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-white/3 px-4 py-3 text-xs leading-6 text-slate-300">
        موجودی فعلی «{product.name}»:{" "}
        <span className="font-black text-white">{faNum(product.stock)} عدد</span>
        {product.source === "woocommerce" && (
          <span className="block text-[10px] text-violet-300">این محصول به ووکامرس متصل است؛ تغییر موجودی خودکار به فروشگاه ارسال می‌شود.</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDir("in")}
          className={clsx(
            "flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition",
            dir === "in" ? "border-brand-400/50 bg-brand-400/12 text-brand-300" : "border-white/8 bg-white/3 text-slate-400"
          )}
        >
          <ArrowDownToLine size={16} />
          ورود به انبار
        </button>
        <button
          type="button"
          onClick={() => setDir("out")}
          className={clsx(
            "flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition",
            dir === "out" ? "border-crimson-400/50 bg-crimson-400/12 text-crimson-400" : "border-white/8 bg-white/3 text-slate-400"
          )}
        >
          <ArrowUpFromLine size={16} />
          خروج از انبار
        </button>
      </div>
      <Field label="تعداد">
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Math.trunc(Number(e.target.value) || 1)))} className="field" />
      </Field>
      <Field label="یادداشت (اختیاری)">
        <input value={note} onChange={(e) => setNote(e.target.value)} className="field" placeholder={dir === "in" ? "مثلاً: خرید از تأمین‌کننده" : "مثلاً: فروش حضوری"} />
      </Field>
      <button
        type="button"
        disabled={pending}
        onClick={() => onSubmit(dir === "in" ? qty : -qty, note || (dir === "in" ? "ورود دستی" : "خروج دستی"))}
        className={dir === "in" ? "btn-primary w-full" : "btn-soft w-full border-crimson-400/40 text-crimson-300"}
      >
        ثبت {dir === "in" ? "ورود" : "خروج"} {faNum(qty)} عدد
      </button>
    </div>
  );
}

function HistoryPanel({ productId }: { productId: string }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getStockHistoryAction>> | null>(null);
  useEffect(() => {
    let on = true;
    getStockHistoryAction(productId).then((r) => on && setRows(r));
    return () => {
      on = false;
    };
  }, [productId]);

  if (!rows) return <p className="py-8 text-center text-xs text-slate-500">در حال بارگذاری…</p>;
  if (rows.length === 0) return <p className="py-8 text-center text-xs text-slate-500">هنوز گردشی ثبت نشده است.</p>;
  return (
    <ul className="max-h-80 space-y-2 overflow-y-auto pl-1">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/3 px-4 py-2.5 text-xs">
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className={clsx(
                "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                r.quantity > 0 ? "bg-brand-400/12 text-brand-300" : "bg-crimson-400/12 text-crimson-400"
              )}
            >
              {r.quantity > 0 ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-bold text-slate-200">{r.note || (r.quantity > 0 ? "ورود" : "خروج")}</span>
              <span className="block text-[10px] text-slate-500">{faDateTime(r.createdAt)}</span>
            </span>
          </span>
          <span className="shrink-0 text-left">
            <span className={clsx("block font-black tabular-nums", r.quantity > 0 ? "text-brand-300" : "text-crimson-400")}>
              {r.quantity > 0 ? "+" : ""}{faNum(r.quantity)}
            </span>
            <span className="block text-[10px] text-slate-500">مانده: {faNum(r.balanceAfter)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
