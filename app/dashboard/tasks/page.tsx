import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tasks, visions } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature } from "@/components/ui";
import { TasksManager, type TaskItem, type VisionItem } from "@/components/tasks-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "کارها و چشم‌اندازها — کاروانسرا" };

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="مدیریت کارها با فعال‌سازی اشتراک باز می‌شود" />;
  }

  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, user.id))
    .orderBy(desc(tasks.updatedAt))
    .limit(200);

  const visionRows = await db
    .select()
    .from(visions)
    .where(eq(visions.userId, user.id))
    .orderBy(desc(visions.createdAt))
    .limit(50);

  const taskItems: TaskItem[] = taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    progress: t.progress,
    dueDate: t.dueDate ? t.dueDate.toISOString() : "",
  }));

  const visionItems: VisionItem[] = visionRows.map((v) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    targetDate: v.targetDate ? v.targetDate.toISOString() : "",
    progress: v.progress,
  }));

  return <TasksManager tasks={taskItems} visions={visionItems} />;
}
