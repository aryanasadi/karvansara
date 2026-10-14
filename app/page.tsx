import { asc } from "drizzle-orm";
import { db } from "@/db";
import { plans } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeedData } from "@/lib/seed";
import { Landing, type LandingPlan } from "@/components/landing";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeedData();
  const user = await getCurrentUser();
  const rows = await db.select().from(plans).orderBy(asc(plans.sortOrder));

  const landingPlans: LandingPlan[] = rows
    .filter((p) => p.isActive)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      durationDays: p.durationDays,
      price: p.price,
      isTrial: p.isTrial,
    }));

  return <Landing plans={landingPlans} loggedIn={Boolean(user)} />;
}
