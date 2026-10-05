# Reasoning Missions — M0 Teaching Specification

Date: 2026-10-05  
Status: Initial content and interaction specification; parent/child review pending.  
Implementation checklist: [Reasoning Missions Plan](reasoning-missions-plan.md).

## Shared teaching rules

Keep the original question visible throughout a mission. Guided questions below
are teaching scaffolds; independent and transfer attempts show only the problem
and final response controls until assistance is requested.

Ask about meaning and the solution plan before asking for calculation. On a
mistake, record the first response, explain the relationship, and let the child
try again. Once an explanation reveals a needed result, subsequent success is
assisted. Never score a displayed worked example as independent success.

Each hint ladder has three levels: a conceptual clue, a partial representation,
and a worked explanation. Hints are optional; the worked explanation may reveal
the answer. A correct final answer without observed steps does not establish
mastery of every underlying objective.

Candidate wrong answers below are hypotheses about mistakes, not diagnoses.
Step responses or follow-up practice provide evidence. Shuffle elemental choices;
never associate the correct choice consistently with an element or position.

## 1. Daily collection: `daily_collection`

### Original question

> Hải có 8 thẻ Kun. Mỗi ngày, Hải sưu tầm thêm được 1 thẻ nữa. Hỏi sau 5 ngày, Hải có tất cả bao nhiêu thẻ Kun?

Solution: 8 + 1 + 1 + 1 + 1 + 1 = **13 thẻ Kun**. Starting amount is before
the five collection days; do not count it as day one.

### Guided flow

| Objective | Prompt | Expected response | Other choices / evidence |
| --- | --- | --- | --- |
| Identify starting amount | Trước khi sưu tầm thêm, Hải có mấy thẻ? | 8 | 1, 5, 13: selecting other quantities or the final amount. |
| Interpret repeated change | Sau 5 ngày, Hải sưu tầm thêm được mấy thẻ? | 5 | 1: one day only; 4: missed day; 8: starting amount. |
| Build plan | Muốn biết tất cả số thẻ, con chọn phép tính nào? | 8 + 5 | 8 − 5; 5 − 1; 8 + 1. |
| Calculate | Hải có tất cả bao nhiêu thẻ? | 13 | 9: one day only; 12: missed day; 5: added cards only. |

Hints:

1. “Hải đã có một số thẻ từ trước. Con cần tính cả số thẻ có sẵn và số thẻ sưu tầm thêm.”
2. Show the pile of 8 and five empty day slots. “Mỗi ô là một ngày. Mỗi ngày thêm 1 thẻ.”
3. “Sau 5 ngày, Hải thêm 5 thẻ. Hải có tất cả: 8 + 5 = 13 thẻ.”

Prerequisite: count five events and calculate 8 + 5. First easier variant: 3
cards, one per day for two days → 5. Later repeated-addition variant: 4 cards,
two per day for three days → 10; multiplication notation is unnecessary.

Independent: “Bình có 6 nhãn dán. Mỗi ngày Bình có thêm 1 nhãn dán. Sau 4 ngày,
Bình có tất cả bao nhiêu nhãn dán?” → **10**.

Held-out transfer: “Trong 3 ngày, mỗi ngày An nhặt được 2 viên bi. Trước đó An
đã có 5 viên bi. Bây giờ An có bao nhiêu viên bi?” → **11**.

## 2. Instruction chain: `instruction_chain` — first implementation pilot

### Original question

> Lấy hiệu của 14 và số liền sau của số 7 rồi cộng với 9 thì được kết quả là bao nhiêu?

Solution: successor of 7 is 8; 14 − 8 = 6; 6 + 9 = **15**.

### Guided flow

| Objective | Prompt | Expected response | Other choices / evidence |
| --- | --- | --- | --- |
| Interpret successor | Số liền sau của 7 là số nào? | 8 | 6: predecessor; 7: unchanged; 9: skipped a number. |
| Interpret difference | Hiệu của 14 và 8 được viết như thế nào? | 14 − 8 | 14 + 8; 8 − 14; 14 − 7. |
| Order dependent steps | Sau khi tính 14 − 8, con làm gì tiếp? | Cộng kết quả vừa tìm được với 9 | Trừ kết quả đi 9; cộng 14 với 9; dừng lại. |
| Calculate final result | Kết quả cuối cùng là bao nhiêu? | 15 | 16: use 7 instead of 8; 6: stop early; 23: omit subtraction. |

Hints:

1. “Tìm số liền sau trước. ‘Hiệu’ là kết quả của phép trừ. Từ ‘rồi’ cho biết bước tiếp theo.”
2. Show `7 → □`, `14 − □ = △`, `△ + 9 = ?`. Ask the child to fill the
   first blank; do not prefill all the intermediate results.
