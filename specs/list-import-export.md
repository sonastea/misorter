# List import/export

Status: Draft implementation spec; proposed defaults for review

Date: 2026-09-15

Implementation progress: [v3.1.0 checklist](list-import-export-todo.md)

## 1. Recommendation

Support **one canonical, versioned JSON format** for reliable backups and
round-trip transfers, plus **CSV and plain text** for everyday interoperability.
Accept files and pasted content, and preview imports before applying them.

Flexible input should be an adapter into the canonical list model. It should not
make the saved format ambiguous. Most useful inputs—spreadsheet columns, one item
per line, and bulleted lists—can be parsed deterministically in the browser.

Implement **AI-assisted extraction as a small, opt-in server-side addition** once
the deterministic preview flow works. Use a **Cloudflare Workers AI binding in the
existing backend Worker**: the browser submits text through tRPC, the Worker calls
a hosted model, and the response populates the same editable preview.

The binding uses the app's Cloudflare account, so users need no login, API key, or
model download. The integration needs no provider SDK or separate backend service.
AI proposes a draft; ordinary parsing and exports stay local and predictable.
Users choose AI with a single “Extract with AI” action rather than a separate
setup or chat flow. Section 9 specifies this incremental V1.1 addition.

## 2. Goals and scope

### V1

- Import one list from a UTF-8 JSON, CSV, or TXT file, or from pasted text.
- Export the current list as JSON, CSV, or TXT without creating a share link.
- Preserve title, item values, duplicates, and item order exactly in native JSON.
- Let users review and edit parsed content, then replace the current draft or
  append items to it.
- Work for anonymous users, matching the existing list creation flow.
- Keep deterministic parsing and download generation client-side.

### V1.1: server-assisted import

- Extract list items from pasted prose or irregular copied content through the
  existing tRPC backend and a Workers AI binding.
- Reuse the import dialog, editable preview, and replace/append behavior.
- Keep access anonymous, with bounded requests and server-side usage limits.

### Follow-up scope

- Ranked-result exports/imports with explicit tie semantics.
- Multiple-list archives, spreadsheet workbooks, document/image extraction, and
  imports from remote URLs.
- Restoring an in-progress sorting session or synchronizing existing share links.

In this spec, a **list** means its title and ordered input items. It does not mean
the final ranking. An export made while sorting contains the original input list;
the UI must name that action “Export input list.”

## 3. Existing implementation and implications

| Area                 | Current implementation                                                                                                    | Implication                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Draft state          | `src/routes/index.tsx` owns `title`, `list`, and local UUIDs.                                                             | Apply imports through a single route-level callback.                                       |
| Editing and creation | `src/components/Setup.tsx` edits items and calls `listing.create` on Start.                                               | Import prepares a draft; Start retains responsibility for persistence.                     |
| Share-link identity  | The home route tracks `currentListData`, `appliedLabel`, `getListOnce`, and `initialListSize`.                            | Imported drafts must detach from the old server list, even when item counts match.         |
| Title editing        | `src/components/ListTitleEdit.tsx` updates the server when a label is present.                                            | Detach imported drafts before allowing title edits, so they cannot rename the source list. |
| Storage              | `src/db/schema.ts` stores a title of up to 255 characters and item text. `listing.get` orders items by ascending item ID. | The transfer format needs no database IDs; persistence must preserve input order.          |
| API                  | `src/backend/router/listing.ts` uses tRPC, Valibot, and a transaction for creation.                                       | Reuse the existing create procedure with shared validation.                                |
| Results              | `src/components/Sort.tsx` holds sorting state and derives dense ranks with ties locally.                                  | Do not infer ranking from array order in a list export.                                    |
| Existing download    | `src/components/DownloadAsPngButton.tsx` exports a rendered results image.                                                | Structured list downloads use list state rather than the rendered results table.           |

No database migration, file storage service, or new API endpoint is required for
V1. V1.1 adds a Workers AI binding, a backend feature flag, one extraction mutation,
and a lightweight availability query. The current Worker ignores its `env`
argument, and `src/backend/context.ts` only exposes request headers and `waitUntil`;
V1.1 must explicitly pass the binding into request-scoped tRPC context.

