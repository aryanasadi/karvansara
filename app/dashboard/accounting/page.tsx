import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature } from "@/components/ui";
import { AccountingManager, type TxItem } from "@/components/accounting-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "حسابداری — کاروانسرا" };

export default async function AccountingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="دفتر حسابداری با فعال‌سازی اشتراک باز می‌شود" />;
  }

  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, user.id))
    .orderBy(desc(transactions.date))
    .limit(400);

  const items: TxItem[] = rows.map((t) => ({
    id: t.id,
    type: t.type as "income" | "expense",
    category: t.category,
    amount: t.amount,
    description: t.description,
    date: t.date.toISOString(),
  }));

  return <AccountingManager initial={items} />;
}
