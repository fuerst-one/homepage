import { VisitorProfilePrivacy } from "../../../../../components/VisitorProfile/VisitorProfilePrivacy";
import type { Metadata } from "next";
import { getSiteFeatures } from "@/server/siteFeatures";

export const metadata: Metadata = {
  title: "Privacy Policy | FUERST.ONE",
  description: "Privacy policy for FUERST.ONE — Alexander Fuerst.",
  alternates: {
    canonical: "https://fuerst.one/en/privacy",
    languages: {
      en: "https://fuerst.one/en/privacy",
      de: "https://fuerst.one/de/datenschutz",
      "x-default": "https://fuerst.one/en/privacy",
    },
  },
};

export default function PrivacyPage() {
  const { assistantEnabled } = getSiteFeatures();
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Privacy Policy
      </h1>
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
        Last updated: 18 November 2026
      </p>
      <p>
        This policy explains how personal data is processed when you visit
        FUERST.ONE or contact us. Visiting this website does not constitute
        consent to data processing.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Controller and contact
      </h2>
      <p>
        Alexander Fuerst
        <br />
        FUERST.ONE — Webdesign &amp; E-Commerce, Alexander Fuerst
        <br />
        Grombühlstraße 37
        <br />
        97080 Würzburg, Germany
        <br />
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="mailto:alexander@fuerst.one"
        >
          alexander@fuerst.one
        </a>
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Hosting and technical access data
      </h2>
      <p>
        This website is hosted by Vercel Inc., USA. Delivering the website
        involves processing your IP address, the requested URL, request time,
        browser and operating-system information, and any referring URL sent by
        your browser. Technical access and error logs may be processed to keep
        the website available, diagnose faults and prevent abuse. The legal
        basis is our legitimate interest in secure and reliable website
        operation under Art. 6(1)(f) GDPR. These technical processes are
        separate from visitor analytics.
      </p>
      <p>
        Database and background services run on our server at Hetzner Online
        GmbH in Nuremberg, Germany. Coolify is the software we use to manage
        that server. The database stores published website content and, where
        applicable, submitted enquiries
        {assistantEnabled
          ? " and the assistant usage data described below."
          : "."}{" "}
        Access is restricted to the relevant application services and
        administration. Daily database backups are kept on the same server, with
        at most seven copies retained for up to seven days. Erased records can
        remain in these backups until rotation; restoration must preserve
        erasure requests.
      </p>
      <p>
        Public API requests are also limited using an IP-based request counter
        held temporarily in server memory. The counting window is one minute;
        expired entries are removed during periodic cleanup when further
        requests arrive or when the server instance ends. This protects the
        service against excessive requests under Art. 6(1)(f) GDPR.
      </p>
      <p>
        Hosting may involve processing in the United States and other countries
        where Vercel and its subprocessors operate. Vercel describes its
        processing terms and international-transfer safeguards, including EU
        standard contractual clauses, in its{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="https://vercel.com/legal/dpa"
        >
          Data Processing Addendum
        </a>
        . Further information is available in Vercel’s{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="https://vercel.com/legal/privacy-notice"
        >
          privacy notice
        </a>
        .
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Cookies, analytics and browser storage
      </h2>
      <p>
        We do not use advertising pixels, session replay or tracking cookies.
        The website does not set application cookies. Interest profiling and
        first-party insights are optional, as described below.
      </p>
      <VisitorProfilePrivacy locale="en" />
      <p>
        The Plasma playground keeps visual settings in page memory by default.
        If you select “Remember visual settings on this device”, your source,
        size and contrast settings and that choice are saved in local storage
        until you uncheck the option or clear this website’s browser data. They
        are not sent to us and contain no visitor identifier. This optional
        storage is based on your consent under §25(1) TDDDG. Unchecking removes
        the saved settings; the playground continues to work.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Camera, selected files and recordings
      </h2>
      <p>
        If you choose the camera feature in the Plasma playground, access
        requires your browser’s camera permission. No microphone access is
        requested. Camera images and image or video files you select are
        processed locally in your browser to generate the visual effect. They
        are not uploaded to our servers. Recordings are also created locally and
        can be downloaded to your device. You can stop the camera by switching
        to another source or leaving the playground, and revoke camera
        permission in your browser settings.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Website content, fonts and external links
      </h2>
      <p>
        We use Notion as a source for published profile and project content. Our
        server retrieves this content; your browser does not need to connect to
        Notion to read it. The IBM Plex Mono font is served by this website,
        without a browser request to Google Fonts.
      </p>
      <p>
        Project images and available logos are served through this website.
        Missing logos are not automatically fetched from an external logo
        service. Ordinary browsing does not require an AI service.
      </p>
      <p>
        Links to GitHub, LinkedIn and freelance platforms are ordinary links,
        rather than embedded social plugins. If you follow a link, the
        destination provider processes data under its own privacy policy.
      </p>
      {assistantEnabled && (
        <>
          <h2
            id="ai-assistant"
            className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white"
          >
            AI portfolio assistant
          </h2>
          <p>
            The optional assistant answers questions about published projects.
            Typing, exact project navigation and opening saved messages do not
            send a question to an AI provider. When enabled, the assistant first
            asks for your permission before a question is sent. “Allow AI and
            send” permits your question and site language to be sent through our
            server to OpenRouter, Inc., USA, and Microsoft Azure (Microsoft
            Corporation, USA), which serves the OpenAI embedding and answer
            models. Routing is restricted to Azure; it does not fall back to
            other model providers. The answer request also includes relevant
            excerpts from published portfolio content. Earlier messages are
            displayed locally and are not included in later model requests.
            Please do not submit confidential information, sensitive personal
            data or personal data about other people.
          </p>
          <p>
            The project list also offers optional semantic search. After your
            permission, only your search text is sent to the same providers to
            create an embedding; our server compares it with indexed public
            project content. This search generates no answer and sends no
            project excerpts with your query. Search-only permission does not
            authorize the assistant to generate answers. Ordinary local search
            works without this permission. Semantic search controls are only
            shown with valid AI permission. Without it, typing and submitting
            the project search stay local and do not open an AI consent prompt.
            You can grant AI permission through the optional assistant on the
            homepage.
          </p>
          <p>
            We remember both allow and decline, the notice version, time,
            permission scope and separate history choice in this browser’s local
            storage for up to 180 days. Visits do not renew this period. A
            changed notice version or clearing browser data invalidates the
            choice. You can change your AI preference or withdraw below the
            landing input. This minimal privacy choice is remembered as an
            expressly requested setting under §25(2)(2) TDDDG. Chat itself stays
            in page memory unless you additionally select “Also remember chat in
            this tab”. Only with that choice are the last five completed
            exchanges, source links and actions saved across pages and reloads.
            History expires two hours after the last completed answer, or
            earlier when permission expires or is withdrawn. Closing chat hides
            it; Clear chat removes its history. Expired saved data are cleared
            on the landing page or your next return. Closing the tab normally
            ends session storage, although browser session recovery can restore
            it. With storage blocked, permission and history stay only in this
            page’s memory.
          </p>
          <p>
            You can withdraw using “Withdraw AI permission” below the landing or
            project-search input, or through Privacy settings in the footer.
            Withdrawal stops pending client requests and further AI questions,
            and removes local chat and status data. A declined choice is saved.
            We ask again at most once per browser session, and only when you
            submit a question to the assistant; a marker in this tab’s session
            storage records that we asked, or that you declined or withdrew in
            this session. Data already transmitted cannot be recalled;
            withdrawal does not affect the lawfulness of earlier processing.
            Search and contact remain usable without AI permission. The basis
            for optional AI processing is Art. 6(1)(a) GDPR; optional chat
            storage uses §25(1) TDDDG consent. The permission can be changed
            without losing ordinary search or contact.
          </p>
          <p>
            If AI services are unavailable, project suggestions are generated
            locally without sending your question to a model. A separate
            technical status may remember this mode in tab session storage with
            active permission; it contains no question text or user identifier.
            A same-site availability check contains no question or history.
            Server health checks use fixed synthetic text, never visitor
            questions, history or visitor IP addresses. Unavailable AI shows
            project suggestions without a consent prompt.
          </p>
          <p>
            With your AI permission, our database stores query vectors and
            reusable public answers in a shared cache on our server in Germany.
            For each cached query we also store the original submitted question
            or search text, including free-form questions, to maintain and check
            cache matches and avoid repeated paid processing. The raw text is
            restricted to our server and administration; it is not shown to
            other visitors or inserted into their model requests. The assistant
            and project search share query vectors and keyed fingerprints. For
            supported public portfolio questions, validated answers and their
            public evidence can be reused for identical or closely matching
            requests from other consenting visitors. Personal or free-form
            answers are not shared. The cache stores no visitor identifier, HTTP
            headers, cookies or credentials. Text, vectors and fingerprints may
            contain personal data; they are not treated as anonymous. Normal
            retention is one year from creation. Entries then expire and are
            deleted by the next daily maintenance run, even if AI is paused.
            Hits do not extend retention and capacity pruning does not remove
            younger entries. Changed published content invalidates answer reuse
            without extending storage. Withdrawal stops further requests from
            your browser. You can also withdraw consent for stored data and
            request earlier erasure using the contact details above; supplying
            your submitted text helps us locate matching entries. Required
            erasure can shorten the normal retention period. The seven-day
            backup rotation described above also applies.
          </p>
          <p>
            Separately, our database stores public knowledge passages and
            embeddings, plus usage timestamps, costs, request status and a keyed
            hash derived from your IP address for abuse prevention. This hash is
            pseudonymous, not anonymous. Usage records also contain the declared
            consent version, time, scope and history choice to document
            permission, under Art. 6(1)(c) with Art. 7(1) GDPR. Abuse prevention
            is based on Art. 6(1)(f) GDPR. Records, including receipts, older
            than 35 days are deleted by an hourly maintenance job and when a
            further request is admitted. Hosting access logs are handled
            separately as described above. We do not include your raw IP address
            in model request bodies.
          </p>
          <p>
            AI access is offered to a configurable proportion of visitors
            through a background lottery. A keyed IP hash determines eligibility
            for a fixed time window; refreshing does not reroll it, and visitors
            with a shared IP address share eligibility. Only selected visitors
            see the AI controls and consent prompt. Selection itself does not
            grant consent or send a visitor question to an AI provider. This
            adds no lottery cookie. Vercel BotID checks technical browser
            signals on assistant endpoints to detect automated traffic. Request
            validation, abuse screening and shared limits run before paid AI
            processing. We retain hourly aggregate admission and rejection
            counts for up to 35 days, without question text or visitor
            identifiers. Ordinary project search remains available without AI
            access.
          </p>
          <p>
            Provider processing can take place outside the EEA, including in the
            USA. OpenRouter describes its international-transfer safeguards and
            retention in its{" "}
            <a
              className="text-white underline underline-offset-4 hover:text-neutral-300"
              href="https://openrouter.ai/privacy"
            >
              privacy policy
            </a>
            . Requests restrict provider routing using no-training and
            zero-data- retention controls. Actual retention also depends on
            account settings, endpoint policies and legal safety exceptions.
            These controls do not establish EU-only processing. We do not
            promise that third-party processing leaves no records. Deleting this
            tab’s history does not delete records already held by a provider.
          </p>
        </>
      )}
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Project enquiry form
      </h2>
      <p>
        The contact form collects the project or collaboration brief you review
        and submit: your selected starting point, current situation, desired
        outcome, contact details, optional commercial details, and the page or
        service you selected. On submission, our server first stores these
        details and a timestamp in our private PostgreSQL database in Germany. A
        background worker transfers the enquiry to our private database at
        Notion Labs, Inc., USA, and adds an internal notification mention. If
        Notion is unavailable, the transfer is retried. The queued brief is
        deleted after both the transfer and internal notification succeed; it
        remains queued while either step is pending. A receipt identifier and
        content fingerprint help recognise repeat submissions and are deleted by
        the worker once more than 30 days have passed after completion. Backup
        copies expire under the backup retention schedule. The form does not
        send an automatic email receipt, book a call, or subscribe you to a
        newsletter. The existing legal bases for contact enquiries described
        below also apply to this form.
      </p>
      <p>
        An unsent draft is kept in session storage in your browser tab for up to
        two hours after your last edit. This allows you to go back or change the
        site language without retyping your brief. It is removed on successful
        submission or when you discard it. Expired drafts are ignored and
        cleared when you return to the form; you can also clear your browser’s
        site data. These drafts are not sent to our server before submission.
        Project suggestions use published portfolio information and your
        selections; no external AI provider processes your brief in this
        version.
      </p>
      <p>
        Notion and its subprocessors may process these data in the United States
        and other countries. Notion describes its international-transfer
        safeguards, including EU standard contractual clauses, in its{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="https://www.notion.com/help/privacy"
        >
          privacy practices
        </a>
        . Enquiry records are retained while needed to handle the request and
        related correspondence, subject to the retention criteria below. You can
        contact us to request their erasure or object to processing.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Contact enquiries
      </h2>
      <p>
        If you contact us by email or phone, we process the contact details and
        information you provide to respond to your enquiry. For enquiries
        relating to a contract or steps before entering a contract, the legal
        basis is Art. 6(1)(b) GDPR. For other enquiries, it is our legitimate
        interest in answering correspondence under Art. 6(1)(f) GDPR. Email and
        telecommunications providers involved in delivering your message may
        also process it. Providing this information is voluntary, but we need a
        way to respond if you request a reply.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Retention
      </h2>
      <p>
        We retain personal data only for as long as needed for the purposes
        described here. Enquiries are deleted when they have been resolved and
        further retention is no longer necessary, unless statutory retention
        obligations or the establishment, exercise or defence of legal claims
        require longer storage. Technical hosting logs are subject to the
        hosting provider’s applicable retention settings and security
        requirements. Local playground settings can be deleted at any time in
        your browser.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Your rights
      </h2>
      <p>
        Subject to the applicable legal conditions, you have the right to
        access, rectification, erasure, restriction of processing and data
        portability under Arts. 15–20 GDPR. Where processing is based on
        legitimate interests, you may object on grounds relating to your
        particular situation under Art. 21 GDPR. If processing is based on
        consent, you may withdraw it at any time with effect for the future.
        Contact us using the details above to exercise your rights. We do not
        use automated decision-making or profiling within the meaning of Art. 22
        GDPR.
      </p>
      <p>
        You may lodge a complaint with a data protection supervisory authority,
        in particular in the country of your habitual residence, place of work
        or the alleged infringement. The authority responsible for private
        businesses in Bavaria is the{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="https://www.lda.bayern.de/de/beschwerde.html"
        >
          Bavarian State Office for Data Protection Supervision (BayLDA)
        </a>
        .
      </p>
    </>
  );
}