## 4. Canonical format: Misorter List v1

Suggested filename: `<sanitized-title>.misorter.json`

Media type: `application/json;charset=utf-8`

```json
{
  "format": "misorter-list",
  "version": 1,
  "title": "Favorite games",
  "items": [
    { "value": "Hades" },
    { "value": "Outer Wilds" },
    { "value": "Disco Elysium" }
  ]
}
```

### Contract

- `format` must equal `misorter-list`; `version` must be the integer `1`.
- `title` and `items` are required. Each item must have a string `value`.
- Array order is input order, not rank. Duplicate values are valid, separate items.
- Preserve string content exactly, including surrounding whitespace, Unicode,
  punctuation, and embedded line breaks. Validate nonblank content without
  trimming the stored value.
- Generate new browser UUIDs when applying an import. Generate a new server label
  only if the user subsequently creates a shareable list.
- Do not export or restore database IDs, browser UUIDs, share labels, visits,
  timestamps, credentials, or sort-engine state.
- V1 objects are strict: report unknown fields with their paths rather than
  silently dropping potentially meaningful data. Future contract changes require
  a new version and a deliberate reader implementation.
- Recognize the format/version before validating its remaining fields. An unknown
  version gets “This file uses an unsupported Misorter format version.” Do not
  reinterpret an unsupported or malformed native file as text or send it to AI.
- Emit UTF-8, two-space-indented JSON with a trailing newline. Import accepts
  ordinary JSON whitespace and an optional leading UTF-8 BOM.

**Round-trip guarantee:** for every V1-valid draft, exporting and reimporting JSON
preserves the title and ordered sequence of item values exactly. Local/server
identity is intentionally new.

## 5. Interoperability formats

### CSV

Use a CSV parser that handles quoted fields, escaped double quotes, embedded
newlines, CRLF/LF record endings, and an optional UTF-8 BOM. Do not split records on
commas or newline characters manually. Prefer a small, maintained,
browser-compatible parser; select and pin it during implementation.

The documented export shape is:

```csv
title,value
Favorite games,Hades
Favorite games,Outer Wilds
Favorite games,Disco Elysium
```

- Export a `title,value` header and repeat the title in every item row. Preserve
  item order and duplicates; use standard quoting and CRLF record endings.
- Import this shape directly. A mapped title column may contain repeated identical
  nonblank titles; conflicting titles require the user to choose a title in the
  preview. Do not split the input into multiple lists.
- For other CSV files, expose a header-row toggle and an item-column selector.
  Suggest a column named `value`, `item`, or `name` (case-insensitive) only when the
  match is unambiguous. If there is exactly one column, select it automatically.
  Require a selection for ambiguous multi-column input.
- A title-column selector is optional; default to the exact `title` header when
  present. Otherwise use the fallback title described below.
- Preserve selected cell values. Ignore wholly empty records and report their
  count. A record with an empty/whitespace-only selected item cell is an error
  until corrected or explicitly removed. Report unused columns in the preview.
- Unclosed quotes and inconsistent record widths are errors with record locations.
  Do not guess how to repair them.
- V1 supports comma-delimited CSV. TSV/semicolon delimiter selection can be added
  later; users can already paste a single spreadsheet column as plain text.
- Export for spreadsheet use: prefix cells beginning with `=`, `+`, `-`, `@`, tab,
  CR, or LF (including formula markers after leading whitespace) with an apostrophe.
  Apply this to titles and values before CSV quoting. When this changes content,
  explain in the export dialog that JSON preserves exact text. CSV import must not
  automatically strip apostrophes, which may be part of the original value.

CSV is the spreadsheet-friendly option; native JSON is the exact backup format.

### Plain text and pasted lists

- Default to one nonblank line per item. Normalize CRLF/CR line endings to LF for
  splitting, omit blank lines, and report how many were omitted.
- Preserve each remaining line's text by default. Commas, semicolons, and tabs
  inside a line are literal text; never guess that they separate items.
