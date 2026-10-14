import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getActiveSubscription, getCurrentUser } from "@/lib/auth";
import { ProfileManager } from "@/components/profile-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "پروفایل و کسب‌وکار — کاروانسرا" };

export default async function ProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const rows = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
  const me = rows[0];
  if (!me) redirect("/login");

  const sub = await getActiveSubscription(current.id);

  return (
    <ProfileManager
      profile={{
        name: me.name,
        email: me.email,
        phone: me.phone,
        businessName: me.businessName,
        logoUrl: me.logoUrl,
        address: me.address,
        role: me.role,
        createdAt: me.createdAt.toISOString(),
      }}
      sub={sub ? { planName: sub.planName, isTrial: sub.isTrial, daysLeft: sub.daysLeft, endsAt: sub.endsAt.toISOString() } : null}
    />
  );
}
