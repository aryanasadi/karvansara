import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assets,
  customers,
  invoices,
  products,
  reminders,
  stockMovements,
  tasks,
  transactions,
} from "@/db/schema";
import { getActiveSubscription, getCurrentUser } from "@/lib/auth";
import { buildCsv, csvResponse } from "@/lib/csv";
import { ASSET_TYPES, REMINDER_TYPES, STATUS_FA, faDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const EXPORTABLE = [
  "products",
  "movements",
  "transactions",
  "invoices",
  "customers",
  "assets",
  "reminders",
  "tasks",
] as const;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const sub = await getActiveSubscription(user.id);
  if (!sub) return new Response("Subscription required", { status: 402 });

  const entity = new URL(req.url).searchParams.get("entity") ?? "";
  const stamp = new Date().toISOString().slice(0, 10);

  switch (entity) {
    case "products": {
      const rows = await db.select().from(products).where(eq(products.userId, user.id)).orderBy(desc(products.updatedAt));
      return csvResponse(
        `karvansara-products-${stamp}`,
        buildCsv(
          ["نام محصول", "کد کالا", "دسته‌بندی", "قیمت فروش (تومان)", "قیمت خرید (تومان)", "موجودی", "حد هشدار", "ارزش موجودی", "منبع"],
          rows.map((p) => [
            p.name,
            p.sku,
            p.category,
            p.price,
            p.buyPrice,
            p.stock,
            p.lowStockThreshold,
            p.price * p.stock,
            p.source === "woocommerce" ? "ووکامرس" : "دستی",
          ])
        )
      );
    }
    case "movements": {
      const rows = await db
        .select({ m: stockMovements, p: products })
        .from(stockMovements)
        .innerJoin(products, eq(stockMovements.productId, products.id))
        .where(eq(stockMovements.userId, user.id))
        .orderBy(desc(stockMovements.createdAt))
        .limit(5000);
      return csvResponse(
        `karvansara-stock-movements-${stamp}`,
        buildCsv(
          ["تاریخ", "محصول", "نوع", "تعداد", "موجودی پس از تغییر", "توضیح"],
          rows.map(({ m, p }) => [faDate(m.createdAt), p.name, m.quantity > 0 ? "ورود" : "خروج", m.quantity, m.balanceAfter, m.note])
        )
      );
    }
    case "transactions": {
      const rows = await db.select().from(transactions).where(eq(transactions.userId, user.id)).orderBy(desc(transactions.date));
      return csvResponse(
        `karvansara-accounting-${stamp}`,
        buildCsv(
          ["تاریخ", "نوع", "سرفصل", "مبلغ (تومان)", "شرح"],
          rows.map((t) => [faDate(t.date), t.type === "income" ? "درآمد" : "هزینه", t.category, t.amount, t.description])
        )
      );
    }
    case "invoices": {
      const rows = await db.select().from(invoices).where(eq(invoices.userId, user.id)).orderBy(desc(invoices.issueDate));
      return csvResponse(
        `karvansara-invoices-${stamp}`,
        buildCsv(
          ["شماره فاکتور", "نوع", "تاریخ صدور", "طرف حساب", "تلفن", "جمع کل (تومان)", "تخفیف", "مالیات", "مبلغ نهایی", "وضعیت"],
          rows.map((i) => [
            i.number,
            i.type === "sale" ? "فروش" : "خرید",
            faDate(i.issueDate),
            i.customerName,
            i.customerPhone,
            i.subtotal,
            i.discount,
            i.tax,
            i.total,
            STATUS_FA[i.status] ?? i.status,
          ])
        )
      );
    }
    case "customers": {
      const rows = await db.select().from(customers).where(eq(customers.userId, user.id)).orderBy(desc(customers.createdAt));
      return csvResponse(
        `karvansara-customers-${stamp}`,
        buildCsv(
          ["نام", "نوع", "تلفن", "ایمیل", "نشانی", "یادداشت", "تاریخ ثبت"],
          rows.map((c) => [c.name, c.type === "supplier" ? "تأمین‌کننده" : "مشتری", c.phone, c.email, c.address, c.note, faDate(c.createdAt)])
        )
      );
    }
    case "assets": {
      const rows = await db.select().from(assets).where(eq(assets.userId, user.id)).orderBy(desc(assets.updatedAt));
      return csvResponse(
        `karvansara-portfolio-${stamp}`,
        buildCsv(
          ["نام دارایی", "نوع", "تعداد", "بهای خرید هر واحد", "ارزش روز هر واحد", "ارزش کل", "سود/زیان", "تاریخ خرید"],
          rows.map((a) => [
            a.name,
            ASSET_TYPES[a.type] ?? a.type,
            a.quantity,
            a.unitPurchasePrice,
            a.unitCurrentValue,
            a.quantity * a.unitCurrentValue,
            a.quantity * (a.unitCurrentValue - a.unitPurchasePrice),
            a.purchaseDate ? faDate(a.purchaseDate) : "",
          ])
        )
      );
    }
    case "reminders": {
      const rows = await db.select().from(reminders).where(eq(reminders.userId, user.id)).orderBy(desc(reminders.dueDate));
      return csvResponse(
        `karvansara-reminders-${stamp}`,
        buildCsv(
          ["عنوان", "نوع", "سررسید", "مبلغ (تومان)", "وضعیت", "یادداشت"],
          rows.map((r) => [r.title, REMINDER_TYPES[r.type] ?? r.type, faDate(r.dueDate), r.amount, r.isDone ? "انجام‌شده" : "در انتظار", r.note])
        )
      );
    }
    case "tasks": {
      const rows = await db.select().from(tasks).where(eq(tasks.userId, user.id)).orderBy(desc(tasks.updatedAt));
      return csvResponse(
        `karvansara-tasks-${stamp}`,
        buildCsv(
          ["عنوان", "وضعیت", "اولویت", "پیشرفت (٪)", "مهلت", "توضیح"],
          rows.map((t) => [
            t.title,
            STATUS_FA[t.status] ?? t.status,
            t.priority === "high" ? "فوری" : t.priority === "low" ? "کم‌اهمیت" : "متوسط",
            t.progress,
            t.dueDate ? faDate(t.dueDate) : "",
            t.description,
          ])
        )
      );
    }
    default:
      return new Response("Unknown entity", { status: 400 });
  }
}
