export function faNum(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "۰";
  const num = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(num)) return "۰";
  return num.toLocaleString("fa-IR");
}

export function formatToman(n: number | null | undefined): string {
  return `${faNum(n ?? 0)} تومان`;
}

/**
 * Compact currency for narrow stat cards so long numbers never overflow.
 * 1_250_000_000 → «۱٫۲۵ میلیارد»  |  2_400_000 → «۲٫۴ میلیون»
 */
export function formatTomanShort(n: number | null | undefined): string {
  const v = Math.abs(n ?? 0);
  const sign = (n ?? 0) < 0 ? "−" : "";
  if (v >= 1_000_000_000) return `${sign}${faNum(Math.round((v / 1_000_000_000) * 100) / 100)} میلیارد`;
  if (v >= 1_000_000) return `${sign}${faNum(Math.round((v / 1_000_000) * 10) / 10)} میلیون`;
  if (v >= 100_000) return `${sign}${faNum(Math.round(v / 1000))} هزار`;
  return `${sign}${faNum(v)}`;
}

export function faDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

export function faDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/**
 * Calendar-day difference (not raw 24h chunks), so the counter really drops by
 * one every midnight instead of appearing frozen for a whole day.
 */
export function daysLeft(end: Date | string | null | undefined): number {
  if (!end) return 0;
  const date = typeof end === "string" ? new Date(end) : new Date(end);
  if (Number.isNaN(date.getTime())) return 0;
  const endDay = new Date(date);
  endDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((endDay.getTime() - today.getTime()) / 86_400_000));
}

/** Days until due date; negative when overdue. */
export function daysUntil(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function relativeDay(date: Date | string | null | undefined): string {
  const diff = daysUntil(date);
  if (diff === 0) return "امروز";
  if (diff === 1) return "فردا";
  if (diff === -1) return "دیروز";
  if (diff > 1) return `${faNum(diff)} روز دیگر`;
  return `${faNum(Math.abs(diff))} روز گذشته`;
}

export function toIso(d: Date | null | undefined): string {
  return d ? d.toISOString() : "";
}

export const STATUS_FA: Record<string, string> = {
  active: "فعال",
  expired: "منقضی‌شده",
  canceled: "لغوشده",
  replaced: "جایگزین‌شده",
  trial: "آزمایشی",
  pending: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  failed: "ناموفق",
  error: "خطا",
  todo: "برای انجام",
  in_progress: "در حال انجام",
  done: "انجام‌شده",
  issued: "صادرشده",
  open: "باز",
  answered: "پاسخ داده شد",
  user_reply: "در انتظار پاسخ ما",
  closed: "بسته‌شده",
};

export const ASSET_TYPES: Record<string, string> = {
  cash: "وجه نقد",
  gold: "طلا و جواهر",
  currency: "ارز خارجی",
  stock: "سهام و بورس",
  crypto: "رمزارز",
  real_estate: "ملک و املاک",
  other: "سایر دارایی‌ها",
};

export const TX_CATEGORIES: Record<string, string[]> = {
  income: ["فروش محصول", "درآمد خدمات", "سرمایه‌گذاری", "بازپرداخت", "سایر درآمدها"],
  expense: ["خرید کالا", "اجاره", "حقوق و دستمزد", "تبلیغات", "حمل‌ونقل", "قبوض و خدمات", "سایر هزینه‌ها"],
};

export const REMINDER_TYPES: Record<string, string> = {
  check: "سررسید چک",
  debt: "بدهی پرداختی",
  receivable: "طلب دریافتی",
  payment: "قبض و پرداخت",
  meeting: "قرار و جلسه",
  other: "یادآوری عمومی",
};

export const TICKET_DEPARTMENTS: Record<string, string> = {
  support: "پشتیبانی عمومی",
  billing: "مالی و اشتراک",
  technical: "فنی و ووکامرس",
};

export const ORDER_TYPES: Record<string, string> = {
  dine_in: "صرف در سالن",
  takeaway: "بیرون‌بر",
  delivery: "ارسال با پیک",
  counter: "فروش حضوری",
};

export const PAYMENT_METHODS: Record<string, string> = {
  cash: "نقدی",
  card: "کارت‌خوان",
  online: "پرداخت آنلاین",
  credit: "نسیه / حساب باز",
};

/** Persian time only (for receipts). */
export function faTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

/** URL-safe slug that keeps Persian letters. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

/** Rough Persian reading time (≈ 200 words / minute). */
export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
