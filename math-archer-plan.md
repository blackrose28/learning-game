# Math Archer — Development Plan

## 1. Project Goal

Build a small, fun math game for a child to practice:

- Addition and subtraction.
- Numbers around the 10–20 range.
- The "make 10" / carry-over concept.
- Eventually, subtraction across 10.
- Automatic practice adaptation based on actual mistakes and response time.

The game presents the child as an archer. Each question has four elemental arrows:

- 🔥 Fire
- ❄️ Ice
- 💨 Wind
- 🪨 Earth

Each arrow contains a possible answer. Exactly one is correct.

The child receives **50 arrows per day**.

The system records attempts and builds a skill profile so a parent can see:

- Overall accuracy.
- Addition vs subtraction performance.
- Specific weak number combinations.
- Common wrong-answer patterns.
- Response time.
- Hint usage.
- Progress over time.

The primary target is a **web/PWA application** that works on:

- Android phone.
- Tablet.
- Desktop browser.
- Xbox Series S through Edge, with controller-friendly input.

Roblox can be considered later as an alternative game client, not as the initial implementation.

---

# 2. Product Principles

## 2.1 Game first, test second

The child should feel that they are playing an archery game, not taking a math test.

Avoid exposing too much educational terminology to the child.

Instead of:

> "You have 17 exercises remaining."

Use:

> "🏹 33 arrows left!"

---

## 2.2 Learning engine before RPG complexity

The first version should prove that the game can actually improve math skills.

Do not spend the first milestone building:

- Large maps.
- Complex character customization.
- Multiplayer.
- Elaborate combat.
- Large inventories.
- Story campaigns.

Build the question engine and feedback loop first.

---

## 2.3 Wrong answers should be meaningful

Do not generate four completely random answers.

Wrong answers should represent plausible mistakes.

Example:

`8 + 7 = ?`

Possible answers:

- 15 — correct.
- 14 — off by one.
- 16 — off by one.
- 17 — another plausible calculation error.

The parent dashboard should be able to inspect these patterns.

---

## 2.4 Adaptive but transparent

The game should adapt difficulty, but the parent should be able to understand why a question was selected.

Example:

> Today's focus: crossing 10  
> Weak combinations: 8 + 7, 9 + 6, 13 + 8

Do not make the learning system a black box.

---

# 3. Initial Curriculum

The curriculum should be based on **skills**, not simply the largest number.

## Level 1 — Basic addition

Examples:

- 1 + 2
- 3 + 4
- 5 + 2

Goal:

- Build basic addition fluency.

---

## Level 2 — Addition within 10

Examples:

- 6 + 3
- 7 + 2
- 5 + 5

Goal:

- Become comfortable with sums ≤ 10.

---

## Level 3 — Make 10

Introduce the strategy:

> Break a number apart so the first number reaches 10.

Example:

`8 + 7`

First:

`8 + 2 = 10`

Remaining:

`7 - 2 = 5`

Then:

`10 + 5 = 15`

This should initially be shown visually and gradually become implicit.

---

## Level 4 — Addition crossing 10

Examples:

- 8 + 5
- 8 + 7
- 9 + 4
- 7 + 6
- 9 + 8

Goal:

- Apply make-10 automatically.

---

## Level 5 — Basic subtraction

Examples:

- 8 - 3
- 9 - 4
- 10 - 6

Goal:

- Build subtraction fluency.

---

## Level 6 — Subtraction crossing 10

Examples:

- 13 - 5
- 15 - 7
- 17 - 9

Use visual decomposition where necessary.

---

## Level 7 — Mixed operations

Examples:

- 8 + 7
- 16 - 8
- 9 + 6
- 14 - 7

Goal:

- Choose the correct operation and solve without relying on a predictable pattern.

---

# 4. Game Loop

A normal daily session:

```text
Start
  ↓
50 arrows available
  ↓
Generate question
  ↓
Show expression
  ↓
Show four elemental arrows
  ↓
Child selects an arrow
  ↓
Shoot animation
  ↓
Immediate feedback
  ↓
Record attempt
  ↓
Update skill model
  ↓
Next question
  ↓
Repeat until 50 arrows
  ↓
Daily result
```

At the end:

```text
🏆 DAILY QUEST COMPLETE

50 / 50 arrows

Accuracy       86%
Addition       92%
Subtraction    78%

New area unlocked!
```

Stop the normal practice session after 50 arrows.

Do not encourage unlimited grinding.

---

# 5. Game Modes

## 5.1 Adventure

The primary mode.

- Exactly 50 arrows per day.
- Adaptive questions.
- Game animations.
- XP/progression.
- Elemental arrows.
- Unlocks.

---

## 5.2 Training

Unlimited practice.

Purpose:

- Explain mistakes.
- Demonstrate make-10.
- Allow experimentation.
- No pressure around score.

Example:

```text
13 + 8

13 + 7 = 20
You still have 1.

20 + 1 = 21
```

---

## 5.3 Challenge

Unlocked later.

Characteristics:

- No hints.
- More mixed questions.
- Faster pacing.
- More difficult combinations.
- Optional rewards.

---

# 6. Hint / Teaching System

Use progressively less assistance.

## Stage 1 — Guided

For:

`8 + 7`

Show:

```text
8 + __ = 10
7 - __ = __

10 + __ = ?
```

---

## Stage 2 — Strategy hint

```text
💡 Make 10 first!
```

---

## Stage 3 — Minimal hint

