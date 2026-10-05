# M5 adaptive practice

Status: support fading and weakest-relationship focus are implemented in Training.
Adventure, Challenge, one-arrow rewards and dashboard comparisons remain M5 work.
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
