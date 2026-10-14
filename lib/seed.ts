import "server-only";
import path from "path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/db";
import { plans, gatewaySettings, smsSettings } from "@/db/schema";

let seeded = false;

/**
 * Zero-config provisioning: on a fresh PaaS database the tables simply do not
 * exist yet. Detect that and apply the bundled SQL migrations, so the app is
 * usable right after the first request with no manual `drizzle-kit push`.
 */
async function selfProvision() {
  const check = await db.execute(sql`select to_regclass('public.plans') as t`);
  if (check.rows[0]?.t) return; // tables already exist — nothing to do
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}

/**
 * Idempotent seed: subscription plans + payment gateway defaults.
 * Safe to call from any server action / page.
 */
export async function ensureSeedData() {
  if (seeded) return;
  try {
    await selfProvision();

    const existingPlans = await db.select({ id: plans.id }).from(plans).limit(1);
    if (existingPlans.length === 0) {
      await db.insert(plans).values([
        {
          name: "هدیه آشنایی",
          description: "۷ روز دسترسی کامل و رایگان به تمام امکانات کاروانسرا",
          durationDays: 7,
          price: 0,
          isTrial: true,
          isActive: true,
          sortOrder: 1,
        },
        {
          name: "ماهانه",
          description: "مناسب کسب‌وکارهای تازه‌کار؛ تمدید هر ماه",
          durationDays: 30,
          price: 100_000,
          isTrial: false,
          isActive: true,
          sortOrder: 2,
        },
        {
          name: "سه‌ماهه",
          description: "۱۷٪ صرفه‌جویی نسبت به پلن ماهانه",
          durationDays: 90,
          price: 250_000,
          isTrial: false,
          isActive: true,
          sortOrder: 3,
        },
        {
          name: "سالانه",
          description: "۲۱٪ صرفه‌جویی؛ خیال راحت برای یک سال کامل",
          durationDays: 365,
          price: 950_000,
          isTrial: false,
          isActive: true,
          sortOrder: 4,
        },
      ]);
    }

    const existingGateways = await db.select({ id: gatewaySettings.id }).from(gatewaySettings).limit(1);
    if (existingGateways.length === 0) {
      await db.insert(gatewaySettings).values([
        {
          gateway: "zarinpal",
          merchantId: "",
          isActive: false,
          isSandbox: true,
        },
        {
          gateway: "zibal",
          // "zibal" is the official test merchant of Zibal
          merchantId: "zibal",
          isActive: true,
          isSandbox: true,
        },
      ]);
    }

    const existingSms = await db.select({ id: smsSettings.id }).from(smsSettings).limit(1);
    if (existingSms.length === 0) {
      await db.insert(smsSettings).values({
        provider: "kavenegar",
        apiKey: "",
        sender: "",
        templateName: "",
        isActive: false,
        loginEnabled: false,
        testMode: true,
      });
    }
    seeded = true;
  } catch (err) {
    // Seed failures must never crash the request lifecycle (e.g. DB not ready yet).
    console.warn("[seed] ensureSeedData skipped:", err instanceof Error ? err.message : err);
  }
}
