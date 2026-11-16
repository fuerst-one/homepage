import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Fuerst.one",
  description: "Privacy policy for Fuerst.one — Alexander Fürst.",
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
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Privacy Policy
      </h1>
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
        Last updated: 16 November 2026
      </p>
      <p>
        This policy explains how personal data is processed when you visit
        fuerst.one or contact us. Visiting this website does not constitute
        consent to data processing.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Controller and contact
      </h2>
      <p>
        Alexander Fürst
        <br />
        Fuerst.one — Webdesign &amp; E-Commerce, Alexander Fürst
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
        We do not use visitor analytics, advertising pixels, session replay or
        tracking cookies. The website does not set application cookies and does
        not create visitor profiles.
      </p>
      <p>
        The Plasma playground remembers your selected visual source, size and
        contrast in your browser’s local storage so that your settings are
        available on your next visit. These settings are not sent to us and do
        not contain a visitor identifier. They remain until you clear this
        website’s data in your browser. This storage supports the playground
        settings you select; it is not used for tracking.
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
        Project images are normally served through this website. Where no
        project logo is available, a logo may be requested directly from
        logo.clearbit.com. Such a request discloses your IP address and the
        request information sent by your browser to the external provider. The
        purpose is to display project logos, based on our legitimate interest in
        presenting our work under Art. 6(1)(f) GDPR.
      </p>
      <p>
        Links to GitHub, LinkedIn and freelance platforms are ordinary links,
        rather than embedded social plugins. If you follow a link, the
        destination provider processes data under its own privacy policy.
      </p>
      <h2
        id="ai-assistant"
        className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white"
      >
        AI portfolio assistant
      </h2>
      <p>
        The optional assistant answers questions about published projects.
        Typing a search or opening saved messages does not send a question to an
        AI provider. Submitting text without an exact navigation match sends
        your question and site language through our server to OpenRouter, Inc.,
        USA, and the providers that process the embedding and answer requests.
        The answer request also includes relevant excerpts from published
        portfolio content. Earlier messages are displayed locally and are not
        included in later model requests. Please do not submit confidential
        information, sensitive personal data or personal data about other
        people.
      </p>
      <p>
        We keep the last five completed question-and-answer exchanges, including
        source links and page actions, in this tab’s session storage. They
        remain available across pages and reloads for two hours after the last
        completed answer. Closing chat hides it; clicking the landing input
        reopens it. Clear chat removes the saved conversation. Expired history
        is cleared while the landing page is open or when you next return;
        closing the tab normally ends session storage, although browser session
        recovery can restore it. You can also clear this website’s browser data.
        If storage is blocked, history remains only in the current page’s
        memory.
      </p>
      <p>
        If AI services are unavailable, project suggestions are generated
        locally without sending your question to a model. A separate technical
        status in this tab’s session storage remembers this mode until verified
        recovery or tab closure; it contains no question text or user
        identifier. Background recovery checks send fixed test text to the AI
        services, without visitor questions or conversation history.
      </p>
      <p>
        Our application database does not store questions or answers. It stores
        public knowledge passages and embeddings, plus usage timestamps, costs,
        request status and a keyed hash derived from your IP address for abuse
        prevention. This hash is pseudonymous, not anonymous. Usage records
        older than 35 days are deleted when a further request is admitted.
        Hosting access logs are handled separately as described above. We do not
        include your raw IP address in model request bodies.
      </p>
      <p>
        The legal basis for answering voluntarily submitted portfolio questions,
        keeping your requested resumable chat and preventing abuse is our
        legitimate interest under Art. 6(1)(f) GDPR. Search and direct contact
        remain available without the assistant. Provider processing can take
        place outside the EEA, including in the USA. OpenRouter describes its
        international-transfer safeguards and retention in its{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="https://openrouter.ai/privacy"
        >
          privacy policy
        </a>
        . Provider retention and training rules depend on the actual endpoint,
        account settings and applicable agreements. We do not promise that
        third-party processing leaves no records. Deleting this tab’s history
        does not delete records already held by a provider.
      </p>
      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Project enquiry form
      </h2>
      <p>
        The contact form collects the project or collaboration brief you review
        and submit: your selected starting point, current situation, desired
        outcome, contact details, optional commercial details, and the page or
        service you selected. On submission, our server stores these details and
        a timestamp in a private database at Notion Labs, Inc., USA, so we can
        handle your business enquiry. The form does not send an automatic email
        receipt, book a call, or subscribe you to a newsletter. The existing
        legal bases for contact enquiries described below also apply to this
        form.
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
