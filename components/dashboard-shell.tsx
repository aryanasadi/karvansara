"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Store,
  Wallet,
  Target,
  StickyNote,
  Gem,
  Crown,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Gift,
  Receipt,
  BellRing,
  LifeBuoy,
  UserCog,
  Printer,
  PackageSearch,
  Link2,
} from "lucide-react";
import clsx from "clsx";
import { Logo, Badge } from "@/components/ui";
import { logoutAction } from "@/app/(auth)/actions";
import { faNum } from "@/lib/format";

type ShellUser = { name: string; email: string; role: string };
type ShellSub = { planName: string; isTrial: boolean; daysLeft: number; endsAt: string } | null;

const NAV = [
  { href: "/dashboard", label: "نمای کلی", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "انبار محصولات", icon: Package },
  { href: "/dashboard/receipt", label: "صدور فیش فروش", icon: Printer },
  { href: "/dashboard/invoices", label: "فاکتور و مشتریان", icon: Receipt },
  { href: "/dashboard/tracking", label: "بارکد و ردیابی پستی", icon: PackageSearch },
  { href: "/dashboard/biolink", label: "کاروانسرای تو", icon: Link2 },
  { href: "/dashboard/woocommerce", label: "اتصال ووکامرس", icon: Store },
  { href: "/dashboard/accounting", label: "حسابداری", icon: Wallet },
  { href: "/dashboard/reminders", label: "سررسید و یادآوری", icon: BellRing },
  { href: "/dashboard/tasks", label: "کارها و چشم‌انداز", icon: Target },
  { href: "/dashboard/notes", label: "یادداشت‌های مدیر", icon: StickyNote },
  { href: "/dashboard/portfolio", label: "پرتفولیو دارایی", icon: Gem },
  { href: "/dashboard/tickets", label: "پشتیبانی و تیکت", icon: LifeBuoy },
  { href: "/dashboard/profile", label: "پروفایل کسب‌وکار", icon: UserCog },
  { href: "/dashboard/subscription", label: "اشتراک", icon: Crown },
];

function SidebarContent({
  user,
  sub,
  trialAvailable,
  onNavigate,
}: {
  user: ShellUser;
  sub: ShellSub;
  trialAvailable: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="block px-6 pt-7" onClick={onNavigate}>
        <Logo withText size={40} />
      </Link>

      <div className="mt-6 px-5">
        {sub ? (
          <div className="card border-brand-400/20 bg-gradient-to-br from-brand-400/10 to-transparent p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-300">
                {sub.isTrial ? "هدیه آشنایی" : `پلن ${sub.planName}`}
              </span>
              <Badge tone={sub.isTrial ? "gold" : "brand"}>{sub.daysLeft > 0 ? `${faNum(sub.daysLeft)} روز مانده` : "امروز پایان"}</Badge>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-l from-brand-300 to-gold-300"
                style={{ width: `${Math.min(100, Math.max(4, (sub.daysLeft / (sub.isTrial ? 7 : 30)) * 100))}%` }}
              />
            </div>
          </div>
        ) : (
          <Link
            href="/dashboard/subscription"
            onClick={onNavigate}
            className="card flex items-center gap-3 border-gold-400/30 bg-gradient-to-br from-gold-400/12 to-transparent p-4 transition hover:border-gold-400/50"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-400/15 text-gold-300">
              {trialAvailable ? <Gift size={18} /> : <Crown size={18} />}
            </span>
            <span>
              <span className="block text-xs font-black text-gold-200">
                {trialAvailable ? "هدیه ۷ روزه منتظرت است" : "اشتراک فعالی نداری"}
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-400">برای باز شدن امکانات، فعال‌سازی کن</span>
            </span>
          </Link>
        )}
      </div>

      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto px-4">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition",
                active
                  ? "bg-gradient-to-l from-brand-400/20 to-brand-400/5 text-brand-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <item.icon size={18} className={clsx(active ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300")} />
              {item.label}
              {active && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-brand-300" />}
            </Link>
          );
        })}

        {user.role === "admin" && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className="mt-4 flex items-center gap-3 rounded-2xl border border-gold-400/25 bg-gold-400/5 px-4 py-2.5 text-sm font-bold text-gold-300 transition hover:bg-gold-400/10"
          >
            <ShieldCheck size={18} />
            پنل مدیریت
          </Link>
        )}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-lapis-400/30 to-lapis-400/5 text-base font-black text-lapis-200">
            {user.name.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-white">{user.name}</span>
            <span className="block truncate text-[10px] text-slate-500" dir="ltr">
              {user.email}
            </span>
          </span>
          <button
            onClick={() => logoutAction()}
            title="خروج از حساب"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-400 transition hover:bg-crimson-400/15 hover:text-crimson-400"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({
  user,
  sub,
  trialAvailable,
  children,
}: {
  user: ShellUser;
  sub: ShellSub;
  trialAvailable: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-night-950">
      <div className="pointer-events-none fixed inset-0 pattern-star opacity-60" />
      <div className="pointer-events-none fixed -top-32 right-1/3 h-96 w-96 rounded-full bg-brand-500/8 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 left-0 h-80 w-80 rounded-full bg-gold-500/6 blur-3xl" />

      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 border-l border-white/6 bg-night-900/85 backdrop-blur-xl lg:block">
        <SidebarContent user={user} sub={sub} trialAvailable={trialAvailable} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-night-950/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 border-l border-white/8 bg-night-900 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-slate-400"
              aria-label="بستن منو"
            >
              <X size={17} />
            </button>
            <SidebarContent user={user} sub={sub} trialAvailable={trialAvailable} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="relative flex min-h-dvh flex-col lg:pr-72">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/6 bg-night-950/75 px-4 py-3.5 backdrop-blur-xl lg:px-8">
          <button
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-300 lg:hidden"
            aria-label="باز کردن منو"
          >
            <Menu size={18} />
          </button>
          <div className="flex-1">
            <p className="text-sm font-black text-white">
              سلام {user.name.split(" ")[0]}؛ خوش آمدی
            </p>
            <p className="text-[10px] text-slate-500">کاروانسرای کسب‌وکار تو آماده است</p>
          </div>
          {sub ? (
            <Badge tone="brand">اشتراک: {sub.isTrial ? "آزمایشی" : sub.planName}</Badge>
          ) : (
            <Link href="/dashboard/subscription" className="btn-gold px-3.5 py-2 text-xs">
              <Crown size={14} />
              فعال‌سازی اشتراک
            </Link>
          )}
        </header>
        <main className="relative flex-1 px-4 py-6 lg:px-8 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
