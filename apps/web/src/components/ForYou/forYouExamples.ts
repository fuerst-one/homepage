import complexInterface from "../../../../../tests/fixtures/for-you-plans/complex-interface.json";
import automationDe from "../../../../../tests/fixtures/for-you-plans/automation-de.json";
import aiMinimal from "../../../../../tests/fixtures/for-you-plans/ai-minimal.json";
import collaborationSingleProject from "../../../../../tests/fixtures/for-you-plans/collaboration-single-project.json";

export type ForYouExample = {
  name: string;
  title: string;
  visitor: { leadingNeeds: string[]; openedProjects: string[] };
  /** Unvalidated on purpose: the review route checks it like a model's output. */
  plan: unknown;
};

/** Hand-written plans for reviewing the section library until a model writes them. */
export const forYouExamples: ForYouExample[] = [
  { name: "complex-interface", ...complexInterface },
  { name: "automation-de", ...automationDe },
  { name: "ai-minimal", ...aiMinimal },
  { name: "collaboration-single-project", ...collaborationSingleProject },
];
