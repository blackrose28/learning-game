# Math Archer Cross-Device & Web/PWA Synchronization Checklist

This checklist tracks all identified synchronization gaps between devices, browsers, and the installed PWA for Math Archer.

---

## Progress Summary

- [x] **Item 1: Cosmetic Equipment & Royal Armory Real-Time Sync** _(Completed)_
- [x] **Item 2: Fix Initial Startup 401 Auth Race Condition on Fresh Browsers / PWAs** _(Completed)_
- [x] **Item 3: World Map Realm Selection Sync (`WorldMap.tsx` & Hydration)** _(Completed)_
- [x] **Item 4: Parent Dashboard Multi-Child On-Demand Hydration** _(Completed)_
- [x] **Item 5: Active Child Profile Metadata & Selection Sync** _(Completed)_
- [x] **Item 6: Procedural Audio Mute Setting Persistence** _(Completed)_
- [x] **Item 7: Offline Parent PIN Change Sync Queue** _(Completed)_

---

## Detailed Task Breakdown

### Item 1: Cosmetic Equipment & Royal Armory Real-Time Sync

- **Gaps Identified**:
  - `RewardsScreen.handleEquip()` saves to local `localStorage` only; never calls `apiClient.updatePlayerRewards(next, playerId)`.
  - `GameScreen.tsx` only sends rewards when an arrow is shot or session completes; equipping items in the Armory without shooting an arrow is never sent to the backend.
  - `hydration.ts` merges equipped items with `...serverRewards.equippedCosmetics` last, which overwrites local choices with stale server defaults on page reload.
  - `hydration.ts` only uploads rewards if `totalXp` or unlocked cosmetic count increased; equipment changes without XP change are never uploaded during reconciliation.
- **Implementation Completed**:
  - [x] Updated `RewardsScreen.tsx` to support `apiClient` / `useSafeAuth()` and invoke `apiClient.updatePlayerRewards(next, playerId)` immediately upon equipping any cosmetic.
  - [x] Added `updatedAt?: string` to `PlayerRewardsState` in `@math-archer/learning-engine`, updated on equips, session finishes, and attempt rewards.
  - [x] Enhanced `apps/api/src/db.ts` to include `updatedAt: row.updated_at` in `loadPlayerRewardsFromDb`.
  - [x] Upgraded `hydration.ts` reconciliation: respects timestamp ordering, protects local custom equipment from stale server defaults, and pushes updated equipment to the server if local is ahead or has modified cosmetics.
  - [x] Added unit tests verifying real-time sync in `Rewards.test.tsx` and bi-directional equipment reconciliation in `hydration.test.ts`. All 152 web tests and 412 monorepo tests pass.

### Item 2: Fix Initial Startup 401 Auth Race Condition on Fresh Browsers / PWAs

- **Gaps Identified**:
  - On a fresh browser or newly installed PWA, `AuthProvider`'s `useEffect` begins `loginChild` asynchronously.
  - Concurrently, `App.tsx` triggers `hydratePlayerProgress` on mount before the login request finishes.
  - `GET /api/progress` receives no token, returns HTTP 401, and `hydratePlayerProgress` aborts silently.
  - `App.tsx` did not re-trigger hydration once the token was obtained because `activeChild.id` does not change.
- **Implementation Completed**:
  - [x] Exposed `isAuthenticated: boolean` in `AuthContextValue` and `AuthProvider` (`Boolean(authToken)`).
  - [x] Updated `registerParent` in `AuthContext.tsx` to set `setAuthToken(res.token)`.
  - [x] Updated `lockParent` in `AuthContext.tsx` to re-authenticate the active child so child mode maintains valid auth tokens.
  - [x] Updated `App.tsx` to support optional `apiClient?: MathArcherApiClient` in `AppProps` for clean dependency injection.
  - [x] Gated cloud hydration in `App.tsx`: when `!isAuthenticated`, local storage progress is loaded without making network requests. As soon as `isAuthenticated` becomes true (child auto-login or manual login resolves), cloud hydration is triggered with `Authorization: Bearer <token>`.
  - [x] Added dedicated integration tests in `apps/web/src/sync/startupAuthHydration.test.tsx` verifying:
    - Fresh browser startup: no `/api/progress` request while unauthenticated, no 401 errors, and automatic cloud hydration once authenticated.
    - Returning browser startup: instant hydration when token already exists in `localStorage`.
    - Offline startup: safe fallback loading local progress without 401 errors.
  - [x] All 155 web tests across 17 test suites pass; all 415 tests across the entire monorepo pass.

### Item 3: World Map Realm Selection Sync (`WorldMap.tsx` & Hydration)

