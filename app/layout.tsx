import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import "@fontsource/vazirmatn/900.css";
import "./globals.css";
import { siteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "کاروانسرا — سامانه یکپارچه انبارداری، حسابداری و فیش فروش",
    template: "%s | کاروانسرا",
  },
  description:
    "انبارداری هوشمند با اتصال مستقیم به ووکامرس، صدور فاکتور و فیش حرارتی، حسابداری جامع، مدیریت کارها و پرتفولیو دارایی‌ها؛ همه در یک کاروانسرای دیجیتال.",
  keywords: [
    "نرم افزار انبارداری",
    "حسابداری آنلاین",
    "اتصال به ووکامرس",
    "صدور فیش فروش",
    "فاکتور فروش",
    "مدیریت فروشگاه اینترنتی",
  ],
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: SITE_NAME,
    title: "کاروانسرا — سامانه یکپارچه مدیریت کسب‌وکار",
    description: "انبارداری، فیش فروش، فاکتور، حسابداری و اتصال ووکامرس در یک سامانه فارسی",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-night-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
