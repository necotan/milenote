# iOS and PWA layout

Rules for Safari on iOS, including the home-screen PWA (`display: standalone`). Several of them look like they could be simplified; they cannot. Check both the PWA and a Safari tab after changing anything here.

## Safe area

- `viewport-fit=cover` is exported from `app/layout.tsx` (`export const viewport`), so it is in the initial HTML. Do not add or change the viewport meta after hydration: WebKit does not fully recompute the viewport, and the PWA then starts with the content shifted down by one status bar.
- `body` has `padding-top: env(safe-area-inset-top)`. Radix scroll lock (Dialog, Select) overwrites body padding, so `body[data-scroll-locked]` restores it with `!important` in `app/globals.css`.
- `appleWebApp.statusBarStyle` is `black-translucent`, set in `metadata`.
- Toasts on mobile sit at `safe-area-inset-top + 40px` (`components/ui/sonner.tsx`). Do not move them closer: on iOS 26 the status bar's glass effect samples the content just below it and picks up the toast.
- Full-height screens use `h-dvh` with `standalone:h-lvh` (see `components/ui/AuthScreen.tsx`): right after the PWA launches, `dvh` is reported one status bar short.

## Status bar color

- `theme-color` is fixed to the page background by `components/ui/ThemeColorMeta.tsx`; otherwise the bar samples whatever content is at the top. Its colors and `background_color` / `theme_color` in `app/manifest.ts` are hex copies of `--page` (light `#f2f2f2`, dark `#000000`). Update them together when `--page` changes.
- The body background is `bg-page`.

## Modals and overlays

On iOS 26, Safari tints the area behind the status bar with the **CSS value** of a background color, not the rendered pixels:

1. If a `position: fixed` element touches the top edge, its `background-color` is used, with alpha ignored.
2. Otherwise the `background-color` of `body` is used. The color of `html` is ignored.

So a semi-transparent black overlay turns the top fully black. Rules:

- Dim full-screen overlays with `backdrop-brightness-N`. Never give an overlay a background color such as `bg-black/50`.
- While a modal is open, call `useDimmedPageBackground(open, N)` (`lib/hooks/useDimmedPageBackground.ts`) with the same `N`. It sets body `background-color` to the dimmed page color for Safari and covers it with `background-image` in the original page color so the page is not dimmed twice.
- Use the shared components, which already do this: `components/ui/dialog.tsx` (N = 50) and `components/ui/ModalCard.tsx` (N = 40). `Dialog` reads its `open` prop, so pass `open`; an uncontrolled `DialogTrigger` gets no tint fix.
- Do not change only the `html` background, and do not change the body background color without the `background-image` cover.
