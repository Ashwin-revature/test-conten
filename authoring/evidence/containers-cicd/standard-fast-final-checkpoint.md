# Standard/Fast final checkpoint MCQ

The cumulative graded multiple-choice checkpoint for the end of the Standard and Fast tracks.
It is distinct from the Foundation checkpoint, from every course-final bank and from the formative topic and module practice banks.

| Item | Value |
| --- | --- |
| Bank | `containers-cicd/assessments/standard-fast-final-checkpoint/checkpoint-mcq.gift` |
| Blueprint | `containers-cicd/assessments/standard-fast-final-checkpoint/blueprint.json` |
| Format | 30 single-answer MCQ, four options each, `[html]` GIFT, category `standard-fast/final-checkpoint-mcq`, titles `sfcp-q01` to `sfcp-q30` |
| Duration | 60 minutes, at 2 minutes per question |
| Day | Standard S43 and Fast FT25 (the Final gate) |
| Content authority | learner pages at `b102584d`; `a00a6658` changes only QA tooling, so the authority is unchanged |
| Byte check | `authoring/tests/standard-fast-checkpoint-gift.test.mjs` |

## Placement

The checkpoint is not owned by one course.
It sits with Containers & CI/CD because that is the last shared course before the Final and its `course.json` already names the other four shared courses as prerequisites.
The objective references in the blueprint are fully course-qualified, so they resolve to each course's own topics.
The bank carries its answer flags in the canonical repository under the captain's 2026-11-19 public-answer consent; `authoring/AGENTS.md` records that.
It is a new file name, `checkpoint-mcq.gift`, so the course-final bank rules (`*/assessments/*/final-mcq.gift`) do not apply to it and its own test checks it instead.

## Scope

Content taught **in full on both tracks** in the five shared courses:

| Course | Standard days | Fast days | Items |
| --- | --- | --- | --- |
| Spring Boot | S1-S13 | FT1-FT8 | 8 |
| Python | S14-S19 | FT9-FT11 | 5 |
| HTML/CSS/JS | S20-S27 | FT12-FT15 | 7 |
| React | S28-S35 | FT16-FT20 | 7 |
| Containers/CI-CD | S36-S39 | FT21-FT23 | 3 |
| **Total** | | | **30** |

Out of scope: the AWS track A1-A7 (separate, Fast only), the Foundation courses, Project 2, Standard-only topics (no FT day) and topics the calendar marks "(skim)" on their Fast day.
The skim list comes from the Fast day topic strings in `curriculum/snapshot/pep-calendar.json`; it includes beans and bean scopes, configuration files and profiles, secrets from the environment, mutability and aliasing, image layers and build caching, debugging with logs and exec, flexbox, grid, the event loop and accessible forms.

**Skim rule.** Every item's deciding fact sits on a topic taught in full on both tracks, with no exception.
(The r6 bank had one: a Dockerfile layer-caching item whose deciding fact was on the Fast-skimmed image-layers page. It was replaced in r7; see Review history.)

**Allocation.** Items follow each course's share of taught days, adjusted by what each course offers once Fast-skim and Standard-only topics are excluded.
Spring Boot loses several topics to that exclusion (beans, configuration and profiles, secrets from the environment and the whole integration-and-observability module), so it sits about one item under its day share (8 of 30, against 33-35% of days); Python sits about one over.
React and Containers/CI-CD match their day shares.

**Module coverage: 19 of the 20 shared modules.**
The one module with no item is Spring Boot integration-and-observability: every topic in it is Standard-only or marked "(skim)" on its Fast day, so the skim rule excludes it.
React auth-and-review, which had no item in r6 by an author choice, is covered by q27 in r7.

## Coverage map

Days are Standard / Fast. "Executed" keys were run; "page-grounded" keys rest on learner-page statements a critic checked.

