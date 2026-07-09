// Notes (spec §6): the reverse-chronological stream of journals + freeform notes.
// Suspense: the stream reads `?open=` (the inline/offline entry, #149), and a
// statically prerendered page must wrap useSearchParams in a boundary. The
// fallback mirrors the stream's own loading state so the static HTML shows the
// header + skeleton, never a blank column.
import { Suspense } from "react";
import { NotesStream, StreamSkeleton } from "@/components/notes/notes-stream";

function NotesFallback() {
  return (
    <div className="mx-auto max-w-[700px] px-6 py-10 md:px-10 md:py-14">
      <h1 className="mb-5 text-[33px] font-black lowercase tracking-tight">notes</h1>
      <StreamSkeleton />
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<NotesFallback />}>
      <NotesStream />
    </Suspense>
  );
}
