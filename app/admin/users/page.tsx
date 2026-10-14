import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, plans, subscriptions, users } from "@/db/schema";
import { AdminUsersManager, type AdminUserRow, type PlanOption } from "@/components/admin-users-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "کاربران — پنل مدیریت" };

export default async function AdminUsersPage() {
  const now = new Date();
  const [userList, subRows, paidRows, planRows] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)).limit(300),
    db.select({ sub: subscriptions, plan: plans }).from(subscriptions).innerJoin(plans, eq(subscriptions.planId, plans.id)),
    db
      .select({
        userId: payments.userId,
        total: sql<string>`coalesce(sum(${payments.amount}),0)::text`,
        count: sql<string>`count(*)::text`,
      })
      .from(payments)
      .where(eq(payments.status, "paid"))
      .groupBy(payments.userId),
    db.select().from(plans).orderBy(asc(plans.sortOrder)),
  ]);

  const paidMap = new Map(paidRows.map((r) => [r.userId, { total: Number(r.total), count: Number(r.count) }]));

  const rows: AdminUserRow[] = userList.map((u) => {
    const active = subRows
      .filter((s) => s.sub.userId === u.id && s.sub.status === "active" && s.sub.endsAt > now)
      .sort((a, b) => b.sub.endsAt.getTime() - a.sub.endsAt.getTime())[0];
    const paid = paidMap.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      businessName: u.businessName,
      createdAt: u.createdAt.toISOString(),
      usedTrial: subRows.some((s) => s.sub.userId === u.id && s.plan.isTrial),
      paidTotal: paid?.total ?? 0,
      paidCount: paid?.count ?? 0,
      activePlan: active ? (active.plan.isTrial ? "هدیه ۷ روزه" : active.plan.name) : "",
      activeSource: active?.sub.source ?? "",
      daysLeft: active
        ? Math.max(0, Math.round((new Date(active.sub.endsAt.toDateString()).getTime() - new Date(now.toDateString()).getTime()) / 86400000))
        : 0,
    };
  });

  const planOptions: PlanOption[] = planRows.map((p) => ({
    id: p.id,
    name: p.isTrial ? "هدیه آشنایی" : p.name,
    durationDays: p.durationDays,
  }));

  return <AdminUsersManager initial={rows} plans={planOptions} />;
}
