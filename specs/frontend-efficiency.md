# Frontend efficiency and shared-code cleanup

Status: Implemented and verified; pre-existing ES2020 type-library issue recorded below

Date: 2026-09-28

## 1. Objective and scope

Implement findings 1–5 from the bundle/CSS audit:

1. Load import, export, and sorting features on demand.
2. Load admin-only CSS with login/dashboard components.
3. Remove obsolete CSS and consolidate duplicate declarations.
4. Consolidate repeated disclosure, server-authentication, and featured-query logic.
5. Avoid repeated validation and serialization during transfer-dialog renders.

Optimize the existing Misorter interface and workflows. Success means less initial
public-page code, simpler shared behavior, and less repeated work on large drafts.
Use existing theme tokens, prefixed classes, Headless UI primitives, and `@/`
imports. Preserve schema-derived types and avoid `any`.

The previously discussed auth-only Supabase migration and unused-dependency cleanup
(audit finding 6) are separate work items. This spec uses the existing authentication
clients and environment variables.

## 2. Baseline and measurement contract

The audit used production Vite builds with the currently installed dependencies.
The figures below measure emitted files, not browser execution time. kB means
1,000 bytes. Savings are indicative, not exact release budgets.

| Measurement                       |  Current |                   Experimental result | Difference |
| --------------------------------- | -------: | ------------------------------------: | ---------: |
| Initial homepage JavaScript, gzip | 205.5 kB |             186.8 kB with lazy import |    18.7 kB |
| Initial homepage JavaScript, gzip | 205.5 kB |      184.8 kB with lazy import/export |    20.6 kB |
| Initial homepage JavaScript, gzip | 205.5 kB | 181.0 kB with lazy import/export/sort |    24.5 kB |
| Initial homepage CSS, minified    |  99.8 kB |      67.6 kB with admin CSS separated |    32.3 kB |
| Initial homepage CSS, gzip        |  16.7 kB |      12.1 kB with admin CSS separated |     4.6 kB |
| Obsolete CSS removal alone, gzip  |  16.7 kB |                               16.5 kB |     0.2 kB |

The JavaScript rows are cumulative experiments. CSS splitting and deletion overlap;
their savings must be remeasured together. Lazy loading can slightly increase total
emitted bytes because of additional chunk boundaries and loader UI.

### Reproducible measurement

- Record the commit, Bun/Node versions, dependency versions, build mode, and
  compression settings before implementing changes.
- Build with the same environment and dependencies before and after each relevant
  milestone. Measure final files on disk, after Vite has completed its output.
- Enable a manifest and module inventory in an analysis-only build. Follow static
  imports from the HTML entry and the homepage's route-component chunk; count each
  required file once. The HTML entry alone understates homepage downloads.
- Compress each emitted asset independently, then sum its size. Do not compress
  concatenated chunks or count source maps, fonts, images, or analytics as app JS.
- Record initial homepage JS/CSS, login/dashboard assets, deferred feature assets,
  and total emitted JS/CSS separately.
- Verify actual request timing against a production preview with a fresh browser
  context. Identify chunks through the manifest/module graph, not hashed filenames.
- Treat the earlier temporary experiments as evidence for prioritization. Capture
  a fresh reproducible baseline for implementation and retain results in this spec.

## 3. Review decision: offline first use

An existing contract needs an explicit decision before milestone A:

- `tests/browser/list-transfer.pw.ts`, the test named **anonymous offline import,
  repair, keyboard focus and latest typed/pasted download**, goes offline after
  loading `/`, then opens export and import for the first time.
- This currently succeeds because those features are downloaded with the homepage.
  Fully deferred chunks cannot guarantee first use without a connection.

**Approved decision (2026-09-28):** the user approved deferred loading after reviewing
the offline tradeoff. Require a connection to load each feature the
first time it is requested in the current document. After its module loads,
import/export parsing, preview, copying, and downloading remain local and usable
offline. First-use loading failure preserves the draft and offers recovery after
connectivity returns. Sorting has the same code-loading limitation; server-backed
list creation retains its existing online requirements and local fallback behavior.