```text
💡 Can you make 10?
```

---

## Stage 4 — Independent

No hint.

The system should gradually reduce hints as performance improves.

---

# 7. Elemental Arrow Design

The four elements are primarily game presentation, but their answer generation should have semantic meaning.

Potential hidden answer categories:

```text
CORRECT
TOO_LOW
TOO_HIGH
COMMON_MISTAKE
```

Example:

```text
Question: 8 + 7

Fire  = 15  → correct
Ice   = 14  → too low / off by one
Wind  = 16  → too high / off by one
Earth = 17  → plausible mistake
```

Do not expose these categories to the child.

The parent dashboard can use them for analysis.

---

# 8. Learning Engine

The learning engine is the core of the application.

It should:

1. Maintain a skill profile.
2. Identify weak areas.
3. Select questions according to skill.
4. Generate plausible distractors.
5. Record attempts.
6. Update skill estimates.
7. Gradually increase/decrease difficulty.

Initial adaptive algorithm can be simple.

Example:

```text
50% weak skills
25% current learning skills
15% mastered skills
10% challenge/new skills
```

These percentages can later be tuned using actual data.

---

# 9. Skill Model

Track skills separately.

Example:

```text
basic_addition
make_10
cross_10_addition
basic_subtraction
cross_10_subtraction
mixed_operations
```

Also track individual number combinations.

Example:

```text
8 + 7
9 + 6
13 + 8
17 - 9
14 - 7
```

A skill score can start simple:

```text
0.0 → unknown / weak
0.5 → developing
0.8 → strong
1.0 → mastered
```

Do not over-engineer the first version.

---

# 10. Data Model

Use TypeScript types as the initial contract.

```ts
type Operation = 'add' | 'subtract';

type Skill =
  | 'basic_addition'
  | 'make_10'
  | 'cross_10_addition'
  | 'basic_subtraction'
  | 'cross_10_subtraction'
  | 'mixed_operations';

type Attempt = {
  questionId: string;

  operation: Operation;

  left: number;
  right: number;
  answer: number;

  selectedAnswer: number;
  correct: boolean;

  responseTimeMs: number;

  skill: Skill;

  hintUsed: boolean;

  timestamp: string;
};
```

Additional entities:

```ts
type Player = {
  id: string;
  displayName: string;
};

type DailySession = {
  id: string;
  playerId: string;
  date: string;

  arrowsAllowed: number;
  arrowsUsed: number;

  startedAt: string;
  completedAt?: string;
};

type SkillProgress = {
  playerId: string;
  skill: Skill;

  score: number;

  attempts: number;
  correct: number;

  averageResponseTimeMs: number;

  updatedAt: string;
};
```

---

# 11. Metrics

Do not use accuracy as the only measurement.

Record:

- Correct/incorrect.
- Response time.
- Hint usage.
- Operation.
- Skill.
- Exact operands.
- Exact wrong answer.
- Answer category.
- Timestamp.

Useful derived metrics:

```text
Accuracy
Accuracy by operation
Accuracy by skill
Accuracy by operand pair
Average response time
Median response time
Hint rate
Recent accuracy
Long-term accuracy
Common wrong answers
```

---

# 12. Parent Dashboard

The parent dashboard should answer:

> What does my child understand?

and:

> What should the game practice next?

Example:

```text
PARENT DASHBOARD

Today
────────────────────────
Arrows             50/50
Accuracy           86%
Addition           92%
Subtraction        78%
Average response   4.8 sec

Skills
────────────────────────
Make 10             90%
Addition ≤ 10       97%
Addition > 10       71%
Subtraction ≤ 10    89%
Subtraction > 10    62%

Weak combinations
────────────────────────
13 + 8              52%
17 - 9              61%
14 + 7              64%
16 - 8              67%
```

Include historical charts:

```text
Accuracy
100 ┤
 90 ┤
 80 ┤
 70 ┤
    └────────────────
      Mon Tue Wed Thu Fri
```

Also show:

> Today's focus

Example:

```text
Today's focus:
Crossing 10 in addition.

Suggested combinations:
8 + 7
9 + 6
7 + 8
13 + 8
```

---

# 13. Technical Architecture

Initial architecture:

```text
                    Cloudflare
              ┌────────────────────┐
              │                    │
              │  Static Web App    │
              │                    │
              │ React + TypeScript │
              │                    │
              └─────────┬──────────┘
                        │
                  HTTPS API
                        │
              ┌─────────▼──────────┐
              │ Cloudflare Worker  │
              │                    │
              │ Learning Engine    │
              │ Auth               │
              │ API                │
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────┐
              │        D1          │
              │                    │
              │ Players            │
              │ Sessions           │
              │ Attempts           │
              │ Skills             │
              └────────────────────┘
```

Recommended initial stack:

- React.
- TypeScript.
- Vite.
- Cloudflare Workers.
- Cloudflare D1.
- PWA.
- CSS or a lightweight component library.

Next.js is not necessary for the MVP because the application is primarily an interactive client-side game.

---

# 14. Client Structure

Suggested project structure:

```text
src/
  app/
    App.tsx

  game/
    GameScreen.tsx
    QuestionView.tsx
    ArrowChoice.tsx
    Archer.tsx
    Target.tsx
    Feedback.tsx

  learning/
    questionGenerator.ts
    distractorGenerator.ts
    skillModel.ts
    difficulty.ts

  session/
    dailySession.ts

  api/
    client.ts

  parent/
    Dashboard.tsx
    SkillChart.tsx
    WeakAreas.tsx

  types/
    game.ts
    learning.ts
    api.ts

  styles/
```

