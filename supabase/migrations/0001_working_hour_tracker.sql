create extension if not exists pgcrypto;

create table if not exists public.executive_email_allowlist (
  email text primary key,
  added_at timestamptz not null default now()
);

insert into public.executive_email_allowlist (email)
values
  ('emidaz138@gmail.com'),
  ('exec@ableto.com')
on conflict (email) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'collaborator' check (role in ('executive', 'collaborator')),
  team text not null default 'Software Engineering',
  avatar_url text,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists profile_completed boolean not null default false;

create table if not exists public.work_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  team text not null,
  work_date date not null,
  hours numeric(5, 2) not null check (hours > 0 and hours <= 24),
  notes text not null check (char_length(notes) >= 20),
  verification_status text not null default 'verified' check (verification_status in ('verified', 'needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_log_media (
  id uuid primary key default gen_random_uuid(),
  work_log_id uuid not null references public.work_logs(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists work_logs_user_id_idx on public.work_logs(user_id);
create index if not exists work_logs_work_date_idx on public.work_logs(work_date desc);
create index if not exists work_logs_team_idx on public.work_logs(team);
create index if not exists work_log_media_log_id_idx on public.work_log_media(work_log_id);

alter table public.executive_email_allowlist enable row level security;
alter table public.profiles enable row level security;
alter table public.work_logs enable row level security;
alter table public.work_log_media enable row level security;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_executive_email(email_to_check text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.executive_email_allowlist allowlist
    where lower(allowlist.email) = lower(email_to_check)
  );
$$;

create or replace function public.is_executive(user_id_to_check uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = user_id_to_check
      and profile.role = 'executive'
  );
$$;

create or replace function public.role_for_email(email_to_check text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_executive_email(email_to_check) then 'executive'
    else 'collaborator'
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    team,
    avatar_url,
    profile_completed
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    public.role_for_email(new.email),
    coalesce(new.raw_user_meta_data ->> 'team', 'Software Engineering'),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce((new.raw_user_meta_data ->> 'profile_completed')::boolean, false)
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = public.role_for_email(excluded.email),
    team = coalesce(excluded.team, public.profiles.team),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    profile_completed = excluded.profile_completed,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

drop trigger if exists work_logs_updated_at on public.work_logs;
create trigger work_logs_updated_at
before update on public.work_logs
for each row execute function public.handle_updated_at();

drop policy if exists "Executive allowlist is visible to executives" on public.executive_email_allowlist;
drop policy if exists "Profiles visible to owner and executives" on public.profiles;
drop policy if exists "Profiles can be inserted by their owner" on public.profiles;
drop policy if exists "Profiles can be updated by owner without privilege escalation" on public.profiles;
drop policy if exists "Profiles can be managed by executives" on public.profiles;
drop policy if exists "Work logs visible to owner and executives" on public.work_logs;
drop policy if exists "Work logs inserted by owner" on public.work_logs;
drop policy if exists "Work logs updated by owner and executives" on public.work_logs;
drop policy if exists "Work logs deleted by owner and executives" on public.work_logs;
drop policy if exists "Work media visible with parent log" on public.work_log_media;
drop policy if exists "Work media inserted by log owner" on public.work_log_media;
drop policy if exists "Work media deleted by owner and executives" on public.work_log_media;
drop policy if exists "Work media objects visible to owner and executives" on storage.objects;
drop policy if exists "Work media objects inserted by owner" on storage.objects;
drop policy if exists "Work media objects deleted by owner and executives" on storage.objects;

create policy "Executive allowlist is visible to executives"
on public.executive_email_allowlist
for select
to authenticated
using (public.is_executive(auth.uid()));

create policy "Profiles visible to owner and executives"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_executive(auth.uid()));

create policy "Profiles can be inserted by their owner"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role = public.role_for_email(email)
);

create policy "Profiles can be updated by owner without privilege escalation"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = public.role_for_email(email)
);

create policy "Profiles can be managed by executives"
on public.profiles
for update
to authenticated
using (public.is_executive(auth.uid()))
with check (true);

create policy "Work logs visible to owner and executives"
on public.work_logs
for select
to authenticated
using (user_id = auth.uid() or public.is_executive(auth.uid()));

create policy "Work logs inserted by owner"
on public.work_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and team = (
    select profile.team
    from public.profiles profile
    where profile.id = auth.uid()
  )
);

create policy "Work logs updated by owner and executives"
on public.work_logs
for update
to authenticated
using (user_id = auth.uid() or public.is_executive(auth.uid()))
with check (user_id = auth.uid() or public.is_executive(auth.uid()));

create policy "Work logs deleted by owner and executives"
on public.work_logs
for delete
to authenticated
using (user_id = auth.uid() or public.is_executive(auth.uid()));

create policy "Work media visible with parent log"
on public.work_log_media
for select
to authenticated
using (
  exists (
    select 1
    from public.work_logs log
    where log.id = work_log_media.work_log_id
      and (log.user_id = auth.uid() or public.is_executive(auth.uid()))
  )
);

create policy "Work media inserted by log owner"
on public.work_log_media
for insert
to authenticated
with check (
  exists (
    select 1
    from public.work_logs log
    where log.id = work_log_media.work_log_id
      and log.user_id = auth.uid()
  )
);

create policy "Work media deleted by owner and executives"
on public.work_log_media
for delete
to authenticated
using (
  exists (
    select 1
    from public.work_logs log
    where log.id = work_log_media.work_log_id
      and (log.user_id = auth.uid() or public.is_executive(auth.uid()))
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'work-media',
  'work-media',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Work media objects visible to owner and executives"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'work-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_executive(auth.uid())
  )
);

create policy "Work media objects inserted by owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'work-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Work media objects deleted by owner and executives"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'work-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_executive(auth.uid())
  )
);

grant execute on function public.is_executive(uuid) to authenticated;
grant execute on function public.is_executive_email(text) to authenticated;
grant execute on function public.role_for_email(text) to authenticated;
