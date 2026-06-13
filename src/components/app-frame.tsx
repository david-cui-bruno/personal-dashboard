"use client";

// The app shell (#064): sidebar on web, bottom nav on mobile. The seam every Phase 1
// page renders into. The viewport is fixed height (h-dvh) and only the content scrolls,
// so the sidebar stays put and settings is always reachable without scrolling.
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

const MOBILE_NAV = [
  ...NAV,
  { href: "/settings", label: "settings", icon: Settings },
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

  const linkClass = (href: string) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-bold lowercase ${
      isActive(href) ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-field"
    }`;

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-ink">
      {/* sidebar — web. Fixed full height; only its chart area scrolls. */}
      <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-bg-2 p-4 md:flex">
        <div className="flex items-center gap-2 px-2 pb-5 pt-1">
          <span className="h-3 w-3 rounded bg-accent" />
          <span className="text-xl font-black lowercase tracking-tight">notes</span>
        </div>

        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`mb-0.5 ${linkClass(href)}`}>
            <Icon size={18} /> {label}
          </Link>
        ))}

        {/* chart takes the middle and scrolls if ever taller than the space,
            so the footer below stays pinned to the bottom of the viewport. */}
        <div className="mx-1.5 mt-7 min-h-0 flex-1 overflow-y-auto">
          <ConsistencyChart />
        </div>

        <div className="pt-4">
          <Link href="/settings" className={linkClass("/settings")}>
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

      {/* content — the only scrolling region */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>

        {/* bottom nav — mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-bg pb-7 pt-2 md:hidden">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
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
