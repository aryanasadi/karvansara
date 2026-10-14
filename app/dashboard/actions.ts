"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assets,
  gatewaySettings,
  notes,
  payments,
  plans,
  products,
  stockMovements,
  tasks,
  transactions,
  visions,
  wooConnections,
} from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { activateSubscription, planById } from "@/lib/billing";
import { zarinpalRequest, zibalRequest } from "@/lib/payments";
import { varizaCreatePayment } from "@/lib/variza";
import { abanCreateInvoice } from "@/lib/abangateway";
import {
  listWooProducts,
  normalizeSiteUrl,
  testWooConnection,
  updateWooStock,
} from "@/lib/woocommerce";
import { ensureSeedData } from "@/lib/seed";
import { storeImage } from "@/lib/uploads";
import { faNum } from "@/lib/format";
import { validateDiscount, consumeDiscount } from "@/lib/discounts";

export type Result = {
  error?: string;
  message?: string;
  url?: string;
};

const SUB_ERROR = "برای استفاده از این بخش، فعال‌سازی اشتراک لازم است.";

function touch(path = "/dashboard") {
  revalidatePath(path, "layout");
}

async function requireSub(): Promise<{ user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> } | null> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) return null;
  return { user };
}

/* ------------------------------- Input parsing ------------------------------ */

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

/* --------------------------------- Products --------------------------------- */

/** Uploads an image (product photo / business logo) and returns its URL. */
export async function uploadImageAction(fd: FormData): Promise<{ url?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const file = fd.get("file");
  if (!(file instanceof File)) return { error: "فایلی انتخاب نشده است." };
  return storeImage(user.id, file);
}

export async function createProductAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const name = str(fd, "name");
  if (!name) return { error: "نام محصول را بنویس." };
  await db.insert(products).values({
    userId: ctx.user.id,
    name,
    sku: str(fd, "sku"),
    price: Math.max(0, num(fd, "price")),
    buyPrice: Math.max(0, num(fd, "buyPrice")),
    stock: Math.max(0, num(fd, "stock")),
    lowStockThreshold: Math.max(0, num(fd, "lowStockThreshold", 5)),
    category: str(fd, "category"),
    imageUrl: str(fd, "imageUrl"),
    source: "manual",
  });
  touch();
  return {};
}

export async function updateProductAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!id || !name) return { error: "اطلاعات محصول کامل نیست." };
  await db
    .update(products)
    .set({
      name,
      sku: str(fd, "sku"),
      price: Math.max(0, num(fd, "price")),
      buyPrice: Math.max(0, num(fd, "buyPrice")),
      lowStockThreshold: Math.max(0, num(fd, "lowStockThreshold", 5)),
      category: str(fd, "category"),
      imageUrl: str(fd, "imageUrl"),
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, id), eq(products.userId, ctx.user.id)));
  touch();
  return {};
}

export async function deleteProductAction(id: string): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  await db.delete(products).where(and(eq(products.id, id), eq(products.userId, ctx.user.id)));
  touch();
  return {};
}

export async function adjustStockAction(input: {
  productId: string;
  delta: number;
  note?: string;
}): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const delta = Math.trunc(input.delta);
  if (!delta) return { error: "مقدار تغییر موجودی صفر است." };

  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id)))
    .limit(1);
  const product = rows[0];
  if (!product) return { error: "محصول یافت نشد." };

  const next = Math.max(0, product.stock + delta);
  await db
    .update(products)
    .set({ stock: next, updatedAt: new Date() })
    .where(eq(products.id, product.id));
  await db.insert(stockMovements).values({
    productId: product.id,
    userId: ctx.user.id,
    type: delta > 0 ? "in" : "out",
    quantity: delta,
    balanceAfter: next,
    note: input.note ?? "",
  });

  // Push back to WooCommerce if this product came from a store with auto-push on.
  if (product.source === "woocommerce" && product.wooId && product.wooConnectionId) {
    const connRows = await db
      .select()
      .from(wooConnections)
      .where(
        and(eq(wooConnections.id, product.wooConnectionId), eq(wooConnections.userId, ctx.user.id))
      )
      .limit(1);
    const conn = connRows[0];
    if (conn?.autoPush) {
      try {
        await updateWooStock(
          { siteUrl: conn.siteUrl, consumerKey: conn.consumerKey, consumerSecret: conn.consumerSecret },
          product.wooId,
          next
        );
      } catch (err) {
        touch();
        return {
          error: `موجودی محلی به‌روز شد؛ اما ارسال به ووکامرس ناموفق بود: ${
            err instanceof Error ? err.message : "خطای ناشناخته"
          }`,
        };
      }
    }
  }
  touch();
  return {};
}

