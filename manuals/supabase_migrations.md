# Supabase Migration Guide

English | [日本語](supabase_migrations.ja.md)

The milenote Supabase database schema is managed as SQL files in `supabase/migrations/`. This guide describes how to change the database.

## Basic rule

> **Do not run mutating SQL (CREATE / ALTER / DROP / INSERT, etc.) directly in the Supabase Dashboard SQL Editor.**

Always make changes through a migration file. Use the Dashboard SQL Editor **only for read-only queries such as SELECT**.

Why: running SQL directly in the Dashboard makes the remote database drift from the local migration files, so the schema can no longer be reproduced in another environment or tracked in Git.

---

## Normal flow: changing the database

### 1. Create a migration file

```bash
npx supabase migration new <slug-describing-the-change>
```

Example:
```bash
npx supabase migration new add_nickname_to_cars
```

-> This creates `supabase/migrations/<timestamp>_add_nickname_to_cars.sql`.

### 2. Write the SQL

Write the change in the generated file.

```sql
-- supabase/migrations/20260601120000_add_nickname_to_cars.sql
ALTER TABLE public.cars ADD COLUMN nickname text;
```

### 3. Back up

Before `db push`, double-click `scripts/backup.cmd` to back up the production database and car photos. Always do this for changes that delete data, such as dropping a column or table.

- Destination: `Documents\milenote\backups\<date>` (`schema.sql`, `data.sql`, `storage\`)
- Start Docker Desktop first.
- It cannot run on a network whose firewall blocks the database ports (5432 / 6543). Run it on a network that allows them.
- To use another destination, run `scripts/backup.ps1 -Destination <folder>`. The backup contains user data, so do not choose a folder inside the repository or a shared cloud folder.

### 4. Apply to the remote database

```bash
npx supabase db push
```

Unapplied migration files run in order.

### 5. Commit

```bash
git add supabase/migrations/<timestamp>_add_nickname_to_cars.sql
git commit -m "add: nickname column to cars table"
```

---

## Fixing drift (after running SQL in the Dashboard by mistake)

Use this when only the remote database was changed and no longer matches the local files.

### 1. Detect drift

```bash
npx supabase migration list
```

If the `Local` and `Remote` columns do not match, the schema has drifted.

```
   Local          | Remote
  ----------------|----------------
   20260522022446 | 20260522022446   OK
                  | 20260601120000   only on the remote
```

### 2. Pull the remote changes into a migration

```bash
npx supabase db pull
```

-> The difference is written to a new migration file.

### 3. Review and commit the generated file

```bash
git add supabase/migrations/<timestamp>_remote_schema.sql
git commit -m "add: migration for changes made in the Dashboard"
```

---

## Marking a migration as already applied on the remote

Use this when the contents of a new migration file are **already in the remote database**.

```bash
npx supabase migration repair --status applied <timestamp>
```

Example:
```bash
npx supabase migration repair --status applied 20260522022447
```

Without this, the next `db push` treats the file as unapplied and runs it again.

---

## Setting up another environment (another PC or a new project)

```bash
git clone <repo>
cd milenote
npm install

# Start Docker Desktop first
npx supabase login
npx supabase link --project-ref <project_id>
npx supabase db push    # applies the migrations
```

This reproduces the current schema.

---

## Command cheat sheet

| Task | Command |
|---|---|
| Create a migration | `npx supabase migration new <slug>` |
| Back up the production database | Double-click `scripts/backup.cmd` |
| Apply to the remote | `npx supabase db push` |
| Pull the remote state | `npx supabase db pull` |
| Check what is applied | `npx supabase migration list` |
| Mark as applied in the history | `npx supabase migration repair --status applied <timestamp>` |
| Mark as unapplied in the history | `npx supabase migration repair --status reverted <timestamp>` |
| Link to the remote | `npx supabase link --project-ref <id>` |

---

## Don'ts

| Don't | Why |
|---|---|
| Run `CREATE TABLE`, `ALTER TABLE`, etc. directly in the Dashboard SQL Editor | It drifts from the migrations |
| Edit a migration file after it has been applied | It no longer matches the applied history |
| Rename or delete a migration file | It breaks the timestamp order |
| Commit `supabase/.temp/` or `supabase/.branches/` | They hold state specific to your machine (already in `.gitignore`) |

To "fix" an applied migration, **create a new migration that reverts or overrides it**.

---

## Troubleshooting

### `db push` fails with "Docker Desktop is a prerequisite"
Start Docker Desktop and run the command again. Wait until the Docker icon in the taskbar shows "Engine running".

### "password authentication failed"
The database password is wrong. Reset it in Dashboard -> Settings -> Database -> **Reset database password** (existing data is not affected).

### Migrations have drifted too far to fix
As a last resort, delete everything in `supabase/migrations/` locally and run `db pull` to rebuild it as a single file. This loses the change history, so be careful.
