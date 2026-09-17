# Release notes

## 3.1.0 — List import/export

### Added

- Import lists from JSON, CSV, or plain-text files, or paste them directly. No
  account is needed, and importing and exporting happen on your device.
- Review and edit imported titles and items before replacing your current list or
  appending more items. Duplicate items are preserved.
- Download lists or copy them to your clipboard as JSON, CSV, or plain text. An
  example file is available in the import dialog to help you get started.
- Export your original input list during or after sorting. These exports preserve
  the original item order, not your final ranking or sorting progress.

### Changed

- Importing into an existing shared list creates a separate draft. Editing its
  title leaves the original list unchanged, and **Start** creates a new share link.
- New lists support **2–1,000 items**, with titles up to **255 characters** and items
  up to **2,000 characters**. Titles and items cannot be blank. You can import or
  export a single-item list, but sorting needs at least two items.
- Imports and exports have a **1 MiB size limit**. Large lists may also reach this
  limit when saved. Clear errors help you adjust content without silently cutting
  it short.
- Existing lists remain available to view and sort. Editing or exporting a list
  that exceeds the new limits may require shortening it first.

### Format notes

- **JSON** is the best choice for an exact backup, preserving your title, item text,
  order, and duplicates.
- **CSV** works well with spreadsheets. Some values receive a leading apostrophe
  to prevent spreadsheet formulas; that apostrophe remains if you import them again.
- **Plain text** includes items only, without the title. Use JSON or CSV if an item
  contains line breaks.

See the [import/export guide](docs/list-import-export.md) for instructions, examples,
and full limits.
