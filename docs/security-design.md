# Security design

Security decisions and the rules that keep them true. Report vulnerabilities as described in `SECURITY.md`.

## Trust boundary

- The browser talks to Supabase directly with the anon key (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Row Level Security is the real boundary; client-side checks are convenience only. The `service_role` key is never used in the app.
- Every table has RLS. Policies allow only the `authenticated` role:
  - `users`: own row (`id = auth.uid()`).
  - `cars`, `records`, `recurring_costs`: own rows (`user_id = auth.uid()`). Insert and update on `records` and `recurring_costs` also require that `car_id` belongs to the user.
  - `wishlists`: through the owning car (`cars.user_id = auth.uid()`).
- The `anon` role has no table privileges, including default privileges for future tables. Do not grant anything to `anon`.
- New tables: enable RLS and add owner policies in the same migration. A child of `cars` must check car ownership on insert and update.
- Database functions called from the client run as `SECURITY INVOKER`, revoke `EXECUTE` from `PUBLIC` and `anon`, and grant it to `authenticated` (see `process_due_recurring_costs`). A `SECURITY DEFINER` function must set `search_path`, as `handle_new_user` does.

## Authentication and routing

- `proxy.ts` protects routes on the server: unauthenticated requests go to `/login`, and signed-in users on `/login` go to `/`. Public routes are defined once in `utils/publicRoutes.ts`.
- `proxy.ts` must call `supabase.auth.getUser()`, which verifies the session with Supabase, not `getSession()`. Do not put other work between `createServerClient` and `getUser()`. Copy refreshed session cookies onto redirect responses.
- The client-side check in `components/AppShell.tsx` is a second layer and does not replace the proxy.
- Auth screens never show Supabase's raw `error.message`; they map known errors to translated messages and show a generic one otherwise.
- Minimum password length is 6, a deliberate choice. To change it, update the checks in `app/login/signup/page.tsx` and `app/reset-password/page.tsx`, both locale files, and the Supabase Auth setting together.
- Auth rate limits use the Supabase defaults. Add CAPTCHA only if abuse appears.

## Storage

- The `cars` bucket is public: anyone with an image URL can view it. This is a decision, disclosed in the privacy policy (`privacy.sections.images`).
- Because of that, every upload goes through `utils/stripImageMetadata.ts`, which re-encodes the image as JPEG to drop EXIF (including GPS) and keeps it at 5 MB or less. The bucket enforces the same limits (`image/jpeg`, 5 MB).
- Paths are `{user_id}/{car_id}-{timestamp}.jpg`. Listing is limited to the owner's folder by `cars_objects_owner_select`.

## Output and input handling

- No `dangerouslySetInnerHTML` and no HTML built from user input. React escaping is the main XSS defense.
- User-entered URLs go through `getSafeExternalUrl` (`utils/safeUrl.ts`), which allows only `http` and `https`. Open them with `rel="noopener noreferrer"`.
- CSV export neutralizes cells that start with `=`, `+`, `-`, `@`, tab, CR, or LF (`neutralizeFormula` in `lib/csvExport.ts`).
- Numeric ranges, text lengths, and allowed values are enforced by CHECK constraints as well as the UI (`docs/data-model.md`).

## HTTP headers

`next.config.ts` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, and a document-only CSP (`base-uri`, `object-src`, `frame-ancestors`, `form-action`, `upgrade-insecure-requests`). There is no `script-src`.

## Open issues

- **CSP `script-src` with nonces needs re-evaluation.** It was deferred because the app has almost no XSS entry points and nonces required splitting the client-only root layout. That split has since happened (`app/layout.tsx` is a Server Component wrapping `AppShell`), so the cost is lower. Remaining costs: nonces force every route to render dynamically, and the `next-themes` inline script needs the nonce. Also revisit this when adding `dangerouslySetInnerHTML`, user-supplied HTML, or third-party scripts.
- **Storage write policies are not in the migrations.** Only the `SELECT` policy on `storage.objects` is defined in `supabase/migrations/`. Uploads and deletes work, so the insert, update, and delete policies presumably exist only in the remote project. Confirm them with a read-only query and capture them in a migration.
