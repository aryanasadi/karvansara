import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gatewaySettings, payments } from "@/db/schema";
import { activateSubscription, markPayment } from "@/lib/billing";
import { zarinpalVerify, zibalVerify } from "@/lib/payments";
import { consumeDiscount } from "@/lib/discounts";

export const dynamic = "force-dynamic";

function redirectTo(origin: string, params: Record<string, string>) {
  const url = new URL("/dashboard/subscription", origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const gateway = url.searchParams.get("gateway");

  try {
    if (gateway !== "zarinpal" && gateway !== "zibal") {
      return redirectTo(origin, { result: "failed", reason: "درگاه نامشخص است." });
    }

    const authority =
      gateway === "zarinpal" ? url.searchParams.get("Authority") : url.searchParams.get("trackId");
    const ok =
      gateway === "zarinpal"
        ? url.searchParams.get("Status") === "OK"
        : url.searchParams.get("success") === "1";

    if (!authority) {
      return redirectTo(origin, { result: "failed", reason: "شناسه پرداخت دریافت نشد." });
    }

    const paymentRows = await db
      .select()
      .from(payments)
      .where(and(eq(payments.authority, authority), eq(payments.gateway, gateway)))
      .limit(1);
    const payment = paymentRows[0];
    if (!payment) {
      return redirectTo(origin, { result: "failed", reason: "رکورد پرداخت یافت نشد." });
    }
    if (payment.status === "paid") {
      return redirectTo(origin, { result: "success", ref: payment.refId ?? "" });
    }

    if (!ok) {
      await markPayment(payment.id, { status: "canceled" });
      return redirectTo(origin, { result: "failed", reason: "پرداخت توسط کاربر لغو شد." });
    }

    const settingsRows = await db
      .select()
      .from(gatewaySettings)
      .where(eq(gatewaySettings.gateway, gateway))
      .limit(1);
    const settings = settingsRows[0];
    if (!settings) {
      return redirectTo(origin, { result: "failed", reason: "پیکربندی درگاه یافت نشد." });
    }

    let refId = "";
    if (gateway === "zarinpal") {
      const verified = await zarinpalVerify({
        merchantId: settings.merchantId.trim(),
        sandbox: settings.isSandbox,
        amountRials: payment.amount * 10,
        authority,
      });
      refId = verified.refId;
    } else {
      const verified = await zibalVerify({ merchantId: settings.merchantId.trim(), trackId: authority });
      refId = verified.refId;
      if (verified.amountRials && Math.abs(verified.amountRials - payment.amount * 10) > 1000) {
        await markPayment(payment.id, { status: "failed" });
        return redirectTo(origin, { result: "failed", reason: "مغایرت مبلغ پرداخت." });
      }
    }

    await markPayment(payment.id, { status: "paid", refId });
    await activateSubscription(payment.userId, payment.planId);
    if (payment.discountCode) await consumeDiscount(payment.discountCode);
    return redirectTo(origin, { result: "success", ref: refId });
  } catch (err) {
    return redirectTo(origin, {
      result: "failed",
      reason: err instanceof Error ? err.message : "خطایی در تأیید پرداخت رخ داد.",
    });
  }
}
