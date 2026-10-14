"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ticketMessages, tickets } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export type TicketResult = { error?: string; message?: string; id?: string };

function touch() {
  revalidatePath("/dashboard/tickets");
  revalidatePath("/admin/tickets");
}

export async function createTicketAction(fd: FormData): Promise<TicketResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const subject = String(fd.get("subject") ?? "").trim();
  const body = String(fd.get("body") ?? "").trim();
  if (subject.length < 3) return { error: "موضوع تیکت را کامل بنویس." };
  if (body.length < 5) return { error: "متن پیام را بنویس." };

  const department = ["support", "billing", "technical"].includes(String(fd.get("department")))
    ? String(fd.get("department"))
    : "support";
  const priority = ["low", "medium", "high"].includes(String(fd.get("priority")))
    ? String(fd.get("priority"))
    : "medium";

  const inserted = await db
    .insert(tickets)
    .values({ userId: user.id, subject, department, priority, status: "open", lastReplyAt: new Date() })
    .returning({ id: tickets.id });
  const ticketId = inserted[0]?.id;
  if (!ticketId) return { error: "ثبت تیکت ناموفق بود." };

  await db.insert(ticketMessages).values({ ticketId, userId: user.id, isAdmin: false, body });
  touch();
  return { id: ticketId, message: "تیکت ثبت شد؛ به‌زودی پاسخ می‌دهیم." };
}

export async function replyTicketAction(ticketId: string, body: string): Promise<TicketResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const text = body.trim();
  if (text.length < 2) return { error: "متن پاسخ خالی است." };

  const isAdmin = user.role === "admin";
  const rows = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  const ticket = rows[0];
  if (!ticket) return { error: "تیکت یافت نشد." };
  if (!isAdmin && ticket.userId !== user.id) return { error: "دسترسی مجاز نیست." };
  if (ticket.status === "closed") return { error: "این تیکت بسته شده است." };

  await db.insert(ticketMessages).values({ ticketId, userId: user.id, isAdmin, body: text });
  await db
    .update(tickets)
    .set({ status: isAdmin ? "answered" : "user_reply", lastReplyAt: new Date() })
    .where(eq(tickets.id, ticketId));
  touch();
  return {};
}

export async function closeTicketAction(ticketId: string): Promise<TicketResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const rows = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  const ticket = rows[0];
  if (!ticket) return { error: "تیکت یافت نشد." };
  if (user.role !== "admin" && ticket.userId !== user.id) return { error: "دسترسی مجاز نیست." };
  await db.update(tickets).set({ status: "closed" }).where(eq(tickets.id, ticketId));
  touch();
  return { message: "تیکت بسته شد." };
}

export type TicketThread = {
  id: string;
  subject: string;
  status: string;
  department: string;
  priority: string;
  messages: { id: string; isAdmin: boolean; body: string; createdAt: string }[];
};

export async function getTicketThreadAction(ticketId: string): Promise<TicketThread | null> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const rows = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  const ticket = rows[0];
  if (!ticket) return null;
  if (user.role !== "admin" && ticket.userId !== user.id) return null;

  const msgs = await db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, ticketId))
    .orderBy(asc(ticketMessages.createdAt));

  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    department: ticket.department,
    priority: ticket.priority,
    messages: msgs.map((m) => ({
      id: m.id,
      isAdmin: m.isAdmin,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/** Used by the dashboard badge to show unread admin answers. */
export async function countAnsweredTicketsAction(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  const rows = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(and(eq(tickets.userId, user.id), eq(tickets.status, "answered")));
  return rows.length;
}
