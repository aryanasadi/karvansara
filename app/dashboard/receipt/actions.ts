"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  products,
  receiptSettings,
  receipts,
  stockMovements,
  transactions,
  users,
} from "@/db/schema";
import { getActiveSubscription, getCurrentUser } from "@/lib/auth";

export type ReceiptLine = { productId?: string; name: string; quantity: number; unitPrice: number };

export type ReceiptSnapshot = {
  id: string;
  number: string;
  orderType: string;
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  items: ReceiptLine[];
  subtotal: number;
  discount: number;
  tax: number;
  service: number;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  changeAmount: number;
  note: string;
  createdAt: string;
  business: { name: string; logoUrl: string; phone: string; address: string };
  settings: ReceiptConfig;
};

export type ReceiptConfig = {
  paperWidth: string;
  headerText: string;
  footerText: string;
  showLogo: boolean;
  taxPercent: number;
  servicePercent: number;
  currencyLabel: string;
};

export type ReceiptResult = { error?: string; message?: string; receipt?: ReceiptSnapshot };

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

function faEn(s: string) {
  return s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function num(fd: FormData, key: string, fallback = 0): number {
  const raw = faEn(String(fd.get(key) ?? "")).replace(/[^\d.-]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export async function getReceiptConfig(userId: string): Promise<ReceiptConfig> {
  const rows = await db.select().from(receiptSettings).where(eq(receiptSettings.userId, userId)).limit(1);
  const row = rows[0];
  return {
    paperWidth: row?.paperWidth ?? "80",
    headerText: row?.headerText ?? "",
    footerText: row?.footerText ?? "از خرید شما سپاسگزاریم 🌹",
    showLogo: row?.showLogo ?? true,
    taxPercent: row?.taxPercent ?? 0,
    servicePercent: row?.servicePercent ?? 0,
    currencyLabel: row?.currencyLabel ?? "تومان",
  };
}

export async function saveReceiptSettingsAction(fd: FormData): Promise<ReceiptResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };

  const values = {
    paperWidth: String(fd.get("paperWidth") ?? "80") === "58" ? "58" : "80",
    headerText: String(fd.get("headerText") ?? "").trim(),
    footerText: String(fd.get("footerText") ?? "").trim(),
    showLogo: fd.get("showLogo") === "1",
    taxPercent: Math.min(100, Math.max(0, num(fd, "taxPercent"))),
    servicePercent: Math.min(100, Math.max(0, num(fd, "servicePercent"))),
    currencyLabel: String(fd.get("currencyLabel") ?? "تومان").trim() || "تومان",
  };

  const existing = await db
    .select({ id: receiptSettings.id })
    .from(receiptSettings)
    .where(eq(receiptSettings.userId, user.id))
    .limit(1);

  if (existing[0]) {
    await db.update(receiptSettings).set(values).where(eq(receiptSettings.id, existing[0].id));
  } else {
    await db.insert(receiptSettings).values({ ...values, userId: user.id });
  }
  touch();
  return { message: "تنظیمات فیش ذخیره شد." };
}

async function nextReceiptNumber(userId: string): Promise<string> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [row] = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(receipts)
    .where(and(eq(receipts.userId, userId), sql`${receipts.createdAt} >= ${startOfDay}`));
  const seq = Number(row?.count ?? 0) + 1;
  return String(seq).padStart(3, "0");
}

