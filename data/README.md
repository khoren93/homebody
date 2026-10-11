# Exercise dataset

`exercises.json` is the catalog Homebody plans from: 141 home-friendly
exercises, each with two photos (start and end position) in
`public/exercises/<id>/0.webp` and `1.webp`.

The records are curated from
[free-exercise-db](https://github.com/yuhonas/free-exercise-db), which is in
the public domain (Unlicense). Names, instructions, muscles and photos come
from upstream; the planning fields were added for Homebody.

The format is defined and documented in
[`src/data/schema.ts`](../src/data/schema.ts). Validate any change with:

```sh
make data-validate
```

## Fields

| Field                              | Meaning                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `id`                               | Stable id. Matches the upstream id and the photo folder name.                                                         |
| `name.en`, `name.ru`               | Display names.                                                                                                        |
| `patterns`                         | Movement patterns: which template slots the exercise can fill.                                                        |
| `equipment`                        | Alternatives. One inner list must be fully owned; `[[]]` means no equipment.                                          |
| `type`                             | `weighted`, `reps` (bodyweight or bands) or `timed` (holds).                                                          |
| `loadMode`                         | Weighted only: `bar`, `ez`, `pair` (one per hand) or `single`.                                                        |
| `baseline`                         | Expected level of an intermediate male: e1RM ÷ body weight (weighted, per hand for `pair`), max reps, or max seconds. |
| `repRange`                         | Optional fixed rep range overriding the goal's range.                                                                 |
| `unilateral`                       | Done one side at a time.                                                                                              |
| `compound`                         | Multi-joint movement.                                                                                                 |
| `primary`, `secondary`             | Muscle ids. Secondary muscles count as half a set.                                                                    |
| `level`                            | `beginner`, `intermediate` or `expert`.                                                                               |
| `implementNames`, `photoImplement` | Optional: names per implement when a dumbbell or a kettlebell both work, and which one the photos show.               |
| `swapOnly`                         | Optional: offered as a replacement, never picked automatically.                                                       |
| `instructions.en`                  | Technique, step by step. `instructions.ru` is optional.                                                               |

The order of the records matters: when several exercises fit a slot, the plan
builder prefers the earlier ones. Add new exercises at the end and mark them
`swapOnly` unless they should change existing plans.

## Adding an exercise

1. Find its id in free-exercise-db and create a draft record with photos:

   ```sh
   pnpm data:build --add Some_Upstream_Id
   ```

2. Fill in the curated fields of the new record in `exercises.json`.
3. Run `make data-validate` and `make test`.
