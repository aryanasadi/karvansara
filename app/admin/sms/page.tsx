import { db } from "@/db";
import { smsSettings } from "@/db/schema";
import { ensureSeedData } from "@/lib/seed";
import { SmsManager, type SmsSettingsItem } from "@/components/sms-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "پنل پیامکی — پنل مدیریت" };

export default async function AdminSmsPage() {
  await ensureSeedData();
  const rows = await db.select().from(smsSettings).limit(1);
  const row = rows[0];

  const item: SmsSettingsItem = {
    provider: row?.provider ?? "kavenegar",
    apiKey: row?.apiKey ?? "",
    sender: row?.sender ?? "",
    templateName: row?.templateName ?? "",
    isActive: row?.isActive ?? false,
    loginEnabled: row?.loginEnabled ?? false,
    testMode: row?.testMode ?? true,
  };

  return <SmsManager initial={item} />;
}
