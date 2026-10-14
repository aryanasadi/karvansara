import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products, receipts } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature } from "@/components/ui";
import { getReceiptConfig } from "@/app/dashboard/receipt/actions";
import { ReceiptPos, type PosProduct, type RecentReceipt } from "@/components/receipt-pos";

export const dynamic = "force-dynamic";
export const metadata = { title: "صدور فیش فروش — کاروانسرا" };

export default async function ReceiptPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="صدور فیش با فعال‌سازی اشتراک باز می‌شود" />;
  }

  const [productRows, recentRows, config] = await Promise.all([
    db.select().from(products).where(eq(products.userId, user.id)).orderBy(desc(products.updatedAt)).limit(200),
    db.select().from(receipts).where(eq(receipts.userId, user.id)).orderBy(desc(receipts.createdAt)).limit(12),
    getReceiptConfig(user.id),
  ]);

  const items: PosProduct[] = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    category: p.category,
    imageUrl: p.imageUrl,
  }));

  const recent: RecentReceipt[] = recentRows.map((r) => ({
    id: r.id,
    number: r.number,
    total: r.total,
    orderType: r.orderType,
    createdAt: r.createdAt.toISOString(),
  }));

  return <ReceiptPos products={items} recent={recent} config={config} />;
}
