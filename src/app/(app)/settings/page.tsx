// Settings — placeholder. Appearance (accent + light/dark + font) and account
// are the Phase 1 "Settings" slice (see docs/roadmap.md). Theming tokens +
// ThemeScript are already wired.
export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[600px] px-10 py-14">
      <h1 className="text-[31px] font-black lowercase tracking-tight">settings</h1>
      <p className="mt-10 text-[15px] font-bold lowercase text-ink-2">
        appearance + account land in phase 1.
      </p>
    </div>
  );
}
