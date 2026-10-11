# Golden fixtures

These files pin the behaviour of the engine to the single-file prototype that
Homebody was rebuilt from.

- `scenarios.json` — 23 engine inputs covering every split, goal, level and
  equipment combination, plus swaps, exclusions, manual edits, ratings, load
  scaling, carried capacities and shifted sessions.
- `plan.golden.json` — the plan the prototype built for each scenario.
- `loads.golden.json` — the prescriptions and capacities it calculated.
- `volume.golden.json` — the weekly volume per muscle it reported.

The parity tests run the same scenarios through the current engine and compare
the results value by value. A failure means the numbers users see have
changed.

**Do not edit these files to make a test pass.** If a change in behaviour is
intended, describe it in the pull request and update the affected values
together with `docs/TRAINING_SCIENCE.md`.
