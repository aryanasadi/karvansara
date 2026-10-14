import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { parcels, users } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature } from "@/components/ui";
import { TrackingManager, type ParcelItem } from "@/components/tracking-manager";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "بارکد و ردیابی پستی — کاروانسرا" };

export default async function TrackingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="ردیابی مرسولات با فعال‌سازی اشتراک باز می‌شود" />;
  }

  const rows = await db
    .select()
    .from(parcels)
    .where(eq(parcels.userId, user.id))
    .orderBy(desc(parcels.createdAt))
    .limit(200);

  const profile = await db.select({ businessName: users.businessName, logoUrl: users.logoUrl }).from(users).where(eq(users.id, user.id)).limit(1);
  const base = siteUrl();

  const items: ParcelItem[] = rows.map((p) => ({
    id: p.id,
    code: p.code,
    customerName: p.customerName,
    customerPhone: p.customerPhone,
    carrier: p.carrier,
    note: p.note,
    createdAt: p.createdAt.toISOString(),
    link: `${base}/t/${encodeURIComponent(p.code)}`,
  }));

  return (
    <TrackingManager
      initial={items}
      businessName={profile[0]?.businessName || user.name}
      logoUrl={profile[0]?.logoUrl || ""}
    />
  );
}
