# Math Archer — MVP Boundary & Scope Definition

## 1. Overview & North Star

The Minimum Viable Product (MVP) of **Math Archer** is strictly defined as:

> **A child answers up to 50 adaptive addition/subtraction questions per day by shooting one of four elemental arrows, while the system records enough data for a parent to understand strengths and weaknesses.**

The purpose of this document is to freeze the MVP scope to prevent scope creep, prioritize pedagogical effectiveness before RPG complexity, and ensure a tight feedback loop for early testing.

---

## 2. In-Scope for MVP

The MVP encompasses the core loop required to prove educational efficacy and engaging play:

### 2.1 Learning Engine (`packages/learning-engine`)

- **Curriculum Levels 1–7**:
  1. Basic Addition (sums within 10)
  2. Make 10 (number bonds to 10)
  3. Crossing 10 Addition (e.g., $8 + 7 = 15$)
  4. Addition within 20
  5. Basic Subtraction (within 10)
  6. Crossing 10 Subtraction (e.g., $15 - 8 = 7$)
  7. Mixed Operations (within 20)
- **Deterministic & Rule-Based Question Generator**: High precision, pedagogical correctness, no hallucinated or invalid math expressions.
- **Plausible Distractor Generation**: Meaningful wrong answers (e.g., off-by-one, off-by-two, make-10 errors, operation confusion) rather than random numbers.
- **Skill Profile & Adaptive Engine**:
  - Tracking attempts, correctness, response times, and hint usage.
  - Skill mastery calculation.
  - Prioritizing practice on demonstrated weak number combinations (e.g., $8 + 7$, $9 + 6$).

### 2.2 Game Client (`apps/web`)

- **Core Archery Game Screen**:
  - Display math expression on the target/monster.
  - Four elemental arrows: 🔥 Fire, ❄️ Ice, 💨 Wind, 🪨 Earth.
  - Clean visual shooting animation and instant correct/wrong feedback.
- **Daily Session Management**:
  - Maximum of **50 arrows per day** to establish a sustainable, stress-free daily routine.
- **Input Methods**:
  - Touch screen (phone, tablet).
  - Keyboard & mouse (desktop).
  - Gamepad / Controller navigation (Xbox Edge browser friendly via D-pad / Face buttons).
- **Local-First Persistence**:
  - IndexedDB / localStorage for zero-latency, offline-capable session and attempt logging.
- **Progressive Web App (PWA)**:
  - Installable on mobile devices (Android / iOS) and desktop.

### 2.3 Parent Dashboard

- **Diagnostic Insights**:
  - Overall accuracy & daily completion status.
  - Addition vs. subtraction performance breakdown.
  - Specific weak number combinations table (e.g., struggles with $+7$ or cross-10).
  - Response time trends and hint utilization rate.
- **Parent Access**:
  - Simple local profile gate (e.g., simple PIN or lock) to inspect learning data without disrupting the child's game experience.

---

## 3. Explicitly Deferred Features (Out of Scope for MVP)

To ensure rapid execution and focus on what matters most, the following features are **explicitly deferred** beyond the MVP:

| Deferred Item                                 | Status                   | Rationale for Deferral                                                                                                                                                                                     |
| :-------------------------------------------- | :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Roblox Client**                          | **Deferred** (Phase 11+) | The initial focus is 100% on the web/PWA platform. Proving the learning engine on web avoids dual-engine overhead and Roblox-specific platform constraints.                                                |
| **2. Multiplayer & Co-op**                    | **Deferred** (Post-MVP)  | Synchronous or asynchronous multiplayer adds networking, matchmaking, and anti-cheat complexity. The core loop is an intimate single-player learning journey.                                              |
| **3. Complex RPG Inventory & Crafting**       | **Deferred** (Post-MVP)  | Item drops, crafting trees, equipment stats, and complex gear systems distract from math practice. Only minimal cosmetic or milestone rewards will be considered later.                                    |
| **4. Social Features**                        | **Deferred** (Post-MVP)  | Public leaderboards, friend lists, player guilds, and chat create social anxiety and moderation liabilities. The game should remain a private, safe space for the child.                                   |
| **5. AI-Generated Questions**                 | **Deferred** (Post-MVP)  | LLM-based question generation introduces latency, non-determinism, cost, and hallucination risks. Math curriculum questions must follow deterministic pedagogical rules.                                   |
| **6. Complex Authentication**                 | **Deferred** (Post-MVP)  | Avoid OAuth, SMS OTP, or mandatory cloud logins in the MVP. Local-first device storage provides immediate zero-friction play for the child. Cloud sync can follow later.                                   |
| **7. Advanced Machine Learning / Statistics** | **Deferred** (Post-MVP)  | Complex Bayesian Knowledge Tracing or black-box neural recommendation algorithms are unnecessary for early levels. Deterministic heuristic skill scoring is transparent, reliable, and parent-explainable. |
| **8. Elaborate 3D Animations & Heavy Assets** | **Deferred** (Post-MVP)  | 3D models and heavy physics engines degrade performance on budget phones and Xbox Edge. The MVP uses lightweight, crisp 2D animations and responsive UI components.                                        |

---

## 4. MVP Acceptance Criteria (Definition of Done)

The MVP will be considered complete when all of the following criteria are met:

1. [ ] **Daily Session**: A child can launch the game and play a session capped at 50 arrows.
2. [ ] **Curriculum Coverage**: Generates valid questions across Levels 1–7 (basic to crossing-10 addition and subtraction).
3. [ ] **Elemental Arrows**: Each question displays four elemental arrows with exactly one correct answer and three plausible distractors.
4. [ ] **Feedback Loop**: Instant audio-visual feedback on hit/miss without breaking game immersion.
5. [ ] **Adaptive Practice**: Weak number combinations receive higher recurrence in upcoming questions.
6. [ ] **Data Logging**: Records timestamp, question specification, selected answer, response time, correctness, and hint usage.
7. [ ] **Data Persistence**: Data survives browser restarts via local-first storage.
8. [ ] **Parent Dashboard**: Parents can review accuracy, response times, and specific weak facts.
9. [ ] **Cross-Device Usability**: Plays comfortably on mobile, tablet, desktop, and Xbox Edge.
10. [ ] **PWA Support**: App can be installed to home screen and operate offline.