This deliberately narrows the existing offline guarantee. The
[list-transfer specification](list-import-export.md), its verification record, and
the browser test now reflect the approved contract. The offline browser workflow
loads both dialogs before disconnecting; production-only cases separately verify
unavailable first use and recovery without losing the draft.

If immediate offline readiness remains required, keep the corresponding feature
eager and revise the savings target. Background prefetch does not guarantee readiness
when a user disconnects immediately, and is not equivalent to first-use loading.

## 4. Milestone A: on-demand feature loading

### Files and boundaries

| Feature                      | Requesting code                                   | Deferred implementation                                                        |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Import                       | `src/components/Setup.tsx`                        | `src/components/ListImportDialog.tsx`, import adapters, CSV parser             |
| Export from setup or sorting | `Setup.tsx`, `src/components/Sort.tsx`            | `src/components/ListExportDialog.tsx`, export-only serialization/download code |
| Sorting                      | `src/routes/index.tsx`, Start flow in `Setup.tsx` | `Sort.tsx` and sorting-only dependencies                                       |

Shared schemas and draft helpers needed by manual editing can remain in the initial
graph. The existing PNG-export boundary remains an independent deferred feature.

### Implementation approach

1. Introduce explicit dynamic-import loaders for the three feature modules. Share
   the export loader between setup and sorting. Cache successful modules and
   concurrent in-flight loads; clear a failed load so a later attempt can retry.
   Keep loaders small and typed rather than introducing a general plugin framework.
2. Trigger loading from Import, Export, and Start actions. Do not eagerly invoke
   loaders at module initialization, page mount, or an idle callback. Type-only
   imports must not introduce a runtime path back to deferred implementations.
3. Import/export triggers expose a short announced loading state while focus stays
   on the requesting control. Mount the actual Headless UI dialog after loading
   succeeds. Disable duplicate requests, allow cancellation, and ignore a completed
   request if its intent was canceled or its owner unmounted.
4. Loading failures show an actionable, local error and allow another attempt.
   Preserve draft content and the URL. Avoid automatic page reloads because the
   active list can contain unsaved work. An implementation using `React.lazy` must
   also address its cached rejection; remounting the same rejected lazy component
   alone is not a retry strategy.
5. Capture setup export content at the original Export click, after the existing
   editor-commit step. A slow module download must not silently replace that
   snapshot with later edits. Sorting exports use a stable snapshot of the original
   input title/items, not the displayed ranking.
6. Make Sort available before leaving setup or starting a new create-list mutation.
   Run existing preflight checks first, show Start's loading state, and prevent a
   second Start attempt during loading. Keep the editor available on failure.
   If edits remain enabled during loading, revalidate the latest draft before
   continuing. A canceled or failed module load must not create a list or visit.
7. Preserve Start's existing cache seeding, loaded-list shortcut, validation errors,
   create-failure handling, navigation, and visit recording. Returning to edit and
   starting again must initialize the correct sorting session without duplicate
   persistence side effects.
8. Keep loading state outside the sorting engine. Resolving a module, rerendering
   a parent, opening export, or changing theme must not restart a running sort.

### Acceptance criteria

- Before feature activation, the homepage's static dependency graph and network
  requests exclude the import dialog/CSV parser, export dialog, and sorting module.
- A second activation reuses the loaded implementation; only the intended dialog
  or sorting session mounts.
- Slow, failed, canceled, and repeated load requests preserve user content. Dialog
  focus management and focus restoration work after delayed loading.
- Import/apply, latest-edited-content export, original-order sorting export, and
  Start/back workflows satisfy existing data contracts.
- The approved offline contract is verified against production assets, including
  both unavailable first-use chunks and already-loaded features.
- Record the actual homepage reduction. Approximately 20–25 kB gzip is the audit
  reference; account for accessible loading/error UI when comparing results.

## 5. Milestone B: admin stylesheet boundary

### Implementation approach

