> **FROZEN** — changes require a new `docs/decisions.md` entry + explicit sign-off from David.

# product

## what this is

**notes** is a private, single-user app that replaces Day One plus a scattered daily
checklist with *one* place David enjoys opening every day. It does two things, and
they reinforce each other:

1. **Keeps him consistent** — a daily routine checklist with light accountability.
2. **Captures his thinking** — a frictionless journal + notes, with the Day One feel
   (Lato, calm, lowercase) minus Day One's filing system.

A "day" is the central object: it holds *what he did* (the checklist) and *what he
thought* (the journal).

## the goal

> Replace Day One + a scattered checklist with one private app David genuinely enjoys
> opening every single day.

The load-bearing words are **enjoy** and **every day**.

## definition of success

Success is **not** streaks or feature count. It is: **David opens the app daily and it
feels effortless.** If it's beautiful and instant, he uses it, and then both
journaling and accountability work. If it's clunky, no feature saves it. Streaks /
the consistency heatmap are a *nice-to-have* nudge, not the point.

## design principles

Every feature and decision is measured against these:

1. **Calm & beautiful.** The Day One feel — Lato, generous whitespace, lowercase,
   nothing shouty.
2. **Zero friction.** Fast load, no repeated sign-in, check a box and jot a thought in
   under two seconds.
3. **Simple over powerful.** One chronological stream of days, not a filing system.
   When in doubt, cut.
4. **Private & yours.** Single user. David's data, plainly his.

## non-goals (V1)

Explicitly out of scope — these protect the product from creep:

- Sharing, social, or multi-user collaboration.
- Folders / projects / tags / task-management beyond the flat daily checklist.
- Analytics or dashboards beyond the single consistency heatmap.
- Reminders / push notifications in V1. (A native home-screen widget and rich
  notifications are a possible *post-V1, Capacitor-phase* addition — see
  `docs/decisions.md`.)
- Non-daily / weekly recurring routine items.
