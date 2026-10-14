"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoiceItems, invoices, products, stockMovements, transactions, users } from "@/db/schema";
import { getActiveSubscription, getCurrentUser } from "@/lib/auth";

export type InvoiceResult = { error?: string; message?: string; id?: string };

const SUB_ERROR = "برای استفاده از این بخش، فعال‌سازی اشتراک لازم است.";

async function requireSub() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) return null;
  return user;
}

function touch() {
  revalidatePath("/dashboard", "layout");
}

function faEn(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function num(fd: FormData, key: string, fallback = 0): number {
  const raw = faEn(String(fd.get(key) ?? "")).replace(/[^\d.-]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function dateOr(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type InvoiceLine = { productId?: string; name: string; quantity: number; unitPrice: number };

/* -------------------------------- Customers -------------------------------- */

export async function saveCustomerAction(fd: FormData): Promise<InvoiceResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };
  const name = str(fd, "name");
  if (!name) return { error: "نام طرف حساب را بنویس." };
  const id = str(fd, "id");
  const values = {
    name,
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    address: str(fd, "address"),
    type: str(fd, "type") === "supplier" ? "supplier" : "customer",
    note: str(fd, "note"),
  };
  if (id) {
    await db.update(customers).set(values).where(and(eq(customers.id, id), eq(customers.userId, user.id)));
  } else {
    await db.insert(customers).values({ ...values, userId: user.id });
  }
  touch();
  return {};
}

export async function deleteCustomerAction(id: string): Promise<InvoiceResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };
  await db.delete(customers).where(and(eq(customers.id, id), eq(customers.userId, user.id)));
  touch();
  return {};
}

/* --------------------------------- Invoices -------------------------------- */

async function nextInvoiceNumber(userId: string, type: string): Promise<string> {
  const [row] = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(invoices)
    .where(and(eq(invoices.userId, userId), eq(invoices.type, type)));
  const seq = Number(row?.count ?? 0) + 1;
  const year = new Intl.DateTimeFormat("fa-IR-u-nu-latn", { year: "numeric" }).format(new Date()).replace(/\D/g, "");
  return `${type === "sale" ? "FR" : "KH"}-${year}-${String(seq).padStart(4, "0")}`;
}

export async function createInvoiceAction(fd: FormData): Promise<InvoiceResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };

  const type = str(fd, "type") === "purchase" ? "purchase" : "sale";
  let lines: InvoiceLine[] = [];
  try {
    lines = JSON.parse(str(fd, "items") || "[]");
  } catch {
    return { error: "اقلام فاکتور خوانده نشد." };
  }
  lines = lines
    .map((l) => ({
      productId: l.productId || undefined,
      name: String(l.name ?? "").trim(),
      quantity: Math.max(1, Math.round(Number(l.quantity) || 0)),
      unitPrice: Math.max(0, Math.round(Number(l.unitPrice) || 0)),
    }))
    .filter((l) => l.name);
  if (lines.length === 0) return { error: "حداقل یک قلم کالا به فاکتور اضافه کن." };

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const discount = Math.min(subtotal, Math.max(0, num(fd, "discount")));
  const taxPercent = Math.min(100, Math.max(0, num(fd, "taxPercent")));
  const tax = Math.round(((subtotal - discount) * taxPercent) / 100);
  const total = subtotal - discount + tax;

  const customerId = str(fd, "customerId");
  const number = await nextInvoiceNumber(user.id, type);
  const status = str(fd, "status") || "issued";

  const inserted = await db
    .insert(invoices)
    .values({
      userId: user.id,
      number,
      type,
      customerId: customerId || null,
      customerName: str(fd, "customerName"),
      customerPhone: str(fd, "customerPhone"),
      customerAddress: str(fd, "customerAddress"),
      issueDate: dateOr(str(fd, "issueDate")) ?? new Date(),
      dueDate: dateOr(str(fd, "dueDate")),
      status,
      subtotal,
      discount,
      tax,
      total,
      note: str(fd, "note"),
    })
    .returning({ id: invoices.id });

  const invoiceId = inserted[0]?.id;
  if (!invoiceId) return { error: "ثبت فاکتور ناموفق بود." };

  await db.insert(invoiceItems).values(
    lines.map((l) => ({
      invoiceId,
      productId: l.productId ?? null,
      name: l.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      total: l.quantity * l.unitPrice,
    }))
  );

  // Optionally move stock: sale → out, purchase → in
  if (fd.get("affectStock") === "1") {
    for (const l of lines) {
      if (!l.productId) continue;
      const rows = await db
        .select()
        .from(products)
        .where(and(eq(products.id, l.productId), eq(products.userId, user.id)))
        .limit(1);
      const product = rows[0];
      if (!product) continue;
      const delta = type === "sale" ? -l.quantity : l.quantity;
      const next = Math.max(0, product.stock + delta);
      await db.update(products).set({ stock: next, updatedAt: new Date() }).where(eq(products.id, product.id));
      await db.insert(stockMovements).values({
        productId: product.id,
        userId: user.id,
        type: delta > 0 ? "in" : "out",
        quantity: delta,
        balanceAfter: next,
        note: `فاکتور ${number}`,
      });
    }
  }

  // Optionally book it in accounting
  if (fd.get("bookkeeping") === "1" && total > 0) {
    await db.insert(transactions).values({
      userId: user.id,
      type: type === "sale" ? "income" : "expense",
      category: type === "sale" ? "فروش محصول" : "خرید کالا",
      amount: total,
      description: `فاکتور ${number}${str(fd, "customerName") ? ` — ${str(fd, "customerName")}` : ""}`,
      invoiceId,
      date: dateOr(str(fd, "issueDate")) ?? new Date(),
    });
  }

  touch();
  return { id: invoiceId, message: `فاکتور ${number} ثبت شد.` };
}

export async function setInvoiceStatusAction(id: string, status: string): Promise<InvoiceResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };
  if (!["issued", "paid", "canceled"].includes(status)) return { error: "وضعیت نامعتبر است." };
  await db
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)));
  touch();
  return {};
}

export async function deleteInvoiceAction(id: string): Promise<InvoiceResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };
  await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, user.id)));
  touch();
  return {};
}

export type InvoiceDetail = {
  id: string;
  number: string;
  type: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  business: { name: string; logoUrl: string; phone: string; address: string };
};

export async function getInvoiceAction(id: string): Promise<InvoiceDetail | null> {
  const user = await requireSub();
  if (!user) return null;
  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
    .limit(1);
  const inv = rows[0];
  if (!inv) return null;
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, inv.id))
    .orderBy(desc(invoiceItems.total));

  const me = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const profile = me[0];

  return {
    id: inv.id,
    number: inv.number,
    type: inv.type,
    status: inv.status,
    customerName: inv.customerName,
    customerPhone: inv.customerPhone,
    customerAddress: inv.customerAddress,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate ? inv.dueDate.toISOString() : "",
    subtotal: inv.subtotal,
    discount: inv.discount,
    tax: inv.tax,
    total: inv.total,
    note: inv.note,
    items: items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
    business: {
      name: profile?.businessName || profile?.name || "",
      logoUrl: profile?.logoUrl || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
    },
  };
}
