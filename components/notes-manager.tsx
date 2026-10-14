"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, StickyNote, Quote, Pin, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Modal, Field, SubmitButton, Notice } from "@/components/manager-ui";
import { EmptyState, SectionTitle } from "@/components/ui";
import { faNum, faDate } from "@/lib/format";
import {
  addNoteAction,
  updateNoteAction,
  deleteNoteAction,
  toggleNotePinAction,
  type Result,
} from "@/app/dashboard/actions";

export type NoteItem = {
  id: string;
  kind: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  updatedAt: string;
};

const COLORS: Record<string, { card: string; dot: string; label: string }> = {
  gold: { card: "border-gold-400/25 bg-gradient-to-br from-gold-400/14 to-gold-400/3", dot: "bg-gold-400", label: "کهربایی" },
  brand: { card: "border-brand-400/25 bg-gradient-to-br from-brand-400/14 to-brand-400/3", dot: "bg-brand-400", label: "فیروزه‌ای" },
  lapis: { card: "border-lapis-400/25 bg-gradient-to-br from-lapis-400/14 to-lapis-400/3", dot: "bg-lapis-400", label: "لاجوردی" },
  crimson: { card: "border-crimson-400/25 bg-gradient-to-br from-crimson-400/14 to-crimson-400/3", dot: "bg-crimson-400", label: "لاکی" },
  violet: { card: "border-violet-400/25 bg-gradient-to-br from-violet-400/14 to-violet-400/3", dot: "bg-violet-400", label: "بنفش" },
};

export function NotesManager({ initial }: { initial: NoteItem[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"note" | "quote">("note");
  const [modal, setModal] = useState<{ mode: "add"; kind: "note" | "quote" } | { mode: "edit"; n: NoteItem } | null>(null);
  const [notice, setNotice] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  const list = useMemo(() => initial.filter((n) => n.kind === tab), [initial, tab]);
  const counts = useMemo(
    () => ({ note: initial.filter((n) => n.kind === "note").length, quote: initial.filter((n) => n.kind === "quote").length }),
    [initial]
  );

  function run(fn: () => Promise<Result>, close = true) {
    start(async () => {
      const res = await fn();
      if (res?.error) setNotice({ error: res.error });
      else {
        setNotice(null);
        if (close) setModal(null);
      }
      router.refresh();
    });
  }

  return (
    <div>
      <SectionTitle
        title="دفترچه مدیر"
        subtitle="یادداشت‌های کاری و جمله‌های انگیزشی خودت؛ فقط برای چشم تو"
        action={
          <button onClick={() => setModal({ mode: "add", kind: tab })} className="btn-gold">
            <Plus size={17} />
            {tab === "note" ? "یادداشت تازه" : "جمله انگیزشی تازه"}
          </button>
        }
      />

      {notice?.error && <div className="mb-4"><Notice kind="error">{notice.error}</Notice></div>}

      <div className="mb-6 flex overflow-hidden rounded-xl border border-white/8">
        <button
          onClick={() => setTab("note")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition",
            tab === "note" ? "bg-gold-400/15 text-gold-200" : "bg-white/3 text-slate-400 hover:text-slate-200"
          )}
        >
          <StickyNote size={16} />
          یادداشت‌ها ({faNum(counts.note)})
        </button>
        <button
          onClick={() => setTab("quote")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition",
            tab === "quote" ? "bg-gold-400/15 text-gold-200" : "bg-white/3 text-slate-400 hover:text-slate-200"
          )}
        >
          <Quote size={16} />
          جمله‌های انگیزشی ({faNum(counts.quote)})
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={tab === "note" ? StickyNote : Quote}
          title={tab === "note" ? "هنوز یادداشتی ننوشته‌ای" : "هنوز جمله‌ای ثبت نکرده‌ای"}
          hint={
            tab === "note"
              ? "نکته‌ها، ایده‌ها و تصمیم‌های کاری‌ات را همین‌جا برای خودت بنویس."
              : "جمله‌هایی که روز تو را می‌سازند را اینجا جمع کن؛ هر روز یکی‌شان روی داشبوردت می‌درخشد."
          }
        />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 [&>*]:mb-4">
          {list.map((n) => {
            const c = COLORS[n.color] ?? COLORS.gold;
            return (
              <article
                key={n.id}
                className={clsx("break-inside-avoid rounded-3xl border p-5 backdrop-blur transition hover:shadow-xl hover:shadow-black/20", c.card)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <span className={clsx("h-2 w-2 rounded-full", c.dot)} />
                    {n.kind === "quote" ? "جمله انگیزشی" : n.title || "یادداشت"}
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => run(() => toggleNotePinAction(n.id), false)}
                      className={clsx(
                        "grid h-7 w-7 place-items-center rounded-lg transition",
                        n.isPinned ? "text-gold-300" : "text-slate-500 hover:bg-white/8 hover:text-slate-300"
                      )}
                      title={n.isPinned ? "برداشتن سنجاق" : "سنجاق کردن"}
                    >
                      <Pin size={13} fill={n.isPinned ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => setModal({ mode: "edit", n })}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-gold-300"
                      title="ویرایش"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("این مورد حذف شود؟")) run(() => deleteNoteAction(n.id), false);
                      }}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-crimson-400/12 hover:text-crimson-400"
                      title="حذف"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                </div>
                {n.kind === "quote" ? (
                  <p className="mt-3 text-base font-black leading-8 text-white">«{n.content}»</p>
                ) : (
                  <>
                    {n.title && <h3 className="mt-2 font-black text-white">{n.title}</h3>}
                    <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-300">{n.content}</p>
                  </>
                )}
                <p className="mt-3 text-[10px] text-slate-500">{faDate(n.updatedAt)}</p>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "ویرایش" : "ثبت تازه"}>
        <NoteForm
          key={modal?.mode === "edit" ? modal.n.id : `add-${tab}`}
          note={modal?.mode === "edit" ? modal.n : undefined}
          defaultKind={modal?.mode === "add" ? modal.kind : "note"}
          pending={pending}
          onSubmit={(fd) => run(() => (modal?.mode === "edit" ? updateNoteAction(fd) : addNoteAction(fd)))}
        />
      </Modal>
    </div>
  );
}

