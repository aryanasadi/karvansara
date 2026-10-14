import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { ArrowRight, Clock, Eye, Calendar, Newspaper, Home, Tag } from "lucide-react";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { Logo, Badge } from "@/components/ui";
import { faDate, faNum } from "@/lib/format";
import { renderMarkdown, stripMarkdown } from "@/lib/markdown";
import { siteUrl, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

async function loadPost(slug: string) {
  const rows = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, decodeURIComponent(slug)), eq(posts.status, "published")))
    .limit(1);
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: "مقاله یافت نشد — کاروانسرا" };

  const title = post.seoTitle || `${post.title} | ${SITE_NAME}`;
  const description = post.seoDescription || post.excerpt || stripMarkdown(post.content);
  const url = `${siteUrl()}/blog/${post.slug}`;
  const images = post.coverUrl ? [{ url: post.coverUrl }] : undefined;

  return {
    title,
    description,
    keywords: post.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      images,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      siteName: SITE_NAME,
      locale: "fa_IR",
    },
    twitter: { card: "summary_large_image", title, description, images: post.coverUrl ? [post.coverUrl] : undefined },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  // best-effort view counter
  try {
    await db.update(posts).set({ views: sql`${posts.views} + 1` }).where(eq(posts.id, post.id));
  } catch {
    /* ignore */
  }

  const related = await db
    .select()
    .from(posts)
    .where(and(eq(posts.status, "published"), ne(posts.id, post.id)))
    .orderBy(desc(posts.publishedAt))
    .limit(3);

  const tags = post.tags.split(",").map((t) => t.trim()).filter(Boolean);
  const url = `${siteUrl()}/blog/${post.slug}`;

  return (
    <div className="relative min-h-dvh bg-night-950">
      <div className="pointer-events-none fixed inset-0 pattern-star opacity-60" />
      <div className="pointer-events-none fixed -top-40 left-1/2 h-96 w-[680px] -translate-x-1/2 rounded-full bg-brand-500/8 blur-3xl" />

      <header className="sticky top-0 z-40 border-b border-white/5 bg-night-950/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3.5">
          <Link href="/">
            <Logo withText size={36} />
          </Link>
          <nav className="mr-auto flex items-center gap-2">
            <Link href="/blog" className="btn-soft px-3 py-2 text-xs">
              <Newspaper size={14} />
              وبلاگ
            </Link>
            <Link href="/register" className="btn-gold px-3.5 py-2 text-xs">
              ۷ روز رایگان
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* breadcrumb */}
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <Link href="/" className="flex items-center gap-1 transition hover:text-brand-300">
            <Home size={11} />
            خانه
          </Link>
          <span>›</span>
          <Link href="/blog" className="transition hover:text-brand-300">
            وبلاگ
          </Link>
          {post.category && (
            <>
              <span>›</span>
              <Link href={`/blog?tag=${encodeURIComponent(post.category)}`} className="transition hover:text-brand-300">
                {post.category}
              </Link>
            </>
          )}
        </nav>

        <article>
          {post.category && <Badge tone="violet">{post.category}</Badge>}
          <h1 className="mt-3 text-2xl font-black leading-[1.7] text-white sm:text-3xl">{post.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/8 pb-5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              {faDate(post.publishedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              {faNum(post.readMinutes)} دقیقه مطالعه
            </span>
            <span className="flex items-center gap-1.5">
              <Eye size={12} />
              {faNum(post.views + 1)} بازدید
            </span>
          </div>

          {post.coverUrl && (
            <div className="mt-6 overflow-hidden rounded-3xl border border-white/8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.coverUrl} alt={post.title} className="w-full object-cover" />
            </div>
          )}

          {post.excerpt && (
            <p className="mt-6 rounded-2xl border-r-2 border-brand-400/50 bg-brand-400/5 px-4 py-3 text-sm leading-8 text-slate-300">
              {post.excerpt}
            </p>
          )}

          <div className="prose-fa mt-6 text-sm">{renderMarkdown(post.content)}</div>

          {tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-white/8 pt-6">
              <Tag size={13} className="text-slate-500" />
              {tags.map((t) => (
                <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`}>
                  <Badge tone="slate">{t}</Badge>
                </Link>
              ))}
            </div>
          )}
        </article>

        {/* CTA */}
        <section className="card pattern-star-gold mt-10 overflow-hidden px-6 py-8 text-center">
          <h2 className="text-base font-black text-white sm:text-lg">همین امروز کسب‌وکارت را منظم کن</h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-7 text-slate-400">
            انبارداری، فاکتور و فیش فروش، حسابداری و اتصال ووکامرس؛ ۷ روز اول رایگان.
          </p>
          <Link href="/register" className="btn-gold mt-5">
            شروع رایگان
          </Link>
        </section>

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-sm font-black text-white">مقاله‌های مرتبط</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link key={r.id} href={`/blog/${r.slug}`} className="card p-4 transition hover:-translate-y-1 hover:border-brand-400/40">
                  <h3 className="line-clamp-2 text-xs font-black leading-6 text-white">{r.title}</h3>
                  <p className="mt-1.5 text-[10px] text-slate-500">
                    {faNum(r.readMinutes)} دقیقه · {faDate(r.publishedAt)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Link href="/blog" className="btn-soft mt-8">
          <ArrowRight size={15} />
          بازگشت به فهرست مقاله‌ها
        </Link>
      </main>

      <footer className="relative border-t border-white/5 bg-night-900/60 py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4">
          <Logo withText size={32} />
          <p className="text-[10px] text-slate-600">© {faNum(1404)} کاروانسرا</p>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.seoDescription || post.excerpt,
            image: post.coverUrl ? [post.coverUrl] : undefined,
            datePublished: post.publishedAt?.toISOString(),
            dateModified: post.updatedAt.toISOString(),
            inLanguage: "fa-IR",
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            publisher: { "@type": "Organization", name: SITE_NAME, url: siteUrl() },
            author: { "@type": "Organization", name: SITE_NAME },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "خانه", item: siteUrl() },
              { "@type": "ListItem", position: 2, name: "وبلاگ", item: `${siteUrl()}/blog` },
              { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
          }),
        }}
      />
    </div>
  );
}
