# Math Archer — Reasoning Missions Plan

Created: 2026-10-05  
Status: Planned; implementation has not started.  
Purpose: The implementation checklist and decision record for this expansion.

## 1. Goal and evidence

The parent reports that the child is strong at calculating in the current game,
but struggles with understanding Vietnamese problem wording and choosing the
steps needed to solve a problem. Treat these as working hypotheses, then use
step-level practice to identify where help is needed.

Build **Nhiệm vụ suy luận**: missions that teach the child to understand a
question, represent its relationships, choose a solution, and calculate the
answer. Success means solving unfamiliar school-style questions after visual
support is removed, rather than memorizing game templates.

This is a post-MVP expansion. The existing arithmetic curriculum remains useful
for fluency and for checking whether a reasoning mistake was a calculation error.
This document governs the expansion; `mvp-boundary.md` describes the original MVP.

## 2. Existing foundations and constraints

Verified in the repository when this plan was created:

| Foundation | Relevant code | Consequence for this expansion |
| --- | --- | --- |
| Seven arithmetic skills | `packages/learning-engine/src/curriculum.ts` | Add a separate reasoning catalog and explicit integration; adding IDs alone is insufficient. |
| Questions contain two operands and one add/subtract operation | `packages/learning-engine/src/questions/types.ts` | Model missions as structured problems with steps; do not disguise them as one arithmetic expression. |
| Strategy, partial, and full explanation hints | `packages/learning-engine/src/teaching/hints.ts` | Reuse the support progression, with family-specific content. |
| Adventure, Training, Challenge and controller input | `apps/web/src/components/GameScreen.tsx` | Pilot in Training and reuse the answer/input experience. |
| Mastery includes a penalty for answers slower than six seconds | `packages/learning-engine/src/skills/profile.ts` | Reasoning needs its own scoring; reading and thinking time must not reduce mastery. |
| Arithmetic attempts update operand-pair progress | `packages/learning-engine/src/skills/recordAttempt.ts` | Mission evidence must not create invented arithmetic pairs or inflate arithmetic mastery. |
| Local history, offline sync, API attempts, and D1 skill progress | Engine history/storage, `apps/web/src/sync/`, `apps/api/src/db.ts` | Extend the complete persistence path, including retries and profile hydration. |
| Per-child skill switches and animation speed | `apps/web/src/skillPreferences.ts`, API child profile types | Reasoning preferences must sync; explanation advancement must be explicit regardless of animation speed. |

Follow the existing characters, visual themes, and rewards. A new world or a new
RPG progression is not required to teach these skills.

## 3. Content scope: all five families

| Family / proposed ID | School example and checked answer | Main reasoning objectives | Guided interaction |
| --- | --- | --- | --- |
| Daily collection / `daily_collection` | 8 cards, one more each day for five days: **13** | Identify starting amount, repeated change, duration, and requested total. | Starting pile and five day slots; later choose the calculation. |
| Instruction chains / `instruction_chain` | Difference of 14 and the successor of 7, then add 9: **15** | Interpret “hiệu”, “số liền sau”, “rồi”; preserve dependencies. | Successor 7 → 8; 14 − 8 → 6; 6 + 9 → 15. |
| Unknown starting amount / `unknown_start` | After eating 4 and giving away a dozen, 34 remain: **48** | Interpret “1 chục”, “còn lại”, “lúc đầu”; reverse the changes. | Rewind 34 → 44 → 48; also accept 34 + 4 + 10. |
| Growing-gap sequences / `growing_gap_sequence` | Seventh term of 0; 2; 6; 12; 20; …: **42** under gaps +2, +4, +6, +8, +10, +12 | Distinguish term position from value; infer and extend changing gaps. | Numbered stepping stones and spaces for gaps; sixth term 30, seventh 42. |
| Maximum sum from digit cards / `max_sum_digit_cards` | Cards 3, 2, 5, 4, 1; use four once each for two two-digit numbers: **95** | Choose cards, use place value, optimize the total. | Two tens slots and two units slots; 5 and 4 in tens, 3 and 2 in units. |