1. Extract existing `.adminAuth-*` and `.adminDashboard-*` rule families into
   `src/styles/admin.css`. Include their dark-theme variants, responsive rules,
   and exclusively used keyframes (`fadeInSlide`, `fadeInScale`,
   `skeletonShimmer`), after verifying ownership.
2. Keep global tokens, resets, fonts, shared theme-toggle styles, and shared modal
   styles in `src/styles/globals.css`. The existing final mobile media block mixes
   admin and public selectors: partition it by ownership, not by line range.
3. Attach the new stylesheet to an admin-only component dependency used by both
   lazy login and dashboard views. Use an explicit stylesheet-boundary component
   if needed. Do not assume a top-level CSS import in a route file stays deferred:
   TanStack's route registration and component chunks have different lifetimes.
4. Verify the generated import graph. Neither `src/client/main.tsx` nor the eager
   route-registration graph should acquire the admin stylesheet as a static
   dependency. Vite should load it before rendering the lazy admin view.
5. Use ordinary prefixed CSS with the current specificity and cascade. Keep base,
   dark, and responsive variants near one another in their owning stylesheet.
   Initialize Tailwind and the theme only through the existing global entry.
6. Preserve relative rule ordering during extraction. Login's `AdminThemeToggle`
   also renders an `adminDashboard-*` wrapper, so both selector families must be
   available on login as well as the dashboard.

### Acceptance criteria

- A cold homepage load requests no admin stylesheet and contains no admin-only
  selector families in its required CSS assets.
- Direct login/dashboard navigation and client-side navigation render with styles
  ready. Returning to the homepage after visiting admin causes no style leakage.
- Desktop/mobile, light/dark, focus, hover, loading, error, and selected states
  retain their current appearance and behavior.
- Admin CSS is emitted once for the two routes. Report the public-page saving and
  any change to combined stylesheet bytes; the reference is about 4.6 kB gzip saved
  on the homepage.

## 6. Milestone C: CSS deletion and consolidation

### Removal candidates

Reconfirm usage in TSX, conditional classes, DOM class operations, tests, and the
generated bundle before deletion. The audit identified these obsolete names:

- `featuredLists-listLabel`, `featuredLists-listTitle`, `featuredLists-listItem`
- `home-editTitle`
- `sort-pollTitle`, `sort-resultsExportContainer`
- `adminDashboard-error`, `adminDashboard-listingsTitle`
- `adminDashboard-loading`, `adminDashboard-noListings`
- `adminDashboard-state--loading`, `adminDashboard-stateIcon--loading`

Delete obsolete branches of grouped selectors while preserving live branches.
Dynamic names such as `transfer-status-${tone}` are live even when a literal search
finds no complete class string. Use a reviewed removal list rather than blanket CSS
purging. Apply removals to whichever stylesheet owns the rule after milestone B.

### Consolidation targets

Original locations in `src/styles/globals.css`, before extraction:

| Selector                               | Duplicate locations      | Required treatment                                |
| -------------------------------------- | ------------------------ | ------------------------------------------------- |
| `.adminDashboard-searchInput`          | 3322 / 4146              | Consolidate the effective transition declaration  |
| `.adminDashboard-expandButton`         | 4093 / 4411              | Preserve effective transition and hover behavior  |
| `.adminDashboard-expandIcon`, `--open` | 4103 / 4433, 4107 / 4439 | Remove repeated transform/transition declarations |
| `.adminDashboard-copyButton`           | 4117 / 4617              | Consolidate the effective base rules              |
| `.adminDashboard-deleteButton`         | 4128 / 4652              | Consolidate the effective base rules              |
| `.adminDashboard-paginationButton`     | 4139 / 4695              | Consolidate the effective transition declaration  |

- Preserve the current cascade winner when two declarations differ. Combining
  transition lists can add previously overridden animation and is a behavior change,
  not a neutral deduplication.
- Group identical, related declarations where it improves locality: admin
  copy/delete button bases, sorting-choice dark backgrounds, and related focus rings.
  Avoid collecting unrelated controls into a distant global selector list solely
  to reduce source line count.
