# Progress

Homebody is built in small, shippable steps. Each step is one commit (or a few
tightly related ones) that leaves the project building, linted and tested.

## Steps

### Foundation

- [x] 1. Initialize repository
- [x] 2. Architecture overview and stack ADR
- [x] 3. Scaffold Vite + React + TypeScript app
- [x] 4. Lint, format and git hooks
- [x] 5. Makefile
- [x] 6. Docker and compose setup
- [x] 7. CI workflow and Dependabot

### Data and engine

- [x] 8. Exercise dataset, schema and validation
- [x] 9. Engine: plan builder
- [x] 10. Engine: load calculator, e1RM and progression
- [x] 11. Engine: volume and muscle-load analytics

### Application core

- [x] 12. i18n with English and Russian locales and a language switch
- [x] 13. Persisted store, migrations and IndexedDB adapters
- [x] 14. Design tokens, theme and app shell with tab navigation

### Features

- [x] 15. Settings: profile, schedule, equipment, load scale
- [x] 16. Plan: overview, next-session hero, weeks list, next block
- [x] 17. Session: workout screen with exercise cards, swap, exclude, edits
- [x] 18. Session: set tracker, rest timer, wake lock, rating
- [x] 19. Plan: missed-session move and skip
- [x] 20. Calculator: progression tables and charts
- [x] 21. Muscles: body map with heat modes and muscle detail
- [x] 22. Muscles: exercise library with search, filters and densities
- [x] 23. Body: weight, girths, body fat, charts
- [x] 24. Body: progress photos with compare
- [x] 25. Settings: backup export/import and reset

### Release

- [x] 26. PWA install and offline support
- [x] 27. End-to-end tests (onboarding, workout, swap, backup)
- [x] 28. Deploy demo to GitHub Pages
- [ ] 29. Full README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, templates
- [ ] 30. Screenshots and demo GIF
- [ ] 31. Release v0.1.0

## Log

- **2026-10-11 — Step 1.** Repository initialized: ignore rules (the local
  `reference/` prototype bundle is never committed), editor config, Node
  version pin, MIT license, README stub and this plan.
- **2026-10-11 — Step 2.** Architecture overview (`docs/ARCHITECTURE.md`) and
  the stack decision record (`docs/adr/0001-stack.md`), including the
  version pins and the reasons for them.
- **2026-10-11 — Step 3.** Vite + React + TypeScript scaffold with strict
  compiler options (including `noUncheckedIndexedAccess`), the `@/` path alias,
  Vitest with Testing Library and a smoke test. pnpm is pinned to the 10.x
  line through `packageManager`.
- **2026-10-11 — Step 4.** ESLint 10 flat config (typescript-eslint type-checked
  rules, react-hooks, jsx-a11y, import sorting, purity rules for `src/engine`),
  Prettier, and lefthook hooks: lint and format staged files on commit,
  commitlint for Conventional Commits. ESLint 9 turned out to be unsupported,
  so the ADR was updated: the only remaining language pin is TypeScript 6.0.x.
- **2026-10-11 — Step 5.** Self-documenting `Makefile` with the install, dev,
  build, preview, test, coverage, lint, format, typecheck, check and clean
  targets. Docker, data and e2e targets are added in the steps that introduce
  them.
- **2026-10-11 — Step 6.** Multi-stage `Dockerfile` (deps, build, unprivileged
  nginx runtime with a health check), `nginx.conf` (SPA fallback, immutable
  caching for hashed assets, no-cache for the shell and service worker, gzip,
  security headers including a CSP), `docker-compose.yml` with the `app` and
  `dev` services, and the `docker-*` Makefile targets. Verified: image builds,
  runs as uid 101, health check passes, dev server serves with hot reload.
- **2026-10-11 — Step 7.** GitHub Actions CI (lint, format check, typecheck,
  unit tests with coverage, build, plus a job that builds the Docker image) on
  pushes to `main` and on pull requests; Dependabot for npm (grouped), GitHub
  Actions and Docker. The workflow has not run yet because nothing has been
  pushed.
- **2026-10-11 — Step 8.** Exercise dataset migrated to `data/exercises.json`:
  stable English muscle ids, readable pattern ids, localized names (awkward
  upstream English names cleaned up), implement-specific names and the fixed rep
  range moved into data, instructions written for the two exercises that had
  none. Zod schema in `src/data/schema.ts`, typed loader, 282 photos under
  `public/exercises/<id>/`, `make data-validate` (schema + photo integrity, also
  in CI) and `make data-build` (sync photos and draft records from
  free-exercise-db).
- **2026-10-11 — Step 9.** Plan builder ported to `src/engine`: splits,
  templates, slot filling (swaps, exclusions, variant rotation, fallbacks,
  swap-only exercises), time fitting, the four-week block and shifted sessions,
  plus swap pools with an injected random source. 132 tests, including parity
  tests that compare 23 scenarios with golden plans recorded from the prototype
  engine; engine coverage is gated at 90 % in the Vitest config.
  `docs/TRAINING_SCIENCE.md` documents the planning rules.