Keep the learning engine independent from React.

It should be possible to test it without rendering the game.

---

# 15. Question Generator

Implement deterministic/testable question generation.

Example:

```ts
type Question = {
  id: string;

  left: number;
  right: number;

  operation: Operation;

  correctAnswer: number;

  choices: AnswerChoice[];

  skill: Skill;
};

type AnswerChoice = {
  element: 'fire' | 'ice' | 'wind' | 'earth';

  value: number;

  category: 'correct' | 'too_low' | 'too_high' | 'common_mistake';
};
```

Requirements:

- Correct answer appears exactly once.
- Four choices are distinct.
- Choices stay within sensible bounds.
- Distractors are plausible.
- Question difficulty matches the selected skill.

---

# 16. Daily Session Rules

Initial rule:

```text
dailyArrowLimit = 50
```

Server should enforce this.

Do not rely only on client-side state.

Example API:

```text
POST /api/sessions/start
POST /api/attempts
GET  /api/sessions/today
GET  /api/progress
```

The server should prevent a client from submitting more than the daily allowance.

---

# 17. Account Model

Keep authentication simple initially.

Possible MVP:

```text
Parent account
    │
    └── Child profile
```

The child should not need to type a password every time.

Potential flow:

```text
Parent creates child profile
        ↓
Game generates child login/pin
        ↓
Child selects profile
        ↓
Starts daily quest
```

Later, support stronger authentication for the parent dashboard.

---

# 18. PWA

The game should be installable.

Requirements:

- Web manifest.
- App icon.
- Standalone display mode.
- Responsive layout.
- Offline shell.
- Cache static assets.
- Graceful offline behavior.

Offline play is useful because the child may be using a phone/tablet without reliable connectivity.

However, attempts must eventually synchronize with the server.

Potential model:

```text
Game
 ↓
Local attempt queue
 ↓
Network available?
 ├─ yes → upload
 └─ no  → keep locally
              ↓
        retry later
```

---

# 19. Mobile UI

Primary interaction should be touch.

Large answer buttons.

Avoid tiny controls.

Example:

```text
             13 + 8

       ┌─────────┐
       │  🔥 21  │
       └─────────┘

       ┌─────────┐
       │  ❄️ 20  │
       └─────────┘

       ┌─────────┐
       │  💨 22  │
       └─────────┘

       ┌─────────┐
       │  🪨 19  │
       └─────────┘
```

Could later arrange the arrows spatially around the target.

---

# 20. Xbox UI

Xbox should use controller-friendly choices.

Possible mapping:

```text
A → Fire
B → Ice
X → Wind
Y → Earth
```

Requirements:

- No typing required.
- Large visual buttons.
- Focus state visible.
- Controller navigation.
- Avoid mouse-only interactions.

Test in Edge on Xbox before investing heavily in Xbox-specific features.

---

# 21. Game World

Only after the learning loop works.

Possible world:

```text
                 🏰 Castle
                    │
       ┌────────────┼────────────┐
       │            │            │
   🔥 Fire       ❄️ Ice       💨 Wind
   Village       Kingdom      Temple
       │
       └──────── 🪨 Earth Mountain
```

Elements can represent game progression.

For example:

- Fire → addition.
- Ice → subtraction.
- Wind → mixed problems.
- Earth → challenge.

This mapping is optional; don't let game lore constrain the learning engine.

---

# 22. Rewards

Rewards should encourage returning, not endless grinding.

Examples:

- XP.
- Character cosmetics.
- Bow skins.
- Arrow effects.
- Castle decorations.
- Elemental areas.
- Achievements.
- Daily streaks.

Avoid making rewards dependent only on perfect accuracy.

Reward:

- Completing the daily session.
- Practicing difficult areas.
- Improving.
- Trying again after mistakes.

---

# 23. Mistake Feedback

Incorrect:

```text
❌ Not quite!

Let's try another one.
```

Do not immediately overwhelm the child with explanations during Adventure mode.

Use Training mode for detailed explanation.

Potential Adventure feedback:

```text
🏹 Almost!

💡 Try making 10 first.
```

Then continue.

---

# 24. Anti-Frustration Rules

Important design rules:

- Avoid repeatedly showing the exact same failed question.
- Don't make mistakes feel like punishment.
- Don't use negative language such as "wrong again".
- Don't reduce game rewards because of mistakes.
- Don't expose detailed performance rankings to the child.
- Give easier questions after repeated failures.
- Occasionally return to mastered questions to maintain confidence.

---

# 25. Analytics / Privacy

The data is educational progress data about a child, so keep collection minimal.

Store only what is necessary.

Avoid:

- Advertising trackers.
- Unnecessary third-party analytics.
- Public profiles.
- Leaderboards with real names.

Parent dashboard should be private.

---

# 26. MVP Milestones

## Milestone 0 — Specification

Deliverables:

- Curriculum definition.
- Skill definitions.
- Question types.
- Answer distractor rules.
- Data model.
- Basic UI wireframes.

---

## Milestone 1 — Playable prototype

Build:

- One game screen.
- Addition only.
- Four arrows.
- Correct/wrong feedback.
- 50-arrow session.
- Local progress.

No backend.

Success criteria:

> A child can play 50 questions without needing instructions from the developer.

---

