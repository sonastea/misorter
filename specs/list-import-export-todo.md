# v3.1.0 — List import/export progress

Last updated: 2026-09-16

Specification: [List import/export](list-import-export.md)

**Current state:** milestones 1–3 are complete. Native JSON, CSV, and plain-text
import/export, editable previews, and local draft detachment are implemented and
verified. Persistence alignment is next. The `3.1.0` package
version identifies the target release, not release readiness.

## Release scope and tracking

- [x] Set `package.json` to `3.1.0`.
- [x] Complete milestone 1: portable contract.
- [x] Complete milestone 2: core JSON UI and draft handling.
- [x] Complete milestone 3: CSV and plain-text adapters.
- [ ] Complete milestone 4: persistence alignment.
- [ ] Complete milestone 5: documentation and release verification.

Milestones 1–5 deliver deterministic V1 import/export for v3.1.0. AI extraction is
the spec's V1.1 follow-up; its app release version is still to be decided. The
native document's `version: 1` is independent of the app version.

For each milestone, design cases using the
[contract-first test-writing prompt](test-writing-prompt.md) before inspecting
implementation logic. Map each case to a rule, expected result, plausible defect,
and owning test layer. Check off implementation and verification independently;
mark the milestone complete only when both are done. Update this document with
commands, results, and remaining blockers as work proceeds.

## 1. Portable contract — complete

### Implementation

- [x] Add shared Valibot schemas, inferred types, structured issues, and limits in
      `src/utils/list-transfer/schema.ts`.
- [x] Implement strict native JSON parsing, format/version recognition, optional
      BOM handling, and fatal UTF-8 decoding in `parse.ts`.
- [x] Implement exact JSON serialization with two-space indentation and a trailing
      newline in `serialize.ts`.
- [x] Enforce nonblank/NUL rules, Unicode code-point limits, item limits, and raw
      input/canonical output byte limits; retain repairable candidates.
- [x] Publish a native sample and machine-readable JSON Schema under
      `public/examples/` and `public/schemas/`.
- [x] Add `bun run test` for all suites and `bun run test:list-transfer` for the
      focused suite, with isolated test TypeScript configuration.

### Verification

- [x] Establish the [contract case map](list-transfer-contract-cases.md) and
      independently authored golden fixture in `tests/list-transfer/`.
- [x] Verify exact title/value preservation, input order, duplicates, whitespace,
      quotes, emoji, combining marks, and embedded line breaks.
- [x] Verify unsupported versions, malformed JSON, missing/unknown fields, wrong
      types, invalid UTF-8, NUL, and field/item/byte boundaries.
- [x] Verify one-item import/export versus the two-item creation schema minimum.
- [x] Check published JSON Schema agreement using Ajv and validate the sample.
- [x] Demonstrate that a temporary trimming defect fails the golden assertion;
      restore correct behavior and rerun the suite.
- [x] Pass focused tests, focused TypeScript/ESLint, formatting, client build, and
      Worker build. See the verification record below for repository-wide blockers.

## 2. Core JSON UI and draft handling — complete

### Implementation

- [x] Add `ListImportDialog.tsx` with file/paste input, pre-read size checks, native
      example download, and an editable title/item preview with source references.
- [x] Retain source and repairable preview on errors; expose field errors, counts,
      duplicate notices, row removal, and multiline item editing.
- [x] Add replace/append selection, defaulting to replace. Validate the final
      combined draft, preserve the existing title on append, and show resulting
      count/action before apply.
- [x] Ignore stale reads/parses after source or option changes and closing; explain
      that explicit re-parsing replaces preview edits.
- [x] Add one route-level `applyImportedList` handler: generate imported UUIDs,
      retain existing IDs on append, clear pending input/title editing/sort state,
      reset unsaved sentinels, and clear source/featured-list identity.
- [x] Remove the `list` URL parameter using history replacement, preserve relevant
      search parameters, and guard against late source-query overwrites.
- [x] Disable import during initial loading or list/title saves, and restore focus
      to setup after apply.
- [x] Replace contentEditable keydown mutation with immutable updates on input;
      commit current editor content before taking an export snapshot.
- [x] Add `ListExportDialog.tsx` and `download.ts`: validated JSON export, specific
      invalid-draft reasons, sanitized/bounded filenames, Blob downloads, object
      URL cleanup, and retryable failures.
- [x] Add setup import/export actions and pass input title/items to Sort for an
      explicitly named “Export input list” action.
- [x] Use Headless UI and shared themed CSS; provide accessible names, announced
      errors, keyboard/focus support, and a bounded mobile-friendly preview.