- **2026-10-11 — Step 10.** Load calculator ported: baseline capacities (level,
  sex, age, body weight at plan start), Epley e1RM with reps in reserve, weight
  selection from the owned weights with explanatory note keys, weekly
  progression, deload rules, edits and ratings that re-anchor the estimate, load
  scale, warm-up sets, plate breakdown and the next-block carry-over. Parity
  tests compare every prescription of the 23 scenarios with the prototype (211
  tests in total). The engine returns new objects instead of mutating the plan.
- **2026-10-11 — Decision.** The visual design is delivered separately. Until
  then UI steps are built functionally with minimal, token-driven styling and
  small shared components, so the look can be replaced without touching logic
  ([ADR 0002](adr/0002-deferred-visual-design.md)). Screenshots and the README
  hero wait for the final design.
- **2026-10-11 — Step 11.** Analytics added to the engine: planned weekly volume
  per muscle (parity-tested against the prototype), performed muscle load over 7
  days, 30 days or all time, optimal ranges with small-muscle scaling, heat
  tiers, history entries and per-exercise history summaries. 265 tests; engine
  coverage 98 % statements, 95 % branches.
- **2026-10-11 — Step 12.** i18next with English (fallback) and Russian
  resources, type-checked translation keys, language detection (saved choice,
  then browser languages, then English), a language switch that remembers the
  choice and updates the document language, Russian plural forms, and
  `Intl`-based number and date formatting. Base strings (navigation, muscles,
  equipment, templates with their focus, phases, ratings, engine notes) are in;
  feature strings are added with each screen. Tests keep the locales in sync:
  same keys, same interpolation variables, all plural forms.
- **2026-10-11 — Step 13.** Zustand store over a versioned, Zod-validated state
  document with a migration chain; Dexie database with separate tables for
  state, history, set logs and photos; a `Persistence` port with IndexedDB and
  in-memory implementations; diff-based writes (debounced state, row-level
  history and set logs); safe handling of unreadable data and of unavailable
  storage; the memoized derived plan (`usePlan`) and `useToday`. Feature actions
  are added as pure transforms with their screens. ADR 0003 records the model.
  339 tests.
- **2026-10-11 — Step 14.** Provisional design tokens in `src/styles/tokens.css`
  (one definition per token with `light-dark()`, system fonts for now), base
  element styles, theme switching (system, light, dark) applied before first
  paint by a CSP-friendly external script, the hash router, the app shell with
  skip link, storage notices and a bottom tab bar, loading and unreadable-data
  screens, and the first shared components (Button, Panel, Segmented, Chip,
  Banner, Field, Stat, ProgressBar, Icon, layout primitives). Screens other than
  Settings are placeholders until their steps. 376 tests.
- **2026-10-11 — Step 15.** Settings screen: profile (age, height, body weight,
  sex, experience, goal), overall load scale (slider and quick steps), schedule
  (training days, session length, start, plan length, deload) and equipment
  toggles with dumbbell and kettlebell lists and bar configuration. After an
  equipment change the screen says which exercises entered and left the plan.
  Store changes are pure transforms in `src/store/transforms`, bound to the
  store as `actions`. Numeric fields accept decimal commas and commit on blur or
  Enter. 404 tests.
- **2026-10-11 — Step 16.** Plan screen: sample-plan banner with a link to the
  settings, next-session hero (template name with its focus, date, duration,
  effort, exercises), key figures, weeks with their phase and sessions that can
  be ticked off (which records history), next-block panel with confirmation, and
  planned weekly volume against the optimal range with a link to the muscle map.
  Session transforms (`toggleSessionDone`, `startNextBlock`) and session
  selectors are covered by tests. 430 tests.
- **2026-10-11 — Step 17.** Workout screen: session header with focus and effort
  explanation, exercise cards (animated start/end photos with a full-screen
  viewer, localized and implement-aware names, muscles, sets and reps, load with
  per-hand and per-side hints, plate breakdown, rest, RIR, e1RM with an
  on-demand explanation, warm-up sets, notes), editing of weight and reps with
  "restore calculation", manual and random replacement with undo, and exclusion
  with a restore list in the settings. Edits to a finished session rewrite its
  recorded result. Shared Dialog and Disclosure components. 458 tests.
- **2026-10-11 — Design.** The Homebody design system and screen mockups
  arrived ([ADR 0004](adr/0004-design-system.md)). Its tokens and fonts are
  adopted first; components and screens are then restyled one by one in
  `style:` commits that leave the logic untouched. Screens built after this
  point follow the design from the start.