- **Gaps Identified**:
  - Selecting an area on the standalone `WorldMap` tab only writes to `localStorage` via `saveActiveArea`; it never calls `apiClient.updateWorldProgression`.
  - `hydration.ts` always prefers `serverWorld.activeAreaId`, overwriting local area selection unless local has more completed sessions or unlocked areas.
- **Implementation Completed**:
  - [x] Extended `WorldProgressionState` in `@math-archer/learning-engine` to support `updatedAt?: string`.
  - [x] Added `getWorldActiveAreaUpdatedAtKey` and `getWorldCompletedSessionsKey` to persist active realm selection timestamp and completed sessions count in `localStorage`.
  - [x] Updated `apps/api/src/db.ts` to return `updatedAt: row.updated_at` in `loadWorldProgressionFromDb` and persist `updatedAt` in `saveWorldProgressionToDb`.
  - [x] Connected `WorldMap.tsx` with `apiClient` / `useSafeAuth()` to push `updateWorldProgression` immediately when the player selects an unlocked realm.
  - [x] Connected `App.tsx` to pass `apiClient` to `<WorldMap />` and trigger `syncTick` increment on realm change so `GameScreen` mounts with the newly selected realm.
  - [x] Upgraded `hydration.ts` world progression reconciliation with timestamp-based resolution:
    - Fresh devices adopt server realm selection.
    - If server is newer, local adopts server realm.
    - If local is newer, local preserves realm selection and pushes to server.
    - Legacy / tied timestamps preserve non-default local realm selections over server default `'castle'`.
  - [x] Added unit tests in `WorldProgression.test.tsx` for standalone World Map `apiClient` sync and in `hydration.test.ts` for bi-directional active realm reconciliation. All 158 web tests and 418 monorepo tests pass.

### Item 4: Parent Dashboard Multi-Child On-Demand Hydration

- **Gaps Identified**:
  - `hydratePlayerProgress` only hydrates `activeChild.id`.
  - In `ParentDashboard.tsx`, selecting another child (e.g. Child 2 or Child 3) reads only from local storage. If that child was never active on that device, their dashboard displays 0 attempts and empty stats.
- **Implementation Completed**:
  - [x] Extended `ParentDashboardProps` to support `apiClient?: MathArcherApiClient` and `storage?: SessionStorageAdapter`.
  - [x] Implemented on-demand cloud hydration via `hydratePlayerProgress(effectivePlayerId, activeApiClient, storageAdapter)` whenever a child profile is selected or switched in the dashboard.
  - [x] Added `isHydrating` indicator (`syncing-indicator`) and visual feedback on the Refresh button (`⏳ Syncing...`).
  - [x] Re-rendered dashboard charts, metrics, and recommendations in real-time when child hydration completes.
  - [x] Prevented race conditions using child ID tracking ref so in-flight responses from previous selections do not overwrite newer child selections.
  - [x] Connected `App.tsx` to pass `apiClient={apiClient}` to `<ParentDashboard />`.
  - [x] Added comprehensive unit tests in `ParentDashboard.test.tsx` verifying child switching hydration, manual refresh hydration, rapid child switching race prevention, and offline error resilience. All 17 dashboard tests and all 422 monorepo tests pass.

### Item 5: Active Child Profile Metadata & Selection Sync

- **Gaps Identified**:
  - `math_archer_active_child` is saved in `localStorage` and not refreshed when profile fields (e.g., name, avatar, grade) are updated on another device.
  - Active child badge in `App.tsx` rendered static 🏹 icon rather than dynamically displaying the active child's chosen archer avatar emoji.
- **Implementation Completed**:
  - [x] Exported `AVATAR_MAP` from `ChildProfilePicker.tsx` to standardize archer avatar emoji representations across components.
  - [x] Connected `ChildProfilePicker.tsx` to invoke `refreshChildren()` on mount so latest child names, grades, and avatars are fetched whenever opening the profile switcher.
  - [x] Implemented `reconcileActiveChild` in `AuthContext.tsx`:
    - Reconciles `activeChild` state and `math_archer_active_child` storage when `refreshChildren()` or `unlockParentWithCredentials()` fetches the latest child profiles from `/api/auth/child/profiles`.
    - Detects metadata changes (`name`, `avatar`, `grade`, `hasPin`, `parentId`) and updates state reactively.
    - Gracefully falls back to first remaining child or default profile if the active child was deleted remotely on another device.
    - Added window focus, visibility change, and online listeners in `AuthContext.tsx` to automatically re-sync profiles when the player returns to the app tab.
    - Added `authContext.refreshChildren()` call on manual Refresh in `ParentDashboard.tsx` and on parent PIN unlock.
    - Refactored `updateChild` and `deleteChild` in `AuthContext.tsx` to use functional state updaters avoiding stale closures.
    - Enhanced `hydration.ts` rewards reconciliation to safely spread optional cosmetic and achievement arrays.
  - [x] Connected `App.tsx`'s `current-player-badge` to render dynamic avatar emojis (`{AVATAR_MAP[activeChild.avatar] || '🏹'}`) and update instantly whenever profile metadata changes.
  - [x] Added comprehensive integration tests in `apps/web/src/sync/activeChildProfileSync.test.tsx` verifying:
    - Profile metadata change reconciliation and `localStorage` persistence.
    - Real-time active child badge name and avatar emoji updating.
    - Child profile switcher card real-time refresh and child switching.
    - Remote child deletion graceful fallback.
    - Offline resilience preserving local profile on network failures.
  - [x] All 18 test suites (167 tests) in `web` pass; all 427 tests across the monorepo pass.

