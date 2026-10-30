# Data model

The schema lives in `supabase/migrations/`; that is the source of truth. Row types used by the app are in `lib/types.ts`. Change the schema only through a new migration (`manuals/supabase_migrations.md`).

## Tables

| Table | Owner column | Parent | Notes |
|---|---|---|---|
| `users` | `id` (= `auth.users.id`) | `auth.users`, `ON DELETE CASCADE` | Created by the `handle_new_user` trigger on sign-up. `maint_settings` (jsonb) holds alert intervals keyed by maintenance slug. |
| `cars` | `user_id` | `users`, `ON DELETE CASCADE` | `status` drives visibility; see `docs/delete-design.md`. |
| `records` | `user_id` | `cars` (`car_id NOT NULL`, `ON DELETE CASCADE`) | One expense. `odo_at_record` is required. |
| `recurring_costs` | `user_id` | `cars` (`car_id NOT NULL`, `ON DELETE CASCADE`) | Template that creates `records` when due. `is_active = false` means paused, not deleted. |
| `odo_logs` | `user_id` | `cars` (`car_id NOT NULL`, `ON DELETE CASCADE`) | Odometer readings entered without a record (home ODO update, garage car form). One row per car and date (`odo_logs_car_id_date_key`); an update on the same day overwrites it. |
| `wishlists` | none | `cars` (`car_id NOT NULL`, `ON DELETE CASCADE`) | Has no `user_id`. Ownership is resolved through `cars.user_id`, so never query wishlists by `user_id`. |

Car images are stored in the Storage bucket `cars` at `{user_id}/{car_id}-{timestamp}.jpg`. No FK links them to `cars`.

## Constraints

Constraints are the last line of validation. Keep them in sync with the UI.

- Non-negative numbers: amounts, `odo_at_record`, `odo_logs.odo`, `fuel_amount`, `current_odo`, `purchase_odo`, `purchase_price`, `price_estimate` (`>= 0`; a free service can cost 0).
- Text length limits on names, memos, URLs, and `maint_settings` size. They are far above normal input and exist to stop abuse.
- `users.username` matches `^[a-zA-Z0-9_]+$`, the same rule as the sign-up form.
- Allowed values (see `docs/stored-values.md`):

  | Column | Constraint | Code that must match |
  |---|---|---|
  | `cars.status` | `cars_status_check` | `CarStatus` in `lib/types.ts` |
  | `records.category`, `recurring_costs.category` | `*_category_check` | `CATEGORIES` in `app/records/page.tsx` |
  | `records.sub_category`, `recurring_costs.sub_category` | `is_valid_sub_category(category, sub_category)` | `SUB_CATEGORIES` in `lib/subcategories.ts` |
  | `recurring_costs.frequency` | `recurring_costs_frequency_check` | `FREQUENCY_OPTIONS` in `components/RecurringTab.tsx` |
  | `wishlists.genre` | `wishlists_genre_check` | `WISHLIST_GENRES` in `lib/wishlistGenres.ts` |
  | `wishlists.status` | `wishlists_status_check` | `WISH_STATUS_KEYS` in `app/garage/page.tsx` |

  Adding a value to one of these lists needs a migration that updates the constraint, or saves fail.
- `cars.fuel_type` has no constraint; `FUEL_TYPES` in `lib/fuelTypes.ts` is the only list.

## Server-side logic

- `process_due_recurring_costs(p_today, p_memo_prefix, ...)` creates due records from recurring costs. It locks rows so that calls from several devices do not create duplicates, and it only processes cars in `active` and `archived`. The client calls it once when the app loads, from `RecurringCostProcessor`.
- The ODO for records created without one is estimated in two places that must stay identical: `estimateOdoAtDate` in `lib/odoEstimate.ts` and `estimate_odo_at_date` in the latest migration that redefines it (currently `add_odo_logs`). Both use records, `odo_logs`, the purchase ODO, and `current_odo` as anchors. Change both together.
- `pause_recurring_costs_on_car_archive` pauses a car's recurring costs when the car is archived.

## Invariants for queries

- `cars.current_odo` is the maximum of the car's `records.odo_at_record`, `odo_logs.odo`, and `purchase_odo`. Write it through `lib/carOdo.ts` (`saveOdoUpdate`, `recalcCarOdo`), not directly. A value lower than that maximum is rejected; the user fixes the wrong value in the history or the record instead.

- Filter car-linked data by car status for each use (`docs/delete-design.md`).
- Home totals and maintenance alerts use each car's full record history. Do not add a date range to those queries.
