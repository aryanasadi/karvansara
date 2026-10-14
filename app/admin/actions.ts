"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes, gatewaySettings, payments, plans, smsSettings, subscriptions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { activateSubscription } from "@/lib/billing";
import { consumeDiscount } from "@/lib/discounts";

export type AdminResult = { error?: string; message?: string };

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

function touch() {
  revalidatePath("/admin", "layout");
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

const VALID_GATEWAYS = ["zarinpal", "zibal", "variza", "aban", "manual_card"] as const;

export async function updateGatewayAction(fd: FormData): Promise<AdminResult> {
  await requireAdmin();
  const gateway = String(fd.get("gateway") ?? "");
  if (!VALID_GATEWAYS.includes(gateway as (typeof VALID_GATEWAYS)[number])) {
    return { error: "درگاه نامعتبر است." };
  }

  const values = {
    merchantId: String(fd.get("merchantId") ?? "").trim(),
    webhookSecret: String(fd.get("webhookSecret") ?? "").trim(),
    cardNumber: String(fd.get("cardNumber") ?? "").replace(/[\s-]/g, "").trim(),
    cardHolder: String(fd.get("cardHolder") ?? "").trim(),
    bankName: String(fd.get("bankName") ?? "").trim(),
    isActive: fd.get("isActive") === "1",
    isSandbox: fd.get("isSandbox") === "1",
    updatedAt: new Date(),
  };

  if (gateway === "manual_card" && values.isActive && !values.cardNumber) {
    return { error: "برای فعال‌سازی کارت‌به‌کارت، شماره کارت را وارد کن." };
  }

  const existing = await db
    .select({ id: gatewaySettings.id })
    .from(gatewaySettings)
    .where(eq(gatewaySettings.gateway, gateway))
    .limit(1);

  if (existing[0]) {
    await db.update(gatewaySettings).set(values).where(eq(gatewaySettings.id, existing[0].id));
  } else {
    await db.insert(gatewaySettings).values({ gateway, ...values });
  }
  touch();
  return { message: "تنظیمات درگاه ذخیره شد." };
}

/* ----------------------- Manual card receipt review ------------------------ */

export async function approvePaymentAction(paymentId: string): Promise<AdminResult> {
  await requireAdmin();
  const rows = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  const payment = rows[0];
  if (!payment) return { error: "پرداخت یافت نشد." };
  if (payment.status === "paid") return { error: "این پرداخت قبلاً تأیید شده است." };

  await db
    .update(payments)
    .set({ status: "paid", refId: `MANUAL-${Date.now().toString(36).toUpperCase()}`, updatedAt: new Date() })
    .where(eq(payments.id, paymentId));
  await activateSubscription(payment.userId, payment.planId);
  if (payment.discountCode) await consumeDiscount(payment.discountCode);

  touch();
  return { message: "پرداخت تأیید و اشتراک کاربر فعال شد." };
}

export async function rejectPaymentAction(paymentId: string, note: string): Promise<AdminResult> {
  await requireAdmin();
  const rows = await db.select({ id: payments.id }).from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!rows[0]) return { error: "پرداخت یافت نشد." };
  await db
    .update(payments)
    .set({ status: "failed", reviewNote: note.trim(), updatedAt: new Date() })
    .where(eq(payments.id, paymentId));
  touch();
  return { message: "رسید رد شد." };
}

/* --------------------------- Manual subscriptions --------------------------- */

export async function grantSubscriptionAction(fd: FormData): Promise<AdminResult> {
  await requireAdmin();
  const userId = String(fd.get("userId") ?? "");
  const planId = String(fd.get("planId") ?? "");
  if (!userId || !planId) return { error: "کاربر و پلن را انتخاب کن." };

  const customDays = num(fd, "days", 0);
  const planRows = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
  const plan = planRows[0];
  if (!plan) return { error: "پلن یافت نشد." };

  const now = new Date();
  const futureRows = await db
    .select({ endsAt: subscriptions.endsAt })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"), gt(subscriptions.endsAt, now)))
    .orderBy(desc(subscriptions.endsAt))
    .limit(1);
  const base = futureRows[0]?.endsAt && futureRows[0].endsAt > now ? futureRows[0].endsAt : now;

  await db
    .update(subscriptions)
    .set({ status: "replaced" })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"), gt(subscriptions.endsAt, now)));

  const days = customDays > 0 ? customDays : plan.durationDays;
  const endsAt = new Date(base.getTime() + days * 86_400_000);
  await db.insert(subscriptions).values({
    userId,
    planId,
    startsAt: now,
    endsAt,
    status: "active",
    source: "admin",
  });

  touch();
  return { message: `اشتراک ${plan.name} به مدت ${days} روز برای کاربر فعال شد.` };
}

