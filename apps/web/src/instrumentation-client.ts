import { initBotId } from "botid/client/core";

const local = ["localhost", "127.0.0.1", "[::1]"].includes(
  window.location.hostname,
);
if (process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED === "true" && !local)
  initBotId({
    protect: [
      { path: "/api/assistant", method: "POST" },
      { path: "/api/assistant/status", method: "GET" },
      { path: "/api/projects/search", method: "POST" },
    ],
  });
