"use client";

import { useState } from "react";
import { cn } from "../../../lib/utils";

export const ProjectLogo = ({
  src,
  alt,
  size = "card",
}: {
  src: string;
  alt: string;
  size?: "card" | "detail" | "marquee";
}) => {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (failedSource === src) return null;

  return (
    <span
      className={cn(
        "flex min-w-0 shrink-0 items-center justify-center overflow-hidden",
        size === "marquee"
          ? "h-8 w-36 bg-white/90 px-2 py-1"
          : "max-w-[40%] border border-white/30 bg-white/90 text-neutral-900 print:hidden",
        size === "card" && "h-5 w-20 px-2",
        size === "detail" && "h-9 w-32 px-3",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "block w-full min-w-0 max-w-full object-contain text-[0px] grayscale",
          size === "card" ? "h-3" : size === "detail" ? "h-5" : "h-full",
        )}
        loading="lazy"
        onError={() => setFailedSource(src)}
      />
    </span>
  );
};
