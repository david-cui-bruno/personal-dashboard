// Data-access layer — the seam between the UI slices and Supabase. The contract
// is defined in docs/data-model.md. Feature agents import from here; they do not
// query Supabase tables directly or change the schema.
export * from "./types";
export * from "./routine";
export * from "./consistency";
export * from "./journal";
export * from "./notes";
export * from "./settings";
export * from "./search";
export * from "./attachments";
export * from "./export";
