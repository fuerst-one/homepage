"use client";

import { useEffect, useState } from "react";
import type {
  ConnectionAnalysisInput,
  ConnectionAnalysisResult,
} from "./connectionAnalysis";

type Outcome = { result?: ConnectionAnalysisResult; error?: boolean };

/** Follow the existing Explorer worker pattern; cancel obsolete fits while sliders move. */
export function useConnectionAnalysis(input: ConnectionAnalysisInput) {
  const [outcome, setOutcome] = useState<
    Outcome & { input: ConnectionAnalysisInput }
  >();
  useEffect(() => {
    let active = true;
    let worker: Worker | undefined;
    const finish = (value: Outcome) => {
      if (active) setOutcome({ ...value, input });
      worker?.terminate();
    };
    const timer = setTimeout(() => {
      try {
        worker = new Worker(
          new URL("./connectionAnalysis.worker.ts", import.meta.url),
          { type: "module" },
        );
        worker.onmessage = (event: MessageEvent<Outcome>) => finish(event.data);
        worker.onerror = () => finish({ error: true });
        worker.postMessage(input);
      } catch {
        finish({ error: true });
      }
    }, 120);
    return () => {
      active = false;
      clearTimeout(timer);
      worker?.terminate();
    };
  }, [input]);
  return {
    result: outcome?.result,
    error: outcome?.input === input && outcome.error,
    pending: outcome?.input !== input,
  };
}
