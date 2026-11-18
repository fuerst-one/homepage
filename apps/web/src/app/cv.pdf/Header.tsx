import { personName } from "@homepage/content/i18n";
import { View, Text } from "@react-pdf/renderer";
import { styles } from "./styles";
import { CvOwner } from "@homepage/content/models";

const formatHeaderLocation = (owner: CvOwner): string => {
  const { city, country } = owner.address;
  return [city, country].filter(Boolean).join(", ");
};

export const Header = ({
  owner,
  locale = "en",
  summary,
}: {
  owner: CvOwner;
  locale?: "en" | "de";
  summary?: string;
}) => (
  <View>
    <Text style={styles.name}>{personName(locale)}</Text>
    <Text style={styles.roleLine}>
      UX+AI Engineer · {formatHeaderLocation(owner)} ·{" "}
      {locale === "de" ? "8+ Jahre" : "8+ years"}
    </Text>
    <Text style={styles.contactLine}>
      {owner.email} · linkedin.com/in/fuerst-one · github.com/fuerst-one
    </Text>
    <View style={styles.divider} />
    <Text style={styles.summary}>
      {summary ??
        "From idea to app to automation to production. Engineering intuitive interfaces for complex, tailor-fit tools — backed by full-stack AI development, behavioral psychology, user research, and CRO."}
    </Text>
  </View>
);
