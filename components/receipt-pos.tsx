"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  Receipt,
  Settings2,
  Loader2,
  ShoppingBasket,
  Utensils,
  Bike,
  Store,
  Package,
  X,
  History,
  Save,
} from "lucide-react";
import clsx from "clsx";
import { Modal, Field, Notice } from "@/components/manager-ui";
import { Badge, SectionTitle, EmptyState } from "@/components/ui";
import { ReceiptPaper, printReceipt } from "@/components/receipt-paper";
import { faNum, formatToman, faTime, ORDER_TYPES, PAYMENT_METHODS } from "@/lib/format";
import {
  createReceiptAction,
  saveReceiptSettingsAction,
  getReceiptAction,
  deleteReceiptAction,
  type ReceiptConfig,
  type ReceiptSnapshot,
  type ReceiptResult,
} from "@/app/dashboard/receipt/actions";

export type PosProduct = { id: string; name: string; price: number; stock: number; category: string; imageUrl: string };
export type RecentReceipt = { id: string; number: string; total: number; orderType: string; createdAt: string };

type CartLine = { key: string; productId?: string; name: string; quantity: number; unitPrice: number };

const ORDER_ICONS: Record<string, typeof Utensils> = {
  dine_in: Utensils,
  takeaway: ShoppingBasket,
  delivery: Bike,
  counter: Store,
};