export async function getStockHistoryAction(productId: string): Promise<
  { id: string; type: string; quantity: number; balanceAfter: number; note: string; createdAt: string }[]
> {
  const ctx = await requireSub();
  if (!ctx) return [];
  const rows = await db
    .select()
    .from(stockMovements)
    .where(and(eq(stockMovements.productId, productId), eq(stockMovements.userId, ctx.user.id)))
    .orderBy(desc(stockMovements.createdAt))
    .limit(40);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    quantity: r.quantity,
    balanceAfter: r.balanceAfter,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }));
}

/* ------------------------------- WooCommerce -------------------------------- */

export async function addWooConnectionAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const siteUrl = normalizeSiteUrl(str(fd, "siteUrl"));
  const consumerKey = str(fd, "consumerKey");
  const consumerSecret = str(fd, "consumerSecret");
  let name = str(fd, "name");
  if (!siteUrl || !consumerKey || !consumerSecret) {
    return { error: "نشانی سایت و هر دو کلید ووکامرس لازم است." };
  }
  try {
    await testWooConnection({ siteUrl, consumerKey, consumerSecret });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "اتصال برقرار نشد." };
  }
  if (!name) {
    try {
      name = new URL(siteUrl).hostname;
    } catch {
      name = "فروشگاه ووکامرس";
    }
  }
  await db.insert(wooConnections).values({
    userId: ctx.user.id,
    name,
    siteUrl,
    consumerKey,
    consumerSecret,
    status: "active",
  });
  touch();
  return { message: "فروشگاه با موفقیت متصل شد." };
}

export async function removeWooConnectionAction(id: string): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  await db
    .update(products)
    .set({ source: "manual", wooId: null, wooConnectionId: null, updatedAt: new Date() })
    .where(and(eq(products.wooConnectionId, id), eq(products.userId, ctx.user.id)));
  await db
    .delete(wooConnections)
    .where(and(eq(wooConnections.id, id), eq(wooConnections.userId, ctx.user.id)));
  touch();
  return {};
}

export async function syncWooConnectionAction(id: string): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const rows = await db
    .select()
    .from(wooConnections)
    .where(and(eq(wooConnections.id, id), eq(wooConnections.userId, ctx.user.id)))
    .limit(1);
  const conn = rows[0];
  if (!conn) return { error: "اتصال یافت نشد." };

  try {
    const wooProducts = await listWooProducts({
      siteUrl: conn.siteUrl,
      consumerKey: conn.consumerKey,
      consumerSecret: conn.consumerSecret,
    });

    let inserted = 0;
    let updated = 0;
    for (const wp of wooProducts) {
      const price = Math.round(
        Number(faEn(wp.price || wp.regular_price || "0").replace(/[^\d.]/g, "")) || 0
      );
      const stock = wp.stock_quantity ?? 0;
      const category = wp.categories?.[0]?.name ?? "";
      const imageUrl = wp.images?.[0]?.src ?? "";
      const existing = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.userId, ctx.user.id),
            eq(products.wooConnectionId, conn.id),
            eq(products.wooId, wp.id)
          )
        )
        .limit(1);

      if (existing[0]) {
        await db
          .update(products)
          .set({
            name: wp.name,
            sku: wp.sku ?? "",
            price,
            stock,
            category,
            imageUrl,
            updatedAt: new Date(),
          })
          .where(eq(products.id, existing[0].id));
        updated++;
      } else {
        await db.insert(products).values({
          userId: ctx.user.id,
          name: wp.name,
          sku: wp.sku ?? "",
          price,
          stock,
          lowStockThreshold: 5,
          category,
          imageUrl,
          source: "woocommerce",
          wooId: wp.id,
          wooConnectionId: conn.id,
        });
        inserted++;
      }
    }

    const message = `همگام‌سازی موفق: ${faNum(inserted)} محصول تازه، ${faNum(updated)} محصول به‌روز شد.`;
    await db
      .update(wooConnections)
      .set({ lastSyncAt: new Date(), status: "active", lastSyncMessage: message })
      .where(eq(wooConnections.id, conn.id));
    touch();
    return { message };
  } catch (err) {
    const message = err instanceof Error ? err.message : "همگام‌سازی ناموفق بود.";
    await db
      .update(wooConnections)
      .set({ status: "error", lastSyncMessage: message })
      .where(eq(wooConnections.id, conn.id));
    touch();
    return { error: message };
  }
}

