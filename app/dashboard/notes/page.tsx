import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature } from "@/components/ui";
import { NotesManager, type NoteItem } from "@/components/notes-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "یادداشت‌های مدیر — کاروانسرا" };

export default async function NotesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="دفترچه مدیر با فعال‌سازی اشتراک باز می‌شود" />;
  }

  const rows = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, user.id))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
    .limit(300);

  const items: NoteItem[] = rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    content: n.content,
    color: n.color,
    isPinned: n.isPinned,
    updatedAt: n.updatedAt.toISOString(),
  }));

  return <NotesManager initial={items} />;
}