| Item | Deciding topics | Days | Objectives | Key check |
| --- | --- | --- | --- | --- |
| q01 | spring-boot-basics/path-query-and-body-parameters | S2 / FT2 | o2 | executed |
| q02 | porting-and-configuration/schema-migrations-with-flyway | S4 / FT4 | o2 | page-grounded |
| q03 | spring-data-jpa/repositories-derived-queries-and-at-query; pagination-and-sorting | S5-S6 / FT3-FT4 | o2; o2 | executed |
| q04 | relationships-and-transactions/how-transactions-work-in-spring | S8 / FT6 | o2 | executed |
| q05 | relationships-and-transactions/the-n-1-query-problem-spotting-it-in-sql-logs; fixing-n-1-with-join-fetch | S8 / FT6 | o1; o1 | executed |
| q06 | validation-errors-and-testing/global-error-handling | S9 / FT5 | o2 | executed |
| q07 | validation-errors-and-testing/standard-error-responses-with-problemdetail; web-layer-tests-with-mockmvc | S9-S10 / FT4-FT5 | o1; o1 | executed |
| q08 | api-security/role-protected-endpoints; issuing-and-checking-a-jwt | S12 / FT7 | o2; o3 | executed |
| q09 | python-fundamentals/functions-and-arguments | S14 / FT9 | o2 | executed |
| q10 | data-pipelines/reading-csv-and-json-files-with-generators | S16 / FT10 | o3 | executed |
| q11 | data-pipelines/loading-into-a-staging-table-with-upserts | S16 / FT10 | o2 | executed (SQLite) |
| q12 | data-pipelines/cleaning-and-validating-records-with-pydantic-and-type-hints | S17 / FT10 | o3 | executed |
| q13 | fastapi-services/calling-the-spring-boot-api-from-fastapi-service-url-token-and-timeouts | S18 / FT11 | o2 | executed |
| q14 | html-and-css/accessibility-basics; forms-and-html5-validation | S20 / FT12 | o1; o1 | page-grounded |
| q15 | html-and-css/the-box-model | S20 / FT12 | o2 | executed |
| q16 | javascript-fundamentals/let-const-and-equals | S22 / FT12 | o2; o3 | executed |
| q17 | javascript-fundamentals/scope-and-closures; arrays-and-objects-map-filter-reduce | S22-S23 / FT13 | o3; o3 | executed |
| q18 | javascript-fundamentals/destructuring-and-spread | S23 / FT13 | o1; o3 | executed |
| q19 | dom-tooling-and-async/events-and-event-bubbling | S24 / FT14 | o2 | executed |
| q20 | fetch-and-browser-client/handling-http-errors-and-problemdetail-responses; fetching-data | S26 / FT15 | o1; o2 | executed |
| q21 | components-and-state/usestate | S29 / FT16 | o3 | executed |
| q22 | components-and-state/updating-state-immutably | S29 / FT16 | o3 | executed |
| q23 | effects-routing-and-rendering/loading-data-with-useeffect | S30 / FT17 | o2 | executed |
| q24 | effects-routing-and-rendering/routing-and-route-parameters | S31 / FT17 | o3 | executed |
| q25 | react forms-context-and-crud/ui-tests-with-testing-library-querying-by-role-and-label; html-css-js html-and-css/forms-and-html5-validation | S33 / FT20; S20 / FT12 | o1; o1 | executed |
| q26 | forms-context-and-crud/sharing-state-with-context | S32 / FT19 | o1; o2 | executed |
| q27 | react auth-and-review/handling-401-and-403-redirect-and-sign-out | S34 / FT19 | o2; o3 | executed (plain-JS router model) |
| q28 | containers-and-compose/service-name-networking; html-css-js fetch-and-browser-client/environment-settings-for-the-api-address | S37 / FT21; S27 / FT15 | o3; o1 | page-grounded |
| q29 | containers-and-compose/depends-on-with-health-checks | S37 / FT22 | o1; o2 | page-grounded |
| q30 | microservices-and-ci-cd/github-actions-pipeline | S39 / FT23 | o2; o3 | page-grounded |

The private candidate report filed q25's form topic under React and q28's API-address topic under Containers; both actually live in the HTML/CSS/JS course, and this map and the blueprint use the real paths.
That correction changes no item and no day: both topics are taught in full on both tracks.

## Final-day ledger and timing defaults

What the calendar (`curriculum/snapshot/pep-calendar.json`) fixes for S43 and FT25:

- The Gate day type is one 120-minute block, "Proctored assessment", format "MCQ + coding assessment (walkthrough recording pending in Evolv)".
- The Final's own record lists the formats coding, capstone (auto-graded) and recorded walkthrough, with weights coding without AI 32, capstone 24, communication 8, module checks 20 and walkthrough 16, and cut scores pool 70 and tier A 85. It names no MCQ format or weight.
- The walkthrough is recorded the day before (S42; FT24), and the capstone is Project 2, graded separately. Neither uses Final-day learner minutes.

