# Milestone 3 adapter contract cases

Cases derived from list-import-export.md sections 5–7 before adapter implementation.
Existing suites own native JSON, shared field limits, draft identity, append/replace,
offline operation, and download resource cleanup.

| Rule              | Scenario and expected result                                                                                                                  | Plausible defect                                                 | Owner                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| CSV preservation  | BOM, CRLF, quoted comma/quote/multiline cells, duplicate values: exact selected cells in source order with record references                  | Splitting lines/commas or trimming cells                         | Contract                                      |
| CSV mapping       | One column auto-selected; unique value/item/name suggested; multiple matches require selection; header off uses positional columns            | Silently choosing wrong column or consuming first item as header | Contract                                      |
| CSV titles        | Repeated identical titles accepted; differing titles require explicit preview choice; no title uses filename/paste fallback                   | Dropping conflict or taking first title silently                 | Contract + browser conflict resolution wiring |
| CSV errors        | Wholly empty records skipped with count; blank selected cell stays repairable; inconsistent widths/unclosed quotes block with record location | Silent row loss or guessed repairs                               | Contract                                      |
| CSV export        | Literal golden CSV including quotes, repeated titles, CRLF and formula escaping in titles/values after whitespace; import retains apostrophes | Formula execution, double escaping, lossy apostrophe stripping   | Contract                                      |
| Text              | Mixed CRLF/CR/LF, blank lines and literal commas/tabs/semicolons yield exact nonblank lines and source locations                              | Delimiter guessing or trimming                                   | Contract                                      |
| Marker option     | Off preserves markers; on removes one supported bullet/number with whitespace, not nested markers or interior punctuation                     | Over-aggressive cleanup                                          | Contract + browser option wiring              |
| Detection         | Known extensions select parser; pasted comma text stays text unless CSV selected; leading JSON never falls back on error                      | CSV guessing or malformed native input accepted as text          | Contract + browser format wiring              |
| Titles            | Filename minus extension or misorter; invalid fallback remains editable and blocks apply                                                      | Silent truncation or first-line title inference                  | Contract                                      |
| Export limits     | TXT items only with final LF; embedded CR/LF refuses TXT; serialized CSV over 1 MiB refuses with JSON alternative                             | Splitting a stored item or unimportable download                 | Contract + browser compatibility message      |
| Browser downloads | CSV mapping → edit → apply → actual CSV/TXT downloads contain latest data                                                                     | Controls not connected to adapters/download format               | Browser                                       |
| Source revisions  | Change format/options while file read pending: stale result cannot replace current preview                                                    | Race after parser option changes                                 | Browser                                       |

Visual check: existing Merriweather Sans typography, shared field/button styles,
light/dark themes, keyboard names/focus, mobile mapping controls without overflow.