- Remove dark overrides that exactly repeat an already theme-token-driven base
  rule only after checking competing selectors in that state.

### Acceptance criteria

- Every deletion has an identified obsolete selector or redundant declaration.
- Representative computed styles and visual states agree before and after cleanup,
  including responsive and dark-mode overrides.
- Record compressed savings separately from source cleanup. The measured obsolete
  selectors saved only about 0.2 kB gzip; maintenance is the main benefit here.

## 7. Milestone D: shared behavior

### D1. Admin delayed disclosure

Extract a typed hook, such as `src/hooks/useDelayedDisclosure.ts`, for
`src/components/admin/Label.tsx` and `src/components/admin/Items.tsx`.

- Parameterize mouse-open delay: label 300 ms, items 200 ms. Both use a 500 ms
  long-press threshold.
- Share open state, timer ownership, long-press tracking, close/reset operations,
  and cleanup. Clear an outstanding timer before starting another and on leave,
  touch cancellation, and unmount.
- Short touches do not leave a disclosure open. Completed long presses retain the
  current touch-end behavior. Label copying closes its disclosure. Empty item
  lists remain a plain count without an active disclosure.
- Keep hook calls unconditional and each row's state independent. The hook
  centralizes behavior; the existing components own content and styling.
- Retain current trigger/layout semantics. Any broader popover or accessibility
  redesign should be reviewed separately from this behavior extraction.

Verify delayed mouse opening, early leave, short touch, completed long press,
touch cancellation, and unmount before a timer fires. Use controlled clocks rather
than sleeps. Cover the hook through representative component behavior rather than
asserting its private state.

### D2. Request-scoped server authentication

Add a backend helper, such as `src/backend/auth.ts`, shared by
`src/backend/trpc.ts` and `src/backend/router/auth.ts`.

- Centralize lazy validated configuration, cookie parsing, `createServerClient`,
  response-cookie serialization, and `auth.getUser()`.
- Accept request/response-header context without importing a router or tRPC
  procedure at runtime. Use a type-only context dependency to avoid import cycles.
- Cache only immutable configuration at module scope. Construct the Supabase
  client for the current request; never share its cookies, user, or mutable session
  state across requests.
- Return the verified user or `null` for the existing unauthenticated outcomes.
  `getCurrentUser` returns `null`; protected middleware translates that into the
  existing `TRPCError` with `UNAUTHORIZED`. Unexpected failures still propagate.
- An empty cookie header retains the existing fast unauthenticated result.
  Cookie presence alone never authenticates a request.
- Append every refreshed `Set-Cookie` value to the current response before returning,
  retaining other response headers. Cookie propagation is request work, not a
  `waitUntil` background side effect.

Verify missing/invalid sessions, a verified user, response-cookie propagation, and
two concurrent requests with different users/cookies/response headers. Exercise the
real helper and procedure behavior while controlling the external auth boundary.
Check protected-route redirect intent through the existing frontend guard.

### D3. One featured-list query owner

Make `src/routes/index.tsx` the owner of the existing featured-list query. Pass
`FeaturedLists.tsx` its data, loading/fetching state, and an explicit refresh callback;
derive the data type from the query or existing list type.

- Preserve the query key, initial fetch, retry settings, and disabled automatic
  refetch behavior. Refresh uses the existing `cancelRefetch: false` behavior.
- Preserve pending-open handling when data has not arrived, discovery eligibility,
  empty results, refresh-button state, list selection, and applying a selected list.
- Remove the child's query hook and duplicate configuration. Keep navigation and
  visit recording equivalent when applying the selection.
- This removes a query observer and repeated options. React Query already shares
  the cache; do not report it as eliminating an established duplicate HTTP request.

Verify delayed initial data followed by opening, empty results, manual refresh,
and selection applying the chosen title/items and recording the intended visit.

## 8. Milestone E: transfer-dialog derived work

### Export

