# notes — iOS widget source

`NotesWidget.swift` is the home-screen widget (#119/#120). It is **not** auto-compiled —
it's source-of-truth Swift that gets added to a **Widget Extension** target inside the
generated `mobile/ios` project.

To wire it up (App Group, widget target, signing, the two "go live" deploys), follow
**`docs/widget-phase2-runbook.md`**.

What it does: reads a shared payload the web app writes to the App Group
(`group.health.framewise.notes`), fetches `widget_summary` live when the Supabase token is
valid (else uses the cached values), and renders the small widget — ring + "X/N left today"
+ focus, with all-done/quote, empty, and needs-open states.