### Verification

- [x] Add focused append/replace contract cases, including combined count/size
      overflow where each draft separately passes validation.
- [x] Exercise actual import/apply/download workflows, anonymous use, and latest
      typed/pasted item edits in browser tests.
- [x] Verify cancel, parse failure, and controlled stale-response ordering preserve
      the active draft and URL; preview edits must revalidate before apply.
- [x] Verify draft detachment, same-length replacement, append identity handling,
      and late source-query protection at the route integration boundary.
- [x] Verify local parsing/export works offline once loaded and causes no list
      creation, retrieval, or visit requests.
- [x] Verify exports during/after sorting contain original input order, using a
      result order that differs from the input order.
- [x] Check keyboard/focus, mobile layout, light/dark themes, error announcements,
      and large-preview usability.

## 3. CSV and plain-text adapters — complete

### Implementation

- [x] Select and pin a maintained browser-compatible CSV parser.
- [x] Add Auto/JSON/CSV/Text selection and extension/content detection exactly as
      specified, including fallback titles and no comma-based guessing.
- [x] Add CSV parsing with header toggle, item/title column mapping, unambiguous
      suggestions, conflicting-title resolution, source records, and unused-column
      notices. Reject malformed quotes/widths and invalid selected cells.
- [x] Add text parsing with normalized line endings, visible blank-line counts,
      literal punctuation preservation, and opt-in list-marker removal.
- [x] Add spreadsheet-safe CSV export with repeated titles, CRLF, standard quoting,
      formula-prefix escaping, and an explanation when escaping changes content.
- [x] Add items-only TXT export, disable it for embedded CR/LF, and enforce every
      serialized download's byte limit with actionable format alternatives.

### Verification

- [x] Cover CSV BOM/quoting/multiline fields, mapping ambiguity, repeated/conflicting
      titles, empty records/cells, malformed records, order, and duplicates.
- [x] Verify formula escaping in titles/values, including leading whitespace, and
      preservation of literal apostrophes on import.
- [x] Verify text line endings, literal commas/tabs/semicolons, blank notices, and
      exactly one supported marker removed only when requested.
- [x] Verify fallback titles, explicit CSV selection for pasted CSV, native-error
      handling without text fallback, TXT multiline refusal, and download limits.
- [x] Exercise mapping/options and actual CSV/TXT downloads in browser workflows;
      keep detailed data semantics in the pure-contract suite.

## 4. Persistence alignment — pending

### Implementation

- [ ] Reuse shared draft/create/title schemas in manual-entry preflight,
      `listing.create`, `listing.updateTitle`, and title editing.
- [ ] Enforce two-item creation and canonical size server-side with actionable
      `BAD_REQUEST` errors. Review the impact of new limits on legacy inputs.
- [ ] Preserve transaction atomicity and request-scoped `getDb()`; persist input
      order and explicitly order the creation response by inserted item ID.
- [ ] Ensure imported drafts always create a fresh label on Start; seed only the
      new label's query cache. Keep legacy lists readable and explain export
      incompatibilities without truncation.
- [ ] Invalidate/refresh related caches for touched mutations, including not-found
      cleanup paths; keep nonblocking effects in `ctx.waitUntil()` with logged,
      swallowed background failures.

### Verification

- [ ] Test against an isolated real database: invalid direct create requests write
      nothing, insertion failures roll back, and reload preserves title/item order.
- [ ] Verify the complete loaded-share-link → same-length import → title edit →
      Start workflow creates a new label and leaves the source list unchanged.
- [ ] Verify touched cache invalidation boundaries and legacy-list handling.

## 5. Documentation and v3.1.0 release verification — pending

- [ ] Document supported formats, limits, exact JSON preservation, CSV escaping,
      TXT title/multiline limitations, and input-list versus ranked-result meaning.
- [ ] Make samples accessible from the import dialog and verify published links.
- [ ] Add release notes for v3.1.0 and describe the new creation limits.
- [ ] Run the complete applicable automated suites and required checks below;
      resolve or explicitly track any release blockers.
- [ ] Complete browser verification of anonymous import/edit/export/Start/reload
      and sorting exports, including keyboard/mobile/light-dark checks.
- [ ] Record verification results and confirm milestones 1–5 are complete before
      marking v3.1.0 release-ready.

## Verification record and commands

Baseline from milestone 1 (2026-09-15):

