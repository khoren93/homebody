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

## 2. Calculating loads

### 2.1 Estimated one-rep max with reps in reserve

Strength is tracked as an **estimated one-rep max (e1RM)**: the heaviest
weight you could lift once with good form. It is never tested; it is derived
from ordinary sets with the Epley formula, extended with reps in reserve:

```
e1RM = weight × (1 + (reps + RIR) / 30)
```

A set of 10 reps at 20 kg with 2 reps left in the tank counts like a set of 12
to failure: `20 × (1 + 12 / 30) = 28 kg`. For exercises with a dumbbell in
each hand the e1RM is per hand.

Bodyweight exercises use **max reps**, and timed holds use the **longest
hold**, in the same role. The app calls all three the _capacity_ of an
exercise.

### 2.2 Starting point

Before anything is logged, the capacity is estimated from the profile:

```
weighted:    ratio × body weight × level × sex × age
bodyweight:  max reps (or seconds) × level × sex × age
```

- **ratio** is stored per exercise: the e1RM of an intermediate man divided by
  his body weight (0.45 for a goblet squat, 0.38 per hand for a dumbbell bench
  press, ...). Body weight is the value logged at the plan start.
- **level:** beginner 0.55, intermediate 1.0, advanced 1.35 for weights;
  0.5, 1.0, 1.5 for reps and holds.
- **sex:** for women 0.55 (upper body) and 0.72 (lower body) for weights;
  0.6 and 0.9 for reps and holds.
- **age:** 1.0 up to 40, then 0.8 % less per year, never below 0.7.

These are population averages and only a first guess. One edited set replaces
them with your own numbers.

### 2.3 Choosing the weight

Given the e1RM, the prescribed RIR and the rep range of the goal, every weight
you own is scored by the reps it allows:

```
reps(weight) = round(30 × (e1RM / weight − 1) − RIR)

score = |reps − target|                        inside the rep range
score = 10 + 2 × (min − reps)                  below the range
score = 10 + (reps − max)                      above the range
```

The lowest score wins and ties go to the heavier weight. Going under the range
is penalised twice as hard as going over it, because too many reps are merely
inefficient while too few mean the weight is too heavy for the prescribed
effort.

When no weight lands inside the range, the app says why:

| Situation                                 | Advice                                           |
| ----------------------------------------- | ------------------------------------------------ |
| Even the lightest weight allows no rep    | Do fewer reps and build up gradually.            |
| The heaviest weight gives too many reps   | Slow the lowering phase down to three seconds.   |
| The next weight up drops reps below range | Expected with big jumps; reps recover in a week. |
| A bodyweight exercise exceeds 25 reps     | Move to a harder variation or slow it down.      |

Bodyweight exercises are prescribed at `max reps − RIR` (at most 40), timed
holds at `longest hold × (1 − 0.08 × RIR)` rounded to five seconds.

### 2.4 Progression

The capacity is expected to grow every week:

| Level        | Weighted (e1RM) | Reps and holds |
| ------------ | --------------- | -------------- |
| Beginner     | +3 %            | +6 %           |
| Intermediate | +1.5 %          | +3.5 %         |
| Advanced     | +0.75 %         | +2 %           |

Together with the falling RIR of the block this produces a classic overload
pattern: similar weights for more reps, then a step up in weight.

In a **deload week** weighted exercises use 90 % of the e1RM at RIR 4,
bodyweight exercises `(max reps − 4) × 0.8` and holds 85 % of the usual time.

### 2.5 Following what you actually do

The plan is recalculated from your results, never the other way round.

- **Edits.** When you change the weight or the reps of an exercise, its
  capacity is re-anchored to that set and every later session is recalculated
  from it.
- **Ratings.** After an exercise you can say how it went. The rating adjusts
  the reps in reserve that were actually left:

  | Rating     | Meaning                   | RIR change |
  | ---------- | ------------------------- | ---------- |
  | Easy       | Could have done 3 or more | +2         |
  | As planned | Effort was as prescribed  | 0          |
  | Hard       | At the limit              | −1         |
  | Failed     | Did not complete the reps | −2         |

- **Load scale.** A global multiplier (40–130 %) scales every calculated e1RM
  before the weight is chosen. Your own edits are never scaled.
- **Next block.** Each capacity is projected to the end of the block and
  carried into the next one, which starts on the following Monday. The load
  scale is baked into the carried values and reset to 100 %.

### 2.6 Warm-up sets and plates

The first heavy compound exercise of a session gets two ramp-up sets: 8 reps
at about 50 % and 3 reps at about 75 % of the working weight, rounded down to
weights you own. For barbell exercises the app shows which plates go on each
side, using standard plates from 25 kg down to 0.5 kg.

## 3. Weekly volume and the muscle map

### 3.1 Counting sets

Training volume is counted in **hard sets per muscle per week**. A set counts
in full for the primary muscles of an exercise and as half a set for its
secondary muscles: three sets of goblet squats are 3 sets for the quads and
1.5 each for the glutes, hamstrings and calves.

- **Planned volume** is taken from the first week of the plan (a regular,
  non-deload week).
- **Performed volume** is taken from the sets you ticked off, over the last
  7 days, the last 30 days (as a weekly average) or all time (averaged over
  the span since your first session, at least one week).

### 3.2 Volume landmarks

Each goal has a weekly range that is considered optimal for a large muscle:

| Goal        | Sets per week |
| ----------- | ------------- |
| Hypertrophy | 10–20         |
| Strength    | 8–15          |
| Endurance   | 10–20         |

Small muscles get enough indirect work from compound movements, so their
range is scaled down: calves × 0.8, traps and lower back × 0.6, forearms,
adductors and abductors × 0.5, neck × 0.4.

The muscle map colours every muscle by where its weekly volume falls:

| Tier | Volume                    | Meaning            |
| ---- | ------------------------- | ------------------ |
| 0    | none                      | Not trained        |
| 1    | below half of the minimum | Very low           |
| 2    | below the minimum         | Below optimal      |
| 3    | within the range          | Optimal            |
| 4    | above the maximum         | More than you need |

### 3.3 Recovery

A muscle that was trained as a primary mover less than 48 hours ago is marked
as still recovering.

## 4. Body metrics

### 4.1 Body fat

Body fat is estimated with the **US Navy circumference method**, from
measurements in centimetres:

```
men:    495 / (1.0324 − 0.19077 × log10(waist − neck) + 0.15456 × log10(height)) − 450
women:  495 / (1.29579 − 0.35004 × log10(waist + hips − neck) + 0.221 × log10(height)) − 450
```

The method is accurate to about ±3–4 percentage points, which is enough to
follow a trend. Results outside 2–60 % are discarded as measurement errors.

### 4.2 Body mass index

`BMI = weight (kg) / height (m)²`, with the WHO categories for adults: below
18.5 underweight, 18.5–25 normal, 25–30 overweight, 30 and above obese. BMI
does not distinguish muscle from fat, so for people who train it is a rough
indicator at best.
