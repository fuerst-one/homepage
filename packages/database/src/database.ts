import postgres from "postgres";
/** Public database connections always verify the server, including a private Coolify CA. */
export function knowledgeDatabaseTls(
  url: string,
  ca = process.env.KNOWLEDGE_DATABASE_CA_CERT,
) {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(url).hostname,
  );
  if (local) return false;
  return {
    rejectUnauthorized: true,
    ...(ca ? { ca: ca.replace(/\\n/g, "\n") } : {}),
  };
}
let client: ReturnType<typeof postgres> | undefined;
export function knowledgeDatabase() {
  const url = process.env.KNOWLEDGE_DATABASE_URL;
  if (!url) throw new Error("Knowledge database unconfigured");
  client ??= postgres(url, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {},
    ssl: knowledgeDatabaseTls(url),
  });
  return client;
}
