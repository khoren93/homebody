# Progress

Homebody is built in small, shippable steps. Each step is one commit (or a few
tightly related ones) that leaves the project building, linted and tested.

## Steps

### Foundation

- [x] 1. Initialize repository
- [x] 2. Architecture overview and stack ADR
- [ ] 3. Scaffold Vite + React + TypeScript app
- [ ] 4. Lint, format and git hooks
- [ ] 5. Makefile
- [ ] 6. Docker and compose setup
- [ ] 7. CI workflow and Dependabot

### Data and engine

- [ ] 8. Exercise dataset, schema and validation
- [ ] 9. Engine: plan builder
- [ ] 10. Engine: load calculator, e1RM and progression
- [ ] 11. Engine: volume and muscle-load analytics

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
  the stack decision record (`docs/adr/0001-stack.md`), including the two
  version pins (TypeScript 6.0.x, ESLint 9.x) and the reasons for them.
