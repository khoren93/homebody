# ADR 0002: Visual design is deferred and replaceable

- **Status:** accepted
- **Date:** 2026-10-11

## Context

The visual design of Homebody (design system and screen mockups) is produced
separately and will arrive after the application logic is in place. The UI
steps of the plan must not block on it, and the work done before it arrives
must not have to be redone when it does.

## Decision

Until the design system is delivered, screens are built to be **functionally
complete with minimal styling**, under these rules:

1. **Tokens only.** Every color, font, spacing, radius and shadow used in a
   component comes from a CSS custom property defined in
   `src/styles/tokens.css`. Components contain no literal design values. The
   current token values are provisional placeholders.
2. **Small reusable components.** Screens are composed from a small set of
   shared building blocks in `src/components/` (button, panel, field,
   segmented control, chip, banner, chart, dialog, ...). Feature code does not
   style raw elements beyond layout.
3. **Logic stays out of the visual layer.** Components receive data and
   callbacks; training logic lives in the engine and state changes in the
   store. Restyling or replacing a component must not require touching either.
4. **Structure and accessibility are final.** Semantic markup, labels,
   keyboard support, focus handling and reduced-motion behaviour are done now,
   because they are independent of the look.
5. **No visual polish yet.** Spacing fine-tuning, illustration, animation and
   layout refinements wait for the mockups.

## Consequences

- Applying the design system should mostly mean changing token values and the
  CSS modules of the shared components, plus layout adjustments per screen.
- The app looks plain until then. Screenshots, the demo GIF and the README
  hero image are captured after the design is applied.
- Lighthouse and contrast checks are run against the provisional tokens now
  and must be repeated with the final ones.
- If the design calls for a component that does not exist yet, it is added to
  `src/components/` instead of being built inside a feature.
