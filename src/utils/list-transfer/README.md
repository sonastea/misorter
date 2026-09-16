# Native list contract

`parseNativeJson(string | Uint8Array)` accepts native JSON only. Pass file bytes
to enforce fatal UTF-8 decoding, and check the file's size before reading it.
The parser bounds raw input before JSON parsing. Unsupported versions never fall
back to another format.

`validateDraft(unknown)` revalidates edited or combined drafts, including canonical
output size. `serializeNativeJson(unknown)` validates before returning the exact
UTF-8-ready JSON text and media type. Both return structured issues on failure.
A failed parse/validation can retain a structurally editable `draft`; that candidate
is **not validated** and must not be applied until revalidation succeeds. Candidates
above the item limit are omitted to bound preview allocation; retain the source.

`ListDraftSchema`, `ListTitleSchema`, and `CreateListSchema` are shared Valibot
contracts for subsequent UI/API integration. Import/export allow one item;
creation requires two. Validation never trims stored values. Paths use field names
and zero-based array indexes. Duplicate notices count occurrences after the first.

Published assets:

- [Native sample](../../../public/examples/favorite-games.misorter.json)
  served at `/examples/favorite-games.misorter.json`
- [JSON Schema](../../../public/schemas/misorter-list-v1.schema.json)
  served at `/schemas/misorter-list-v1.schema.json`

The hand-maintained JSON Schema is checked with Ajv against the same independent
contract corpus as runtime validation. Standard JSON Schema covers structure and
code-point constraints; UTF-8 decoding and the 1 MiB raw/canonical byte limits
require application checks, as its `$comment` documents.

Run `bun run test:list-transfer` and
`bunx tsc --project tests/list-transfer/tsconfig.json`. Test-specific Bun types are
isolated from the application's TypeScript project. The scenario/defect map is in
[`specs/list-transfer-contract-cases.md`](../../../specs/list-transfer-contract-cases.md).
