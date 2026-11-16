import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutz | Fuerst.one",
  description: "Datenschutzerklärung von Fuerst.one — Alexander Fürst.",
  alternates: {
    canonical: "https://fuerst.one/de/datenschutz",
    languages: {
      en: "https://fuerst.one/en/privacy",
      de: "https://fuerst.one/de/datenschutz",
      "x-default": "https://fuerst.one/en/privacy",
    },
  },
};

export default function DatenschutzPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Datenschutzerklärung
      </h1>
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
        Stand: 16. November 2026
      </p>
      <p>
        Diese Erklärung beschreibt, wie personenbezogene Daten beim Besuch von
        fuerst.one und bei der Kontaktaufnahme verarbeitet werden. Der Besuch
        dieser Website stellt keine Einwilligung in eine Datenverarbeitung dar.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Verantwortlicher und Kontakt
      </h2>
      <p>
        Alexander Fürst
        <br />
        Fuerst.one — Webdesign &amp; E-Commerce, Alexander Fürst
        <br />
        Grombühlstraße 37
        <br />
        97080 Würzburg, Deutschland
        <br />
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="mailto:alexander@fuerst.one"
        >
          alexander@fuerst.one
        </a>
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Hosting und technische Zugriffsdaten
      </h2>
      <p>
        Diese Website wird von Vercel Inc., USA, gehostet. Bei der Auslieferung
        der Website werden Ihre IP-Adresse, die aufgerufene URL, der Zeitpunkt
        des Abrufs, Angaben zu Browser und Betriebssystem sowie eine vom Browser
        gegebenenfalls übermittelte verweisende URL verarbeitet. Technische
        Zugriffs- und Fehlerprotokolle können verarbeitet werden, um die
        Verfügbarkeit sicherzustellen, Fehler zu beheben und Missbrauch
        abzuwehren. Rechtsgrundlage ist unser berechtigtes Interesse am sicheren
        und zuverlässigen Betrieb der Website nach Art. 6 Abs. 1 lit. f DSGVO.
        Diese technischen Vorgänge sind von einer Besucheranalyse zu
        unterscheiden.
      </p>
      <p>
        Anfragen an die öffentliche API werden außerdem anhand eines
        IP-bezogenen Anfragezählers vorübergehend im Arbeitsspeicher des Servers
        begrenzt. Das Zählfenster beträgt eine Minute. Abgelaufene Einträge
        werden bei regelmäßigen Bereinigungen anlässlich weiterer Anfragen oder
        mit dem Ende der Serverinstanz entfernt. Dies dient dem Schutz vor
        übermäßigen Anfragen nach Art. 6 Abs. 1 lit. f DSGVO.
      </p>
      <p>
        Beim Hosting kann eine Verarbeitung in den USA und weiteren Ländern
        erfolgen, in denen Vercel und seine Unterauftragsverarbeiter tätig sind.
        Vercel beschreibt seine Verarbeitungsbedingungen und Garantien für
        internationale Datenübermittlungen, einschließlich
        EU-Standardvertragsklauseln, im{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="https://vercel.com/legal/dpa"
        >
          Data Processing Addendum
        </a>
        . Weitere Informationen enthält die{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="https://vercel.com/legal/privacy-notice"
        >
          Datenschutzerklärung von Vercel
        </a>
        .
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Cookies, Besucheranalyse und Browserspeicher
      </h2>
      <p>
        Wir verwenden keine Besucheranalyse, Werbepixel, Sitzungsaufzeichnungen
        oder Tracking-Cookies. Die Website setzt selbst keine Cookies und
        erstellt keine Besucherprofile.
      </p>
      <p>
        Der Plasma-Spielplatz speichert Ihre gewählte Bildquelle, Größe und
        Kontrasteinstellung lokal in Ihrem Browser, damit Ihre Einstellungen
        beim nächsten Besuch wieder verfügbar sind. Diese Einstellungen werden
        nicht an uns übermittelt und enthalten keine Besucherkennung. Sie
        bleiben gespeichert, bis Sie die Daten dieser Website in Ihrem Browser
        löschen. Der lokale Speicher unterstützt die von Ihnen gewählten
        Spielplatz-Einstellungen und wird nicht zum Tracking verwendet.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Kamera, ausgewählte Dateien und Aufnahmen
      </h2>
      <p>
        Wenn Sie im Plasma-Spielplatz die Kamerafunktion wählen, ist dafür die
        Kamerafreigabe Ihres Browsers erforderlich. Ein Mikrofonzugriff wird
        nicht angefordert. Kamerabilder sowie von Ihnen ausgewählte Bild- oder
        Videodateien werden lokal in Ihrem Browser verarbeitet, um den
        Bildeffekt zu erzeugen. Sie werden nicht auf unsere Server hochgeladen.
        Auch Aufnahmen werden lokal erstellt und können auf Ihr Gerät
        heruntergeladen werden. Sie können die Kamera durch den Wechsel zu einer
        anderen Quelle oder das Verlassen des Spielplatzes stoppen und die
        Kamerafreigabe in Ihren Browsereinstellungen widerrufen.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Inhalte, Schriftarten und externe Links
      </h2>
      <p>
        Wir nutzen Notion als Quelle für veröffentlichte Profil- und
        Projektinhalte. Unser Server ruft diese Inhalte ab; Ihr Browser muss zum
        Lesen keine Verbindung zu Notion herstellen. Die Schriftart IBM Plex
        Mono wird von dieser Website ausgeliefert, ohne dass Ihr Browser Google
        Fonts aufruft.
      </p>
      <p>
        Projektbilder werden normalerweise über diese Website ausgeliefert. Ist
        kein Projektlogo vorhanden, kann ein Logo direkt von logo.clearbit.com
        abgerufen werden. Dabei erhält der externe Anbieter Ihre IP-Adresse und
        die von Ihrem Browser übermittelten Anfrageinformationen. Zweck ist die
        Anzeige von Projektlogos auf Grundlage unseres berechtigten Interesses
        an der Darstellung unserer Arbeit nach Art. 6 Abs. 1 lit. f DSGVO.
      </p>
      <p>
        Verweise auf GitHub, LinkedIn und Freelancer-Plattformen sind normale
        Links und keine eingebetteten Social-Media-Plugins. Wenn Sie einem Link
        folgen, verarbeitet der Zielanbieter Daten nach seiner eigenen
        Datenschutzerklärung.
      </p>
      <h2
        id="ai-assistant"
        className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white"
      >
        KI-Portfolio-Assistent
      </h2>
      <p>
        Der freiwillig nutzbare Assistent beantwortet Fragen zu veröffentlichten
        Projekten. Das Tippen einer Suche und das Öffnen gespeicherter
        Nachrichten senden keine Frage an einen KI-Anbieter. Wenn Sie Text ohne
        exakte Übereinstimmung mit einem Navigationsziel absenden, gehen Ihre
        Frage und die Seitensprache über unseren Server an OpenRouter, Inc.,
        USA, sowie an die Anbieter für Embeddings und die Antwortgenerierung.
        Die Antwortanfrage enthält außerdem passende Auszüge aus
        veröffentlichten Portfolio-Inhalten. Frühere Nachrichten werden lokal
        angezeigt und nicht bei späteren Modellanfragen mitgesendet. Bitte geben
        Sie keine vertraulichen Informationen, sensiblen personenbezogenen Daten
        oder personenbezogenen Daten Dritter ein.
      </p>
      <p>
        Wir halten die letzten fünf abgeschlossenen Fragen und Antworten samt
        Quellenlinks und Seitenaktionen im Sitzungsspeicher dieses Browser-Tabs
        vor. Sie stehen über Seitenwechsel und Neuladen hinweg für zwei Stunden
        nach der letzten abgeschlossenen Antwort bereit. Chat schließen blendet
        das Gespräch aus; ein Klick auf das Startseiten-Eingabefeld öffnet es
        erneut. Chat löschen entfernt den gespeicherten Verlauf. Abgelaufene
        Verläufe werden bei geöffneter Startseite oder bei Ihrer nächsten
        Rückkehr gelöscht. Das Schließen des Tabs beendet den Sitzungsspeicher
        normalerweise; eine Sitzungswiederherstellung des Browsers kann ihn
        wiederherstellen. Sie können auch die Website-Daten im Browser löschen.
        Bei gesperrtem Browserspeicher bleibt der Verlauf nur im Arbeitsspeicher
        der aktuellen Seite.
      </p>
      <p>
        Sind die KI-Dienste nicht verfügbar, entstehen Projektvorschläge lokal,
        ohne Ihre Frage an ein Modell zu senden. Ein gesonderter technischer
        Status im Sitzungsspeicher dieses Tabs merkt sich diesen Modus bis zur
        bestätigten Wiederherstellung oder zum Schließen des Tabs. Er enthält
        weder Fragetext noch Nutzerkennung. Prüfungen zur Wiederherstellung
        senden feste Testtexte an die KI-Dienste, keine Besucherfragen oder
        Gesprächsverläufe.
      </p>
      <p>
        Unsere Anwendungsdatenbank speichert keine Fragen oder Antworten. Sie
        enthält öffentliche Wissensauszüge und Embeddings sowie
        Nutzungszeitpunkte, Kosten, Anfragestatus und einen mit geheimem
        Schlüssel aus der IP-Adresse abgeleiteten Hash zur Missbrauchsabwehr.
        Dieser Hash ist pseudonym und nicht anonym. Nutzungsdatensätze, die
        älter als 35 Tage sind, werden bei der Zulassung einer weiteren Anfrage
        gelöscht. Hosting-Zugriffsprotokolle werden getrennt wie oben
        beschrieben verarbeitet. Die Modellanfragen enthalten Ihre ursprüngliche
        IP-Adresse nicht im Anfrageinhalt.
      </p>
      <p>
        Rechtsgrundlage für die Beantwortung freiwillig gestellter
        Portfolio-Fragen, das von Ihnen gewünschte fortsetzbare Gespräch und die
        Missbrauchsabwehr ist unser berechtigtes Interesse nach Art. 6 Abs. 1
        lit. f DSGVO. Suche und direkter Kontakt bleiben ohne den Assistenten
        möglich. Die Verarbeitung bei Anbietern kann außerhalb des EWR, auch in
        den USA, stattfinden. OpenRouter beschreibt internationale
        Übermittlungsgarantien und Speicherfristen in seiner{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="https://openrouter.ai/privacy"
        >
          Datenschutzerklärung
        </a>
        . Speicherung und Trainingsnutzung bei Modellanbietern richten sich nach
        dem tatsächlichen Endpunkt, den Kontoeinstellungen und den geltenden
        Vereinbarungen. Wir versprechen keine vollständige Spurenfreiheit bei
        Dritten. Das Löschen des lokalen Verlaufs löscht keine bereits bei einem
        Anbieter vorhandenen Datensätze.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Formular für Projektanfragen
      </h2>
      <p>
        Das Kontaktformular erfasst die von Ihnen geprüfte und abgesendete
        Projekt- oder Zusammenarbeitsanfrage: Einstieg, Ausgangslage,
        gewünschtes Ergebnis, Kontaktdaten, freiwillige kaufmännische Angaben
        und die gewählte Seite oder Leistung. Unser Server speichert diese
        Angaben und einen Zeitstempel in einer privaten Datenbank bei Notion
        Labs, Inc., USA, um Ihre geschäftliche Anfrage zu bearbeiten. Das
        Formular versendet keine automatische E-Mail-Bestätigung, bucht keinen
        Termin und abonniert keinen Newsletter. Es gelten die unten erläuterten
        Rechtsgrundlagen für Kontaktanfragen.
      </p>
      <p>
        Ein nicht abgesendeter Entwurf bleibt bis zu zwei Stunden nach der
        letzten Änderung im Sitzungsspeicher Ihres Browser-Tabs. So können Sie
        zurückgehen oder die Sprache wechseln, ohne alles neu einzugeben. Nach
        erfolgreichem Absenden oder Verwerfen wird er entfernt. Abgelaufene
        Entwürfe werden beim erneuten Aufruf ignoriert und entfernt. Sie können
        auch die Website-Daten Ihres Browsers löschen. Vor dem Absenden wird der
        Entwurf nicht an unseren Server übertragen. Projektvorschläge verwenden
        veröffentlichte Portfolioangaben und Ihre Auswahl. In dieser Version
        verarbeitet kein externer KI-Anbieter Ihre Anfrage.
      </p>
      <p>
        Notion und seine Unterauftragsverarbeiter können diese Daten in den USA
        und weiteren Ländern verarbeiten. Notion beschreibt seine Garantien für
        internationale Datenübermittlungen, einschließlich
        EU-Standardvertragsklauseln, in seinen{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="https://www.notion.com/help/privacy"
        >
          Datenschutzhinweisen
        </a>
        . Einträge zu Anfragen werden aufbewahrt, solange sie für die
        Bearbeitung und damit verbundene Korrespondenz benötigt werden;
        ergänzend gelten die unten beschriebenen Speicherkriterien. Sie können
        uns zur Löschung auffordern oder der Verarbeitung widersprechen.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Kontaktanfragen
      </h2>
      <p>
        Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir Ihre
        Kontaktdaten und die von Ihnen mitgeteilten Informationen zur
        Bearbeitung Ihrer Anfrage. Bei Anfragen zu einem Vertrag oder
        vorvertraglichen Maßnahmen ist die Rechtsgrundlage Art. 6 Abs. 1 lit. b
        DSGVO. Bei anderen Anfragen ist sie unser berechtigtes Interesse an der
        Beantwortung von Korrespondenz nach Art. 6 Abs. 1 lit. f DSGVO. An der
        Übermittlung beteiligte E-Mail- und Telekommunikationsanbieter können
        die Nachricht ebenfalls verarbeiten. Ihre Angaben sind freiwillig; für
        eine gewünschte Antwort benötigen wir eine Kontaktmöglichkeit.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Speicherdauer
      </h2>
      <p>
        Wir speichern personenbezogene Daten nur so lange, wie es für die hier
        beschriebenen Zwecke erforderlich ist. Anfragen werden gelöscht, wenn
        sie abgeschlossen sind und eine weitere Speicherung nicht mehr nötig
        ist, sofern gesetzliche Aufbewahrungspflichten oder die Geltendmachung,
        Ausübung oder Verteidigung von Rechtsansprüchen keine längere
        Speicherung erfordern. Für technische Hosting-Protokolle gelten die
        jeweiligen Aufbewahrungseinstellungen und Sicherheitsanforderungen des
        Hosting-Anbieters. Lokale Spielplatz-Einstellungen können Sie jederzeit
        in Ihrem Browser löschen.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Ihre Rechte
      </h2>
      <p>
        Unter den gesetzlichen Voraussetzungen haben Sie nach Art. 15–20 DSGVO
        das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
        Verarbeitung und Datenübertragbarkeit. Soweit die Verarbeitung auf
        berechtigten Interessen beruht, können Sie aus Gründen, die sich aus
        Ihrer besonderen Situation ergeben, nach Art. 21 DSGVO widersprechen.
        Beruht eine Verarbeitung auf Ihrer Einwilligung, können Sie diese
        jederzeit mit Wirkung für die Zukunft widerrufen. Zur Ausübung Ihrer
        Rechte können Sie sich über die oben genannten Kontaktdaten an uns
        wenden. Eine automatisierte Entscheidungsfindung einschließlich
        Profiling im Sinne von Art. 22 DSGVO findet nicht statt.
      </p>
      <p>
        Sie können sich bei einer Datenschutzaufsichtsbehörde beschweren,
        insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthaltsorts,
        Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes. Für
        private Unternehmen in Bayern ist das{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="https://www.lda.bayern.de/de/beschwerde.html"
        >
          Bayerische Landesamt für Datenschutzaufsicht (BayLDA)
        </a>{" "}
        zuständig.
      </p>
    </>
  );
}
