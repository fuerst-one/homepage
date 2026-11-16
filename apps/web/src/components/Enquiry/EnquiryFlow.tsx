"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "../i18n/LocalizedLink";
import { Button } from "../Button";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ENQUIRY_INTENTS,
  ENQUIRY_DRAFT_KEY,
  emptyEnquiry,
  parseEnquiry,
  restoreDraft,
  restoreEntry,
  applyIntent,
  validateStep,
  missingProjectDetails,
  type EnquiryContext,
  type EnquiryIntent,
} from "@homepage/content/enquiry";
import type { Locale } from "@homepage/content/i18n";
import { enquiryCopy, intentLabels } from "./enquiryCopy";

import {
  selectEnquiryEvidence,
  type EnquiryEvidence,
} from "@homepage/content/enquiryEvidence";
import { caseLabel } from "@homepage/content/projectCase";
type Field = keyof (typeof enquiryCopy)["en"]["labels"];
const controlClass =
  "mt-2 block w-full border border-white/35 bg-black px-3 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-white focus:outline focus:outline-1 focus:outline-white disabled:opacity-60 aria-[invalid=true]:border-amber-300";

export function EnquiryFlow({
  locale,
  projects,
  initialContext,
  initialIntent = "",
}: {
  locale: Locale;
  projects: EnquiryEvidence[];
  initialContext: EnquiryContext;
  initialIntent?: EnquiryIntent | "";
}) {
  const copy = enquiryCopy[locale];
  const [value, setValue] = useState(() => ({
    ...emptyEnquiry(locale),
    intent: initialIntent,
    context: initialContext,
  }));
  const [step, setStep] = useState(initialIntent ? 1 : 0);
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [standard, setStandard] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [failure, setFailure] = useState("");
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [confirmDetails, setConfirmDetails] = useState(false);
  const editingDetails = useRef(false);
  const sendControl = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const contextKey = JSON.stringify(initialContext);
  const entryKey = JSON.stringify({
    intent: initialIntent,
    context: initialContext,
  });

  useEffect(() => {
    let saved: ReturnType<typeof restoreDraft> = null;
    try {
      saved = restoreDraft(sessionStorage.getItem(ENQUIRY_DRAFT_KEY));
    } catch {
      /* Storage can be disabled; the in-memory form still works. */
    }
    if (saved) {
      const restoredEntry = restoreEntry(
        saved,
        locale,
        initialIntent,
        JSON.parse(contextKey),
      );
      setValue(restoredEntry.value);
      setStep(restoredEntry.step);
      setRestored(true);
    } else {
      try {
        sessionStorage.removeItem(ENQUIRY_DRAFT_KEY);
      } catch {
        /* Optional storage. */
      }
      setValue((current) => ({ ...current, id: crypto.randomUUID() }));
    }
    setReady(true);
  }, [locale, contextKey, initialIntent]);

  useEffect(() => {
    if (!ready || receipt) return;
    try {
      sessionStorage.setItem(
        ENQUIRY_DRAFT_KEY,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          step,
          value,
          entry: entryKey,
        }),
      );
    } catch {
      /* Do not block an enquiry when browser storage is unavailable. */
    }
  }, [value, step, ready, receipt, entryKey]);

  useEffect(() => {
    if (ready) heading.current?.focus();
  }, [step, receipt, standard, ready]);
  const examples = selectEnquiryEvidence(projects, value);
  const set = (field: Field | "intent" | "website", text: string) => {
    setValue((current) =>
      field === "intent"
        ? applyIntent(current, text as EnquiryIntent)
        : { ...current, [field]: text },
    );
    setErrors((current) => current.filter((key) => key !== field));
    setFailure("");
  };
  const restart = () => {
    setValue({ ...emptyEnquiry(locale), id: crypto.randomUUID() });
    setStep(0);
    setReceipt("");
    setErrors([]);
    setFailure("");
    setRestored(false);
    setConfirmDetails(false);
    try {
      sessionStorage.removeItem(ENQUIRY_DRAFT_KEY);
    } catch {
      /* Optional draft storage. */
    }
  };
  const next = () => {
    const fields = validateStep(step, value);
    setErrors(fields);
    if (fields.length) document.getElementById(`enquiry-${fields[0]}`)?.focus();
    else setStep((current) => Math.min(5, current + 1));
  };
  const send = async (withoutDetails = false) => {
    if (submitting.current) return;
    const parsed = parseEnquiry(value);
    if (!parsed.ok) {
      setErrors(parsed.fields);
      if (!standard)
        setStep(!value.intent ? 0 : validateStep(1, value).length ? 1 : 4);
      else document.getElementById(`enquiry-${parsed.fields[0]}`)?.focus();
      return;
    }
    if (!withoutDetails && missingProjectDetails(parsed.value).length) {
      sendControl.current = document.activeElement as HTMLElement | null;
      setConfirmDetails(true);
      return;
    }
    submitting.current = true;
    setSending(true);
    setFailure("");
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.value),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        setFailure(response.status === 409 ? copy.conflict : copy.failed);
        return;
      }
      const data = await response.json();
      if (data.receipt !== value.id) throw new Error("Invalid receipt");
      setReceipt(data.receipt);
      try {
        sessionStorage.removeItem(ENQUIRY_DRAFT_KEY);
      } catch {
        /* No persistent data to clear. */
      }
    } catch {
      setFailure(copy.failed);
    } finally {
      submitting.current = false;
      setSending(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (confirmDetails) return;
    if (!standard && step < 5) next();
    else void send();
  };

  const field = (key: Field, multiline = false) => {
    const props = {
      id: `enquiry-${key}`,
      name: key,
      value: value[key],
      maxLength: multiline
        ? 4000
        : key === "productUrl"
          ? 1000
          : key === "email"
            ? 254
            : key === "name"
              ? 150
              : 250,
      required: ["name", "email"].includes(key),
      "aria-invalid": errors.includes(key),
      "aria-describedby": errors.includes(key)
        ? `enquiry-error-${key}`
        : undefined,
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => set(key, event.target.value),
      className: controlClass,
    };
    return (
      <label
        key={key}
        htmlFor={props.id}
        className="block text-sm leading-relaxed text-neutral-200"
      >
        {copy.labels[key]}
        {multiline ? (
          <textarea {...props} rows={4} />
        ) : (
          <input
            {...props}
            type={
              key === "email" ? "email" : key === "productUrl" ? "url" : "text"
            }
            autoComplete={
              key === "name"
                ? "name"
                : key === "email"
                  ? "email"
                  : key === "company"
                    ? "organization"
                    : "off"
            }
          />
        )}
        {errors.includes(key) && (
          <span
            id={`enquiry-error-${key}`}
            className="mt-2 block text-xs text-amber-200"
          >
            {key === "email"
              ? locale === "de"
                ? "Bitte eine gültige E-Mail-Adresse eingeben."
                : "Enter a valid email address."
              : key === "productUrl"
                ? locale === "de"
                  ? "Bitte einen vollständigen http://- oder https://-Link eingeben."
                  : "Enter a complete http:// or https:// link."
                : locale === "de"
                  ? "Bitte dieses Feld ausfüllen."
                  : "Please complete this field."}
          </span>
        )}
      </label>
    );
  };
  const choices = (
    <fieldset
      className="space-y-3"
      aria-invalid={errors.includes("intent")}
      aria-describedby={
        errors.includes("intent") ? "enquiry-error-intent" : undefined
      }
    >
      <legend className="mb-4 text-lg text-white">{copy.question}</legend>
      {ENQUIRY_INTENTS.map((intent) => (
        <label
          key={intent}
          className={`flex min-h-14 cursor-pointer items-center gap-4 border px-4 py-3 text-sm leading-relaxed ${errors.includes("intent") ? "border-amber-300 text-white" : value.intent === intent ? "border-white bg-white/10 text-white" : "border-white/30 text-neutral-300"}`}
        >
          <input
            id={intent === "prototype" ? "enquiry-intent" : undefined}
            type="radio"
            name="intent"
            value={intent}
            checked={value.intent === intent}
            onChange={() => {
              set("intent", intent);
            }}
          />
          {intentLabels[locale][intent]}
        </label>
      ))}
      {errors.includes("intent") && (
        <p id="enquiry-error-intent" className="text-xs text-amber-200">
          {locale === "de"
            ? "Bitte einen Einstieg auswählen."
            : "Please choose a starting point."}
        </p>
      )}
    </fieldset>
  );
  const context = (
    <div className="space-y-5">
      {field("situation", true)}
      {field("outcome", true)}
      {field("productUrl")}
    </div>
  );
  const evidence = (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-neutral-400">
        {examples.length ? copy.evidenceIntro : copy.none}
      </p>
      {examples.map(({ project, reasons, partial, selected }) => (
        <article
          key={project.id}
          className="space-y-3 border border-white/25 bg-white/[0.03] p-5"
        >
          <h3 className="text-base text-white">
            <Link
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {project.name} <span aria-hidden="true">↗</span>
              <span className="sr-only">
                {locale === "de" ? " (neuer Tab)" : " (new tab)"}
              </span>
            </Link>
          </h3>
          <p
            lang={project.summaryLocale}
            className="text-sm leading-relaxed text-neutral-300"
          >
            {project.summary}
          </p>
          <p className="text-xs leading-relaxed text-neutral-300">
            <span className="text-white">
              {selected && <>{copy.selectedCase} · </>}
              {partial ? copy.partialMatch : copy.relatedCase}
            </span>
            {reasons.length > 0 && (
              <>
                {" "}
                · {copy.matchReasons}:{" "}
                {reasons.map((reason) => caseLabel(reason, locale)).join(" · ")}
              </>
            )}
          </p>
          <dl className="space-y-2 text-xs leading-relaxed text-neutral-400">
            <div>
              <dt className="inline text-neutral-300">{copy.caseStage}: </dt>
              <dd className="inline">
                {project.caseStudy.stages.length
                  ? project.caseStudy.stages
                      .map((stage) => caseLabel(stage, locale))
                      .join(" · ")
                  : copy.stageUnknown}
              </dd>
            </div>
            <div>
              <dt className="inline text-neutral-300">{copy.caseRole}: </dt>
              <dd className="inline">
                {project.caseStudy.ownership
                  ? caseLabel(project.caseStudy.ownership, locale)
                  : copy.roleUnknown}
              </dd>
            </div>
            {project.caseStudy.maintenance && (
              <div>
                <dt className="inline text-neutral-300">
                  {copy.caseMaintenance}:{" "}
                </dt>
                <dd className="inline">
                  {caseLabel(project.caseStudy.maintenance, locale)}
                </dd>
              </div>
            )}
            {project.caseStudy.aiUsage.length > 0 && (
              <div>
                <dt className="inline text-neutral-300">{copy.caseAI}: </dt>
                <dd className="inline">
                  {project.caseStudy.aiUsage
                    .map((usage) => caseLabel(usage, locale))
                    .join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </article>
      ))}
      <Link
        href="/projects"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center text-sm text-white underline"
      >
        {copy.browse} ↗
      </Link>
    </div>
  );
  const fit = (
    <div className="space-y-5">
      <p className="text-sm text-neutral-400">{copy.optional}</p>
      {field("timing")}
      {value.intent === "team" ? (
        <>
          {field("capacity")}
          {field("duration")}
          {field("workplace")}
        </>
      ) : (
        field("budget")
      )}
    </div>
  );
  const contacts = (
    <div className="space-y-5">
      {field("name")}
      {field("email")}
      {field("company")}
    </div>
  );
  const contextKind = value.context.offer || value.context.service;
  const contextName =
    projects.find((project) => project.id === value.context.projectId)?.name ||
    (contextKind ? copy.contextNames[contextKind] : "");
  const summary = (
    <dl className="space-y-5 text-sm">
      <div>
        <dt className="text-neutral-500">{copy.steps[0]}</dt>
        <dd className="mt-1 text-white">
          {value.intent ? intentLabels[locale][value.intent] : "—"}
        </dd>
      </div>
      {Object.keys(copy.labels)
        .filter(
          (key) =>
            value[key as Field] &&
            (value.intent === "team"
              ? key !== "budget"
              : !["capacity", "duration", "workplace"].includes(key)),
        )
        .map((key) => (
          <div key={key}>
            <dt className="text-neutral-500">{copy.labels[key as Field]}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-neutral-200">
              {value[key as Field]}
            </dd>
          </div>
        ))}
      {contextName && (
        <div>
          <dt className="text-neutral-500">{copy.source}</dt>
          <dd className="mt-1 break-words text-neutral-300">{contextName}</dd>
        </div>
      )}
    </dl>
  );
  const titles = [
    copy.question,
    copy.context,
    copy.evidence,
    copy.fit,
    copy.contact,
    copy.review,
  ];

  return (
    <section
      id="enquiry-flow"
      className="space-y-6 border border-white/30 bg-black/85 p-5 sm:p-8"
      aria-label={locale === "de" ? "Projektanfrage" : "Project enquiry"}
    >
      <Dialog.Root open={confirmDetails} onOpenChange={setConfirmDetails}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[101] max-h-[90dvh] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 space-y-5 overflow-y-auto border border-white/30 bg-black p-6 text-neutral-100 shadow-2xl outline-none"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (!editingDetails.current) {
                if (!submitting.current) sendControl.current?.focus();
                return;
              }
              editingDetails.current = false;
              document
                .getElementById(
                  `enquiry-${missingProjectDetails(value)[0] ?? "situation"}`,
                )
                ?.focus();
            }}
          >
            <Dialog.Title className="text-xl leading-relaxed text-white">
              {copy.missingDetailsTitle}
            </Dialog.Title>
            <Dialog.Description className="text-sm leading-relaxed text-neutral-300">
              {copy.missingDetailsDescription}
            </Dialog.Description>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => {
                  editingDetails.current = true;
                  if (!standard) setStep(1);
                  setConfirmDetails(false);
                }}
              >
                {copy.addDetails}
              </Button>
              <button
                type="button"
                className="min-h-11 px-2 text-sm text-neutral-300 underline underline-offset-4"
                onClick={() => {
                  setConfirmDetails(false);
                  void send(true);
                }}
              >
                {copy.sendWithoutDetails}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-5">
        <p className="text-xs uppercase tracking-[0.15em] text-neutral-400">
          {receipt
            ? copy.saved
            : standard
              ? copy.review
              : `${String(step + 1).padStart(2, "0")} / 06 · ${copy.steps[step]}`}
        </p>
        {!receipt && (
          <button
            type="button"
            onClick={() => {
              setStandard((current) => !current);
              setErrors([]);
            }}
            disabled={sending}
            className="min-h-11 text-xs text-neutral-300 underline underline-offset-4"
          >
            {standard ? copy.guided : copy.standard}
          </button>
        )}
      </div>
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-xl font-medium leading-relaxed text-white outline-none"
      >
        {receipt ? copy.saved : standard ? copy.review : titles[step]}
      </h2>
      {receipt ? (
        <div className="space-y-6">
          <p role="status" className="text-sm leading-relaxed text-neutral-300">
            {copy.savedDetail}
          </p>
          <p className="break-all text-xs text-neutral-400">
            {copy.reference}: {receipt}
          </p>
          {summary}
          <Button type="button" onClick={restart}>
            {copy.restart}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-6">
          <fieldset disabled={sending || !ready} className="min-w-0 space-y-6">
            {restored && (
              <p className="text-xs text-neutral-400">
                {copy.restored} {copy.notsent}
              </p>
            )}
            {standard ? (
              <>
                {choices}
                {context}
                <h3 className="border-t border-white/20 pt-6 text-lg text-white">
                  {copy.evidence}
                </h3>
                {evidence}
                {fit}
                {contacts}
              </>
            ) : (
              [choices, context, evidence, fit, contacts, summary][step]
            )}
            <div className="hidden" aria-hidden="true">
              <label>
                Website
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={value.website}
                  onChange={(event) => set("website", event.target.value)}
                />
              </label>
            </div>
            {errors.length > 0 && (
              <p
                id="enquiry-errors"
                role="alert"
                className="text-sm leading-relaxed text-amber-200"
              >
                {copy.invalid}
              </p>
            )}
            {failure && (
              <p
                role="alert"
                className="text-sm leading-relaxed text-amber-200"
              >
                {failure}{" "}
                <a href="mailto:alexander@fuerst.one" className="underline">
                  alexander@fuerst.one
                </a>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 border-t border-white/20 pt-6">
              {!standard && step > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStep((current) => current - 1);
                    setErrors([]);
                    setFailure("");
                  }}
                  className="min-h-11 px-2 text-sm text-neutral-300 underline"
                >
                  {copy.back}
                </button>
              )}
              <Button type="submit" className="max-w-full">
                {sending
                  ? copy.sending
                  : standard || step === 5
                    ? copy.send
                    : copy.next}
              </Button>
              {!standard && step === 5 && (
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setErrors([]);
                  }}
                  className="min-h-11 text-sm text-neutral-300 underline"
                >
                  {copy.edit}
                </button>
              )}
            </div>
          </fieldset>
          <p className="text-xs leading-relaxed text-neutral-500">
            {copy.stored}{" "}
            <Link href="/privacy" className="text-neutral-300 underline">
              {copy.privacy}
            </Link>
          </p>
          <button
            type="button"
            onClick={restart}
            disabled={sending}
            className="min-h-11 text-xs text-neutral-400 underline"
          >
            {copy.reset}
          </button>
        </form>
      )}
    </section>
  );
}
