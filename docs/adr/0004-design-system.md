# ADR 0004: Adopting the Homebody design system

- **Status:** accepted
- **Date:** 2026-10-11

## Context

[ADR 0002](0002-deferred-visual-design.md) kept the visual layer provisional
until the design arrived. It has: a design system named Homebody (tokens for a
dark and a light theme, type, spacing, radius, and component specs for Button,
Chip, SegmentedControl, StatTile, SetTracker, RestTimer, ExerciseCard,
HeatScale and TabBar) and a canvas of screen mockups (Today, Workout, Muscle
map, Progress, Library, Body, plus a README hero) in both themes.

## Decision

1. **Tokens map one to one.** `src/styles/tokens.css` uses the design
   system's token names (`--bg`, `--surface`, `--ink`, `--accent`,
   `--accent-ink`, `--good`, `--heat-0` … `--heat-4`, `--radius-m`, …) with
   its exact values for both themes. A short, clearly marked block holds the
   few app-level tokens the system does not name (plate colors, the photo
   plate, the viewer overlay, control sizes); they are derived from system
   tokens where possible.
2. **Usage rules are followed as written:** one accent action per screen,
   `accent-ink` for accent text on a surface, `on-accent` on accent fills,
   the heat ramp only for training load, `good` only for done and improving,
   no shadows on cards.
3. **Fonts are bundled, not hosted.** The system specifies Archivo (expanded,
   weight 800) for display, Geist for text and Geist Mono for data, and
   suggests loading them from Google Fonts. Homebody makes no third-party
   requests, so the same variable fonts ship with the app through Fontsource.
4. **Cyrillic display text falls back to Geist.** Archivo has no Cyrillic
   glyphs. The display stack is `Archivo → Geist → system`, so Russian titles
   render in Geist at the display weight instead of an arbitrary system font.
   Numbers stay in Archivo in both languages.
5. **Navigation follows the design:** five tabs (Plan, Progress, Muscles,
   Body, Library), settings behind a gear in the header, no tab bar on the
   workout screen, and a left rail on wide screens. The calculator screen is
   called Progress, and the exercise library becomes a screen of its own.
6. **The mockups are the reference for layout,** not for scope. Each mockup
   shows one phone screen; features required by the product that a mockup
   does not show (editing a prescription, technique, replacement lists, the
   settings screen) are built with the same components and tokens.
7. **Restyling was done screen by screen** in `style:` commits that do not
   change application logic. A test now checks that every custom property a
   stylesheet uses is defined in the token file and that raw colors appear
   nowhere else.

## Consequences

- Design values live in one file and can be re-synced with the design system
  by comparing `tokens.css` against its `tokens.json`.
- The Russian UI is not typographically identical to the English one in
  display text. A display face with Cyrillic support at an expanded width
  would remove the difference; that is a design decision to revisit.
- The fonts add about 130 KB of WOFF2 for a Latin-only session (Archivo
  carries its width axis); subsets for other scripts load only when used.