- Offer an explicit “Remove list markers” option, off by default. Remove at most
  one leading bullet (`-`, `*`, `•`) or numeric marker (`1.`, `1)`) followed by
  whitespace, allowing leading indentation. Show the transformed values in the
  preview. Do not remove punctuation elsewhere or interpret Markdown formatting.
- Do not infer a title from the first line or filename contents beyond the
  fallback rule. Every nonblank line is an item unless the user removes it.
- TXT export writes item values only, separated by LF with a final newline.
  Describe it as “Items only; title not included.”
- If any item contains CR/LF, disable TXT export with an explanation and direct
  users to JSON or CSV. Never split one stored item into multiple exported items.

### Format selection and fallback title

- The dialog offers Auto, Misorter JSON, CSV, and Plain text.
- In Auto mode, known file extensions select the parser. For pasted content or
  unknown extensions, a leading `{` or `[` selects JSON; otherwise use plain
  text. Pasted CSV requires selecting CSV. Do not use comma guessing.
- JSON input must match the native contract in V1. Bare arrays and unrelated JSON
  objects get an explanation and an example of the supported shape.
- Treat MIME type as a hint; files often have an empty or generic type. Reject
  invalid UTF-8 and clearly binary inputs with an actionable message.
- Without an imported title, use the filename minus its extension, or `misorter`
  for pasted content. Titles remain editable. An invalid filename-derived title
  needs correction rather than silent truncation.

## 6. Validation and limits

Proposed V1 limits, shared between import preview, export, and server creation:

| Constraint              | Limit / behavior                                   |
| ----------------------- | -------------------------------------------------- |
| Raw file or pasted text | At most 1 MiB (1,048,576 UTF-8 bytes)              |
| Items per draft         | 1–1,000; at least 2 to start sorting/create a list |
| Title                   | Nonblank, at most 255 Unicode code points          |
| Item value              | Nonblank, at most 2,000 Unicode code points        |
| Canonical JSON output   | At most 1 MiB, including serialization overhead    |

- Check file byte size before reading; use actual encoded byte size for pasted
  content. Bound parsing before allocating an unbounded number of preview rows.
- Validate the resulting canonical document size after parsing or edits as well,
  so a valid draft's JSON export can always be imported under the same limits.
- Use schema-based validation and schema-derived TypeScript types. The current
  routers use Valibot; share that validation rather than maintaining divergent
  client/server rules. Measure code points consistently, including emoji.
- Validate the combined list for append mode, including its retained title.
- Keep duplicate items by default. Show their count as information; do not
  deduplicate or normalize Unicode/case automatically.
- Never truncate long titles, items, or excess rows. Show errors with field/row
  locations, retaining the source and editable preview where possible.
- Reject NUL characters. Render imported content as text, including strings that
  look like HTML or URLs; do not inject markup or fetch item URLs.
- Existing lists may exceed these new limits. They remain readable; export reports
  incompatible fields and lets users return to editing. The round-trip guarantee
  applies to valid drafts, not arbitrary legacy records.

## 7. User flows

### Import

1. Add an **Import list** action beside the setup controls. Open a dialog with file
   selection and a paste textarea, a format selector, and a downloadable example.
2. Parse locally into a temporary preview. Reading/parsing never changes the active
   list, navigates, creates a visit, or writes to the server. When V1.1 is enabled,
   “Extract with AI” submits pasted text to the backend and fills this same preview.
3. Show the detected/selected format, editable title, item count, editable item
   rows, source row/line references, and validation messages. Allow removing rows;
   embedded line breaks must be visible and editable as part of a single item.
4. If a draft already exists, offer **Replace current list** (default) and **Append
   items**. Replace uses the preview title and items; append preserves the current
   title and appends imported items after existing items. State the resulting item
   count and action in the primary button.
5. Enable **Use imported list** only when the final draft is valid. This click
   applies the preview; do not require another confirmation dialog.
6. Apply all state changes together and return focus to the setup list. The user
   can edit, export, or click Start using the existing creation flow.

Cancel leaves the current list and URL untouched. Parser errors preserve the
source for correction. If the user selects another file, changes format/options,
or closes the dialog while work is pending, ignore stale parse results. Re-parsing
explicitly rebuilds the preview from the source; communicate that preview edits
will be replaced.

