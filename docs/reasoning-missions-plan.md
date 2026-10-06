# Math Archer — Reasoning Missions Plan

Created: 2026-10-05  
Status: M0–M4 engineering implemented; M5 engineering built (support fading, focus, Adventure missions with one-arrow completion, independent Challenge missions, disabled-family fallback, separated dashboard counts); threshold calibration needs the pilot, and M6 and the learning pilot remain.  
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

| Foundation                                                       | Relevant code                                                      | Consequence for this expansion                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Seven arithmetic skills                                          | `packages/learning-engine/src/curriculum.ts`                       | Add a separate reasoning catalog and explicit integration; adding IDs alone is insufficient.             |
| Questions contain two operands and one add/subtract operation    | `packages/learning-engine/src/questions/types.ts`                  | Model missions as structured problems with steps; do not disguise them as one arithmetic expression.     |
| Strategy, partial, and full explanation hints                    | `packages/learning-engine/src/teaching/hints.ts`                   | Reuse the support progression, with family-specific content.                                             |
| Adventure, Training, Challenge and controller input              | `apps/web/src/components/GameScreen.tsx`                           | Pilot in Training and reuse the answer/input experience.                                                 |
| Mastery includes a penalty for answers slower than six seconds   | `packages/learning-engine/src/skills/profile.ts`                   | Reasoning needs its own scoring; reading and thinking time must not reduce mastery.                      |
| Arithmetic attempts update operand-pair progress                 | `packages/learning-engine/src/skills/recordAttempt.ts`             | Mission evidence must not create invented arithmetic pairs or inflate arithmetic mastery.                |
| Local history, offline sync, API attempts, and D1 skill progress | Engine history/storage, `apps/web/src/sync/`, `apps/api/src/db.ts` | Extend the complete persistence path, including retries and profile hydration.                           |
| Per-child skill switches and animation speed                     | `apps/web/src/skillPreferences.ts`, API child profile types        | Reasoning preferences must sync; explanation advancement must be explicit regardless of animation speed. |

Follow the existing characters, visual themes, and rewards. A new world or a new
RPG progression is not required to teach these skills.

## 3. Content scope: all five families

| Family / proposed ID                                 | School example and checked answer                                              | Main reasoning objectives                                                 | Guided interaction                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Daily collection / `daily_collection`                | 8 cards, one more each day for five days: **13**                               | Identify starting amount, repeated change, duration, and requested total. | Starting pile and five day slots; later choose the calculation.          |
| Instruction chains / `instruction_chain`             | Difference of 14 and the successor of 7, then add 9: **15**                    | Interpret “hiệu”, “số liền sau”, “rồi”; preserve dependencies.            | Successor 7 → 8; 14 − 8 → 6; 6 + 9 → 15.                                 |
| Unknown starting amount / `unknown_start`            | After eating 4 and giving away a dozen, 34 remain: **48**                      | Interpret “1 chục”, “còn lại”, “lúc đầu”; reverse gains and losses.       | Rewind 34 → 44 → 48; also accept 34 + 4 + 10; later stories mix + and −. |
| Growing-gap sequences / `growing_gap_sequence`       | Seventh term of 0; 2; 6; 12; 20; …: **42** under gaps +2, +4, +6, +8, +10, +12 | Distinguish term position from value; infer and extend changing gaps.     | Numbered stepping stones and spaces for gaps; sixth term 30, seventh 42. |
| Maximum sum from digit cards / `max_sum_digit_cards` | Cards 3, 2, 5, 4, 1; use four once each for two two-digit numbers: **95**      | Choose cards, use place value, optimize the total.                        | Two tens slots and two units slots; 5 and 4 in tens, 3 and 2 in units.   |

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
- Finite sequences admit multiple rules. Validate against one intended growing-gap
  rule (the gap grows by a constant amount, which varies between missions), but do not
  state it in the prompt: the child infers it from the listed gaps. See
  [M4 Puzzles](reasoning-missions-puzzles.md).
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

- [x] Implement the versioned task envelope, instruction-chain mission/step contracts,
      response types, first-response evidence summaries, and wrapping of validated legacy
      arithmetic questions. See [M1 Engine Contracts](reasoning-missions-engine.md).
