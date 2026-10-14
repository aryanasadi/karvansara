import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Truck, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { parcels, users } from "@/db/schema";
import { Logo } from "@/components/ui";

export const dynamic = "force-dynamic";

/** noindex — we don't want Google indexing tracking pages. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const CARRIER_URLS: Record<string, string> = {
  post: "https://tracking.post.ir/search.aspx?id=",
  tipax: "https://tipax.ir/tracking/?barcode=",
  mahex: "https://mahex.com/tracking?code=",
  chapar: "https://chapar.asia/tracking/?tracking_code=",
  snapbox: "https://snapp-box.com/tracking?code=",
};

const CARRIER_NAMES: Record<string, string> = {
  post: "پست پیشتاز",
  tipax: "تیپاکس",
  mahex: "ماهکس",
  chapar: "چاپار",
  snapbox: "اسنپ‌باکس",
  other: "سرویس ارسال",
};

export default async function TrackingPublicPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const decoded = decodeURIComponent(code).replace(/\s/g, "");
  if (!decoded || decoded.length < 4) notFound();

  const rows = await db
    .select({ p: parcels, u: users })
    .from(parcels)
    .innerJoin(users, eq(parcels.userId, users.id))
    .where(eq(parcels.code, decoded))
    .limit(1);

  const row = rows[0];
  if (!row) notFound();

  const { p, u } = row;
  const carrierName = CARRIER_NAMES[p.carrier] ?? p.carrier;
  const carrierUrl = CARRIER_URLS[p.carrier];
  const trackUrl = carrierUrl ? `${carrierUrl}${encodeURIComponent(p.code)}` : null;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-night-950 px-4 py-12">
      <div className="pointer-events-none fixed inset-0 pattern-star opacity-60" />
      <div className="pointer-events-none fixed -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="card overflow-hidden p-6 text-center">
          {/* business header */}
          <div className="flex flex-col items-center gap-3">
            {u.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.logoUrl} alt="" className="h-16 w-16 rounded-2xl border border-white/10 object-cover" />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-400/25 to-brand-400/5 text-2xl font-black text-brand-200">
                {(u.businessName || u.name).slice(0, 1)}
              </span>
            )}
            <h1 className="text-lg font-black text-white">{u.businessName || u.name}</h1>
            {u.phone && <p className="text-[11px] text-slate-400">تلفن: {u.phone}</p>}
          </div>

          <div className="my-5 h-px bg-white/8" />

          {/* tracking info */}
          <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl bg-brand-400/15 text-brand-300">
            <Truck size={22} />
          </span>
          <h2 className="mt-3 text-sm font-bold text-slate-300">ردیابی مرسوله</h2>

          <div className="mt-4 rounded-2xl bg-white/4 px-5 py-4">
            <p className="text-xs text-slate-400">بارکد</p>
            <p className="mt-1 text-xl font-black tracking-[0.2em] text-white" dir="ltr">
              {p.code}
            </p>
            <p className="mt-2 text-xs text-slate-400">باربری: <span className="font-bold text-slate-200">{carrierName}</span></p>
            {p.customerName && (
              <p className="mt-1 text-xs text-slate-400">
                گیرنده: <span className="font-bold text-slate-200">{p.customerName}</span>
              </p>
            )}
            {p.note && <p className="mt-2 break-anywhere text-[11px] leading-5 text-slate-500">{p.note}</p>}
          </div>

          {trackUrl && (
            <a
              href={trackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-5 w-full justify-center"
            >
              <ExternalLink size={16} />
              مشاهده وضعیت ارسال در سایت {carrierName}
            </a>
          )}

          {!trackUrl && (
            <p className="mt-5 text-xs leading-6 text-slate-500">
              بارکد بالا را در سایت باربری وارد کنید تا وضعیت ارسال را مشاهده کنید.
            </p>
          )}
        </div>

        <div className="mt-6 text-center">
          <Logo withText size={28} />
          <p className="mt-2 text-[9px] text-slate-600">صادرشده با سامانه کاروانسرا</p>
        </div>
      </div>
    </div>
  );
}