export async function toggleWooAutoPushAction(id: string, value: boolean): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  await db
    .update(wooConnections)
    .set({ autoPush: value })
    .where(and(eq(wooConnections.id, id), eq(wooConnections.userId, ctx.user.id)));
  touch();
  return {};
}

/* -------------------------------- Accounting -------------------------------- */

export async function addTransactionAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const type = str(fd, "type");
  const amount = Math.abs(num(fd, "amount"));
  if (type !== "income" && type !== "expense") return { error: "نوع تراکنش مشخص نیست." };
  if (!amount) return { error: "مبلغ تراکنش را بنویس." };
  await db.insert(transactions).values({
    userId: ctx.user.id,
    type,
    category: str(fd, "category"),
    amount,
    description: str(fd, "description"),
    date: dateOr(str(fd, "date")) ?? new Date(),
  });
  touch();
  return {};
}

export async function updateTransactionAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const id = str(fd, "id");
  const type = str(fd, "type");
  const amount = Math.abs(num(fd, "amount"));
  if (!id || (type !== "income" && type !== "expense") || !amount) {
    return { error: "اطلاعات تراکنش کامل نیست." };
  }
  await db
    .update(transactions)
    .set({
      type,
      category: str(fd, "category"),
      amount,
      description: str(fd, "description"),
      date: dateOr(str(fd, "date")) ?? new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, ctx.user.id)));
  touch();
  return {};
}

export async function deleteTransactionAction(id: string): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, ctx.user.id)));
  touch();
  return {};
}

/* ---------------------------- Tasks and visions ----------------------------- */

export async function addTaskAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const title = str(fd, "title");
  if (!title) return { error: "عنوان کار را بنویس." };
  const priority = ["low", "medium", "high"].includes(str(fd, "priority")) ? str(fd, "priority") : "medium";
  await db.insert(tasks).values({
    userId: ctx.user.id,
    title,
    description: str(fd, "description"),
    priority,
    dueDate: dateOr(str(fd, "dueDate")),
    status: "todo",
    progress: 0,
  });
  touch();
  return {};
}

export async function updateTaskAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const id = str(fd, "id");
  const title = str(fd, "title");
  if (!id || !title) return { error: "اطلاعات کار کامل نیست." };
  const priority = ["low", "medium", "high"].includes(str(fd, "priority")) ? str(fd, "priority") : "medium";
  await db
    .update(tasks)
    .set({
      title,
      description: str(fd, "description"),
      priority,
      dueDate: dateOr(str(fd, "dueDate")),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, ctx.user.id)));
  touch();
  return {};
}

export async function setTaskStatusAction(id: string, status: string): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  if (!["todo", "in_progress", "done"].includes(status)) return { error: "وضعیت نامعتبر است." };
  await db
    .update(tasks)
    .set({
      status,
      progress: status === "done" ? 100 : status === "todo" ? 0 : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, ctx.user.id)));
  touch();
  return {};
}

export async function setTaskProgressAction(id: string, progress: number): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const p = Math.min(100, Math.max(0, Math.round(progress)));
  await db
    .update(tasks)
    .set({
      progress: p,
      status: p >= 100 ? "done" : p > 0 ? "in_progress" : "todo",
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, ctx.user.id)));
  touch();
  return {};
}

export async function deleteTaskAction(id: string): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, ctx.user.id)));
  touch();
  return {};
}

