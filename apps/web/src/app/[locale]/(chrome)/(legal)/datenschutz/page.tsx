import type { Metadata } from "next";
import { getSiteFeatures } from "@/server/siteFeatures";

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
  const { assistantEnabled } = getSiteFeatures();
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
        Datenbank und Hintergrunddienste laufen auf unserem Server bei der
        Hetzner Online GmbH in Nürnberg, Deutschland. Coolify ist die Software,
        mit der wir diesen Server verwalten. Gespeichert werden veröffentlichte
        Website-Inhalte und gegebenenfalls eingereichte Anfragen
        {assistantEnabled
          ? " sowie die unten beschriebenen KI-Nutzungsdaten."
          : "."}{" "}
        Zugriff haben die zuständigen Anwendungsdienste und die Administration.
        Tägliche Datenbanksicherungen bleiben auf demselben Server, höchstens
        sieben Kopien für bis zu sieben Tage. Gelöschte Datensätze können bis
        zur Rotation in Sicherungen verbleiben; bei einer Wiederherstellung sind
        Löschungen zu beachten.
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
        Der Plasma-Spielplatz hält Einstellungen zunächst nur im Arbeitsspeicher
        der Seite. Erst wenn Sie „Darstellung auf diesem Gerät merken“ wählen,
        werden Quelle, Größe, Kontrast und Ihre Auswahl im lokalen Browser-
        Speicher aufbewahrt. Sie werden nicht an uns gesendet und enthalten
        keine Besucherkennung. Grundlage ist Ihre Einwilligung nach §25 Abs. 1
        TDDDG. Entfernen Sie das Häkchen oder löschen Sie die Website-Daten im
        Browser, werden die gespeicherten Einstellungen entfernt. Der Spielplatz
        bleibt ohne Speicherung nutzbar.
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
        Projektbilder und vorhandene Logos werden über diese Website
        ausgeliefert. Fehlende Logos werden nicht automatisch von externen
        Logo-Diensten nachgeladen. Zum normalen Besuch ist kein KI-Dienst
        erforderlich.
      </p>
      <p>
        Verweise auf GitHub, LinkedIn und Freelancer-Plattformen sind normale
        Links und keine eingebetteten Social-Media-Plugins. Wenn Sie einem Link
        folgen, verarbeitet der Zielanbieter Daten nach seiner eigenen
        Datenschutzerklärung.
      </p>
      {assistantEnabled && (
        <>
          <h2
            id="ai-assistant"
            className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white"
          >
            KI-Portfolio-Assistent
          </h2>
          <p>
            Der freiwillig nutzbare Assistent beantwortet Fragen zu
            veröffentlichten Projekten. Tippen, direkte Projektnavigation und
            das Öffnen gespeicherter Nachrichten senden keine Frage an einen
            KI-Anbieter. Ist KI verfügbar, fragen wir vor dem ersten Senden nach
            Ihrer Einwilligung. „KI erlauben und senden“ erlaubt die
            Übermittlung Ihrer Frage und der Seitensprache über unseren Server
            an OpenRouter, Inc., USA, und Microsoft Azure (Microsoft
            Corporation, USA), das die OpenAI-Modelle für Embeddings und
            Antworten bereitstellt. Die Route ist auf Azure beschränkt; andere
            Modellanbieter werden nicht automatisch als Ersatz verwendet. Die
            Antwortanfrage enthält außerdem passende Auszüge aus
            veröffentlichten Portfolio-Inhalten. Frühere Nachrichten werden
            lokal angezeigt und nicht bei späteren Modellanfragen mitgesendet.
            Bitte geben Sie keine vertraulichen Informationen, sensiblen
            personenbezogenen Daten oder personenbezogenen Daten Dritter ein.
          </p>
          <p>
            Wir merken Erlaubnis oder Ablehnung, Hinweisversion, Zeitpunkt und
            die gesonderte Verlaufsauswahl bis zu 180 Tage im lokalen
            Browser-Speicher. Besuche verlängern diese Frist nicht. Eine
            geänderte Hinweisversion oder das Löschen der Website-Daten macht
            die Wahl ungültig. Unter dem Eingabefeld können Sie Ihre
            KI-Einstellung ändern oder die Einwilligung widerrufen. Die minimale
            Speicherung Ihrer Datenschutzwahl dient der ausdrücklich gewünschten
            Einstellung nach §25 Abs. 2 Nr. 2 TDDDG.
          </p>
          <p>
            Der Chat bleibt im Arbeitsspeicher der aktuellen Seite, solange Sie
            nicht zusätzlich „Chat in diesem Tab merken“ wählen. Nur dann
            bleiben bis zu fünf abgeschlossene Fragen und Antworten mit Quellen
            und Aktionen im Sitzungsspeicher dieses Tabs über Seitenwechsel und
            Neuladen hinweg erhalten. Der Verlauf läuft zwei Stunden nach der
            letzten Antwort ab und wird bei geöffneter Startseite oder der
            nächsten Rückkehr entfernt. Chat schließen blendet ihn aus, Chat
            löschen entfernt ihn. Das Schließen des Tabs beendet den
            Sitzungsspeicher normalerweise; der Browser kann eine Sitzung
            wiederherstellen. Bei gesperrtem Speicher bleiben Wahl und Verlauf
            nur auf der aktuellen Seite verfügbar.
          </p>
          <p>
            „KI-Einwilligung widerrufen“ unter dem Eingabefeld stoppt
            ausstehende Client-Anfragen und weitere Fragen an die KI und
            entfernt lokale Chat- und Statusdaten. Die Ablehnung wird
            gespeichert, damit wir nicht erneut fragen. Bereits übermittelte
            Daten lassen sich nicht zurückholen. Die Rechtmäßigkeit früherer
            Verarbeitung bleibt unberührt. Rechtsgrundlage der freiwilligen
            KI-Verarbeitung ist Art. 6 Abs. 1 lit. a DSGVO; für den optional
            gespeicherten Verlauf gilt §25 Abs. 1 TDDDG. Suche und Kontakt
            bleiben ohne Einwilligung möglich.
          </p>
          <p>
            Sind die KI-Dienste nicht verfügbar, entstehen Projektvorschläge
            lokal, ohne Ihre Frage an ein Modell zu senden. Ein gesonderter
            technischer Status kann diesen Modus bei aktiver Einwilligung im
            Sitzungsspeicher dieses Tabs merken. Er enthält weder Fragetext noch
            Nutzerkennung. Eine Verfügbarkeitsprüfung über unsere Website
            enthält keine Frage und keinen Verlauf. Server-Prüfungen verwenden
            feste synthetische Texte, keine Besucherfragen, Gesprächsverläufe
            oder Besucher-IP-Adressen. Bei nicht verfügbarer KI zeigen wir
            Projektvorschläge ohne Einwilligungsdialog.
          </p>
          <p>
            Unsere Anwendungsdatenbank speichert keine Fragen oder Antworten.
            Sie enthält öffentliche Wissensauszüge und Embeddings sowie
            Nutzungszeitpunkte, Kosten, Anfragestatus und einen mit geheimem
            Schlüssel aus der IP-Adresse abgeleiteten Hash zur
            Missbrauchsabwehr. Dieser Hash ist pseudonym und nicht anonym.
            Nutzungsdatensätze enthalten auch die erklärte Einwilligungsversion,
            den Zeitpunkt und die Verlaufsauswahl zum Nachweis nach Art. 6 Abs.
            1 lit. c in Verbindung mit Art. 7 Abs. 1 DSGVO. Datensätze, die
            älter als 35 Tage sind, werden durch einen stündlichen Wartungslauf
            und bei der Zulassung einer weiteren Anfrage gelöscht.
            Hosting-Zugriffsprotokolle werden getrennt wie oben beschrieben
            verarbeitet. Die Modellanfragen enthalten Ihre ursprüngliche
            IP-Adresse nicht im Anfrageinhalt.
          </p>
          <p>
            Der KI-Zugang wird einem einstellbaren Anteil der Besucher
            angeboten. Ein mit geheimem Schlüssel aus der IP-Adresse
            abgeleiteter Hash bestimmt die Auswahl für ein festes Zeitfenster.
            Neuladen ändert sie nicht; gemeinsam genutzte IP-Adressen teilen die
            Auswahl. Dafür wird kein zusätzliches Cookie gesetzt. Vercel BotID
            prüft technische Browsersignale an den Assistenten-Endpunkten zur
            Erkennung automatisierter Zugriffe. Anfrageprüfung,
            Missbrauchsfilter und gemeinsame Limits greifen vor
            kostenpflichtigen KI-Aufrufen. Stündliche Summen zu Zulassungen und
            Ablehnungen werden bis zu 35 Tage gespeichert, ohne Fragetexte oder
            Besucherkennungen. Die normale Projektsuche bleibt ohne KI-Zugang
            verfügbar.
          </p>
          <p>
            Die Missbrauchsabwehr beruht auf Art. 6 Abs. 1 lit. f DSGVO. Die
            Verarbeitung bei Anbietern kann außerhalb des EWR, auch in den USA,
            stattfinden. OpenRouter beschreibt internationale
            Übermittlungsgarantien und Speicherfristen in seiner{" "}
            <a
              className="text-white underline underline-offset-4 hover:text-neutral-300"
              href="https://openrouter.ai/privacy"
            >
              Datenschutzerklärung
            </a>
            . Anfragen beschränken die Route auf Anbieter ohne Trainingsnutzung
            und mit Zero-Data-Retention-Kontrollen. Tatsächliche Speicherfristen
            hängen zusätzlich von Kontoeinstellungen, Endpunktregeln und
            gesetzlichen Sicherheitsausnahmen ab. Diese Einstellungen bedeuten
            keine reine EU-Verarbeitung. Wir versprechen keine vollständige
            Spurenfreiheit bei Dritten. Das Löschen des lokalen Verlaufs löscht
            keine bereits bei einem Anbieter vorhandenen Datensätze.
          </p>
        </>
      )}
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Formular für Projektanfragen
      </h2>
      <p>
        Das Kontaktformular erfasst die von Ihnen geprüfte und abgesendete
        Projekt- oder Zusammenarbeitsanfrage: Einstieg, Ausgangslage,
        gewünschtes Ergebnis, Kontaktdaten, freiwillige kaufmännische Angaben
        und die gewählte Seite oder Leistung. Unser Server speichert diese
        Angaben und einen Zeitstempel zunächst in unserer privaten
        PostgreSQL-Datenbank in Deutschland. Ein Hintergrunddienst überträgt die
        Anfrage anschließend in unsere private Datenbank bei Notion Labs, Inc.,
        USA, und ergänzt eine interne Benachrichtigungs-Erwähnung. Ist Notion
        nicht verfügbar, wird die Übertragung erneut versucht. Die
        zwischengespeicherte Anfrage wird gelöscht, sobald sowohl die
        Übertragung als auch die interne Benachrichtigung erfolgreich waren.
        Solange einer dieser Schritte aussteht, bleibt sie zwischengespeichert.
        Eine Empfangskennung und ein Inhaltsfingerabdruck dienen der Erkennung
        wiederholter Übermittlungen und werden vom Hintergrunddienst gelöscht,
        sobald seit dem Abschluss mehr als 30 Tage vergangen sind.
        Sicherungskopien verfallen nach dem Aufbewahrungsplan für Backups. Das
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
