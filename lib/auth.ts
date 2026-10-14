import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { users, sessions, subscriptions, plans } from "@/db/schema";
import { and, desc, eq, gt } from "drizzle-orm";

export const SESSION_COOKIE = "karvansara_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, token, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // PaaS deployments sit behind HTTPS; require a secure cookie in production.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
    store.delete(SESSION_COOKIE);
  }
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    role: row.user.role,
  };
});

export type ActiveSubscription = {
  id: string;
  planId: string;
  planName: string;
  isTrial: boolean;
  status: string;
  startsAt: Date;
  endsAt: Date;
  daysLeft: number;
  totalDays: number;
};

/** Whole calendar days remaining (0 when the period ends today). */
export function daysLeftCalendar(end: Date): number {
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((endDay.getTime() - today.getTime()) / 86_400_000));
}

export const getActiveSubscription = cache(
  async (userId: string): Promise<ActiveSubscription | null> => {
    const now = new Date();
    const rows = await db
      .select({ sub: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"), gt(subscriptions.endsAt, now)))
      .orderBy(desc(subscriptions.endsAt))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.sub.id,
      planId: row.sub.planId,
      planName: row.plan.name,
      isTrial: row.plan.isTrial,
      status: row.sub.status,
      startsAt: row.sub.startsAt,
      endsAt: row.sub.endsAt,
      // Calendar-day based so the counter visibly drops every midnight.
      daysLeft: daysLeftCalendar(row.sub.endsAt),
      totalDays: Math.max(
        1,
        Math.round((row.sub.endsAt.getTime() - row.sub.startsAt.getTime()) / 86_400_000)
      ),
    };
  }
);

export async function hasUsedTrial(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(and(eq(subscriptions.userId, userId), eq(plans.isTrial, true)))
    .limit(1);
  return rows.length > 0;
}
