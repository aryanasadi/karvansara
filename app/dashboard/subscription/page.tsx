import { asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { gatewaySettings, payments, plans } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { ensureSeedData } from "@/lib/seed";
import { Notice } from "@/components/manager-ui";
import {
  SubscriptionManager,
  type PlanItem,
  type GatewayOption,
  type PaymentItem,
  type SubInfo,
  type ManualCardInfo,
} from "@/components/subscription-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "اشتراک — کاروانسرا" };

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await ensureSeedData();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;

  const [sub, usedTrial, allPlans, gatewayRows, paymentRows] = await Promise.all([
    getActiveSubscription(user.id),
    hasUsedTrial(user.id),
    db.select().from(plans).orderBy(asc(plans.sortOrder)),
    db.select().from(gatewaySettings),
    db.select().from(payments).where(eq(payments.userId, user.id)).orderBy(desc(payments.createdAt)).limit(10),
  ]);

  const planItems: PlanItem[] = allPlans
    .filter((p) => p.isActive)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      durationDays: p.durationDays,
      price: p.price,
      isTrial: p.isTrial,
    }));

  const GATEWAY_LABELS: Record<string, string> = {
    zarinpal: "زرین‌پال",
    zibal: "زیبال",
    variza: "واریزا (کارت‌به‌کارت خودکار)",
    aban: "آبان گیت وی (کارت‌به‌کارت خودکار)",
    manual_card: "کارت‌به‌کارت",
  };

  const gatewayOptions: GatewayOption[] = (["zarinpal", "zibal", "variza", "aban", "manual_card"] as const).map((g) => {
    const row = gatewayRows.find((r) => r.gateway === g);
    return {
      gateway: g,
      label: GATEWAY_LABELS[g],
      isActive: Boolean(row?.isActive),
      configured: g === "manual_card" ? Boolean(row?.cardNumber) : Boolean(row?.merchantId),
      sandbox: Boolean(row?.isSandbox),
    };
  });

  const manualRow = gatewayRows.find((r) => r.gateway === "manual_card");
  const manualCard: ManualCardInfo =
    manualRow?.isActive && manualRow.cardNumber
      ? { cardNumber: manualRow.cardNumber, cardHolder: manualRow.cardHolder, bankName: manualRow.bankName }
      : null;

  const paymentItems: PaymentItem[] = paymentRows.map((p) => ({
    id: p.id,
    amount: p.amount,
    gateway: p.gateway,
    status: p.status,
    refId: p.refId ?? "",
    createdAt: p.createdAt.toISOString(),
    planName: allPlans.find((pl) => pl.id === p.planId)?.name ?? "—",
    discountCode: p.discountCode,
  }));

  const subInfo: SubInfo = sub
    ? {
        planName: sub.planName,
        isTrial: sub.isTrial,
        daysLeft: sub.daysLeft,
        totalDays: sub.totalDays,
        endsAt: sub.endsAt.toISOString(),
      }
    : null;

  return (
    <div>
      {params?.result === "success" && (
        <div className="mb-5">
          <Notice kind="success">
            پرداخت با موفقیت انجام شد و اشتراک تو فعال است.
            {params.ref ? ` کد پیگیری: ${params.ref}` : ""}
          </Notice>
        </div>
      )}
      {params?.result === "failed" && (
        <div className="mb-5">
          <Notice kind="error">{params.reason || "پرداخت انجام نشد یا توسط درگاه تأیید نشد."}</Notice>
        </div>
      )}
      {(params?.result === "pending_variza" || params?.result === "pending_aban") && (
        <div className="mb-5">
          <Notice kind="info">
            واریز شما در حال بررسی خودکار است. به‌محض شناسایی پیامک بانکی (معمولاً چند ثانیه)، اشتراک
            به‌صورت خودکار فعال می‌شود — نیازی به ارسال رسید نیست. این صفحه را چند لحظه بعد تازه‌سازی کن.
          </Notice>
        </div>
      )}
      <SubscriptionManager
        sub={subInfo}
        plans={planItems}
        gateways={gatewayOptions}
        usedTrial={usedTrial}
        history={paymentItems}
        userEmail={user.email}
        manualCard={manualCard}
      />
    </div>
  );
}
