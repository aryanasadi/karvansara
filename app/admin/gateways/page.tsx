import { db } from "@/db";
import { gatewaySettings } from "@/db/schema";
import { ensureSeedData } from "@/lib/seed";
import { GatewaysManager, type GatewaySettingItem } from "@/components/gateways-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "درگاه‌های پرداخت — پنل مدیریت" };

const LABELS: Record<string, string> = {
  zarinpal: "زرین‌پال",
  zibal: "زیبال",
  variza: "واریزا (کارت‌به‌کارت خودکار)",
  aban: "آبان گیت وی (کارت‌به‌کارت خودکار)",
  manual_card: "کارت‌به‌کارت دستی",
};

export default async function AdminGatewaysPage() {
  await ensureSeedData();
  const rows = await db.select().from(gatewaySettings);

  const items: GatewaySettingItem[] = (["zarinpal", "zibal", "variza", "aban", "manual_card"] as const).map((g) => {
    const row = rows.find((r) => r.gateway === g);
    return {
      gateway: g,
      label: LABELS[g],
      merchantId: row?.merchantId ?? "",
      webhookSecret: row?.webhookSecret ?? "",
      cardNumber: row?.cardNumber ?? "",
      cardHolder: row?.cardHolder ?? "",
      bankName: row?.bankName ?? "",
      isActive: row?.isActive ?? false,
      isSandbox: row?.isSandbox ?? true,
    };
  });

  return <GatewaysManager initial={items} />;
}
