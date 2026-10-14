export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (raw) return raw.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export const SITE_NAME = "کاروانسرا";
export const SITE_TAGLINE = "سامانه یکپارچه انبارداری، حسابداری و مدیریت کسب‌وکار";