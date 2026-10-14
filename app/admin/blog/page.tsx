import { desc } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { BlogManager, type AdminPost } from "@/components/blog-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "وبلاگ و مقالات — پنل مدیریت" };

export default async function AdminBlogPage() {
  const rows = await db.select().from(posts).orderBy(desc(posts.updatedAt)).limit(200);

  const items: AdminPost[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    coverUrl: p.coverUrl,
    category: p.category,
    tags: p.tags,
    status: p.status,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    readMinutes: p.readMinutes,
    views: p.views,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : "",
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <BlogManager initial={items} />;
}
