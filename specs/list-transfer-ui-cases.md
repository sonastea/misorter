# Milestone 2 contract cases

Designed from specification sections 4, 6, and 7 before reading implementation.
Milestone 1 owns detailed native parsing and serialization semantics.

| Rule                 | Scenario and expected outcome                                                                                                                                                   | Plausible defect                                         | Owning layer                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| Replace/append       | Replace uses imported title/order; append keeps existing title and existing IDs, adds separate new IDs for duplicate imported values                                            | Title replaced on append; duplicate collapsed            | Pure contract and route integration (identity only) |
| Combined limits      | Two individually valid drafts total 1,001 items or exceed 1,048,576 canonical bytes; append rejected with count/size reason                                                     | Only preview validated                                   | Pure contract                                       |
| Acceptance boundary  | Cancel or malformed source leaves active values and URL unchanged; repair blank preview field before apply                                                                      | Parse applies early; stale validation enables apply      | Browser                                             |
| Stale work           | Defer file A read, change to B or close, resolve A; A cannot replace preview or active draft                                                                                    | Late read wins                                           | Browser with controlled file reads                  |
| Draft identity       | Loaded share link replaced with different same-count values; URL loses only list, title edits are local, late source response cannot overwrite; append retains existing row IDs | Count mistaken for saved identity; stale query reapplied | Route integration                                   |
| Latest edit/download | Anonymous user types/pastes into active item editor and downloads exact latest values; filename safe and bounded; failure can retry                                             | Keydown misses last edit; object URL leaks               | Browser, download boundary                          |
| Local operation      | Loaded app imports and exports offline; no list create/get/visit requests from these actions                                                                                    | Transfer accidentally persists/retrieves                 | Browser                                             |
| Input semantics      | Export during and after ranking whose order differs from input still has original order                                                                                         | Ranked output exported                                   | Browser                                             |
| Usability            | Keyboard cancel/apply focus; announced errors; mobile/light/dark; 1,000-row preview bounded                                                                                     | Focus lost; overflow; inaccessible errors                | Browser                                             |

Persistence of a fresh label on Start and source database immutability are owned
by milestone 4's real persistence workflow.

## Verification ownership and results

- `tests/list-transfer/draft.test.ts` owns exact combination semantics, combined
  overflow, retained-title validation, new/retained row identities, and safe bounded
  filenames. Append ignores an unused invalid preview title and validates the
  existing title instead.
- `tests/browser/list-transfer.pw.ts` exercises the real route and dialogs through
  their accessible controls, with network/file/download boundaries controlled.
  Native semantics are only repeated where needed to prove UI wiring: blank-field
  repair, source-only/unknown-field errors that must remain blocking, and latest
  clipboard/keyboard edits reaching an actual downloaded file.
- Browser coverage also owns pre-read size enforcement, persistent source indexes
  after removal, download retry and object URL cleanup, save/loading guards,
  published example download, and disabled invalid-draft downloads. These catch
  integration failures that pure parsing/serialization cannot detect.
- All cases passed. A deliberate retained-source-identity fault failed the route
  test on an unexpected title-update request. Correct behavior was restored and the
  full suite passed. See the [verification record](list-import-export-todo.md#milestone-2-verification-2026-09-15)
  for commands, visual checks, and outstanding release blockers.
