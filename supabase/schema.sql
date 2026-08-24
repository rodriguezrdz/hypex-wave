-- ============================================================
-- HYPEX WAVE — Schema Supabase (PostgreSQL)
-- Como usar:
--   1. Crie um projeto gratuito em https://supabase.com
--   2. Abra SQL Editor → New query
--   3. Cole TODO este arquivo e clique em RUN
--   4. Settings → API → copie Project URL e anon public key
--      e cole no app (menu Banco de Dados) ou em config.js
-- ============================================================

-- ---------- PERFIS ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text default 'Dono',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------- DADOS DA APLICAÇÃO (blob por usuário) ----------
create table if not exists public.app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

drop policy if exists "app_data_select_own" on public.app_data;
create policy "app_data_select_own"
  on public.app_data for select
  using (auth.uid() = user_id);

drop policy if exists "app_data_insert_own" on public.app_data;
create policy "app_data_insert_own"
  on public.app_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "app_data_update_own" on public.app_data;
create policy "app_data_update_own"
  on public.app_data for update
  using (auth.uid() = user_id);

drop policy if exists "app_data_delete_own" on public.app_data;
create policy "app_data_delete_own"
  on public.app_data for delete
  using (auth.uid() = user_id);

-- ---------- PERFIL CRIADO AUTOMATICAMENTE NO SIGNUP ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'Dono'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- ATUALIZA updated_at AUTOMATICAMENTE ----------
create or replace function public.touch_app_data()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_data_touch on public.app_data;
create trigger app_data_touch
  before update on public.app_data
  for each row execute function public.touch_app_data();
