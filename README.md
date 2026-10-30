# Nagaland E-Waste Management Tracker

A public-facing academic project workspace for organising e-waste research, documents, source references, organisations, activities and deliverables for Nagaland.

## Product access model

- Anyone can browse the published website.
- Only authorised project members can upload, edit or delete records.
- New file uploads default to **private**. A member must explicitly choose **public** to publish a document for general viewing.
- Supabase Row Level Security enforces access at the database and storage layers. Hiding controls in the interface is not the security boundary.
- The service-role key must never be added to the browser application or Netlify environment variables.

## Stack

- React + TypeScript + Vite
- Tailwind CSS (with project-specific CSS tokens and layout styles)
- Supabase Auth, Postgres and private Storage
- PDF.js for PDF reading, page navigation, zoom and text search
- SheetJS for CSV/XLS/XLSX read-only previews
- Netlify for hosting and SPA routing

## Local development

Requirements: Node.js 22 and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your Supabase project URL and browser-safe publishable/anon key to `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

The app can render the public project structure without Supabase configured, but uploads, persistent records, authentication and file viewing require the database connection.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/migrations/001_workspace_schema.sql` in full.
4. Run `supabase/seed.sql` to add the five project reference leads, three directory-listed organisation entries and proposed deliverable rows.
5. Copy the project URL and publishable/anon key into the environment variables.
6. In Supabase Authentication, invite the first project-member account. Public sign-up is not used.
7. Add the first member as an administrator using the SQL below.

```sql
insert into public.project_members (user_id, email, role)
select id, email, 'admin'
from auth.users
where lower(email) = lower('YOUR_EMAIL_ADDRESS')
on conflict (user_id) do update set role = 'admin', email = excluded.email;
```

To invite another person, use Supabase Authentication's invite flow, then add their user as an editor:

```sql
insert into public.project_members (user_id, email, role)
select id, email, 'editor'
from auth.users
where lower(email) = lower('MEMBER_EMAIL_ADDRESS')
on conflict (user_id) do update set role = 'editor', email = excluded.email;
```

The first administrator can later be promoted or removed using the Supabase SQL editor. Only a project member can reach the write paths, and only an administrator can manage the member list.

### Storage

The migration creates a **private** `project-files` bucket with a 100 MiB per-file limit and an allow-list of expected document types. Storage policies permit:

- Read access to a file when its matching `documents` row is explicitly `visibility = 'public'`.
- Read access to private project files for authorised project members.
- Upload, update and delete only for authorised project members.

The application issues time-limited signed URLs for viewing and direct downloads. The browser key is safe to expose only because RLS policies are enabled and correctly configured.

## Netlify deployment

1. Push this folder to a private or public Git repository.
2. In Netlify, choose **Add new site → Import an existing project** and connect the repository.
3. Netlify should detect Vite. The included `netlify.toml` sets the build command to `npm run build` and publish directory to `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Site configuration → Environment variables**.
5. Deploy. The included redirect rule sends client-side routes back to `index.html`.

## File behaviour

- **View** opens the in-app file route in a new browser tab.
- PDF files use the dedicated PDF.js reader with page controls, zoom, fit-to-width and text search.
- Images open in an image viewer.
- CSV/XLS/XLSX files use a read-only spreadsheet preview.
- DOC/DOCX/PPT/PPTX/ZIP and unsupported formats fall back to a direct original download; the interface does not pretend to preview them.
- **Download** creates a signed download URL for the original file and does not open the preview route.
- If a file has no attached original, View and Download are not available.

## Seed data and evidence discipline

The seed file contains brief-supplied public source leads and directory entries. These are labelled as pending verification; they are not represented as uploaded attachments or proof of current facility operation. The two e-waste values remain labelled as **reported quantities** because the NPCB newsletter and CPCB report use different terminology for the same values.

No district totals, collection rates, recycling capacities, compliance scores, worker counts or completed awareness programmes are fabricated.

## Main routes

- `/` — Overview
- `/tracker` — Seven workstreams
- `/tracker/:slug` — Category detail
- `/files` — File repository
- `/files/:id` — File details and member metadata editing
- `/files/:id/preview` — Dedicated preview window
- `/activities` — Activity log
- `/research` — Source library
- `/organisations` — Organisation directory
- `/organisations/:id` — Organisation details
- `/deliverables` — Submission archive
- `/about` — Project context and editable owner details
- `/settings` — Access and workspace configuration
- `/login` — Project-member sign-in

## Current implementation notes

- This is the frontend and initial Supabase schema. It is not yet connected to your own Supabase project.
- The site has no seeded file attachments or activity records. Upload real files to populate those sections.
- Member invites are deliberately controlled through Supabase Auth; unauthorised public sign-up is not exposed.
- DOCX/PPTX preview is not implemented; those formats download as originals.
- A production release should be tested against the actual Supabase project using anonymous and member accounts before the URL is distributed publicly.
