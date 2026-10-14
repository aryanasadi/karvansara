import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  Globe,
  Camera,
  Send,
  MessageCircle,
  Phone,
  Mail,
  ShoppingBag,
  Link2,
  ExternalLink,
} from "lucide-react";
import { db } from "@/db";
import { bioLinks, bioPages, users } from "@/db/schema";
import { Logo } from "@/components/ui";
import clsx from "clsx";

export const dynamic = "force-dynamic";

const ICON_MAP: Record<string, typeof Link2> = {
  link: Link2,
  website: Globe,
  instagram: Camera,
  telegram: Send,
  whatsapp: MessageCircle,
  phone: Phone,
  email: Mail,
  shop: ShoppingBag,
};

const THEME_CLASSES: Record<string, { bg: string; text: string; sub: string; btn: string; border: string }> = {
  dark: { bg: "bg-night-950 pattern-star", text: "text-white", sub: "text-slate-400", btn: "bg-white/8 border-white/12 text-white hover:bg-white/15", border: "border-white/8" },
  light: { bg: "bg-gray-50", text: "text-gray-900", sub: "text-gray-500", btn: "bg-white border-gray-200 text-gray-800 hover:bg-gray-100 shadow-sm", border: "border-gray-200" },
  brand: { bg: "bg-gradient-to-b from-brand-600 to-night-950", text: "text-white", sub: "text-brand-200", btn: "bg-white/15 border-white/20 text-white hover:bg-white/25", border: "border-white/10" },
  gold: { bg: "bg-gradient-to-b from-gold-600 to-night-950", text: "text-white", sub: "text-gold-200", btn: "bg-white/15 border-white/20 text-white hover:bg-white/25", border: "border-white/10" },
};

async function loadBio(slug: string) {
  const rows = await db
    .select({ bio: bioPages, user: users })
    .from(bioPages)
    .innerJoin(users, eq(bioPages.userId, users.id))
    .where(eq(bioPages.slug, decodeURIComponent(slug)))
    .limit(1);
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const row = await loadBio(slug);
  if (!row) return { title: "صفحه یافت نشد", robots: { index: false } };
  return {
    title: `${row.bio.title || row.user.businessName || row.user.name} — کاروانسرا`,
    description: row.bio.bio || `صفحه لینک‌های ${row.bio.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function BioPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await loadBio(slug);
  if (!row) notFound();

  const { bio, user } = row;
  const links = await db.select().from(bioLinks).where(eq(bioLinks.bioId, bio.id)).orderBy(asc(bioLinks.sortOrder));
  const t = THEME_CLASSES[bio.theme] ?? THEME_CLASSES.dark;
  const isLight = bio.theme === "light";

  return (
    <div className={clsx("flex min-h-dvh flex-col items-center px-4 py-10", t.bg)}>
      <div className="flex flex-col items-center gap-3">
        {bio.showLogo && user.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.logoUrl} alt="" className={clsx("h-20 w-20 rounded-full border-2 object-cover", t.border)} />
        ) : (
          <span className={clsx("grid h-20 w-20 place-items-center rounded-full text-3xl font-black", isLight ? "bg-gray-200 text-gray-700" : "bg-white/10 text-white")}>
            {(bio.title || user.name).slice(0, 1)}
          </span>
        )}
        <h1 className={clsx("text-center text-xl font-black", t.text)}>{bio.title || user.businessName || user.name}</h1>
        {bio.bio && <p className={clsx("max-w-sm text-center text-sm leading-7", t.sub)}>{bio.bio}</p>}
      </div>

      <div className="mt-8 grid w-full max-w-md gap-3">
        {links.map((link) => {
          const Icon = ICON_MAP[link.icon] ?? Link2;
          return (
            <a key={link.id} href={`/go/${link.id}`} target="_blank" rel="noopener noreferrer noindex" className={clsx("flex items-center gap-3 rounded-2xl border px-5 py-4 transition", t.btn)}>
              <Icon size={20} className="shrink-0" />
              <span className="flex-1 text-sm font-bold">{link.label}</span>
              <ExternalLink size={15} className="shrink-0 opacity-40" />
            </a>
          );
        })}
      </div>

      <div className={clsx("mt-12 flex flex-col items-center gap-2", t.sub)}>
        <Logo size={24} />
        <p className="text-[9px]">ساخته‌شده با کاروانسرا</p>
      </div>
    </div>
  );
}