export async function addVisionAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const title = str(fd, "title");
  if (!title) return { error: "شرح چشم‌انداز را بنویس." };
  await db.insert(visions).values({
    userId: ctx.user.id,
    title,
    description: str(fd, "description"),
    targetDate: dateOr(str(fd, "targetDate")),
    progress: Math.min(100, Math.max(0, num(fd, "progress", 0))),
  });
  touch();
  return {};
}

export async function setVisionProgressAction(id: string, progress: number): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const p = Math.min(100, Math.max(0, Math.round(progress)));
  await db
    .update(visions)
    .set({ progress: p, updatedAt: new Date() })
    .where(and(eq(visions.id, id), eq(visions.userId, ctx.user.id)));
  touch();
  return {};
}

export async function deleteVisionAction(id: string): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  await db.delete(visions).where(and(eq(visions.id, id), eq(visions.userId, ctx.user.id)));
  touch();
  return {};
}

/* ----------------------------------- Notes ---------------------------------- */

export async function addNoteAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const kind = str(fd, "kind") === "quote" ? "quote" : "note";
  const content = str(fd, "content");
  if (!content) return { error: "متن یادداشت خالی است." };
  await db.insert(notes).values({
    userId: ctx.user.id,
    kind,
    title: str(fd, "title"),
    content,
    color: str(fd, "color") || "gold",
  });
  touch();
  return {};
}

export async function updateNoteAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const id = str(fd, "id");
  const content = str(fd, "content");
  if (!id || !content) return { error: "متن یادداشت خالی است." };
  await db
    .update(notes)
    .set({
      kind: str(fd, "kind") === "quote" ? "quote" : "note",
      title: str(fd, "title"),
      content,
      color: str(fd, "color") || "gold",
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, id), eq(notes.userId, ctx.user.id)));
  touch();
  return {};
}

export async function toggleNotePinAction(id: string): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const rows = await db
    .select({ isPinned: notes.isPinned })
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, ctx.user.id)))
    .limit(1);
  if (!rows[0]) return { error: "یادداشت یافت نشد." };
  await db
    .update(notes)
    .set({ isPinned: !rows[0].isPinned, updatedAt: new Date() })
    .where(eq(notes.id, id));
  touch();
  return {};
}

export async function deleteNoteAction(id: string): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, ctx.user.id)));
  touch();
  return {};
}

/* ---------------------------------- Assets ---------------------------------- */

export async function addAssetAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const name = str(fd, "name");
  if (!name) return { error: "نام دارایی را بنویس." };
  await db.insert(assets).values({
    userId: ctx.user.id,
    name,
    type: str(fd, "type") || "other",
    quantity: Math.max(1, num(fd, "quantity", 1)),
    unitPurchasePrice: Math.max(0, num(fd, "unitPurchasePrice")),
    unitCurrentValue: Math.max(0, num(fd, "unitCurrentValue")),
    purchaseDate: dateOr(str(fd, "purchaseDate")),
    note: str(fd, "note"),
  });
  touch();
  return {};
}

export async function updateAssetAction(fd: FormData): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!id || !name) return { error: "اطلاعات دارایی کامل نیست." };
  await db
    .update(assets)
    .set({
      name,
      type: str(fd, "type") || "other",
      quantity: Math.max(1, num(fd, "quantity", 1)),
      unitPurchasePrice: Math.max(0, num(fd, "unitPurchasePrice")),
      unitCurrentValue: Math.max(0, num(fd, "unitCurrentValue")),
      purchaseDate: dateOr(str(fd, "purchaseDate")),
      note: str(fd, "note"),
      updatedAt: new Date(),
    })
    .where(and(eq(assets.id, id), eq(assets.userId, ctx.user.id)));
  touch();
  return {};
}

export async function deleteAssetAction(id: string): Promise<Result> {
  const ctx = await requireSub();
  if (!ctx) return { error: SUB_ERROR };
  await db.delete(assets).where(and(eq(assets.id, id), eq(assets.userId, ctx.user.id)));
  touch();
  return {};
}

/* --------------------------- Subscription & payment -------------------------- */

