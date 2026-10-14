import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Variza — automatic card-to-card gateway (https://variza.ir/developers)
 *
 * Flow:
 *  1. POST /api/v1/pay  → returns pay_url
 *  2. buyer transfers the exact amount card-to-card
 *  3. Variza detects the bank SMS and POSTs a signed `payment.paid` webhook
 *     to the callback_url registered in the merchant profile.
 */

const API_BASE = "https://variza.ir/api/v1";
const TIMEOUT = 25_000;

export type VarizaPayResponse = {
  pay_url?: string;
  payUrl?: string;
  data?: { pay_url?: string; id?: string | number; code?: string };
  id?: string | number;
  code?: string;
  message?: string;
  errors?: Record<string, string[]>;
};

export type VarizaLink = { payUrl: string; reference: string };

/** Creates a payment link. Amount is in Toman (min 1000). */
export async function varizaCreatePayment(opts: {
  apiKey: string;
  amountToman: number;
  returnUrl: string;
  title?: string;
  cardLast4?: string;
  expiresIn?: "30m" | "1h" | "2h" | "6h" | "1d" | "3d" | "1w" | "never";
}): Promise<VarizaLink> {
  if (opts.amountToman < 1000) {
    throw new Error("حداقل مبلغ قابل پرداخت در واریزا ۱۰۰۰ تومان است.");
  }
  if (!/^https:\/\//i.test(opts.returnUrl)) {
    throw new Error("نشانی بازگشت واریزا باید با https:// شروع شود. متغیر APP_URL را درست تنظیم کن.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${API_BASE}/pay`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(opts.amountToman),
        return_url: opts.returnUrl,
        title: opts.title,
        card_last_4: opts.cardLast4 || undefined,
        expires_in: opts.expiresIn ?? "1h",
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as VarizaPayResponse | null;

    if (res.status === 401) throw new Error("کلید API واریزا نامعتبر است.");
    if (res.status === 429) throw new Error("تعداد درخواست‌ها به واریزا بیش از حد مجاز است؛ کمی بعد تلاش کن.");
    if (res.status === 422) {
      const firstError = json?.errors ? Object.values(json.errors).flat()[0] : undefined;
      throw new Error(
        firstError ||
          json?.message ||
          "واریزا درخواست را نپذیرفت. مطمئن شو نشانی callback در پروفایل واریزا ثبت شده و کارت فعال داری."
      );
    }
    if (!res.ok || !json) throw new Error(json?.message || `خطای واریزا (${res.status})`);

    const payUrl = json.pay_url ?? json.payUrl ?? json.data?.pay_url;
    if (!payUrl) throw new Error("واریزا لینک پرداخت برنگرداند.");

    const reference = String(json.data?.id ?? json.id ?? json.data?.code ?? json.code ?? extractRef(payUrl));
    return { payUrl, reference };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("پاسخی از واریزا دریافت نشد (مهلت اتصال تمام شد).");
    }
    throw err instanceof Error ? err : new Error("اتصال به واریزا برقرار نشد.");
  } finally {
    clearTimeout(timer);
  }
}

function extractRef(payUrl: string): string {
  const parts = payUrl.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/**
 * Verifies the `X-Webhook-Signature` header (format: `sha256=<hex>`)
 * against the RAW request body using the merchant webhook secret.
 */
export function verifyVarizaSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const received = header.trim().replace(/^sha256=/i, "");
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Pulls the useful bits out of a `payment.paid` webhook body. */
export type VarizaWebhookPayload = {
  event?: string;
  amount?: number;
  return_url?: string;
  member_phone?: string | null;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

export function readWebhookRef(body: VarizaWebhookPayload): { reference: string; amount: number } {
  const data = (body.data ?? body) as Record<string, unknown>;
  const reference = String(data.id ?? data.code ?? data.payment_id ?? data.link_id ?? data.track_id ?? "");
  const amountRaw = data.amount ?? body.amount ?? 0;
  const amount = typeof amountRaw === "string" ? Number(amountRaw) : Number(amountRaw ?? 0);
  return { reference, amount: Number.isFinite(amount) ? amount : 0 };
}
