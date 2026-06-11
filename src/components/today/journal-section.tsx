"use client";

// Today's journal (spec §2, §5 · #030). The shared <Editor> bound inline to the
// one journal object for `day` — the *same* object the Notes stream opens for
// today ("one object, two doors", #030). Typing autosaves (debounced); no
// "saved" indicator, no word count. Empty days show the placeholder.
import { useEffect, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { getJournal, saveJournal } from "@/lib/data";
import { Editor, type EditorValue } from "@/components/editor";
import { SectionHeader } from "@/components/ui/section-header";

const SAVE_DEBOUNCE_MS = 700;

export function JournalSection({ day }: { day: string }) {
  const sb = useMemo(() => createClient(), []);
  // The journal loaded for a specific day; `content === null` is an empty day.
  // Tracking the day it belongs to lets us re-init the Editor when the day
  // rolls over, and gates rendering until the fetch resolves (no stale flash).
  const [loaded, setLoaded] = useState<{
    day: string;
    content: JSONContent | null;
  } | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<EditorValue | null>(null);

  useEffect(() => {
    let active = true;
    getJournal(sb, day)
      .then((j) => {
        if (active)
          setLoaded({ day, content: (j?.content as JSONContent | null) ?? null });
      })
      .catch(() => {
        if (active) setLoaded({ day, content: null });
      });
    return () => {
      active = false;
    };
  }, [sb, day]);

  // Flush any debounced edit on unmount / day change so nothing is lost.
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (pending.current) {
        const { json, text } = pending.current;
        pending.current = null;
        void saveJournal(sb, day, json as unknown as Json, text);
      }
    };
  }, [sb, day]);

  function handleChange(value: EditorValue) {
    pending.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      pending.current = null;
      void saveJournal(sb, day, value.json as unknown as Json, value.text);
    }, SAVE_DEBOUNCE_MS);
  }

  const ready = loaded?.day === day;

  return (
    <section className="mt-[46px]">
      <SectionHeader title="today's journal" />
      <div className="mt-1.5">
        {ready && (
          <Editor
            key={day}
            content={loaded.content}
            placeholder="do your journal today"
            onChange={handleChange}
          />
        )}
      </div>
    </section>
  );
}