export async function activateTrialAction(): Promise<Result> {
  await ensureSeedData();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const active = await getActiveSubscription(user.id);
  if (active) return { error: "اشتراک فعال داری؛ نیازی به فعال‌سازی مجدد نیست." };
  if (await hasUsedTrial(user.id)) {
    return { error: "هدیه ۷ روزه فقط یک‌بار قابل استفاده است. یکی از پلن‌ها را انتخاب کن." };
  }
  const trialPlans = await db.select().from(plans).where(eq(plans.isTrial, true)).limit(1);
  const trial = trialPlans[0];
  if (!trial) return { error: "پلن آزمایشی در دسترس نیست." };
  await activateSubscription(user.id, trial.id);
  touch();
  return { message: "هدیه ۷ روزه فعال شد؛ کاروانسرا پیش توست!" };
}

/** Checks a discount code from the subscription page (no side effects). */
export async function checkDiscountAction(
  planId: string,
  code: string
): Promise<{ error?: string; discountAmount?: number; finalAmount?: number; label?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const plan = await planById(planId);
  if (!plan) return { error: "پلن یافت نشد." };
  const res = await validateDiscount(code, plan.price);
  if (res.error) return { error: res.error };
  return { discountAmount: res.discountAmount, finalAmount: res.finalAmount, label: res.label };
}

/** Card-to-card details shown to the buyer (manual method). */
export async function getManualCardInfoAction(): Promise<{
  cardNumber: string;
  cardHolder: string;
  bankName: string;
} | null> {
  const rows = await db.select().from(gatewaySettings).where(eq(gatewaySettings.gateway, "manual_card")).limit(1);
  const row = rows[0];
  if (!row || !row.isActive || !row.cardNumber) return null;
  return { cardNumber: row.cardNumber, cardHolder: row.cardHolder, bankName: row.bankName };
}

/**
 * Manual card-to-card: the buyer uploads the transfer receipt and the payment
 * waits in `review` status until an admin approves it.
 */
export async function submitCardReceiptAction(fd: FormData): Promise<Result> {
  await ensureSeedData();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const planId = str(fd, "planId");
  const plan = await planById(planId);
  if (!plan || !plan.isActive) return { error: "این پلن در دسترس نیست." };

  const settingsRows = await db
    .select()
    .from(gatewaySettings)
    .where(eq(gatewaySettings.gateway, "manual_card"))
    .limit(1);
  if (!settingsRows[0]?.isActive) return { error: "پرداخت کارت‌به‌کارت در حال حاضر غیرفعال است." };

  let amount = plan.price;
  let appliedCode = "";
  const code = str(fd, "discountCode");
  if (code) {
    const check = await validateDiscount(code, plan.price);
    if (check.error) return { error: check.error };
    amount = check.finalAmount ?? plan.price;
    appliedCode = check.code ?? "";
  }

  const payerName = str(fd, "payerName");
  if (!payerName) return { error: "نام واریزکننده را بنویس." };

  const file = fd.get("receipt");
  if (!(file instanceof File) || file.size === 0) return { error: "تصویر رسید واریز را بارگذاری کن." };
  const upload = await storeImage(user.id, file);
  if (upload.error || !upload.url) return { error: upload.error ?? "بارگذاری رسید ناموفق بود." };

  await db.insert(payments).values({
    userId: user.id,
    planId: plan.id,
    amount,
    originalAmount: plan.price,
    discountCode: appliedCode,
    gateway: "manual_card",
    status: "review",
    receiptUrl: upload.url,
    payerName,
    payerCard: str(fd, "payerCard"),
    paidAt: str(fd, "paidAt"),
  });

  touch();
  return {
    message:
      "رسید شما ثبت شد و در صف بررسی قرار گرفت. پس از تأیید مدیر (معمولاً کمتر از چند ساعت) اشتراک فعال می‌شود.",
  };
}