3. “Số liền sau của 7 là 8. Hiệu của 14 và 8 là 6. Cộng 6 với 9 được 15.”

Prerequisites: successor/predecessor on a number line, subtraction within 20,
addition within 20. Easy introduction: successor of 3, then 9 − 4, then +2 → 7.
Teach one term at a time before combining vocabulary and dependent steps.

Independent: “Lấy hiệu của 12 và số liền sau của 5 rồi cộng với 4.” → **10**.

Held-out transfer: “Tìm số ngay sau 8. Lấy 16 trừ đi số vừa tìm được, sau đó
thêm 5 vào kết quả. Em được số nào?” → **12**.

Vocabulary variants, implemented as `instruction_chain_v2`. The guided flow is
the same four steps, with the first two adapted to the phrase:

| Phrase | Example and answer | Typical distractors for the number step |
| --- | --- | --- |
| số liền sau | Lấy hiệu của 14 và số liền sau của số 7 rồi cộng với 9 → **15** | 6 (trước), 7, 9 |
| số liền trước | Lấy tổng của 6 và số liền trước của số 5 rồi trừ đi 3 → **7** | 6 (sau), 5, 3 |
| số lớn hơn … đơn vị | Lấy hiệu của 14 và số lớn hơn 7 là 3 đơn vị rồi cộng với 9 → **13** | 4 (sai hướng), 8 (xem như liền sau), 11 |
| số bé hơn … đơn vị | Lấy tổng của 5 và số bé hơn 9 là 2 đơn vị rồi trừ đi 4 → **8** | 11 (sai hướng), 8, 6 |

“Tổng” uses the “Tổng của 6 và 4 được viết như thế nào?” step with choices such as
6 + 4 and 6 − 4. The final instruction is “cộng với” or “trừ đi”. Plain wording:
“số ngay sau/trước N”, “số hơn N là k đơn vị”, “số kém N là k đơn vị”.
Teach one term at a time before combining vocabulary and dependent steps.
**Parent review pending** for the “là k đơn vị” and “hơn/kém” phrasing.

## 3. Unknown starting amount: `unknown_start`

### Original question

> Sau khi Mai ăn hết 4 cái kẹo và cho em gái 1 chục cái kẹo thì Mai còn lại 34 cái kẹo. Hỏi lúc đầu Mai có tất cả bao nhiêu cái kẹo?

Solution: 1 chục = 10; restore both removed amounts: 34 + 10 + 4 =
**48 cái kẹo**. Adding 4 first is equally valid.

### Guided flow

| Objective | Prompt | Expected response | Other choices / evidence |
| --- | --- | --- | --- |
| Interpret dozen | 1 chục cái kẹo là bao nhiêu cái kẹo? | 10 | 1, 12, 20: unit interpretation. |
| Identify the unknown | Bài toán hỏi số kẹo vào lúc nào? | Lúc đầu, trước khi ăn và cho em | Sau khi ăn và cho em; chỉ sau khi ăn; chỉ sau khi cho em. |
| Reverse changes | Muốn tìm số kẹo lúc đầu, con chọn cách nào? | Thêm lại 4 cái đã ăn và 10 cái đã cho | Bớt tiếp cả hai; thêm lại 4 thôi; thêm lại 10 thôi. |
| Calculate | Lúc đầu Mai có bao nhiêu cái kẹo? | 48 | 20: subtract both again; 38: omit the gift; 44: omit the eaten candies. |

Hints:

1. “34 là số kẹo còn lại sau hai việc. Muốn tìm lúc đầu, hãy nghĩ cách đưa số kẹo đã mất trở lại.”
2. Show `Lúc đầu: ? → ăn 4 → cho 10 → còn 34`, then offer backward arrows.
3. “Thêm lại 10 cái đã cho: 34 + 10 = 44. Thêm lại 4 cái đã ăn: 44 + 4 = 48.”

Prerequisites: addition of tens and units within 100 and interpreting a missing
starting amount. Start with one loss: after giving 2, 5 remain → 7. Then two
small losses: after using 2 and giving 3, 6 remain → 11. Introduce “1 chục”
separately before combining it with reverse reasoning.

Independent: “Lan cho bạn 3 nhãn dán và dùng 2 nhãn dán. Lan còn 7 nhãn dán.
Lúc đầu Lan có bao nhiêu nhãn dán?” → **12**.

Held-out transfer: “Trong hộp còn 23 viên bi. Trước đó Nam lấy ra 5 viên và
cho bạn 1 chục viên. Trước hai việc ấy, hộp có bao nhiêu viên bi?” → **38**.

## 4. Growing-gap sequence: `growing_gap_sequence`

### Original question

