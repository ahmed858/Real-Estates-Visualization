# Leads: "Ask about this unit"

A visitor can leave their name and phone number on a unit. The site checks the
request and forwards it, as one JSON document, to a webhook that belongs to
the client: their CRM directly, or Zapier / Make, which can pass it on to
almost any CRM, a Google Sheet or an email inbox.

## Turning it on for a project

1. Get a webhook URL from the client (or create one in Zapier with
   "Webhooks by Zapier → Catch Hook", or in Make with "Custom webhook"). It
   must start with `https://`.
2. In the Vercel project, add or edit the environment variable
   `LEAD_WEBHOOKS`: `slug=url`, several projects separated by commas, e.g.
   `client-towers=https://hooks.zapier.com/hooks/catch/123/abc/,demo-villa=https://hook.eu1.make.com/xyz`.
3. Redeploy. A project without an entry shows no form.

The URL is a secret (anyone who has it can send fake leads), so it never goes
in `project.json`, the repository or a log line. Bad entries are skipped with
a warning that names only the slug.

## What the webhook receives

`POST` with `Content-Type: application/json`:

```json
{
  "type": "unit-enquiry",
  "version": 1,
  "receivedAt": "2026-11-27T01:30:00.000Z",
  "project": { "slug": "demo-villa", "name": "فيلا تجريبية" },
  "unit": {
    "code": "A-101",
    "scene": "ground-floor",
    "floor": 0,
    "type": "Apartment",
    "status": "available",
    "price": 2500000
  },
  "contact": { "name": "Mona Ali", "phone": "+20 100 123 4567", "message": "Call me after 5" },
  "locale": "ar"
}
```

- `project.name` is in the project's default language.
- `unit` comes from the units sheet at the moment of the enquiry, not from the
  visitor, so a visitor cannot change the price or status that is sent.
- `contact.phone` is kept as typed (Arabic digits become 0-9); `message` is
  `null` when the visitor left it empty.
- `locale` is the language the visitor used the site in (`ar` or `en`).
- `version` changes only if a field is removed or changes meaning.

Any `2xx` answer counts as delivered. A webhook that answers anything else, or
not within 8 seconds, gets no retry: the visitor sees that sending failed and
can use WhatsApp instead.

## Protection against spam

- A hidden field that people never see; requests that fill it are dropped
  without telling the sender.
- At most 5 enquiries per visitor IP every 10 minutes. The count lives in the
  memory of each server instance, so it slows down casual spam but is not a
  hard limit.
- Bodies over 8 KB, non-JSON bodies, unknown units and hidden projects are
  refused.

## The endpoint

`POST /p/<slug>/lead` (also `/lead` on a client's own domain) with
`{ "unitCode", "name", "phone", "message"?, "locale"?, "website" }`, where
`website` is the hidden field. Answers `{ "ok": true }`, or
`{ "ok": false, "error": "...", "fields"?: [...] }` with status 400 (invalid,
`fields` names them), 404 (no webhook, or project not found), 413, 415, 429
(with `Retry-After`), 502 (webhook failed) or 503 (project data invalid).
Because of this route, no scene may be called `lead`.
