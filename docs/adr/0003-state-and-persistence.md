# ADR 0003: State model and persistence

- **Status:** accepted
- **Date:** 2026-10-11

## Context

All user data stays on the device. The app needs to store a small amount of
settings and decisions, a growing log of results, and progress photos that
are two orders of magnitude larger than everything else. The training plan
itself is a function of that data and of formulas that will keep evolving.

## Decision

1. **The plan is derived, never stored.** Only inputs (profile, schedule,
   equipment) and user decisions (swaps, edits, ratings, finished and skipped
   sessions, shifts) are persisted. `derivePlan(state)` recomputes the plan on
   demand and caches it by state identity.
2. **One versioned state document** holds those inputs and decisions. It has
   a `version` field, is validated with Zod on every load and import, and is
   upgraded through a chain of migration functions keyed by source version.
3. **Separate IndexedDB tables** (through Dexie) for data that is bulky or
   append-only: `history` (one row per exercise per finished session),
   `setLogs` (ticked sets per session) and `photos`. Saving the state document
   never rewrites them.
4. **A storage port.** The store talks to a `Persistence` interface with an
   IndexedDB and an in-memory implementation. Tests use the latter; the app
   falls back to it when IndexedDB is unavailable and tells the user that
   nothing will be saved.
5. **Changes are pure transforms.** A change is a function from the current
   snapshot to the parts that changed. The store applies it and writes the
   difference: the state document after a short debounce, history rows and
   set logs row by row.
6. **Unreadable data is never overwritten.** If the stored state fails
   validation or was written by a newer version, the store enters an error
   state and stops writing, so the user can still export or recover the data.
7. **`localStorage` only for instant UI preferences** (theme, language, list
   density), which must be readable synchronously before the first paint.

## Consequences

- A formula change in the engine applies to existing users immediately and
  retroactively, with no data migration.
- Stored data is small and easy to export as a single JSON backup.
- The plan is recomputed on every state change. This takes a few milliseconds
  for the longest plans, which is acceptable; it is cached per state object.
- Session identity must be stable across recomputation. Sessions are
  identified by the date they were originally planned for, so logs and
  history keep pointing at the right session after the plan shifts.
- First launch writes nothing: the sample profile is regenerated on each
  start until the user changes something.