### Item 6: Procedural Audio Mute Setting Persistence

- **Gaps Identified**:
  - `AudioFx.ts` held `isMuted` only in memory; refreshing the page or switching devices reset audio settings.
- **Implementation Completed**:
  - [x] Exported `AUDIO_MUTED_STORAGE_KEY = 'math_archer_audio_muted'` from `AudioFx.ts`.
  - [x] Added `initMuteFromStorage()` to `AudioManager` loading initial state from `localStorage`.
  - [x] Updated `setMuted(muted: boolean)` to persist to `localStorage` and notify all active subscribers.
  - [x] Implemented `subscribe(listener)` pattern in `AudioManager` for real-time reactivity across React components and views.
  - [x] Guarded all audio synthesis methods (`playBowRelease`, `playArrowFlight`, `playTargetHit`) to exit cleanly with 0 AudioContext operations when muted.
  - [x] Exposed accessible audio mute toggle button (`data-testid="audio-mute-toggle"`) in `app-header-top` in `App.tsx` with dynamic 🔊 / 🔇 icons, labels, and tooltips.
  - [x] Added responsive `.audio-toggle-btn` styling in `App.css` matching design system with hover and active states.
  - [x] Created unit and component tests in `apps/web/src/audio/AudioFx.test.tsx` verifying default initialization, storage persistence, subscriber notifications, audio context bypassing, and header toggle integration. All 7 tests pass.

### Item 7: Offline Parent PIN Change Sync Queue

- **Gaps Identified**:
  - Changing parent PIN while offline stored it only in `math_archer_parent_pin` without queueing for server update when reconnected.
- **Implementation Completed**:
  - [x] Created dedicated `apps/web/src/sync/pinSyncQueue.ts` module providing:
    - `loadQueuedPinChange`: Reads and validates queued PIN change from `localStorage` (`math_archer_parent_pin_sync_queue`).
    - `enqueuePinChange`: Persists `{ newPin, currentPin, queuedAt }` to storage.
    - `clearQueuedPinChange`: Removes item from storage upon successful push.
    - `flushQueuedPinChange`: Sends queued update to server via `apiClient.changeParentPin`, automatically re-authenticating with the old PIN if needed.
  - [x] Re-exported all queue utilities in `apps/web/src/sync/index.ts`.
  - [x] Integrated PIN change queue into `AuthContext.tsx`:
    - On online success in `changeParentPin`: clears queue and updates local storage.
    - On offline failure in `changeParentPin`: validates current PIN and format, updates local PIN, and enqueues change for background sync.
    - Exposed `hasPendingPinSync: boolean` and `flushPinSyncQueue: () => Promise<boolean>` in `AuthContextValue`.
    - Automatically flushes queue on `online`, `focus`, and `visibilitychange` window events.
    - Automatically flushes queue when unlocking via parent credentials or registering a parent account.
    - Enhanced `unlockParentWithPin` to recognize pending queued PINs, authenticate using the old server PIN, and flush the new PIN to the server immediately.
  - [x] Added comprehensive integration tests in `apps/web/src/sync/offlinePinSync.test.tsx` verifying:
    - Online PIN change directly updating backend without queueing.
    - Offline PIN change updating local state and queueing change.
    - Invalid offline PIN attempts (incorrect current PIN or malformed digit format) rejected without queueing.
    - Automatic queue flush upon browser reconnection (`online` event).
    - Manual `flushPinSyncQueue()` invocation.
    - Offline PIN changes executed through `ParentDashboard` change PIN modal.
    - Seamless Parent Gate unlocking with newly queued PIN.
  - [x] All 20 test suites (181 tests) in `web` pass; all 441 tests across the entire monorepo pass.
