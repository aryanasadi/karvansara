"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Save,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Pencil,
  Globe,
  Camera,
  MessageCircle,
  Phone,
  Mail,
  ShoppingBag,
  Link2,
  Loader2,
  Send,
  Palette,
} from "lucide-react";
import clsx from "clsx";
import { Modal, Field, SubmitButton, Notice } from "@/components/manager-ui";
import { SectionTitle, Badge } from "@/components/ui";
import { faNum, slugify } from "@/lib/format";
import {
  saveBioPageAction,
  saveBioLinkAction,
  deleteBioLinkAction,
  type BioResult,
} from "@/app/dashboard/biolink/actions";

export type BioData = {
  slug: string;
  title: string;
  bio: string;
  theme: string;
  showLogo: boolean;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
};

export type BioLinkItem = {
  id: string;
  label: string;
  url: string;
  icon: string;
  sortOrder: number;
  clicks: number;
};

const ICON_OPTIONS: { key: string; label: string; icon: typeof Link2 }[] = [
  { key: "link", label: "لینک عمومی", icon: Link2 },
  { key: "website", label: "وب‌سایت", icon: Globe },
  { key: "instagram", label: "اینستاگرام", icon: Camera },
  { key: "telegram", label: "تلگرام", icon: Send },
  { key: "whatsapp", label: "واتساپ", icon: MessageCircle },
  { key: "phone", label: "تماس", icon: Phone },
  { key: "email", label: "ایمیل", icon: Mail },
  { key: "shop", label: "فروشگاه", icon: ShoppingBag },
];

const ICON_MAP: Record<string, typeof Link2> = Object.fromEntries(ICON_OPTIONS.map((o) => [o.key, o.icon]));

const THEMES: { key: string; label: string; bg: string }[] = [
  { key: "dark", label: "تیره", bg: "bg-night-950" },
  { key: "light", label: "روشن", bg: "bg-white" },
  { key: "brand", label: "فیروزه‌ای", bg: "bg-brand-600" },
  { key: "gold", label: "زرین", bg: "bg-gold-600" },
];

