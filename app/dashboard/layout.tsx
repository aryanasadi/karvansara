import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getActiveSubscription, getCurrentUser, hasUsedTrial } from "@/lib/auth";
import { ensureSeedData } from "@/lib/seed";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await ensureSeedData();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sub = await getActiveSubscription(user.id);
  const trialAvailable = !sub && !(await hasUsedTrial(user.id));

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role }}
      sub={
        sub
          ? {
              planName: sub.planName,
              isTrial: sub.isTrial,
              daysLeft: sub.daysLeft,
              endsAt: sub.endsAt.toISOString(),
            }
          : null
      }
      trialAvailable={trialAvailable}
    >
      {children}
    </DashboardShell>
  );
}
