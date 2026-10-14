import "server-only";

export type GatewayName = "zarinpal" | "zibal";

const TIMEOUT = 25_000;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as T | null;
    if (!res.ok || !json) {
      throw new Error(`GATEWAY_HTTP_${res.status}`);
    }
    return json;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("GATEWAY_HTTP")) throw err;
    throw new Error("اتصال به درگاه پرداخت برقرار نشد. لطفاً بعداً تلاش کنید.");
  } finally {
    clearTimeout(timer);
  }
}

/* --------------------------------- ZarinPal -------------------------------- */

function zarinpalBase(sandbox: boolean) {
  return sandbox ? "https://sandbox.zarinpal.com" : "https://www.zarinpal.com";
}

export async function zarinpalRequest(opts: {
  merchantId: string;
  sandbox: boolean;
  amountRials: number;
  callbackUrl: string;
  description: string;
  email?: string;
}): Promise<{ authority: string; payUrl: string }> {
  const base = zarinpalBase(opts.sandbox);
  const res = await postJson<{ data?: { code: number; authority: string }; errors?: { message?: string } }>(
    `${base}/pg/v4/payment/request.json`,
    {
      merchant_id: opts.merchantId,
      amount: opts.amountRials,
      callback_url: opts.callbackUrl,
      description: opts.description,
      metadata: opts.email ? { email: opts.email } : undefined,
    }
  );
  if (!res.data || res.data.code !== 100 || !res.data.authority) {
    throw new Error(res.errors?.message || "زرین‌پال درخواست را نپذیرفت. مرچنت‌کد را بررسی کنید.");
  }
  return {
    authority: res.data.authority,
    payUrl: `${base}/pg/StartPay/${res.data.authority}`,
  };
}

export async function zarinpalVerify(opts: {
  merchantId: string;
  sandbox: boolean;
  amountRials: number;
  authority: string;
}): Promise<{ refId: string }> {
  const base = zarinpalBase(opts.sandbox);
  const res = await postJson<{ data?: { code: number; ref_id: number }; errors?: { message?: string } }>(
    `${base}/pg/v4/payment/verify.json`,
    {
      merchant_id: opts.merchantId,
      amount: opts.amountRials,
      authority: opts.authority,
    }
  );
  if (!res.data || (res.data.code !== 100 && res.data.code !== 101)) {
    throw new Error(res.errors?.message || "تأیید پرداخت زرین‌پال ناموفق بود.");
  }
  return { refId: String(res.data.ref_id) };
}

/* ---------------------------------- Zibal ---------------------------------- */

export async function zibalRequest(opts: {
  merchantId: string;
  amountRials: number;
  callbackUrl: string;
  description: string;
  orderId: string;
}): Promise<{ trackId: string; payUrl: string }> {
  const res = await postJson<{ result: number; trackId?: number; payLink?: string; message?: string }>(
    "https://gateway.zibal.ir/v1/request",
    {
      merchant: opts.merchantId,
      amount: opts.amountRials,
      callbackUrl: opts.callbackUrl,
      description: opts.description,
      orderId: opts.orderId,
    }
  );
  if (res.result !== 100 || !res.trackId) {
    throw new Error(res.message || "زیبال درخواست را نپذیرفت. مرچنت‌کد را بررسی کنید.");
  }
  return {
    trackId: String(res.trackId),
    payUrl: res.payLink || `https://gateway.zibal.ir/start/${res.trackId}`,
  };
}

export async function zibalVerify(opts: {
  merchantId: string;
  trackId: string;
}): Promise<{ refId: string; amountRials: number }> {
  const res = await postJson<{ result: number; refNumber?: number; amount?: number; status?: number; message?: string }>(
    "https://gateway.zibal.ir/v1/verify",
    {
      merchant: opts.merchantId,
      trackId: opts.trackId,
    }
  );
  // result 100 = verified, 201 / 202 = already verified / paid before
  if (res.result !== 100 && res.result !== 201 && res.result !== 202) {
    throw new Error(res.message || "تأیید پرداخت زیبال ناموفق بود.");
  }
  return { refId: res.refNumber ? String(res.refNumber) : "", amountRials: res.amount ?? 0 };
}
