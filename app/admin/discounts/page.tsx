import { desc } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes } from "@/db/schema";
import { DiscountsManager, type DiscountItem } from "@/components/discounts-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "کدهای تخفیف — پنل مدیریت" };

export default async function AdminDiscountsPage() {
  const rows = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt)).limit(200);
  const items: DiscountItem[] = rows.map((d) => ({
    id: d.id,
    code: d.code,
    percent: d.percent,
    amountOff: d.amountOff,
    maxUses: d.maxUses,
    usedCount: d.usedCount,
    expiresAt: d.expiresAt ? d.expiresAt.toISOString() : "",
    isActive: d.isActive,
    note: d.note,
  }));
  return <DiscountsManager initial={items} />;
}
