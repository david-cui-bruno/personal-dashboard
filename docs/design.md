> **living** — evolves as we build. Visual source of truth is `mockups/index.html`
> (open in a browser); this doc captures the tokens and rules behind it.

# design

## feel

Day One-like calm: **Lato** everywhere (#060), **lowercase** headers and body by
default (#061), generous whitespace, **no card/box chrome** around the routine or
journal and **no dividing lines** between checklist items (#065). **Lucide** icons
(#062).

## design tokens (from the mockup)

CSS variables, light theme default; all themeable (#063):

| token | light | note |
|---|---|---|
| `--bg` | `#ffffff` | app background |
| `--bg-2` | `#fafaf8` | sidebar |
| `--ink` / `--ink-2` / `--ink-3` | `#1c1c1e` / `#44444b` / `#6c6c74` | text primary/secondary/tertiary — grays kept dark for contrast |
| `--line` | `#efefed` | hairlines |
| `--field` | `#f5f5f3` | inputs, neutral chips/tiles |
| `--accent` | `#3b6ef0` | default blue; user-selectable |
| `--accent-soft` | `#eef2fe` | active nav, selected states |

Dark theme + alternate accents defined as variable overrides. Grays are tuned for
contrast: **dark** in light mode and **light** in dark mode (`--ink-2: #c8c8d0`,
`--ink-3: #9a9aa3`) so secondary/tertiary text stays legible. Heatmap cells use four
accent-tinted levels over `--heat-0`.

## screens

- **Today** (web pinned tab) — lowercase date title; "daily routine" section (inline
  editable, draggable, "+" to add); "today's journal" header + placeholder. Consistency
  chart in the **sticky sidebar** (fixed full height; only the content column scrolls, so
  settings stays reachable) (#064, #021).
- **Notes** — two-pane on web (list + editor). Journal items use the **filled
  day-number tile** + title "journal" (note option C, #031); freeform notes show their
  title, no tile (#032). ⌘K search palette (#040).
- **Settings** — accent swatches + light/dark + font (#063); account (#070).
- **Sign in** — minimal; "keep me signed in on this device."
- **Mobile** — bottom nav with **Today** and **Notes** only (#064); the consistency
  chart is a **horizontal** section on Today (vertical only fits the web sidebar).

## chosen variants (from the comparison labs)

- Consistency chart: **option A** — minimal. **Vertical** in the web sidebar (weekday
  columns on top, months down the left, newest at bottom); **horizontal** on mobile
  (weeks left→right, months on top).
- Notes list: **option C** — filled gray day-number tile for journals.

## type scale (from the mockup, to refine)

Day title ~33px/900 · section headers ~20px/900 · body/journal ~17px/1.75 · checklist
labels ~16.5px · nav 15px. ~700px reading column on web.
