-- Nagaland E-Waste Workspace
-- Public visitors can read published records. Only project_members can write.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.project_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('admin','editor')),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.is_project_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members pm where pm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_project_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members pm where pm.user_id = (select auth.uid()) and pm.role = 'admin'
  );
$$;

revoke all on function public.is_project_member() from public;
revoke all on function public.is_project_admin() from public;
grant execute on function public.is_project_member() to anon, authenticated;
grant execute on function public.is_project_admin() to authenticated;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_name text not null,
  description text,
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  file_size bigint not null check (file_size >= 0),
  category text not null,
  tags text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('public','private')),
  workstream text,
  semester text,
  version text default '1.0',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  activity_type text not null,
  category text,
  activity_date date not null,
  status text not null default 'Completed',
  visibility text not null default 'private' check (visibility in ('public','private')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  publisher text,
  author text,
  source_type text not null default 'Other',
  url text,
  publication_date text,
  accessed_date date,
  description text,
  findings text,
  category text,
  verification_status text not null default 'Pending verification',
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organisation_type text not null,
  location text,
  address text,
  contact_name text,
  phone text,
  email text,
  website text,
  description text,
  verification_status text not null default 'Pending verification',
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'Not started' check (status in ('Not started','Draft','In progress','Under review','Finalised','Archived')),
  category text,
  document_id uuid references public.documents(id) on delete set null,
  version text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  category text,
  body text not null,
  visibility text not null default 'private' check (visibility in ('public','private')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_settings (
  id integer primary key default 1 check (id = 1),
  project_title text not null default 'Nagaland E-Waste Management Tracker',
  semester text,
  academic_year text,
  project_status text,
  about_text text,
  owner_name text,
  owner_programme text,
  owner_department text,
  institution text,
  public_contact text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Indexes for common repository queries.
create index if not exists documents_visibility_created_idx on public.documents (visibility, created_at desc);
create index if not exists documents_category_idx on public.documents (category);
create index if not exists activities_visibility_date_idx on public.activities (visibility, activity_date desc);
create index if not exists research_sources_visibility_idx on public.research_sources (visibility, created_at desc);
create index if not exists organisations_visibility_location_idx on public.organisations (visibility, location);
create index if not exists deliverables_visibility_idx on public.deliverables (visibility, updated_at desc);

-- updated_at triggers.
do $$
declare t text;
begin
  foreach t in array array['documents','activities','research_sources','organisations','deliverables','project_notes','project_settings'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end;
$$;

-- RLS is enabled on every exposed table.
alter table public.project_members enable row level security;
alter table public.documents enable row level security;
alter table public.activities enable row level security;
alter table public.research_sources enable row level security;
alter table public.organisations enable row level security;
alter table public.deliverables enable row level security;
alter table public.project_notes enable row level security;
alter table public.project_settings enable row level security;

-- Remove default grants first, then grant only the operations used by the app.
revoke all on table public.project_members from anon, authenticated;
revoke all on table public.documents from anon, authenticated;
revoke all on table public.activities from anon, authenticated;
revoke all on table public.research_sources from anon, authenticated;
revoke all on table public.organisations from anon, authenticated;
revoke all on table public.deliverables from anon, authenticated;
revoke all on table public.project_notes from anon, authenticated;
revoke all on table public.project_settings from anon, authenticated;

grant select on public.project_members to authenticated;
grant insert, update, delete on public.project_members to authenticated;

grant select on public.documents, public.activities, public.research_sources, public.organisations, public.deliverables, public.project_notes, public.project_settings to anon, authenticated;
grant insert, update, delete on public.documents, public.activities, public.research_sources, public.organisations, public.deliverables, public.project_notes, public.project_settings to authenticated;

-- Membership list is visible to authorised members; only admins manage it.
drop policy if exists "Members can view member directory" on public.project_members;
create policy "Members can view member directory" on public.project_members for select to authenticated using (public.is_project_member());
drop policy if exists "Admins manage project members" on public.project_members;
create policy "Admins manage project members" on public.project_members for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());

-- Documents: public visitors see only explicitly published records; members can see all.
drop policy if exists "Published documents are public" on public.documents;
create policy "Published documents are public" on public.documents for select to anon, authenticated using (visibility = 'public' or public.is_project_member());
drop policy if exists "Members insert documents" on public.documents;
create policy "Members insert documents" on public.documents for insert to authenticated with check (public.is_project_member() and uploaded_by = (select auth.uid()));
drop policy if exists "Members update documents" on public.documents;
create policy "Members update documents" on public.documents for update to authenticated using (public.is_project_member()) with check (public.is_project_member());
drop policy if exists "Members delete documents" on public.documents;
create policy "Members delete documents" on public.documents for delete to authenticated using (public.is_project_member());

-- Activities: public only sees published activity records.
drop policy if exists "Published activities are public" on public.activities;
create policy "Published activities are public" on public.activities for select to anon, authenticated using (visibility = 'public' or public.is_project_member());
drop policy if exists "Members insert activities" on public.activities;
create policy "Members insert activities" on public.activities for insert to authenticated with check (public.is_project_member() and created_by = (select auth.uid()));
drop policy if exists "Members update activities" on public.activities;
create policy "Members update activities" on public.activities for update to authenticated using (public.is_project_member()) with check (public.is_project_member());
drop policy if exists "Members delete activities" on public.activities;
create policy "Members delete activities" on public.activities for delete to authenticated using (public.is_project_member());

-- Research sources: source leads seeded below are public; member-created records default private in the UI.
drop policy if exists "Published sources are public" on public.research_sources;
create policy "Published sources are public" on public.research_sources for select to anon, authenticated using (visibility = 'public' or public.is_project_member());
drop policy if exists "Members insert sources" on public.research_sources;
create policy "Members insert sources" on public.research_sources for insert to authenticated with check (public.is_project_member() and created_by = (select auth.uid()));
drop policy if exists "Members update sources" on public.research_sources;
create policy "Members update sources" on public.research_sources for update to authenticated using (public.is_project_member()) with check (public.is_project_member());
drop policy if exists "Members delete sources" on public.research_sources;
create policy "Members delete sources" on public.research_sources for delete to authenticated using (public.is_project_member());

-- Organisations.
drop policy if exists "Published organisations are public" on public.organisations;
create policy "Published organisations are public" on public.organisations for select to anon, authenticated using (visibility = 'public' or public.is_project_member());
drop policy if exists "Members insert organisations" on public.organisations;
create policy "Members insert organisations" on public.organisations for insert to authenticated with check (public.is_project_member() and created_by = (select auth.uid()));
drop policy if exists "Members update organisations" on public.organisations;
create policy "Members update organisations" on public.organisations for update to authenticated using (public.is_project_member()) with check (public.is_project_member());
drop policy if exists "Members delete organisations" on public.organisations;
create policy "Members delete organisations" on public.organisations for delete to authenticated using (public.is_project_member());

-- Deliverables.
drop policy if exists "Published deliverables are public" on public.deliverables;
create policy "Published deliverables are public" on public.deliverables for select to anon, authenticated using (visibility = 'public' or public.is_project_member());
drop policy if exists "Members insert deliverables" on public.deliverables;
create policy "Members insert deliverables" on public.deliverables for insert to authenticated with check (public.is_project_member() and created_by = (select auth.uid()));
drop policy if exists "Members update deliverables" on public.deliverables;
create policy "Members update deliverables" on public.deliverables for update to authenticated using (public.is_project_member()) with check (public.is_project_member());
drop policy if exists "Members delete deliverables" on public.deliverables;
create policy "Members delete deliverables" on public.deliverables for delete to authenticated using (public.is_project_member());

-- Notes: public notes must be deliberately published; otherwise only members see them.
drop policy if exists "Published notes are public" on public.project_notes;
create policy "Published notes are public" on public.project_notes for select to anon, authenticated using (visibility = 'public' or public.is_project_member());
drop policy if exists "Members insert notes" on public.project_notes;
create policy "Members insert notes" on public.project_notes for insert to authenticated with check (public.is_project_member() and created_by = (select auth.uid()));
drop policy if exists "Members update notes" on public.project_notes;
create policy "Members update notes" on public.project_notes for update to authenticated using (public.is_project_member()) with check (public.is_project_member());
drop policy if exists "Members delete notes" on public.project_notes;
create policy "Members delete notes" on public.project_notes for delete to authenticated using (public.is_project_member());

-- Project settings: published project information is public; only members edit.
drop policy if exists "Project settings are public" on public.project_settings;
create policy "Project settings are public" on public.project_settings for select to anon, authenticated using (true);
drop policy if exists "Members manage project settings" on public.project_settings;
create policy "Members manage project settings" on public.project_settings for all to authenticated using (public.is_project_member()) with check (public.is_project_member());

-- Private storage bucket. Publicly published documents can be read through a storage policy;
-- private documents remain available only to authorised project members.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files', 'project-files', false, 104857600,
  array[
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain', 'image/png', 'image/jpeg', 'image/webp', 'application/zip', 'application/x-zip-compressed'
  ]
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Read published project files" on storage.objects;
create policy "Read published project files" on storage.objects for select to anon, authenticated using (
  bucket_id = 'project-files' and (
    public.is_project_member() or exists (
      select 1 from public.documents d where d.storage_path = name and d.visibility = 'public'
    )
  )
);
drop policy if exists "Members upload project files" on storage.objects;
create policy "Members upload project files" on storage.objects for insert to authenticated with check (
  bucket_id = 'project-files' and public.is_project_member()
);
drop policy if exists "Members update project files" on storage.objects;
create policy "Members update project files" on storage.objects for update to authenticated using (
  bucket_id = 'project-files' and public.is_project_member()
) with check (bucket_id = 'project-files' and public.is_project_member());
drop policy if exists "Members delete project files" on storage.objects;
create policy "Members delete project files" on storage.objects for delete to authenticated using (
  bucket_id = 'project-files' and public.is_project_member()
);

insert into public.project_settings (id, project_title)
values (1, 'Nagaland E-Waste Management Tracker')
on conflict (id) do nothing;
