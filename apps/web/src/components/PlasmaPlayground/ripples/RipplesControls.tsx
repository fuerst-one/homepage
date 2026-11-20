"use client";

import { RotateCcw } from "lucide-react";
import { SegmentedControl, SegmentedOption } from "../SegmentedControl";
import { RippleMode } from "./types";

type RipplesControlsProps = {
  de: boolean;
  mode: RippleMode;
  onModeChange: (mode: RippleMode) => void;
  onResetField: () => void;
};

export const RipplesControls = ({
  de,
  mode,
  onModeChange,
  onResetField,
}: RipplesControlsProps) => {
  const modes: SegmentedOption<RippleMode>[] = [
    { value: "waves", label: de ? "Wellen" : "Waves" },
    { value: "sand", label: "Sand" },
    { value: "jello", label: "Jello" },
    { value: "cymatics", label: de ? "Kymatik" : "Cymatics" },
  ];
  return (
    <>
      <SegmentedControl
        label={de ? "Modus" : "Mode"}
        value={mode}
        options={modes}
        onChange={onModeChange}
      />
      <button
        type="button"
        className="playground-action"
        onClick={onResetField}
        title={
          de
            ? "Fläche glätten, Quellen bleiben"
            : "Flatten the plate, keep the sources"
        }
      >
        <RotateCcw size={14} aria-hidden />
        <span>{de ? "Glätten" : "Reset"}</span>
      </button>
    </>
  );
};
