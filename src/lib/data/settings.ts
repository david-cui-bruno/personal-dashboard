// Singleton app settings (#063): accent color, theme, font.
import type { DB, Settings } from "./types";

export async function getSettings(sb: DB): Promise<Settings> {
  const { data, error } = await sb.from("settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

export async function saveSettings(
  sb: DB,
  patch: Partial<Pick<Settings, "accent" | "theme" | "font">>,
) {
  const { error } = await sb
    .from("settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}
