import { faNum } from "@/lib/format";
import clsx from "clsx";

/* ------------------------------- Progress ring ------------------------------ */

export function ProgressRing({
  value,
  size = 72,
  stroke = 7,
  color = "#2fd6c6",
  track = "rgba(255,255,255,0.08)",
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>
      <span className="absolute text-center text-[11px] font-black text-white">
        {faNum(v)}٪
        {label && <span className="block text-[9px] font-medium text-slate-400">{label}</span>}
      </span>
    </div>
  );
}

/* ---------------------------------- Donut ----------------------------------- */

export function Donut({
  segments,
  size = 168,
  stroke = 22,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  stroke?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          {total > 0 &&
            segments.map((s, i) => {
              const frac = s.value / total;
              const dash = Math.max(0.001, frac) * c - 2;
              const el = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-acc * c}
                  strokeLinecap="butt"
                />
              );
              acc += frac;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-base font-black tabular-nums text-white">{centerValue}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="grid w-full gap-1.5">
        {segments
          .filter((s) => s.value > 0)
          .map((s, i) => (
            <li key={i} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="tabular-nums font-bold text-slate-400">
                {total ? faNum(Math.round((s.value / total) * 100)) : 0}٪
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

/* --------------------------------- Bars chart -------------------------------- */

export function BarsChart({
  items,
  height = 210,
}: {
  items: { label: string; income: number; expense: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...items.flatMap((i) => [i.income, i.expense]));
  return (
    <div dir="ltr" className="w-full">
      <div className="flex items-end justify-between gap-3" style={{ height }}>
        {[...items].reverse().map((it, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div className="flex h-full w-full items-end justify-center gap-1.5">
              <div
                className="w-4 rounded-t-md bg-gradient-to-t from-brand-600 to-brand-300 transition-all duration-700"
                style={{ height: `${Math.max(2, (it.income / max) * 100)}%` }}
                title={`درآمد: ${faNum(it.income)}`}
              />
              <div
                className="w-4 rounded-t-md bg-gradient-to-t from-crimson-500/80 to-crimson-400 transition-all duration-700"
                style={{ height: `${Math.max(2, (it.expense / max) * 100)}%` }}
                title={`هزینه: ${faNum(it.expense)}`}
              />
            </div>
            <span dir="rtl" className="text-[10px] text-slate-500">
              {it.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-6 text-[11px] text-slate-400" dir="rtl">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-300" /> درآمد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-crimson-400" /> هزینه
        </span>
      </div>
    </div>
  );
}

/* ------------------------------- Sparkline-ish ------------------------------ */

export function MiniBars({
  values,
  className,
  color = "#2fd6c6",
}: {
  values: number[];
  className?: string;
  color?: string;
}) {
  const max = Math.max(1, ...values);
  return (
    <div className={clsx("flex items-end gap-1", className)}>
      {values.map((v, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full"
          style={{ height: `${Math.max(8, (v / max) * 100)}%`, background: color, opacity: 0.35 + (0.65 * v) / max }}
        />
      ))}
    </div>
  );
}