- [x] Finalize versioned server attempt payloads and append-only snapshot behavior.
- [x] Finalize reasoning progress aggregation and browser hydration boundaries.
- [x] Add deterministic instruction-chain generation and independent validation.
- [x] Add mission-specific hints and meaningful, unique distractors.
- [x] Implement resumable local mission state and validated evidence storage,
      including idempotent event retries and assistance tracking.
- [x] Implement additive D1 migration, API validation, and idempotent server
      submission with revision-guarded updates and conflict preservation.
- [x] Implement browser sync payloads, offline queue retries, and conflict recovery.
- [x] Add per-child reasoning settings and versioned progress hydration; existing
      children begin with reasoning disabled until the parent opts in.
- [x] Verify older profiles, queued arithmetic attempts, and disabled skill
      preferences still load and behave correctly.

Exit: one mission can be generated, answered, saved offline, synced, and restored
without affecting arithmetic history or scoring.

Engineering exit verified through the actual Worker/SQLite-backed D1 integration
test and full regression suites. See [M1 Browser Sync and Parent Controls](reasoning-missions-browser.md).
The playable mission interface and child teaching review remain M2/M0 work.

### M2 — Complete instruction-chain Training pilot

- [x] Implement mission panel, guided and independent modes, progressive hints,
      retry feedback, and explicit advancement.
- [x] Reuse elemental feedback and support touch, keyboard, and Xbox navigation.
- [x] Add Training entry and parent enable/focus controls for the pilot family.
- [x] Show vocabulary/plan evidence, assistance, and independent outcomes in the
      parent dashboard; include insufficient-data states.
- [x] Ship changed wording and parameter variants, including the original example.
- [x] Broaden instruction-chain vocabulary beyond “số liền sau”: add “số liền
      trước”, “số lớn/bé hơn … đơn vị”, “tổng”, and subtracting final steps as
      `instruction_chain_v2`; Training generates v2 only. See
      [M1 Engine Contracts](reasoning-missions-engine.md).
- [ ] Run the engineering checks and a parent/child pilot; record observations and
      adjust confusing wording or interaction before expanding content.

Engineering verification is complete (including the v2 vocabulary broadening); the parent/child observation remains pending.
See [M2 Training Pilot](reasoning-missions-training.md) for entry, behavior, and the
short observation procedure.

Exit: the complete loop is usable end to end, and the dashboard can distinguish
an observed vocabulary mistake from an observed plan or calculation mistake.

### M3 — Daily collection and unknown-start stories

- [x] Add daily collection models, repeated-addition variants, and distractors for
      missed days or omitted starting amounts.
- [x] Add unknown-start stories, dozens vocabulary, rewind visuals, and alternative
      valid addition plans.
- [x] Broaden unknown-start stories (`unknown_start_v2`): two or three events, each a gain
      or a loss in any order, so the child must choose to add back or take away per
      event. v1 (two losses) is frozen and still validates.
- [x] Add prerequisite checks for arithmetic above 20 and family-specific support.
      Implemented as a separate `calculation_over_20` objective and staged ranges, not
      a standalone quiz; see [M3 Stories](reasoning-missions-stories.md).
- [x] Extend the same storage, evidence, parent focus, and independent practice
      pipeline; avoid a second parallel implementation of the mission loop.

Exit: all three story/instruction families work in Training, including the original
answers 13, 15, and 48, and school-style text can be attempted without visuals.

Engineering exit verified; parent wording review and the child pilot remain pending.
See [M3 Stories](reasoning-missions-stories.md).

### M4 — Sequence and digit-card puzzles

- [x] Add explicit term numbering, growing-gap models, and sequence-rule hints.
- [x] Add select-then-place digit slots, no-card-reuse validation, reset/undo, and
      accessible controller focus behavior.
- [x] Compute the maximum independently by enumerating valid arrangements; accept
      all arrangements achieving it.
- [x] Integrate family/objective evidence and independent transfer variants.

Exit: the seventh term is validated as 42 under the declared rule, and every
valid maximum-sum arrangement for the original cards is accepted as 95.

Engineering exit verified; parent wording review and the child pilot remain pending.
See [M4 Puzzles](reasoning-missions-puzzles.md).

### M5 — Adaptive integration, Adventure, and Challenge

- [x] Implement support fading and objective-aware focus in Training with the
      section 5 thresholds (`ADAPTIVE_POLICY`); advice is shown with its evidence and
      the child can always choose otherwise. See [M5 Adaptive Practice](reasoning-missions-adaptive.md).