| Check                                                     | Last recorded result                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `bun run test`                                            | Passed; currently discovers the list-transfer suite                                           |
| `bun run test:list-transfer`                              | Passed                                                                                        |
| `bunx tsc --project tests/list-transfer/tsconfig.json`    | Passed                                                                                        |
| `bunx eslint src/utils/list-transfer tests/list-transfer` | Passed                                                                                        |
| Prettier check of milestone files                         | Passed                                                                                        |
| `bunx tsc --noEmit --ignoreDeprecations 6.0`              | Blocked by existing app errors, including database/router types, admin code, and NoticeBanner |
| `bun run lint`                                            | Blocked by existing repository errors, including React hook rules                             |
| `bun run build`                                           | Passed                                                                                        |
| `bun run build:worker`                                    | Passed (dry run)                                                                              |
| Browser/persistence integration                           | Pending implementation                                                                        |

Run relevant suites and required TypeScript, lint, client-build, and Worker-build
checks at implementation milestones. The focused TypeScript check does not replace
the application check. For documentation/version-only updates, check formatting,
links, and version metadata. Record unavailable integration environments rather
than claiming mocked transactions prove database guarantees.

### Milestone 2 verification (2026-09-15)

Contract design: [core UI case map](list-transfer-ui-cases.md), authored before
implementation inspection. Detailed native semantics remain in milestone 1's
contract suite. New pure cases own combined count/byte limits, replace/append
content and UUID relationships, retained-title validation, and portable filenames.

Implementation notes:

- Item editors are controlled multiline textareas, with immutable updates on every
  input. Exports take a committed value snapshot.
- Previews render 50 rows per page within a bounded scroll viewport. Source JSON
  array indexes remain attached to rows after removal. Native structural errors
  remain blocking; editable field errors are revalidated. Append validates the
  retained title and disables the unused preview title.
- Filenames have an 80-code-point / 180-byte stem bound, with no path separators
  or control characters. Object URLs are revoked after both successful and failed
  download attempts.
- Browser tests run the real frontend and intercept external tRPC responses only.
  File reads and failed browser downloads are controlled at their platform
  boundaries. No parser, serializer, or route state transition is mocked.

