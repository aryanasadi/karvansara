import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature } from "@/components/ui";
import { ProductsManager, type ProductItem } from "@/components/products-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "انبار محصولات — کاروانسرا" };

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="انبارداری با فعال‌سازی اشتراک باز می‌شود" />;
  }

  const rows = await db
    .select()
    .from(products)
    .where(eq(products.userId, user.id))
    .orderBy(desc(products.updatedAt))
    .limit(300);

  const items: ProductItem[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    buyPrice: p.buyPrice,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    category: p.category,
    imageUrl: p.imageUrl,
    source: p.source,
  }));

  return <ProductsManager initial={items} />;
}
