import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bioLinks, bioPages, users } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature } from "@/components/ui";
import { BioManager, type BioData, type BioLinkItem } from "@/components/bio-manager";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "کاروانسرای تو (بایولینک) — کاروانسرا" };

export default async function BioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="کاروانسرای تو با فعال‌سازی اشتراک باز می‌شود" />;
  }

  const profile = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const me = profile[0]!;

  const bioRow = await db.select().from(bioPages).where(eq(bioPages.userId, user.id)).limit(1);
  const links = bioRow[0]
    ? await db.select().from(bioLinks).where(eq(bioLinks.bioId, bioRow[0].id)).orderBy(asc(bioLinks.sortOrder))
    : [];

  const bio: BioData = {
    slug: bioRow[0]?.slug ?? "",
    title: bioRow[0]?.title ?? (me.businessName || me.name),
    bio: bioRow[0]?.bio ?? "",
    theme: bioRow[0]?.theme ?? "dark",
    showLogo: bioRow[0]?.showLogo ?? true,
    logoUrl: me.logoUrl,
    phone: me.phone,
    email: me.email,
    address: me.address,
  };

  const linkItems: BioLinkItem[] = links.map((l) => ({
    id: l.id,
    label: l.label,
    url: l.url,
    icon: l.icon,
    sortOrder: l.sortOrder,
    clicks: l.clicks,
  }));

  return <BioManager bio={bio} links={linkItems} base={siteUrl()} />;
}
