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

- [ ] 12. i18n with English and Russian locales and a language switch
- [ ] 13. Persisted store, migrations and IndexedDB adapters
- [ ] 14. Design tokens, theme and app shell with tab navigation

### Features

- [ ] 15. Settings: profile, schedule, equipment, load scale
- [ ] 16. Plan: overview, next-session hero, weeks list, next block
- [ ] 17. Session: workout screen with exercise cards, swap, exclude, edits
- [ ] 18. Session: set tracker, rest timer, wake lock, rating
- [ ] 19. Plan: missed-session move and skip
- [ ] 20. Calculator: progression tables and charts
- [ ] 21. Muscles: body map with heat modes and muscle detail
- [ ] 22. Muscles: exercise library with search, filters and densities
- [ ] 23. Body: weight, girths, body fat, charts
- [ ] 24. Body: progress photos with compare
- [ ] 25. Settings: backup export/import and reset

### Release

- [ ] 26. PWA install and offline support
- [ ] 27. End-to-end tests (onboarding, workout, swap, backup)
- [ ] 28. Deploy demo to GitHub Pages
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
