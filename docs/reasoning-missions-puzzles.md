# M4 Sequence and digit-card puzzles

Status: engineering implemented and verified. Parent review of the new Vietnamese
wording and the child pilot remain pending. Nothing has been deployed.

M4 adds the last two families, `growing_gap_sequence` and `max_sum_digit_cards`, to the
existing mission loop. They use the same attempt ledger, offline queue, API, D1
table, parent panel, and Training screen as the earlier families. No D1 migration is
needed: the ledger stores the mission definition, and the card arrangement is stored in
the response's existing `choiceId`.

## Shared changes

- `MissionFamily` now has five values and `MISSION_FAMILIES` lists them in order, so
  existing `enabledFamilies` settings stay valid. The API validates settings through
  the same engine function, so it accepts the new families without an API change.
  Deploy the API before clients, as in earlier milestones.
- `MissionStep` gains optional `input: 'choice' | 'cards'` and `cards` (the bank).
  A `cards` step has no `choices`. `getMissionView` returns `input` and `cards` for
  that step only; the choice steps' view is unchanged. The bank is already in the
  problem text, and the view still never returns `correctChoiceId`,
  `acceptedChoiceIds`, or any total.
- `recordMissionResponse` accepts a card arrangement as the response to a `cards`
  step: `choiceId` is `cards:<slot1>-<slot2>-<slot3>-<slot4>`, for example
  `cards:5-3-4-2`. Slots are first-number tens, first-number units, second-number
  tens, second-number units. The engine rejects any id that is not four distinct
  digits from the bank, so a card cannot be reused or invented. The response is
  correct when the arrangement is in `acceptedChoiceIds`. Because the API and the
  browser both replay ledgers through the engine, they validate arrangements with
  no separate code, and a forged "correct" arrangement is rejected.
- Both new templates are frozen once released: change content in a new version.
- New objectives: `term_position`, `gap_observation`, `extend_rule`, `place_value`,
  `choose_cards`, `tens_placement`, `maximize_sum`. Number-valued final steps still use
  `calculation` and `calculation_over_20`. The parent panel has a label for each.

## Growing-gap sequences (`growing_gap_sequence_v1`)

Original: 0; 2; 6; 12; 20; … → the seventh term is **42**.
Parameters: `{ first, firstGap, gapStep, shown, target }`. Gap k (term k to term k + 1) is
`firstGap + (k − 1) × gapStep`, so the original is `{ 0, 2, 2, 5, 7 }`: gaps +2, +4, +6,
+8, +10, +12.

**No prompt states the rule, in kind or in number**: a sentence such as “mỗi bước tăng
nhiều hơn bước trước một số đơn vị không đổi” tells the child what to look for and removes
the thinking. The child works out the increase from the listed gaps. Four to five listed
terms give three to four gaps, enough to read the increase and check it. The school
wording is the original sentence alone (“Viết số thứ 7 vào dãy số có quy luật sau: 0; 2;
6; 12; 20; …”). The plain wording is “Các số đầu là 3; 5; 9; 15; 23. Số ở vị trí thứ 7 là
số nào?” → 45. The first hint and the step feedback also leave the increase unnamed; only
the worked hint spells it out.

| Stage      | Range                                                                            |
| ---------- | -------------------------------------------------------------------------------- |
| `easy`     | start 0–9, first gap 1–3, gap step 1–3, 4–5 terms listed, one term past the list |
| `standard` | start 0–20, first gap 1–4, gap step 1–4, 4–5 listed, one or two terms past       |

Every term is within 99: the start is capped by the total of the gaps. The increase varies
across missions; only the parent's original (0; 2; 6; 12; 20) uses 2.

Guided steps (independent shows only the last):

1. `term_position` — “Trong dãy này, 20 là số thứ mấy?” → 5. Distractors: 4 (counting from
   zero), 6, and 20 (the value instead of the position).
2. `observe_gap` — “Từ 12 đến 20 tăng thêm bao nhiêu?” → 8. Distractors: the first gap,
   the gap before, the value, one gap too far.
3. `next_gap` — “Các bước tăng là 2, 4, 6, 8. Bước tăng tiếp theo là bao nhiêu?” → 10.
   Distractors: repeat 8, restart at 2, skip to 12.
4. `next_term` — only when two terms are asked for: the sixth term, 30.
5. `final` — the target term. Distractors: stop at the earlier term (30), repeat the
   previous gap (40), repeat the last listed gap (36), the gap itself.

