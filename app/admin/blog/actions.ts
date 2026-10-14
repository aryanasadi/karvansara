"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { storeImage } from "@/lib/uploads";
import { readingMinutes, slugify } from "@/lib/format";

export type PostResult = { error?: string; message?: string; id?: string; url?: string };

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

function touch(slug?: string) {
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/blog/${slug}`);
}

export async function savePostAction(fd: FormData): Promise<PostResult> {
  const admin = await requireAdmin();

  const title = String(fd.get("title") ?? "").trim();
  if (title.length < 3) return { error: "عنوان مقاله را کامل بنویس." };

  const content = String(fd.get("content") ?? "").trim();
  if (content.length < 20) return { error: "متن مقاله خیلی کوتاه است." };

  const id = String(fd.get("id") ?? "").trim();
  const rawSlug = String(fd.get("slug") ?? "").trim();
  let slug = slugify(rawSlug || title);
  if (!slug) slug = `post-${Date.now()}`;

  // ensure slug uniqueness
  const clash = await db
    .select({ id: posts.id })
    .from(posts)
    .where(id ? and(eq(posts.slug, slug), ne(posts.id, id)) : eq(posts.slug, slug))
    .limit(1);
  if (clash.length > 0) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const status = String(fd.get("status") ?? "draft") === "published" ? "published" : "draft";
  const excerpt = String(fd.get("excerpt") ?? "").trim() || content.replace(/[#>*_`]/g, "").slice(0, 160);

  const values = {
    slug,
    title,
    excerpt,
    content,
    coverUrl: String(fd.get("coverUrl") ?? "").trim(),
    category: String(fd.get("category") ?? "").trim(),
    tags: String(fd.get("tags") ?? "").trim(),
    status,
    seoTitle: String(fd.get("seoTitle") ?? "").trim(),
    seoDescription: String(fd.get("seoDescription") ?? "").trim(),
    readMinutes: readingMinutes(content),
    updatedAt: new Date(),
  };

  if (id) {
    const existing = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!existing[0]) return { error: "مقاله یافت نشد." };
    await db
      .update(posts)
      .set({
        ...values,
        publishedAt:
          status === "published" ? existing[0].publishedAt ?? new Date() : existing[0].publishedAt,
      })
      .where(eq(posts.id, id));
    touch(slug);
    return { id, message: "مقاله به‌روزرسانی شد.", url: `/blog/${slug}` };
  }

  const inserted = await db
    .insert(posts)
    .values({
      ...values,
      authorId: admin.id,
      publishedAt: status === "published" ? new Date() : null,
    })
    .returning({ id: posts.id });

  touch(slug);
  return { id: inserted[0]?.id, message: "مقاله ثبت شد.", url: `/blog/${slug}` };
}

export async function togglePostStatusAction(id: string): Promise<PostResult> {
  await requireAdmin();
  const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  const post = rows[0];
  if (!post) return { error: "مقاله یافت نشد." };
  const next = post.status === "published" ? "draft" : "published";
  await db
    .update(posts)
    .set({
      status: next,
      publishedAt: next === "published" ? post.publishedAt ?? new Date() : post.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));
  touch(post.slug);
  return { message: next === "published" ? "مقاله منتشر شد." : "مقاله به پیش‌نویس برگشت." };
}

export async function deletePostAction(id: string): Promise<PostResult> {
  await requireAdmin();
  const rows = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.id, id)).limit(1);
  await db.delete(posts).where(eq(posts.id, id));
  touch(rows[0]?.slug);
  return { message: "مقاله حذف شد." };
}

/** Cover image upload (admin only). */
export async function uploadCoverAction(fd: FormData): Promise<PostResult> {
  const admin = await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof File)) return { error: "فایلی انتخاب نشده است." };
  const res = await storeImage(admin.id, file);
  if (res.error) return { error: res.error };
  return { url: res.url };
}