## Milestone 2 — Learning engine

Build:

- Skill model.
- Make-10 questions.
- Crossing-10 questions.
- Meaningful distractors.
- Adaptive selection.

Success criteria:

> The system deliberately gives more practice to demonstrated weak areas.

---

## Milestone 3 — Persistence

Build:

- Worker API.
- D1 database.
- Player.
- Session.
- Attempt.
- Skill progress.

Success criteria:

> Closing the browser does not lose progress.

---

## Milestone 4 — Parent dashboard

Build:

- Daily summary.
- Addition/subtraction breakdown.
- Skill breakdown.
- Weak combinations.
- Response time.
- Historical progress.
- Today's recommended focus.

Success criteria:

> A parent can understand what the child needs to practice without inspecting raw attempts.

---

## Milestone 5 — PWA

Build:

- Installable app.
- Offline shell.
- Local attempt queue.
- Sync.
- Mobile polish.

Success criteria:

> The game feels like an app on the phone/tablet.

---

## Milestone 6 — Game world

Build:

- Archer.
- Target.
- Shooting animations.
- Elements.
- XP.
- Unlocks.
- Simple world.

Success criteria:

> The educational loop is wrapped in a compelling game loop.

---

## Milestone 7 — Xbox

Build:

- Controller navigation.
- A/B/X/Y mapping.
- Large-screen layout.
- Edge testing.

Success criteria:

> Child can complete a daily session using only an Xbox controller.

---

## Milestone 8 — Advanced learning

Potential additions:

- Better skill estimation.
- Spaced repetition.
- Automatic curriculum progression.
- Difficulty calibration.
- Mistake-pattern classification.
- Parent-configurable goals.
- Multiple children.
- Weekly reports.

Do not implement these until actual usage shows they are needed.

---

# 27. Future Roblox Version

If the web game proves successful, consider Roblox.

Architecture goal:

```text
                 Learning Backend
                       │
              ┌────────┴────────┐
              │                 │
          Web Client       Roblox Client
```

The learning logic should remain independent of the UI.

Roblox can then provide:

- 3D archery.
- More elaborate worlds.
- NPCs.
- Quests.
- Cosmetic progression.

Do not duplicate the learning rules in Roblox if avoidable.

---

# 28. Testing Strategy

## Unit tests

Test the learning engine independently.

Examples:

```text
8 + 7
9 + 6
13 + 8
17 - 9
```

Verify:

- Correct answer.
- Valid distractors.
- Correct skill classification.
- Difficulty classification.

---

## Learning simulation

Create a fake player.

Simulate:

```text
Strong at basic addition
Weak at crossing 10
Average subtraction
```

Verify that future question selection increasingly targets crossing-10 problems.

This is one of the most important tests.

---

## UI tests

Verify:

- Touch.
- Mouse.
- Keyboard.
- Xbox controller.
- Different screen sizes.
- Portrait phone.
- Landscape tablet.
- Desktop.
- Xbox Edge.

---

# 29. Definition of Done for MVP

The MVP is complete when:

- [ ] Child can start a daily session.
- [ ] Session contains at most 50 arrows.
- [ ] Addition questions work.
- [ ] Subtraction questions work.
- [ ] Questions can cross 10.
- [ ] Four plausible answer choices are generated.
- [ ] Correct/incorrect attempts are recorded.
- [ ] Response time is recorded.
- [ ] Hint usage is recorded.
- [ ] Skill scores are calculated.
- [ ] Weak skills receive additional practice.
- [ ] Parent can view progress.
- [ ] Parent can see weak number combinations.
- [ ] Data survives browser restart.
- [ ] App works on phone.
- [ ] App works on tablet.
- [ ] App is installable as a PWA.
- [ ] No unnecessary personal/analytics data is collected.

---

# 30. Recommended Build Order

The practical order is:

```text
1. Question model
       ↓
2. Question generator
       ↓
3. Distractor generator
       ↓
4. Skill model
       ↓
5. Simple game screen
       ↓
6. 50-arrow session
       ↓
7. Attempt storage
       ↓
8. Adaptive selection
       ↓
9. Cloud persistence
       ↓
10. Parent dashboard
       ↓
11. PWA/offline
       ↓
12. Game animations/world
       ↓
13. Xbox controller
       ↓
14. Advanced learning
       ↓
15. Optional Roblox client
```

The most important architectural rule is:

> **Keep the learning engine independent from the game presentation.**

That way, the same engine can power a simple browser game today, an Xbox-friendly experience tomorrow, and potentially a Roblox game later.

---

# 31. First Coding Task

Start with a completely UI-independent package:

```text
packages/
  learning-engine/
    src/
      questions/
      distractors/
      skills/
      difficulty/
      session/
      index.ts

    tests/
```

Implement these functions first:

```ts
generateQuestion(profile: SkillProfile): Question;

generateDistractors(
  question: BaseQuestion
): AnswerChoice[];

selectNextQuestion(
  profile: SkillProfile
): QuestionSpec;

recordAttempt(
  profile: SkillProfile,
  attempt: Attempt
): SkillProfile;

getWeakSkills(
  profile: SkillProfile
): Skill[];

getRecommendedFocus(
  profile: SkillProfile
): Skill[];
```

Then build the React game around those APIs.

This makes the educational logic testable before animations, authentication, Cloudflare, or Roblox complicate the project.

---

# 32. Product North Star

The ultimate goal is not:

> "Make a game that gives my son 50 math questions."

