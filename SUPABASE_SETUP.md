# Supabase quick setup

1. Create a project in Supabase.
2. In SQL Editor, run `supabase/migrations/001_workspace_schema.sql`.
3. Run `supabase/seed.sql`.
4. Invite your email in Authentication → Users.
5. Run this, replacing the email:

```sql
insert into public.project_members (user_id, email, role)
select id, email, 'admin'
from auth.users
where lower(email) = lower('YOUR_EMAIL_ADDRESS')
on conflict (user_id) do update set role = 'admin';
```

6. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local` locally and to Netlify environment variables after connecting the repository.

Never use the `service_role` key in the frontend.