- [ ] Calibrate those thresholds using the pilot evidence; document any change here.
- [x] Add the parent-controlled Adventure setting and cadence policy: an optional
      `adventureEnabled` flag in `ReasoningSettings` (absent = off, no migration) and
      `shouldOfferAdventureMission` (at most one mission per five Adventure arrows, never
      with all families disabled). Suggested initial mix: a default to evaluate, not a
      required quota; adjustable reasoning-focused Training remains available. See
      [M5 Adaptive Practice](reasoning-missions-adaptive.md).
- [x] Offer missions in Adventure using that policy: at a question boundary the app opens
      a mission screen (family from `chooseAdventureMission`, suggested support the child
      can change, **Để sau** to decline). An interrupted Adventure mission is offered again
      on return. See [M5 Adaptive Practice](reasoning-missions-adaptive.md).
- [x] Integrate one-arrow/one-reward completion and interrupted-mission recovery: a
      completed Adventure mission spends exactly one arrow and pays exactly one reward
      (`spendMissionArrow` / `completeAdventureMission`), locally and on the server;
      steps, hints and retries cost nothing; refresh, resume and offline sync never
      charge twice.
- [x] Add independent Challenge missions without hints or time pressure: `MissionMode`
      `challenge` (independent support only, hints refused by the engine and the server),
      reached from Training's **Thử thách suy luận** button; no arrow, no reward, no timer,
      neutral retry feedback. See [M5 Adaptive Practice](reasoning-missions-adaptive.md).
- [x] Confirm disabled families never enter selection and all-disabled reasoning
      falls back to the existing arithmetic experience: family choice, focus, Training
      and Adventure use only enabled families, and `getResumableMission` takes the enabled
      families so a paused mission in a since-disabled family is neither resumed nor
      re-offered (its evidence stays saved). With none enabled, Adventure and Training show
      no reasoning entry, even with a paused mission. See
      [M5 Adaptive Practice](reasoning-missions-adaptive.md).
- [x] Keep arithmetic and reasoning summaries separate in dashboard comparisons
      and recommendations, with counts and transparent reasons: arithmetic accuracy,
      operation comparison and recommendations read arithmetic attempts only;
      `today.missionArrows` counts mission arrows inside the daily total and the dashboard
      says so. Session hits no longer stand in for arithmetic accuracy on a day that
      included missions. See [M5 Adaptive Practice](reasoning-missions-adaptive.md).

Exit: all modes use the same mission contracts, preferences, and durable evidence;
daily limits and progression count completed missions exactly once.

### M6 — Release validation and learning review

- [x] Run applicable engine/API/web tests, type checks, lint, and production build.
      Passed on 2026-10-06 (351 engine / 68 API / 352 web tests; type checks, lint, format
      and build). Re-run before release if code changes.
- [x] Check migration and legacy profile hydration; refresh mid-mission, offline
      completion, retry, duplicate submission, and cross-device child preferences.
      Checked through automated tests only (see the 2026-10-06 log entry); no real-browser or
      two-device run yet.
- [ ] Check phone layout and readable Vietnamese text; touch, keyboard, and Xbox
      controller completion for every interaction type.
      Headless-browser pass done (see the 2026-10-06 log entry); a real phone, a real
      controller and a child's reading of the text are still unchecked.
- [x] Review all five original questions and representative generated variants.
      Programmatic review only: answers, choices and step flow (details in the log); the
      parent's reading of the Vietnamese wording is still the open M0 item.
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

| Decision                                           | Current direction                                                   | Settle in                |
| -------------------------------------------------- | ------------------------------------------------------------------- | ------------------------ |
| Exact task/API schema and compatibility boundaries | Discriminated tasks, additive mission records, legacy normalization | M1                       |
| Evidence thresholds and support fading             | Conservative independent evidence; no speed penalty                 | M2 pilot, M5 calibration |
| Adventure frequency                                | Parent opt-in; initially at most one mission per five arrows        | M5                       |
| Read-aloud implementation                          | Optional later enhancement; core offline flow first                 | Follow-up                |

## 11. Progress and handoff log

Update this section after each milestone with the implementation commit/PR,
checks run, concrete observations, unresolved issues, and next unchecked task.
Keep completed work checked; revise decisions when evidence changes the plan.