In `src/components/ListExportDialog.tsx`, memoize `serializeList(draft, format)`
using the draft and format as dependencies.

- Copying/copied status, download feedback, and clipboard errors reuse the result.
- Changing format or opening with a new snapshot computes a fresh result.
- Keep setup's export snapshot stable. Replace Sort's inline mapped draft prop
  with a stable snapshot or memo derived from `title` and `ogList`, so unrelated
  sorting renders do not invalidate the export calculation.
- Preserve the async copy revision guard, exact output bytes, filename behavior,
  validation messages, formula escaping, and original-input-order semantics.

### Import

In `src/components/ListImportDialog.tsx`:

1. Memoize preview validation by `preview`.
2. In replace mode, reuse that validation for the final draft where it is
   semantically equivalent. In append mode, validate the combined draft separately:
   it retains the current title and enforces combined item/byte limits.
3. Preserve the normalization currently performed by `combineDrafts`, which copies
   only title/item values. Share a result only when it represents the same canonical
   draft; strict-schema and repairable-candidate behavior must stay equivalent.
4. Memoize combined validation by the actual current draft, preview, and mode. Give
   the `current` prop a stable identity based on its title and list rather than
   recreating its mapped items on every unrelated Setup render.
5. Memoize the duplicate count by preview items. If profiling warrants it, index
   validation issues by item index once rather than filtering all issues for every
   visible row.
6. Keep structural parse issues, source-change/pending state, append-title handling,
   and the Apply gate distinct from cached schema validation. Edits, removal, mode
   changes, and current-draft changes must immediately update errors and eligibility.

Use immutable inputs and ordinary React dependencies. Avoid JSON-stringifying
dependencies, deep-comparison hooks, or global draft-result caches. Memoization is
a performance hint; correct outcomes must not depend on React retaining a cache.

### Acceptance criteria and profiling

- Existing format, validation, byte-limit, duplicate-preservation, replace/append,
  stale-result, and input-order contracts remain covered by the current suites.
- A changed draft or format produces fresh results; pagination and status-only
  changes do not routinely repeat full-draft work when inputs are stable.
- Profile before/after with an ordinary list and a valid 1,000-item draft near the
  1 MiB canonical limit. Exercise copy feedback, preview pagination, source-option
  changes, and an item edit. Use the same browser/build/fixture for comparison.
- Record render/calculation duration and observed expensive-work frequency. Do not
  introduce hardware-sensitive CI timing thresholds or tests asserting exact
  `useMemo` invocation counts. Strict Mode can rerun calculations in development.

## 9. Verification and execution plan

### Sequence

1. Capture fresh bundle/style/profile baselines and resolve the offline decision.
2. Implement A with production asset-boundary checks, then verify the transfer and
   sorting workflows. If the offline decision is pending, start with B instead.
3. Implement B, verify cascade parity, then implement C against the extracted files.
4. Implement D1, D2, and D3 as small independently reviewable refactors.
5. Implement E after the final transfer boundaries and prop ownership are settled.
6. Record the combined production measurements and applicable verification results.

### Coverage ownership

Reuse [contract-first test guidance](test-writing-prompt.md) and existing suites.
Add only cases that protect a new boundary or meaningful regression:

| Concern                                                                  | Owning verification                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Exact import/export data and limits                                      | Existing `tests/list-transfer/` contract suites                           |
| Async feature loading, cancellation, recovery, approved offline behavior | Focused browser workflows against production assets                       |
| No eager optional JS or admin CSS                                        | Production manifest/module graph plus cold request trace                  |
| Start/export wiring and draft preservation                               | Existing browser workflows with targeted delayed-load cases               |
| CSS extraction and deduplication                                         | Representative visual/computed-style checks across themes and breakpoints |
| Disclosure timers and row isolation                                      | Focused component interaction verification with controlled clocks         |
| Auth result/cookie isolation                                             | Focused API tests at the external authentication boundary                 |
| Featured-query ownership                                                 | Focused browser workflow with controlled tRPC responses                   |
| Reduced repeated calculations                                            | Repeatable before/after profiling and existing outcome-based tests        |