So the learner minutes on the Final day are this MCQ plus the end-of-track coding assessments.
Their number and mix come from the overnight beta mandate, not from a repository file: four coding assessments, recommended as two Spring Boot, one Python and one Docker (or a second Python if Docker cannot be assessed soundly).

| Final-day block | Minutes | Status |
| --- | --- | --- |
| Checkpoint MCQ (this bank) | 60 | fixed by this blueprint |
| Four coding assessments | T, the sum of their reviewed durations | not yet known: those assessments are still being authored |
| Calendar Gate block | 120 | fixed |

With the MCQ at 60 minutes, the coding assessments have 60 minutes of the Gate block, about 15 minutes each.
This file does not claim they fit.

**Beta default (reversible).** The Final day keeps its fixed place (S43; FT25), and the MCQ is planned as its first sitting.
When the reviewed coding total T is 60 minutes or less, the day fits the 120-minute block unchanged.
When T is more than 60 minutes, the smallest honest correction is within the Final day: the day runs 60 + T minutes and the ledger records the overrun.
That matches how the installed Foundation beta taxonomy workbook already treats F30: its ledger replaces F30's 120-minute Gate block with 180 minutes of checkpoint rows (90 MCQ + 90 coding).
That precedent lives in the workbook, not in a repository file, and it is not like for like: the Foundation checkpoint's MCQ carries weight (24), while this MCQ carries none.
The correction changes no track day count, no AWS day, no other accepted activity and no Project 2 grading.
Rejected alternatives: cutting the MCQ below 30 items would drop course coverage and reopen an accepted bank; moving it to S42/FT24 would displace the accepted walkthrough day.
If T is large, a 60 + T minute day puts the weighted no-AI coding (32) after an hour of MCQ, so learner fatigue is a real cost; the owner can move the MCQ to its own sitting, or after the coding, without changing the bank.

**Weight and pass mark (beta defaults).** The calendar gives the Final no MCQ weight, so the blueprint has an empty `weights` object: the checkpoint score does not enter the published Final composite.
Its `passMark` is 70, the Final pool cut score and the module-check pass mark.
It is a readiness check reported to the learner's assessor, as the blueprint's learner instructions say: it is not a pass/fail gate and changes no grade in this beta.
Neither default changes the Final weights, the cut scores or Project 2's separate grading, and neither sets a programme-wide certification policy.

**Timing basis.** Two minutes per question, the rule the Foundation course finals use.
Total reading load is about 2,200 words; every item was judged answerable in about 2 minutes, and the longest traces are q04, q20 and q21.
No timed learner trial was run.

## Verification

- **Parse shape.** `authoring/tests/standard-fast-checkpoint-gift.test.mjs` validates the shipped bytes with `authoring/tools/gift/validate.mjs` in `[html]` mode: 30 questions, ASCII only, four options with exactly one key, no line GIFT import would drop as a comment.
- **Code blocks** use the indentation-safe literal-newline form from `authoring/tools/gift/code-newlines.mjs`: no numeric newline references and no unsafe code lines.
- **Key positions:** A 8, B 8, C 7, D 7, no position more than twice in a row, no periodic pattern.
- **Keys executed: 25 of 30.**
  - 24 are carried forward from the private authoring run, whose scripts printed PASS/FAIL per item and, where it mattered, checked that each distractor fails:
    - Spring (q01, q03-q08): Spring Boot 4.1.2 on JDK 25, Maven 3.9.16 offline, H2.
    - Python (q09-q13): CPython 3.14, pydantic 2.12.5, fastapi 0.121.3, httpx 0.28.1 with a mock transport. q11's upsert ran on SQLite's `ON CONFLICT ... EXCLUDED`, not PostgreSQL.
    - HTML/CSS/JS (q15-q20): Node 24 with jsdom 27; q15 checked arithmetically; q20 used stubbed `fetch` responses and a network rejection.
    - React (q21-q26): React 19.2, react-router 7.9, Testing Library 16.3 under jsdom.
  - The canonical SME critic re-ran q09, q10, q11 (SQLite), q16, q17, q18 and q20 under Python 3.14 and Node 24.
  - q27 (new in r7) ran on Node 24 as a plain-JS model: the stem's `handleStatus`, a router that honours `replace` and `state`, a sign-in step that returns to `state.from`, and an API that answers 403 to a non-admin. The key and the rejection of all three distractors printed PASS. It did not run react-router itself.
