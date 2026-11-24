import type { Locale } from "@homepage/content/i18n";

export function VisitorProfilePrivacy({
  locale,
  analyticsEnabled,
}: {
  locale: Locale;
  analyticsEnabled: boolean;
}) {
  return locale === "de" ? (
    <>
      <p>
        Die Website bietet ein freiwilliges Live-Interessenprofil. Erst nach
        „Mein Live-Profil starten“ werden gewählte Projektfilter, Projekt- und
        Leistungsaufrufe einschließlich Angebots- und Zusammenarbeitsseiten,
        gelesene Projekt- und Leistungsabschnitte, bewusst erkundete Bilder,
        geöffnete GitHub- oder Live-Produktbelege, das Aufdecken des
        Malt-Tagessatzes, gewählte Explorer-Perspektiven und Gruppen, feste
        Suchthemen, Projektverbindungen und Wiederbesuche, gemerkte Projekte und
        bewusst gewählte ähnliche Projekte, angezeigte oder geöffnete
        Vorschläge, manuelle Interessensänderungen sowie Beginn und
        erfolgreicher Abschluss einer Anfrage erfasst. Das Profil zeigt
        abgeleitete Interessen, deren Gründe und Ihre eigenen Vorgaben. Es dient
        passenden Projektvorschlägen. Das Profil erklärt auch Muster aus
        mehreren Aktionen, etwa gemeinsamen Bedarf in gelesenen Projekten oder
        die Reihenfolge Fallstudie, Zusammenarbeit und Anfrage. Es leitet daraus
        keine Identität und keinen Beruf ab. Suchtexte, Formularinhalte,
        Mausbewegungen und Kontaktdaten gehören nicht zum Profil.
      </p>
      <p>
        Auch Klicks auf Projektkarten zählen. Wie lange eine Karte oder ein Teil
        einer Projektseite sichtbar war, wird nur im Arbeitsspeicher dieses Tabs
        gemessen und weder gespeichert noch geteilt. Davon hängt ab, wie stark
        ein Klick zählt: nicht bei weniger als einer halben Sekunde, halb bis zu
        drei Sekunden, danach voll. Eine Projekt- oder Leistungsseite zählt
        erst, wenn Sie etwa zehn Sekunden geblieben sind oder etwas darauf
        benutzt haben. Eine Projektseite zählt dann nur, was tatsächlich im
        Blick war, etwa ihren Bedarf oder ihre Projektdaten.
      </p>
      <p>
        Mit „Mein Live-Profil starten“ werden Profil, Auswahl und gegebenenfalls
        eine zufällige Kennung zum Löschen geteilter Daten im lokalen
        Browserspeicher gespeichert und bei späteren Besuchen wiederhergestellt.
        Sie können „Interessen auf diesem Gerät merken“ ausschalten; dann werden
        die gespeicherten Profildaten entfernt und das Profil bleibt bis zum
        Neuladen im Arbeitsspeicher dieses Tabs. Das Profil läuft 30 Tage nach
        dem Start ab und wird bei der nächsten Verwendung entfernt; Sie können
        es jederzeit zurücksetzen oder stoppen. Alte, nicht mehr verwendete
        Browserspeicherdaten können bis zum nächsten Besuch oder Löschen der
        Website-Daten auf Ihrem Gerät verbleiben.
      </p>
      <p>
        Mit der gesonderten Auswahl „Signale und Korrekturen mit Alexander
        teilen“ werden neue Interaktionen samt der Stärke, mit der das Profil
        sie gewertet hat, öffentliche Kategorien, Ihre Interessenskorrekturen
        samt vorherigem abgeleitetem Wert, die Regelversion und der
        Einwilligungszeitpunkt an unseren Server in Deutschland übermittelt.
        Eine zufällige Browserkennung verbindet diese Ereignisse; gespeichert
        wird nur deren Hash. Sie wird nicht mit Ihrer Anfrage, E-Mail-Adresse
        oder einem Benutzerkonto verknüpft. Die Auswertung hilft zu verstehen,
        welche Inhalte zu Anfragen führen und wo unsere Annahmen über Interessen
        korrigiert werden. Vorschlagsanzeigen werden als solche erfasst;
        Zusammenhänge belegen keine Ursache.
        {analyticsEnabled &&
          " Zusätzlich zählen wir geteilte Signale ohne Browserkennung und ohne Bezug zu anderen Ereignissen anonym in der unten beschriebenen Besucherstatistik."}
      </p>
      <p>
        Geteilte Ereignisse werden 30 Tage berücksichtigt und bei der nächsten
        täglichen Wartung oder einem weiteren Schreibzugriff gelöscht. Das
        Abschalten des Teilens löscht die zugehörigen Serverereignisse. Ein Hash
        zur Abwehr verspäteter Schreibzugriffe bleibt höchstens 31 Tage bis zur
        nächsten Bereinigung bestehen. Ein lokaler Schlüssel für ausstehende
        Löschversuche bleibt bis zur Bestätigung oder für höchstens 31 Tage bis
        zur nächsten Verwendung auf dem Gerät. Bei einem Fehler zeigt das Profil
        an, dass Sie das Löschen erneut versuchen müssen. „Profil stoppen &amp;
        löschen“ stoppt auch die lokale Erfassung. Alle Einstellungen sind im
        Profil und über „Datenschutzeinstellungen“ erreichbar. Die Verarbeitung
        beruht auf Ihrer freiwilligen Einwilligung nach Art. 6 Abs. 1 lit. a
        DSGVO; optionaler Browserspeicher auf §25 Abs. 1 TDDDG. Die
        KI-Einwilligung ist davon unabhängig.
      </p>
    </>
  ) : (
    <>
      <p>
        The website offers an optional live interest profile. Only after “Start
        my live profile” do we capture selected project filters, project and
        service views including focused offers and collaboration pages, active
        reading of project and service sections, deliberate image exploration,
        GitHub or live-product evidence links, revealing the Malt rate, selected
        Explorer perspectives and clusters, fixed search topics, project
        connections and return visits, saved projects and requests for similar
        projects, suggestions displayed or opened, manual interest changes, and
        enquiry starts and successful submissions. The profile displays inferred
        interests, their evidence and your own preferences to suggest relevant
        projects. It also explains patterns across actions, such as shared needs
        across projects you read, or a case-study, collaboration and enquiry
        sequence. These do not infer an identity or occupation. Search text,
        form contents, pointer trails and contact details are excluded.
      </p>
      <p>
        Clicks on project cards count too. How long a card or a part of a
        project page was on screen is measured in this tab’s memory only and is
        never stored or shared. It decides how much a click counts: not at all
        under half a second, half up to three seconds, fully after that. A
        project or service page counts only once you have stayed about ten
        seconds or used something on it, and a project page then credits only
        what you actually had in view, such as its needs or its project facts.
      </p>
      <p>
        “Start my live profile” saves the profile, your choices and, if
        applicable, a random key for erasing shared data in local browser
        storage and restores them on later visits. You can switch “Remember
        interests on this device” off to remove the stored profile data and keep
        it in this tab’s memory until you reload. The profile expires 30 days
        after it starts and is removed on next use; you can reset or stop it at
        any time. Unused expired browser data may remain on your device until
        your next visit or until you clear this website’s data.
      </p>
      <p>
        With the separate “Share signals and corrections with Alexander” choice,
        new interactions with the strength the profile gave them, public
        dimensions, your corrections and their preceding inferred score, the
        rule version and consent time are sent to our server in Germany. A
        random browser key connects these events; only its hash is stored. It is
        not joined to your enquiry, email address or an account. Analysis helps
        us understand which content accompanies enquiries and where visitors
        correct our interest assumptions. Recommendation impressions are
        identified separately; associations do not establish causation.
        {analyticsEnabled &&
          " Shared signals are also counted anonymously, without the browser key and unlinked to any other event, in the visitor statistics described below."}
      </p>
      <p>
        Shared events are considered for 30 days and erased by the next daily
        maintenance run or further write. Switching sharing off erases the
        associated server events. A hash preventing delayed writes remains for
        31 days until the next cleanup. Local recovery keys for pending erasures
        remain until acknowledgement or for 31 days until next use. If erasure
        fails, the profile tells you to retry. “Stop &amp; clear profile” also
        stops local capture. You can reach these choices in the profile and
        through “Privacy settings”. Processing relies on your optional consent
        under Article 6(1)(a) GDPR; optional browser storage uses §25(1) TDDDG
        consent. AI permission is independent.
      </p>
    </>
  );
}
