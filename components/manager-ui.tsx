"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

/* ---------------------------------- Modal ---------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-night-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={clsx(
          "card relative my-8 w-full border-white/12 bg-night-850 p-6 shadow-2xl shadow-black/60",
          wide ? "max-w-2xl" : "max-w-md"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="بستن"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------- Field ---------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}

/* ------------------------------- Submit button ------------------------------ */

export function SubmitButton({
  pending,
  children,
  variant = "primary",
  className,
}: {
  pending: boolean;
  children: React.ReactNode;
  variant?: "primary" | "gold";
  className?: string;
}) {
  return (
    <button type="submit" disabled={pending} className={clsx(variant === "gold" ? "btn-gold" : "btn-primary", className)}>
      {pending && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ---------------------------------- Notice ---------------------------------- */

export function Notice({
  kind = "info",
  children,
}: {
  kind?: "info" | "error" | "success";
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-lapis-400/30 bg-lapis-400/10 text-lapis-200",
    error: "border-crimson-400/30 bg-crimson-400/10 text-crimson-200",
    success: "border-brand-400/30 bg-brand-400/10 text-brand-200",
  } as const;
  const icons = {
    info: AlertTriangle,
    error: AlertTriangle,
    success: CheckCircle2,
  } as const;
  const Icon = icons[kind];
  return (
    <div className={clsx("flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs leading-6", tones[kind])}>
      <Icon size={15} className="mt-1 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/* --------------------------------- useBusy ---------------------------------- */

export function useBusy() {
  const [busy, setBusy] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );
  return {
    busy,
    run: async (key: string, fn: () => Promise<void>) => {
      setBusy(key);
      try {
        await fn();
      } finally {
        if (mounted.current) setBusy(null);
      }
    },
  };
}
