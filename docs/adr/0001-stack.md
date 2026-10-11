# ADR 0001: Technology stack

- **Status:** accepted
- **Date:** 2026-10-11

## Context

Homebody is a home workout planner and load calculator. It has to work
offline, keep all data on the device and be approachable for outside
contributors. The core of the product is a calculation engine whose results
must be easy to verify. There is no backend and none is planned.

The stack therefore has to provide: a fast static build, strict typing, a
storage layer that can hold photos, localization with proper plural rules, and
a test setup that covers both pure logic and real browser behaviour.

## Decision

| Concern | Choice | Why |
|---|---|---|
| Runtime | Node 24 (pinned in `.nvmrc`) | Long-term support release line. |
| Package manager | pnpm | Fast, strict about undeclared dependencies, deterministic lockfile. |
| Build | Vite | Static output, instant dev server, first-class PWA and test integrations. |
| Language | TypeScript, `strict` | The engine is numeric code with many small shapes; types catch most mistakes before tests do. |
| UI | React (function components, hooks) | The most widely known option, which lowers the barrier for contributors. |
| State | Zustand | A single store with plain actions and selectors, no boilerplate, usable outside React in tests. |
| Storage | Dexie over IndexedDB | Photos and history do not fit `localStorage` limits; Dexie adds schema versions and a small typed API. |
| Validation | Zod | One schema definition yields both runtime validation and static types for the dataset, stored state and backups. |
| i18n | i18next + react-i18next | Mature, JSON resources, CLDR plural rules (needed for Russian). |
| Styling | CSS Modules + custom properties | Scoped class names with no runtime cost; themes are a matter of swapping token values. |
| Charts | Hand-written SVG components | The app needs two simple chart types; a chart library would outweigh the rest of the bundle. |
| Fonts | Bundled via Fontsource | No requests to third-party hosts; works offline. |
| Routing | A small hash router in the codebase | A handful of routes do not justify a dependency, and hash routes work on any static host. |
| PWA | vite-plugin-pwa (Workbox) | Installability and offline precaching generated from the build. |
| Unit tests | Vitest + Testing Library | Shares the Vite pipeline; fast enough to run on every commit. |
| E2E tests | Playwright | Real browsers, phone and desktop viewports, also used to capture README screenshots. |
| Lint and format | ESLint (typescript-eslint, react-hooks, jsx-a11y) + Prettier | Catches accessibility and hook mistakes early; formatting is never discussed in review. |
| Git hooks | lefthook | A single binary and a single config file; runs lint and format on staged files. |
| Container | Docker multi-stage, nginx runtime | A reproducible build and a tiny static image for self-hosting. |
| CI/CD | GitHub Actions, GitHub Pages | Free for public repositories; the demo is a static site. |

### Version pins

Dependencies are installed at their latest stable release, with two
exceptions forced by peer dependency ranges at the time of writing:

- **TypeScript 6.0.x** rather than 7.x: `typescript-eslint` supports
  TypeScript below 6.1 only.
- **ESLint 9.x** rather than 10.x: `eslint-plugin-jsx-a11y` supports ESLint up
  to 9 only.

Both pins should be lifted as soon as the plugins catch up. Dependabot keeps
everything else current.

## Consequences

- The app is a set of static files and can be hosted anywhere, including
  GitHub Pages and a plain nginx container.
- All data lives in the browser profile. Clearing site data deletes it, so the
  backup export/import feature is a first-class part of the product.
- No server-side rendering. The first paint depends on JavaScript, which is
  acceptable for an installable app and keeps the architecture simple.
- Charts, routing and the body map are owned code. They are small, but they
  are ours to maintain.
- Two toolchain packages are held one major version back until their plugin
  ecosystems support the newer releases.