`playwright.config.ts` currently starts the development Vite server. That is useful
for existing behavioral tests, but cannot establish production chunk boundaries.
Use a dedicated production-preview verification configuration or separate browser
check for asset-loading assertions; document its command and network fixtures.

Run the checks applicable to each milestone and the combined final change:

- `bun run test:list-transfer`
- `bun test` for relevant API/unit coverage
- `bun run test:browser`
- `bunx tsc --noEmit`
- `bunx tsc --project tests/list-transfer/tsconfig.json`
- `bunx tsc --project tests/api/tsconfig.json`
- `bunx tsc --project tests/browser/tsconfig.json`
- `bun run lint` and formatting checks for changed files
- `bun run build`
- `bun run build:worker` after the backend auth refactor and at final verification

Record pre-existing check failures separately from regressions. Reuse passing
results until a subsequent change touches the relevant behavior. Keep generated
`src/routeTree.gen.ts` under the router generator's control.

## 10. Implementation checklist and result record

- [x] Offline first-use decision reviewed and recorded.
- [x] Fresh build, CSS, and large-draft profile baselines captured.
- [x] A: on-demand import/export/sort implementation and behavior verified.
- [x] B: admin CSS boundary implemented and computed-style/load behavior verified.
- [x] C: obsolete CSS and duplicate declarations reviewed and cleaned up.
- [x] D1: delayed disclosure behavior shared and verified.
- [x] D2: request-scoped authentication shared and verified.
- [x] D3: featured query ownership consolidated and verified.
- [x] E: derived transfer work memoized and correctness/profile checks completed.
- [x] Combined bundle measurements and applicable checks recorded below.

| Milestone/check    | Implementation commit                      | Result/evidence                                                                    | Remaining issue                          |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| Baseline           | `7f7d6dbfdc10bd3ee5c9f46e010b8f8ab08f3305` | Fresh production build; original source archive for instrumented profile           | None                                     |
| Offline decision   | User approval, 2026-09-28                  | Deferred loading approved in this implementation conversation                      | None                                     |
| A–E                | Working tree, not committed                | Loaders, stylesheet split/cleanup, shared hooks/auth/query, memoized transfer work | None                                     |
| Final verification | Working tree                               | Results and commands below                                                         | Existing `.at()`/ES2020 library mismatch |

### Build environment and reproduction

Measured on macOS with Bun **1.3.14**, Node **24.20.0**, Vite **8.3.1**, React/React
DOM **19.3.0**, router **1.170.39**, router plugin **1.168.40**, React Query
**5.104.0**, Headless UI **2.2.10**, Tailwind **4.3.3**, Valibot **1.5.0**,
csv-parse **7.0.3**, Supabase SSR **0.12.7**, Supabase JS **2.117.2**,
TypeScript **6.0.3**, and Playwright **1.63.0** (bundled Chromium).
No dependencies were changed or installed. The complete dependency versions remain
in `bun.lock`, SHA-256
`cbe8e6dd26c0620be0eae1b034f9edb0802681dd751ecc2f32fe14830f9c2a35`.
Baseline and final release builds used the same existing local Vite environment,
production mode, and installed dependencies. No environment values are included
in this record.

```sh
bun run build:analysis
bun scripts/measure-bundle.ts
bun run test:browser:production
```

`build:analysis` adds a Vite manifest and per-chunk module inventory only. The
measurement script follows static imports from both `index.html` and the relevant
route component, counts each required asset once, and gzips each file separately
with Node zlib **level 9**. Sizes below are decimal kB. Source maps, fonts, images,
analytics, and the analysis inventory are excluded. An optional directory argument
to `measure-bundle.ts` measures a retained build, independent of the working tree.

Production tests start `vite preview` on port 4173, use fresh browser contexts,
resolve feature chunks through the inventory, and intercept tRPC at the network
boundary. They cover cold requests, static graph exclusions, delayed/canceled
loads, click-time snapshots, preflight after editing during Start, failed imports,
reconnect/retry, and reuse offline. The regular browser configuration remains the
development-server configuration.

