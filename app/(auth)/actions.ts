"use server";

import { redirect } from "next/navigation";
import { randomInt } from "crypto";
import { db } from "@/db";
import { otpCodes, users } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { ensureSeedData } from "@/lib/seed";
import { getSmsConfig, isValidPhone, normalizePhone, sendSms } from "@/lib/sms";
import { verifyToken } from "@/lib/captcha";

export type AuthState = { error?: string };

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** The captcha answer travels inside the token itself; both halves are checked. */
function isHuman(token: string): boolean {
  return verifyToken(token);
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const captcha = String(formData.get("captcha") ?? "");

  if (!isHuman(captcha)) return { error: "تأیید انسانی انجام نشد؛ روی «من ربات نیستم» بزن و رنگ خواسته‌شده را انتخاب کن." };
  if (!name || name.length < 2) return { error: "نام و نام خانوادگی را کامل وارد کنید." };
  if (!validEmail(email)) return { error: "نشانی ایمیل معتبر نیست." };
  if (password.length < 6) return { error: "گذرواژه باید حداقل ۶ نویسه باشد." };

  await ensureSeedData();

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return { error: "با این ایمیل قبلاً حساب ساخته شده است. وارد شوید." };

  const countRows = await db.select({ count: sql<number>`count(*)` }).from(users);
  const isFirst = Number(countRows[0]?.count ?? 0) === 0;

  const inserted = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: hashPassword(password),
      role: isFirst ? "admin" : "user",
    })
    .returning({ id: users.id });

  const userId = inserted[0]?.id;
  if (!userId) return { error: "خطایی در ساخت حساب رخ داد. دوباره تلاش کنید." };

  await createSession(userId);
  redirect(isFirst ? "/admin" : "/dashboard");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const captcha = String(formData.get("captcha") ?? "");

  if (!isHuman(captcha)) return { error: "تأیید انسانی انجام نشد؛ روی «من ربات نیستم» بزن و همزنمش رنگ را انتخاب کن." };
  if (!validEmail(email)) return { error: "نشانی ایمیل معتبر نیست." };
  if (!password) return { error: "گذرواژه را وارد کنید." };

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "ایمیل یا گذرواژه نادرست است." };
  }

  await createSession(user.id);
  if (next.startsWith("/")) redirect(next);
  redirect(user.role === "admin" ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/* ------------------------------ SMS / OTP login ----------------------------- */

export type OtpState = { error?: string; message?: string; sent?: boolean; devCode?: string };

/** Sends a one-time code to the given mobile number (if SMS login is enabled). */
export async function requestOtpAction(_prev: OtpState, formData: FormData): Promise<OtpState> {
  await ensureSeedData();
  const config = await getSmsConfig();
  if (!config.isActive || !config.loginEnabled) {
    return { error: "ورود با پیامک در حال حاضر غیرفعال است." };
  }

  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!isValidPhone(phone)) return { error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود." };

  // Throttle: max one code per 60 seconds per number.
  const recent = await db
    .select({ createdAt: otpCodes.createdAt })
    .from(otpCodes)
    .where(eq(otpCodes.phone, phone))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < 60_000) {
    return { error: "کد قبلی هنوز معتبر است؛ یک دقیقه دیگر دوباره تلاش کن." };
  }

  const code = String(randomInt(10000, 99999));
  await db.insert(otpCodes).values({
    phone,
    code,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  const res = await sendSms(config, phone, `کد ورود شما به کاروانسرا: ${code}`, code);
  if (!res.ok) return { error: res.error ?? "ارسال پیامک ناموفق بود." };

  return {
    sent: true,
    message: config.testMode
      ? "حالت آزمایشی فعال است؛ کد روی صفحه نمایش داده می‌شود."
      : "کد ورود پیامک شد.",
    devCode: config.testMode ? code : undefined,
  };
}

/** Verifies the code and signs the user in (auto-registers new numbers). */
export async function verifyOtpAction(_prev: OtpState, formData: FormData): Promise<OtpState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!isValidPhone(phone)) return { error: "شماره موبایل معتبر نیست.", sent: true };
  if (code.length < 4) return { error: "کد ۵ رقمی را وارد کن.", sent: true };

  const rows = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), eq(otpCodes.consumed, false)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  const otp = rows[0];
  if (!otp) return { error: "کدی برای این شماره یافت نشد؛ دوباره درخواست بده.", sent: true };
  if (otp.expiresAt.getTime() < Date.now()) return { error: "مهلت کد تمام شده؛ کد تازه بگیر.", sent: true };
  if (otp.attempts >= 5) return { error: "تعداد تلاش‌های ناموفق زیاد است؛ کد تازه بگیر.", sent: true };

  if (otp.code !== code) {
    await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
    return { error: "کد واردشده نادرست است.", sent: true };
  }

  await db.update(otpCodes).set({ consumed: true }).where(eq(otpCodes.id, otp.id));

  const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  let userId = existing[0]?.id;
  let role = existing[0]?.role ?? "user";

  if (!userId) {
    const countRows = await db.select({ count: sql<number>`count(*)` }).from(users);
    const isFirst = Number(countRows[0]?.count ?? 0) === 0;
    const created = await db
      .insert(users)
      .values({
        name: `کاربر ${phone.slice(-4)}`,
        email: `${phone}@sms.karvansara.local`,
        phone,
        passwordHash: hashPassword(randomInt(100000, 999999).toString() + phone),
        role: isFirst ? "admin" : "user",
      })
      .returning({ id: users.id, role: users.role });
    userId = created[0]?.id;
    role = created[0]?.role ?? "user";
  }
  if (!userId) return { error: "ساخت حساب ناموفق بود.", sent: true };

  await createSession(userId);
  redirect(role === "admin" ? "/admin" : "/dashboard");
}

/** Tells the login page whether to show the SMS tab. */
export async function isSmsLoginEnabledAction(): Promise<boolean> {
  const config = await getSmsConfig();
  return config.isActive && config.loginEnabled;
}
