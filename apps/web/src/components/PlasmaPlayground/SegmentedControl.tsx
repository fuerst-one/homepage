"use client";

import { ReactNode, useId } from "react";

export type SegmentedOption<TValue extends string> = {
  value: TValue;
  label: string;
  icon?: ReactNode;
  description?: string;
  isBusy?: boolean;
};

type SegmentedControlProps<TValue extends string> = {
  label: string;
  isGroupLabelHidden?: boolean;
  value: TValue;
  options: ReadonlyArray<SegmentedOption<TValue>>;
  onChange: (value: TValue) => void;
};

export const SegmentedControl = <TValue extends string>({
  label,
  isGroupLabelHidden = false,
  value,
  options,
  onChange,
}: SegmentedControlProps<TValue>) => {
  const labelId = useId();
  return (
    <div className="playground-field">
      <span
        id={labelId}
        className={isGroupLabelHidden ? "sr-only" : "playground-field-label"}
      >
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="playground-segments"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="playground-segment"
            aria-pressed={option.value === value}
            aria-busy={option.isBusy || undefined}
            onClick={() => onChange(option.value)}
            aria-label={option.description}
            title={option.description}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
