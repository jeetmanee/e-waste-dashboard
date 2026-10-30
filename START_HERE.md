# Start here — Nagaland E-Waste Workspace

This is the first implementation of the public project website. The website is designed for public reading. Uploading, editing and deleting records require an invited project-member account.

## What you need

- A Supabase account (database, member login and file storage).
- A Netlify account (website hosting).
- Node.js 22 on your computer if you want to run the site locally first.

## Step 1 — Create the database

1. Create a new Supabase project.
2. Open the project's **SQL Editor**.
3. Open `supabase/migrations/001_workspace_schema.sql` from this folder, copy its full contents and run it in the SQL Editor.
4. Open `supabase/seed.sql`, copy its full contents and run it.

This creates the project tables, the private file bucket, access rules and the initial Nagaland source / organisation directory entries. The seeded directory entries are marked pending verification. They are not proof that a collection point is currently operating.

## Step 2 — Invite the first project member

1. In Supabase, open **Authentication → Users**.
2. Choose **Invite user** and enter the email address that should administer the project.
3. After the invited user appears in the Users list, copy the user's ID.
4. In SQL Editor, run this query after replacing the email address:

```sql
insert into public.project_members (user_id, email, role)
select id, email, 'admin'
from auth.users
where lower(email) = lower('YOUR_EMAIL_ADDRESS')
on conflict (user_id) do update set role = 'admin', email = excluded.email;
```

For each additional collaborator, invite them through Authentication and add them with role `editor` instead of `admin`. Only administrators should manage membership.

## Step 3 — Configure the website

1. Copy `.env.example` to a new file named `.env.local`.
2. Add the Supabase Project URL and the browser-safe publishable / anon key.
3. Never add the Supabase `service_role` secret to this website or to any `VITE_` variable.

Example:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

## Step 4 — Run locally

Open a terminal in this project folder and run:

```bash
npm install
npm run dev
```

Open the local address printed by Vite. You can browse the public pages. Sign in with the invited member account to upload and manage records.

## Step 5 — Publish on Netlify

1. Push this folder to a Git repository.
2. In Netlify, choose **Add new site → Import an existing project** and connect that repository.
3. Use build command `npm run build` and publish directory `dist` (already configured in `netlify.toml`).
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under the Netlify site's environment variables.
5. Deploy the site.

The redirect rule in `netlify.toml` supports direct links to internal pages such as `/files/:id/preview`.

## Privacy defaults

- The database and file bucket use row-level security.
- New uploaded files default to private. A member must deliberately mark a file public before the public site can read it.
- Public deliverables can only use files that are also public.
- Public source references and organisation entries can be viewed without signing in.
- Project notes are private to project members.

## Current implementation boundary

This source package is not connected to your Supabase project or Netlify account yet. No real files have been uploaded, no members have been invited and no live deployment has been made. The source has been syntax-checked, but a full dependency install and production build still need to run in an environment that can reach the npm registry.
