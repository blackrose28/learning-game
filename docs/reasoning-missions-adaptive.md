# M5 adaptive practice

Status: support fading, weakest-relationship focus, Adventure missions with one-arrow
completion, Challenge missions, the disabled-family fallback and the separated dashboard
counts are implemented. Only threshold calibration (which needs the pilot) remains.
The thresholds below are the plan's initial defaults and are **uncalibrated**; tune
them (and record the change in the plan) after the parent/child pilot.

## Support recommendation

`recommendSupport(attempts, family)` looks only at completed missions of one family.
A mission counts as a success when every first response was correct and no hint or
earlier mistake assisted it. Reading and step time are never used.

| Situation                                                                                   | Suggestion                    |
| ------------------------------------------------------------------------------------------- | ----------------------------- |
| No completed mission in the family (arithmetic mastery never counts)                        | Guided                        |
| The last two completed missions were both independent and both needed help                  | Guided (restore a scaffold)   |
| At least 4 of the last 5 completed missions succeeded, covering at least 2 wording variants | Independent (fade)            |
| Otherwise                                                                                   | Keep the latest mission's one |

Training pre-selects the suggestion for the **next** mission and explains it with the
counts (for example "5/5 bài gần nhất đúng ngay lần đầu"). The child can pick the
other button; a mission in progress is never replaced.

## Stable independent performance

`summarizeIndependentStability` reports, per family, the independent mission count,
distinct local-day sessions, variants and first-response accuracy. It is labeled
stable only at 10+ missions, 2+ sessions, 3+ variants and 80%+. A variant is the
wording plus the set of vocabulary objectives the mission exercises, because the
templates only have two wordings. This is a practice heuristic, not school mastery.

## Focus

`recommendFocus(progress, enabledFamilies)` finds the enabled-family relationship with
the lowest unassisted first-response accuracy, requiring at least 3 unassisted
observations and at most 70% accuracy. Relationships with too little evidence are
unknown, not weak, and calculation objectives are not family-specific so they are
never suggested. When it points at another family, Training shows the suggestion and
a button to switch; it does not switch silently.

## Distinct problems

`createDistinctMission` retries other seeds so a problem whose text the child has
already attempted in that family is not given again. The original school example
(the first mission in a family) is unchanged.

## Adventure missions

Parents opt in with `ReasoningSettings.adventureEnabled` (optional boolean beside
`enabledFamilies`; same schema version, no migration; absent means off). The
**Include in Adventure** switch changes only after the server returns the saved value, and
toggling a family preserves it.

**When a mission is offered.** `GameScreen` asks the app at each question boundary
(nothing selected or shooting). `isAdventureMissionDue` is true when inclusion is on, at
least one family is enabled, the session has arrows left and no conflicting mission history
exists, and either an Adventure mission was paused, or at least `ADVENTURE_MISSION_INTERVAL`
(5) arrows have been spent since the last offer and at least two arrows remain, so a mission
is never the last arrow. The interval is an uncalibrated default. Disabled families never
enter selection; with none enabled the arithmetic experience is unchanged.

**What is offered.** `chooseAdventureMission` takes the weakest-relationship family from
`recommendFocus` (otherwise the enabled family practised least recently) and its
`recommendSupport` suggestion. The child sees the family, the suggestion with its evidence,
and can switch between **Từng bước** and **Tự giải**. **Để sau** (or Back/Escape/B) declines:
nothing is spent and the next offer waits another five arrows.

**Cost and reward.** An Adventure mission is a normal `MissionAttempt` with
`mode: 'adventure'` on the shared storage, sync and evidence pipeline (so it also feeds
support fading and parent progress). Starting, answering, hints, retries, pausing and
declining spend nothing. When the attempt completes, `completeAdventureMission` calls
`spendMissionArrow`, which records the attempt ID in the daily session
(`missionAttemptIds`, read back from storage so a stale copy cannot charge twice) and spends
one arrow (one hit only if no response was incorrect), then grants one `awardAttemptRewards`
completion reward that continues no arithmetic hit streak. Supported completion is rewarded.
The charge never exceeds the daily limit.

**Server.** `saveMissionAttemptInDb` adds one arrow to `sessions.arrows_used` only on the
write that moves an `adventure` attempt to completed, so retries, stale snapshots and
repeated syncs charge once. A mission completed offline is charged when it first syncs.

**Recovery.** A paused Adventure mission resumes (offered again on return, once per page
view). Training and Adventure resume separately, so neither hijacks the other. The charge is
made right after the completing response is saved; a crash between those two writes loses the
arrow charge and reward for that one mission rather than risking a double charge.

**Compatibility.** `mode` is widened on schema version 1. An older client or API rejects an
`adventure` attempt, so deploy the API first and keep the Adventure switch off until clients
update.

## Challenge missions

A Challenge mission is a `MissionAttempt` with `mode: 'challenge'`: independent problems with
no hints and no time pressure, for checking what the child can do unaided. Training's
**Thử thách suy luận** button opens it for the families the parent enabled (none enabled, no
button; arithmetic is unchanged).

- **Independent only.** `startMissionAttempt` rejects a guided mission in this mode, and the
  support chooser, suggestion text and hint button are not shown.
- **No hints.** `recordMissionHint` throws for a Challenge attempt, so a saved attempt carrying a
  hint fails `restoreMissionAttempt` in the browser and the API alike.
- **No reveal, no clock.** A wrong answer says only to reread the question and try again, rather
  than explaining the relationship as Training does. Step time is recorded as usual and never
  displayed or scored. The finished question shows its worked solution.
- **No arrow, no reward.** Challenge is unlimited like Training; the server charges an arrow only
  for `adventure`. Paying a reward here would let unlimited retries farm XP.
- **Evidence.** It uses the shared storage, sync and progress pipeline, so independent results feed
  support fading, focus and parent summaries. Challenge resumes separately from Training and
  Adventure.

**Compatibility.** `mode` is widened on schema version 1. An older client or API rejects a
`challenge` attempt, so deploy the API first.

## Disabled families and the arithmetic fallback

Every selector takes the parent's enabled families: the Training chooser, `recommendFocus`,
`chooseAdventureMission` and `shouldOfferAdventureMission`. `getResumableMission(playerId,
storage, mode, enabledFamilies)` applies the same rule to resuming: a paused mission whose
family was disabled afterwards is not reopened in Training or offered again in Adventure, and
its evidence stays saved and counted in progress. With no family enabled there is no Training
entry, no Challenge entry and no Adventure offer, so the child sees only the arithmetic game.

## Arithmetic and reasoning in the parent dashboard

Reasoning evidence lives in its own store and panel; arithmetic accuracy, the add/subtract
comparison and the recommendations are computed from arithmetic attempts only. An Adventure
mission does spend one of the day's arrows, so `today.missionArrows` reports how many of
`arrowsUsed` were missions and the dashboard prints that count beside the total. On a day
that included missions, the session's `hits` (which also count mission hits) are not used as
a stand-in for arithmetic accuracy, in either today's figure or the daily history. The count
comes from `DailySession.missionAttemptIds`, which server-hydrated sessions do not carry, so
treat it as a floor on those devices.
