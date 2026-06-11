"use client";

// The app shell (#064): sidebar on web, bottom nav on mobile (today / notes
// only). The seam every Phase 1 page renders into.
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, NotebookPen, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConsistencyChart } from "@/components/consistency-chart";

const NAV = [
  { href: "/", label: "today", icon: CalendarCheck },
  { href: "/notes", label: "notes", icon: NotebookPen },
] as const;

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      {/* sidebar — web */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-bg-2 p-4 md:flex">
        <div className="flex items-center gap-2 px-2 pb-5 pt-1">
          <span className="h-3 w-3 rounded bg-accent" />
          <span className="text-xl font-black lowercase tracking-tight">notes</span>
        </div>

        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-bold lowercase ${
              isActive(href) ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-field"
            }`}
          >
            <Icon size={18} /> {label}
          </Link>
        ))}

        <div className="mx-1.5 mt-7">
          <ConsistencyChart />
        </div>

        <div className="mt-auto pt-4">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-bold lowercase ${
              isActive("/settings") ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-field"
            }`}
          >
            <Settings size={18} /> settings
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-bold lowercase text-ink-2 hover:bg-field"
          >
            <LogOut size={18} /> sign out
          </button>
        </div>
      </aside>

      {/* content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>

        {/* bottom nav — mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-bg pb-7 pt-2 md:hidden">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 text-[11px] font-bold lowercase ${
                isActive(href) ? "text-accent" : "text-ink-3"
              }`}
            >
              <Icon size={22} /> {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
