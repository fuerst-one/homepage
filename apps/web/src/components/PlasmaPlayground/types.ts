export type Source = "ripples" | "camera" | "shapes" | "plasma";

export type SizeKey = "small" | "medium" | "large";
export type ContrastKey = "low" | "medium" | "high";

export type KnobState = {
  source: Source;
  size: SizeKey;
  contrast: ContrastKey;
};

export type SplashChoice = "ripples" | "camera" | "shapes" | "plasma" | null;

export type PermissionState = "idle" | "requesting" | "granted" | "denied";