export function ReceiptPos({
  products,
  recent,
  config,
}: {
  products: PosProduct[];
  recent: RecentReceipt[];
  config: ReceiptConfig;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [orderType, setOrderType] = useState("counter");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [note, setNote] = useState("");
  const [taxPercent, setTaxPercent] = useState(config.taxPercent);
  const [servicePercent, setServicePercent] = useState(config.servicePercent);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [preview, setPreview] = useState<ReceiptSnapshot | null>(null);
  const [notice, setNotice] = useState<ReceiptResult | null>(null);
  const [pending, start] = useTransition();

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    return products.filter((p) => (!q || p.name.includes(q)) && (!category || p.category === category));
  }, [products, search, category]);

  const subtotal = cart.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const base = Math.max(0, subtotal - discount);
  const tax = Math.round((base * taxPercent) / 100);
  const service = Math.round((base * servicePercent) / 100);
  const total = base + tax + service;
  const change = Math.max(0, paidAmount - total);

  function addProduct(p: PosProduct) {
    setCart((c) => {
      const found = c.find((l) => l.productId === p.id);
      if (found) return c.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...c, { key: `${p.id}-${Date.now()}`, productId: p.id, name: p.name, quantity: 1, unitPrice: p.price }];
    });
  }

  function changeQty(key: string, delta: number) {
    setCart((c) =>
      c.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l))
    );
  }

  function resetCart() {
    setCart([]);
    setDiscount(0);
    setPaidAmount(0);
    setNote("");
    setTableNumber("");
    setCustomerName("");
    setCustomerPhone("");
  }

  function submit() {
    if (cart.length === 0) {
      setNotice({ error: "سبد خالی است." });
      return;
    }
    const fd = new FormData();
    fd.set("items", JSON.stringify(cart.map(({ productId, name, quantity, unitPrice }) => ({ productId, name, quantity, unitPrice }))));
    fd.set("orderType", orderType);
    fd.set("tableNumber", tableNumber);
    fd.set("customerName", customerName);
    fd.set("customerPhone", customerPhone);
    fd.set("paymentMethod", paymentMethod);
    fd.set("discount", String(discount));
    fd.set("taxPercent", String(taxPercent));
    fd.set("servicePercent", String(servicePercent));
    fd.set("paidAmount", String(paidAmount));
    fd.set("note", note);
    fd.set("affectStock", "1");
    fd.set("bookkeeping", "1");

    start(async () => {
      const res = await createReceiptAction(fd);
      if (res.error) setNotice({ error: res.error });
      else {
        setNotice({ message: res.message });
        if (res.receipt) setPreview(res.receipt);
        resetCart();
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-5">
      <SectionTitle
        title="صدور فیش فروش"
        subtitle="مخصوص رستوران، کافه و فروشگاه — سازگار با پرینتر حرارتی ۸۰ و ۵۸ میلی‌متری"
        action={
          <>
            <button onClick={() => setHistoryOpen(true)} className="btn-soft">
              <History size={15} />
              فیش‌های امروز
            </button>
            <button onClick={() => setSettingsOpen(true)} className="btn-soft">
              <Settings2 size={15} />
              تنظیمات فیش
            </button>
          </>
        }
      />

      {notice?.error && <Notice kind="error">{notice.error}</Notice>}
      {notice?.message && <Notice kind="success">{notice.message}</Notice>}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* product picker */}
        <section className="grid content-start gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block w-full">
              <Search size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجوی کالا…" className="field pr-10" />
            </label>
            <button onClick={() => setManualOpen(true)} className="btn-soft shrink-0">
              <Plus size={15} />
              قلم دستی
            </button>
          </div>

          {categories.length > 0 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <button
                onClick={() => setCategory("")}
                className={clsx(
                  "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                  !category ? "border-brand-400/50 bg-brand-400/12 text-brand-300" : "border-white/8 bg-white/3 text-slate-400"
                )}
              >
                همه
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={clsx(
                    "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                    category === c ? "border-brand-400/50 bg-brand-400/12 text-brand-300" : "border-white/8 bg-white/3 text-slate-400"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title="کالایی برای انتخاب نیست"
              hint="از بخش انبار محصولات، کالاها را ثبت کن یا از دکمه «قلم دستی» استفاده کن."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="card group overflow-hidden p-3 text-right transition hover:-translate-y-0.5 hover:border-brand-400/40"
                >
                  <span className="mb-2 grid h-16 w-full place-items-center overflow-hidden rounded-xl bg-white/4">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package size={22} className="text-slate-500" />
                    )}
                  </span>
                  <span className="block truncate text-xs font-bold text-white">{p.name}</span>
                  <span className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] font-black tabular-nums text-gold-300">{faNum(p.price)}</span>
                    <span className={clsx("text-[10px] tabular-nums", p.stock <= 0 ? "text-crimson-400" : "text-slate-500")}>
                      {p.stock <= 0 ? "ناموجود" : `${faNum(p.stock)} عدد`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* cart */}
        <section className="card sticky top-20 grid h-fit content-start gap-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-white">
              <Receipt size={16} className="text-brand-300" />
              سبد فیش
            </h2>
            {cart.length > 0 && (
              <button onClick={resetCart} className="text-[11px] font-bold text-crimson-300 hover:text-crimson-200">
                خالی کردن
              </button>
            )}
          </div>

          {/* order type */}
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(ORDER_TYPES).map(([key, label]) => {
              const Icon = ORDER_ICONS[key] ?? Store;
              return (
                <button
                  key={key}
                  onClick={() => setOrderType(key)}
                  title={label}
                  className={clsx(
                    "grid place-items-center gap-1 rounded-xl border py-2 text-[9px] font-bold transition",
                    orderType === key ? "border-brand-400/50 bg-brand-400/12 text-brand-300" : "border-white/8 bg-white/3 text-slate-400"
                  )}
                >
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}
          </div>

          {orderType === "dine_in" && (
            <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="field text-xs" placeholder="شماره میز" />
          )}

          {/* lines */}
          {cart.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-[11px] text-slate-500">
              روی کالاها بزن تا به فیش اضافه شوند
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pl-1">
              {cart.map((l) => (
                <li key={l.key} className="rounded-xl bg-white/3 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-200">{l.name}</span>
                    <button
                      onClick={() => setCart((c) => c.filter((x) => x.key !== l.key))}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-crimson-400/12 hover:text-crimson-400"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-lg border border-white/8">
                      <button onClick={() => changeQty(l.key, -1)} className="grid h-7 w-7 place-items-center rounded-r-lg text-crimson-400 hover:bg-crimson-400/12">
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-xs font-black tabular-nums text-white">{faNum(l.quantity)}</span>
                      <button onClick={() => changeQty(l.key, 1)} className="grid h-7 w-7 place-items-center rounded-l-lg text-brand-300 hover:bg-brand-400/12">
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-xs font-black tabular-nums text-gold-300">{faNum(l.quantity * l.unitPrice)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* totals */}
          <div className="grid gap-1.5 rounded-xl bg-white/3 p-3 text-[11px]">
            <Row label="جمع اقلام" value={faNum(subtotal)} />
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">تخفیف</span>
              <input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-left text-[11px] tabular-nums text-white outline-none focus:border-brand-400/50"
                placeholder="0"
              />
            </div>
            {service > 0 && <Row label={`حق سرویس (${faNum(servicePercent)}٪)`} value={faNum(service)} />}
            {tax > 0 && <Row label={`مالیات (${faNum(taxPercent)}٪)`} value={faNum(tax)} />}
            <div className="mt-1 flex items-center justify-between border-t border-white/8 pt-2">
              <span className="text-xs font-black text-white">قابل پرداخت</span>
              <span className="text-base font-black tabular-nums text-gold-300">{faNum(total)}</span>
            </div>
          </div>

          {/* payment */}
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPaymentMethod(key)}
                className={clsx(
                  "rounded-xl border py-2 text-[9px] font-bold transition",
                  paymentMethod === key ? "border-gold-400/50 bg-gold-400/12 text-gold-300" : "border-white/8 bg-white/3 text-slate-400"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {paymentMethod === "cash" && (
            <div className="grid gap-1.5">
              <input
                type="number"
                min={0}
                value={paidAmount || ""}
                onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                className="field text-xs"
                placeholder="مبلغ دریافتی از مشتری"
              />
              {change > 0 && (
                <p className="rounded-lg bg-brand-400/10 px-3 py-1.5 text-[11px] font-black text-brand-200">
                  بقیه پول: {formatToman(change)}
                </p>
              )}
            </div>
          )}

          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="field text-xs" placeholder="نام مشتری (اختیاری)" />
          <input value={note} onChange={(e) => setNote(e.target.value)} className="field text-xs" placeholder="توضیح روی فیش (اختیاری)" />

          <button onClick={submit} disabled={pending || cart.length === 0} className="btn-primary w-full py-3">
            {pending ? <Loader2 size={17} className="animate-spin" /> : <Printer size={17} />}
            ثبت و چاپ فیش ({faNum(total)})
          </button>
          <p className="text-center text-[10px] text-slate-500">موجودی انبار و دفتر حسابداری خودکار به‌روز می‌شوند</p>
        </section>
      </div>

      {/* manual line */}
      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="افزودن قلم دستی">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const name = String(f.get("name") ?? "").trim();
            const price = Math.max(0, Number(f.get("price")) || 0);
            const qty = Math.max(1, Number(f.get("qty")) || 1);
            if (!name) return;
            setCart((c) => [...c, { key: `m-${Date.now()}`, name, quantity: qty, unitPrice: price }]);
            setManualOpen(false);
          }}
          className="grid gap-4"
        >
          <Field label="شرح">
            <input name="name" required className="field" placeholder="مثلاً: چای زعفرانی" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="قیمت واحد">
              <input name="price" type="number" min={0} required className="field" />
            </Field>
            <Field label="تعداد">
              <input name="qty" type="number" min={1} defaultValue={1} className="field" />
            </Field>
          </div>
          <button type="submit" className="btn-primary w-full">
            افزودن به فیش
          </button>
        </form>
      </Modal>

      {/* settings */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="تنظیمات چاپ فیش">
        <ReceiptSettingsForm
          config={config}
          pending={pending}
          onSave={(fd) =>
            start(async () => {
              const res = await saveReceiptSettingsAction(fd);
              setNotice(res);
              if (!res.error) {
                setTaxPercent(Math.max(0, Number(fd.get("taxPercent")) || 0));
                setServicePercent(Math.max(0, Number(fd.get("servicePercent")) || 0));
                setSettingsOpen(false);
              }
              router.refresh();
            })
          }
        />
      </Modal>

      {/* history */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="فیش‌های اخیر" wide>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">فیشی صادر نشده است.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-white/5 overflow-y-auto">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-400/12 text-xs font-black text-brand-300">
                  {faNum(r.number)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-white">{ORDER_TYPES[r.orderType] ?? r.orderType}</span>
                  <span className="block text-[10px] text-slate-500">{faTime(r.createdAt)}</span>
                </span>
                <span className="text-sm font-black tabular-nums text-gold-300">{formatToman(r.total)}</span>
                <button
                  onClick={() =>
                    start(async () => {
                      const snap = await getReceiptAction(r.id);
                      if (snap) {
                        setPreview(snap);
                        setHistoryOpen(false);
                      }
                    })
                  }
                  className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-brand-400/12 hover:text-brand-300"
                  title="مشاهده و چاپ مجدد"
                >
                  <Printer size={13} />
                </button>
                <button
                  onClick={() =>
                    window.confirm(`فیش ${r.number} حذف شود؟`) &&
                    start(async () => {
                      await deleteReceiptAction(r.id);
                      router.refresh();
                    })
                  }
                  className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-crimson-400/12 hover:text-crimson-400"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* printable preview */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} title={`فیش شماره ${preview ? faNum(preview.number) : ""}`}>
        {preview && (
          <div className="grid gap-4">
            <div className="flex justify-center overflow-x-auto rounded-2xl bg-slate-200 p-4">
              <ReceiptPaper r={preview} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => printReceipt(preview.settings.paperWidth)} className="btn-gold flex-1">
                <Printer size={16} />
                چاپ روی پرینتر حرارتی ({preview.settings.paperWidth === "58" ? "۵۸" : "۸۰"} میلی‌متر)
              </button>
              <button onClick={() => setPreview(null)} className="btn-soft">
                بستن
              </button>
            </div>
            <p className="text-center text-[10px] leading-5 text-slate-500">
              در پنجره چاپ، اندازه کاغذ را روی «Roll Paper» یا همان {preview.settings.paperWidth}mm بگذار و حاشیه‌ها را
              روی «None» تنظیم کن.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold tabular-nums text-slate-200">{value}</span>
    </div>
  );
}

function ReceiptSettingsForm({
  config,
  pending,
  onSave,
}: {
  config: ReceiptConfig;
  pending: boolean;
  onSave: (fd: FormData) => void;
}) {
  const [paper, setPaper] = useState(config.paperWidth);
  const [showLogo, setShowLogo] = useState(config.showLogo);
  return (
    <form
      action={(fd) => {
        fd.set("paperWidth", paper);
        fd.set("showLogo", showLogo ? "1" : "0");
        onSave(fd);
      }}
      className="grid gap-4"
    >
      <Field label="عرض کاغذ پرینتر">
        <div className="grid grid-cols-2 gap-2">
          {[
            ["80", "۸۰ میلی‌متر (استاندارد)"],
            ["58", "۵۸ میلی‌متر (کوچک)"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPaper(key)}
              className={clsx(
                "rounded-xl border px-3 py-2.5 text-xs font-bold transition",
                paper === key ? "border-brand-400/50 bg-brand-400/12 text-brand-300" : "border-white/8 bg-white/3 text-slate-400"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="متن بالای فیش" hint="مثلاً شعار یا شماره مجوز صنفی">
        <input name="headerText" defaultValue={config.headerText} className="field" />
      </Field>
      <Field label="متن پایین فیش">
        <input name="footerText" defaultValue={config.footerText} className="field" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="مالیات پیش‌فرض (٪)">
          <input name="taxPercent" type="number" min={0} max={100} defaultValue={config.taxPercent} className="field" />
        </Field>
        <Field label="حق سرویس پیش‌فرض (٪)">
          <input name="servicePercent" type="number" min={0} max={100} defaultValue={config.servicePercent} className="field" />
        </Field>
      </div>
      <Field label="واحد پول روی فیش">
        <input name="currencyLabel" defaultValue={config.currencyLabel} className="field" placeholder="تومان" />
      </Field>
      <button
        type="button"
        onClick={() => setShowLogo((v) => !v)}
        className={clsx(
          "rounded-xl border px-4 py-3 text-right transition",
          showLogo ? "border-brand-400/40 bg-brand-400/10" : "border-white/8 bg-white/3"
        )}
      >
        <span className={clsx("block text-xs font-black", showLogo ? "text-brand-300" : "text-slate-400")}>
          {showLogo ? "لوگوی کسب‌وکار روی فیش چاپ می‌شود" : "لوگو چاپ نمی‌شود"}
        </span>
        <span className="mt-0.5 block text-[10px] text-slate-500">لوگو را از بخش «پروفایل کسب‌وکار» بارگذاری کن</span>
      </button>
      <button type="submit" disabled={pending} className="btn-gold w-full">
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        ذخیره تنظیمات
      </button>
    </form>
  );
}
