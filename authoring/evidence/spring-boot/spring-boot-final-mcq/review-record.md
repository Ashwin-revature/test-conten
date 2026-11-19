# Spring Boot course-final MCQ: review record

Course-level evidence for `spring-boot/assessments/spring-boot-final-mcq/final-mcq.gift` (22 graded questions, 30 minutes), plus a separate non-graded reserve of 5 questions kept here as `reserve-mcq.gift`.
Recorded 2026-11-19. Source: the private course-final candidate, correction loop 2 (terminal), bytes copied unchanged except as noted.

## Bytes

| File | sha256 | Note |
| --- | --- | --- |
| `final-mcq.gift` (candidate) | 4908a83ac1150c2204fa813bbbe211305de1295bd03713dd1d68db0818eabb7d | The bytes both critics approved. |
| `final-mcq.gift` (repo) | e166262b67b5fe243c6871417d8dfb3f9983a9c66ae360122d38ddc27468a117 | Differs from the candidate only in line 3: `$CATEGORY` is the delivery folder path `spring-boot/assessments/spring-boot-final-mcq`, as the candidate README directs and `authoring/tests/course-final-gift.test.mjs` requires. No question, option or feedback byte changed. |
| `reserve-mcq.gift` | c7f91317a4d1d259d48f6157ff6c80eeb9e55e084fc04f84074bb5694771d3dc | 5 corrected, key-proven items; not graded. Category is the candidate's (`spring-boot-module-check`). |
| `blueprint-proposal.json` | bdc1231f8e4d1ba1980a3ab9d1ab7a01b1a394ba0f927ebdeff24395b7c3035d | Applied as the split described below. |
| `coverage.json` | 000039470f9bcf6058023bd9981cac02348e4d5f1697b5d5f86caa840687a7bf | Per-item coverage; answer-bearing, permitted by the captain public-answer consent of 2026-11-19. |

## Review outcome (by reference)

Two independent critics (Spring SME, education) reviewed the bank through two correction loops. A non-author reconciler accepted loop 2: 0 high, 0 medium, 3 disclosed lows.
The reports are in `reviews/` (original handoff hashes in `reviews/handoff-manifest-sha256.txt`):

- `sme-review.md`, `sme-recheck-loop1-replacement.md`, `sme-recheck-loop2.md` (verdict APPROVE)
- `education-review.md`, `education-recheck-loop1.md`, `education-recheck-loop2.md` (verdict Approve)
- `reconciliation.md`, `reconciliation-loop1.md`, `reconciliation-loop2.md` (terminal)

Disclosed lows, not fixed and not blocking: SMR-6 (q28 key wording slightly exceeds the stem), SMR-7 (q14 option B feedback says "also deletes its shared garden"; the delete is attempted and rolled back), and one education wording low in `education-recheck-loop2.md`.
These reports are author-format Markdown, not the repository's critic-report JSON schema, so they are not bound into `course.lock.json` evidence bindings.

## Proof

`key-proof/results.txt` and `key-proof/item-tests.tsv`: 20 of 22 bank keys executed in a Spring Boot 4.1.2 / Java 25 harness (core 30 tests, sec 6, fly 2; 0 failures) and 2 cited; reserve 4 executed and 1 cited. Run once, on macOS, locally. The harness sources stay in the private handoff (hashes in the manifest). This is local evidence only, not hosted CI, not platform import, and not learner-timed: the 29.08-minute figure is a modelled estimate (`audit.txt` section 3).

## Structure

Following the HTML, CSS & JS precedent, the graded MCQ and the graded practical are separate registered assessments:

- `spring-boot-final-mcq`: kind `gradedMcq`, 22 questions, 30 minutes, 49 objectives (MCQ format).
- `spring-boot-final-assessment`: now the graded practical only (kind `gradedPractical`, 8 items, 150 minutes, 30 objectives). Its id is kept so existing module notes keep resolving.

Open decision for the owner: the former combined 60/40 weighting and single 70% overall pass mark are no longer in the blueprints; each part now carries its own 70% pass mark. Exception E1: health-checks is not sampled by the shared bank (it has no Fast row).