| Date       | Milestone                                      | Result / evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Next action                                                                                                                                                                                             |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-05 | Planning                                       | Repository inspected; parent reports strong calculation and difficulty with wording/planning. No implementation or child pilot completed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | M0 content specification, then M1 contracts and persistence.                                                                                                                                            |
| 2026-10-05 | M0 content draft                               | Teaching specification added for all five families with checked answers, hint ladders, candidate misconceptions, transfer variants, and interaction sketches. Parent review and child baseline remain pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | M1 instruction-chain task contracts and persistence; gather baseline observations when available.                                                                                                       |
| 2026-10-05 | M1 engine foundation                           | Versioned instruction-chain generation, views/hints, validated local resume, first-response evidence, and retry handling implemented. Engine suite: 257 tests pass, including 20 mission tests and 1,000 generated mission seeds. Engine type check and changed-file lint pass. M1 is not complete.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Add D1/API mission persistence, offline sync, opt-in preferences, and reasoning progress hydration before the M2 UI pilot.                                                                              |
| 2026-10-05 | M1 server persistence                          | Additive D1 migration and authenticated save/load/list API implemented. Append-only snapshots preserve stale/conflicting evidence; conditional revision updates handle concurrent writers. API suite: 57 tests pass, including 19 mission tests. API type check and changed-file lint pass. No production deployment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Browser API/offline queue, conflict recovery, opt-in preferences, and reasoning progress hydration.                                                                                                     |
| 2026-10-05 | M1 browser integration complete                | Durable offline queue, paginated hydration, in-flight response preservation, old-API compatibility, shared evidence summaries, opt-in settings, and parent conflict recovery implemented. All 620 tests pass (261 engine / 60 API / 299 web), including actual Worker/D1 sync integration. Type checks, lint, engine build, and web/PWA production build pass. No production deployment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | M2 playable instruction-chain Training pilot; M0 parent review and baseline remain pending.                                                                                                             |
| 2026-10-05 | M2 playable Training engineering               | Opt-in Training entry, guided/independent questions, original example and varied wording/parameters, elemental choices, step feedback, saved hints/responses, explicit continuation, resume, conflict blocking, and keyboard/Xbox input implemented. All 628 tests pass (261 engine / 60 API / 307 web); type checks, lint, and frontend/PWA build pass. No deployment or child observation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Run the documented parent/child pilot and resolve confusing wording or interaction; M3 daily collection and unknown-start follows.                                                                      |
| 2026-10-05 | M2 vocabulary broadening                       | Pilot content was too narrow (only “số liền sau”). Added `instruction_chain_v2`: liền sau/trước, lớn/bé hơn 2–5 đơn vị, “hiệu”/“tổng”, add/subtract final step, new per-relation parent evidence labels and distractors. v1 frozen and still validates. All 641 tests pass (274 engine / 60 API / 307 web); type checks, lint, and production build pass. No deployment; deploy API before clients.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Parent reviews new Vietnamese phrasing (“là k đơn vị”, “hơn/kém”); run the pilot; a second number phrase per chain is not yet supported. M3 daily collection and unknown-start follows.                 |
| 2026-10-05 | M3 daily collection and unknown-start          | `daily_collection_v1` and `unknown_start_v1` on the shared mission pipeline: original answers 13 and 48, repeated addition, “chục”, either add-back order accepted, blank-until-answered day-slot and rewind diagrams, `calculation_over_20` evidence, per-family settings and progress, and a Training family chooser. No migration. All 672 tests pass (293 engine / 62 API / 317 web); type checks, lint, and production build pass. No deployment; deploy API before clients.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Parent reviews the new wording and runs the pilot for all three families; M4 sequence and digit-card puzzles follows.                                                                                   |
| 2026-10-05 | M3 unknown-start broadening                    | Loss-only unknown-start was too narrow. Added `unknown_start_v2`: two or three events, each a gain (được cho thêm, mua thêm, nhặt thêm) or a loss, in any order and any phase, with undo-per-event plans, mixed rewind diagram and hints, and 1–99 bounds at every point. v1 frozen; Training now generates v2 (original answer 48 unchanged). No migration. All tests pass; type checks and lint pass. No deployment; deploy API before clients.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Parent reviews the gain verbs and “thêm lại / bớt đi” wording; a missing middle amount and more than three events are not covered.                                                                      |
| 2026-10-05 | M4 sequence and digit-card puzzles             | `growing_gap_sequence_v1` and `max_sum_digit_cards_v1` on the shared mission pipeline: original answers 42 and 95, declared growing-gap rule in every prompt, numbered-term diagram, brute-force maximum with every optimal arrangement accepted, card arrangement stored in the existing response `choiceId` and replayed by engine/API/browser, select-then-place `DigitCardBoard` with controller and keyboard support, per-family settings and parent evidence. No migration. All 715 tests pass (322 engine / 63 API / 330 web); type checks, lint, and production build pass. No deployment; deploy API before clients.                                                                                                                                                                                                                                                                                                                                                                                                                                 | Parent reviews the new wording and runs the pilot for all five families; M5 adaptive integration, Adventure, and Challenge follows.                                                                     |
| 2026-10-06 | M5 support fading and focus                    | `missions/adaptive.ts`: `recommendSupport` (new family guided; fade to independent after 4 of the last 5 completed missions had every first response correct and unhinted, across 2 wordings; restore guided after 2 consecutive failed independent missions), `summarizeIndependentStability` (10 missions, 2 local-day sessions, 3 variants, 80%), `recommendFocus` (weakest unassisted objective, 3+ observations, at most 70%, enabled families only) and an objective-to-family map checked against every generator. Training pre-selects the suggested support with the evidence, never overrides the child's choice, suggests a focus family, and retries seeds so an already-attempted problem text is not repeated. Thresholds are uncalibrated defaults. No migration or deployment.                                                                                                                                                                                                                                                                | Add parent-controlled Adventure inclusion with one arrow per completed mission; calibrate thresholds after the pilot.                                                                                   |
| 2026-10-06 | M5 Adventure setting and cadence               | Optional `ReasoningSettings.adventureEnabled` (validated by API and browser, preserved when families change, absent = off) with a parent "Include in Adventure" switch confirmed by the server like the family switches, and `missions/adventureMix.ts` (`ADVENTURE_MISSION_INTERVAL` = 5, `shouldOfferAdventureMission`). Adventure does not offer missions yet. No migration or deployment. All tests pass (338 engine / 63 API / 335 web); type checks pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Wire the policy into Adventure with one-arrow/one-reward completion and interrupted-mission recovery; calibrate thresholds after the pilot.                                                             |
| 2026-10-06 | M5 Adventure missions and one-arrow completion | `MissionAttempt.mode` is now `training` or `adventure`. `chooseAdventureMission` picks the weakest-relationship family (else least recently practised) and suggested support; `isAdventureMissionDue` offers a mission every 5 arrows (at least 2 left) or resumes a paused one; `ReasoningTraining` runs with `mode="adventure"`; `spendMissionArrow` charges once per attempt ID (stored session is authoritative), `completeAdventureMission` also pays one `awardAttemptRewards`; the server charges `sessions.arrows_used` on the single transition to completed. Declining or pausing costs nothing. No migration. All tests pass (347 engine / 66 API / 345 web); type checks, lint, format and production build pass. No deployment; deploy API before clients.                                                                                                                                                                                                                                                                                       | Independent Challenge missions; confirm disabled-family fallbacks; separate arithmetic and reasoning dashboard summaries; calibrate thresholds after the pilot.                                         |
| 2026-10-06 | M5 Challenge missions                          | `MissionMode` widened to `challenge`: `startMissionAttempt` accepts only independent missions, `recordMissionHint` refuses hints (so replay, browser restore and the API reject a tampered attempt), and the server never charges an arrow for it. `ReasoningTraining mode="challenge"` hides the support chooser, advice and hint button, gives neutral retry feedback instead of explaining the relationship, shows no timer and pays no arrow or reward; entry is a Training button. Evidence feeds support fading and parent progress like any independent mission. No migration. All tests pass (350 engine / 68 API / 348 web); type checks, lint and format pass. No deployment; deploy API before clients.                                                                                                                                                                                                                                                                                                                                            | Confirm disabled-family fallbacks; separate arithmetic and reasoning dashboard summaries; calibrate thresholds after the pilot.                                                                         |
| 2026-10-06 | M5 disabled fallback and dashboard separation  | `getResumableMission(…, enabledFamilies)` filters paused missions to enabled families (Training resume, Adventure offer and the decline check); with every family disabled the app shows only the arithmetic experience. `TodayDashboardMetrics.missionArrows` (from `DailySession.missionAttemptIds`) is shown beside arrows used; arithmetic accuracy and daily history no longer use session hits on a day with missions, and history no longer adds session hits to attempt hits. Local sessions only: server-hydrated sessions carry no mission IDs, so the count is a floor. No migration. All tests pass (351 engine / 68 API / 352 web); type checks pass. No deployment; deploy API before clients.                                                                                                                                                                                                                                                                                                                                                  | Run the parent/child pilot and calibrate thresholds (M5), then M6 release validation.                                                                                                                   |
| 2026-10-06 | M6 engineering checks                          | Full suite on `main`: 771 tests pass (351 engine / 68 API / 352 web); type checks, ESLint, Prettier and the web/PWA production build all pass. The web bundle is 699 kB (Vite warns above 500 kB), not an error. No code changes, no deployment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Check migration and legacy-profile hydration plus refresh, offline, retry, duplicate and cross-device cases; review the five original questions; manual layout and input checks; learning observations. |
| 2026-10-06 | M6 migration, hydration and sync checks        | Mapped each check to tests: 0006 over a populated legacy DB (`missions.test.ts`), 0007 over existing children (new, `reasoningSettings.test.ts`), refresh/resume and conflicts (`ReasoningTraining`, `sync/missions`), offline queue and retry (`sync/missions`, `missionSyncIntegration`), one arrow per completion however often saved (`missions.test.ts`, `adventureMission.test.ts`), cross-device settings (`reasoningSettings.test.ts`, `activeChildProfileSync`). **Bug found and fixed:** hydration replaced the local daily session with the server one whenever the server's arrow count was equal or higher, dropping `missionAttemptIds` and `missionOfferedAtArrow`, so the Adventure mission cadence reset and a declined offer came back after a reload. Hydration now keeps both fields when the session ID matches (new test in `hydration.test.ts`). Not covered: no real-browser refresh and no two-device run; the server still has no mission bookkeeping, so `missionArrows` stays a floor across devices. No migration or deployment. | Manual phone-layout and input checks; review of the five original questions; learning observations.                                                                                                     |
| 2026-10-06 | M6 original-question review                    | Generated each original (13, 15 in chain v1 and v2, 48 in unknown-start v1 and v2, 42, 95) and read every prompt, step, choice, hint and wrong-answer feedback; all reach the expected answer. A temporary script (not kept) also checked 8,000 generated missions (five families, 400 seeds, school and plain wording, guided and independent): all valid, distinct choice labels, a correct choice in every step, independent view starts at the final step, no answer leaked into an independent prompt. Plan section 3 and a `solveGrowingGapSequence` comment still said the growing-gap rule is stated in the prompt; commit `968d73a` removed that on purpose, so both now say the rule is not stated. Wording for the parent: chain v2 "số lớn hơn 1 là 3 đơn vị" reads awkwardly, and a chain can say "Lấy 1 cộng với số vừa tìm được" with an unrelated 1. No deployment.                                                                                                                                                                           | Manual phone-layout and input checks; parent wording review; learning observations.                                                                                                                     |

| 2026-10-06 | M6 headless layout and input pass | Drove the production build in headless Chrome (a throwaway script in `/tmp`, not kept) with all five families enabled, no cloud API. Every family completed by touch at 360×640, 375×667, 412×915, 768×1024 and 1280×800, by keyboard at 375×667, and by an emulated Xbox pad (fake `navigator.getGamepads`, D-pad focus plus A) at 375×667, including card placement and confirming. No horizontal overflow, nothing outside the viewport, no control under 40 px, no page errors; screenshots read as legible. **Finding:** at 360×640 and 375×667 the original question is off screen once the last choice is in view for four of five families (instruction chains stay in view); at 412×915 it always fits. The plan says to keep the question visible during the mission. Not decided or fixed. Not covered: a real phone, a real controller (emulation only), Vietnamese read by a child, the Adventure and Challenge screens, and the parent dashboard. | Decide whether the question should stay pinned or be collapsible on small phones; real-device and controller check; parent wording review; learning observations. |
