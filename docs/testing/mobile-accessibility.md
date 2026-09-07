# Phase 4 basic accessibility

P4-A11Y-01, verified 2026-09-07 with React component tests and static checks.

- Shared actions have a minimum 52-point height / 48-point width, wrapping text,
  accessible labels, button roles and disabled/selected/expanded state.
- Selection has a visible checkmark, not color alone. Service cards are at least
  112 points high. Text scaling remains enabled; labels are not truncated.
- Primary text/background pairs exceed 4.5:1 contrast; secondary control borders
  exceed 3:1. These ratios are calculated in `components.test.tsx`.
- Results default to a list with filters and extended evidence collapsed. Price,
  separate opening/service status, freshness/confidence and safety warnings stay
  visible. Navigation is before extended evidence. All evidence remains expandable.
- Loading/result counts announce politely; errors use alert semantics. Modal close
  actions and the underlying list are available without interacting with a map.
- Tests render the real React components in EN/FR/ES and activate their handlers;
  native host views are adapters, not an emulated device or a pixel-layout engine.

This is a basic implementation check, not WCAG certification. VoiceOver/TalkBack
focus traversal, native modal focus restoration, large-font layout on small screens,
sunlight/one-handed usability and measured time-to-navigation need Phase 5 device
regression. No ten-second decision-time claim has been experimentally verified.
