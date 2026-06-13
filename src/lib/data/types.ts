import type { Database } from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DB = SupabaseClient<Database>;

type Tables = Database["public"]["Tables"];
export type RoutineItem = Tables["routine_item"]["Row"];
export type Completion = Tables["completion"]["Row"];
export type Journal = Tables["journal"]["Row"];
export type Note = Tables["note"]["Row"];
export type Attachment = Tables["attachment"]["Row"];
export type Settings = Tables["settings"]["Row"];
export type DailySong = Tables["daily_song"]["Row"];
export type InspoItem = Tables["inspo_item"]["Row"];
export type InspoSticky = Tables["inspo_sticky"]["Row"];

// % of the day's active routine items completed (#020, #022).
export type DayConsistency = {
  day: string;
  done: number;
  active: number;
  pct: number;
};