Content rules:

- Begin with easy calculations so the new challenge is interpreting the problem.
  Increase numerical range separately from wording and number of reasoning steps.
- Cover the original examples exactly, including answers above 20. Add bounded
  addition within 100 as a prerequisite check where needed; never assume that
  fluency within 20 proves fluency with every larger calculation.
- Teach repeated addition before introducing multiplication notation. Daily
  collection progresses from one per day to two or more per day.
- Teach “tổng”, “hiệu”, “số liền trước”, “số liền sau”, “mỗi ngày”, “sau … ngày”,
  “1 chục”, “còn lại”, “lúc đầu”, “thứ …”, and “lớn nhất” in context.
- Ask what quantities and relationships mean. Avoid teaching a rule such as
  “whenever you see ‘cho’, subtract”; the unknown-start example requires addition.
- Use multiple Vietnamese phrasings and familiar objects, with the same underlying
  relationships. Include held-out wording for checking transfer.
- Finite sequences admit multiple rules. State the intended growing-gap rule in
  introductory practice; use a consistent, reviewed rule for later puzzles.
- For digit cards, accept every valid arrangement with the optimal total, not
  just one pair of numbers. Do not reuse cards. Exclude zero in the initial bank;
  any later zero variant must enforce valid two-digit numbers.
- Generate from validated templates and bounded parameters, with deterministic
  seeds. Validate the solution and choices independently; no AI-generated runtime
  questions are required.

## 4. Learning and game loop

### Support levels

1. **Model:** show the story or diagram, explain a relationship, and invite a
   meaningful action. Worked examples are demonstrations, not independent attempts.
2. **Guided:** ask the child to identify a quantity, select an operation, or build
   a plan. Provide progressively stronger hints on request or after a mistake.
3. **Independent:** show the original Vietnamese question with minimal decoration.
   The child solves it and chooses a final answer; hints remain available in Training.
4. **Transfer:** change names, quantities, phrasing, and the order information is
   presented. Recheck understanding without a familiar animation revealing the plan.

Fade support based on demonstrated independent success. If the child struggles,
restore a useful scaffold and revisit the exact relationship that was missed.

### Interaction rules

- Put the full question in a readable panel beside or above the play area, rather
  than squeezing paragraphs onto a target. Keep it visible during the mission.
- Reuse four elemental choices where appropriate. Choices may be numbers,
  operations, or short plans; permit fewer than four when four distinct plausible
  options cannot be generated.
- Build card placement with tap/select-then-place plus keyboard and gamepad
  navigation. Dragging can be optional; it must not be the only input.
- Keep step feedback brief and specific. Show what the selected choice means,
  then allow correction. Record the first response before remediation.
- Use an explicit **Tiếp tục** action after reasoning feedback and explanations.
  Projectile animation speed still follows the child's existing preference.
- Training remains unlimited. When Adventure integration arrives, one completed
  mission uses one daily arrow; intermediate steps and retries use none. Persist
  that completion once, including across refresh and offline sync.
- Award a single mission completion reward, with supported completion allowed.
  Guided steps must not farm rewards or count as multiple completed sessions.
- Initial scope has no countdown. Challenge integration later uses independent
  problems without hints; it does not impose arithmetic-speed expectations.
- Optional Vietnamese read-aloud is a later enhancement. Core missions must work
  offline without it. Record read-aloud use separately from mathematical hints;
  it does not reveal a solution or imply lack of mathematical understanding.

### Concrete pilot: instruction chain

Keep this text visible:

> Lấy hiệu của 14 và số liền sau của số 7 rồi cộng với 9 thì được kết quả là bao nhiêu?

Guided steps:

1. “Số liền sau của 7 là số nào?” → 8.
2. “Hiệu của 14 và 8 được viết như thế nào?” → 14 − 8.
3. “Sau đó con làm gì?” → Cộng kết quả với 9.
4. Final answer → 15; show the completed chain and wait for **Tiếp tục**.

