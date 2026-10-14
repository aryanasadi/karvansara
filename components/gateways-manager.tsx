"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  KeyRound,
  Globe,
  Save,
  Eye,
  EyeOff,
  Loader2,
  CreditCard,
  Zap,
  Copy,
  Check,
} from "lucide-react";
import clsx from "clsx";
import { Field, Notice } from "@/components/manager-ui";
import { Badge, SectionTitle } from "@/components/ui";
import { updateGatewayAction, type AdminResult } from "@/app/admin/actions";

export type GatewaySettingItem = {
  gateway: "zarinpal" | "zibal" | "variza" | "aban" | "manual_card";
  label: string;
  merchantId: string;
  webhookSecret: string;
  cardNumber: string;
  cardHolder: string;
  bankName: string;
  isActive: boolean;
  isSandbox: boolean;
};

export function GatewaysManager({ initial }: { initial: GatewaySettingItem[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Record<string, AdminResult>>({});
  const [origin, setOrigin] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => setOrigin(window.location.origin), []);

  function save(gateway: string, fd: FormData) {
    start(async () => {
      fd.set("gateway", gateway);
      const res = await updateGatewayAction(fd);
      setNotice((n) => ({ ...n, [gateway]: res }));
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <SectionTitle title="درگاه‌های پرداخت" subtitle="درگاه بانکی، کارت‌به‌کارت خودکار (واریزا) و کارت‌به‌کارت دستی" />

      <div className="grid gap-6 lg:grid-cols-2">
        {initial.map((g) => (
          <GatewayCard
            key={g.gateway}
            item={g}
            pending={pending}
            origin={origin}
            notice={notice[g.gateway]}
            onSave={(fd) => save(g.gateway, fd)}
          />
        ))}
      </div>
    </div>
  );
}

function GatewayCard({
  item,
  pending,
  origin,
  notice,
  onSave,
}: {
  item: GatewaySettingItem;
  pending: boolean;
  origin: string;
  notice?: AdminResult;
  onSave: (fd: FormData) => void;
}) {
  const [active, setActive] = useState(item.isActive);
  const [sandbox, setSandbox] = useState(item.isSandbox);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState("");

  const isVariza = item.gateway === "variza";
  const isAban = item.gateway === "aban";
  const isAutoCard = isVariza || isAban;
  const isManual = item.gateway === "manual_card";
  const isBank = item.gateway === "zarinpal" || item.gateway === "zibal";

  const callbackUrl = isVariza
    ? `${origin}/api/payment/variza`
    : isAban
      ? `${origin}/api/payment/aban`
      : `${origin}/api/payment/callback?gateway=${item.gateway}`;

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(""), 1500);
  };

  const tone = isAutoCard ? "violet" : isManual ? "lapis" : "gold";
  const toneClass = {
    violet: "from-violet-400/20 to-violet-400/5 text-violet-300",
    lapis: "from-lapis-400/20 to-lapis-400/5 text-lapis-300",
    gold: "from-gold-400/20 to-gold-400/5 text-gold-300",
  }[tone];

  const configured = isManual ? Boolean(item.cardNumber) : Boolean(item.merchantId);

  return (
    <div className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br sm:h-12 sm:w-12", toneClass)}>
            {isManual ? <CreditCard size={21} /> : isAutoCard ? <Zap size={21} /> : <Landmark size={21} />}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-black text-white">{item.label}</span>
            <span className="mt-0.5 block truncate text-[10px] text-slate-500" dir="ltr">
              {item.gateway === "zarinpal"
                ? "zarinpal.com"
                : item.gateway === "zibal"
                  ? "zibal.ir"
                  : isVariza
                    ? "variza.ir"
                    : isAban
                      ? "abangateway.ir"
                      : "بدون درگاه بانکی"}
            </span>
          </span>
        </span>
        <Badge tone={active && configured ? "emerald" : "crimson"}>{active && configured ? "پذیرش پرداخت" : "غیرفعال"}</Badge>
      </div>

      {notice?.error && <div className="mb-4"><Notice kind="error">{notice.error}</Notice></div>}
      {notice?.message && <div className="mb-4"><Notice kind="success">{notice.message}</Notice></div>}

      <form
        action={(fd) => {
          fd.set("isActive", active ? "1" : "0");
          fd.set("isSandbox", sandbox ? "1" : "0");
          onSave(fd);
        }}
        className="grid gap-4"
      >
        {/* bank gateways + variza share the key field */}
        {!isManual && (
          <Field
            label={isVariza ? "کلید API واریزا" : isAban ? "توکن API آبان گیت وی" : "مرچنت‌کد (Merchant ID)"}
            hint={
              isVariza
                ? "از پنل واریزا ← پروفایل ← کلید API بسازید. کلید فقط یک‌بار نمایش داده می‌شود."
                : isAban
                  ? "از پنل آبان گیت وی. توکن تست با ag_test_ شروع می‌شود و پولی جابه‌جا نمی‌کند."
                  : item.gateway === "zarinpal"
                    ? "کد ۳۶ کاراکتری زرین‌پال"
                    : "برای تست مقدار «zibal» را بگذار."
            }
          >
            <div className="relative">
              <KeyRound size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                name="merchantId"
                type={show ? "text" : "password"}
                defaultValue={item.merchantId}
                dir="ltr"
                className="field pl-10 pr-11 text-left"
                placeholder={isVariza ? "API Key" : isAban ? "ag_live_… یا ag_test_…" : "xxxxxxxx-xxxx-xxxx"}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
        )}

        {isVariza && (
          <>
            <Field label="کلید امضای وب‌هوک (Webhook Secret)" hint="برای تأیید امضای HMAC-SHA256 پیام‌های واریزا لازم است">
              <input name="webhookSecret" type="password" defaultValue={item.webhookSecret} dir="ltr" className="field text-left" placeholder="webhook_secret" />
            </Field>
            <Field label="۴ رقم آخر کارت مقصد (اختیاری)" hint="خالی بگذاری، واریزا خودش کارت را انتخاب می‌کند">
              <input name="cardNumber" defaultValue={item.cardNumber} dir="ltr" className="field text-left" placeholder="5678" />
            </Field>
          </>
        )}

        {isAban && (
          <Field label="کلید امضای وب‌هوک (Webhook Secret)" hint="از پنل آبان گیت وی: تنظیمات ← وبهوک. برای اعتبارسنجی هدر X-Signature لازم است.">
            <input name="webhookSecret" type="password" defaultValue={item.webhookSecret} dir="ltr" className="field text-left" placeholder="webhook secret" />
          </Field>
        )}

        {isManual && (
          <>
            <Field label="شماره کارت">
              <input name="cardNumber" defaultValue={item.cardNumber} dir="ltr" required className="field text-left tracking-widest" placeholder="6037991234567890" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="نام صاحب کارت">
                <input name="cardHolder" defaultValue={item.cardHolder} className="field" placeholder="محمد رضایی" />
              </Field>
              <Field label="نام بانک">
                <input name="bankName" defaultValue={item.bankName} className="field" placeholder="بانک ملی" />
              </Field>
            </div>
            <Notice kind="info">
              کاربر مبلغ را کارت‌به‌کارت می‌کند، تصویر رسید را آپلود می‌کند و پرداخت در بخش «پرداخت‌ها» منتظر تأیید شما می‌ماند.
            </Notice>
          </>
        )}

        {/* toggles */}
        <div className={clsx("grid gap-3", isBank ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
          <button
            type="button"
            onClick={() => setActive((v) => !v)}
            className={clsx(
              "rounded-xl border px-4 py-3 text-right transition",
              active ? "border-brand-400/40 bg-brand-400/10" : "border-white/8 bg-white/3"
            )}
          >
            <span className={clsx("block text-xs font-black", active ? "text-brand-300" : "text-slate-400")}>
              {isManual ? "فعال‌سازی کارت‌به‌کارت" : "فعال‌سازی درگاه"}
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-500">
              {active ? "در فهرست روش‌های پرداخت نمایش داده می‌شود" : "برای کاربران نمایش داده نمی‌شود"}
            </span>
          </button>

          {isBank && (
            <button
              type="button"
              onClick={() => setSandbox((v) => !v)}
              className={clsx(
                "rounded-xl border px-4 py-3 text-right transition",
                sandbox ? "border-gold-400/40 bg-gold-400/10" : "border-white/8 bg-white/3"
              )}
            >
              <span className={clsx("block text-xs font-black", sandbox ? "text-gold-300" : "text-slate-400")}>حالت آزمایشی</span>
              <span className="mt-0.5 block text-[10px] text-slate-500">
                {item.gateway === "zarinpal"
                  ? sandbox
                    ? "sandbox.zarinpal.com"
                    : "درگاه واقعی زرین‌پال"
                  : sandbox
                    ? "مرچنت تست زیبال"
                    : "پرداخت واقعی زیبال"}
              </span>
            </button>
          )}
        </div>

        {/* callback url */}
        {!isManual && (
          <div className="grid gap-1.5 rounded-xl bg-white/3 px-4 py-3 text-[10px] text-slate-500">
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Globe size={12} />
                {isAutoCard ? "نشانی وب‌هوک:" : "نشانی بازگشت (Callback):"}
              </span>
              <button
                type="button"
                onClick={() => copy(callbackUrl, item.gateway)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
              >
                {copied === item.gateway ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </span>
            <span dir="ltr" className="break-anywhere font-mono text-[9px] leading-4 text-slate-400 sm:text-[10px]">
              {callbackUrl}
            </span>
            {isVariza && (
              <span className="leading-5 text-slate-500">
                این نشانی را در پروفایل واریزا ثبت کن؛ وگرنه ساخت لینک پرداخت با خطای ۴۲۲ روبه‌رو می‌شود.
              </span>
            )}
            {isAban && (
              <span className="leading-5 text-slate-500">
                آبان گیت وی این نشانی را هنگام ساخت هر فاکتور می‌گیرد؛ فقط کافی است کلید امضا را درست وارد کنی.
              </span>
            )}
          </div>
        )}

        <button type="submit" disabled={pending} className="btn-gold w-full">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          ذخیره تنظیمات
        </button>
      </form>
    </div>
  );
}