export async function createReceiptAction(fd: FormData): Promise<ReceiptResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };

  let lines: ReceiptLine[] = [];
  try {
    lines = JSON.parse(String(fd.get("items") ?? "[]"));
  } catch {
    return { error: "اقلام فیش خوانده نشد." };
  }
  lines = lines
    .map((l) => ({
      productId: l.productId || undefined,
      name: String(l.name ?? "").trim(),
      quantity: Math.max(1, Math.round(Number(l.quantity) || 0)),
      unitPrice: Math.max(0, Math.round(Number(l.unitPrice) || 0)),
    }))
    .filter((l) => l.name);
  if (lines.length === 0) return { error: "سبد خالی است؛ حداقل یک قلم اضافه کن." };

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const discount = Math.min(subtotal, Math.max(0, num(fd, "discount")));
  const taxPercent = Math.min(100, Math.max(0, num(fd, "taxPercent")));
  const servicePercent = Math.min(100, Math.max(0, num(fd, "servicePercent")));
  const base = subtotal - discount;
  const tax = Math.round((base * taxPercent) / 100);
  const service = Math.round((base * servicePercent) / 100);
  const total = base + tax + service;

  const paidAmount = Math.max(0, num(fd, "paidAmount"));
  const changeAmount = Math.max(0, paidAmount - total);
  const number = await nextReceiptNumber(user.id);

  const inserted = await db
    .insert(receipts)
    .values({
      userId: user.id,
      number,
      orderType: String(fd.get("orderType") ?? "counter"),
      tableNumber: String(fd.get("tableNumber") ?? "").trim(),
      customerName: String(fd.get("customerName") ?? "").trim(),
      customerPhone: String(fd.get("customerPhone") ?? "").trim(),
      items: JSON.stringify(lines),
      subtotal,
      discount,
      tax,
      service,
      total,
      paymentMethod: String(fd.get("paymentMethod") ?? "cash"),
      paidAmount,
      changeAmount,
      note: String(fd.get("note") ?? "").trim(),
    })
    .returning({ id: receipts.id, createdAt: receipts.createdAt });

  const created = inserted[0];
  if (!created) return { error: "ثبت فیش ناموفق بود." };

  // stock + bookkeeping
  if (fd.get("affectStock") === "1") {
    for (const l of lines) {
      if (!l.productId) continue;
      const rows = await db
        .select()
        .from(products)
        .where(and(eq(products.id, l.productId), eq(products.userId, user.id)))
        .limit(1);
      const p = rows[0];
      if (!p) continue;
      const next = Math.max(0, p.stock - l.quantity);
      await db.update(products).set({ stock: next, updatedAt: new Date() }).where(eq(products.id, p.id));
      await db.insert(stockMovements).values({
        productId: p.id,
        userId: user.id,
        type: "out",
        quantity: -l.quantity,
        balanceAfter: next,
        note: `فیش شماره ${number}`,
      });
    }
  }

  if (fd.get("bookkeeping") === "1" && total > 0) {
    await db.insert(transactions).values({
      userId: user.id,
      type: "income",
      category: "فروش محصول",
      amount: total,
      description: `فیش شماره ${number}`,
      date: new Date(),
    });
  }

  const profileRows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const profile = profileRows[0];
  const settings = await getReceiptConfig(user.id);

  touch();
  return {
    message: `فیش ${number} ثبت شد.`,
    receipt: {
      id: created.id,
      number,
      orderType: String(fd.get("orderType") ?? "counter"),
      tableNumber: String(fd.get("tableNumber") ?? "").trim(),
      customerName: String(fd.get("customerName") ?? "").trim(),
      customerPhone: String(fd.get("customerPhone") ?? "").trim(),
      items: lines,
      subtotal,
      discount,
      tax,
      service,
      total,
      paymentMethod: String(fd.get("paymentMethod") ?? "cash"),
      paidAmount,
      changeAmount,
      note: String(fd.get("note") ?? "").trim(),
      createdAt: created.createdAt.toISOString(),
      business: {
        name: profile?.businessName || profile?.name || "",
        logoUrl: profile?.logoUrl || "",
        phone: profile?.phone || "",
        address: profile?.address || "",
      },
      settings,
    },
  };
}

export async function getReceiptAction(id: string): Promise<ReceiptSnapshot | null> {
  const user = await requireSub();
  if (!user) return null;
  const rows = await db
    .select()
    .from(receipts)
    .where(and(eq(receipts.id, id), eq(receipts.userId, user.id)))
    .limit(1);
  const r = rows[0];
  if (!r) return null;

  const profileRows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const profile = profileRows[0];
  const settings = await getReceiptConfig(user.id);

  let items: ReceiptLine[] = [];
  try {
    items = JSON.parse(r.items);
  } catch {
    items = [];
  }

  return {
    id: r.id,
    number: r.number,
    orderType: r.orderType,
    tableNumber: r.tableNumber,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    items,
    subtotal: r.subtotal,
    discount: r.discount,
    tax: r.tax,
    service: r.service,
    total: r.total,
    paymentMethod: r.paymentMethod,
    paidAmount: r.paidAmount,
    changeAmount: r.changeAmount,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
    business: {
      name: profile?.businessName || profile?.name || "",
      logoUrl: profile?.logoUrl || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
    },
    settings,
  };
}

export async function deleteReceiptAction(id: string): Promise<ReceiptResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };
  await db.delete(receipts).where(and(eq(receipts.id, id), eq(receipts.userId, user.id)));
  touch();
  return {};
}

export async function recentReceiptsAction(): Promise<
  { id: string; number: string; total: number; createdAt: string; orderType: string }[]
> {
  const user = await requireSub();
  if (!user) return [];
  const rows = await db
    .select()
    .from(receipts)
    .where(eq(receipts.userId, user.id))
    .orderBy(desc(receipts.createdAt))
    .limit(20);
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    total: r.total,
    createdAt: r.createdAt.toISOString(),
    orderType: r.orderType,
  }));
}
