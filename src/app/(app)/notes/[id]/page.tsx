// A single entry (spec §6). `[id]` is either a journal day (YYYY-MM-DD) or a
// note id (uuid) — the format tells them apart, since the two never collide.
import { Entry } from "@/components/notes/entry";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return DAY_RE.test(id) ? (
    <Entry key={id} kind="journal" day={id} />
  ) : (
    <Entry key={id} kind="note" id={id} />
  );
}
