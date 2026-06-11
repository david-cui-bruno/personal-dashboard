"use client";

// Appearance: accent swatches + light/dark theme + lato/system font (#063, spec §8).
// Changes apply live (via the parent's onChange → applyAppearance) and persist.
import { Check } from "lucide-react";
import {
  ACCENTS,
  type Appearance,
  type FontChoice,
  type ThemeChoice,
} from "./appearance";

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-[9px] bg-field p-[3px]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`rounded-[7px] px-4 py-[7px] text-[13px] font-extrabold lowercase ${
              active ? "bg-bg text-ink shadow-sm" : "text-ink-2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3.5">
      <div className="text-[15.5px] font-bold lowercase">
        {label}
        {hint && (
          <small className="mt-[3px] block text-[12.5px] font-bold text-ink-3">
            {hint}
          </small>
        )}
      </div>
      {children}
    </div>
  );
}

export function AppearanceSection({
  value,
  onChange,
}: {
  value: Appearance;
  onChange: (patch: Partial<Appearance>) => void;
}) {
  return (
    <section className="mb-9">
      <h2 className="mb-1.5 text-[13px] font-extrabold lowercase text-ink-3">
        appearance
      </h2>

      <Row label="accent color" hint="tap a color — the whole app recolors live">
        <div className="flex gap-2.5">
          {ACCENTS.map((c) => {
            const active = c === value.accent;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ accent: c })}
                aria-label={`accent ${c}`}
                aria-pressed={active}
                style={{ background: c }}
                className={`grid h-[26px] w-[26px] place-items-center rounded-full ${
                  active ? "outline outline-2 outline-offset-2 outline-ink" : ""
                }`}
              >
                {active && <Check size={14} strokeWidth={3} className="text-white" />}
              </button>
            );
          })}
        </div>
      </Row>

      <Row label="theme">
        <Segmented<ThemeChoice>
          value={value.theme}
          onChange={(theme) => onChange({ theme })}
          options={[
            { value: "light", label: "light" },
            { value: "dark", label: "dark" },
          ]}
        />
      </Row>

      <Row label="font">
        <Segmented<FontChoice>
          value={value.font}
          onChange={(font) => onChange({ font })}
          options={[
            { value: "lato", label: "lato" },
            { value: "system", label: "system" },
          ]}
        />
      </Row>
    </section>
  );
}
