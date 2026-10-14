"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Receipt,
  Users,
  Trash2,
  Printer,
  Eye,
  ShoppingCart,
  PackagePlus,
  Pencil,
  CheckCircle2,
  Search,
  Loader2,
  X,
} from "lucide-react";
import clsx from "clsx";
import { Modal, Field, SubmitButton, Notice } from "@/components/manager-ui";
import { EmptyState, Badge, SectionTitle, Stat, ExportButton } from "@/components/ui";
import { faNum, formatToman, formatTomanShort, faDate, STATUS_FA } from "@/lib/format";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  setInvoiceStatusAction,
  saveCustomerAction,
  deleteCustomerAction,
  getInvoiceAction,
  type InvoiceDetail,
  type InvoiceResult,
} from "@/app/dashboard/invoices/actions";

export type InvoiceRow = {
  id: string;
  number: string;
  type: string;
  status: string;
  customerName: string;
  customerPhone: string;
  issueDate: string;
  dueDate: string;
  total: number;
};

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  type: string;
  note: string;
};

export type ProductOption = { id: string; name: string; price: number; buyPrice: number; stock: number };

type Line = { key: number; productId: string; name: string; quantity: number; unitPrice: number };

export function InvoicesManager({
  invoices,
  customers,
  products,
}: {
  invoices: InvoiceRow[];
  customers: CustomerRow[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"sale" | "purchase" | "customers">("sale");
  const [creating, setCreating] = useState<null | "sale" | "purchase">(null);
  const [customerModal, setCustomerModal] = useState<null | { c?: CustomerRow }>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [notice, setNotice] = useState<InvoiceResult | null>(null);
  const [search, setSearch] = useState("");
  const [pending, start] = useTransition();

  const stats = useMemo(() => {
    const sales = invoices.filter((i) => i.type === "sale" && i.status !== "canceled");
    const purchases = invoices.filter((i) => i.type === "purchase" && i.status !== "canceled");
    return {
      salesTotal: sales.reduce((s, i) => s + i.total, 0),
      purchaseTotal: purchases.reduce((s, i) => s + i.total, 0),
      salesCount: sales.length,
      unpaid: invoices.filter((i) => i.status === "issued").reduce((s, i) => s + i.total, 0),
    };
  }, [invoices]);

  const list = useMemo(() => {
    const q = search.trim();
    return invoices
      .filter((i) => i.type === tab)
      .filter((i) => !q || i.number.includes(q) || i.customerName.includes(q) || i.customerPhone.includes(q));
  }, [invoices, tab, search]);

  const customerList = useMemo(() => {
    const q = search.trim();
    return customers.filter((c) => !q || c.name.includes(q) || c.phone.includes(q));
  }, [customers, search]);

  function run(fn: () => Promise<InvoiceResult>, close?: () => void) {
    start(async () => {
      const res = await fn();
      if (res?.error) setNotice({ error: res.error });
      else {
        setNotice(res?.message ? { message: res.message } : null);
        close?.();
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <SectionTitle
        title="فاکتور فروش و خرید"
        subtitle="صدور فاکتور رسمی، ثبت مشتریان و اتصال خودکار به انبار و حسابداری"
        action={
          <>
            <ExportButton entity={tab === "customers" ? "customers" : "invoices"} />
            {tab === "customers" ? (
              <button onClick={() => setCustomerModal({})} className="btn-primary">
                <Plus size={17} />
                طرف حساب تازه
              </button>
            ) : (
              <button onClick={() => setCreating(tab)} className="btn-primary">
                <Plus size={17} />
                فاکتور {tab === "sale" ? "فروش" : "خرید"}
              </button>
            )}
          </>
        }
      />

      {notice?.error && <Notice kind="error">{notice.error}</Notice>}
      {notice?.message && <Notice kind="success">{notice.message}</Notice>}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Receipt} tone="brand" label="مجموع فروش" value={formatTomanShort(stats.salesTotal)} title={formatToman(stats.salesTotal)} hint={`${faNum(stats.salesCount)} فاکتور فروش`} />
        <Stat icon={ShoppingCart} tone="crimson" label="مجموع خرید" value={formatTomanShort(stats.purchaseTotal)} title={formatToman(stats.purchaseTotal)} />
        <Stat icon={CheckCircle2} tone="gold" label="تسویه‌نشده" value={formatTomanShort(stats.unpaid)} title={formatToman(stats.unpaid)} />
        <Stat icon={Users} tone="lapis" label="طرف‌های حساب" value={faNum(customers.length)} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/8 text-center">
          {(
            [
              ["sale", "فاکتور فروش"],
              ["purchase", "فاکتور خرید"],
              ["customers", "مشتریان"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                "px-3 py-2.5 text-xs font-bold transition sm:px-5",
                tab === key ? "bg-brand-400/15 text-brand-300" : "bg-white/3 text-slate-400 hover:text-slate-200"
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

      {tab === "customers" ? (
        customerList.length === 0 ? (
          <EmptyState icon={Users} title="طرف حسابی ثبت نشده" hint="مشتریان و تأمین‌کنندگانت را ثبت کن تا هنگام صدور فاکتور با یک کلیک انتخابشان کنی." />
        ) : (
          <div className="card divide-y divide-white/5">
            {customerList.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lapis-400/15 font-black text-lapis-200">
                  {c.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold text-white">{c.name}</span>
                    <Badge tone={c.type === "supplier" ? "gold" : "slate"}>{c.type === "supplier" ? "تأمین‌کننده" : "مشتری"}</Badge>
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500" dir="ltr">
                    {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button onClick={() => setCustomerModal({ c })} className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-gold-400/12 hover:text-gold-300">
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => window.confirm(`«${c.name}» حذف شود؟`) && run(() => deleteCustomerAction(c.id))}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-crimson-400/12 hover:text-crimson-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )
      ) : list.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={`هنوز فاکتور ${tab === "sale" ? "فروشی" : "خریدی"} صادر نشده`}
          hint="با صدور فاکتور، موجودی انبار و دفتر حسابداری‌ات هم می‌تواند خودکار به‌روز شود."
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-white/5">
            {list.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                <span
                  className={clsx(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
                    i.type === "sale" ? "bg-brand-400/12 text-brand-300" : "bg-crimson-400/12 text-crimson-400"
                  )}
                >
                  {i.type === "sale" ? <Receipt size={17} /> : <ShoppingCart size={17} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white" dir="ltr">
                    {i.number}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                    {i.customerName || "بدون طرف حساب"} · {faDate(i.issueDate)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-black tabular-nums text-gold-300">{formatToman(i.total)}</span>
                <Badge tone={i.status === "paid" ? "emerald" : i.status === "canceled" ? "crimson" : "gold"}>
                  {STATUS_FA[i.status] ?? i.status}
                </Badge>
                <span className="flex shrink-0 items-center gap-1">
                  <button onClick={() => setViewId(i.id)} title="مشاهده و چاپ" className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-lapis-400/12 hover:text-lapis-300">
                    <Eye size={13} />
                  </button>
                  {i.status !== "paid" && (
                    <button
                      onClick={() => run(() => setInvoiceStatusAction(i.id, "paid"))}
                      title="ثبت تسویه"
                      className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-brand-400/12 hover:text-brand-300"
                    >
                      <CheckCircle2 size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => window.confirm(`فاکتور ${i.number} حذف شود؟`) && run(() => deleteInvoiceAction(i.id))}
                    title="حذف"
                    className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-crimson-400/12 hover:text-crimson-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={creating !== null} onClose={() => setCreating(null)} title={`صدور فاکتور ${creating === "purchase" ? "خرید" : "فروش"}`} wide>
        {creating && (
          <InvoiceForm
            type={creating}
            products={products}
            customers={customers}
            pending={pending}
            onSubmit={(fd) => run(() => createInvoiceAction(fd), () => setCreating(null))}
          />
        )}
      </Modal>

      <Modal open={customerModal !== null} onClose={() => setCustomerModal(null)} title={customerModal?.c ? "ویرایش طرف حساب" : "طرف حساب تازه"}>
        <form
          action={(fd) => {
            if (customerModal?.c) fd.set("id", customerModal.c.id);
            run(() => saveCustomerAction(fd), () => setCustomerModal(null));
          }}
          className="grid gap-4"
        >
          <Field label="نام">
            <input name="name" required defaultValue={customerModal?.c?.name} className="field" placeholder="نام مشتری یا شرکت" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="تلفن">
              <input name="phone" dir="ltr" defaultValue={customerModal?.c?.phone} className="field text-left" placeholder="09120000000" />
            </Field>
            <Field label="نوع">
              <select name="type" className="field" defaultValue={customerModal?.c?.type ?? "customer"}>
                <option value="customer">مشتری</option>
                <option value="supplier">تأمین‌کننده</option>
              </select>
            </Field>
          </div>
          <Field label="ایمیل">
            <input name="email" dir="ltr" defaultValue={customerModal?.c?.email} className="field text-left" />
          </Field>
          <Field label="نشانی">
            <textarea name="address" rows={2} defaultValue={customerModal?.c?.address} className="field" />
          </Field>
          <Field label="یادداشت">
            <input name="note" defaultValue={customerModal?.c?.note} className="field" />
          </Field>
          <SubmitButton pending={pending} className="w-full">ذخیره</SubmitButton>
        </form>
      </Modal>

      <InvoiceViewer id={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}

/* ------------------------------ invoice form ------------------------------- */

function InvoiceForm({
  type,
  products,
  customers,
  pending,
  onSubmit,
}: {
  type: "sale" | "purchase";
  products: ProductOption[];
  customers: CustomerRow[];
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: "", name: "", quantity: 1, unitPrice: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const tax = Math.round(((subtotal - Math.min(discount, subtotal)) * taxPercent) / 100);
  const total = subtotal - Math.min(discount, subtotal) + tax;

  function setLine(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickProduct(key: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    setLine(key, {
      productId,
      name: p?.name ?? "",
      unitPrice: p ? (type === "sale" ? p.price : p.buyPrice || p.price) : 0,
    });
  }

  return (
    <form
      action={(fd) => {
        fd.set("type", type);
        fd.set("items", JSON.stringify(lines.map(({ productId, name, quantity, unitPrice }) => ({ productId, name, quantity, unitPrice }))));
        fd.set("customerId", customerId);
        fd.set("customerName", customerName);
        fd.set("customerPhone", customerPhone);
        onSubmit(fd);
      }}
      className="grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="طرف حساب ثبت‌شده">
          <select
            className="field"
            value={customerId}
            onChange={(e) => {
              const id = e.target.value;
              setCustomerId(id);
              const c = customers.find((x) => x.id === id);
              if (c) {
                setCustomerName(c.name);
                setCustomerPhone(c.phone);
              }
            }}
          >
            <option value="">— انتخاب از لیست (اختیاری) —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="نام طرف حساب">
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="field" placeholder="نام مشتری" />
        </Field>
        <Field label="تلفن">
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} dir="ltr" className="field text-left" placeholder="09120000000" />
        </Field>
        <Field label="نشانی (اختیاری)">
          <input name="customerAddress" className="field" />
        </Field>
        <Field label="تاریخ صدور">
          <input name="issueDate" type="date" dir="ltr" defaultValue={new Date().toISOString().slice(0, 10)} className="field text-left" />
        </Field>
        <Field label="مهلت پرداخت (اختیاری)">
          <input name="dueDate" type="date" dir="ltr" className="field text-left" />
        </Field>
      </div>

      {/* line items */}
      <div className="rounded-2xl border border-white/8 bg-white/2 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-black text-white">اقلام فاکتور</span>
          <button
            type="button"
            onClick={() => setLines((ls) => [...ls, { key: Date.now(), productId: "", name: "", quantity: 1, unitPrice: 0 }])}
            className="btn-soft px-3 py-1.5 text-[11px]"
          >
            <Plus size={13} />
            افزودن ردیف
          </button>
        </div>
        <div className="grid gap-3">
          {lines.map((l, idx) => (
            <div key={l.key} className="grid gap-2 rounded-xl bg-white/3 p-3 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-5">
                <span className="mb-1 block text-[10px] text-slate-500">کالا / شرح</span>
                <select value={l.productId} onChange={(e) => pickProduct(l.key, e.target.value)} className="field mb-2 text-xs">
                  <option value="">— انتخاب از انبار —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({faNum(p.stock)} موجود)
                    </option>
                  ))}
                </select>
                <input value={l.name} onChange={(e) => setLine(l.key, { name: e.target.value })} className="field text-xs" placeholder="یا شرح دستی بنویس" />
              </div>
              <div className="sm:col-span-2">
                <span className="mb-1 block text-[10px] text-slate-500">تعداد</span>
                <input
                  type="number"
                  min={1}
                  value={l.quantity}
                  onChange={(e) => setLine(l.key, { quantity: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
                  className="field text-xs"
                />
              </div>
              <div className="sm:col-span-3">
                <span className="mb-1 block text-[10px] text-slate-500">قیمت واحد</span>
                <input
                  type="number"
                  min={0}
                  value={l.unitPrice}
                  onChange={(e) => setLine(l.key, { unitPrice: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                  className="field text-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:col-span-2">
                <span className="text-xs font-black tabular-nums text-gold-300">{faNum(l.quantity * l.unitPrice)}</span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-400 hover:bg-crimson-400/12 hover:text-crimson-400"
                    aria-label={`حذف ردیف ${idx + 1}`}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="تخفیف (تومان)">
          <input name="discount" type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} className="field" />
        </Field>
        <Field label="مالیات بر ارزش افزوده (٪)">
          <input name="taxPercent" type="number" min={0} max={100} value={taxPercent} onChange={(e) => setTaxPercent(Math.max(0, Number(e.target.value) || 0))} className="field" />
        </Field>
      </div>

      <div className="grid gap-1.5 rounded-2xl bg-white/3 p-4 text-xs">
        <Row label="جمع اقلام" value={formatToman(subtotal)} />
        <Row label="تخفیف" value={`− ${formatToman(Math.min(discount, subtotal))}`} />
        <Row label={`مالیات (${faNum(taxPercent)}٪)`} value={formatToman(tax)} />
        <div className="mt-1 border-t border-white/8 pt-2">
          <Row label="مبلغ نهایی" value={formatToman(total)} strong />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
          <input type="checkbox" name="affectStock" value="1" defaultChecked className="h-4 w-4 accent-brand-400" />
          <span className="text-[11px] leading-5 text-slate-300">
            {type === "sale" ? "کسر خودکار از موجودی انبار" : "افزودن خودکار به موجودی انبار"}
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
          <input type="checkbox" name="bookkeeping" value="1" defaultChecked className="h-4 w-4 accent-brand-400" />
          <span className="text-[11px] leading-5 text-slate-300">ثبت خودکار در دفتر حسابداری</span>
        </label>
      </div>

      <Field label="توضیحات فاکتور">
        <textarea name="note" rows={2} className="field" placeholder="شرایط پرداخت، گارانتی و…" />
      </Field>

      <input type="hidden" name="status" value="issued" />
      <SubmitButton pending={pending} className="w-full">
        <PackagePlus size={16} />
        صدور فاکتور ({formatToman(total)})
      </SubmitButton>
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={strong ? "font-black text-white" : "text-slate-400"}>{label}</span>
      <span className={clsx("tabular-nums", strong ? "text-base font-black text-gold-300" : "font-bold text-slate-300")}>{value}</span>
    </div>
  );
}

/* ----------------------------- invoice viewer ------------------------------ */

function InvoiceViewer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [data, setData] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }
    let on = true;
    setLoading(true);
    getInvoiceAction(id).then((res) => {
      if (on) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      on = false;
    };
  }, [id]);

  return (
    <Modal open={id !== null} onClose={onClose} title="مشاهده و چاپ فاکتور" wide>
      {loading || !data ? (
        <p className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
          <Loader2 size={15} className="animate-spin" />
          در حال بارگذاری…
        </p>
      ) : (
        <>
          <div id="invoice-print" className="rounded-2xl bg-white p-6 text-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                {data.business.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.business.logoUrl} alt="لوگو" className="h-14 w-14 rounded-xl object-cover" />
                )}
                <div>
                  <p className="text-base font-black">{data.business.name || "کاروانسرا"}</p>
                  {data.business.phone && <p className="text-[11px] text-slate-500">تلفن: {data.business.phone}</p>}
                  {data.business.address && <p className="text-[11px] text-slate-500">{data.business.address}</p>}
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm font-black">فاکتور {data.type === "sale" ? "فروش" : "خرید"}</p>
                <p className="text-[11px] text-slate-500" dir="ltr">
                  {data.number}
                </p>
                <p className="text-[11px] text-slate-500">تاریخ: {faDate(data.issueDate)}</p>
              </div>
            </div>

            <div className="grid gap-1 py-4 text-[11px] text-slate-600">
              <p>
                <span className="font-bold text-slate-800">طرف حساب: </span>
                {data.customerName || "—"}
              </p>
              {data.customerPhone && (
                <p>
                  <span className="font-bold text-slate-800">تلفن: </span>
                  {data.customerPhone}
                </p>
              )}
              {data.customerAddress && (
                <p>
                  <span className="font-bold text-slate-800">نشانی: </span>
                  {data.customerAddress}
                </p>
              )}
              {data.dueDate && (
                <p>
                  <span className="font-bold text-slate-800">مهلت پرداخت: </span>
                  {faDate(data.dueDate)}
                </p>
              )}
            </div>

            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-200 p-2 text-right">ردیف</th>
                  <th className="border border-slate-200 p-2 text-right">شرح کالا / خدمات</th>
                  <th className="border border-slate-200 p-2">تعداد</th>
                  <th className="border border-slate-200 p-2">قیمت واحد</th>
                  <th className="border border-slate-200 p-2">مبلغ کل</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => (
                  <tr key={i}>
                    <td className="border border-slate-200 p-2 text-center">{faNum(i + 1)}</td>
                    <td className="border border-slate-200 p-2">{it.name}</td>
                    <td className="border border-slate-200 p-2 text-center tabular-nums">{faNum(it.quantity)}</td>
                    <td className="border border-slate-200 p-2 text-center tabular-nums">{faNum(it.unitPrice)}</td>
                    <td className="border border-slate-200 p-2 text-center font-bold tabular-nums">{faNum(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 ml-auto grid w-full max-w-xs gap-1 text-[11px]">
              <PrintRow label="جمع اقلام" value={faNum(data.subtotal)} />
              <PrintRow label="تخفیف" value={faNum(data.discount)} />
              <PrintRow label="مالیات" value={faNum(data.tax)} />
              <div className="mt-1 flex justify-between border-t border-slate-300 pt-1.5 text-sm font-black">
                <span>مبلغ نهایی</span>
                <span className="tabular-nums">{faNum(data.total)} تومان</span>
              </div>
            </div>

            {data.note && <p className="mt-4 border-t border-slate-200 pt-3 text-[11px] text-slate-600">{data.note}</p>}
            <p className="mt-6 text-center text-[10px] text-slate-400">صادرشده با سامانه کاروانسرا</p>
          </div>

          <button onClick={() => window.print()} className="btn-gold mt-4 w-full print:hidden">
            <Printer size={16} />
            چاپ / ذخیره PDF
          </button>
        </>
      )}
    </Modal>
  );
}

function PrintRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
