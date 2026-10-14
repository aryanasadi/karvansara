"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { buildChallenge, buildToken, type CaptchaChallenge } from "@/lib/captcha";

export function HumanCheck({ inputName = "captcha" }: { inputName?: string }) {
  const [checked, setChecked] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => setChallenge(buildChallenge()), []);

  const refresh = () => {
    setChallenge(buildChallenge());
    setWrong(false);
    setToken("");
    setSolved(false);
    setChecked(true);
  };

  const pick = (key: string) => {
    if (!challenge) return;
    if (key === challenge.tokenTag) {
      setToken(buildToken(key));
      setSolved(true);
      setWrong(false);
    } else {
      setWrong(true);
      setTimeout(refresh, 900);
    }
  };

  return (
    <div className="grid gap-3">
      <input type="hidden" name={inputName} value={token} readOnly />

      {solved ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-brand-400/40 bg-brand-400/10 px-4 py-3">
          <CheckCircle2 size={18} className="text-brand-300" />
          <span className="text-xs font-bold text-brand-200">تأیید شد؛ انسان خوش آمدی!</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setChecked(true)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/3 px-4 py-3 transition hover:border-brand-400/40"
        >
          <span className="flex items-center gap-3">
            <span className={clsx("grid h-6 w-6 place-items-center rounded-md border-2 transition", checked ? "border-brand-400 bg-brand-400/20" : "border-white/25")}>
              {checked && <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />}
            </span>
            <span className="text-xs font-bold text-slate-200">من ربات نیستم</span>
          </span>
          <ShieldCheck size={18} className="text-brand-300" />
        </button>
      )}

      {checked && !solved && challenge && (
        <div className="rounded-xl border border-white/10 bg-white/3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-200">{challenge.question}</p>
            <button type="button" onClick={refresh} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-white/8 hover:text-white" aria-label="سؤال تازه">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {challenge.options.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => pick(o.key)}
                className="h-10 rounded-xl border-2 border-transparent transition hover:scale-105 hover:border-white/40"
                style={{ backgroundColor: o.swatch }}
                aria-label="انتخاب رنگ"
              />
            ))}
          </div>
          {wrong && <p className="mt-2 text-center text-[10px] font-bold text-crimson-400">اشتباه بود؛ سؤال تازه بده…</p>}
        </div>
      )}
    </div>
  );
}
