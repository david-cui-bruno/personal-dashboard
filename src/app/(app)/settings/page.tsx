// Settings (spec §8; #063) — appearance (accent + light/dark + font) and account
// (username, change password, sign out). The screen is a client component that
// applies appearance live and persists to localStorage + the DB.
import { SettingsScreen } from "@/components/settings/settings-screen";

export default function SettingsPage() {
  return <SettingsScreen />;
}
