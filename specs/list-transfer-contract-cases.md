# Portable contract verification (step 1)

All cases are owned by Bun pure-contract tests. Expected documents are hand-authored;
UI, persistence, and download integration belong to later milestones.

| Rule                      | Scenario and expected outcome                                                                                                  | Defect detected                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| §4 exact native content   | Golden JSON preserves unsorted duplicates, whitespace, emoji, combining marks, quotes and newlines; export equals golden bytes | Trimming, normalization, sorting, deduplication, leaking identity, incorrect formatting |
| §4 strict/versioned shape | Unsupported version has the specified message before field checks; missing/wrong/unknown fields fail at their paths            | Silent data loss or interpreting incompatible native data                               |
| §4/5 input decoding       | BOM and JSON whitespace accepted; malformed JSON, invalid UTF-8 and binary NUL rejected                                        | Replacement-character decoding or fallback to text                                      |
| §6 field limits           | 255/256 title and 2,000/2,001 item code points, blank and NUL values                                                           | UTF-16 counting, trimming stored content, accepting invalid fields                      |
| §6 item limits            | 1 and 1,000 accepted; 0 and 1,001 rejected; creation requires 2                                                                | Off-by-one bounds or imposing creation minimum on backups                               |
| §6 byte limits            | Raw and canonical output independently accepted at 1,048,576 bytes and rejected above; compact input may exceed canonical size | Character counting instead of bytes or ignoring serialization overhead                  |
| §8 editable errors        | Validly shaped invalid fields retain a candidate with path-specific issues                                                     | Losing repairable preview data                                                          |
| §10 published schema      | Same valid/invalid shape and field boundary corpus evaluated by runtime and JSON Schema validators                             | Drift between published contract and runtime                                            |

JSON Schema describes document structure and string/array constraints. UTF-8 input
and canonical serialized byte limits are application-level checks, documented in
the schema; they cannot be represented by standard JSON Schema keywords.

Targeted fault check: temporarily trimming item values during serialization made
the golden-byte assertion fail on `"  Alpha\t"` versus `"Alpha"`. The fault was
removed and the contract suite rerun successfully.
