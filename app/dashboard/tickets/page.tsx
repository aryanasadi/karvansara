import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { TicketsManager, type TicketRow } from "@/components/tickets-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "پشتیبانی و تیکت‌ها — کاروانسرا" };

export default async function TicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db
    .select()
    .from(tickets)
    .where(eq(tickets.userId, user.id))
    .orderBy(desc(tickets.lastReplyAt))
    .limit(100);

  const items: TicketRow[] = rows.map((t) => ({
    id: t.id,
    subject: t.subject,
    department: t.department,
    priority: t.priority,
    status: t.status,
    lastReplyAt: t.lastReplyAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
  }));

  return <TicketsManager initial={items} isAdmin={false} />;
}