- **Page-grounded keys: 5** (q02 Flyway, q14 accessibility audit, q28 browser versus service name, q29 `depends_on` chain, q30 workflow `needs` and `push`).
- **Distractors.** Each wrong option is a named misconception with feedback saying why it is wrong. The key is the single longest option in 4 of 30 items and never more than 1.18 times the next option.

## Duplication

Lexical scan of the shipped bytes (stems and options, entity-decoded) by a scratch script that parses every bank it is given.
It read 258 files and parsed 1,660 questions:

- 252 tracked GIFT files at `a00a6658` other than this bank and the test fixtures: every topic `artifact.gift`, module `practice.gift` and Foundation `final-mcq.gift`;
- the two preserved containers mastery banks;
- the Foundation 45-question checkpoint;
- the in-progress HTML/CSS/JS and Git/Linux/AI course-final banks from their unmerged branches;
- the private Containers/CI-CD course-final candidate.

The scan was re-run on the final r8 bytes with the same corpus.
Result: 0 exact stem matches, 0 exact option sets, 0 shared 7-grams; highest stem trigram Jaccard 0.091 (q17 against the HTML/CSS/JS course-final q01), under the 0.2 flag threshold.
A lexical scan is a signal, not the gate: in authoring it reported nothing on a draft the critic found held 14 near-duplicates of formative items.
Near-duplicate judgement belongs to the critics in `standard-fast-final-checkpoint-critic-*.json` and their rechecks.

**Release gate.** The Spring Boot, Python, React and Containers/CI-CD course-final banks are not final yet.
The last whole-set duplication comparison runs against their final pins, and the checkpoint is not released for import until it does.
It must also settle one pair the education critic flagged as partial overlap, not a duplicate: q17 and the HTML/CSS/JS course-final q05 both turn on `let` giving each loop pass its own binding, with different setups.

## Review history

The bank was authored privately overnight and reviewed by an independent non-author critic for subject matter, education and duplication:

| Round | Change | Result |
| --- | --- | --- |
| r2 | first full draft | 15 high, 6 medium, 6 low: REVISE (14 near-duplicates of formative items, an ambiguous Flyway key, an untaught generator API, several Fast-skim items) |
| r3 | 20 items rewritten | 3 high, 2 medium, all keys correct: REVISE |
| r4 | 6 items changed | 0 high, 1 medium (a q20 to q07 leak) |
| r5 | one-line q20 fix | spot check of q20 only: 0 high, 0 medium, ACCEPTED |
| r6 | two precision edits from the critic's own low findings (q02 one distractor's feedback; q20 case (c) worded as a network failure with no response) | not rechecked privately |

Canonical review in this folder (two independent critics, then a non-author reconciler):

- **Loop 1 on r6.** The SME critic confirmed both r6 edits and found q27, the Dockerfile layer-caching item, a near-duplicate of a formative item whose deciding fact sat on the Fast-skimmed image-layers page (high), with an arguable second key (medium). The education critic found no high; its mediums were documentation fixes (the React auth-and-review gap reason and the unsourced Foundation precedent).
- **r7.** q27 was replaced by a React auth-and-review item at the same key position, the blueprint gained the objectives the critics found missing, and this file was corrected. No other item changed.
- **Loop 1 recheck on r7.** Both critics resolved the high and every medium. The education critic found the new q27 stem gave away the redirect (it said Mia signed in again), leaving a two-way choice (medium); the SME critic noted option A settled one of q08's distractors (low).
- **r8.** q27's stem now stops at the 403 and each option states the full sequence, so rejecting the not-allowed option needs the code reading; "not 401" was dropped from option A. The key stays at C and the plain-JS model re-ran with all four results PASS. This file's allocation sentence and release gate were corrected. No other item changed.

## Limitations

- No PostgreSQL server, Docker engine or GitHub Actions runner was used: q11 ran on SQLite, and q28-q30 are page-grounded.
- No platform import, timed learner trial or learner data.
- The coding-assessment durations, and therefore the final Final-day length, are not known yet.
- The final whole-set duplication comparison waits for the remaining course-final pins.
