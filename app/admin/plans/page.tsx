import { asc } from "drizzle-orm";
import { db } from "@/db";
import { plans } from "@/db/schema";
import { ensureSeedData } from "@/lib/seed";
import { PlansManager, type AdminPlanItem } from "@/components/plans-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "پلن‌های اشتراک — پنل مدیریت" };

export default async function AdminPlansPage() {
  await ensureSeedData();
  const rows = await db.select().from(plans).orderBy(asc(plans.sortOrder));
  const items: AdminPlanItem[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    durationDays: p.durationDays,
    price: p.price,
    isTrial: p.isTrial,
    isActive: p.isActive,
  }));
  return <PlansManager initial={items} />;
}
