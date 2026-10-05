# M2 instruction-chain Training pilot

Status: the playable engineering loop is implemented and verified. Parent review,
child baseline observations, and the parent/child pilot remain pending. Nothing
has been deployed by this milestone.

## Entry and practice

Enable **Instruction chains** for a real child in the parent dashboard's
**Reasoning practice** panel. Open **Play → Training → Đọc đề, chọn bước**.
The entry is hidden when the child has not opted in. With an Xbox controller in
Training, press the right stick (RS) to open the activity. Existing arithmetic
skill controls and preferences continue to apply to arithmetic practice.

Choose **Từng bước** or **Tự giải** before starting a mission. The first mission
uses the parent's original 14 / 7 / 9 question. Later missions alternate school
wording and simpler wording with seeded parameter variants (all four number phrases,
“hiệu” and “tổng”, adding or subtracting at the end) within 20. Support is
suggested from the child's evidence and always overridable; see
[M5 Adaptive Practice](reasoning-missions-adaptive.md).

Guided practice asks for the starting number (liền sau, liền trước, or lớn/bé hơn
some units), the “hiệu” or “tổng” expression, the next operation, then the final
answer. Missions are generated from `instruction_chain_v2`; the first one is
still the original 14 / 7 / 9 question. Independent practice shows the full question
and final choices, without the intermediate prompts or solution. Both allow
optional strategy, incomplete-diagram, and worked-solution hints. The full problem
stays visible while answering and reading feedback.

Choices reuse the game's fire, ice, wind, and earth identities. Correct choices
show target feedback; mistakes explain the relevant wording and allow a retry.
**Tiếp tục** advances after each response or hint. Completion shows the worked
chain and offers a new mission. There is no countdown, arrow charge, reward grant,
or arithmetic mastery update.

Touch/click works throughout. Use Tab/Enter or Space for buttons, arrow keys for
focus, and 1–4 for choices. Xbox directions move focus, A activates, and B returns
to arithmetic Training. Keyboard events stay within the panel to prevent the
existing keyboard-to-gamepad bridge from activating the same button twice.
Repeated keyboard activation is ignored; physical controller buttons use the
existing manager's press-edge detection.

## Saved evidence and recovery

Starting a mission, responding, and requesting a hint write to the M1 durable
workspace before feedback or a hint is revealed. Failed storage writes show an
error and leave the current step available to retry. Real browser storage is used
so a write failure cannot silently become a temporary in-memory save.

Reopening the activity resumes the latest unfinished mission for that child.
A reload after a saved correct response resumes the next unanswered step; transient
feedback itself is not part of the learning ledger. Cloud sync runs after saves
and also through App's existing startup/reconnect/focus hydration.

Conflicting histories block this activity and direct the parent to the recovery
panel. Unsupported or corrupt workspaces are preserved and blocked. Parent
progress uses the same mission evidence summaries: first responses, observed
vocabulary and planning objectives, help/corrections, and independent outcomes.
Independent final answers do not imply mastery of the hidden intermediate steps.

## Verification

All 628 tests pass: 261 engine, 60 API, and 307 web. New interaction tests cover
explicit advancement, full-question visibility, guided versus independent evidence,
wrong-first-response preservation, saved progressive hints, reload recovery,
response/hint write failures, unsupported workspace preservation, conflict
blocking, keyboard/controller focus, opt-in entry, and returning to Training.
The existing Worker/D1 sync integration also passes. Type checks, changed-file
lint, and production frontend/PWA build pass. Physical device testing and child
observations have not been collected.

## Parent/child observation still to do

1. Before explanations, let the child attempt one school-worded problem. Record
   what he thinks “số liền sau”, “hiệu”, and “rồi” mean, without supplying answers.
2. Try a guided problem. Note the first selected choice at each step and whether
   feedback or a hint actually resolves the confusion.
3. Try an independent problem with new numbers and wording. Observe whether he
   constructs the plan himself, rather than repeating the previous answer.
4. Check reading comfort and choice selection on the child's normal device. Try
   controller navigation if that is how he plays. Record any accidental action,
   confusing label, or need for an adult to navigate.
5. Compare these observations with the separate reasoning counts in the parent
   dashboard. Add observations to the M0 sheet in
   [Teaching Specification](reasoning-missions-content.md), then adjust wording or
   interaction as needed before treating M2 as complete.

M3 daily collection and unknown-start stories now use this loop: enable them in the
same parent panel and choose the type in Training. See
[M3 Stories](reasoning-missions-stories.md). The M4 growing-gap sequence and digit-card
families use it too, with a card-placement board for the digit-card step; see
[M4 Puzzles](reasoning-missions-puzzles.md). Next: M5 adaptive integration.
