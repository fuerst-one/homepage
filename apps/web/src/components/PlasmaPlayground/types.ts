export type Source = "plasma" | "camera" | "shapes";

export type SizeKey = "small" | "medium" | "large";
export type ContrastKey = "low" | "medium" | "high";

export type KnobState = {
  source: Source;
  size: SizeKey;
  contrast: ContrastKey;
};

export type SplashChoice = "camera" | "plasma" | "shapes" | null;

export type PermissionState = "idle" | "requesting" | "granted" | "denied";