export async function startPaymentAction(
  planId: string,
  gateway: "zarinpal" | "zibal" | "variza" | "aban",
  discountCode = ""
): Promise<Result> {
  await ensureSeedData();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plan = await planById(planId);
  if (!plan || !plan.isActive) return { error: "این پلن در دسترس نیست." };
  if (plan.isTrial) return activateTrialAction();

  // Resolve discount (if any) before touching the gateway.
  let amount = plan.price;
  let appliedCode = "";
  if (discountCode.trim()) {
    const check = await validateDiscount(discountCode, plan.price);
    if (check.error) return { error: check.error };
    amount = check.finalAmount ?? plan.price;
    appliedCode = check.code ?? "";
  }

  // Fully discounted or free plan → activate instantly, no gateway round-trip.
  if (amount <= 0) {
    await activateSubscription(user.id, plan.id);
    if (appliedCode) await consumeDiscount(appliedCode);
    await db.insert(payments).values({
      userId: user.id,
      planId: plan.id,
      amount: 0,
      originalAmount: plan.price,
      discountCode: appliedCode,
      gateway: "zarinpal",
      status: "paid",
      refId: "FREE-100",
    });
    touch();
    return { message: "با کد تخفیف، اشتراک به‌صورت رایگان فعال شد!" };
  }

  const settingsRows = await db
    .select()
    .from(gatewaySettings)
    .where(eq(gatewaySettings.gateway, gateway))
    .limit(1);
  const settings = settingsRows[0];
  if (!settings || !settings.isActive) {
    return { error: "این درگاه پرداخت در حال حاضر غیرفعال است؛ درگاه دیگری را انتخاب کن." };
  }
  if (!settings.merchantId) {
    return { error: "مرچنت‌کد این درگاه هنوز در پنل مدیریت ثبت نشده است." };
  }

  const inserted = await db
    .insert(payments)
    .values({
      userId: user.id,
      planId: plan.id,
      amount,
      originalAmount: plan.price,
      discountCode: appliedCode,
      gateway,
      status: "pending",
    })
    .returning({ id: payments.id });
  const paymentId = inserted[0]?.id;
  if (!paymentId) return { error: "خطا در ثبت پرداخت." };

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  // APP_URL wins when set (recommended on PaaS behind reverse proxies)
  const base = process.env.APP_URL?.replace(/\/+$/, "") ?? `${proto}://${host}`;
  const callbackUrl = `${base}/api/payment/callback?gateway=${gateway}`;
  const amountRials = amount * 10;
  const description = `کاروانسرا — خرید اشتراک ${plan.name}`;

  try {
    if (gateway === "aban") {
      // Aban works in Rial and confirms through a signed webhook.
      const res = await abanCreateInvoice({
        token: settings.merchantId.trim(),
        amountToman: amount,
        orderId: paymentId,
        callbackUrl: `${base}/api/payment/aban`,
        returnUrl: `${base}/dashboard/subscription?result=pending_aban`,
        description,
        expiryMinutes: 60,
      });
      await db.update(payments).set({ authority: res.invoiceId }).where(eq(payments.id, paymentId));
      return { url: res.paymentUrl };
    }
    if (gateway === "variza") {
      // Variza confirms payments through its signed webhook, not a return call.
      const res = await varizaCreatePayment({
        apiKey: settings.merchantId.trim(),
        amountToman: amount,
        returnUrl: `${base}/dashboard/subscription?result=pending_variza`,
        title: description,
        cardLast4: settings.cardNumber ? settings.cardNumber.replace(/\D/g, "").slice(-4) : undefined,
        expiresIn: "1h",
      });
      await db.update(payments).set({ authority: res.reference }).where(eq(payments.id, paymentId));
      return { url: res.payUrl };
    }
    if (gateway === "zarinpal") {
      const res = await zarinpalRequest({
        merchantId: settings.merchantId.trim(),
        sandbox: settings.isSandbox,
        amountRials,
        callbackUrl,
        description,
        email: user.email,
      });
      await db.update(payments).set({ authority: res.authority }).where(eq(payments.id, paymentId));
      return { url: res.payUrl };
    }
    const res = await zibalRequest({
      merchantId: settings.merchantId.trim(),
      amountRials,
      callbackUrl,
      description,
      orderId: paymentId,
    });
    await db.update(payments).set({ authority: res.trackId }).where(eq(payments.id, paymentId));
    return { url: res.payUrl };
  } catch (err) {
    await db.update(payments).set({ status: "failed" }).where(eq(payments.id, paymentId));
    return { error: err instanceof Error ? err.message : "اتصال به درگاه برقرار نشد." };
  }
}
