"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Gift, Pencil, Loader2 } from "lucide-react";
import clsx from "clsx";
import { Modal, Field, Notice } from "@/components/manager-ui";
import { Badge, SectionTitle } from "@/components/ui";
import { faNum, formatToman } from "@/lib/format";
import { updatePlanAction, type AdminResult } from "@/app/admin/actions";

export type AdminPlanItem = {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  price: number;
  isTrial: boolean;
  isActive: boolean;
};

export function PlansManager({ initial }: { initial: AdminPlanItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminPlanItem | null>(null);
  const [notice, setNotice] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-6">
      <SectionTitle title="پلن‌های اشتراک" subtitle="قیمت، مدت و وضعیت نمایش هر پلن را تنظیم کن" />
      {notice?.error && <Notice kind="error">{notice.error}</Notice>}
      {notice?.message && <Notice kind="success">{notice.message}</Notice>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {initial.map((p) => (
          <div key={p.id} className={clsx("card p-5", !p.isActive && "opacity-55")}>
            <div className="flex items-start justify-between">
              <span
                className={clsx(
                  "grid h-11 w-11 place-items-center rounded-2xl",
                  p.isTrial ? "bg-gold-400/15 text-gold-300" : "bg-brand-400/15 text-brand-300"
                )}
              >
                {p.isTrial ? <Gift size={20} /> : <Crown size={20} />}
              </span>
              <Badge tone={p.isActive ? "emerald" : "crimson"}>{p.isActive ? "نمایش فعال" : "پنهان"}</Badge>
            </div>
            <h3 className="mt-4 font-black text-white">{p.name}</h3>
            <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-5 text-slate-400">{p.description}</p>
            <p className="mt-3 text-lg font-black tabular-nums text-gold-300">
              {formatToman(p.price)}
              <span className="mr-1.5 text-[10px] font-medium text-slate-500">/ {faNum(p.durationDays)} روز</span>
            </p>
            <button onClick={() => setEditing(p)} className="btn-soft mt-4 w-full">
              <Pencil size={14} />
              ویرایش پلن
            </button>
          </div>
        ))}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`ویرایش پلن ${editing?.name ?? ""}`}>
        {editing && (
          <PlanForm
            key={editing.id}
            plan={editing}
            pending={pending}
            onSubmit={(fd) =>
              start(async () => {
                fd.set("id", editing.id);
                const res = await updatePlanAction(fd);
                if (res.error) setNotice({ error: res.error });
                else {
                  setNotice({ message: res.message });
                  setEditing(null);
                }
                router.refresh();
              })
            }
          />
        )}
      </Modal>
    </div>
  );
}

function PlanForm({
  plan,
  pending,
  onSubmit,
}: {
  plan: AdminPlanItem;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  const [active, setActive] = useState(plan.isActive);
  return (
    <form
      action={(fd) => {
        fd.set("isActive", active ? "1" : "0");
        onSubmit(fd);
      }}
      className="grid gap-4"
    >
      <Field label="نام پلن">
        <input name="name" required defaultValue={plan.name} className="field" />
      </Field>
      <Field label="توضیح کوتاه">
        <input name="description" defaultValue={plan.description} className="field" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="مدت (روز)">
          <input name="durationDays" type="number" min={1} required defaultValue={plan.durationDays} className="field" />
        </Field>
        <Field label="قیمت (تومان)">
          <input name="price" type="number" min={0} required defaultValue={plan.price} className="field" disabled={plan.isTrial} />
          {plan.isTrial && <input type="hidden" name="price" value={0} />}
        </Field>
      </div>
      <button
        type="button"
        onClick={() => setActive((v) => !v)}
        className={clsx(
          "rounded-xl border px-4 py-3 text-right transition",
          active ? "border-brand-400/40 bg-brand-400/10" : "border-white/8 bg-white/3"
        )}
      >
        <span className={clsx("block text-xs font-black", active ? "text-brand-300" : "text-slate-400")}>
          {active ? "پلن نمایش داده می‌شود" : "پلن از فهرست پنهان است"}
        </span>
      </button>
      <button type="submit" disabled={pending} className="btn-gold w-full">
        {pending && <Loader2 size={16} className="animate-spin" />}
        ذخیره پلن
      </button>
    </form>
  );
}
