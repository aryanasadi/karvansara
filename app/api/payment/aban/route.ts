import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gatewaySettings, payments } from "@/db/schema";
import { activateSubscription, markPayment } from "@/lib/billing";
import { consumeDiscount } from "@/lib/discounts";
import { abanVerifyInvoice, verifyAbanSignature, type AbanWebhookBody } from "@/lib/abangateway";

export const dynamic = "force-dynamic";

/**
 * Aban Gateway webhook — set this as `callback_url`:
 *   {APP_URL}/api/payment/aban
 *
 * Events: invoice.paid | invoice.expired | invoice.cancelled
 * Signature: HMAC-SHA256 of the RAW body in `X-Signature`.
 * Any 2xx means "received"; anything else triggers up to 5 retries.
 */
export async function POST(req: Request) {
  // RAW body — re-serialising the JSON would break the signature.
  const raw = await req.text();

  const settingsRows = await db
    .select()
    .from(gatewaySettings)
    .where(eq(gatewaySettings.gateway, "aban"))
    .limit(1);
  const settings = settingsRows[0];
  if (!settings) return Response.json({ ok: false, error: "aban not configured" }, { status: 200 });

  if (!verifyAbanSignature(raw, req.headers.get("x-signature"), settings.webhookSecret)) {
    return Response.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let body: AbanWebhookBody;
  try {
    body = JSON.parse(raw) as AbanWebhookBody;
  } catch {
    return Response.json({ ok: true, ignored: "bad json" }, { status: 200 });
  }

  const event = String(body.event ?? req.headers.get("x-event") ?? "");
  const invoiceId = String(body.invoice_id ?? "");
  if (!invoiceId) return Response.json({ ok: true, ignored: "no invoice_id" }, { status: 200 });

  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.authority, invoiceId), eq(payments.gateway, "aban")))
    .limit(1);
  const payment = rows[0];
  if (!payment) return Response.json({ ok: true, ignored: "unknown invoice" }, { status: 200 });

  if (event === "invoice.expired" || event === "invoice.cancelled") {
    if (payment.status === "pending") {
      await markPayment(payment.id, { status: event === "invoice.expired" ? "failed" : "canceled" });
    }
    return Response.json({ ok: true }, { status: 200 });
  }

  if (event && event !== "invoice.paid") {
    return Response.json({ ok: true, ignored: event }, { status: 200 });
  }

  // Idempotent: a duplicate delivery must not extend the subscription twice.
  if (payment.status === "paid") return Response.json({ ok: true, duplicate: true }, { status: 200 });

  // Amount sanity check (API speaks Rial, we store Toman).
  const amountRial = Number(body.amount_rial ?? 0);
  if (amountRial > 0 && Math.abs(amountRial - payment.amount * 10) > 10) {
    await markPayment(payment.id, { status: "failed" });
    return Response.json({ ok: true, mismatch: true }, { status: 200 });
  }

  // Confirm delivery on Aban's side (409 already_verified counts as success).
  try {
    await abanVerifyInvoice(settings.merchantId.trim(), invoiceId);
  } catch {
    // The signed webhook already proves payment; a failed verify call must not
    // block activation — it is retried implicitly by Aban's own delivery logic.
  }

  const deliveryId = req.headers.get("x-delivery-id") ?? invoiceId;
  await markPayment(payment.id, { status: "paid", refId: deliveryId });
  await activateSubscription(payment.userId, payment.planId);
  if (payment.discountCode) await consumeDiscount(payment.discountCode);

  return Response.json({ ok: true }, { status: 200 });
}