export async function revokeSubscriptionAction(userId: string): Promise<AdminResult> {
  await requireAdmin();
  await db
    .update(subscriptions)
    .set({ status: "canceled" })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));
  touch();
  return { message: "اشتراک کاربر لغو شد." };
}

export async function setUserRoleAction(userId: string, role: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (!["user", "admin"].includes(role)) return { error: "نقش نامعتبر است." };
  if (admin.id === userId) return { error: "نمی‌توانی نقش حساب خودت را تغییر دهی." };
  await db.update(users).set({ role }).where(eq(users.id, userId));
  touch();
  return { message: "نقش کاربر به‌روزرسانی شد." };
}

/* ------------------------------ Discount codes ------------------------------ */

export async function saveDiscountAction(fd: FormData): Promise<AdminResult> {
  await requireAdmin();
  const code = String(fd.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (code.length < 3) return { error: "کد تخفیف حداقل ۳ نویسه باشد." };

  const percent = Math.min(100, Math.max(0, num(fd, "percent")));
  const amountOff = Math.max(0, num(fd, "amountOff"));
  if (percent === 0 && amountOff === 0) return { error: "درصد یا مبلغ تخفیف را مشخص کن." };

  const expiresRaw = String(fd.get("expiresAt") ?? "").trim();
  const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
  const id = String(fd.get("id") ?? "").trim();

  const values = {
    code,
    percent,
    amountOff,
    maxUses: Math.max(0, num(fd, "maxUses")),
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
    isActive: fd.get("isActive") === "1",
    note: String(fd.get("note") ?? "").trim(),
  };

  if (id) {
    await db.update(discountCodes).set(values).where(eq(discountCodes.id, id));
  } else {
    const existing = await db.select({ id: discountCodes.id }).from(discountCodes).where(eq(discountCodes.code, code)).limit(1);
    if (existing.length > 0) return { error: "این کد قبلاً ثبت شده است." };
    await db.insert(discountCodes).values(values);
  }
  touch();
  return { message: "کد تخفیف ذخیره شد." };
}

export async function deleteDiscountAction(id: string): Promise<AdminResult> {
  await requireAdmin();
  await db.delete(discountCodes).where(eq(discountCodes.id, id));
  touch();
  return { message: "کد تخفیف حذف شد." };
}

/* ------------------------------- SMS settings ------------------------------- */

export async function updateSmsAction(fd: FormData): Promise<AdminResult> {
  await requireAdmin();
  const provider = String(fd.get("provider") ?? "kavenegar");
  if (!["kavenegar", "smsir", "melipayamak", "ghasedak"].includes(provider)) {
    return { error: "سرویس‌دهنده نامعتبر است." };
  }
  const values = {
    provider,
    apiKey: String(fd.get("apiKey") ?? "").trim(),
    sender: String(fd.get("sender") ?? "").trim(),
    templateName: String(fd.get("templateName") ?? "").trim(),
    isActive: fd.get("isActive") === "1",
    loginEnabled: fd.get("loginEnabled") === "1",
    testMode: fd.get("testMode") === "1",
    updatedAt: new Date(),
  };

  const existing = await db.select({ id: smsSettings.id }).from(smsSettings).limit(1);
  if (existing[0]) {
    await db.update(smsSettings).set(values).where(eq(smsSettings.id, existing[0].id));
  } else {
    await db.insert(smsSettings).values(values);
  }
  touch();
  return { message: "تنظیمات پنل پیامکی ذخیره شد." };
}

export async function updatePlanAction(fd: FormData): Promise<AdminResult> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (!id || !name) return { error: "اطلاعات پلن کامل نیست." };
  const durationDays = Math.max(1, num(fd, "durationDays", 30));
  const price = Math.max(0, num(fd, "price"));
  await db
    .update(plans)
    .set({
      name,
      description: String(fd.get("description") ?? "").trim(),
      durationDays,
      price,
      isActive: fd.get("isActive") === "1",
    })
    .where(eq(plans.id, id));
  touch();
  return { message: "پلن به‌روزرسانی شد." };
}
