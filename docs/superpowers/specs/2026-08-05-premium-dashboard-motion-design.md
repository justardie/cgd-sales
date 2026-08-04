# Premium Dashboard Motion Design

## Goal

Raise the existing CGD Sales Overview and shared application shell to a premium SaaS quality level through restrained motion, clearer loading feedback, and consistent interaction states without changing data, authentication, routing, APIs, or business logic.

## Existing Architecture

- Next.js 16 App Router, React 19, TypeScript.
- Tailwind CSS 4 plus global CSS tokens and inline component styles.
- Recharts for the Overview line chart and Lucide for icons.
- Shared `DashboardShell`, `Header`, `Sidebar`, `NotificationBell`, `Modal`, `ConfirmModal`, and toast provider.
- No animation library. Existing motion is CSS-based but uses scattered timing and incomplete reduced-motion handling.

## Direction

Keep the current CGD deep-navy glass surfaces, orange accent, Inter typography, card layout, and light theme. The signature is a single restrained “data wakes in sequence” moment: greeting, KPI values/rings, chart, then supporting sections. This is motion hierarchy, not a redesign.

KPI cards stay iconless to preserve the approved card language. Existing Lucide icons remain in navigation and functional feedback only. Emoji will not be introduced as UI icons.

## Motion System

CSS variables in `globals.css` define fast, base, panel, and data durations plus natural entrance and standard easing. Existing card/section/table animations consume these tokens instead of independent timings.

Animations prioritize `opacity` and `transform`. Progress and SVG ring changes retain value-driven transitions. Decorative infinite motion is removed or disabled; loading animation remains allowed. A global `prefers-reduced-motion: reduce` block disables non-essential animation and smooth scrolling while preserving state changes.

## Components

Add only:

- `AnimatedNumber`: requestAnimationFrame-based number interpolation that runs when the numeric value changes, keeps existing formatting, exposes the final value to assistive technology, and renders immediately for reduced-motion users.
- `DashboardSkeleton`: fixed-size Overview placeholders for KPI and chart content to prevent false zero values and layout shift while loading.

Modify:

- Overview: loading skeleton, animated numeric KPI values, consistent stagger, native Recharts reveal, progress transitions, stable tabular numeric widths.
- DashboardShell: subtle pathname page entrance.
- Header and Sidebar: consistent hover, active, focus-visible, and press feedback.
- NotificationBell: one short bell response when notification count changes and a consistent dropdown reveal.
- Modal and ConfirmModal: shared backdrop fade and small panel entrance.
- Toast: consistent entrance and interaction feedback; no new notification architecture.

## Loading, Empty, and Error States

Overview loading uses skeletons only where data would otherwise display misleading zeroes. Existing empty text remains, with improved visual hierarchy. Dashboard query/error behavior is not changed because it would require data-flow and API semantics outside this visual scope.

## Responsive and Accessibility

- Preserve current responsive layouts at 375, 768, 1024, and 1440 px.
- No horizontal overflow or animation-driven scroll.
- Visible `:focus-visible` rings for keyboard users.
- `prefers-reduced-motion` is applied globally.
- Counters use tabular numerals and stable containers to avoid layout shift.
- Motion never blocks interaction and is not announced repeatedly by screen readers.

## Performance

No dependency is added. CSS and native browser APIs cover the requirement. Recharts’ existing animation support is reused. There is no Lottie asset, parallax, scroll-jacking, continuous icon animation, or large blur animation. Below-fold scroll reveal is deliberately omitted because the current page already has sufficient hierarchy and animating every section would be distracting.

## Testing and QA

- Add a contract test for motion tokens, global reduced motion, stable loading placeholders, animated numbers, Recharts timing, and shared interaction classes.
- Run the existing contracts, lint, and production build.
- Visually inspect dark/light at mobile, tablet, laptop, and desktop widths.
- Verify navigation, filters, modal controls, notification dropdown, loading, empty chart data, focus states, reduced motion, and absence of horizontal overflow.

## Explicit Non-Goals

- No new Task, Meeting, Calendar, or other routes absent from the application.
- No database, authentication, API, routing, role, or sales calculation changes.
- No font, chart, icon, UI, or animation dependency replacement.
- No total visual redesign and no speculative component framework.
