# CCRA Supabase backend

This directory contains the database schema for the hosted CCRA app.

## Services

- Vercel hosts the Vite frontend.
- Supabase Postgres stores profiles, cards, and transactions.
- Supabase Auth owns application users and sessions.
- A Supabase Edge Function will complete LINE Login and link the LINE `sub`
  value to `profiles.line_user_id`.

The credit-card catalog remains a shared, versioned JSON file in the frontend.
Only a user's selected catalog card ID and last four digits are stored in the
database.

## Apply the schema

1. Create a Supabase project.
2. Install the Supabase CLI and sign in.
3. Link this repository to the project.
4. Run `supabase db push`.

## Public frontend settings

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (the publishable key or legacy anon public key)
- `VITE_LINE_LOGIN_URL`

## Required Supabase Edge Function secrets

- `LINE_CHANNEL_ID` (`2010393614` for the current LINE Login channel)
- `LINE_CHANNEL_SECRET`
- `APP_URL` (the production Vercel URL)
- `ALLOWED_APP_URLS`

Do not add the LINE channel secret or Supabase service-role key to Vercel
or any `VITE_` environment variable.

The LINE Login callback URL is:

```text
https://gssfqmiynesmtvbmeklb.supabase.co/functions/v1/line-login/callback
```