> Viết số thứ 7 vào dãy số có quy luật sau: 0; 2; 6; 12; 20; …

Intended rule: gaps are consecutive positive even numbers. Continue +10, +12,
giving term 6 = 30 and term 7 = **42**. This is one specified rule, not a claim
that a finite list uniquely determines its continuation.

### Guided flow

| Objective | Prompt | Expected response | Other choices / evidence |
| --- | --- | --- | --- |
| Term position | Trong dãy này, 20 là số thứ mấy? | 5 | 4: count from zero; 6: off by one; 20: confuse position with value. |
| Observe gaps | Từ 12 đến 20 tăng thêm bao nhiêu? | 8 | 2: assume fixed gap; 6: reuse previous gap; 20: select value. |
| Extend rule | Các bước tăng là 2, 4, 6, 8. Bước tăng tiếp theo là bao nhiêu? | 10 | 8: repeat gap; 2: restart; 12: skip one. |
| Extend two positions | Điền số thứ 6 và thứ 7. | 30, then 42 | Final choices: 42; 30: stop at sixth; 40: repeat +10; 36: repeat +8 twice from 20. |

Hints:

1. “Con thử tính mỗi số hơn số ngay trước nó bao nhiêu. Bài này dùng các bước tăng là số chẵn liên tiếp.”
2. Show numbered terms 1–7 and gap labels +2, +4, +6, +8, blank, blank.
3. “Sau 20, cộng 10 được 30 là số thứ 6. Cộng tiếp 12 được 42 là số thứ 7.”

Prerequisites: numbered positions, subtraction to find gaps, and addition within
100. Teach constant-gap patterns first, then increasing gaps; hold wording simple.

Independent, with rule stated: “Các bước tăng là số chẵn liên tiếp: 1; 3; 7;
13; 21; … Điền số thứ 7.” → **43**.

Held-out transfer, with rule stated: “Mỗi bước tăng nhiều hơn bước trước 2 đơn
vị. Các số đầu là 3; 5; 9; 15; 23. Số ở vị trí thứ 7 là số nào?” → **45**.

## 5. Maximum sum from digit cards: `max_sum_digit_cards`

### Original question

> Hà có 5 thẻ số: 3, 2, 5, 4, 1. Hà chọn 4 thẻ số để lập thành 2 số có hai chữ số và cộng chúng lại với nhau. Hỏi tổng lớn nhất của hai số Hà lập được là bao nhiêu?

Solution: discard 1; use 5 and 4 in tens and 3 and 2 in units.
Total = 10 × (5 + 4) + (3 + 2) = **95**. This formula is for implementation
validation; child-facing teaching can use tens bundles and units. Accept 53 + 42,
52 + 43, 43 + 52, and 42 + 53.

### Guided flow

| Objective | Prompt | Expected response | Other choices / evidence |
| --- | --- | --- | --- |
| Place value | Đặt thẻ 5 ở hàng chục thì thẻ đó có giá trị bao nhiêu? | 50 | 5, 15, 10: place-value confusion. |
| Choose cards | Muốn tổng lớn nhất, con để lại thẻ nào không dùng? | 1 | 2, 4, 5: omit a larger digit. |
| Optimize tens | Hai thẻ nào nên đặt ở hàng chục? | 5 và 4 | 5 và 3; 4 và 3; 2 và 3. |
| Build and calculate | Hãy xếp 4 thẻ để được tổng lớn nhất. | Any valid arrangement totaling 95 | 94: discard 2; 86: put 3 instead of 4 in tens; 68: keep 5 in units. |

Hints:

1. “Một thẻ ở hàng chục đóng góp nhiều hơn khi ở hàng đơn vị. Hãy dành hai thẻ lớn nhất cho hàng chục.”
2. Label the four slots `Chục | Đơn vị` for each number. Show a ten bundle beside
   each tens slot; invite moving a card and comparing its contribution.
3. “Chọn 5, 4, 3, 2. Đặt 5 và 4 ở hàng chục, 3 và 2 ở hàng đơn vị. Ví dụ: 53 + 42 = 95.”

Prerequisites: tens/units, forming two-digit numbers, and adding two two-digit
numbers within 100. Start with four cards and no discard decision, then five.
There are no zero or duplicate digits in the initial templates.

Independent: use cards **1, 2, 3, 4** with all four required → **73**, e.g.
42 + 31. Use the original five cards in shuffled order for introductory
five-card placement checks, and vary the wording.

Held-out transfer: “Có các thẻ 1, 2, 3, 4, 6. Chọn bốn thẻ, mỗi thẻ dùng một
lần, để làm hai số có hai chữ số. Tổng lớn nhất là bao nhiêu?” → **105**.
Reserve this transfer until arithmetic within 110 has been checked; do not ship
it in the initial within-100 bank. With five distinct positive digits, 1–5 is
the only digit set whose maximum is within 100, so vary wording/order initially
or introduce the four-card variant instead of inventing new within-100 sets.

