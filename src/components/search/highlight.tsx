// Snippet extraction + match highlighting for palette results. The data layer
// returns raw rows (search.ts: "highlighting is a UI concern"); this builds a
// short snippet around the first hit and marks the matched terms.
import type { ReactNode } from "react";

// Distinct, meaningful terms from the query (drops punctuation + 1-char noise).
export function queryTerms(query: string): string[] {
  const seen = new Set<string>();
  for (const raw of query.toLowerCase().split(/\s+/)) {
    const t = raw.replace(/[^\p{L}\p{N}]/gu, "");
    if (t.length >= 2) seen.add(t);
  }
  return [...seen];
}

// A ~one-line window of `text` centered on the first matched term. Falls back to
// the head of the text when nothing matches (FTS stemming can hit where a plain
// substring search misses).
export function snippet(text: string, terms: string[], radius = 90): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const lower = clean.toLowerCase();

  let hit = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (hit < 0 || i < hit)) hit = i;
  }
  if (hit < 0) {
    return clean.length > radius * 2 ? `${clean.slice(0, radius * 2).trimEnd()}…` : clean;
  }

  let start = Math.max(0, hit - radius);
  let end = Math.min(clean.length, hit + radius);
  if (start > 0) {
    const sp = clean.indexOf(" ", start);
    if (sp >= 0 && sp < hit) start = sp + 1;
  }
  if (end < clean.length) {
    const sp = clean.lastIndexOf(" ", end);
    if (sp > hit) end = sp;
  }
  return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`;
}

// Render text with matched terms wrapped in an accent <mark>.
export function Highlight({ text, terms }: { text: string; terms: string[] }): ReactNode {
  if (!text || !terms.length) return <>{text}</>;
  const set = new Set(terms.map((t) => t.toLowerCase()));
  const re = new RegExp(
    `(${terms.map(escapeRegex).sort((a, b) => b.length - a.length).join("|")})`,
    "gi",
  );
  return (
    <>
      {text.split(re).map((part, i) =>
        part && set.has(part.toLowerCase()) ? (
          <mark key={i} className="rounded-[3px] bg-accent-soft px-[1px] font-bold text-accent">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
