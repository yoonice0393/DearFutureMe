import { useId, useState } from "react";

import { DELIVERY_PRESETS, type PresetMonths } from "@shared/letter.ts";
import { inputClass } from "@/components/Field";
import {
  customDateError,
  inputDateBounds,
  longDate,
  presetLabel,
  resolveDelivery,
  type Delivery,
} from "@/lib/dates";

export function DeliveryPicker({
  value,
  onChange,
  presets = DELIVERY_PRESETS,
  allowCustom = true,
  large = false,
  error,
}: {
  value: Delivery | null;
  onChange: (d: Delivery) => void;
  presets?: readonly PresetMonths[];
  allowCustom?: boolean;
  large?: boolean;
  error?: string | null;
}) {
  const id = useId();
  const bounds = inputDateBounds();
  const [customTouched, setCustomTouched] = useState(false);
  const isCustom = value?.kind === "custom";
  const customValue = isCustom ? value.date : "";
  const customErr = isCustom && customTouched ? customDateError(customValue) : null;
  const resolved = resolveDelivery(value);

  const tile = `relative flex cursor-pointer flex-col items-start justify-center rounded-sm border border-border bg-sheet px-4 text-ink
    has-[:checked]:border-2 has-[:checked]:border-postal has-[:checked]:bg-paper-deep
    has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-postal
    ${large ? "min-h-24 py-4" : "min-h-16 py-3"}`;

  return (
    <fieldset aria-describedby={`${id}-result ${id}-err`}>
      <legend className={`font-serif text-ink ${large ? "text-2xl" : "text-xl"}`}>When should it arrive?</legend>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {presets.map((m) => {
          const [num, unit] = presetLabel(m).split(" ");
          return (
            <label key={m} className={tile}>
              <input
                type="radio"
                name={`${id}-when`}
                className="sr-only"
                checked={value?.kind === "preset" && value.months === m}
                onChange={() => onChange({ kind: "preset", months: m })}
              />
              <span className={`font-serif leading-none ${large ? "text-3xl" : "text-2xl"}`}>{num}</span>
              <span className="mt-1 text-sm text-pencil">{unit}</span>
            </label>
          );
        })}
        {allowCustom && (
          <label className={tile}>
            <input
              type="radio"
              name={`${id}-when`}
              className="sr-only"
              checked={isCustom}
              onChange={() => onChange({ kind: "custom", date: customValue })}
            />
            <span className={`font-serif leading-none ${large ? "text-xl" : "text-lg"}`}>Pick a date</span>
            <span className="mt-1 text-sm text-pencil">1 month to 25 years</span>
          </label>
        )}
      </div>

      {isCustom && (
        <div className="mt-6 max-w-[320px]">
          <label htmlFor={`${id}-date`} className="block text-sm font-medium">
            Delivery date
          </label>
          <input
            id={`${id}-date`}
            type="date"
            min={bounds.min}
            max={bounds.max}
            value={customValue}
            aria-invalid={!!customErr}
            onChange={(e) => onChange({ kind: "custom", date: e.target.value })}
            onBlur={() => setCustomTouched(true)}
            className={`${inputClass} mt-2`}
          />
        </div>
      )}

      <p id={`${id}-result`} aria-live="polite" className="mt-6 min-h-6 text-base">
        {resolved && (
          <>
            Arrives on <strong className="font-semibold">{longDate(resolved)}</strong>.
          </>
        )}
      </p>
      <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-medium text-postal empty:hidden">
        {customErr ?? error ?? ""}
      </p>
    </fieldset>
  );
}
