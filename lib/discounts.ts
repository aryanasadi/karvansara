import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes } from "@/db/schema";

export type DiscountResult = {
  error?: string;
  code?: string;
  finalAmount?: number;
  discountAmount?: number;
  label?: string;
};

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Validates a discount code against an amount (in Toman) without consuming it. */
export async function validateDiscount(rawCode: string, amount: number): Promise<DiscountResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { error: "کد تخفیف را وارد کن." };

  const rows = await db.select().from(discountCodes).where(eq(discountCodes.code, code)).limit(1);
  const row = rows[0];
  if (!row) return { error: "کد تخفیف معتبر نیست." };
  if (!row.isActive) return { error: "این کد تخفیف غیرفعال شده است." };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { error: "مهلت استفاده از این کد به پایان رسیده است." };
  if (row.maxUses > 0 && row.usedCount >= row.maxUses) return { error: "ظرفیت استفاده از این کد تکمیل شده است." };

  const byPercent = row.percent > 0 ? Math.floor((amount * row.percent) / 100) : 0;
  const discountAmount = Math.min(amount, byPercent + row.amountOff);
  const finalAmount = Math.max(0, amount - discountAmount);

  return {
    code,
    discountAmount,
    finalAmount,
    label: row.percent > 0 ? `${row.percent}٪ تخفیف` : "تخفیف نقدی",
  };
}

/** Increments the usage counter after a successful payment. */
export async function consumeDiscount(code: string) {
  const normalized = normalizeCode(code);
  if (!normalized) return;
  await db
    .update(discountCodes)
    .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
    .where(eq(discountCodes.code, normalized));
}
