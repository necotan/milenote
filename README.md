<h1 align="center">Milenote</h1>

<p align="center">
  English | <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <img src="public/icon-512x512.png" width="120" alt="Milenote">
</p>

<p align="center">
  An expense tracking app built mainly for personal use, to manage the maintenance costs and expenses of my own car.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-App%20Router-000000?logo=nextdotjs&logoColor=white">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img src="https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3FCF8E?logo=supabase&logoColor=white">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss&logoColor=white">
  <br>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green"></a>
  <a href="https://milenote.vercel.app"><img src="https://img.shields.io/badge/Demo-Vercel-000000?logo=vercel&logoColor=white"></a>
</p>

## Features
- **Car maintenance costs**: Track fuel, insurance, inspections, maintenance, and other car expenses in one place
- **Recurring expenses**: Record and manage regular payments such as subscriptions and loans
- **Stats and charts**: See monthly and yearly spending in charts
- **Responsive**: UI/UX designed to work well on both smartphones and PCs

## Quick Start
Try it right away in your browser, no setup needed.

**[milenote.vercel.app](https://milenote.vercel.app/)**

### Add to Home Screen (recommended)
On a smartphone, adding the app to your home screen hides the address bar and other browser UI, so it feels like a native app.

- **iOS (Safari)**: Tap the Share button, then "Add to Home Screen"
- **Android (Chrome)**: Open the menu (⋮), then "Add to Home screen"

To run it in your own environment, see Running Locally below.

## Running Locally
The app runs locally with Next.js and Supabase. Follow the steps below to set it up.

### Prerequisites
- Node.js 24.22.3 or later (24.x)
- A [Supabase](https://supabase.com/) account
- [Docker Desktop](https://docs.docker.com/desktop) (required by the Supabase CLI to initialize the database)

### Steps

1. Clone the repository
   ```bash
   git clone https://github.com/NECOTAN/milenote.git
   cd milenote
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Create a Supabase project
   Create a new project in the [Supabase Dashboard](https://supabase.com/dashboard) and note the following:
   - **Project URL** (Settings → API → Project URL)
   - **anon public key** (Settings → API → Project API keys → anon)
   - **Project ID** (Settings → General → Reference ID)
   - **Database password** (the one you set when creating the project)

4. Set environment variables
   Create `.env.local` in the project root and fill in the values from step 3.
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Initialize the database schema
   Apply the migrations with the Supabase CLI.
   ```bash
   # Start Docker Desktop first
   npx supabase login
   npx supabase link --project-ref <your_project_id>
   npx supabase db push
   ```
   This applies the SQL files in `supabase/migrations/` in order and creates all tables, functions, triggers, RLS policies, Storage buckets, and Storage policies.

6. Start the development server
   ```bash
   npm run dev
   ```
7. Open `http://localhost:3000` in your browser.

### Git Hooks (for committing changes)
If you plan to commit, enable the hooks in `.githooks/` once per clone:
```bash
git config core.hooksPath .githooks
```
`pre-commit` runs `npm run lint` and `npm run typecheck`, and `commit-msg` checks the format of the first line. This is not needed just to run the app.

### About the Database Schema
The schema is managed by the SQL files in `supabase/migrations/`. To change the schema, add a new migration file.

For details on adding and applying migrations and handling drift, see [manuals/supabase_migrations.md](manuals/supabase_migrations.md) (Japanese).

## Tech Stack & Credits
This project is built with the following technologies and open-source libraries.

- **Framework**: [Next.js](https://nextjs.org/) (App Router) / [React](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/) (Licensed under ISC)
- **Hosting**: [Vercel](https://vercel.com/)

## Disclaimer

**1. Data Handling and Privacy**
This app stores the expense data and car information you enter in a database (Supabase). It is developed for personal use and does not share data with third parties or send data to external servers unintentionally. You are responsible for managing your data and configuring database security (RLS, etc.) appropriately.

**2. Data Loss**
This software is a personal project. Saved expense data and records may be lost due to unexpected bugs, database failures, or user error. We strongly recommend backing up important data regularly.

**3. Supported Environments**
This app is intended to run on current modern browsers (Chrome, Safari, Edge, etc.), but it is not guaranteed to work fully on every device or OS.

**4. Disclaimer and Limitation of Liability**
This software is provided "as is". The developer accepts no liability for any damages (including financial loss or emotional distress) arising from installing or using this app, or from loss of data. Use it at your own risk.

**5. Changes in External Services**
Updates or specification changes in the technologies used (Next.js, Supabase, Vercel, etc.) may make some features unavailable or require fixes without notice. The developer has no obligation to provide ongoing maintenance or updates for such changes.

**6. License**
The source code of this project is released under the [MIT License](LICENSE). You may use it freely, commercially or non-commercially, within the terms of the license.