It is:

> **Make a game that quietly discovers what he doesn't understand, gives him just enough practice to improve, teaches the missing strategy when necessary, and lets the parent see the learning process without turning it into a stressful test.**

# 33. Execution Plan — Step-by-Step

This section is the **actual implementation sequence**. Work from top to bottom.

A task is not complete because the code exists. Each task has an explicit **Done When** condition. Do not move to the next phase until the condition is satisfied.

---

## Phase 0 — Freeze the MVP Scope

### Task 0.1 — Create the repository

Create a repository with:

```text
math-archer/
  apps/
    web/
  packages/
    learning-engine/
  docs/
```

Recommended:

- TypeScript.
- React.
- Vite.
- Vitest.
- ESLint.
- Prettier.

### Done When

- [x] Repository initializes successfully.
- [x] `npm/pnpm` install works from a clean checkout.
- [x] Web app starts locally.
- [x] A TypeScript test runs successfully.
- [x] `packages/learning-engine` can be imported by the web app.

---

### Task 0.2 — Write the initial curriculum as data

Do not hard-code curriculum rules throughout the UI.

Create something like:

```ts
type CurriculumLevel = {
  id: string;
  name: string;
  skills: Skill[];
  examples: string[];
};
```

Define the first seven levels from the curriculum section.

### Done When

- [ ] All initial skills exist as data.
- [ ] Each skill has examples.
- [ ] Question-generation code can refer to skills by ID.
- [ ] UI contains no curriculum-specific calculation logic.

---

### Task 0.3 — Define the MVP boundary

Explicitly defer:

- [ ] Roblox.
- [ ] Multiplayer.
- [ ] Complex RPG inventory.
- [ ] Social features.
- [ ] AI-generated questions.
- [ ] Complex authentication.
- [ ] Advanced statistics.
- [ ] Elaborate animations.

### Done When

The MVP can be described as:

> A child answers up to 50 adaptive addition/subtraction questions per day by shooting one of four elemental arrows, while the system records enough data for a parent to understand strengths and weaknesses.

---

# Phase 1 — Build the Learning Engine First

**Do not build the game UI yet.**

The learning engine is the highest-risk part because it determines whether this is actually an educational game.

---

## Task 1.1 — Implement basic question representation

Implement:

```ts
type Operation = 'add' | 'subtract';

type BaseQuestion = {
  left: number;
  right: number;
  operation: Operation;
  answer: number;
  skill: Skill;
};
```

### Done When

Unit tests can represent:

```text
8 + 7 = 15
13 + 8 = 21
17 - 9 = 8
```

without involving React or browser APIs.

---

## Task 1.2 — Implement question generation

Implement:

```ts
generateQuestionSpec(skill: Skill): BaseQuestion;
```

Start with deterministic generation where possible.

Implement these first:

1. Basic addition.
2. Addition within 10.
3. Make-10 addition.
4. Crossing-10 addition.
5. Basic subtraction.
6. Crossing-10 subtraction.
7. Mixed operation.

### Done When

For each skill:

- [ ] 1,000 generated questions stay within intended bounds.
- [ ] Answers are mathematically correct.
- [ ] Generated questions actually match the requested skill.
- [ ] No invalid subtraction questions are produced.
- [ ] Tests cover edge cases such as 9 + 1, 9 + 9, 10 - 1, 10 - 9, 13 - 5.

---

## Task 1.3 — Implement distractor generation

Implement:

```ts
generateDistractors(
  question: BaseQuestion
): AnswerChoice[];
```

Start with explicit rules, not AI.

For each question:

- Correct answer.
- Plausible answer below.
- Plausible answer above.
- Skill-specific/common mistake.

### Done When

For at least 10,000 generated questions:

- [ ] Exactly four choices exist.
- [ ] Exactly one choice is correct.
- [ ] No duplicate values.
- [ ] Choices are sensible for the question.
- [ ] Distractor category is recorded.
- [ ] No obviously absurd answer appears.

---

## Task 1.4 — Implement the skill profile

Implement:

```ts
type SkillProfile = {
  skills: Record<Skill, SkillProgress>;
  pairs: Record<string, PairProgress>;
};
```

Track:

- Attempts.
- Correct.
- Accuracy.
- Recent accuracy.
- Response time.
- Hint usage.

### Done When

A simulated player can have:

```text
strong at basic addition
weak at crossing-10 addition
medium at subtraction
```

and the profile correctly reflects those results.

---

## Task 1.5 — Implement attempt recording

Implement:

```ts
recordAttempt(
  profile: SkillProfile,
  attempt: Attempt
): SkillProfile;
```

The function must be pure if practical:

```text
old profile + attempt → new profile
```

### Done When

Tests prove:

- [ ] Correct answers improve the relevant skill.
- [ ] Incorrect answers reduce/slow skill progression.
- [ ] Recent performance is represented.
- [ ] Exact number-pair performance is updated.
- [ ] Response time is incorporated.
- [ ] One attempt cannot accidentally update unrelated skills.

---

## Task 1.6 — Implement question selection

Implement:

```ts
selectNextQuestion(
  profile: SkillProfile
): QuestionSpec;
```

Initial target distribution:

```text
50% weak
25% developing
15% mastered/review
10% challenge
```

This is only the initial algorithm. Make the percentages configurable.

### Done When

Create a simulated profile with:

```text
cross_10_addition = weak
basic_addition = strong
basic_subtraction = medium
```

