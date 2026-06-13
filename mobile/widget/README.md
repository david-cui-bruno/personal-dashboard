# notes — iOS widget source

`NotesWidget.swift` is the home-screen widget (#119/#120). It is **not** auto-compiled —
it's source-of-truth Swift that gets added to a **Widget Extension** target inside the
generated `mobile/ios` project.

To wire it up (App Group, widget target, signing, the two "go live" deploys), follow
**`docs/widget-phase2-runbook.md`**.

What it does: reads a shared payload the web app writes to the App Group
(`group.health.framewise.notes`), fetches `widget_summary` live when the Supabase token is
valid (else uses the cached values), and renders the widget.

**Families (#138):**
- **Home screen** — `systemSmall`: ring + "X/N left today" + focus, with all-done/quote,
  empty, and needs-open states.
- **Lock screen (iOS 16+)** — `accessoryCircular` (a done/total gauge), `accessoryRectangular`
  ("X/N done" + focus), and `accessoryInline` ("N left"). Same data + states; rendered
  monochrome and tinted by the system (no custom colors). Add it from the lock-screen
  Customize screen → "notes". Needs the widget-extension **deployment target ≥ iOS 16** and the
  same App Group; nothing else to wire beyond the existing setup.

> Not compiled in CI — this is source-of-truth Swift. Build it in Xcode after copying it into
> the widget-extension target (the lock-screen families were authored but not Xcode-built here).
