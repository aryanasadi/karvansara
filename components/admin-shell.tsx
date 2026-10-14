"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Users,
  CreditCard,
  Landmark,
  Layers,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  ShieldCheck,
  TicketPercent,
  LifeBuoy,
  MessageSquare,
  Newspaper,
} from "lucide-react";
import clsx from "clsx";
import { Logo, Badge } from "@/components/ui";
import { logoutAction } from "@/app/(auth)/actions";

const NAV = [
  { href: "/admin", label: "نمای کلی", icon: Gauge },
  { href: "/admin/users", label: "کاربران و اشتراک", icon: Users },
  { href: "/admin/payments", label: "پرداخت‌ها", icon: CreditCard },
  { href: "/admin/blog", label: "وبلاگ و مقالات", icon: Newspaper },
  { href: "/admin/discounts", label: "کدهای تخفیف", icon: TicketPercent },
  { href: "/admin/tickets", label: "تیکت‌های پشتیبانی", icon: LifeBuoy },
  { href: "/admin/gateways", label: "درگاه‌های پرداخت", icon: Landmark },
  { href: "/admin/sms", label: "پنل پیامکی", icon: MessageSquare },
  { href: "/admin/plans", label: "پلن‌های اشتراک", icon: Layers },
];

function Content({ user, onNavigate }: { user: { name: string; email: string }; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-7">
        <Logo withText size={40} />
        <span className="mt-3 block">
          <Badge tone="gold">پنل مدیریت کاروانسرا</Badge>
        </span>
      </div>
      <nav className="mt-8 flex-1 space-y-1 overflow-y-auto px-4">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition",
                active ? "bg-gradient-to-l from-gold-400/20 to-gold-400/5 text-gold-200" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <item.icon size={18} className={clsx(active ? "text-gold-300" : "text-slate-500 group-hover:text-slate-300")} />
              {item.label}
              {active && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-gold-300" />}
            </Link>
          );
        })}
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-400/25 bg-brand-400/5 px-4 py-2.5 text-sm font-bold text-brand-300 transition hover:bg-brand-400/10"
        >
          <LayoutDashboard size={18} />
          مشاهده داشبورد کاربری
        </Link>
      </nav>
      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-gold-400/30 to-gold-400/5 text-base font-black text-gold-200">
            <ShieldCheck size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-white">{user.name}</span>
            <span className="block truncate text-[10px] text-slate-500" dir="ltr">
              {user.email}
            </span>
          </span>
          <button
            onClick={() => logoutAction()}
            title="خروج"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-400 transition hover:bg-crimson-400/15 hover:text-crimson-400"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ user, children }: { user: { name: string; email: string }; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-night-950">
      <div className="pointer-events-none fixed inset-0 pattern-star-gold opacity-60" />
      <div className="pointer-events-none fixed -top-32 right-1/3 h-96 w-96 rounded-full bg-gold-500/8 blur-3xl" />

      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 border-l border-white/6 bg-night-900/85 backdrop-blur-xl lg:block">
        <Content user={user} />
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
            <Content user={user} onNavigate={() => setOpen(false)} />
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
            <p className="text-sm font-black text-white">اتاق فرمان کاروانسرا</p>
            <p className="text-[10px] text-slate-500">مدیریت کاربران، اشتراک‌ها و درگاه‌ها</p>
          </div>
          <Badge tone="gold">
            <ShieldCheck size={12} />
            مدیر سامانه
          </Badge>
        </header>
        <main className="relative flex-1 px-4 py-6 lg:px-8 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
