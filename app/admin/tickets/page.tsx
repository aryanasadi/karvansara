import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tickets, users } from "@/db/schema";
import { TicketsManager, type TicketRow } from "@/components/tickets-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "تیکت‌ها — پنل مدیریت" };

export default async function AdminTicketsPage() {
  const rows = await db
    .select({ t: tickets, u: users })
    .from(tickets)
    .innerJoin(users, eq(tickets.userId, users.id))
    .orderBy(desc(tickets.lastReplyAt))
    .limit(200);

  const items: TicketRow[] = rows.map(({ t, u }) => ({
    id: t.id,
    subject: t.subject,
    department: t.department,
    priority: t.priority,
    status: t.status,
    lastReplyAt: t.lastReplyAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    userName: u.name,
    userEmail: u.email,
  }));

  return <TicketsManager initial={items} isAdmin />;
}