The diagram numbers every term: `Thứ 1: 0 | Thứ 2: 2 (+2) | … | Thứ 6: ? (+□) | Thứ 7: ? (+□)`.
The listed terms and their gaps are visible; the missing terms and gaps stay blank until
the matching step is answered, and independent mode has no diagram. Hints: look at the gaps,
then the numbered table with blanks, then the worked extension.

## Maximum sum from digit cards (`max_sum_digit_cards_v1`)

Original: cards 3, 2, 5, 4, 1; use four once each for two two-digit numbers → **95**.
Parameters: `{ name, cards }`, four or five distinct digits 1–9, in listed order. No zero.
A card set is rejected unless its best total is within 99. Among five distinct positive
digits, only 1–5 qualifies, so five-card missions are shuffled orderings of 1–5; the
four-card sets are drawn from 1–9.

| Stage      | Cards                                               |
| ---------- | --------------------------------------------------- |
| `easy`     | four cards from 1–5, all used, no discard decision  |
| `standard` | five cards 1–5 (half), else any valid four-card set |

**The maximum is found by trying every arrangement** (at most 120), not by a formula, and
`acceptedChoiceIds` lists _every_ arrangement that reaches it. For 3, 2, 5, 4, 1 that is
53 + 42, 52 + 43, 43 + 52 and 42 + 53. Tests compare this with an independent
enumeration over 1,000 seeds per stage.

Guided steps:

1. `place_value` — “Đặt thẻ 5 ở hàng chục thì thẻ đó có giá trị bao nhiêu?” → 50. Distractors:
   5, 10, 15.
2. `choose_cards` — five cards only: which card to leave out → 1.
3. `tens_cards` — “Hai thẻ nào nên đặt ở hàng chục?” → 5 và 4. Distractors: largest and
   third, second and third, the two smallest.
4. `final` — the `cards` step: place the cards. Independent shows only this step.

The child answers by arranging cards, not by typing the sum. After submitting, feedback
shows the sum for the arrangement (“54 + 32 = 86”), and the completion message shows the
worked solution (“Ví dụ: 53 + 42 = 95”).

### Card board (`DigitCardBoard`)

- Select a card, then select a slot. Selecting a filled slot returns its card to the bank
  and keeps it selected, so the next slot moves it. Placing a card over a filled slot sends
  the old card back. A card in a slot is disabled in the bank, so it cannot be used twice.
- **Bỏ chọn** deselects, **Làm lại** empties the slots, **Xác nhận cách xếp** is enabled only
  with four cards placed. No dragging is needed.
- The board never shows a running sum or the formed numbers.
- Every control is a real button with a label such as “Số thứ nhất, hàng chục: 5” or
  “Thẻ 5, đã đặt”. Tab, Enter/Space, arrow keys and the controller's directions/A use the
  existing focus order (bank, then slots, then the action buttons). The 1–4 answer keys
  do nothing on this step because there are no labelled choices.
- A wrong arrangement is recorded as the first response, feedback explains it, and
  **Tiếp tục** gives a fresh empty board. Hints are available as in other steps.

## Evidence and progress

Both families use the same family and objective counts as the earlier ones, so the parent
panel lists them separately with their own toggles and no blending. `maximize_sum` records
whether the first arrangement was optimal. A correct final arrangement is task success, not
proof that the child understood place value; the earlier `place_value` and `tens_placement`
steps are the evidence for that in guided mode.

## Verification

All 715 tests pass: 322 engine, 63 API, 330 web. Type checks, lint, and the production
build pass. They cover:

- original answers 42 and 95; the reviewed independent (43, 73) and held-out (45) variants;
- independent simulation of each answer for 1,000 seeds × 2 stages, unique in-range choices,
  deterministic replay, and rejection of tampered missions and out-of-range parameters;
- every optimal card arrangement accepted and every other rejected as incorrect, with reused
  cards, cards outside the bank, and malformed ids rejected;
- no solution, total, or accepted list in the independent view; blank-until-answered diagrams;
- ledger replay through the API, including a forged arrangement;
- the card board: select-then-place, take back, move, reset, retry on an empty board, and
  controller operation.

Manual review is still needed for the Vietnamese wording (“bước tăng”, “số thứ”, “hàng chục”,
“Xác nhận cách xếp”) and for how the card board feels on a phone and with the controller.

## Not covered

- Sequences whose rule is not stated, and gaps that shrink or repeat.
- Arithmetic above 99, and the within-110 transfer set (1, 2, 3, 4, 6 → 105) the content
  spec reserves until addition within 110 has been checked.
- Zero or repeated digits.
- Support fading and adaptive selection (M5).
