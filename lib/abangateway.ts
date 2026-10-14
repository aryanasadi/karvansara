import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Aban Gateway — card-to-card with automatic confirmation from bank SMS.
 * Docs: https://abangateway.ir/docs · https://github.com/AbanGateway/docs
 *
 * Flow:
 *  1. POST /api/v1/invoices               → invoice_id + payment_url + payable_rial
 *  2. buyer transfers the EXACT payable_rial (unique amount is the matcher)
 *  3. signed `invoice.paid` webhook hits callback_url
 *  4. POST /api/v1/invoices/{id}/verify   → deliver the order (409 = already done)
 *
 * NOTE: every amount in this API is in RIAL, not Toman.
 */

const API_BASE = "https://api.abangateway.ir/api/v1";
const TIMEOUT = 25_000;

export type AbanInvoice = {
  invoiceId: string;
  paymentUrl: string;
  payableRial: number;
  cardNumber: string;
  cardHolder: string;
  bank: string;
  isTest: boolean;
};

type AbanInvoiceResponse = {
  invoice_id?: string;
  status?: string;
  amount_rial?: number;
  payable_rial?: number;
  payable_toman?: number;
  fee_rial?: number;
  order_id?: string;
  card_number?: string;
  card_holder?: string;
  bank?: string;
  iban?: string | null;
  account_number?: string | null;
  payment_url?: string;
  expires_at?: string;
  paid_at?: string | null;
  is_test?: boolean;
  error?: string;
  message?: string;
  detail?: string;
};

async function abanFetch<T>(
  token: string,
  path: string,
  init: { method: string; body?: unknown } = { method: "GET" }
): Promise<{ status: number; json: T | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as T | null;
    return { status: res.status, json };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("پاسخی از آبان گیت وی دریافت نشد (مهلت اتصال تمام شد).");
    }
    throw new Error("اتصال به آبان گیت وی برقرار نشد.");
  } finally {
    clearTimeout(timer);
  }
}

function abanError(status: number, json: AbanInvoiceResponse | null): string {
  const raw = json?.error || json?.message || json?.detail || "";
  if (status === 401) return "توکن آبان گیت وی نامعتبر است.";
  if (status === 403) return raw.includes("sandbox") ? "این عملیات فقط با توکن تست ممکن است." : "دسترسی مجاز نیست.";
  if (status === 429) return "تعداد درخواست‌ها به آبان گیت وی بیش از حد مجاز است؛ کمی بعد تلاش کن.";
  if (status === 402) return "هنوز واریزی برای این فاکتور ثبت نشده است.";
  if (status === 422 || status === 400) {
    return raw || "آبان گیت وی درخواست را نپذیرفت. مبلغ و نشانی callback را بررسی کن.";
  }
  return raw || `خطای آبان گیت وی (${status})`;
}

/** Creates an invoice. `amountToman` is converted to Rial internally. */
export async function abanCreateInvoice(opts: {
  token: string;
  amountToman: number;
  orderId: string;
  callbackUrl: string;
  returnUrl: string;
  description?: string;
  expiryMinutes?: number;
}): Promise<AbanInvoice> {
  if (!/^https:\/\//i.test(opts.callbackUrl)) {
    throw new Error("نشانی وب‌هوک آبان گیت وی باید https باشد. متغیر APP_URL را درست تنظیم کن.");
  }

  const { status, json } = await abanFetch<AbanInvoiceResponse>(opts.token, "/invoices", {
    method: "POST",
    body: {
      amount_rial: Math.round(opts.amountToman) * 10, // Toman → Rial
      order_id: opts.orderId,
      callback_url: opts.callbackUrl,
      return_url: opts.returnUrl,
      description: opts.description?.slice(0, 1000),
      expiry_minutes: Math.min(1440, Math.max(1, opts.expiryMinutes ?? 60)),
    },
  });

  if (status !== 200 && status !== 201) throw new Error(abanError(status, json));
  if (!json?.invoice_id || !json.payment_url) {
    throw new Error("آبان گیت وی فاکتور معتبری برنگرداند.");
  }

  return {
    invoiceId: json.invoice_id,
    paymentUrl: json.payment_url,
    payableRial: json.payable_rial ?? 0,
    cardNumber: json.card_number ?? "",
    cardHolder: json.card_holder ?? "",
    bank: json.bank ?? "",
    isTest: Boolean(json.is_test),
  };
}

export type AbanVerifyResult = { verified: boolean; alreadyVerified: boolean; paidAt?: string };

/**
 * Confirms delivery. Per the docs, `409 already_verified` is a SUCCESS state
 * (the order was already delivered), not an error.
 */
export async function abanVerifyInvoice(token: string, invoiceId: string): Promise<AbanVerifyResult> {
  const { status, json } = await abanFetch<{ verified?: boolean; paid_at?: string; error?: string }>(
    token,
    `/invoices/${invoiceId}/verify`,
    { method: "POST" }
  );

  if (status === 200 || status === 201) {
    return { verified: true, alreadyVerified: false, paidAt: json?.paid_at };
  }
  if (status === 409) {
    return { verified: true, alreadyVerified: true };
  }
  throw new Error(abanError(status, json as AbanInvoiceResponse));
}

/** Reads an invoice — safety net when a webhook is lost. Never poll in a loop. */
export async function abanGetInvoice(token: string, invoiceId: string) {
  const { status, json } = await abanFetch<AbanInvoiceResponse>(token, `/invoices/${invoiceId}`, {
    method: "GET",
  });
  if (status !== 200) throw new Error(abanError(status, json));
  return json;
}

/**
 * Verifies the `X-Signature` header: HMAC-SHA256 of the RAW body bytes,
 * compared in constant time.
 */
export function verifyAbanSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const received = header.trim().replace(/^sha256=/i, "");
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type AbanWebhookBody = {
  event?: string; // invoice.paid | invoice.expired | invoice.cancelled
  invoice_id?: string;
  order_id?: string;
  amount_rial?: number;
  payable_rial?: number;
  fee_rial?: number;
  status?: string;
  is_test?: boolean;
  paid_at?: string;
  metadata?: Record<string, unknown>;
};