Disable import while the initial list is loading or a list/title save is pending.
Offer import only in setup; during sorting, users can return through the existing
Back flow to edit or import.

### Applying a draft safely

Implement one route-level `applyImportedList` handler that:

- Generates UUIDs for imported rows; append retains IDs of existing rows.
- Sets the final title/list, clears the pending item input, exits title edit mode,
  and sets `startSort` to false.
- Sets `getListOnce` to false and `initialListSize` to its unsaved sentinel.
- Clears `currentListData`, `appliedLabel`, and any selected featured-list identity;
  resets `oldTitle` to the final draft title for local title cancellation.
- Removes the `list` search parameter with a history replacement, preserving other
  relevant search parameters. The imported content must not carry the old link's
  identity, including when append mode is used.
- Guards the server-to-draft effect so it only applies data whose label matches
  the currently requested URL label. A late response for the previous label must
  not overwrite the imported draft.

The next Start must create a new list even if the imported list has the same item
count as the previously loaded list. Source-list query cache entries continue to
describe the source list; do not seed them with imported content.

### Export

- Add **Export list** in setup and **Export input list** alongside sharing controls
  in `Sort.tsx`. Pass the current title and input items through props.
- Open a small format selector: **Misorter JSON — exact backup** (default),
  **CSV — spreadsheet**, and **Plain text — items only**.
- Export from the latest committed React state, including edits to a loaded list.
  Update the current `contentEditable` item handling to use immutable state updates
  on input; its existing keydown mutation can otherwise miss the final typed value
  or a pasted edit. Commit active editor changes before taking the export snapshot.
- Create a UTF-8 Blob and trigger a download using an object URL. Sanitize filename
  path separators/control characters, bound its length, and fall back to
  `misorter-list`. Revoke object URLs after use.
- Disable export for an empty or invalid draft with a specific reason. Preserve
  the draft if download generation fails and allow retry.
- Check each serialized download against the raw import byte limit. If CSV's
  repeated title or escaping makes it too large, explain that and offer JSON.
- Export does not create a database record, call `listing.get`, or record a visit.

### UI conventions

Use Headless UI dialogs, buttons, fields, and inputs, with shared prefixed classes
in `src/styles/globals.css` and existing theme variables. Keep related dark and
responsive rules adjacent. Dialogs must have accessible names, keyboard support,
focus management, announced errors, and a usable mobile preview without horizontal
page scrolling. Use a bounded preview viewport/pagination for large imports.

## 8. Architecture and API integration

### Proposed files

