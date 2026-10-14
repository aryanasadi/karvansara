import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature } from "@/components/ui";
import { PortfolioManager, type AssetItem } from "@/components/portfolio-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "پرتفولیو دارایی — کاروانسرا" };

export default async function PortfolioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="پرتفولیو دارایی با فعال‌سازی اشتراک باز می‌شود" />;
  }

  const rows = await db
    .select()
    .from(assets)
    .where(eq(assets.userId, user.id))
    .orderBy(desc(assets.updatedAt))
    .limit(300);

  const items: AssetItem[] = rows.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    quantity: a.quantity,
    unitPurchasePrice: a.unitPurchasePrice,
    unitCurrentValue: a.unitCurrentValue,
    purchaseDate: a.purchaseDate ? a.purchaseDate.toISOString() : "",
    note: a.note,
  }));

  return <PortfolioManager initial={items} />;
}
