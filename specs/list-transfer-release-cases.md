# Milestone 5: release verification cases

Designed from the milestone checklist and specification sections 4–8 and 11,
before inspecting implementation logic. Reuse existing tests wherever they own
the behavior; add browser coverage only for a missing integration guarantee.

| Rule/source                          | Scenario and expected outcome                                                                                                               | Plausible defect                                                 | Owning layer                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Documentation, sections 4–6          | Guide explains JSON exact preservation, CSV formula escaping, TXT title omission/multiline refusal, all limits, and input order versus rank | Users choose a lossy format for backups or expect ranked results | Documentation review                                                         |
| Published resources, section 7       | Import-dialog sample link downloads valid native JSON; published schema is reachable and agrees with the sample                             | Broken deployment path or invalid example                        | Browser resource check; existing schema contract tests                       |
| Anonymous workflow, sections 7–8     | Import → edit → export → Start submits exact edited values; reload of the new label displays the returned title and original item sequence  | Fresh label is lost or reload restores source content            | Browser with intercepted API; real persistence remains deferred by agreement |
| Input-list meaning, sections 2 and 7 | During and after a ranking that differs from input, export still contains original input order                                              | Export serializes ranked results                                 | Existing browser workflow                                                    |
| Accessibility, section 7             | Keyboard open/Tab/Escape/focus works; mobile light/dark dialogs fit viewport and show errors                                                | Focus escapes or controls become inaccessible on mobile          | Existing browser workflows plus visual review                                |
| Release readiness, milestone 5       | Full suites, app/test TypeScript, lint, formatting, client/Worker builds pass; package version is 3.1.0                                     | Focused checks hide app regressions or release metadata drifts   | Release commands and recorded results                                        |

Detailed format and boundary semantics stay in the existing contract suites.
Storage-boundary unit tests and intercepted browser responses do not establish
PostgreSQL rollback, persisted ordering, Redis consistency, or source-record
immutability. The milestone 4 verification decision continues to apply.
