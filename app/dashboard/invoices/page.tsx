import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { customers, invoices, products } from "@/db/schema";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { LockedFeature } from "@/components/ui";
import { InvoicesManager, type InvoiceRow, type CustomerRow, type ProductOption } from "@/components/invoices-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "فاکتور فروش و خرید — کاروانسرا" };

export default async function InvoicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) {
    const trialAvailable = !(await hasUsedTrial(user.id));
    return <LockedFeature trialAvailable={trialAvailable} title="فاکتورها با فعال‌سازی اشتراک باز می‌شوند" />;
  }

  const [invoiceRows, customerRows, productRows] = await Promise.all([
    db.select().from(invoices).where(eq(invoices.userId, user.id)).orderBy(desc(invoices.issueDate)).limit(300),
    db.select().from(customers).where(eq(customers.userId, user.id)).orderBy(desc(customers.createdAt)).limit(300),
    db.select().from(products).where(eq(products.userId, user.id)).orderBy(desc(products.updatedAt)).limit(300),
  ]);

  const invoiceItems: InvoiceRow[] = invoiceRows.map((i) => ({
    id: i.id,
    number: i.number,
    type: i.type,
    status: i.status,
    customerName: i.customerName,
    customerPhone: i.customerPhone,
    issueDate: i.issueDate.toISOString(),
    dueDate: i.dueDate ? i.dueDate.toISOString() : "",
    total: i.total,
  }));

  const customerItems: CustomerRow[] = customerRows.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    type: c.type,
    note: c.note,
  }));

  const productOptions: ProductOption[] = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    buyPrice: p.buyPrice,
    stock: p.stock,
  }));

  return <InvoicesManager invoices={invoiceItems} customers={customerItems} products={productOptions} />;
}