### Emitted asset results

| Required asset group           | Before JS gzip kB | After JS gzip kB | Before CSS min/gzip kB | After CSS min/gzip kB |
| ------------------------------ | ----------------: | ---------------: | ---------------------: | --------------------: |
| Homepage                       |           205.893 |          184.886 |        99.816 / 16.535 |       66.771 / 11.895 |
| Direct login                   |           196.528 |          209.968 |        99.816 / 16.535 |       97.611 / 17.046 |
| Direct dashboard               |           217.622 |          219.732 |        99.816 / 16.535 |       97.611 / 17.046 |
| Import, additional to homepage |                 0 |           19.073 |                  0 / 0 |                 0 / 0 |
| Export, additional to homepage |                 0 |            2.480 |                  0 / 0 |                 0 / 0 |
| Sort, additional to homepage   |                 0 |            5.198 |                  0 / 0 |                 0 / 0 |
| All emitted app assets         |           280.838 |          286.716 |        99.816 / 16.535 |       97.611 / 17.046 |

Homepage saving: **21.007 kB JS gzip** and **4.640 kB CSS gzip**.
The initial homepage JS shrank from 647,822 to 566,156 uncompressed bytes.
Deferred feature JS is 67,062 / 5,822 / 14,301 bytes respectively.
Total emitted JS grew from 925,924 to 931,479 bytes; gzip grew by 5.878 kB.

The admin extraction checkpoint, before deleting obsolete CSS, measured 67,553
public CSS bytes / 11,983 gzip bytes and 99,840 total CSS bytes / 17,258 gzip bytes.
Cleanup after extraction saved a further **88 public gzip bytes** and **212 total
gzip bytes**. Combined CSS is smaller minified but slightly larger gzipped because
the two stylesheets are compressed separately.

#### Retry boundary and its cost

Clearing a rejected JavaScript promise alone failed the real offline/reconnect
test: Chromium retained a failed native module fetch. The loaders now retry an
emitted entry URL with a fresh query suffix. `scripts/feature-urls-plugin.ts`
exposes the same emitted chunks used by the explicit dynamic imports; it does not
duplicate feature implementations or reload the document.

A shared UI chunk keeps static dependencies of the three optional entries
in the already-loaded graph. A production graph assertion protects this invariant:
retrying just an entry is insufficient if one of its static dependencies also has
a cached fetch failure. This choice and the loading/recovery UI reduce savings
compared with the audit's minimal experiment and increase login's required JS.
Import, export serialization, CSV parsing, and sorting implementations remain
absent from the cold homepage. PNG export retains its separate boundary.

### CSS and shared behavior evidence

- Admin CSS is attached to `AdminThemeToggle`, a component dependency of both
  lazy views. The homepage graph/request check finds no admin stylesheet or admin
  selector families. One admin CSS asset is shared by login and dashboard.
- All twelve obsolete names in section 6 were reconfirmed against source/runtime
  class operations before deletion. Grouped selectors retain live branches.
  Shared modal/theme styles and the public half of the final mobile media block
  remain global. All three exclusively admin keyframes moved with their owners.
- Consolidated declarations retain the last effective transition list, including
  color-only expand-button transitions and pagination's background/border-color
  transitions. Expand hover opacity is retained. Related copy/delete base,
  disabled, and focus styles and sorting dark-choice styles are grouped. The
  redundant token-driven dark delete-button color was removed.
- `shared-behavior.pw.ts` compares representative computed styles against the
  retained original emitted CSS at **1280px and 390px**, in both themes, on login
  and dashboard, including focus, hover, selection, and expanded rows. Font loads
  and animations are settled before comparing. Run this one-time parity check with
  `EFFICIENCY_BASELINE_CSS=/absolute/path/to/original.css bun run test:browser:production`.
  It is skipped when no original stylesheet is supplied.
