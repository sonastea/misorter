# Import and export lists

Use **Import list** in setup to open a UTF-8 file or paste a list. No account is
required. Parsing, preview edits, and exports happen in your browser; they work
offline after the app has loaded. **Start** needs a connection to create a new
shareable list.

An exported list contains its **title and original ordered input items**, including
duplicates. It does not contain ranks, ties, sorting progress, or share-link
identity. During sorting and on the results screen, **Export input list** still
exports that original input order, even if your final ranking differs.

## Import, review, and apply

1. Choose **Import list**, then select a file or fill **Paste list**.
2. Choose a format and select **Preview list**. Auto recognizes JSON, CSV, and TXT
   file extensions. For pasted content or unknown extensions, a leading `{` or `[`
   selects JSON; other content is plain text. **Select CSV explicitly for pasted
   CSV.** Commas alone never trigger CSV detection.
3. Review the title, items, source locations, skipped-line notices, and errors.
   Edit the title or individual items, or remove unwanted rows. Duplicates stay as
   separate items. Large previews are paginated.
4. Choose **Replace** (the default) or **Append**. Replace uses the imported title
   and items. Append keeps the current title and adds items in source order after
   your existing items. The combined draft must fit the limits below.
5. Choose **Use imported list** to apply the valid preview. Cancel leaves your
   existing list and URL untouched. Parsing again replaces your preview edits.

Applying an import creates a local draft and removes any previous list's share-link
identity. Editing that draft's title does not rename the source list. The next
**Start** creates a fresh share link. Save an export before leaving or reloading an
unsaved draft; importing does not itself persist it.

## Choose an export format

Open **Export list** in setup, or **Export input list** during/after sorting. Choose
a format, then download it or use **Copy to clipboard**. Clipboard access depends
on your browser's permissions. Export uses the latest item edits and does not
create a share link.

### Misorter JSON — exact backup

Choose JSON for backups and exact transfers. It preserves title and item text,
input order, duplicates, surrounding whitespace, Unicode, punctuation, and embedded
line breaks without trimming or normalization.

```json
{
  "format": "misorter-list",
  "version": 1,
  "title": "Favorite games",
  "items": [{ "value": "Hades" }, { "value": "Outer Wilds" }]
}
```

Downloads use `.misorter.json`, UTF-8, two-space indentation, and a final newline.
Import also accepts a leading UTF-8 BOM. All shown fields are required; unknown
fields, unrelated JSON, bare arrays, and unsupported versions are rejected rather
than interpreted as plain text. IDs, share labels, and sort state are not included.
The document's `version: 1` is independent of the app's `3.1.0` version.

- [Download the full native example](../public/examples/twice-this-is-for.misorter.json)
  (also available directly in the import dialog).
- [Machine-readable JSON Schema](../public/schemas/misorter-list-v1.schema.json).

On a deployed app, these resources are served at
`/examples/twice-this-is-for.misorter.json` and
`/schemas/misorter-list-v1.schema.json`. The schema describes document structure
and field limits; runtime validation additionally enforces the UTF-8 byte limits.

### CSV — spreadsheet

CSV exports repeat the title on each row, preserve order and duplicates, use
standard quoting for commas/quotes/newlines, and use CRLF record endings:

```csv
title,value
Favorite games,Hades
Favorite games,Outer Wilds
```

On import, use the header-row toggle and item/title column selectors for other
layouts. Unambiguous `value`, `item`, or `name` headers can suggest the item column;
ambiguous columns require a selection. Conflicting titles require choosing a title
in the preview. Unused columns and wholly empty records are reported. Invalid
selected cells need editing or removal; malformed quotes and inconsistent record
widths need correction in the source. Only comma-delimited CSV is supported.

**Spreadsheet escaping changes some text:** exported title and item cells beginning
with `=`, `+`, `-`, `@`, tab, CR, or LF are prefixed with an apostrophe, including
formula markers after leading whitespace. Import preserves those apostrophes;
it does not undo the escaping. Use JSON when exact text must survive a round trip.

### Plain text — items only

Import treats each nonblank line as one item, normalizes CRLF/CR line endings for
splitting, and reports omitted blank lines. Commas, semicolons, and tabs within a
line are literal text. **Remove list markers** is off by default; when enabled,
it removes at most one leading `-`, `*`, `•`, or numeric marker such as `1.` or
`1)` followed by whitespace, allowing indentation.

Without an imported title, the filename minus its extension becomes the title;
pasted lists use `misorter`. The first line is an item, not a guessed title.
Titles remain editable and are never silently shortened.

TXT export contains **items only; title not included**, separated by LF with a
final newline. TXT export is disabled if an item contains CR/LF because that would
split one item into several. Choose JSON or CSV for multiline items.

## Limits and existing lists

| Constraint                                    | Limit                                       |
| --------------------------------------------- | ------------------------------------------- |
| Raw file or pasted input                      | 1 MiB (1,048,576 UTF-8 bytes)               |
| Imported/exported draft                       | 1–1,000 items                               |
| New list creation / Start                     | 2–1,000 items                               |
| Title                                         | Nonblank, at most 255 Unicode code points   |
| Each item                                     | Nonblank, at most 2,000 Unicode code points |
| Canonical JSON, including formatting overhead | 1 MiB                                       |
| Each serialized download                      | 1 MiB                                       |

Titles and items cannot contain NUL characters. Unicode code points and UTF-8 bytes
are different measures; non-ASCII text can reach the byte limit first. Whitespace
is preserved, but whitespace-only titles/items are invalid. Limits apply after
preview edits and to the final combined draft when appending. Content is never
silently truncated or deduplicated.

CSV can exceed the download limit because it repeats titles and adds quoting or
escaping; choose JSON if offered. One-item drafts can be imported and exported,
but need another item before Start.

These creation rules also apply to manually entered lists and direct API requests.
Title updates use the same title rules. Existing legacy lists remain readable and
can start sorting unchanged. Edited/new lists must meet the new creation limits;
exporting an incompatible legacy list reports the affected fields so you can return
to editing and correct them.
