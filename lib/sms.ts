import "server-only";
import { db } from "@/db";
import { smsSettings } from "@/db/schema";

export type SmsProvider = "kavenegar" | "smsir" | "melipayamak" | "ghasedak";

export const SMS_PROVIDERS: Record<SmsProvider, string> = {
  kavenegar: "کاوه‌نگار",
  smsir: "اس‌ام‌اس دات آی‌آر",
  melipayamak: "ملی‌پیامک",
  ghasedak: "قاصدک",
};

export type SmsConfig = {
  provider: SmsProvider;
  apiKey: string;
  sender: string;
  templateName: string;
  isActive: boolean;
  loginEnabled: boolean;
  testMode: boolean;
};

export async function getSmsConfig(): Promise<SmsConfig> {
  const rows = await db.select().from(smsSettings).limit(1);
  const row = rows[0];
  return {
    provider: (row?.provider as SmsProvider) ?? "kavenegar",
    apiKey: row?.apiKey ?? "",
    sender: row?.sender ?? "",
    templateName: row?.templateName ?? "",
    isActive: row?.isActive ?? false,
    loginEnabled: row?.loginEnabled ?? false,
    testMode: row?.testMode ?? true,
  };
}

/** Normalizes Iranian mobile numbers to the 09xxxxxxxxx form. */
export function normalizePhone(input: string): string {
  const digits = input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
  if (digits.startsWith("98") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith("9") && digits.length === 10) return `0${digits}`;
  return digits;
}

export function isValidPhone(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}

async function httpGet(url: string): Promise<{ ok: boolean; body: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    return { ok: res.ok, body: await res.text().catch(() => "") };
  } catch {
    return { ok: false, body: "network-error" };
  } finally {
    clearTimeout(timer);
  }
}

async function httpPostJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    return { ok: res.ok, body: await res.text().catch(() => "") };
  } catch {
    return { ok: false, body: "network-error" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends an SMS through the configured Iranian provider.
 * In test mode nothing is sent — the caller surfaces the code in the UI instead.
 */
export async function sendSms(
  config: SmsConfig,
  phone: string,
  message: string,
  code?: string
): Promise<{ ok: boolean; error?: string }> {
  if (config.testMode) return { ok: true };
  if (!config.apiKey) return { ok: false, error: "کلید API پنل پیامکی تنظیم نشده است." };

  switch (config.provider) {
    case "kavenegar": {
      if (config.templateName && code) {
        const url = `https://api.kavenegar.com/v1/${encodeURIComponent(config.apiKey)}/verify/lookup.json?receptor=${phone}&token=${encodeURIComponent(code)}&template=${encodeURIComponent(config.templateName)}`;
        const res = await httpGet(url);
        return res.ok ? { ok: true } : { ok: false, error: "ارسال پیامک از کاوه‌نگار ناموفق بود." };
      }
      const url = `https://api.kavenegar.com/v1/${encodeURIComponent(config.apiKey)}/sms/send.json?receptor=${phone}&sender=${encodeURIComponent(config.sender)}&message=${encodeURIComponent(message)}`;
      const res = await httpGet(url);
      return res.ok ? { ok: true } : { ok: false, error: "ارسال پیامک از کاوه‌نگار ناموفق بود." };
    }
    case "smsir": {
      const res = await httpPostJson(
        "https://api.sms.ir/v1/send/bulk",
        { lineNumber: config.sender, messageText: message, mobiles: [phone] },
        { "x-api-key": config.apiKey }
      );
      return res.ok ? { ok: true } : { ok: false, error: "ارسال پیامک از sms.ir ناموفق بود." };
    }
    case "melipayamak": {
      const res = await httpPostJson("https://rest.payamak-panel.com/api/SendSMS/SendSMS", {
        username: config.sender,
        password: config.apiKey,
        to: phone,
        from: config.sender,
        text: message,
      });
      return res.ok ? { ok: true } : { ok: false, error: "ارسال پیامک از ملی‌پیامک ناموفق بود." };
    }
    case "ghasedak": {
      const res = await httpPostJson(
        "https://api.ghasedak.me/v2/sms/send/simple",
        { message, receptor: phone, linenumber: config.sender },
        { apikey: config.apiKey }
      );
      return res.ok ? { ok: true } : { ok: false, error: "ارسال پیامک از قاصدک ناموفق بود." };
    }
    default:
      return { ok: false, error: "سرویس پیامکی پشتیبانی نمی‌شود." };
  }
}