Independent variants omit these prompts. Use a new wording or parameter set to
check whether the child can construct the chain without assistance.

## 5. Evidence and adaptation

Track problem families separately from reasoning dimensions:

- Vocabulary/quantity interpretation.
- Identifying what is known and what is asked.
- Choosing an operation or representation.
- Ordering steps and reversing changes.
- Pattern and place-value reasoning where applicable.
- Calculation, when an observed response actually tests it.

Store first response, corrections, hints, support level, and final outcome.
Keep assisted completion and independent success separate. A correct final answer
alone is evidence of task success, not proof of every underlying dimension.
A distractor may suggest a misconception; confirm it through step evidence rather
than declaring a diagnosis from one click. Unobserved dimensions remain unknown.

Show parents specific findings, with evidence counts, such as:

> “Số liền sau”: 4/5 first responses correct. Choosing “hiệu”: 2/5 correct.
> Guided completion: 5/5. Independent instruction chains: 1/3.

Record reading and step durations for inspection, but apply no speed penalty to
reasoning mastery. Do not reuse the arithmetic hint penalty for demonstrations.

Proposed initial support policy, to tune after the pilot:

- Start a new family with a short guided mission; arithmetic mastery never
  automatically grants reasoning mastery.
- Offer less support after at least four first-response successes in the last
  five eligible missions, covering at least two wording variants.
- Suggest more support after two recent independent failures; the child can still
  choose Training support. Never silently replace a question mid-mission.
- Label stable independent performance only with at least ten independent missions
  across two sessions and three wording variants, at 80% or higher accuracy.
  This is a practice heuristic, not a claim of school-level mastery.
- Select practice using the weakest observed relationship and vary the surface
  story. Prevent repeated identical problems and explain the recommendation.

## 6. Architecture and persistence direction

Introduce a discriminated task envelope for arithmetic questions and reasoning
missions. Preserve the existing arithmetic shape behind its own variant and
normalize legacy saved records at read boundaries. Do not add fake `left`, `right`,
or `operation` values to satisfy old APIs.

Proposed mission definition:

- Stable mission/template ID, schema version, generator seed, locale, family,
  parameter snapshot, prompt, and support level.
- Ordered steps with IDs, objective tags, input kind, valid responses, hints,
  feedback, and explicit dependencies.
- Deterministic solution model and final response validation. A card arrangement
  response includes the slots, not only the computed sum.

Proposed evidence records:

- One mission attempt ID, player ID, mode, start/end time, final first-response
  outcome, completion state, and support summary.
- Step responses with step ID, response order, selected value/plan/arrangement,
  correctness, hint level, assistance already shown, and response duration.
- Versioned progress per family and objective, separate from arithmetic pairs.
- Local resumable mission state so refresh does not lose work or count twice.

Phase 1 must settle the exact contracts before implementation. Prefer additive
D1 mission/evidence/progress storage and versioned API payloads; avoid rewriting
legacy arithmetic history. Coordinate deployment so the API supports the new
records before clients send them. Older clients must ignore unsupported records
without losing data. Define forward-compatible hydration and retry behavior.

Reuse input, character, projectile, and reward components. Put mission rendering
and mission state in dedicated modules instead of expanding all reasoning logic
inside `GameScreen.tsx`.

## 7. Implementation milestones

Complete each milestone's exit criteria before marking it done. Each implementation
PR should link this plan and update the relevant checkboxes and handoff notes.

### M0 — Content specification and baseline

- [x] Draft Vietnamese templates, solution steps, hints, and misconception choices
  for the five original examples in [M0 Teaching Specification](reasoning-missions-content.md).
- [ ] Complete parent review of Vietnamese wording and teaching clarity.
- [x] Define easy prerequisites and independent transfer variants for each family.
- [x] Sketch the question panel, step choices, explanation, and card placement for
  phone, desktop, and controller input.
