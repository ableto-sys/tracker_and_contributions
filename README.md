# AbleTo Working Hour Tracker

Executive-grade working hour tracker for verified team activity. The app supports a local demo mode and a live Supabase backend for email/password auth, Google auth, row-level security, work logs, and private file evidence.

## Local Demo

```bash
npm install
npm run dev
```

Demo executive account:

- Email: `emidaz138@gmail.com`
- Password: `ableto2026`

When Supabase environment variables are missing, the app uses localStorage so the board dashboard can still be reviewed without cloud setup.

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Add your project URL and anon key:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_MEDIA_BUCKET=work-media
```

4. Run the SQL in `supabase/migrations/0001_working_hour_tracker.sql` in the Supabase SQL editor or through the Supabase CLI.
5. In Supabase Auth, enable Email provider.
6. In Supabase Auth, enable Google provider and add the callback URL from Supabase to your Google Cloud OAuth app.
7. Add your deployed app URL to Supabase Auth redirect URLs.

## Backend Model

- `profiles`: User profile, team, role, and executive status.
- `work_logs`: Logged hours, notes, verification status, and team snapshot.
- `work_log_media`: Private file metadata for screenshots, PDFs, photos, and videos.
- `work-media`: Private Supabase Storage bucket with policies for owners and executives.
- `executive_email_allowlist`: Emails that receive executive role automatically. Emilio's email is included.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## GitHub Pages Notes

The app uses hash routing and a relative Vite asset base so it can be published as a GitHub Pages project site. After publishing, add the final GitHub Pages URL to Supabase **Authentication > URL Configuration** and to the Google OAuth client's authorized JavaScript origins.
