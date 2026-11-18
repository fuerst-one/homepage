import type { Locale } from "@homepage/content/i18n";

export function VisitorProfilePrivacy({ locale }: { locale: Locale }) {
  return locale === "de" ? (
    <>
      <p>
        Die Website bietet ein freiwilliges Live-Interessenprofil. Erst nach
        „Mein Live-Profil starten“ werden gewählte Projektfilter, Projekt- und
        Leistungsaufrufe, aktive Lesezeit, angezeigte oder geöffnete Vorschläge,
        manuelle Interessensänderungen sowie Beginn und erfolgreicher Abschluss
        einer Anfrage erfasst. Das Profil zeigt abgeleitete Interessen, deren
        Gründe und Ihre eigenen Vorgaben. Es dient passenden Projektvorschlägen.
        Suchtexte, Formularinhalte, Mausbewegungen und Kontaktdaten gehören
        nicht zum Profil.
      </p>
      <p>
        Standardmäßig bleibt es im Arbeitsspeicher dieses Tabs. „Interessen auf
        diesem Gerät merken“ speichert Profil, Auswahl und gegebenenfalls eine
        zufällige Kennung zum Löschen geteilter Daten im lokalen
        Browserspeicher. Das Profil läuft 30 Tage nach dem Start ab und wird bei
        der nächsten Verwendung entfernt; Sie können es jederzeit zurücksetzen
        oder stoppen. Alte, nicht mehr verwendete Browserspeicherdaten können
        bis zum nächsten Besuch oder Löschen der Website-Daten auf Ihrem Gerät
        verbleiben.
      </p>
      <p>
        Mit der gesonderten Auswahl „Signale und Korrekturen mit Alexander
        teilen“ werden neue Interaktionen, öffentliche Kategorien, Ihre
        Interessenskorrekturen samt vorherigem abgeleitetem Wert, die
        Regelversion und der Einwilligungszeitpunkt an unseren Server in
        Deutschland übermittelt. Eine zufällige Browserkennung verbindet diese
        Ereignisse; gespeichert wird nur deren Hash. Sie wird nicht mit Ihrer
        Anfrage, E-Mail-Adresse oder einem Benutzerkonto verknüpft. Die
        Auswertung hilft zu verstehen, welche Inhalte zu Anfragen führen und wo
        unsere Annahmen über Interessen korrigiert werden. Vorschlagsanzeigen
        werden als solche erfasst; Zusammenhänge belegen keine Ursache.
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
        service views, active reading, suggestions displayed or opened, manual
        interest changes, and enquiry starts and successful submissions. The
        profile displays inferred interests, their evidence and your own
        preferences to suggest relevant projects. Search text, form contents,
        pointer trails and contact details are excluded.
      </p>
      <p>
        By default it stays in this tab’s memory. “Remember interests on this
        device” saves the profile, your choices and, if applicable, a random key
        for erasing shared data in local browser storage. The profile expires 30
        days after it starts and is removed on next use; you can reset or stop
        it at any time. Unused expired browser data may remain on your device
        until your next visit or until you clear this website’s data.
      </p>
      <p>
        With the separate “Share signals and corrections with Alexander” choice,
        new interactions, public dimensions, your corrections and their
        preceding inferred score, the rule version and consent time are sent to
        our server in Germany. A random browser key connects these events; only
        its hash is stored. It is not joined to your enquiry, email address or
        an account. Analysis helps us understand which content accompanies
        enquiries and where visitors correct our interest assumptions.
        Recommendation impressions are identified separately; associations do
        not establish causation.
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
