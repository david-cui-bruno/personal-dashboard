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
- **Mobile** — bottom nav with **Today**, **Notes**, and **Inspo** (#064 → amended by
  #140/#142); the consistency chart is a **horizontal** section on Today (vertical only fits
  the web sidebar).
- **Inspo** — see the dedicated section below.

## inspo board (#140/#142)

Anchored to `mockups/index.html` → "inspo" / "item open". The board is the one
deliberately "busy" surface; the rest of the app stays calm.

- **Masonry** — 3 columns on web / 2 on mobile, ~14px gap, tiles rounded `14px`, newest-first.
  **JS-positioned** (#146): each tile is packed into the shortest column from its stored aspect
  ratio and placed absolutely, so reorder is a smooth `transition: transform` glide (drag a tile by
  its always-visible grip handle; the others ease out of the way). Dimensions come from the stored
  width/height, so columns don't jump as images load.
- **Sticky paper palette** — five fixed hues (paper + ink), **identical in light & dark**
  (paper, not chrome), kept as constants in `src/components/inspo/sticky-colors.ts`:

  | color | paper | ink |
  |---|---|---|
  | yellow | `#fdec8b` | `#4a4220` |
  | blue | `#bcd8ff` | `#233049` |
  | orange | `#ffd29b` | `#4a3318` |
  | pink | `#ffc6dd` | `#4a2236` |
  | green | `#bdf0c4` | `#1f4028` |

  A note is ~12.5px/700, `border-radius: 3px`, soft drop shadow, a small ±3° tilt; fixed
  ~150px wide and **grows downward** as the text wraps.
- **The holder / dispenser** — a translucent, blurred dock (`bg-bg/70` + `backdrop-blur`,
  rounded `16px`) of the 5 colors. Each tab `44×30px`; **hover pops it out**
  (`translateX(-13px) scale(1.12) rotate(-4deg)`) to say "grab me". It's **fixed** on the
  right while the board scrolls (web only); in the lightbox it docks beside the image (a
  bottom strip on mobile). Drag a color → a `pointer-events:none` ghost follows; drop on the
  image to place a sticky.

## chosen variants (from the comparison labs)

- Consistency chart: **option A** — minimal. **Vertical** in the web sidebar (weekday
  columns on top, months down the left, newest at bottom); **horizontal** on mobile
  (weeks left→right, months on top).
- Notes list: **option C** — filled gray day-number tile for journals.

## type scale (from the mockup, to refine)

Day title ~33px/900 · section headers ~20px/900 · body/journal ~17px/1.75 · checklist
labels ~16.5px · nav 15px. ~700px reading column on web.