| File                                   | Responsibility                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/utils/list-transfer/schema.ts`    | Versioned document schema, editable draft schema, limits, inferred types, and structured issues. |
| `src/utils/list-transfer/parse.ts`     | Format selection and deterministic JSON/CSV/text adapters with source locations.                 |
| `src/utils/list-transfer/serialize.ts` | JSON/CSV/TXT serialization and format-specific compatibility checks.                             |
| `src/utils/list-transfer/download.ts`  | Browser Blob download and filename cleanup.                                                      |
| `src/components/ListImportDialog.tsx`  | Source input, parser options, editable preview, replace/append selection.                        |
| `src/components/ListExportDialog.tsx`  | Format selection, compatibility messages, and download action.                                   |
| `src/routes/index.tsx`                 | Import application and server/draft identity handling.                                           |
| `src/components/Setup.tsx`             | Entry points, reliable item editing, validation before Start.                                    |
| `src/components/Sort.tsx`              | Input-list export entry point and title propagation.                                             |
| `src/backend/router/listing.ts`        | Reuse shared create/title validation and preserve item order.                                    |

Keep parser/serializer modules pure and usable without React, browser APIs,
database imports, or external calls. Pass only validated draft values into active
list state and persistence. Import source metadata belongs to the temporary preview,
not the portable document or database.

Use a discriminated parse result with an optional draft and structured issues:
each issue has `severity`, a stable `code`, `message`, and, where available,
`path`, `sourceLine`, or `sourceRecord`. Errors block apply; informational notices
such as duplicate counts or skipped blank lines do not. Syntax errors may have no
draft; field validation errors should keep an editable candidate.

### Existing tRPC procedures

- `listing.create` remains `{ title: string, items: { value: string }[] }` and
  returns the existing `{ label, title, items }` shape. Import-only fields and file
  contents never reach this procedure.
- Validate create requests server-side with the shared draft rules, a two-item
  minimum, and the canonical serialized-size limit. Manual entry uses the same
  preflight rules, so imports do not introduce an inconsistent validation path.
- Reuse the title rule in `listing.updateTitle` and the title editor.
- Retain atomic listing/item insertion and request-scoped `getDb()`. Persist input
  order so a later `listing.get` produces the same sequence; explicitly order the
  creation response by inserted item ID instead of assuming SQL `RETURNING` order.
- Expected validation failures use tRPC `BAD_REQUEST` with actionable messages;
  unexpected persistence failures surface as internal failures through the existing
  error path. Never partially save an invalid import.
- Creation generates a fresh label. Seed only the new label's query cache on
  success if following the existing home-route cache pattern. Any touched mutation
  that changes cached entities must invalidate/refresh related keys, including
  not-found cleanup paths.
- Keep nonblocking cache/analytics side effects in `ctx.waitUntil(...)`, logging
  and swallowing background failures. Persistence itself is awaited.

## 9. V1.1: frictionless server-side AI extraction

### Architecture choice

Use **Cloudflare Workers AI directly through `env.AI.run(...)`**, exposed only to
the existing backend. This is the smallest integration for the current hosting
setup: Cloudflare runs inference, the Worker validates the result, and the browser
renders it. Use one provider call per extraction, awaited as an ordinary tRPC
mutation. A single structured response fits the preview workflow without streaming,
background jobs, model hosting, or an agent framework.

```text
Import dialog: pasted text + Extract with AI
  → listing.extractImport (existing /trpc endpoint)
  → Worker: validate input, reserve quota, call env.AI.run
  → Worker: validate structured output and source matches
  → Existing editable preview
  → Use imported list (local draft)
  → Start (existing listing.create flow)
