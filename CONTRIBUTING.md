# Contributing to Homebody

Thank you for taking the time to contribute. Bug reports, translations, new exercises and code are
all welcome.

By participating you agree to follow the [code of conduct](CODE_OF_CONDUCT.md).

## Getting set up

You need Node.js 24, pnpm 10 and `make` (or just Docker, see the README).

```sh
make install     # install dependencies and git hooks
make dev         # start the dev server on http://localhost:5173
make check       # lint, typecheck, dataset validation, unit tests, build
make e2e         # Playwright end-to-end tests
```

`make` lists every target.

## Workflow

1. For anything larger than a small fix, open an issue first so we can agree on the approach.
2. Create a branch from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>` or `chore/<topic>`.
3. Make small, focused commits using [Conventional Commits](https://www.conventionalcommits.org):
   `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`, `style:`, `build:`, `ci:`, `chore:`.
   The subject is imperative, lower case and at most 72 characters; the body says why.
   A git hook checks the message, and formats and lints the staged files.
4. Add or update tests. `make check` and `make e2e` must pass.
5. Open a pull request and fill in the template.

## What goes where

- **Training logic** belongs in `src/engine/`. It is pure TypeScript: no React, no browser APIs,
  no `Date.now()` or `Math.random()` (pass them in). Every rule there has tests, and coverage is
  gated at 90 %.
- **State changes** are pure transforms in `src/store/transforms/`, bound to the store in
  `src/store/actions.ts`.
- **Screens** live in `src/features/<name>/` and are composed from `src/components/`.
- **Text** shown to the user always goes through `src/i18n/locales/`, in every locale.
- **Design values** (colors, sizes, radii) come from `src/styles/tokens.css`. Component styles
  never contain raw colors; a test enforces this.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) has the full picture.

### Changing the numbers

`src/engine/__tests__/fixtures/` holds golden values: the plans and prescriptions the engine is
expected to produce for a set of scenarios. If a parity test fails, the numbers users see have
changed. That is fine when it is the point of your change: say so in the pull request, update the
affected fixtures and document the new rule in
[docs/TRAINING_SCIENCE.md](docs/TRAINING_SCIENCE.md). Never edit a fixture just to make a test
pass.

## Adding an exercise

1. Find the exercise in [free-exercise-db](https://github.com/yuhonas/free-exercise-db) and note
   its id.
2. Run `pnpm data:build --add <Id>`. It appends a draft record to `data/exercises.json` and
   downloads the two photos.
3. Fill in the planning fields (see [data/README.md](data/README.md)): `name.ru`, `patterns`,
   `equipment`, `type`, `loadMode`, `baseline`, `unilateral`. Mark it `swapOnly` unless it should
   change existing plans.
4. Run `make data-validate` and `make test`.

The `baseline` deserves care: it is the expected performance of an intermediate male lifter (the
estimated one-rep max divided by body weight for weighted exercises, per hand for pairs). Look at
similar exercises in the dataset for reference and explain your value in the pull request.

## Adding a language

See the [Localization](README.md#localization) section of the README. The tests tell you which
keys, placeholders or plural forms are missing.

## Reporting bugs

Use the bug report template. The most useful reports include what you did, what you expected,
what happened, and your browser and device. A backup file (Settings → Backup) often lets us
reproduce a calculation problem directly; remove anything you do not want to share first.

## Security

Please do not report security problems in public issues. See [SECURITY.md](SECURITY.md).
