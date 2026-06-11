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

// % of the day's active routine items completed (#020, #022).
export type DayConsistency = {
  day: string;
  done: number;
  active: number;
  pct: number;
};