- **2026-10-11 — Step 18.** Set tracker, rest timer, wake lock and effort
  rating, built to the design system specs. Ticking a set starts a rest
  countdown that names what comes next (adjust by 15 s, skip, beep and vibration
  at zero); the last set of an exercise records it and the last set of the
  session marks it done. Ratings (easy, on plan, hard, missed) adjust later
  loads and show a preview of the next session. The header shows the current set
  and a progress ring, and the screen stays awake during a workout. 484 tests.
- **2026-10-11 — Step 19.** Missed sessions: a banner on the plan (for the
  earliest missed session) and on the workout screen offers "Do it today", which
  shifts that session and everything after it by the same number of days, or
  "Skip", which leaves it out of the plan and can be undone. Rows show missed,
  not finished, skipped and moved states. 492 tests.
- **2026-10-11 — Step 20.** Progress screen (the calculator), built to the
  mockup: one expanded card per exercise with its headline capacity, a chart
  (solid for done, dashed for the plan, today marked), the history summary and
  gain, and the session-by-session table with links to the workouts; the other
  exercises are compact rows with sparklines. The same details are available
  inside each workout card. Charts are hand-written SVG with tested scale
  geometry. 518 tests.
- **2026-10-11 — Step 21.** Muscle map, built to the mockup: front and back
  figures with 17 zones that are real buttons (Tab, Enter, Space), three modes
  (overview, done over 7 days, 30 days or all time, and planned weekly volume),
  five heat tiers with a glow for optimal and a pulse for overloaded zones (off
  under reduced motion), the legend, a ranked bar list, and a detail sheet per
  muscle (description, sets, weekly target, time since trained, recovery
  warning, no-direct-work hint, link to its exercises). Mode and selection live
  in the URL. 530 tests.
- **2026-10-11 — Step 22.** Exercise library as its own screen, built to the
  mockup: search across names in both languages, muscles and equipment; filters
  for all, owned gear and in plan; a scrolling row of muscle chips with counts
  (kept in the URL, so the muscle map links into it); and three densities
  (compact list, grid, detailed cards) remembered on the device. Detailed cards
  show muscles, equipment, type, difficulty, the next prescription, the current
  capacity, technique and exclude or restore. 546 tests.
- **2026-10-11 — Step 23.** Body screen, built to the mockup: log form for
  weight and six girths (decimal commas accepted, empty fields skipped),
  headline figure with the change since the first entry, a chart with a metric
  switch, tiles for body fat (US Navy formula, sex-specific), girths and BMI
  with its category, and a journal with delete. Body-metric formulas live in the
  engine with tests. 574 tests.
- **2026-10-11 — Step 24.** Progress photos: add a photo for a date and pose
  (front, side, back), compressed in the browser to at most 900 px before it is
  stored in its own IndexedDB table; side-by-side comparison of any two photos
  of a pose with the days, weight and waist change between them; thumbnails; a
  full-screen viewer with a delete that asks twice. Photos are loaded lazily and
  never leave the device. 583 tests.
- **2026-10-11 — Step 25.** Backup and reset in the settings. Export writes
  everything (state, history, set logs, photos) to
  `homebody-backup-YYYY-MM-DD.json` through a normal browser download; import
  validates the file, shows a preview with counts and replaces the data only
  after confirmation. Backups of the earlier prototype are recognised and
  converted. "Restore the automatic calculation" clears edits, replacements,
  carried capacities and the load scale; "Erase all data" wipes the device; both
  ask first. This completes feature parity with the prototype. 601 tests.
- **2026-10-11 — Step 26.** PWA: web manifest with icons rendered from the mark,
  a service worker that precaches the app shell, fonts and all exercise photos
  (314 entries, about 9 MB) so the whole app works offline, and an update prompt
  that never reloads mid-workout. Verified in Chrome: after one visit the app,
  the library and its photos load with the network off. Secondary screens are
  lazy-loaded, libraries and the dataset have their own chunks, and index.html
  paints the mark before any script runs. Lighthouse (mobile, production
  container): performance 87, accessibility 100, best practices 96, SEO 100.
  Deferred: performance is 3 points under the 90 target on the local container;
  the remaining cost is the size of the critical scripts, to be re-measured on
  the deployed demo. The one best-practices finding is Dexie probing `new
Function`, which the Content-Security-Policy blocks harmlessly.
- **2026-10-11 — Step 27.** Playwright end-to-end tests against the production
  build on a phone and a desktop viewport (20 runs): first launch and switching
  to own data, language and theme persistence, navigation, a full workout with
  rest timer, rating, edit and history, moving a missed session, manual and
  random replacement with undo, excluding and restoring, and backup export,
  erase and import. They run in CI. The tests exposed that state writes were
  delayed by a debounce; the state document is now written immediately.
- **2026-10-11 — Step 28.** GitHub Pages deployment workflow: on every push to
  `main` the app is built for the repository sub-path and published with the
  official Pages actions. Verified locally by serving a `/homebody/` build from
  a plain static server (app, photos and service worker scope all resolve). The
  job is skipped while the repository is private, because Pages needs a public
  repository on the free plan; it has therefore not run yet.
