"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, X, Upload } from "lucide-react";
import clsx from "clsx";
import { uploadImageAction } from "@/app/dashboard/actions";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_MB = 2;

/**
 * Image picker with instant preview + client-side format/size guard.
 * Files are stored in postgres through a server action and the resulting URL
 * is written into a hidden input, so the parent form stays a plain <form>.
 */
export function ImageUpload({
  name,
  defaultValue = "",
  label = "تصویر",
  hint,
  shape = "square",
}: {
  name: string;
  defaultValue?: string;
  label?: string;
  hint?: string;
  shape?: "square" | "circle";
}) {
  const [url, setUrl] = useState(defaultValue);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("فقط فرمت‌های JPG، PNG یا WEBP مجاز است.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`حجم تصویر باید کمتر از ${MAX_MB} مگابایت باشد.`);
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadImageAction(fd);
      if (res.error) setError(res.error);
      else if (res.url) setUrl(res.url);
    });
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold text-slate-300">{label}</span>
      <input type="hidden" name={name} value={url} readOnly />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className={clsx(
            "relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden border border-dashed border-white/15 bg-white/3 text-slate-500 transition hover:border-brand-400/50 hover:text-brand-300",
            shape === "circle" ? "rounded-full" : "rounded-2xl"
          )}
        >
          {pending ? (
            <Loader2 size={20} className="animate-spin text-brand-300" />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="پیش‌نمایش" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={22} />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={pending} className="btn-soft px-3 py-1.5 text-xs">
              <Upload size={13} />
              {url ? "تغییر تصویر" : "انتخاب تصویر"}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => {
                  setUrl("");
                  setError("");
                }}
                className="btn-soft border-crimson-400/30 px-3 py-1.5 text-xs text-crimson-300"
              >
                <X size={13} />
                حذف
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[10px] leading-5 text-slate-500">
            {hint ?? `فرمت‌های مجاز: JPG، PNG و WEBP · حداکثر ${MAX_MB} مگابایت`}
          </p>
          {error && <p className="mt-1 text-[10px] font-bold text-crimson-400">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
