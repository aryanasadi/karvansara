import "server-only";
import { db } from "@/db";
import { subscriptions, plans, payments } from "@/db/schema";
import { and, desc, eq, gt } from "drizzle-orm";
import { getActiveSubscription } from "@/lib/auth";

/**
 * Activates a subscription. Any remaining time on the current active
 * subscription is preserved (the new period stacks on top of it).
 */
export async function activateSubscription(userId: string, planId: string) {
  const now = new Date();
  const planRows = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
  const plan = planRows[0];
  if (!plan) throw new Error("پلن یافت نشد.");

  // Compute remaining time of current active subscription BEFORE replacing it,
  // so the new period stacks on top of whatever is left.
  const futureRows = await db
    .select({ endsAt: subscriptions.endsAt })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"), gt(subscriptions.endsAt, now)))
    .orderBy(desc(subscriptions.endsAt))
    .limit(1);
  const base = futureRows[0]?.endsAt && futureRows[0].endsAt.getTime() > now.getTime() ? futureRows[0].endsAt : now;

  await db
    .update(subscriptions)
    .set({ status: "replaced" })
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        gt(subscriptions.endsAt, now)
      )
    );

  const endsAt = new Date(base.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  await db.insert(subscriptions).values({ userId, planId, startsAt: now, endsAt, status: "active" });
  return { endsAt };
}

export async function planById(planId: string) {
  const rows = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
  return rows[0] ?? null;
}

export async function markPayment(
  id: string,
  patch: Partial<{ status: string; refId: string; authority: string }>
) {
  await db
    .update(payments)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(payments.id, id));
}

export async function subscriptionSummary(userId: string) {
  const active = await getActiveSubscription(userId);
  return active;
}
