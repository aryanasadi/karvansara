import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, plans, users } from "@/db/schema";
import { PaymentsManager, type AdminPaymentRow } from "@/components/payments-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "پرداخت‌ها — پنل مدیریت" };

export default async function AdminPaymentsPage() {
  const [rows, allPlans] = await Promise.all([
    db
      .select({ payment: payments, user: users })
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .orderBy(desc(payments.createdAt))
      .limit(250),
    db.select().from(plans),
  ]);

  const planName = (id: string) => {
    const p = allPlans.find((pl) => pl.id === id);
    return p ? (p.isTrial ? "هدیه آشنایی" : p.name) : "—";
  };

  const items: AdminPaymentRow[] = rows.map(({ payment, user }) => ({
    id: payment.id,
    userName: user.name,
    userEmail: user.email,
    userPhone: user.phone,
    planName: planName(payment.planId),
    amount: payment.amount,
    originalAmount: payment.originalAmount,
    discountCode: payment.discountCode,
    gateway: payment.gateway,
    status: payment.status,
    refId: payment.refId ?? "",
    receiptUrl: payment.receiptUrl,
    payerName: payment.payerName,
    payerCard: payment.payerCard,
    paidAt: payment.paidAt,
    reviewNote: payment.reviewNote,
    createdAt: payment.createdAt.toISOString(),
  }));

  return <PaymentsManager initial={items} />;
}
