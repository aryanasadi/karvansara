import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature } from "@/components/ui";
import { RemindersManager, type ReminderItem } from "@/components/reminders-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "سررسیدها و یادآوری‌ها — کاروانسرا" };

export default async function RemindersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="یادآوری‌ها با فعال‌سازی اشتراک باز می‌شوند" />;
  }

  const rows = await db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, user.id))
    .orderBy(asc(reminders.dueDate))
    .limit(300);

  const items: ReminderItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    amount: r.amount,
    dueDate: r.dueDate.toISOString(),
    isDone: r.isDone,
    note: r.note,
  }));

  return <RemindersManager initial={items} />;
}