- [ ] Establish a short baseline: ask the child to interpret and plan easy problems
  before calculating; record where assistance is needed.

Exit: implementers have a concrete teaching flow and the parent has baseline
observations. Parent/child observations are recorded when available; do not
invent them or block unrelated engineering work while waiting for them.

### M1 — Task contracts, mission engine, and compatible storage

- [ ] Finalize task envelope, mission/step contracts, response types, and evidence
  aggregation; define how legacy arithmetic records are normalized.
- [ ] Add deterministic instruction-chain generation and independent validation.
- [ ] Add mission-specific hints and meaningful, unique distractors.
- [ ] Implement resumable local mission state, evidence storage, sync payloads,
  additive D1 migration, API validation, and idempotent submission.
- [ ] Add per-child reasoning settings and versioned progress hydration; existing
  children begin with reasoning disabled until the parent opts in.
- [ ] Verify older profiles, queued arithmetic attempts, and disabled skill
  preferences still load and behave correctly.

Exit: one mission can be generated, answered, saved offline, synced, and restored
without affecting arithmetic history or scoring.

### M2 — Complete instruction-chain Training pilot

- [ ] Implement mission panel, guided and independent modes, progressive hints,
  retry feedback, and explicit advancement.
- [ ] Reuse elemental feedback and support touch, keyboard, and Xbox navigation.
- [ ] Add Training entry and parent enable/focus controls for the pilot family.
- [ ] Show vocabulary/plan evidence, assistance, and independent outcomes in the
  parent dashboard; include insufficient-data states.
- [ ] Ship changed wording and parameter variants, including the original example.
- [ ] Run the engineering checks and a parent/child pilot; record observations and
  adjust confusing wording or interaction before expanding content.

Exit: the complete loop is usable end to end, and the dashboard can distinguish
an observed vocabulary mistake from an observed plan or calculation mistake.

### M3 — Daily collection and unknown-start stories

- [ ] Add daily collection models, repeated-addition variants, and distractors for
  missed days or omitted starting amounts.
- [ ] Add unknown-start stories, dozens vocabulary, rewind visuals, and alternative
  valid addition plans.
- [ ] Add prerequisite checks for arithmetic above 20 and family-specific support.
- [ ] Extend the same storage, evidence, parent focus, and independent practice
  pipeline; avoid a second parallel implementation of the mission loop.

Exit: all three story/instruction families work in Training, including the original
answers 13, 15, and 48, and school-style text can be attempted without visuals.

### M4 — Sequence and digit-card puzzles

- [ ] Add explicit term numbering, growing-gap models, and sequence-rule hints.
- [ ] Add select-then-place digit slots, no-card-reuse validation, reset/undo, and
  accessible controller focus behavior.
- [ ] Compute the maximum independently by enumerating valid arrangements; accept
  all arrangements achieving it.
- [ ] Integrate family/objective evidence and independent transfer variants.

Exit: the seventh term is validated as 42 under the declared rule, and every
valid maximum-sum arrangement for the original cards is accepted as 95.

### M5 — Adaptive integration, Adventure, and Challenge

- [ ] Implement and calibrate support fading and objective-aware selection using
  the pilot evidence; document any threshold changes here.
- [ ] Add parent-controlled Adventure inclusion. Suggested initial mix: at most
  one reasoning mission per five daily arrows, with adjustable reasoning-focused
  Training available. This is a default to evaluate, not a required quota.
- [ ] Integrate one-arrow/one-reward completion and interrupted-mission recovery.
- [ ] Add independent Challenge missions without hints or time pressure.
- [ ] Confirm disabled families never enter selection and all-disabled reasoning
  falls back to the existing arithmetic experience.
- [ ] Keep arithmetic and reasoning summaries separate in dashboard comparisons
  and recommendations, with counts and transparent reasons.

Exit: all modes use the same mission contracts, preferences, and durable evidence;
daily limits and progression count completed missions exactly once.

