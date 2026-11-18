"use client";

import { useAtlasCopy } from "./useAtlasCopy";

import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import type { AtlasProject } from "./model";
import {
  SCALE_FIELDS,
  scaleValues,
  type ScaleField,
  type buildScaleSpace,
} from "./scaleSpace";

export function ScaleSpaceControls({
  projects,
  activeProjects,
  fields,
  onFields,
  sector,
  onSector,
  result,
  pending,
  error,
}: {
  projects: AtlasProject[];
  activeProjects: AtlasProject[];
  fields: ScaleField[];
  onFields: (fields: ScaleField[]) => void;
  sector: string;
  onSector: (sector: string) => void;
  result?: ReturnType<typeof buildScaleSpace>;
  pending: boolean;
  error?: string;
}) {
  const { t, term } = useAtlasCopy();
  const [open, setOpen] = useState(false);
  const sectors = [...new Set(projects.flatMap((p) => p.industries))].sort();
  return (
    <div className="vs-playground">
      <div className="vs-input-strip">
        <span>{t("NUMERIC DISTANCES · LOCAL")}</span>
        <span>
          {SCALE_FIELDS.filter((field) => fields.includes(field.id))
            .map((field) => t(field.label))
            .join(" + ") || t("No measurements selected")}
          {sector && ` · ${term(sector)}`}
        </span>
        <button
          type="button"
          className="vs-experiment-toggle"
          aria-expanded={open}
          aria-controls="scale-playground"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={14} /> : <FlaskConical size={14} />}
          {open ? t("Close playground") : t("Try different fields")}
        </button>
      </div>
      {open && (
        <div id="scale-playground" className="vs-experiment-body">
          <fieldset className="vs-experiment-fields">
            <legend>{t("Measurements to compare")}</legend>
            <div className="vs-field-chips vs-scale-fields">
              {SCALE_FIELDS.map((field) => {
                const missing = activeProjects.filter(
                  (p) => !scaleValues(p, field.id),
                );
                return (
                  <button
                    type="button"
                    key={field.id}
                    aria-pressed={fields.includes(field.id)}
                    onClick={() =>
                      onFields(
                        fields.includes(field.id)
                          ? fields.filter((f) => f !== field.id)
                          : [...fields, field.id],
                      )
                    }
                    title={
                      missing.length
                        ? `${t("Missing comparable values:")} ${missing.map((p) => p.label).join(", ")}`
                        : t("Comparable values recorded for every project")
                    }
                  >
                    {t(field.label)}
                    <small
                      className="vs-field-missing"
                      data-incomplete={missing.length > 0}
                    >
                      {missing.length} {t("missing ")}
                    </small>
                  </button>
                );
              })}
            </div>
            <div className="vs-experiment-actions">
              <label>
                {t("Project set ")}
                <select
                  value={sector}
                  onChange={(e) => onSector(e.target.value)}
                >
                  <option value="">
                    {t("All projects (")}
                    {projects.length})
                  </option>
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {term(s)} (
                      {projects.filter((p) => p.industries.includes(s)).length})
                    </option>
                  ))}
                </select>
              </label>
              <div
                className="vs-coverage-preview"
                role="status"
                aria-live="polite"
              >
                {result ? (
                  <>
                    <strong>
                      {result.space.ids.length}/{activeProjects.length}{" "}
                      {t("projects comparable ")}
                    </strong>
                    <span>
                      {result.space.excluded.length} {t("excluded ·")}{" "}
                      {result.calculationMs.toFixed(0)}{" "}
                      {t("ms calculation · no API calls ")}
                    </span>
                  </>
                ) : (
                  <strong>
                    {error ??
                      (pending
                        ? t("Recalculating… controls remain available")
                        : t("Select measurements"))}
                  </strong>
                )}
              </div>
            </div>
          </fieldset>
          <p className="vs-experiment-status">
            {t(
              "Fields carry equal weight. Team and effort ranges keep both bounds; larger numeric ranges use a logarithmic scale. Missing means unrecorded or not comparable, never zero. Rebuild effort is an estimate, not historical time spent. ",
            )}
          </p>
          {result &&
            result.constantFields.length > 0 &&
            result.space.ids.length > 1 && (
              <p className="vs-experiment-status">
                {t("No variation in this selection:")}{" "}
                {SCALE_FIELDS.filter((f) =>
                  result.constantFields.includes(f.id),
                )
                  .map((f) => t(f.label))
                  .join(", ")}
                {t(". These fields add no distance. ")}
              </p>
            )}
        </div>
      )}
    </div>
  );
}