Generate 1,000 questions and verify that crossing-10 addition appears substantially more often than mastered skills.

The exact percentages do not need to be perfect yet.

---

# Phase 2 — Prove the Learning Engine With Simulation

This phase is deliberately before visual polish.

---

## Task 2.1 — Build a simulated child

Create a test simulator:

```ts
simulatePlayer({
  strengths: [...],
  weaknesses: [...],
});
```

Simulate several hundred attempts.

Profiles to test:

1. Strong overall.
2. Weak at make-10.
3. Weak at subtraction.
4. Fast but inaccurate.
5. Slow but accurate.
6. Improving child.
7. Child repeatedly making the same mistake.

### Done When

The simulation produces sensible practice recommendations for every profile.

---

## Task 2.2 — Test the learning loop

Run:

```text
simulate → select question → answer → update profile
```

for multiple sessions.

### Done When

A simulated weak skill receives more practice and eventually receives less practice as its performance improves.

If the system keeps hammering a skill forever, fix the algorithm before continuing.

---

# Phase 3 — Build the First Playable Game

Now build the simplest possible game.

No backend yet.

---

## Task 3.1 — Create the game screen

Implement:

```text
        🏹

      13 + 8

   🔥 21     ❄️ 20

   💨 22     🪨 19

       17 / 50
```

### Done When

- [ ] Question is visible.
- [ ] Four answers are visible.
- [ ] Child can tap/click an answer.
- [ ] Correct answer is detected.
- [ ] Next question appears.

---

## Task 3.2 — Add the shooting interaction

On selection:

```text
select arrow
    ↓
archer shoots
    ↓
arrow hits target
    ↓
correct/wrong feedback
    ↓
next question
```

Keep animation short.

### Done When

A child can understand what happened without reading developer-oriented UI.

---

## Task 3.3 — Add daily 50-arrow session

Implement:

```ts
startDailySession();
submitAnswer();
getRemainingArrows();
completeSession();
```

Initially persist locally.

### Done When

- [ ] Starting a session gives 50 arrows.
- [ ] Each submitted answer consumes exactly one arrow.
- [ ] Refreshing the page does not restore spent arrows.
- [ ] 50/50 ends the normal session.
- [ ] A second session cannot give another 50 arrows on the same day.
- [ ] Tests cover refresh/restart behavior.

---

## Task 3.4 — Connect the real learning engine

Replace any temporary/random question logic.

The game must call:

```text
SkillProfile
    ↓
selectNextQuestion()
    ↓
Question
    ↓
child answer
    ↓
Attempt
    ↓
recordAttempt()
    ↓
updated SkillProfile
```

### Done When

The game visibly adapts after a controlled test profile is loaded.

---

# Phase 4 — Add Teaching / Make-10

---

## Task 4.1 — Implement guided make-10 feedback

For selected questions such as:

```text
8 + 7
9 + 6
7 + 8
```

show a guided decomposition.

### Done When

The child can see a complete worked example after requesting help.

---

## Task 4.2 — Implement hint levels

Implement:

```text
none
strategy hint
partial decomposition
full explanation
```

### Done When

- [ ] Adventure mode does not automatically dump a full explanation.
- [ ] Training mode can show the complete explanation.
- [ ] Hint usage is recorded.
- [ ] Repeated hint use can influence skill assessment.

---

## Task 4.3 — Create Training mode

Training mode should allow unlimited questions and explanations.

### Done When

A parent can use Training mode to deliberately practice a weak skill without consuming the daily 50 arrows.

---

# Phase 5 — Local Progress and Parent View

Before cloud infrastructure, prove the dashboard concept locally.

---

## Task 5.1 — Build attempt history

Store locally:

```text
sessions
attempts
skill progress
```

### Done When

Closing and reopening the application preserves progress.

---

## Task 5.2 — Build parent dashboard

Display:

- Today's arrows.
- Accuracy.
- Addition accuracy.
- Subtraction accuracy.
- Skill breakdown.
- Weak number pairs.
- Average response time.
- Hint rate.

### Done When

A parent can open one screen and answer:

1. How much did my child practice?
2. How accurate were they?
3. Is addition or subtraction weaker?
4. Which specific skills are weak?
5. Which exact number combinations cause problems?
6. Is performance improving?

---

## Task 5.3 — Build recommendation explanation

Show:

```text
Today's focus

Crossing 10 in addition

Why:
Recent accuracy: 64%
Previous accuracy: 51%

Practice:
8 + 7
9 + 6
13 + 8
```

### Done When

Every recommendation can be traced to recorded data.

No mysterious "AI thinks this is weak" explanation.

---

# Phase 6 — Cloud Backend

Only now introduce the backend.

---

## Task 6.1 — Create D1 schema

Initial tables:

```text
players
sessions
attempts
skill_progress
```

Keep schema minimal.

### Done When

A clean database can be created from migrations alone.

---

## Task 6.2 — Create Worker API

Initial endpoints:

```text
POST /api/sessions/start
POST /api/attempts
GET  /api/sessions/today
GET  /api/progress
GET  /api/recommendations
```

### Done When

All endpoints work against a real D1 database and have integration tests for normal and invalid requests.

---

## Task 6.3 — Move daily-limit enforcement server-side

The server must be authoritative.

Rules:

```text
maximum = 50 attempts per player per local calendar day
```

### Done When

A modified browser request cannot create attempt #51.

---

## Task 6.4 — Synchronize the client

Client flow:

