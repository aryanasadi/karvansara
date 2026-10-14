"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Building2, UserCog, KeyRound, Crown, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Field, Notice } from "@/components/manager-ui";
import { Badge, SectionTitle } from "@/components/ui";
import { faNum, faDate } from "@/lib/format";
import {
  updateProfileAction,
  updateLogoAction,
  removeLogoAction,
  changePasswordAction,
  type ProfileResult,
} from "@/app/dashboard/profile/actions";

export type ProfileData = {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  logoUrl: string;
  address: string;
  role: string;
  createdAt: string;
};

export function ProfileManager({
  profile,
  sub,
}: {
  profile: ProfileData;
  sub: { planName: string; isTrial: boolean; daysLeft: number; endsAt: string } | null;
}) {
  const router = useRouter();
  const [info, setInfo] = useState<ProfileResult | null>(null);
  const [pwd, setPwd] = useState<ProfileResult | null>(null);
  const [logoMsg, setLogoMsg] = useState<ProfileResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-6">
      <SectionTitle title="پروفایل و کسب‌وکار" subtitle="اطلاعات شما و برند کسب‌وکارتان؛ روی فاکتورها هم نمایش داده می‌شود" />

      {/* summary */}
      <section className="card pattern-star relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-brand-500/10 to-transparent" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-lapis-400/25 to-lapis-400/5 text-2xl font-black text-lapis-200">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logoUrl} alt="لوگو" className="h-full w-full object-cover" />
            ) : (
              profile.name.slice(0, 1)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="break-anywhere text-lg font-black text-white">{profile.businessName || profile.name}</h2>
            <p className="mt-0.5 break-anywhere text-[11px] text-slate-400" dir="ltr">
              {profile.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {profile.role === "admin" && (
                <Badge tone="gold">
                  <ShieldCheck size={11} />
                  مدیر سامانه
                </Badge>
              )}
              <Badge tone="slate">عضو از {faDate(profile.createdAt)}</Badge>
              {sub ? (
                <Badge tone={sub.isTrial ? "gold" : "brand"}>
                  <Crown size={11} />
                  {sub.isTrial ? "هدیه آشنایی" : sub.planName} · {faNum(sub.daysLeft)} روز مانده
                </Badge>
              ) : (
                <Badge tone="crimson">بدون اشتراک فعال</Badge>
              )}
            </div>
          </div>
          <Link href="/dashboard/subscription" className="btn-soft shrink-0 text-xs">
            مدیریت اشتراک
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* personal + business */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-black text-white">
            <UserCog size={17} className="text-brand-300" />
            اطلاعات شخصی و کسب‌وکار
          </h2>
          {info?.error && <div className="mb-3"><Notice kind="error">{info.error}</Notice></div>}
          {info?.message && <div className="mb-3"><Notice kind="success">{info.message}</Notice></div>}
          <form
            action={(fd) =>
              start(async () => {
                setInfo(await updateProfileAction(fd));
                router.refresh();
              })
            }
            className="grid gap-4"
          >
            <Field label="نام و نام خانوادگی">
              <input name="name" required defaultValue={profile.name} className="field" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ایمیل">
                <input name="email" type="email" dir="ltr" required defaultValue={profile.email} className="field text-left" />
              </Field>
              <Field label="موبایل" hint="برای ورود با پیامک استفاده می‌شود">
                <input name="phone" dir="ltr" defaultValue={profile.phone} className="field text-left" placeholder="09120000000" />
              </Field>
            </div>
            <Field label="نام کسب‌وکار" hint="روی سربرگ فاکتورها چاپ می‌شود">
              <div className="relative">
                <Building2 size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input name="businessName" defaultValue={profile.businessName} className="field pr-11" placeholder="فروشگاه چای لاهیجان" />
              </div>
            </Field>
            <Field label="نشانی">
              <textarea name="address" rows={2} defaultValue={profile.address} className="field" />
            </Field>
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              ذخیره اطلاعات
            </button>
          </form>
        </section>

        <div className="grid content-start gap-6">
          {/* logo */}
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-black text-white">
              <Building2 size={17} className="text-gold-300" />
              لوگوی کسب‌وکار
            </h2>
            {logoMsg?.error && <div className="mb-3"><Notice kind="error">{logoMsg.error}</Notice></div>}
            {logoMsg?.message && <div className="mb-3"><Notice kind="success">{logoMsg.message}</Notice></div>}
            <form
              action={(fd) =>
                start(async () => {
                  setLogoMsg(await updateLogoAction(fd));
                  router.refresh();
                })
              }
              className="grid gap-3"
            >
              <LogoPicker current={profile.logoUrl} />
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={pending} className="btn-gold flex-1">
                  {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  ذخیره لوگو
                </button>
                {profile.logoUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      start(async () => {
                        setLogoMsg(await removeLogoAction());
                        router.refresh();
                      })
                    }
                    className="btn-soft border-crimson-400/30 text-crimson-300"
                  >
                    <Trash2 size={14} />
                    حذف لوگو
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* password */}
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-black text-white">
              <KeyRound size={17} className="text-lapis-300" />
              تغییر گذرواژه
            </h2>
            {pwd?.error && <div className="mb-3"><Notice kind="error">{pwd.error}</Notice></div>}
            {pwd?.message && <div className="mb-3"><Notice kind="success">{pwd.message}</Notice></div>}
            <form
              action={(fd) =>
                start(async () => {
                  setPwd(await changePasswordAction(fd));
                })
              }
              className="grid gap-4"
            >
              <Field label="گذرواژه فعلی">
                <input name="currentPassword" type="password" required className="field" />
              </Field>
              <Field label="گذرواژه تازه" hint="حداقل ۶ نویسه">
                <input name="newPassword" type="password" required className="field" />
              </Field>
              <button type="submit" disabled={pending} className="btn-soft w-full">
                {pending ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                تغییر گذرواژه
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Wraps ImageUpload so the hidden input carries the uploaded file itself. */
function LogoPicker({ current }: { current: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(current);
  const [err, setErr] = useState("");

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/3 text-slate-500">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="لوگو" className="h-full w-full object-cover" />
          ) : (
            <Building2 size={22} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <input
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setErr("");
              if (f && f.size > 2 * 1024 * 1024) {
                setErr("حجم تصویر باید کمتر از ۲ مگابایت باشد.");
                return;
              }
              setFile(f);
              setPreview(f ? URL.createObjectURL(f) : current);
            }}
            className="block w-full text-[11px] text-slate-400 file:ml-3 file:rounded-xl file:border-0 file:bg-white/8 file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-slate-200 hover:file:bg-white/12"
          />
          <p className="mt-1.5 text-[10px] leading-5 text-slate-500">فرمت‌های مجاز: JPG، PNG و WEBP · حداکثر ۲ مگابایت</p>
          {err && <p className="mt-1 text-[10px] font-bold text-crimson-400">{err}</p>}
          {file && <p className="mt-1 truncate text-[10px] text-brand-300">{file.name}</p>}
        </div>
      </div>
    </div>
  );
}