## Interaction sketches

These are structural sketches, not finished art or runnable UI. The story remains
visible; completed results appear only after the child answers or requests help.

### Phone: guided mission

```text
┌─────────────────────────────────────┐
│ Nhiệm vụ suy luận       [Về luyện tập]│
│ Full Vietnamese problem, wrapping   │
│ across lines without truncation.    │
├─────────────────────────────────────┤
│ Bước 1 / 4                          │
│ Số liền sau của 7 là số nào?         │
│ [🔥 6]                  [❄️ 8]       │
│ [💨 7]                  [🪨 9]       │
│ [Gợi ý]                             │
├─────────────────────────────────────┤
│ After response: short explanation   │
│ [Thử lại] or [Tiếp tục]              │
└─────────────────────────────────────┘
```

On narrow screens, prioritize problem, current step, and response controls.
Decorative character/projectile elements must not hide text. Scroll is allowed;
place focus on the new step heading and avoid unexpected page jumps.

### Desktop: same mission

```text
┌───────────────────────┬────────────────────────────────┐
│ Full problem          │ Character / target             │
│                       │ Current prompt and diagram     │
│ Completed steps       │ Elemental response choices     │
│ (guided only)         │ Hint / feedback / Tiếp tục     │
└───────────────────────┴────────────────────────────────┘
```

Independent view replaces the guided step panel with final response controls.
It must not show the solution chain before a response or hint request.

### Digit-card panel

```text
Thẻ có thể chọn: [3] [2] [5] [4] [1]
                 Chục      Đơn vị
Số thứ nhất:     [   ]     [     ]
Số thứ hai:      [   ]     [     ]
[Bỏ chọn] [Làm lại] [Xác nhận cách xếp]
```

Select a card, then select a destination. Selecting an occupied slot returns
its card to the bank; selecting a placed card permits moving it. Used cards
cannot be placed twice. Independent mode does not display a running sum before
submission, so the interaction does not supply the calculation answer.

### Controller and keyboard acceptance

- Use the existing controller conventions where applicable. Directional inputs
  move visible focus among answers, hints, and continuation controls; activation
  requires an explicit button press.
- Card bank and slots have predictable focus order and clear selected-card state.
  Include card deselection and reset controls; do not require drag gestures.
- Keyboard Tab/Shift+Tab reaches every control; Enter/Space activates the focused
  control. Respect existing arrow-answer shortcuts only when their labels are
  visible and they cannot interfere with slot navigation.
- Focus moves to feedback after submission and to the current prompt after
  continuation. Readable labels identify position, digit, and placement state.
- After a wrong first response, pause for explanation/correction. Never auto-fire
  or auto-advance while a button is held or while feedback is being read.

## Baseline and transfer observation sheet

Status: **Not conducted.** The parent reports strong calculation from current
game results; no new baseline responses have been collected.

Use short sessions and familiar easy arithmetic. Ask the child to explain what
the problem asks and how to find it before calculating. Do not supply the plan.
If reading aloud is needed, read the text without explaining relationships, and
record that support separately. Avoid turning this into a timed test.

Suggested first baseline pair:

1. “An có 4 thẻ. Mỗi ngày An thêm 1 thẻ. Sau 3 ngày An có bao nhiêu thẻ?” → 7.
2. “Lấy hiệu của 9 và số liền sau của 3 rồi cộng với 2.” → 7.

Then, if comfortable: “Mai cho bạn 2 cái kẹo và ăn 1 cái. Mai còn 5 cái.
Lúc đầu Mai có mấy cái?” → 8. Pattern/card baselines can wait for their milestone.

| Date / problem | Read independently or aloud? | What did the child say is asked? | Proposed plan, before help | Calculation | Assistance supplied | Next practice |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | — | — | — | — | — | — |

Repeat with held-out wording after practice, preferably across two sessions.
Keep baseline and transfer items out of the immediately preceding guided bank.
Record observations literally rather than assigning a cause from the final answer.

## M0 review and next handoff

Completed here: initial Vietnamese teaching flows for all five original examples,
checked solutions, candidate misconceptions, hint ladders, prerequisites,
independent/transfer variants, and phone/desktop/controller interaction sketches.

Pending: parent review of wording and baseline observations. This document is
an implementable draft, not evidence that the teaching has succeeded with the child.

Next engineering milestone: M1 task contracts and compatible persistence. Begin
with `instruction_chain` and the exact pilot above; follow the roadmap's schema,
storage, validation, sync, and legacy-compatibility exit criteria before M2 UI work.
