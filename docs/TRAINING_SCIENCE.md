# Training science

This document explains what Homebody calculates and where the numbers come
from. Every rule described here is implemented in [`src/engine/`](../src/engine)
and pinned by tests.

Homebody is a planning aid, not a coach and not medical advice. The models are
deliberately simple, transparent and conservative: they give a sensible
starting point and then follow what you actually do.

## 1. Building the plan

### 1.1 Split

The number of training days per week selects the split.

| Days | Split                          | Rotation                         |
| ---- | ------------------------------ | -------------------------------- |
| 1    | Full body                      | A                                |
| 2    | Full body                      | A · B                            |
| 3    | Full body                      | A · B · C                        |
| 4    | Upper / lower                  | UA · LA · UB · LB                |
| 5    | Upper / lower + full body      | UA · LA · FC · UB · LB           |
| 6    | Push / pull / legs             | PA · QA · GA · PB · QB · GB      |
| 7    | Push / pull / legs + full body | PA · QA · GA · PB · QB · GB · FC |

With up to three days every muscle is trained each session, which is the most
effective use of a low frequency. From four days on the work is spread so that
each muscle still gets trained about twice a week while having at least 48
hours to recover.

### 1.2 Templates and slots

A session template is an ordered list of **movement-pattern slots**, most
important first. Full body A, for example, is

```
squat → horizontal push → horizontal pull → hinge → vertical push → core → biceps → calves
```

Each slot is filled with one exercise from the dataset:

1. Take every exercise that has the slot's pattern and can be done with the
   equipment you own. Weighted exercises come before bodyweight ones, because
   they can be loaded precisely.
2. If you chose a replacement for this slot, use it (as long as it is still
   doable and not excluded).
3. Otherwise take the three best candidates of the best kind and rotate
   between them by template variant, so that A, B and C days do not repeat the
   same exercise for the same pattern.
4. An exercise is never used twice in one session, and excluded exercises are
   never used at all.
5. If nothing fits, the slot falls back to a related pattern
   (vertical pull → horizontal pull, chest fly → horizontal push, rear delts →
   delts) or is dropped.

Exercises marked `swapOnly` in the dataset are offered as replacements but are
only picked automatically when nothing else fits.

### 1.3 Fitting the session into your time

The estimated duration of a session is

```
5 min warm-up
+ for each exercise:
    sets × set time + (sets − 1) × rest + 1 min to set up
+ 2 min of ramp-up sets before the first heavy compound exercise
```

where the set time is `reps × 3.5 s + 8 s` (doubled for one-sided exercises,
and `0.8 × longest hold + 8 s` for timed holds), and the rest depends on the
goal:

| Goal        | Compound reps  | Isolation reps | Rest compound | Rest isolation |
| ----------- | -------------- | -------------- | ------------- | -------------- |
| Hypertrophy | 6–10 (aim 8)   | 10–15 (aim 12) | 1:45          | 1:10           |
| Strength    | 4–6 (aim 5)    | 8–12 (aim 10)  | 2:30          | 1:30           |
| Endurance   | 10–15 (aim 12) | 12–20 (aim 15) | 1:00          | 0:45           |

The session is then assembled greedily:

1. Add exercises in slot order with **two sets** each while they fit the
   budget, up to about one exercise per 7.5 minutes (never fewer than 3 or
   more than 8).
2. With the time that is left, raise exercises to **three sets**, compound
   movements first.
3. If there is still time, raise compound movements to **four sets** (not for
   the endurance goal, where shorter rests already make sessions dense).

### 1.4 The four-week block

Effort is prescribed as **reps in reserve (RIR)**: how many more repetitions
you could have done at the end of a set.

| Week | Phase        | RIR | Notes                                               |
| ---- | ------------ | --- | --------------------------------------------------- |
| 1    | Introduction | 3   | Learn the movements, leave plenty in the tank.      |
| 2    | Working      | 2   |                                                     |
| 3    | Peak         | 1   | Hardest week of the block.                          |
| 4    | Deload       | 4   | One set fewer per exercise, about 90 % of the load. |

Fatigue accumulates over the three hard weeks; the deload lets joints and the
nervous system recover so the next block can start from a higher level. The
deload can be switched off, in which case week 4 repeats week 3. Longer plans
simply repeat the block.

A session keeps the date it was originally planned for as its identity. When
you do a missed session later, the rest of the plan shifts forward by the same
number of days, and the order and progression stay intact.
