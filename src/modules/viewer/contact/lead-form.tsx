"use client";
// "Request a call about this unit": a small form that posts the visitor's
// name and phone to the lead route (U-805), which forwards it to the client's
// CRM webhook. Shown only for projects that have a webhook.
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { LEAD_HONEYPOT_FIELD, LEAD_MESSAGE_MAX, LEAD_NAME_MAX, parseLeadRequest } from "@/modules/schema";
import type { ViewerLocale, ViewerText } from "../layout/viewer-text";
import { leadEndpoint } from "./lead-endpoint";

export interface LeadSendResult {
  status: number;
  body: unknown;
}
export type LeadSend = (url: string, body: Record<string, string>) => Promise<LeadSendResult>;

export interface LeadFormProps {
  slug: string;
  unitCode: string;
  locale: ViewerLocale;
  text: ViewerText;
  /** WhatsApp enquiry link offered when sending fails. */
  whatsappHref?: string;
  /** Defaults to fetch; tests pass a fake. */
  send?: LeadSend;
}

type Field = "name" | "phone" | "message";
const FIELDS: readonly Field[] = ["name", "phone", "message"];

const fetchSend: LeadSend = async (url, body) => {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json().catch(() => null) };
};

/** The field names a 400 answer lists, limited to the ones on this form. */
function fieldsOf(body: unknown): Field[] {
  const fields = (body as { fields?: unknown } | null)?.fields;
  return Array.isArray(fields) ? FIELDS.filter((f) => fields.includes(f)) : [];
}

const inputClass = "w-full rounded-md border border-white/20 bg-zinc-900 px-2 py-1.5 text-sm text-white aria-[invalid=true]:border-red-400";

export function LeadForm({ slug, unitCode, locale, text, whatsappHref, send = fetchSend }: LeadFormProps) {
  const id = useId();
  const [phase, setPhase] = useState<"closed" | "open" | "sending" | "sent">("closed");
  const [invalid, setInvalid] = useState<Field[]>([]);
  const [failure, setFailure] = useState<string | undefined>();
  const nameRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const t = text.lead;

  useEffect(() => {
    if (phase === "open") nameRef.current?.focus();
    if (phase === "sent") resultRef.current?.focus();
  }, [phase]);

  if (phase === "closed") {
    return (
      <button type="button" onClick={() => setPhase("open")} className="rounded-md border border-white/30 px-3 py-1.5 text-sm font-medium hover:bg-white/10">
        {t.button}
      </button>
    );
  }
  if (phase === "sent") {
    return (
      <p ref={resultRef} tabIndex={-1} role="status" className="rounded-md bg-white/10 p-3 text-sm">
        {t.sent}
      </p>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body: Record<string, string> = {
      unitCode,
      locale,
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      message: String(data.get("message") ?? ""),
      [LEAD_HONEYPOT_FIELD]: String(data.get(LEAD_HONEYPOT_FIELD) ?? ""),
    };
    setFailure(undefined);
    const local = parseLeadRequest(body);
    if (!local.ok) {
      setInvalid(FIELDS.filter((f) => local.errors.some((err) => err.path === f)));
      return;
    }
    setInvalid([]);
    setPhase("sending");
    try {
      const result = await send(leadEndpoint(window.location.pathname, slug), body);
      if (result.status === 200) return setPhase("sent");
      const fields = result.status === 400 ? fieldsOf(result.body) : [];
      if (fields.length > 0) setInvalid(fields);
      else setFailure(result.status === 429 ? t.tooMany : t.failed);
    } catch {
      setFailure(t.failed);
    }
    setPhase("open");
  }

  const errorId = (f: Field) => `${id}-${f}-error`;
  const fieldProps = (f: Field) => ({
    id: `${id}-${f}`,
    name: f,
    "aria-invalid": invalid.includes(f),
    "aria-describedby": invalid.includes(f) ? errorId(f) : undefined,
    className: inputClass,
  });
  const error = (f: Field) =>
    invalid.includes(f) && (
      <p id={errorId(f)} className="text-xs text-red-300">
        {t.invalid[f]}
      </p>
    );
  const sending = phase === "sending";

  return (
    <form onSubmit={onSubmit} noValidate aria-label={t.title(unitCode)} className="flex flex-col gap-2 rounded-md border border-white/10 p-3">
      <h3 className="text-sm font-semibold">{t.title(unitCode)}</h3>
      <label htmlFor={`${id}-name`} className="text-xs text-zinc-300">
        {t.name}
      </label>
      <input ref={nameRef} type="text" autoComplete="name" maxLength={LEAD_NAME_MAX} {...fieldProps("name")} />
      {error("name")}
      <label htmlFor={`${id}-phone`} className="text-xs text-zinc-300">
        {t.phone}
      </label>
      <input type="tel" autoComplete="tel" inputMode="tel" dir="ltr" {...fieldProps("phone")} />
      {error("phone")}
      <label htmlFor={`${id}-message`} className="text-xs text-zinc-300">
        {t.message} ({t.optional})
      </label>
      <textarea rows={3} maxLength={LEAD_MESSAGE_MAX} {...fieldProps("message")} />
      {error("message")}
      {/* People never see this field; bots that fill it are dropped by the server. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name={LEAD_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <div role="alert" className="text-sm text-red-300 empty:hidden">
        {failure}
        {failure && whatsappHref && (
          <>
            {" "}
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="underline">
              {text.contact.unitButton}
            </a>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={sending} className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-60">
          {sending ? t.sending : t.submit}
        </button>
        <button type="button" onClick={() => { setPhase("closed"); setInvalid([]); setFailure(undefined); }} className="rounded-md px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10">
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
