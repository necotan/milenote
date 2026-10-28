# Stored values

Rules for identifier values saved in the database (categories, sub-categories, fuel types, wishlist genres and statuses, `maint_settings` keys).

## Rules

- Store English slugs, never display text. Display text comes from i18n: ``t(`subcategories.${slug}`)``, ``t(`fuel_types.${slug}`)``, ``t(`wishlist_genres.${slug}`)``, and so on.
- Slugs are lowercase ASCII with `_` (`oil_change`, `exhaust_intake`). Do not prefix them with the category.
- Never rename a slug once it is stored. It is an identifier in existing rows and in `maint_settings` keys.
- A sub-category is always read together with its category. `other` appears in several categories and means "other within this category".
- Each list has one definition in code, typed as a slug union:

  | Values | Code |
  |---|---|
  | Sub-categories per category | `SUB_CATEGORIES` in `lib/subcategories.ts` |
  | Maintenance alert items (`maint_settings` keys) | `MAINT_CATEGORIES` in `lib/subcategories.ts` |
  | Fuel types | `FUEL_TYPES` in `lib/fuelTypes.ts` |
  | Wishlist genres | `WISHLIST_GENRES` in `lib/wishlistGenres.ts` |

  Most lists are also enforced by CHECK constraints; see the table in `docs/data-model.md`.
- Lookups keyed by slug must not fail silently. For example, `CO2_COEFFICIENT` in `app/stats/page.tsx` falls back to a default coefficient for an unknown fuel type, so a misspelled slug skews CO₂ figures without an error. Compare against the slug constants, not string literals typed by hand.

## Adding a value

1. Add the slug to the list in code and to both `ja.json` and `en.json`.
2. If the column has a CHECK constraint, update it in a new migration in the same change.

## Renaming or migrating stored values

Existing rows already hold the old values, so a code-only change breaks them. Use three steps, each safe to deploy alone:

1. **Code accepts both.** Add a map from old to new values and normalize on read. Write only new values. Add the new i18n keys and keep the old ones.
2. **Migrate the data.** In a new migration, update the rows, restricted to the old values (and to the category for sub-categories), so that running it twice is harmless. Update every table that holds the value; recurring costs copy `sub_category` into records. Update column defaults too. Then confirm no old values remain with a read-only query.
3. **Remove the compatibility code** and the old i18n keys after the migration is applied in production.

Use one migration per column so that each is easy to review.