- Controlled-clock component interactions verify mouse thresholds, early leave,
  short touch, completed long press, touch cancellation, copying, empty rows,
  row isolation, and unmount before the timer fires.
- API tests run real authentication helper/procedures against a controlled
  Supabase boundary: empty/invalid cookies, verified user, all refreshed cookies,
  retained headers, concurrent request isolation, and unexpected thrown failures.
  The protected frontend route still preserves `/login?redirect=/admin/dashboard`.
- Controlled featured responses cover pending opening, empty results, manual
  refresh, chosen input values, and one FEATURED visit. This removes an observer
  and duplicated options, not an established duplicate HTTP request.

### Repeatable transfer profile

The opt-in `scripts/profile.config.ts` uses the production React profiling build
and instruments `validateDraft`, `serializeList`, and dialog Profiler commits.
Instrumentation is absent from release builds. Baseline source was archived from
the commit above and built with the same installed dependencies and profiling
configuration. Fixtures, Chromium, build mode, and interaction sequence were the
same before/after. Samples are observations, not CI timing thresholds or memo-call
assertions.

```sh
bun run build:profile
bun run test:profile
# To repeat the original side using an archived checkout with the same node_modules:
PROFILE_ROOT=/absolute/path/to/baseline bun run build:profile
PROFILE_ROOT=/absolute/path/to/baseline bun run test:profile
```

The ordinary fixture has 10 items / 457 canonical bytes. The large valid fixture
has 1,000 items / **1,024,977 canonical bytes** (97.7% of the 1 MiB limit).
Table durations sum measured work for each interaction; serializer timings include
their nested validation. Profiler commit counts also include Headless UI updates.

| Large-draft interaction | Validation calls before → after | Serialization calls before → after | Calculation ms before → after | Dialog render ms before → after |
| ----------------------- | ------------------------------: | ---------------------------------: | ----------------------------: | ------------------------------: |
| Open export             |                           1 → 1 |                              1 → 1 |         9.9 → 9.9 (serialize) |                     13.8 → 14.0 |
| Copy feedback           |                           2 → 0 |                              2 → 0 |          17.5 → 0 (serialize) |                      19.4 → 1.6 |
| Change export format    |                           1 → 1 |                              1 → 1 |         8.6 → 9.6 (serialize) |                      9.1 → 10.1 |
| Parse/preview           |                           2 → 1 |                              0 → 0 |         15.4 → 7.9 (validate) |                     24.1 → 16.2 |
| Preview next page       |                           2 → 0 |                              0 → 0 |           18.9 → 0 (validate) |                      26.1 → 6.9 |
| Source-format option    |                           2 → 0 |                              0 → 0 |           14.3 → 0 (validate) |                      17.8 → 3.7 |
| Edit preview item       |                           2 → 1 |                              0 → 0 |         15.2 → 7.5 (validate) |                     19.0 → 10.7 |

For the ordinary fixture, copy-feedback render time was 2.1 → 2.1 ms, preview
3.4 → 3.0 ms, source option 2.4 → 2.3 ms, and item edit 1.7 → 2.0 ms. Expensive-work
frequencies changed in the same way; small-list timing differences are noise.

### Final checks

- Bun contracts/API: 61 tests; includes the existing 50 transfer contracts and
  the three new auth-boundary cases.
- Existing development browser suite and new controlled-clock/featured cases pass.
- Production browser verification covers 38 workflows, including the optional
  baseline-style comparison. The initial cached-import-rejection failure was
  reproduced, fixed, and its production recovery case now passes.
- Application, transfer, and API default TypeScript commands encounter the same
  **pre-existing** `adapters.ts:107` use of `.at()` under an ES2020 library. The
  original archived commit reproduces it. Each passes when checked with
  `--lib ES2022,DOM,DOM.Iterable`; the browser project passes its default command.
- ESLint, changed-file Prettier, production build, analysis build, and worker
  dry-run are checked. Existing Vite native-config/circular-plugin notices and
  Wrangler's unspecified-environment warning do not fail their builds.
