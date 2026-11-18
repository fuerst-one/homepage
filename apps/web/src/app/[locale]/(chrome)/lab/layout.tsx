import type { ReactNode } from "react";
import { Layout } from "../../../../components/Layout";
import { ContentNavLink } from "../../../../components/ContentNavLink";
import "../../../../components/ProjectLab/lab-site.css";

export default function LabLayout({ children }: { children: ReactNode }) {
  return (
    <Layout locale="en" availableLocales={["en"]} wide>
      <div className="lab-site">
        <nav className="lab-site-navigation" aria-label="Explore the portfolio">
          <span>Explore the work</span>
          <ContentNavLink href="/en/lab/experience">
            Experience atlas
          </ContentNavLink>
          <ContentNavLink href="/en/projects">All projects ↗</ContentNavLink>
        </nav>
        {children}
      </div>
    </Layout>
  );
}
