# Design

Visual rules for the UI. Values live in `app/globals.css`; this file explains how to use them. iOS-specific layout rules are in `docs/ios-pwa.md`.

## Color

- The interface is monochrome. Interactive elements (primary buttons, selected chips, switches, focus rings, navigation) use grayscale tokens: `primary` is near-black in light mode and near-white in dark mode. Do not introduce an accent color for them; a blue accent was tried and reverted.
- Color carries meaning only:
  - categories: `CATEGORIES` in `app/records/page.tsx` and maintenance items in `lib/maintenanceAlerts.ts` (icon color plus a pale background in light mode, `surface-2` in dark mode),
  - status and severity: alert urgency, wishlist status badges, month-over-month change,
  - charts: `--chart-1` to `--chart-5`,
  - destructive actions: `destructive`.
- `slate-*` is redefined in `@theme` with zero chroma, so `slate` classes render pure gray. Existing code uses them freely; prefer semantic tokens (`foreground`, `muted-foreground`, `card`, `muted`, `border`) in new code.
- Define every color for both themes. Use `dark:` variants or tokens that change under `.dark`.

## Surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `page` | light gray | black | Page background (`body` uses `bg-page`) |
| `card` | white | dark gray | Cards on the page |
| `muted`, `surface-2`, `surface-3` | | | Fills inside cards (tabs, icon buttons, nested blocks), lighter than `card` in dark mode |
| `skeleton`, `skeleton-shimmer` | | | Skeleton placeholders only |

- Separate areas by surface brightness, not borders. Cards have no ring or border.
- Do not put a card inside a card; use a `muted` fill or a list group (`components/ui/ListGroup.tsx`) instead.
- When changing `--page`, also update the hex copies listed in `docs/ios-pwa.md`.

## Shape

- Cards: `rounded-xl` (20px). Larger containers: `rounded-2xl` / `rounded-3xl` (22 / 24px).
- Buttons, chips, tags, badges, and icon buttons: `rounded-full`.
- Inputs and selects keep the base radius (`--radius`, 10px).
- Buttons shrink slightly when pressed (`active:scale-[0.97]` in `components/ui/button.tsx`).
- Small icon actions (edit, delete) use `components/ui/IconButton.tsx`: 32px visible, 44px tap area, filled, no border.

## Typography

- Fonts: Geist for Latin text and Noto Sans JP (400 to 700) for Japanese (`lib/fonts.ts`).
- Page titles: `text-3xl font-bold tracking-tight`.
- Do not widen letter spacing (`tracking-wide` and wider) or use `uppercase` for labels.
- Small gray labels use `font-medium`, not `font-bold`.
- Large numbers such as amounts use `tabular-nums`, plus `tracking-tight` for big figures.
- Minimum text size is 11px. Exceptions: the count badge on filter buttons, bottom navigation labels, and the error mark in `components/ui/input.tsx`.
