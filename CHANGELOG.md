# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Exercises.** The Muscles and Library screens are one screen now, so the app has four tabs.
  The body map stays on top and picks a muscle; the chips with the number of exercises per muscle
  sit under it and do the same. Below them is the whole catalog with its search, filters and
  three levels of detail, in every map mode. The period of the “Done” mode is a row of chips under
  the mode switch. The screen lives at `#/exercises`; `#/muscles` and `#/library` are gone.
- Screens are wider on large displays, so a week of three sessions fits on one row of the plan.
  Charts gain width instead of growing taller, and the muscle chips wrap.
- Menus are drawn in the app's own style and have the same height as the other form fields.

## [0.1.0] - 2026-10-11

The first release.

### Added

- **Plan.** A training plan built from the days you train, the length of a session and the
  equipment you own: full body, upper/lower or push/pull/legs, in four-week blocks with a deload
  week. The next block continues from the level you reached. A missed session can be done today,
  shifting the rest of the plan, or skipped.
- **Load calculator.** Weights, reps and holds for every set, picked from the weights you own.
  Starting points come from body weight, experience, sex and age; progression is driven by the
  estimated one-rep max and reps in reserve. Editing a set or rating its effort recalculates
  everything after it. Warm-up sets and a plate breakdown for barbells.
- **Workout.** One card per exercise with photos, technique, a set tracker and a rest timer with
  sound and vibration. Exercises can be swapped by hand or at random for an alternative that trains
  the same muscles. The screen stays awake during a session.
- **Progress.** A chart of the estimated one-rep max for every exercise, what you did against what
  the plan expects, with the table of sessions behind it.
- **Muscles.** A front and back body map of 17 muscle groups that shows weekly volume as a heat
  map, planned or performed, rated against the optimal range of your goal.
- **Library.** 141 exercises with search, a filter by muscle and three levels of detail.
- **Body.** Weight and six girths with charts, BMI, body fat by the US Navy method, and progress
  photos by pose with a side-by-side comparison.
- **Your data.** Everything is stored in the browser, with a single-file backup and restore.
  Backups of the original prototype can be imported.
- **App.** Installable and fully usable offline, in English and Russian, with a light and a dark
  theme.
- **For contributors.** A tested, framework-free training engine, a validated exercise dataset
  with a script that adds exercises from free-exercise-db, Docker images, continuous integration
  and documentation of the architecture and of every training rule.

[Unreleased]: https://github.com/khoren93/homebody/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/khoren93/homebody/releases/tag/v0.1.0
