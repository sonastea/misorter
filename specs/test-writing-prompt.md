# Test-writing prompt: contract-first, nonredundant tests

Use this prompt when implementing a milestone of
[list import/export](list-import-export.md). These rules govern test design and
review; the feature spec and explicit product decisions define the business rules.

## Objective

Write the smallest sufficient suite that detects meaningful violations of the
business contract. Derive cases and expected results from documented rules and
deterministic examples **before inspecting implementation logic**. A refactor that
preserves observable behavior should not require rewriting these tests.

Do not generate tests by walking through source files, functions, branches, or
recent diffs. Test count, line coverage, and one-test-per-function are not goals.

## 1. Establish the contract first

1. Read the milestone scope, relevant business rules, and acceptance criteria.
2. Identify observable inputs, outputs, state transitions, prohibited side effects,
   and documented boundaries. Distinguish requirements from implementation advice.
3. Draft a compact case map: **rule/source → scenario → exact expected outcome →
   plausible defect caught → owning test layer**. Each proposed test must earn its
   place through a distinct rule, boundary, or failure mode.
4. Inspect existing tests to reuse coverage and remove overlap. Implementation code
   may then be read to wire public entry points, fixtures, and external dependencies;
   it must not become the source of expected behavior.
5. If a rule is ambiguous or contradictory, flag it for a product decision. Continue
   with unambiguous cases. Do not turn current behavior, a convenient assumption, or
   an observed bug into an undocumented requirement.

For a regression, establish the intended behavior and a reproducing input from the
contract or bug report. The bug's current output is not the expected output.

## 2. Use independent expected results

- Use hand-authored expected values, externally specified examples, or independently
  stated mathematical properties. Keep expected results visible and reviewable.
- Do not generate expected output using the production parser, serializer,
  normalizer, validator, schema, or a copied version of its algorithm. Calling the
  function under test to obtain the **actual** result is, of course, necessary.
- Do not import production limit constants to determine expected acceptance
  boundaries. Use the documented business values so changing a constant incorrectly
  cannot move both the implementation and its test expectation together.
- Test-only builders may construct input data. They must not calculate the expected
  business outcome. Platform primitives may be used to construct/count UTF-8 bytes
  or decode a download; assert the application's contract rather than retesting the
  primitive itself.
- A round-trip assertion alone is insufficient: a parser and serializer can share
  the same bug. Anchor parsing and serialization to independent known examples;
  use a round trip only where it adds an interaction or end-to-end guarantee.
- Property-based tests must express a business invariant, use reproducible seeds,
  and report a minimal failing input. Do not use property tests merely to repeat
  fixed examples or reproduce the implementation's transformations.

## 3. Eliminate redundant coverage

Default to mostly fast Bun unit/contract tests and a small Playwright suite for
critical user journeys. Keep detailed functional cases below the browser; use
Playwright to prove that controls, route state, and browser APIs work together.
There is no target test count or layer ratio: each browser case must catch a
distinct integration failure that the lower-level tests cannot establish.

- Assign each rule a primary owning layer: pure contract tests for data semantics,
  integration tests for boundary enforcement/persistence, and browser tests for
  interaction and download behavior.
- Choose the narrowest layer that can genuinely prove the rule. Repeat a rule at
  another layer only to catch a distinct integration defect, and state that reason.
  For example, detailed size boundaries belong in contract tests; one direct API
  rejection case proves the server actually enforces validation.
- Do not duplicate every parser case through the component, API, and browser.
  Do not add a separate test for each helper involved in the same behavior.
- Browser coverage should focus on workflows such as import → edit → download,
  cancel without changing the draft, replace a loaded list → Start with the correct
  payload, and export the original input after sorting. Include controlled async
  regressions where stale work could overwrite user changes. Prove detailed
  validation rules in unit tests and use representative UI cases to verify errors
  are shown and block application.
- Browser tests with mocked tRPC responses prove frontend wiring and outgoing
  requests, not server validation, persisted state, or database atomicity. Assign
  those guarantees to API/database integration tests with real persistence.
- Partition inputs by materially different behavior. Parameterize equivalent cases
  with descriptive names; do not generate a Cartesian product of formats, errors,
  and UI modes without a specific interaction rule to justify it.
- Use below/at/above boundary cases when they distinguish a documented boundary.
  Do not pad the suite with many arbitrary values inside the same partition.
- Give each test one behavioral purpose. Multiple assertions are appropriate when
  they jointly prove that purpose, such as unchanged content, identity, and storage
  after canceling an import. Do not split those into repetitive setup-heavy tests.
- Omit trivial framework/library behavior, type-only checks already enforced by
  TypeScript, and reversible cosmetic changes that add no meaningful regression
  protection. Do not add tests just because a file changed.