```text
answer
 ↓
save locally
 ↓
send to API
 ↓
server accepts
 ↓
mark synchronized
```

If offline:

```text
answer
 ↓
local queue
 ↓
retry
```

### Done When

Turning the network off during a session does not lose completed attempts.

---

# Phase 7 — Authentication and Profiles

---

## Task 7.1 — Create parent/child relationship

Model:

```text
Parent
 └── Child
```

The child should have a simple login mechanism.

### Done When

The child can start the game without entering a complicated password, while the parent dashboard remains protected.

---

## Task 7.2 — Protect parent data

### Done When

- [ ] Child cannot access parent dashboard.
- [ ] Parent cannot accidentally see another parent's child.
- [ ] API verifies authorization on every protected endpoint.
- [ ] No child progress endpoint relies only on a client-supplied player ID.

---

# Phase 8 — PWA and Mobile

---

## Task 8.1 — Make it installable

Implement:

- Manifest.
- Icons.
- Standalone mode.
- Service worker.

### Done When

The app can be installed from Chrome/Edge on a phone/tablet and launches without normal browser chrome.

---

## Task 8.2 — Make the game responsive

Test:

- Small phone portrait.
- Large phone.
- Tablet portrait.
- Tablet landscape.
- Desktop.

### Done When

No answer is too small to comfortably tap and the four choices remain obvious at every target size.

---

## Task 8.3 — Offline support

Cache:

- App shell.
- Game assets.
- Learning engine.

Queue attempts locally.

### Done When

A previously loaded game can complete a session without network connectivity and synchronizes later.

---

# Phase 9 — Real Game Presentation

Only after the educational loop is stable.

---

## Task 9.1 — Archer presentation

Add:

- Archer character.
- Bow.
- Target.
- Arrow flight.
- Hit animation.

### Done When

Answering a question feels like shooting an arrow rather than clicking a button.

---

## Task 9.2 — Elemental presentation

Add:

- Fire arrow.
- Ice arrow.
- Wind arrow.
- Earth arrow.

Each should have a distinct visual/audio identity.

### Done When

The four choices are immediately distinguishable without relying only on color.

---

## Task 9.3 — World progression

Add a small world:

```text
Castle
Fire area
Ice area
Wind area
Earth area
```

Do not build a huge map.

### Done When

Completing sessions can unlock visible game content.

---

## Task 9.4 — Rewards

Add:

- XP.
- Cosmetic unlocks.
- Bow/arrow effects.
- Castle decorations.
- Achievements.

### Done When

The child has a reason to return tomorrow without needing additional math content.

---

# Phase 10 — Xbox

Treat Xbox as a separate input target, not a separate game.

---

## Task 10.1 — Controller mapping

Start with:

```text
A → Fire
B → Ice
X → Wind
Y → Earth
```

### Done When

A child can complete questions without keyboard/mouse/touch.

---

## Task 10.2 — Focus/navigation

Implement visible controller focus.

### Done When

The child can:

- Start the game.
- Select answers.
- Navigate basic menus.
- Finish the daily session.

using only the controller.

---

## Task 10.3 — Test Xbox Edge

Test the actual Xbox Series S.

### Done When

A complete 50-arrow session works reliably on the real device.

Do not assume desktop Edge behavior is equivalent.

---

# Phase 11 — Adaptive Learning v2

Only start this after collecting real usage data.

---

## Task 11.1 — Analyze real mistakes

Look for:

```text
Most frequently missed pairs
Most frequent distractors
Slowest questions
Highest hint usage
Improving skills
Stagnant skills
```

### Done When

There are enough real attempts to identify patterns rather than tuning purely from assumptions.

---

## Task 11.2 — Improve skill scoring

Possible inputs:

```text
accuracy
recent accuracy
response time
hint usage
attempt count
recency
```

### Done When

The model produces stable recommendations across several sessions instead of reacting wildly to one mistake.

---

## Task 11.3 — Add spaced review

Once a skill becomes strong, do not remove it completely.

Schedule occasional review.

### Done When

Previously mastered skills continue appearing occasionally while most practice targets current weaknesses.

---

# Phase 12 — Child Testing

This is a critical phase.

The actual child is the primary usability tester.

---

## Task 12.1 — Observe the first session

Do not explain the game unless necessary.

Watch:

- Does he understand what to tap?
- Does he understand that each arrow is an answer?
- Does he understand success/failure?
- Does he know what to do next?
- Does he voluntarily continue?

### Done When

He can complete the first 10 questions with minimal adult intervention.

---

## Task 12.2 — Observe repeated sessions

Check whether:

- He remembers the make-10 strategy.
- He becomes faster.
- He gets frustrated by repeated weak questions.
- He understands hints.
- Rewards motivate him.
- 50 arrows feels reasonable.

### Done When

You have at least several real sessions of observations and have written down concrete changes.

---

## Task 12.3 — Tune the 50-arrow session

Do not assume 50 is perfect.

Possible changes:

```text
50 total arrows
5-arrow mini stages
checkpoint animations
short breaks
```

### Done When

The session length works for the child in practice, not just in the specification.

---

# Phase 13 — Production Hardening

---

## Task 13.1 — Error handling

Handle:

- Network failure.
- Duplicate submission.
- Expired session.
- Corrupt local queue.
- Server error.
- Invalid question.
- Clock/date changes.

### Done When

Failures do not silently lose progress or award extra arrows.

---

## Task 13.2 — Data integrity