function NoteForm({
  note,
  defaultKind,
  pending,
  onSubmit,
}: {
  note?: NoteItem;
  defaultKind: "note" | "quote";
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  const [kind, setKind] = useState<"note" | "quote">((note?.kind as "note" | "quote") ?? defaultKind);
  const [color, setColor] = useState(note?.color ?? "gold");
  return (
    <form
      action={(fd) => {
        fd.set("kind", kind);
        fd.set("color", color);
        if (note) fd.set("id", note.id);
        onSubmit(fd);
      }}
      className="grid gap-4"
    >
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["note", "یادداشت"],
            ["quote", "جمله انگیزشی"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setKind(key)}
            className={clsx(
              "rounded-xl border py-2.5 text-sm font-bold transition",
              kind === key ? "border-gold-400/50 bg-gold-400/12 text-gold-200" : "border-white/8 bg-white/3 text-slate-400"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {kind === "note" && (
        <Field label="عنوان (اختیاری)">
          <input name="title" defaultValue={note?.title} className="field" placeholder="مثلاً: ایده کمپین نوروزی" />
        </Field>
      )}
      <Field label={kind === "quote" ? "متن جمله" : "متن یادداشت"}>
        <textarea
          name="content"
          rows={kind === "quote" ? 3 : 5}
          required
          defaultValue={note?.content}
          className="field"
          placeholder={kind === "quote" ? "مثلاً: موفقیت مجموع تلاش‌های کوچکی است که هر روز تکرار می‌شوند." : "هر چه نباید فراموش شود…"}
        />
      </Field>
      <Field label="رنگ کارت">
        <div className="flex items-center gap-2.5">
          {Object.entries(COLORS).map(([key, c]) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              title={c.label}
              className={clsx(
                "h-8 w-8 rounded-full border-2 transition",
                c.dot,
                color === key ? "scale-110 border-white" : "border-transparent opacity-60 hover:opacity-100"
              )}
            />
          ))}
        </div>
      </Field>
      <SubmitButton pending={pending} variant="gold" className="w-full">
        {note ? "ذخیره تغییرات" : "ثبت در دفترچه"}
      </SubmitButton>
    </form>
  );
}
