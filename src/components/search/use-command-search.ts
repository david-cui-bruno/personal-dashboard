"use client";

// Debounced, as-you-type search for the palette. Wraps the data-access search()
// (#040) so the component never touches Supabase directly. All state updates
// happen in async callbacks; the empty-query case is derived, not stored.
import { useEffect, useState } from "react";
import { search, type SearchResults, type SearchScope } from "@/lib/data";
import { browserClient } from "./sb";

const EMPTY: SearchResults = { journals: [], notes: [], routineItems: [] };

export function useCommandSearch(
  query: string,
  scope: SearchScope,
  range: { from?: string; to?: string },
) {
  const [state, setState] = useState<{ results: SearchResults; loading: boolean }>({
    results: EMPTY,
    loading: false,
  });

  const q = query.trim();

  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    const id = setTimeout(() => {
      setState((s) => ({ ...s, loading: true }));
      search(browserClient(), q, { scope, from: range.from, to: range.to })
        .then((results) => {
          if (!cancelled) setState({ results, loading: false });
        })
        .catch((e) => {
          console.error("search failed", e);
          if (!cancelled) setState({ results: EMPTY, loading: false });
        });
    }, 130);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, scope, range.from, range.to]);

  return q ? state : { results: EMPTY, loading: false };
}
