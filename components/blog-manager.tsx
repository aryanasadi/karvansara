"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Newspaper,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Search,
  ExternalLink,
  Loader2,
  ImagePlus,
  Bold,
  Italic,
  Heading2,
  List,
  Quote,
  Link2,
  Save,
  Globe,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { Modal, Field, Notice } from "@/components/manager-ui";
import { EmptyState, Badge, SectionTitle, Stat } from "@/components/ui";
import { faNum, faDate, slugify } from "@/lib/format";
import {
  savePostAction,
  deletePostAction,
  togglePostStatusAction,
  uploadCoverAction,
  type PostResult,
} from "@/app/admin/blog/actions";

export type AdminPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  category: string;
  tags: string;
  status: string;
  seoTitle: string;
  seoDescription: string;
  readMinutes: number;
  views: number;
  publishedAt: string;
  updatedAt: string;
};

export function BlogManager({ initial }: { initial: AdminPost[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<null | { p?: AdminPost }>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<PostResult | null>(null);
  const [pending, start] = useTransition();

  const list = useMemo(() => {
    const q = search.trim();
    return initial.filter((p) => !q || p.title.includes(q) || p.category.includes(q) || p.tags.includes(q));
  }, [initial, search]);

  const stats = useMemo(
    () => ({
      published: initial.filter((p) => p.status === "published").length,
      drafts: initial.filter((p) => p.status !== "published").length,
      views: initial.reduce((s, p) => s + p.views, 0),
    }),
    [initial]
  );

  function run(fn: () => Promise<PostResult>, close = false) {
    start(async () => {
      const res = await fn();
      setNotice(res);
      if (!res.error && close) setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <SectionTitle
        title="وبلاگ و مقالات"
        subtitle="محتوای سئو بنویس تا کاروانسرا در گوگل بالا بیاید"
        action={
          <>
            <Link href="/blog" target="_blank" className="btn-soft">
              <ExternalLink size={15} />
              مشاهده وبلاگ
            </Link>
            <button onClick={() => setEditing({})} className="btn-gold">
              <Plus size={17} />
              مقاله تازه
            </button>
          </>
        }
      />

      {notice?.error && <Notice kind="error">{notice.error}</Notice>}
      {notice?.message && (
        <Notice kind="success">
          {notice.message}
          {notice.url && (
            <Link href={notice.url} target="_blank" className="mr-2 font-bold underline">
              مشاهده صفحه
            </Link>
          )}
        </Notice>
      )}

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat icon={Newspaper} tone="brand" label="منتشرشده" value={faNum(stats.published)} />
        <Stat icon={EyeOff} tone="gold" label="پیش‌نویس" value={faNum(stats.drafts)} />
        <Stat icon={Eye} tone="lapis" label="مجموع بازدید" value={faNum(stats.views)} />
      </section>

      <label className="relative block w-full sm:max-w-sm">
        <Search size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجو در مقاله‌ها…" className="field pr-10" />
      </label>

      {list.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="هنوز مقاله‌ای ننوشته‌ای"
          hint="با نوشتن مقاله‌های آموزشی درباره انبارداری، حسابداری و ووکامرس، ترافیک ارگانیک جذب کن."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <article key={p.id} className={clsx("card overflow-hidden", p.status !== "published" && "opacity-70")}>
              <div className="relative h-32 w-full overflow-hidden bg-white/4">
                {p.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-slate-600">
                    <Newspaper size={26} />
                  </span>
                )}
                <span className="absolute right-3 top-3">
                  <Badge tone={p.status === "published" ? "emerald" : "gold"}>
                    {p.status === "published" ? "منتشرشده" : "پیش‌نویس"}
                  </Badge>
                </span>
              </div>
              <div className="p-4">
                <h3 className="break-anywhere text-sm font-black leading-6 text-white">{p.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-slate-400">{p.excerpt}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                  {p.category && <Badge tone="violet">{p.category}</Badge>}
                  <span>{faNum(p.readMinutes)} دقیقه مطالعه</span>
                  <span>· {faNum(p.views)} بازدید</span>
                  {p.publishedAt && <span>· {faDate(p.publishedAt)}</span>}
                </div>
                <p className="mt-2 break-anywhere text-[10px] text-slate-600" dir="ltr">
                  /blog/{p.slug}
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <button onClick={() => setEditing({ p })} className="btn-soft flex-1 py-2 text-xs">
                    <Pencil size={13} />
                    ویرایش
                  </button>
                  <button
                    onClick={() => run(() => togglePostStatusAction(p.id))}
                    title={p.status === "published" ? "بازگشت به پیش‌نویس" : "انتشار"}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-brand-400/12 hover:text-brand-300"
                  >
                    {p.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <Link
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-lapis-400/12 hover:text-lapis-300"
                  >
                    <ExternalLink size={14} />
                  </Link>
                  <button
                    onClick={() => window.confirm(`مقاله «${p.title}» حذف شود؟`) && run(() => deletePostAction(p.id))}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-crimson-400/12 hover:text-crimson-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.p ? "ویرایش مقاله" : "مقاله تازه"} wide>
        {editing && <PostEditor key={editing.p?.id ?? "new"} post={editing.p} pending={pending} onSave={(fd) => run(() => savePostAction(fd), true)} />}
      </Modal>
    </div>
  );
}

function PostEditor({
  post,
  pending,
  onSave,
}: {
  post?: AdminPost;
  pending: boolean;
  onSave: (fd: FormData) => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [content, setContent] = useState(post?.content ?? "");
  const [cover, setCover] = useState(post?.coverUrl ?? "");
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [seoDesc, setSeoDesc] = useState(post?.seoDescription ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [inlineUploading, setInlineUploading] = useState(false);
  const [inlineErr, setInlineErr] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inlineRef = useRef<HTMLInputElement>(null);

  const effectiveSlug = slugTouched ? slug : slugify(title);

  function wrap(before: string, after = "") {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = content.slice(s, e) || "متن";
    const next = content.slice(0, s) + before + selected + after + content.slice(e);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  }

  function uploadCover(file: File | undefined) {
    if (!file) return;
    setUploadErr("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadErr("فقط JPG، PNG یا WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadErr("حجم باید کمتر از ۲ مگابایت باشد.");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    uploadCoverAction(fd).then((res) => {
      setUploading(false);
      if (res.error) setUploadErr(res.error);
      else if (res.url) setCover(res.url);
    });
  }

  /** Inserts text exactly at the caret (used by the inline image tool). */
  function insertAtCaret(snippet: string) {
    const el = areaRef.current;
    if (!el) {
      setContent((c) => c + snippet);
      return;
    }
    const { selectionStart: s, selectionEnd: e } = el;
    const next = content.slice(0, s) + snippet + content.slice(e);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = s + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }

  /** Uploads an image and drops a markdown image tag right where the caret is. */
  function insertInlineImage(file: File | undefined) {
    if (!file) return;
    setInlineErr("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setInlineErr("فقط JPG، PNG یا WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setInlineErr("حجم تصویر باید کمتر از ۲ مگابایت باشد.");
      return;
    }
    setInlineUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    uploadCoverAction(fd).then((res) => {
      setInlineUploading(false);
      if (res.error) setInlineErr(res.error);
      else if (res.url) insertAtCaret(`\n\n![${file.name.replace(/\.[^.]+$/, "")}](${res.url})\n\n`);
    });
  }

  const tools: { icon: typeof Bold; label: string; run: () => void }[] = [
    { icon: Heading2, label: "تیتر", run: () => wrap("\n## ", "\n") },
    { icon: Bold, label: "پررنگ", run: () => wrap("**", "**") },
    { icon: Italic, label: "مورب", run: () => wrap("*", "*") },
    { icon: List, label: "فهرست", run: () => wrap("\n- ") },
    { icon: Quote, label: "نقل‌قول", run: () => wrap("\n> ") },
    { icon: Link2, label: "پیوند", run: () => wrap("[", "](https://)") },
  ];

  return (
    <form
      action={(fd) => {
        if (post) fd.set("id", post.id);
        fd.set("slug", effectiveSlug);
        fd.set("content", content);
        fd.set("coverUrl", cover);
        fd.set("status", status);
        onSave(fd);
      }}
      className="grid gap-4"
    >
      <Field label="عنوان مقاله" hint="عنوان جذاب و شامل کلیدواژه اصلی">
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="field"
          placeholder="۷ اشتباه رایج در انبارداری فروشگاه‌های اینترنتی"
        />
      </Field>

      <Field label="نشانی صفحه (Slug)" hint="در نشانی مقاله استفاده می‌شود؛ خالی بگذاری خودکار از عنوان ساخته می‌شود">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[10px] text-slate-500" dir="ltr">
            /blog/
          </span>
          <input
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            dir="ltr"
            className="field text-left"
            placeholder="anbardari-eshtebahat"
          />
        </div>
      </Field>

      {/* cover */}
      <div>
        <span className="mb-1.5 block text-xs font-bold text-slate-300">تصویر شاخص</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid h-20 w-32 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/3 text-slate-500 hover:border-brand-400/50"
          >
            {uploading ? (
              <Loader2 size={18} className="animate-spin text-brand-300" />
            ) : cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus size={20} />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-soft px-3 py-1.5 text-xs">
                {cover ? "تغییر تصویر" : "بارگذاری تصویر"}
              </button>
              {cover && (
                <button type="button" onClick={() => setCover("")} className="btn-soft border-crimson-400/30 px-3 py-1.5 text-xs text-crimson-300">
                  حذف
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">JPG، PNG یا WEBP · حداکثر ۲ مگابایت · پیشنهادی ۱۲۰۰×۶۳۰</p>
            {uploadErr && <p className="mt-1 text-[10px] font-bold text-crimson-400">{uploadErr}</p>}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            uploadCover(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {/* editor */}
      <div>
        <span className="mb-1.5 block text-xs font-bold text-slate-300">متن مقاله</span>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={t.run}
              title={t.label}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/8 bg-white/4 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <t.icon size={14} />
            </button>
          ))}

          {/* inline image — inserts at the caret */}
          <button
            type="button"
            onClick={() => inlineRef.current?.click()}
            disabled={inlineUploading}
            title="درج تصویر در همین نقطه از متن"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-brand-400/30 bg-brand-400/10 px-2.5 text-[11px] font-bold text-brand-300 transition hover:bg-brand-400/20 disabled:opacity-50"
          >
            {inlineUploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
            درج تصویر در متن
          </button>

          <span className="mr-auto self-center text-[10px] text-slate-500">
            {faNum(content.trim().split(/\s+/).filter(Boolean).length)} واژه
          </span>
        </div>

        <input
          ref={inlineRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            insertInlineImage(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {inlineErr && <p className="mb-2 text-[10px] font-bold text-crimson-400">{inlineErr}</p>}
        <textarea
          ref={areaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={14}
          required
          className="field font-mono text-xs leading-7"
          placeholder={"## مقدمه\nمتن مقاله…\n\n- نکته اول\n- نکته دوم\n\n> جمله کلیدی"}
        />
        <p className="mt-1 text-[10px] leading-5 text-slate-500">
          پشتیبانی از Markdown: ‎## تیتر · **پررنگ** · *مورب* · - فهرست · &gt; نقل‌قول · [متن](لینک)
          <br />
          برای تصویر وسط متن، مکان‌نما را همان‌جا بگذار و دکمه «درج تصویر در متن» را بزن.
        </p>
      </div>

      <Field label="خلاصه مقاله" hint="در فهرست وبلاگ و نتایج گوگل دیده می‌شود">
        <textarea name="excerpt" rows={2} defaultValue={post?.excerpt} className="field" placeholder="در این مقاله می‌آموزیم…" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="دسته‌بندی">
          <input name="category" defaultValue={post?.category} className="field" placeholder="انبارداری" />
        </Field>
        <Field label="برچسب‌ها" hint="با ویرگول جدا کن">
          <input name="tags" defaultValue={post?.tags} className="field" placeholder="ووکامرس, حسابداری, فروشگاه" />
        </Field>
      </div>

      {/* SEO block */}
      <div className="rounded-2xl border border-white/8 bg-white/2 p-4">
        <h4 className="mb-3 flex items-center gap-2 text-xs font-black text-brand-300">
          <Globe size={14} />
          تنظیمات سئو
        </h4>
        <div className="grid gap-3">
          <Field label="عنوان سئو (Title)" hint="۵۰ تا ۶۰ نویسه؛ خالی بگذاری از عنوان مقاله استفاده می‌شود">
            <input name="seoTitle" defaultValue={post?.seoTitle} className="field" />
          </Field>
          <Field label="توضیح متا (Description)" hint={`${faNum(seoDesc.length)} از ۱۶۰ نویسه`}>
            <textarea
              name="seoDescription"
              rows={2}
              value={seoDesc}
              onChange={(e) => setSeoDesc(e.target.value.slice(0, 200))}
              className="field"
              placeholder="توضیح کوتاه و جذاب برای نتایج گوگل…"
            />
          </Field>
          {/* SERP preview */}
          <div className="rounded-xl bg-white p-3">
            <p className="truncate text-[13px] text-[#1a0dab]">{post?.seoTitle || title || "عنوان مقاله"}</p>
            <p className="truncate text-[11px] text-[#006621]" dir="ltr">
              example.ir/blog/{effectiveSlug || "slug"}
            </p>
            <p className="line-clamp-2 text-[11px] leading-5 text-[#545454]">
              {seoDesc || post?.excerpt || "توضیح متا اینجا نمایش داده می‌شود…"}
            </p>
          </div>
        </div>
      </div>

      {/* status */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["draft", "ذخیره پیش‌نویس"],
            ["published", "انتشار عمومی"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            className={clsx(
              "rounded-xl border py-2.5 text-xs font-bold transition",
              status === key
                ? key === "published"
                  ? "border-brand-400/50 bg-brand-400/12 text-brand-300"
                  : "border-gold-400/50 bg-gold-400/12 text-gold-300"
                : "border-white/8 bg-white/3 text-slate-400"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <button type="submit" disabled={pending} className="btn-gold w-full py-3">
        {pending ? <Loader2 size={16} className="animate-spin" /> : status === "published" ? <Sparkles size={16} /> : <Save size={16} />}
        {status === "published" ? "ذخیره و انتشار" : "ذخیره پیش‌نویس"}
      </button>
    </form>
  );
}
