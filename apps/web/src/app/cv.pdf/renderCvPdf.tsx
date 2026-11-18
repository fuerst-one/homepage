import { personName } from "@homepage/content/i18n";
import {
  Page,
  Text,
  View,
  Document,
  renderToBuffer,
} from "@react-pdf/renderer";
import "./fonts";
import { styles } from "./styles";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ProjectCard } from "./ProjectCard";
import { CvProject } from "@homepage/content/models";
import { CvOwner } from "@homepage/content/models";

type CvPdfProps = {
  featuredProjects: CvProject[];
  allProjects: CvProject[];
  owner: CvOwner;
  locale?: "en" | "de";
  summary?: string;
};

export const renderCvPdf = (props: CvPdfProps) =>
  renderToBuffer(<CvPdf {...props} />);

const CvPdf = ({
  featuredProjects,
  allProjects,
  owner,
  locale = "en",
  summary,
}: CvPdfProps) => (
  <Document
    title={`${personName(locale)} — CV`}
    author={personName(locale)}
    creator="FUERST.ONE"
    language={locale}
  >
    <Page size="A4" style={styles.page}>
      <Header owner={owner} locale={locale} summary={summary} />
      <View style={styles.body}>
        <Sidebar projects={allProjects} owner={owner} locale={locale} />
        <View style={styles.main}>
          <Text style={styles.sectionLabel}>
            {locale === "de" ? "Ausgewählte Projekte" : "Selected Projects"}
          </Text>
          {featuredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </View>
      </View>
      <View style={styles.footer} fixed>
        <Text>FUERST.ONE</Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </Page>
  </Document>
);
