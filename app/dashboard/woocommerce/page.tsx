import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products, wooConnections } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature } from "@/components/ui";
import { WooManager, type WooConnectionItem } from "@/components/woo-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "اتصال ووکامرس — کاروانسرا" };

export default async function WooPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="اتصال ووکامرس با فعال‌سازی اشتراک باز می‌شود" />;
  }

  const conns = await db
    .select()
    .from(wooConnections)
    .where(eq(wooConnections.userId, user.id))
    .orderBy(desc(wooConnections.createdAt));

  const items: WooConnectionItem[] = [];
  for (const c of conns) {
    const linked = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.wooConnectionId, c.id))
      .limit(500);
    items.push({
      id: c.id,
      name: c.name,
      siteUrl: c.siteUrl,
      autoPush: c.autoPush,
      status: c.status,
      lastSyncAt: c.lastSyncAt ? c.lastSyncAt.toISOString() : "",
      lastSyncMessage: c.lastSyncMessage,
      productCount: linked.length,
    });
  }

  return <WooManager initial={items} />;
}
