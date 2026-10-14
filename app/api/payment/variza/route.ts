import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gatewaySettings, payments } from "@/db/schema";
import { activateSubscription, markPayment } from "@/lib/billing";
import { consumeDiscount } from "@/lib/discounts";
import { readWebhookRef, verifyVarizaSignature, type VarizaWebhookPayload } from "@/lib/variza";

export const dynamic = "force-dynamic";

/**
 * Variza webhook endpoint — register this URL in your Variza profile:
 *   {APP_URL}/api/payment/variza
 *
 * Variza POSTs `payment.paid` with an HMAC-SHA256 signature of the raw body.
 * Must answer HTTP 200, otherwise Variza retries up to 5 times.
 */
export async function POST(req: Request) {
  // Raw body is required — the signature is computed over the exact bytes.
  const raw = await req.text();

  const settingsRows = await db
    .select()
    .from(gatewaySettings)
    .where(eq(gatewaySettings.gateway, "variza"))
    .limit(1);
  const settings = settingsRows[0];
  if (!settings) {
    return Response.json({ ok: false, error: "variza not configured" }, { status: 200 });
  }

  const signature = req.headers.get("x-webhook-signature");
  if (!verifyVarizaSignature(raw, signature, settings.webhookSecret)) {
    // 401 keeps Variza retrying only for genuine delivery problems.
    return Response.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let body: VarizaWebhookPayload;
  try {
    body = JSON.parse(raw) as VarizaWebhookPayload;
  } catch {
    return Response.json({ ok: true, ignored: "bad json" }, { status: 200 });
  }

  const event = String(body.event ?? req.headers.get("x-event") ?? "");
  if (event && event !== "payment.paid") {
    return Response.json({ ok: true, ignored: event }, { status: 200 });
  }

  const { reference, amount } = readWebhookRef(body);
  if (!reference) return Response.json({ ok: true, ignored: "no reference" }, { status: 200 });

  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.authority, reference), eq(payments.gateway, "variza")))
    .limit(1);
  const payment = rows[0];
  if (!payment) return Response.json({ ok: true, ignored: "unknown payment" }, { status: 200 });

  // Idempotent: repeated deliveries must not stack subscriptions.
  if (payment.status === "paid") return Response.json({ ok: true, duplicate: true }, { status: 200 });

  if (amount > 0 && Math.abs(amount - payment.amount) > 1) {
    await markPayment(payment.id, { status: "failed" });
    return Response.json({ ok: true, mismatch: true }, { status: 200 });
  }

  const deliveryId = req.headers.get("x-delivery-id") ?? reference;
  await markPayment(payment.id, { status: "paid", refId: deliveryId });
  await activateSubscription(payment.userId, payment.planId);
  if (payment.discountCode) await consumeDiscount(payment.discountCode);

  return Response.json({ ok: true }, { status: 200 });
}
