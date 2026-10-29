-- Minimaler Nachbau der Supabase-Umgebung für lokale Tests (nicht im echten Projekt ausführen)
create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table public.overall_profiles (id uuid primary key, display_name text, role text default 'guest');
create function public.overall_is_admin() returns boolean language sql stable security definer set search_path to '' as
    $$ select exists (select 1 from public.overall_profiles p where p.id = (select auth.uid()) and p.role = 'admin') $$;
create table public.dailymind_entries (id serial, user_id uuid, morning_done_at timestamptz, evening_done_at timestamptz);
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
