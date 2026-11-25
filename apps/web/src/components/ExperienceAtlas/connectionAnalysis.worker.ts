import {
  analyzeConnections,
  type ConnectionAnalysisInput,
} from "./connectionAnalysis";

self.onmessage = (event: MessageEvent<ConnectionAnalysisInput>) => {
  try {
    self.postMessage({ result: analyzeConnections(event.data) });
  } catch {
    self.postMessage({ error: true });
  }
};
