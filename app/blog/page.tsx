import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ArrowLeft, Clock, Eye, Newspaper, Home } from "lucide-react";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { Logo, Badge, EmptyState } from "@/components/ui";
import { faDate, faNum } from "@/lib/format";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "وبلاگ کاروانسرا — آموزش انبارداری، حسابداری و فروش آنلاین",
  description:
    "مقاله‌های کاربردی درباره انبارداری هوشمند، حسابداری کسب‌وکارهای کوچک، مدیریت فروشگاه ووکامرس و رشد کسب‌وکار ایرانی.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "وبلاگ کاروانسرا",
    description: "آموزش انبارداری، حسابداری و مدیریت فروشگاه اینترنتی",
    url: "/blog",
  },
};

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;

  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt))
    .limit(60);

  const list = tag ? rows.filter((p) => p.category === tag || p.tags.includes(tag)) : rows;
  const categories = Array.from(new Set(rows.map((p) => p.category).filter(Boolean)));
  const featured = list[0];
  const rest = list.slice(1);

  return (
    <div className="relative min-h-dvh bg-night-950">
      <div className="pointer-events-none fixed inset-0 pattern-star opacity-60" />
      <div className="pointer-events-none fixed -top-40 left-1/2 h-96 w-[680px] -translate-x-1/2 rounded-full bg-brand-500/8 blur-3xl" />

      <header className="sticky top-0 z-40 border-b border-white/5 bg-night-950/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3.5">
          <Link href="/">
            <Logo withText size={36} />
          </Link>
          <nav className="mr-auto flex items-center gap-2">
            <Link href="/" className="btn-soft px-3 py-2 text-xs">
              <Home size={14} />
              خانه
            </Link>
            <Link href="/register" className="btn-gold px-3.5 py-2 text-xs">
              ۷ روز رایگان
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <div className="text-center">
          <Badge tone="brand">
            <Newspaper size={12} />
            وبلاگ کاروانسرا
          </Badge>
          <h1 className="mt-4 text-2xl font-black leading-relaxed text-white sm:text-4xl">
            آموزش‌های کاربردی برای{" "}
            <span className="bg-gradient-to-l from-brand-300 to-gold-300 bg-clip-text text-transparent">
              رشد کسب‌وکار ایرانی
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-7 text-slate-400 sm:text-sm">
            انبارداری، حسابداری، ووکامرس و مدیریت فروش — تجربه‌های واقعی و راهنمای گام‌به‌گام.
          </p>
        </div>

        {categories.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Link
              href="/blog"
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                !tag ? "border-brand-400/50 bg-brand-400/12 text-brand-300" : "border-white/8 bg-white/3 text-slate-400 hover:text-slate-200"
              }`}
            >
              همه مقاله‌ها
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                href={`/blog?tag=${encodeURIComponent(c)}`}
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                  tag === c ? "border-brand-400/50 bg-brand-400/12 text-brand-300" : "border-white/8 bg-white/3 text-slate-400 hover:text-slate-200"
                }`}
              >
                {c}
              </Link>
            ))}
          </div>
        )}

        {list.length === 0 ? (
          <div className="mt-10">
            <EmptyState icon={Newspaper} title="هنوز مقاله‌ای منتشر نشده" hint="به‌زودی محتوای آموزشی اینجا منتشر می‌شود." />
          </div>
        ) : (
          <div className="mt-10 grid gap-6">
            {/* featured */}
            {featured && (
              <Link href={`/blog/${featured.slug}`} className="card group grid overflow-hidden transition hover:-translate-y-1 hover:border-brand-400/40 md:grid-cols-2">
                <div className="h-48 w-full overflow-hidden bg-white/4 md:h-full">
                  {featured.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.coverUrl} alt={featured.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <span className="grid h-full place-items-center text-slate-600">
                      <Newspaper size={34} />
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <Badge tone="gold">جدیدترین مقاله</Badge>
                  <h2 className="mt-3 text-lg font-black leading-8 text-white sm:text-xl">{featured.title}</h2>
                  <p className="mt-2 line-clamp-3 text-xs leading-7 text-slate-400">{featured.excerpt}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {faNum(featured.readMinutes)} دقیقه
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={11} />
                      {faNum(featured.views)}
                    </span>
                    <span>{faDate(featured.publishedAt)}</span>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-300">
                    ادامه مطلب
                    <ArrowLeft size={14} />
                  </span>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <Link key={p.id} href={`/blog/${p.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:border-brand-400/40">
                    <div className="h-36 w-full overflow-hidden bg-white/4">
                      {p.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.coverUrl} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                      ) : (
                        <span className="grid h-full place-items-center text-slate-600">
                          <Newspaper size={24} />
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      {p.category && <Badge tone="violet">{p.category}</Badge>}
                      <h3 className="mt-2 line-clamp-2 text-sm font-black leading-6 text-white">{p.title}</h3>
                      <p className="mt-1.5 line-clamp-2 flex-1 text-[11px] leading-5 text-slate-400">{p.excerpt}</p>
                      <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {faNum(p.readMinutes)} دقیقه
                        </span>
                        <span>{faDate(p.publishedAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <section className="card pattern-star-gold mt-12 overflow-hidden px-6 py-10 text-center">
          <h2 className="text-lg font-black text-white sm:text-xl">کسب‌وکارت را با کاروانسرا مرتب کن</h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-7 text-slate-400">
            انبارداری، فاکتور، فیش فروش، حسابداری و ووکامرس — همه در یک سامانه فارسی.
          </p>
          <Link href="/register" className="btn-gold mt-5">
            شروع رایگان ۷ روزه
          </Link>
        </section>
      </main>

      <footer className="relative border-t border-white/5 bg-night-900/60 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4">
          <Logo withText size={32} />
          <p className="text-[10px] text-slate-600">© {faNum(1404)} کاروانسرا</p>
        </div>
      </footer>

      {/* Blog listing structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "وبلاگ کاروانسرا",
            url: `${siteUrl()}/blog`,
            inLanguage: "fa-IR",
            blogPost: list.slice(0, 10).map((p) => ({
              "@type": "BlogPosting",
              headline: p.title,
              url: `${siteUrl()}/blog/${p.slug}`,
              datePublished: p.publishedAt?.toISOString(),
              description: p.excerpt,
            })),
          }),
        }}
      />
    </div>
  );
}
