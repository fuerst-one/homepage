import { publicProjectScale } from "@homepage/content/projectScale";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExperienceAtlas } from "../../../../../components/ExperienceAtlas/ExperienceAtlas";
import type { SemanticDataset } from "../../../../../components/ExperienceAtlas/spaceTypes";
import preview from "../../../../../content/lab-preview.json";

export const metadata: Metadata = {
  title: "Experience atlas | Fuerst.one",
  description:
    "Explore the connections between my projects, skills and industries. Select a project to see the work in context.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function ExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (locale !== "en") {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value))
        value.forEach((item) => search.append(key, item));
      else if (value !== undefined) search.set(key, value);
    }
    redirect(`/en/lab/experience${search.size ? `?${search}` : ""}`);
  }
  return (
    <ExperienceAtlas
      projects={preview.atlas.map((p) => ({
        ...p,
        scale: publicProjectScale(p.scale),
      }))}
      semanticData={preview.semantic as SemanticDataset}
      experimentsEnabled={process.env.NODE_ENV === "development"}
    />
  );
}