### M6 — Release validation and learning review

- [ ] Run applicable engine/API/web tests, type checks, lint, and production build.
- [ ] Check migration and legacy profile hydration; refresh mid-mission, offline
  completion, retry, duplicate submission, and cross-device child preferences.
- [ ] Check phone layout and readable Vietnamese text; touch, keyboard, and Xbox
  controller completion for every interaction type.
- [ ] Review all five original questions and representative generated variants.
- [ ] Observe independent transfer to new school-style wording over at least two
  sessions; compare with the baseline and document remaining difficulty.
- [ ] Update user-facing docs, record release details, and leave a concrete handoff
  for any remaining work. Deploy using the existing repository workflow.

Exit: engineering acceptance passes and learning observations are documented.
If observations are unavailable, label learning validation pending; do not claim
that the child has improved solely because the software passes tests.

## 8. Verification priorities

Add tests for behavior with meaningful failure consequences:

- Generated answers, step dependencies, unique choices, bounded quantities, and
  deterministic replay across a representative seed set.
- Phrase interpretation and plan validation; alternatives such as reordered
  add-backs and multiple optimal card arrangements.
- No premature answer disclosure in independent mode; assistance and first-response
  outcomes stay accurate after retries and hints.
- Reasoning durations and demonstrations do not lower arithmetic or reasoning
  mastery; only supported objective evidence updates a dimension.
- Legacy record compatibility, server validation, idempotent completion, and
  resume/sync without duplicated arrows, rewards, or progress.
- Family toggles, child isolation, and accessible step/card navigation.

Use manual review for Vietnamese clarity, explanatory visuals, and the child's
experience. Passing automated tests does not verify those learning outcomes.

## 9. Definition of done

- [ ] All five families support guided, independent, and transfer practice.
- [ ] The original examples produce 13, 15, 48, 42, and 95 with reviewed explanations.
- [ ] A child can identify quantities and choose steps before calculating; support
  can fade without removing the original Vietnamese question.
- [ ] Parent insights distinguish observed interpretation, planning, and calculation
  evidence, assisted completion, and independent task success.
- [ ] Reasoning has no fluency-speed penalty and cannot corrupt arithmetic progress.
- [ ] Offline persistence, cross-device preferences, input support, daily limits,
  rewards, and legacy compatibility meet the milestone checks.
- [ ] Release checks pass; baseline and transfer observations are recorded, or the
  learning review is explicitly marked pending.

## 10. Deferred enhancements and open decisions

Deferred: Vietnamese read-aloud, broad multiplication/division curriculum,
additional sequence families, parent-authored questions, and new RPG content.
These are not prerequisites for completing this plan.

Decisions to settle during their implementation milestone:

| Decision | Current direction | Settle in |
| --- | --- | --- |
| Exact task/API schema and compatibility boundaries | Discriminated tasks, additive mission records, legacy normalization | M1 |
| Evidence thresholds and support fading | Conservative independent evidence; no speed penalty | M2 pilot, M5 calibration |
| Adventure frequency | Parent opt-in; initially at most one mission per five arrows | M5 |
| Read-aloud implementation | Optional later enhancement; core offline flow first | Follow-up |

## 11. Progress and handoff log

Update this section after each milestone with the implementation commit/PR,
checks run, concrete observations, unresolved issues, and next unchecked task.
Keep completed work checked; revise decisions when evidence changes the plan.

| Date | Milestone | Result / evidence | Next action |
| --- | --- | --- | --- |
| 2026-10-05 | Planning | Repository inspected; parent reports strong calculation and difficulty with wording/planning. No implementation or child pilot completed. | M0 content specification, then M1 contracts and persistence. |
| 2026-10-05 | M0 content draft | Teaching specification added for all five families with checked answers, hint ladders, candidate misconceptions, transfer variants, and interaction sketches. Parent review and child baseline remain pending. | M1 instruction-chain task contracts and persistence; gather baseline observations when available. |