For daily feedback, use `bun test` or `bun run test:list-transfer`. Run
`bun run test:browser` for relevant UI changes and both suites in CI;
`bun run test` runs both. See the [README testing section](../README.md#testing)
for browser setup and commands.

## 4. Assert outcomes, not implementation machinery

- Assert complete contract-relevant results: exact title and values, order,
  duplicates, identity relationships, persisted state, or downloaded contents.
  Length-only, truthiness-only, and “did not throw” assertions are insufficient when
  the rule specifies content.
- For rejection cases, assert the documented reason or stable error category,
  relevant field/source location when part of the contract, and absence of partial
  effects. A generic `toThrow()` does not distinguish the intended rejection from
  a crash. Assert exact prose only when its wording is itself a requirement.
- Interact through public APIs or user-facing controls. Query UI by accessible role
  and name. Avoid private functions, hook state, CSS class names, component trees,
  internal cache keys, SQL text, and incidental helper-call order.
- Assert external calls or their absence only when that boundary behavior is a
  requirement: export makes no request, preview creates no list, quota exhaustion
  prevents inference, or an explicit extraction makes at most one provider call.
  Do not assert internal call counts simply to match the current code path.
- Do not use broad snapshots of DOM trees, provider payloads, or arbitrary objects.
  A small reviewed golden file is appropriate for a documented portable format;
  never regenerate it from current output merely to make a failure pass.
- Random IDs need relational assertions such as “new identity differs from source”
  or “duplicate values remain separate items,” not a hard-coded UUID or an assertion
  about which UUID-generating function was called.

## 5. Keep tests deterministic and dependencies honest

- Fix clocks, timezone-sensitive inputs, randomness, and external responses where
  they affect an outcome. Isolate test data and restore modified dependencies.
  Tests must pass independently and in any order.
- Control asynchronous completion with deferred responses and fake clocks at the
  external boundary. Do not use arbitrary sleeps, repeated retries, or real network
  timing to make race/timeout tests pass.
- Mock only genuine external boundaries, such as a model response, network failure,
  or clock. Do not mock the behavior being tested or replace application validators,
  parsers, state transitions, and persistence logic with prearranged success values.
- A mocked database transaction cannot prove rollback or atomicity. Verify those
  rules against an isolated real database. Likewise, a fake counter cannot establish
  Redis concurrency guarantees. If the required environment is unavailable, report
  the unverified guarantee rather than claiming the mock proves it.
- Keep normal suites offline and repeatable. Live model checks are separately run
  integration/evaluation checks, not exact-output unit tests. AI wording is not a
  deterministic oracle; the app's handling of fixed valid/invalid responses is.

## 6. Prove that the tests can detect a defect

For each test, name a plausible incorrect behavior that would fail its assertions.
Reject a test if a constant output, empty result, no-op, unrelated error, or
incorrectly mocked success could satisfy it while violating the stated rule.

For high-impact guarantees, verify a targeted fault is caught when practical—for
example, dropping a duplicate, trimming native text, accepting an unsupported
version, or retaining the old share-link identity. A valid failure must come from
the behavioral assertion, not a syntax error, missing import, or broken fixture.
Record the targeted check and restore the correct behavior; a full mutation-testing
framework is not required. Run the relevant checks again after restoring it.

Do not change expected results to fit implementation output. Resolve a failing test
by fixing the implementation or documenting an explicit correction to the contract.

## 7. Milestone A application

Milestone A is native JSON import/export end to end. Design its cases around these
business outcomes, not the proposed filenames or component structure:

- **Native content preservation:** a hand-authored document preserves title,
  nonalphabetical order, duplicate values, surrounding whitespace, combining
  characters, emoji, and embedded line breaks. Use deliberately distinguishing
  values, not sorted unique ASCII items that would hide normalization/order bugs.
- **Portable export:** compare an export to an independently authored native-format
  fixture, including its version, allowed fields, and documented formatting. Browser
  coverage checks the actual download and latest typed/pasted edit, rather than
  repeating all serialization cases.
- **Validation partitions:** cover supported/unsupported versions, malformed input,
  shape violations, nonblank rules, and the documented character/item/byte limits.
  A single-item draft is valid for import/export but cannot start sorting. Separate
  code-point boundaries from UTF-8 byte boundaries; ASCII alone cannot prove both.
- **Replace and append:** replacing uses the imported title/items; appending retains
  the existing title and appends in order. Validate the combined draft, including a
  case where each list is valid separately but the combined result exceeds a limit.
- **No application before acceptance:** cancel, a failed import, or a stale async
  result cannot change the active draft or URL. Verify one meaningful controlled
  stale-response ordering rather than repeating the same race with arbitrary waits.
- **New-list identity:** import different content with the same item count as a
  loaded list, edit the title, then Start. The source list is unchanged and the new
  share link reloads the imported content. This workflow owns the cross-boundary
  identity/persistence guarantee.
- **Server enforcement:** a direct invalid create request is rejected without
  records being written, even when client validation is bypassed. A controlled
  insertion failure leaves neither a partial listing nor partial items.
- **Input-list meaning:** exporting while sorting or after completion preserves
  the original input order, including a result order deliberately different from it.

The list above is a case-design guide, not a mandatory count or a reason to repeat
existing coverage. Add a case only when the contract map exposes a distinct gap.
CSV, text-adapter, and AI behavior belong to their own implementation milestones.

## 8. Completion report

Report the business rules exercised, the distinct defects the suite can detect,
commands actually run, and any unverified integration guarantees. Identify any
overlap deliberately retained across layers. Keep the report concise; do not use
test counts or coverage percentages as evidence of correctness.
