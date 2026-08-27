---
name: Chronos Precision
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#515659'
  on-tertiary: '#ffffff'
  tertiary-container: '#696e71'
  on-tertiary-container: '#edf1f5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#dfe3e7'
  tertiary-fixed-dim: '#c3c7cb'
  on-tertiary-fixed: '#171c1f'
  on-tertiary-fixed-variant: '#43474b'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-xs:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  calendar-cell-min-height: 48px
  gutter: 1px
---

## Brand & Style
The design system focuses on a **Corporate Modern** aesthetic tailored for high-density scheduling and professional time management. The brand personality is efficient, reliable, and unobtrusive, ensuring that the user's data remains the primary focus. 

The style utilizes a "Functional Minimalism" approach: maximizing whitespace within tight constraints, employing subtle tonal shifts to denote hierarchy, and maintaining a high level of legibility. The goal is to evoke a sense of organized calm, reducing the cognitive load associated with complex scheduling.

## Colors
The color strategy employs a "Signal vs. Noise" philosophy. 
- **Primary:** Reserved for active states, primary actions (Create Event), and the current date indicator.
- **Secondary:** Used for secondary navigation and metadata.
- **Tertiary:** Applied to background containers, such as the calendar grid lines and non-working hours.
- **Neutral:** Managed through a grayscale ramp to define text hierarchy and borders.

The system is designed to be theme-agnostic. When switching themes, the semantic mapping remains identical: the `primary` color always represents the "Action" and "Focus," while the `surface` tokens shift to adjust the background luminosity.

## Typography
This design system leverages **Inter** for its exceptional legibility at small sizes and its neutral, systematic character. 

- **Scale:** A tight typographic scale is used to accommodate data-heavy views. 
- **Emphasis:** FontWeight is the primary tool for differentiation. Use `600` for dates and titles, and `400` for event descriptions.
- **Micro-copy:** `label-xs` is specifically optimized for time-stamps on the vertical axis of the day view and day-of-the-week headers.
- **Mobile:** For mobile devices, `display-lg` should be reduced to `headline-md` to preserve horizontal space in list views.

## Layout & Spacing
The layout follows a **Rigid Grid** model to ensure mathematical alignment across time slots.

- **The Calendar Grid:** Built on a 7-column fluid width for month views. In day/week views, the time-column is fixed at `56px`, with the remaining space divided equally among days.
- **Rhythm:** An 4px base unit is strictly enforced. Vertical spacing between events in a list should be `sm` (8px), while internal padding for event chips should be `xs` (4px) horizontal and `2px` vertical to maximize text density.
- **Gutters:** Use `1px` borders for the calendar grid to create clear separation without consuming excessive screen real estate.
- **Breakpoints:** On mobile, the multi-day week view collapses into a single-day vertical scroll or a "Compact Week" (7-day icons only).

## Elevation & Depth
Elevation is used sparingly to maintain a "Flat-Plus" professional look.

- **Base Layer:** The calendar grid itself is the lowest layer (Level 0).
- **Tonal Tiers:** Use subtle background fills (e.g., Gray 50) to indicate weekends or past days rather than shadows.
- **Floating Action Buttons (FAB):** The "Add Event" button uses a medium-diffused shadow (0px 4px 12px, 15% opacity) to float above the grid.
- **Event Chips:** Use 1px internal borders or high-saturation left-accents to indicate depth, rather than drop shadows, to prevent the UI from looking cluttered when multiple events overlap.
- **Modals:** Pop-over event details should use a "Large" elevation with a backdrop blur (8px) to isolate the information from the busy background grid.

## Shapes
The shape language is **Soft**, balancing professional rigor with modern approachability.

- **Event Chips:** Use `rounded-sm` (4px) for most event blocks. If an event is "All Day," use a slightly more rounded corner to distinguish it from timed blocks.
- **Selection State:** Use a perfect circle for the "Current Day" highlight in the date header.
- **Inputs:** Text fields and search bars should follow the `rounded-sm` standard.
- **Buttons:** Primary action buttons use `rounded-md` (8px) to feel distinct from the sharper-edged calendar cells.

## Components

### Event Chips
- **Standard:** Solid background (low opacity primary color) with a high-contrast left border (4px).
- **Text:** Title in `label-md`, time in `label-xs`.
- **States:** Hovering an event should increase its elevation slightly and darken the left border.

### Calendar Grid
- **Headers:** Day names (Mon, Tue) should use `label-xs` and be center-aligned.
- **Cells:** Current day number should be wrapped in a primary-colored circle; other days remain neutral.
- **Inactive Days:** Days outside the current month should have their text opacity reduced to 30%.

### Date Headers
- **Sticky:** On mobile, the month/year header must remain sticky during vertical scrolls.
- **Navigation:** Use simple chevron icons (24x24px hit area) for month-to-month navigation.

### Input Fields
- **Compact:** Use "Outlined" style with `1px` borders. Labels should be small and nested within the border or placed directly above to save vertical space.

### List Items (Agenda View)
- **Structure:** Time on the left (fixed width), event content on the right. 
- **Separators:** Use 1px dividers between agenda items with `lg` (16px) horizontal padding.