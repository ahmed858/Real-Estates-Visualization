# Open questions for the owner

The agent adds a question here when a unit is unclear, marks that unit
`blocked` in `docs/BACKLOG.md`, and moves on. The owner answers inline; the
next run picks the answer up and unblocks the unit.

Format:

```
## Q-<n> (<unit-id>) <short title>
- Asked: <YYYY-MM-DD>
- Question: ...
- Answer (2026-11-26): the owner sent a Pexels photo of a six-storey
  residential building; it became `projects/demo-residence`. Closed.
```

## Q-1 (U-410) Photo for the demo villa facade
- Asked: 2026-11-26
- Question: Which building photo should the demo use? It must be free for
  commercial use (Pexels or Unsplash licence, or CC0) and show a low-rise
  residential building from the front with each storey visible. Upload it in
  the project thread, or commit it as `projects/demo-villa/images/facade.jpg`
  with its source link.
- Answer (2026-11-26): the owner sent a Pexels photo of a six-storey
  residential building; it became `projects/demo-residence`. Closed.

## Q-2 (U-503) How will clients share their Google Sheet?
- Asked: 2026-11-26
- Question: Phase 5 reads unit statuses from each client's Google Sheet. Two
  ways are possible: (a) the client sets the sheet to "anyone with the link
  can view" (no setup, U-502 covers it, but anyone who learns the sheet link
  can read prices); or (b) the sheet stays private and is shared with a
  Google Cloud service account (more secure; you create one service account
  in Google Cloud, download its JSON key and add two environment variables in
  Vercel; I then build U-503). Which do you want: (a) only, (b) only, or both
  (a) for most clients, (b) when a client asks?
- Answer: (owner fills this in)

## Q-3 (U-504) How fast must a status change show on the site?
- Asked: 2026-11-26
- Question: After a client edits a status in the sheet, how long may the site
  take to show it? Shorter means more requests to Google. The plan uses 60
  seconds unless you choose another value (for example 30 seconds or 5
  minutes).
- Answer: (owner fills this in)

## Q-4 (U-1103) What should come after launch?
- Asked: 2026-11-27
- Question: Everything on the roadmap is built (Phases 1-10). Two small test
  units remain (U-1101, U-1102). After them, what next? For example: (a)
  pause until the first client gives feedback; (b) visitor analytics (which
  units people open most); (c) a "reserve this unit" request with a deposit
  link; (d) a simple page where the client changes statuses without a
  sheet. Pick one or more, or describe something else.
- Answer: (owner fills this in)
