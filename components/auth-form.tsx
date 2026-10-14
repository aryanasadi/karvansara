"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, ArrowLeft, Loader2, Smartphone, Send, KeyRound } from "lucide-react";
import {
  loginAction,
  registerAction,
  requestOtpAction,
  verifyOtpAction,
  type AuthState,
  type OtpState,
} from "@/app/(auth)/actions";
import { HumanCheck } from "@/components/human-check";

const initial: AuthState = {};

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-crimson-400/30 bg-crimson-400/10 px-4 py-2.5 text-xs leading-6 text-crimson-200">
      {message}
    </p>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="relative block">
        <Mail size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          name="email"
          type="email"
          dir="ltr"
          required
          placeholder="you@example.com"
          className="field pr-11 text-left"
        />
      </label>
      <label className="relative block">
        <Lock size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input name="password" type="password" required placeholder="گذرواژه" className="field pr-11" />
      </label>
      <HumanCheck />
      <ErrorBox message={state?.error} />
      <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <ArrowLeft size={18} />}
        ورود به کاروانسرا
      </button>
    </form>
  );
}

/** Two-step SMS login: request a code, then verify it. */
function SmsLoginForm() {
  const [sendState, sendAction, sending] = useActionState(requestOtpAction, {} as OtpState);
  const [verifyState, verifyAction, verifying] = useActionState(verifyOtpAction, {} as OtpState);
  const [phone, setPhone] = useState("");
  const sent = sendState?.sent || verifyState?.sent;

  return (
    <div className="grid gap-4">
      <form action={sendAction} className="grid gap-3">
        <label className="relative block">
          <Smartphone size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            name="phone"
            dir="ltr"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09120000000"
            className="field pr-11 text-left"
          />
        </label>
        <button type="submit" disabled={sending} className="btn-soft w-full py-2.5">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {sent ? "ارسال دوباره کد" : "دریافت کد ورود"}
        </button>
      </form>

      {sendState?.message && (
        <p className="rounded-xl border border-brand-400/30 bg-brand-400/10 px-4 py-2.5 text-xs leading-6 text-brand-200">
          {sendState.message}
          {sendState.devCode && (
            <span className="mt-1 block font-black tracking-[0.3em] text-white" dir="ltr">
              {sendState.devCode}
            </span>
          )}
        </p>
      )}
      <ErrorBox message={sendState?.error} />

      {sent && (
        <form action={verifyAction} className="grid gap-3 border-t border-white/8 pt-4">
          <input type="hidden" name="phone" value={phone} />
          <label className="relative block">
            <KeyRound size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              name="code"
              dir="ltr"
              inputMode="numeric"
              maxLength={5}
              required
              placeholder="کد ۵ رقمی"
              className="field pr-11 text-center tracking-[0.4em]"
            />
          </label>
          <ErrorBox message={verifyState?.error} />
          <button type="submit" disabled={verifying} className="btn-primary w-full py-3 text-base">
            {verifying ? <Loader2 size={18} className="animate-spin" /> : <ArrowLeft size={18} />}
            تأیید و ورود
          </button>
        </form>
      )}
    </div>
  );
}

export function LoginForm({ smsEnabled = false }: { smsEnabled?: boolean }) {
  const [tab, setTab] = useState<"password" | "sms">("password");
  return (
    <Suspense>
      {smsEnabled && (
        <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-xl border border-white/8">
          {(
            [
              ["password", "ایمیل و گذرواژه"],
              ["sms", "ورود با پیامک"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-2.5 text-xs font-bold transition ${
                tab === key ? "bg-brand-400/15 text-brand-300" : "bg-white/3 text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {smsEnabled && tab === "sms" ? <SmsLoginForm /> : <LoginInner />}
    </Suspense>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);
  return (
    <form action={action} className="grid gap-4">
      <label className="relative block">
        <User size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input name="name" required placeholder="نام و نام خانوادگی" className="field pr-11" />
      </label>
      <label className="relative block">
        <Mail size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          name="email"
          type="email"
          dir="ltr"
          required
          placeholder="you@example.com"
          className="field pr-11 text-left"
        />
      </label>
      <label className="relative block">
        <Lock size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input name="password" type="password" required placeholder="گذرواژه (حداقل ۶ نویسه)" className="field pr-11" />
      </label>
      <HumanCheck />
      <ErrorBox message={state?.error} />
      <button type="submit" disabled={pending} className="btn-gold w-full py-3 text-base">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <ArrowLeft size={18} />}
        ساخت حساب و شروع ۷ روز رایگان
      </button>
      <p className="text-center text-[11px] leading-6 text-slate-500">
        با ساخت حساب، <Link href="/" className="text-brand-300 hover:underline">شرایط استفاده</Link> کاروانسرا را می‌پذیرید.
      </p>
    </form>
  );
}