```

Keep the provider-specific code in `src/backend/services/list-import-ai.ts` with a
single extraction function accepting the request's binding and validated input.
Pass the binding per request rather than storing it in a module-level singleton.
Shared schemas contain only data contracts; the frontend must not import the
service implementation. The native export format stays provider-independent.

### User experience

- Add **Extract with AI** beside the paste input, available even when plain-text
  parsing succeeds: messy prose can be syntactically valid plain text.
- Add brief helper text: “Turn messy text into list items using Cloudflare AI.”
  Clicking the action submits the text directly; reuse the existing preview as the
  review step. No account setup, model selector, chat history, or extra consent
  dialog is needed.
- Accept pasted text only for the first AI release. This also covers copied tables
  and bullet lists without adding file-upload infrastructure.
- Keep deterministic parsing as the default. Do not automatically send parser
  failures, native JSON documents, or exports to AI.
- Show “Extracting…” while pending and disable duplicate submissions. Retain the
  source and previous preview until a valid response arrives. Mark the new preview
  “Extracted with AI”; suggested titles remain editable.
- Tie the response to a client-side source revision. Editing the source, switching
  parser modes, closing the dialog, or starting another extraction invalidates
  older responses. A response must not overwrite preview edits made while pending.
- On failure, show an inline message and keep both text and preview. Users can retry
  explicitly, edit manually, or use ordinary text/CSV parsing.

### Worker wiring and deployment

When implementing V1.1:

1. Add an AI binding and nonsecret feature flag to `wrangler.jsonc`. Configure the
   binding and flag explicitly for production and `env.preview`; do not assume
   bindings or environment variables are inherited. The relevant fragment is:

   ```jsonc
   {
     "ai": { "binding": "AI" },
     "vars": { "AI_IMPORT_ENABLED": "false" },
   }
   ```

2. Generate Worker binding types with `wrangler types` and use them in the server
   `Env` type. In `src/server/server.ts`, use `env` and pass its AI binding and parsed
   feature flag to `createContext`. Extend `src/backend/context.ts` accordingly;
   do not put the binding object into `process.env`.
3. Treat the feature as enabled only when the flag is exactly `"true"` and the
   binding is present. Missing/disabled AI configuration must not break ordinary
   list routes or imports. The native binding needs no provider API secret.
4. Document the flag in `.env.example` and the backend environment-variable section
   of `DEPLOYMENT.md`. Show Wrangler configuration and Cloudflare Dashboard steps
   for the flag and the **Workers AI → AI** binding, including preview deployment.
   If external-provider credentials are added later, document their server-only
   Wrangler secret commands and Dashboard setup then.
5. Keep local AI disabled by default via `.dev.vars`. An explicitly enabled
   `wrangler dev` session uses remote Workers AI and consumes the Cloudflare
   account's allowance. Mock the extraction service in automated tests.

Additional files touched by V1.1 are `src/server/server.ts`,
`src/backend/context.ts`, `src/backend/router/listing.ts`,
`src/backend/services/list-import-ai.ts`, `wrangler.jsonc`, and deployment docs.

### tRPC contracts

Use `publicProcedure`, matching anonymous list creation. Do not reuse the
admin-oriented protected flow.

- **`listing.importCapabilities` query:** no input; returns
  `{ ai: { enabled: boolean, maxInputBytes: number, maxItems: number } }`.
  Fetch only when the import dialog opens. It reads configuration without calling
  a model or checking Redis. If unavailable, keep local import working and hide
  the AI action. The mutation still checks configuration and quotas independently.
- **`listing.extractImport` mutation input:** `{ text: string }`. Keep model choice,
  prompts, output limits, and provider options server-controlled. A custom
  instruction field is unnecessary for the initial extraction flow.
- **Success result:** `{ draft: { title: string, items: { value: string }[] }, titleSuggested: boolean, issues: ImportIssue[] }`. Reuse the shared issue shape
  and draft schema. Return source locations computed by the server as issue/preview
  metadata where useful, not as fields in the portable document.
- **No items found:** return `UNPROCESSABLE_CONTENT` with “No list items found.
  Try pasting the items or a shorter excerpt.” Do not synthesize placeholder items.
- Extraction never calls `getDb()`, creates a visit, persists a list, or seeds a
  listing cache. Ordinary Start/creation validation remains authoritative.

### Model request and validation

Proposed starting model: **`@cf/google/gemma-4-26b-a4b-it`**, with reasoning disabled
using `chat_template_kwargs: { enable_thinking: false }`, `temperature: 0`,
`stream: false`, and a schema-constrained `response_format`. Its documented binding
supports structured output and a context window sufficient for the bounds below.
Pin the model ID in the server service and verify the actual response envelope and
JSON-schema support with a live development smoke test before enabling it. Model
quality and latency on representative imports determine whether this default stays.

Request only this small shape; all keys are required and unknown keys are rejected:

```json
{
  "title": null,
  "items": [{ "value": "Hades" }, { "value": "Outer Wilds" }]
}
```

- `title` is a suggested nonblank string or `null`; use `misorter` when null. The
  Worker sets `titleSuggested` when a suggestion is present. An empty item array
  represents no items found, before conversion to a valid draft.
- The system instruction asks for verbatim item extraction in source order,
  preserving duplicates and spelling. It may omit list markers and surrounding
  prose, but must not paraphrase, translate, enrich, invent, or rank items.
- Normalize CRLF/CR to LF before sending and checking the text. Send the input as
  user data, never concatenate it into the system instruction. Give the model no
  tools or external access.
- **Do not ask the model to calculate character offsets.** After schema validation,
  find each returned value in the normalized source, searching forward from the end
  of the previous match. This preserves occurrence order and duplicate counts and
  lets the server derive source positions. If a value cannot be matched, reject the
  extraction as invalid rather than silently removing it or making another AI call.
  Matching checks source presence, not semantic correctness or completeness; the
  editable preview is still necessary.
- Validate the parsed provider envelope, generated object, per-field constraints,
  source matches, item count, and canonical document size server-side. JSON mode
  can fail; a structured-output option does not replace runtime validation.
- Do not accept partial/truncated generations, repair invalid JSON with another
  model call, or present model-generated confidence scores. Preview edits are user
  edits and use the ordinary draft validation rules.

### Bounds, cost, and failure behavior

Initial AI-specific defaults are deliberately below the ordinary import limits:

- Nonblank source text, maximum **16 KiB UTF-8**, checked in browser and Worker.
- Maximum **200 extracted items** and **4,096 completion tokens** per call. Use the
  model's `max_completion_tokens` parameter; reject a length-limited completion even
  if its partial content happens to parse. Large structured lists use local import.
- A **15-second response deadline**. Attempt cancellation if the binding supports
  it; always ignore late results and handle late promise rejection. A response
  timeout or closing the dialog does not guarantee cancellation of billed inference.
- **5 attempts per IP per 10 minutes**, using a lazy Upstash rate limiter following
  the existing support-router pattern. Use Cloudflare's trusted client-IP header
  in production, not a caller-supplied identity or unrestricted forwarded header.
- **100 model calls per UTC day** across deployments sharing the Redis budget key,
  as a starting rollout cap. Reserve a slot atomically in Redis before calling AI,
  with expiration after the day's boundary. Include failed/timed-out calls in the
  count; do not refund a slot when inference may have run. Together with fixed input
  and output limits, this bounds exposure without adding a billing subsystem.
- If the limiter/budget store is unavailable, return a temporary AI error before
  inference. Do not bypass the cap. Constants can be tuned after observing usage;
  the feature flag provides an immediate off switch.
- One model call per accepted request, with tRPC mutation retries disabled and no
  application-level automatic provider retries. An explicit retry is a new attempt.
- Await quota reservation and extraction. Use `ctx.waitUntil(...)` only for
  nonblocking, content-free metrics. Do not store raw text or log prompts, generated
  titles/items, or raw provider errors that may contain input/output content.

Map malformed/oversized input to `BAD_REQUEST`, no extractable items to
`UNPROCESSABLE_CONTENT`, application quota exhaustion to `TOO_MANY_REQUESTS`, the
response deadline to `TIMEOUT`, invalid/truncated model output to `BAD_GATEWAY`,
and disabled AI/provider or quota-store outages to `SERVICE_UNAVAILABLE`. Return
actionable messages while preserving the source and existing preview. Do not show
provider internals in client errors.

Workers AI has a daily free allocation and usage-based billing beyond it on paid
plans. Do not describe AI as unlimited or free; exact cost depends on the pinned
model and token usage. Before rollout, measure accuracy, latency, and per-import
usage on messy prose, copied tables, duplicates, and multilingual examples.

### Provider documentation

Reviewed 2026-09-15:

- [Workers AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/)
- [Workers/Wrangler setup and remote local-development behavior](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/)
- [Gemma model parameters and response format](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/)
- [Structured JSON output](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

## 10. Implementation sequence

1. **Portable contract:** implement shared schemas/limits, JSON parser/serializer,
   and round-trip fixtures. Publish a native sample and machine-readable JSON Schema
   derived from or verified against runtime validation.
2. **Core UI:** implement local JSON import/export, editable preview, draft
   detachment, reliable state edits, and the input-list export action while sorting.
3. **Flexible deterministic adapters:** add CSV mapping, text parsing/list-marker
   options, CSV/TXT exports, and format-specific messages.
4. **Persistence alignment:** share creation/title validation, confirm stable item
   order, and verify the loaded-list/import/Start flow end to end.
5. **Release documentation:** document formats, limits, title/order preservation,
   and the distinction between input lists and sorting results. Make samples
   accessible from the import dialog.
6. **V1.1 AI adapter:** wire the binding/context, availability query, bounded
   extraction mutation, and existing preview together. Verify fixtures and one live
   model smoke test, then enable the server feature flag for the intended deployment.
7. **Later:** tune AI using observed import examples and scope ranked-result
   portability as a separate addition.

## 11. Acceptance criteria and verification

### Required test-writing prompt

Follow [the contract-first test-writing prompt](test-writing-prompt.md) for every
milestone. Design scenarios and independent expected results from the business
rules before inspecting implementation logic. Implementation code may inform test
wiring, but never define the expected behavior.

Map each case to a rule, a distinct plausible defect, and one owning test layer.
The acceptance criteria below describe observable guarantees, not a requirement to
create one test per bullet or repeat every scenario at every layer. Round trips
must be anchored by independent known fixtures; testing a parser against its own
serializer alone is insufficient. Do not add tests solely to increase coverage.

### Observable acceptance criteria

Meaningful automated coverage for the applicable milestone:

- JSON export → import preserves the exact title, order, and duplicate values,
  including emoji, combining characters, quotes, whitespace, and embedded newlines.
- Unsupported versions, wrong types, missing/unknown fields, invalid UTF-8, NUL,
  empty items, and byte/character/item-count boundaries produce useful errors.
- CSV handles BOMs, commas, escaped quotes, multiline fields, optional headers,
  column mapping, conflicting titles, empty records, and malformed records.
- CSV export handles formula-like cells as documented; JSON retains exact values.
- Text parsing preserves literal punctuation, skips blank lines visibly, and
  removes supported prefixes only when the option is selected. TXT export refuses
  embedded item line breaks.
- Append validates the combined count/size and keeps the existing title/order.
- Cancel, parse failure, and stale async parse results do not change the active
  draft. Editing a preview revalidates it before application.
- Importing into a loaded share link, including a same-length replacement, clears
  its identity; a subsequent title edit cannot update the source and Start creates
  a new label. A late source query cannot restore the original list.
- Export includes the latest typed/pasted edit, works without a share label, and
  makes no network request. JSON and deterministic imports work offline once the
  app is loaded.
- A persisted imported list reloads with the same title and item sequence. Invalid
  create requests are rejected server-side, and insertion failures roll back.
- Completed sorting does not change the meaning of “Export input list.”

Additional V1.1 coverage:

- Browser requests go only to the app's tRPC endpoint; inference runs through the
  server binding. The frontend bundle includes no provider client or credentials.
- Missing/disabled AI configuration leaves ordinary list routes and deterministic
  import working. Availability and mutation checks agree in production/preview.
- Extraction works anonymously and returns only a preview candidate. No database
  write, list-cache update, or visit is caused by an extraction request.
- Unicode/newline normalization, repeated values, source-order validation, a null
  title, no items, invalid schema, unmatched values, and output truncation have
  explicit outcomes. Model-generated offsets are not required.
- Concurrent requests cannot exceed the daily reserved-call cap. Per-IP quotas,
  quota-store outages, and disabled configuration prevent provider calls.
- Timeout/provider failures retain the source and prior preview, do not trigger
  automatic retries, and cannot apply a late response after edits or cancellation.
- Fixture-based tests mock the model; a deliberate live smoke test checks the
  pinned model's JSON envelope, extraction quality, token cap, and deadline behavior.

### Verification tooling

Use Bun's test runner for pure business-contract tests, consistent with the existing
Bun tooling; add a focused test script when implementing. Cover state/persistence
guarantees at real integration boundaries; mocked transactions cannot prove
rollback. Browser coverage should exercise user workflows and actual downloads,
with keyboard/mobile/light-dark checks appropriate to the UI changes. Keep live AI
evaluation separate from deterministic suites and mock only the provider boundary
when checking how the app handles fixed model responses.
Run the relevant tests, TypeScript checks, `bun run lint`, `bun run build`, and
`bun run build:worker` as implementation checks. This spec-only change requires
Markdown formatting/link review rather than application tests.

## 12. Product decisions to revisit

These defaults make the three layers independently deliverable:

- **Formats:** native JSON, CSV, and text in V1; opt-in, server-side AI in V1.1.
- **AI integration:** Cloudflare Workers AI through the existing Worker/tRPC stack;
  anonymous access and the same editable preview. Start with the bounded defaults
  in section 9 and adjust model/quotas based on measured results.
- **Import destination:** local draft with replace/append; persistence happens on
  Start, as it does today.
- **Limits:** 1,000 items, 2,000 code points per item, and 1 MiB per native document.
  Revisit based on representative lists and browser/sorting performance.
- **Results:** input-list portability first; ranked results need a distinct
  versioned contract with ties and their own import behavior.
