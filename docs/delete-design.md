# Delete design

How cars and car-linked data are kept, hidden, and deleted. Table and FK details are in `docs/data-model.md`.

## Background

- "Keep the history" and "delete" are separate operations. A car the user no longer owns is archived. Delete always means a permanent, physical delete.
- A soft delete (`status = 'deleted'`) existed earlier and was removed. It had no restore UI, so it never worked as an undo. Its leftover rows leaked into the record list and CSV export, and auto-recording kept running for deleted cars.
- Accidental deletes are handled by prevention, not by a trash or restore feature.

## Status model

`cars.status`, enforced by `cars_status_check`:

| Status | Meaning | Stats and totals | Car pickers for new input |
|---|---|---|---|
| `pending` | Awaiting delivery | Excluded | Excluded |
| `active` | Owned | Included | Included |
| `archived` | Former car, kept in stats | Included | Excluded |
| `archived_excluded` | Former car, excluded from stats | Excluded | Excluded |

There is no `deleted` status. Do not add a tombstone status. If one ever becomes necessary, design the restore UI, the exclusion in every query, and the handling of child rows together.

When a car changes to `archived` or `archived_excluded`, the trigger `pause_recurring_costs_on_car_archive` sets its recurring costs to `is_active = false` in the same transaction.

## Rules

### Reading data

- `useCars` and `useRecords` return every row for the user so that screens share one SWR cache. Each caller filters by car status.
- Lists, totals, stats, and exports of records and recurring costs include cars in `active` and `archived` only. Examples: `app/stats/page.tsx`, `app/records/page.tsx`, the CSV export in `app/mypage/page.tsx` (`cars!inner(...)` with `.in("cars.status", ["active", "archived"])`).
- Car pickers for new input show `active` cars only. Home and maintenance alerts use `active` cars with `is_display_home`.
- Server-side batch jobs filter the same way: `process_due_recurring_costs` only processes cars in `active` and `archived`.
- The garage lists every status, because it is where status is changed.

Why: rows of cars that should be hidden once appeared in the record list and the CSV export because a query filtered by `user_id` only.

### Deleting

| Target | How | Cleanup |
|---|---|---|
| Car | `delete()` on `cars` in `handleDeleteCar` (`app/garage/page.tsx`) | `records`, `recurring_costs`, and `wishlists` are removed by `ON DELETE CASCADE` on `car_id`. Car images in Storage are removed explicitly before the delete. |
| Record, recurring cost, wishlist item | `delete()` on the row | None; they have no children or files. |

- Storage files are not covered by FKs. Before deleting a car, list `{user_id}/` in the `cars` bucket and remove every file whose name starts with `{car_id}-`. This also removes images orphaned by earlier uploads.
- When a car image is replaced, the old file is removed.
- After a delete, remove the car and its children from the SWR caches instead of refetching.

Why: `car_id` is `NOT NULL` with `ON DELETE CASCADE` on every child, so the database can never hold orphaned child rows. Storage has no such link, so files must be deleted in code.

### Preventing accidental deletes

The car delete dialog:

- requires typing the car name,
- shows how many records, wishlist items, and recurring costs will be deleted,
- suggests changing the status to a former car instead.

## Checklist

When adding a query, export, batch job, or delete:

- [ ] Car-linked data is filtered by car status for its use (stats `active` + `archived`, input `active`).
- [ ] A new child table of `cars` has `car_id NOT NULL` with `ON DELETE CASCADE`.
- [ ] Any file in Storage tied to a deleted row is removed in code.
- [ ] Every SWR cache that holds the deleted rows is updated.
- [ ] No status that hides rows instead of deleting them is introduced.

## Open issues

- **Account deletion** does not exist. If it is added: `auth.users` → `public.users` → `cars` → children cascade in the database, but the files under `{user_id}/` in the `cars` bucket must be removed explicitly.
- **Old orphaned images** may remain in Storage from before images were cleaned up on delete. Check with this read-only query in the Dashboard and remove matches from the Storage screen:

  ```sql
  select o.name, o.created_at
  from storage.objects o
  where o.bucket_id = 'cars'
    and not exists (
      select 1 from public.cars c
      where split_part(o.name, '/', 2) like c.id || '-%'
    );
  ```