Server-side checks:

- Correct answer must match question.
- Attempt belongs to player.
- Session belongs to player.
- Daily limit is enforced.
- Timestamps are validated reasonably.
- Duplicate attempts are rejected/idempotent.

### Done When

A modified client cannot trivially corrupt progress.

---

## Task 13.3 — Backup/export

Provide a parent-only export eventually:

```text
progress.json
```

or CSV.

### Done When

The parent's historical progress can be backed up independently of the application.

---

# Phase 14 — Optional Roblox Client

Only begin this if the web game has proven itself.

---

## Task 14.1 — Define shared protocol

The Roblox client should consume the same conceptual question/attempt model.

### Done When

A question generated for Roblox has the same:

- operands.
- operation.
- correct answer.
- distractor semantics.
- skill ID.

as the web game.

---

## Task 14.2 — Build Roblox prototype

Implement only:

```text
spawn
 ↓
question
 ↓
four targets/arrows
 ↓
shoot
 ↓
answer
 ↓
reward
```

### Done When

One complete question can be played end-to-end in Roblox.

---

## Task 14.3 — Decide whether Roblox is worth continuing

Use actual usage rather than assuming it is better.

Consider:

- Child engagement.
- Development cost.
- Performance.
- Controller experience.
- Backend complexity.
- Ability to preserve the educational loop.

Do not migrate the web game just because Roblox looks more game-like.

---

# 34. Release Gates

Use these gates to prevent premature expansion.

## Gate A — Learning Engine

Do not build the polished game until:

- [ ] Question generation passes large randomized tests.
- [ ] Distractors are plausible.
- [ ] Skill classification works.
- [ ] Adaptive selection works in simulation.

---

## Gate B — Educational Prototype

Do not build cloud infrastructure until:

- [ ] Child can complete 50 questions.
- [ ] Make-10 teaching works.
- [ ] Attempts are recorded.
- [ ] Weak areas are detectable.

---

## Gate C — Useful Parent Product

Do not add RPG complexity until:

- [ ] Parent dashboard is useful.
- [ ] Progress survives sessions.
- [ ] Recommendations correspond to actual data.

---

## Gate D — Platform Expansion

Do not build Roblox/Xbox-specific features until:

- [ ] Core web game is stable.
- [ ] Mobile experience works.
- [ ] Learning engine is platform-independent.

---

# 35. Practical Weekly Execution

If building this as a side project, use this order:

### Session 1

- [ ] Repository.
- [ ] TypeScript types.
- [ ] Curriculum data.
- [ ] Basic question generator.

### Session 2

- [ ] Distractor generator.
- [ ] Question tests.
- [ ] Edge-case tests.

### Session 3

- [ ] Skill profile.
- [ ] Attempt recording.
- [ ] Skill tests.

### Session 4

- [ ] Adaptive question selection.
- [ ] Simulation.
- [ ] Tune initial weighting.

### Session 5

- [ ] First React game screen.
- [ ] Four arrows.
- [ ] Answer selection.

### Session 6

- [ ] Shooting animation.
- [ ] 50-arrow session.
- [ ] Local persistence.

### Session 7

- [ ] Make-10 teaching.
- [ ] Training mode.
- [ ] Hint tracking.

### Session 8

- [ ] Local parent dashboard.
- [ ] Weak-pair analysis.
- [ ] Progress chart.

### Session 9+

- [ ] Cloudflare Worker.
- [ ] D1.
- [ ] API.
- [ ] Authentication.
- [ ] Sync.

After that:

```text
PWA
 ↓
Real child testing
 ↓
Game polish
 ↓
Xbox
 ↓
Advanced learning
 ↓
Optional Roblox
```

---

# 36. Project Tracking Format

Keep a `TASKS.md` file alongside this plan.

Each task should have:

```md
## T-001 — Basic question generator

Status: TODO

Depends on:

- T-000

Goal:
Generate valid basic addition questions.

Acceptance criteria:

- [ ] ...
- [ ] ...
- [ ] ...

Evidence:

- Tests: ...
- Commit: ...
- Notes: ...
```

Use these statuses:

```text
TODO
IN_PROGRESS
BLOCKED
DONE
```

Never mark a task `DONE` without satisfying its acceptance criteria.

---

# 37. Commit Strategy

Use small commits corresponding to completed tasks.

Examples:

```text
feat(engine): add curriculum skill definitions
feat(engine): implement addition question generator
test(engine): cover crossing-10 questions
feat(engine): add distractor generation
feat(engine): add adaptive question selection
feat(game): add four-arrow question screen
feat(game): add daily 50-arrow session
feat(game): add make-10 hints
feat(parent): add progress dashboard
feat(api): add D1 persistence
feat(pwa): add offline attempt queue
```

This makes it possible to understand exactly what changed when something later breaks.

---

# 38. Final Definition of "Finished"

The project is **not** finished when every planned feature exists.

The first meaningful release is finished when:

```text
Child
  ↓
opens game
  ↓
plays 50 arrows
  ↓
gets immediate feedback
  ↓
receives appropriate practice
  ↓
learns/reinforces make-10
  ↓
progress is saved
  ↓
Parent
  ↓
opens dashboard
  ↓
sees what happened
  ↓
understands weak areas
  ↓
sees what the game will practice next
```

Everything else is an expansion.

The priority order is therefore:

**Correct learning behavior → usable game → trustworthy progress data → polished game world → additional platforms.**