export function BioManager({
  bio,
  links,
  base,
}: {
  bio: BioData;
  links: BioLinkItem[];
  base: string;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(bio.slug);
  const [linkModal, setLinkModal] = useState<null | { l?: BioLinkItem }>(null);
  const [notice, setNotice] = useState<BioResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const fullUrl = slug ? `${base}/k/${slug}` : "";

  function run(fn: () => Promise<BioResult>, close = false) {
    start(async () => {
      const res = await fn();
      if (res?.error) setNotice({ error: res.error });
      else {
        setNotice(res?.message ? res : null);
        if (res?.slug) setSlug(res.slug);
        if (close) setLinkModal(null);
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 w-full max-w-full overflow-x-hidden">
      <SectionTitle
        title="کاروانسرای تو"
        subtitle="صفحه لینک‌ها — مثل زیلینک، با لوگو و رنگ کسب‌وکارت؛ بگذار بایو اینستاگرام"
        action={
          fullUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(fullUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="btn-soft text-xs"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "کپی شد" : "کپی لینک"}
              </button>
              <a href={fullUrl} target="_blank" rel="noreferrer" className="btn-primary text-xs">
                <ExternalLink size={14} />
                مشاهده صفحه
              </a>
            </div>
          ) : null
        }
      />

      {notice?.error && <Notice kind="error">{notice.error}</Notice>}
      {notice?.message && <Notice kind="success">{notice.message}</Notice>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* settings */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-black text-white">
            <Palette size={17} className="text-gold-300" />
            تنظیمات صفحه
          </h2>
          <form
            action={(fd) => run(() => saveBioPageAction(fd))}
            className="grid gap-4"
          >
            <Field label="نشانی صفحه (Slug)" hint={fullUrl ? `لینک نهایی: ${fullUrl}` : "مثلاً: myshop → domain.ir/@myshop"}>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] text-slate-500" dir="ltr">@</span>
                <input
                  name="slug"
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  dir="ltr"
                  className="field text-left"
                  placeholder="myshop"
                />
              </div>
            </Field>
            <Field label="عنوان نمایشی">
              <input name="title" defaultValue={bio.title} className="field" placeholder="نام کسب‌وکار" />
            </Field>
            <Field label="توضیح کوتاه">
              <textarea name="bio" rows={2} defaultValue={bio.bio} className="field" placeholder="فروش آنلاین قهوه تخصصی ☕" />
            </Field>
            <Field label="تم رنگی">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {THEMES.map((t) => (
                  <label key={t.key} className="cursor-pointer">
                    <input type="radio" name="theme" value={t.key} defaultChecked={bio.theme === t.key} className="peer sr-only" />
                    <span className={clsx(
                      "block rounded-xl border-2 px-2 py-2 text-center text-[10px] font-bold transition peer-checked:border-brand-400 peer-checked:ring-2 peer-checked:ring-brand-400/30",
                      "border-white/10",
                    )}>
                      <span className={clsx("mx-auto mb-1 block h-5 w-5 rounded-full", t.bg)} />
                      {t.label}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
              <input type="checkbox" name="showLogo" value="1" defaultChecked={bio.showLogo} className="h-4 w-4 accent-brand-400" />
              <span className="text-[11px] leading-5 text-slate-300">نمایش لوگوی کسب‌وکار</span>
            </label>
            <button type="submit" disabled={pending} className="btn-gold w-full">
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              ذخیره صفحه
            </button>
          </form>
        </section>

        {/* links */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-black text-white">
              <Link2 size={17} className="text-brand-300" />
              لینک‌ها
            </h2>
            <button onClick={() => setLinkModal({})} className="btn-soft text-xs">
              <Plus size={14} />
              لینک تازه
            </button>
          </div>

          {links.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-[11px] text-slate-500">
              هنوز لینکی نداری؛ اینستاگرام، تلگرام، سایت و شماره تماست را اضافه کن.
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {links.map((l) => {
                const Icon = ICON_MAP[l.icon] ?? Link2;
                return (
                  <li key={l.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 rounded-xl bg-white/3 p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-400/12 text-brand-300">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white">{l.label}</p>
                      <p className="truncate text-[10px] text-slate-500" dir="ltr">{l.url}</p>
                    </div>
                    <span className="text-[10px] tabular-nums text-slate-500">{faNum(l.clicks)} کلیک</span>
                    <button
                      onClick={() => setLinkModal({ l })}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-400 hover:bg-gold-400/12 hover:text-gold-300"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => window.confirm(`لینک «${l.label}» حذف شود؟`) && run(() => deleteBioLinkAction(l.id))}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-400 hover:bg-crimson-400/12 hover:text-crimson-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Modal open={linkModal !== null} onClose={() => setLinkModal(null)} title={linkModal?.l ? "ویرایش لینک" : "لینک تازه"}>
        <form
          action={(fd) => {
            if (linkModal?.l) fd.set("id", linkModal.l.id);
            run(() => saveBioLinkAction(fd), true);
          }}
          className="grid gap-4"
        >
          <Field label="عنوان">
            <input name="label" required defaultValue={linkModal?.l?.label} className="field" placeholder="مثلاً: پیج اینستاگرام" />
          </Field>
          <Field label="لینک / شماره" hint="برای تلفن: tel:09120000000 · برای ایمیل: mailto:you@x.com">
            <input name="url" required dir="ltr" defaultValue={linkModal?.l?.url} className="field text-left" placeholder="https://instagram.com/myshop" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="آیکون">
              <select name="icon" className="field" defaultValue={linkModal?.l?.icon ?? "link"}>
                {ICON_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="ترتیب نمایش">
              <input name="sortOrder" type="number" min={0} defaultValue={linkModal?.l?.sortOrder ?? links.length} className="field" />
            </Field>
          </div>
          <SubmitButton pending={pending} className="w-full">ذخیره لینک</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