| Check                                                  | Result                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run test`                                         | Passed: Bun contracts plus Playwright browser workflows                                                                                                                                                                                                                               |
| `bun run test:list-transfer`                           | Passed; expanded contract cases also passed in the final complete run                                                                                                                                                                                                                 |
| `bun run test:browser`                                 | Passed: file/paste/apply/download, actual clipboard paste plus final typed character, offline anonymous operation, invalid export reasons, source-only errors, removal/source references, and example download                                                                        |
| Route/browser integration                              | Passed: cancel and failure preserve draft/URL; same-length replacement removes only `list` without pushing history; title cancel/save stays local; Start submits imported values to create; append keeps title/order/duplicates; late source response cannot overwrite accepted draft |
| Async/resource boundaries                              | Passed: controlled stale file completion after source change and close; import unavailable during initial load and disabled during title/list saves; failed download retry and object URL cleanup                                                                                     |
| Sorting export                                         | Passed before and after ranking Alpha above Zulu, while exported input remains Zulu then Alpha                                                                                                                                                                                        |
| Accessibility/layout                                   | Passed keyboard open/Tab containment/Escape/focus restoration, alert visibility, 1,000-row pagination, mobile overflow checks; visually inspected light/dark mobile and desktop dialogs, setup controls, and export                                                                   |
| `bunx tsc --project tests/list-transfer/tsconfig.json` | Passed                                                                                                                                                                                                                                                                                |
| `bunx tsc --project tests/browser/tsconfig.json`       | Passed                                                                                                                                                                                                                                                                                |
| Focused ESLint and Prettier                            | Passed for milestone files                                                                                                                                                                                                                                                            |
| `bunx tsc --noEmit --ignoreDeprecations 6.0`           | Still blocked by existing database/router, admin, and NoticeBanner errors; no errors in changed feature files                                                                                                                                                                         |
| `bun run lint`                                         | Still blocked by existing hook violations in `src/components/ThemeToggle.tsx` and `src/components/admin/Items.tsx`                                                                                                                                                                    |
| `bun run build`                                        | Passed                                                                                                                                                                                                                                                                                |
| `bun run build:worker`                                 | Passed (dry run)                                                                                                                                                                                                                                                                      |

Targeted fault check: temporarily retaining `currentListData` during import caused
the same-length route workflow to fail because a subsequent title edit sent
`listing.updateTitle` to the source list. Restored detachment and reran the complete
suite successfully. This verifies an identity regression is detected through its
observable network side effect.

Fresh setup: run `bun install` and `bunx playwright install chromium` before the
browser suite. `bun run test` now includes both test runners; `.pw.ts` browser files
are intentionally outside Bun's direct test discovery. Playwright starts Vite when
needed. The focused lint command is:

```sh
bunx eslint src/utils/list-transfer src/components/ListImportDialog.tsx src/components/ListExportDialog.tsx src/components/Setup.tsx src/components/Sort.tsx src/routes/index.tsx tests/list-transfer tests/browser playwright.config.ts
```

Remaining release blockers: repository-wide TypeScript/lint errors above and
milestones 3–5. These browser tests establish frontend integration, including the
fresh create request, but do not establish database atomicity, persisted ordering,
source database immutability, or reload from a newly persisted label. Those real
database guarantees remain assigned to milestone 4.

### Milestone 3 verification (2026-09-16)

Contract design: [adapter case map](list-transfer-adapter-cases.md). Detailed
format semantics belong to the pure contract suite; browser cases verify controls,
editable title-conflict resolution, stale reads, and actual downloaded bytes.

Implementation notes:

- Pinned `csv-parse@7.0.2`, using its browser ESM synchronous entry point. Its
  strict quote parsing is combined with explicit record-width validation after
  omitting wholly empty records. Parsing stops above the item limit.
- CSV defaults to a header row. Ambiguous item columns require explicit mapping;
  conflicting imported titles require editing the preview title in replace mode.
  Append retains the current title. Mapping/options changes require an explicit
  reparse, with stale file results ignored.
- Text normalizes line endings and preserves punctuation; marker removal is
  opt-in. A terminal newline ends the last line rather than adding a blank item.
- CSV export explains spreadsheet escaping; TXT explains title omission and
  refuses embedded line breaks. Serialized CSV has independently checked
  below/at/above 1 MiB boundary cases, including repeated title overhead.
- Existing field/button styles and Merriweather Sans typography are reused.
  Added only wrapping column controls, checkbox/notices styles, and body-font
  inheritance for the now multi-format source textarea. Inspected desktop light,
  mobile light/dark import controls, and mobile dark export visually.

| Check                                                  | Result                                                                                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bun run test`                                         | Passed: all Bun contracts and Playwright workflows, including CSV mapping/title correction/download, text marker options, TXT refusal, and parser-option stale-read protection |
| `bunx tsc --project tests/list-transfer/tsconfig.json` | Passed                                                                                                                                                                         |
| `bunx tsc --project tests/browser/tsconfig.json`       | Passed                                                                                                                                                                         |
| Focused ESLint and `bun run lint`                      | Passed; repository-wide lint no longer reproduces the milestone 2 blockers                                                                                                     |
| Prettier check of milestone files                      | Passed                                                                                                                                                                         |
| `bunx tsc --noEmit --ignoreDeprecations 6.0`           | Blocked by existing database/router types, admin code, and NoticeBanner; no errors in changed feature files                                                                    |
| `bun run build`                                        | Passed                                                                                                                                                                         |
| `bun run build:worker`                                 | Passed (dry run)                                                                                                                                                               |
| Mobile/theme checks                                    | Passed wrapping/no-overflow checks for CSV mappings in both themes; existing keyboard/focus and large-preview workflows also pass                                              |

Targeted fault check: temporarily disabled CSV formula-prefix escaping. The
independent golden-byte assertion failed on unescaped titles and values. Restored
escaping and reran the complete suite successfully.

Remaining release blockers: application TypeScript errors and milestones 4–5.
Database persistence guarantees remain assigned to milestone 4.

## 6. V1.1 AI adapter — follow-up

- [ ] Wire Workers AI binding and exact feature-flag checks for production/preview,
      generated binding types, request-scoped context, and deployment documentation.
- [ ] Add anonymous capabilities/extraction procedures and a provider-isolated
      service with schema validation, normalized source-order matching, and
      content-free error handling.
- [ ] Enforce input/item/token limits, timeout handling, trusted-IP limiting,
      atomic daily quota reservation, and one provider call per accepted request.
- [ ] Reuse the editable preview with explicit extraction, source-revision guards,
      preserved state on failure, and no automatic retries.
- [ ] Test disabled/missing configuration, fixed model outputs, duplicates/order,
      invalid/truncated output, quotas, timeouts, stale responses, and absence of
      persistence. Verify quota concurrency at the real store boundary.
- [ ] Run a deliberate live smoke test for the pinned model's envelope, structured
      output, quality, latency, and usage before enabling the rollout flag.

Later scope remains ranked-result portability, archives, documents/images, remote
URLs, and sorting-session restoration; define their contracts separately.
