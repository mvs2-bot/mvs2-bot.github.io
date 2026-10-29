-- Websiteübergreifendes Streak-System im Supabase-Core-Projekt (syaonnedmidaipwjjmio).
-- Regeln und Randfälle: docs/STREAK.md. Tests: supabase/tests/run.sh
--
-- Verbindlich gerechnet wird nur hier. Seiten melden Aktivitäten per streak_log() oder per Trigger
-- auf ihren Tabellen. Vorerst zählt nur DailyMind (gespeicherte Morgen- oder Abendroutine, Trigger unten).
-- Weitere App: Regel in streak_rules eintragen und Trigger anlegen oder streak_log() aufrufen.

-- Welche Aktivitäten zählen (app + kind). Abschalten = active false, ohne Codeänderung.
create table if not exists public.streak_rules (
    app        text not null,
    kind       text not null,
    label      text not null,
    active     boolean not null default true,
    primary key (app, kind)
);
comment on table public.streak_rules is 'Streak: welche Aktivität (App + Art) als aktiver Tag zählt.';

-- Stand je Konto. tz = zuletzt gemeldete Zeitzone (für Trigger und Anzeige).
create table if not exists public.streak_state (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    current    integer not null default 0,
    best       integer not null default 0,
    last_day   date,
    freezes    smallint not null default 0 check (freezes between 0 and 2),
    tz         text not null default 'Europe/Berlin',
    updated_at timestamptz not null default now()
);
comment on table public.streak_state is 'Streak: aktuelle Serie, Rekord, letzter aktiver Tag, Freezes je Konto. Schreiben nur über streak_apply().';

-- Historie: ein Eintrag je Konto und Kalendertag. frozen = durch Freeze überbrückt, nicht aktiv.
create table if not exists public.streak_days (
    user_id    uuid not null references auth.users (id) on delete cascade,
    day        date not null,
    frozen     boolean not null default false,
    apps       text[] not null default '{}',
    primary key (user_id, day)
);
comment on table public.streak_days is 'Streak: aktive (oder per Freeze überbrückte) Kalendertage je Konto.';

-- Persönlicher Schalter je App (Kontoeinstellungen). Keine Zeile = an.
create table if not exists public.streak_prefs (
    user_id    uuid not null references auth.users (id) on delete cascade,
    app        text not null,
    enabled    boolean not null default true,
    primary key (user_id, app)
);
comment on table public.streak_prefs is 'Streak: je Konto und App an/aus. Aus = App zählt nicht und zeigt keinen Streak.';

alter table public.streak_rules enable row level security;
alter table public.streak_state enable row level security;
alter table public.streak_days  enable row level security;
alter table public.streak_prefs enable row level security;

drop policy if exists streak_rules_read on public.streak_rules;
create policy streak_rules_read on public.streak_rules for select to authenticated using (true);
drop policy if exists streak_rules_admin on public.streak_rules;
create policy streak_rules_admin on public.streak_rules for update to authenticated
    using ((select public.overall_is_admin())) with check ((select public.overall_is_admin()));
drop policy if exists streak_state_own on public.streak_state;
create policy streak_state_own on public.streak_state for select to authenticated
    using (user_id = (select auth.uid()) or (select public.overall_is_admin()));
drop policy if exists streak_days_own on public.streak_days;
create policy streak_days_own on public.streak_days for select to authenticated
    using (user_id = (select auth.uid()) or (select public.overall_is_admin()));
drop policy if exists streak_prefs_own on public.streak_prefs;
create policy streak_prefs_own on public.streak_prefs for all to authenticated
    using (user_id = (select auth.uid()) or (select public.overall_is_admin())) with check (user_id = (select auth.uid()));
-- Kein insert/update/delete für Clients: nur die security-definer-Funktionen schreiben.
revoke insert, update, delete on public.streak_state, public.streak_days from anon, authenticated;
revoke insert, delete on public.streak_rules from anon, authenticated;

insert into public.streak_rules (app, kind, label) values
    ('dailymind', 'entry', 'Eintrag in DailyMind gespeichert (Morgen oder Abend)')
on conflict (app, kind) do nothing;

-- Gültige IANA-Zeitzone oder null
create or replace function public.streak_tz(p_tz text)
returns text language sql stable set search_path to '' as $$
    select n.name from pg_catalog.pg_timezone_names n where n.name = p_tz limit 1;
$$;

-- Lesesicht für einen Zeitpunkt: Serie gilt als gebrochen, wenn mehr Tage fehlen, als Freezes da sind.
create or replace function public.streak_status_at(p_user uuid, p_at timestamptz, p_tz text)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
    s public.streak_state;
    v_tz text;
    v_today date;
    v_missed integer;
    v_alive boolean;
begin
    select * into s from public.streak_state where user_id = p_user;
    v_tz := coalesce(public.streak_tz(p_tz), s.tz, 'Europe/Berlin');
    v_today := (p_at at time zone v_tz)::date;
    v_missed := case when s.last_day is null then null else v_today - s.last_day - 1 end;
    v_alive := v_missed is not null and v_missed <= coalesce(s.freezes, 0);
    return jsonb_build_object(
        'current',    case when v_alive then s.current else 0 end,
        'best',       coalesce(s.best, 0),
        'last_day',   s.last_day,
        'freezes',    coalesce(s.freezes, 0),
        'today',      v_today,
        'tz',         v_tz,
        'today_done', s.last_day is not null and s.last_day >= v_today,
        -- Serie läuft, heute fehlt noch: Erinnerung zeigen
        'at_risk',    v_alive and v_missed >= 0,
        -- Fehltage, die beim nächsten Aktivtag Freezes kosten
        'missed',     greatest(coalesce(v_missed, 0), 0),
        'days',       coalesce((select jsonb_agg(jsonb_build_object('d', d.day, 'f', d.frozen, 'apps', d.apps) order by d.day)
                                from public.streak_days d where d.user_id = p_user and d.day > v_today - 70), '[]'::jsonb)
    );
end;
$$;

-- Kern: eine Aktivität verbuchen. Idempotent je Tag, Zeile gesperrt gegen parallele Anfragen.
create or replace function public.streak_apply(p_user uuid, p_app text, p_kind text, p_at timestamptz, p_tz text)
returns jsonb language plpgsql volatile security definer set search_path to '' as $$
declare
    s public.streak_state;
    v_tz text;
    v_day date;
    v_gap integer;
    v_earned boolean := false;
    v_new boolean;
begin
    if p_user is null then raise exception 'Nicht angemeldet' using errcode = '42501'; end if;
    if not exists (select 1 from public.streak_rules r where r.app = p_app and r.kind = p_kind and r.active) then
        return jsonb_build_object('counted', false, 'reason', 'rule') || public.streak_status_at(p_user, p_at, p_tz);
    end if;
    if exists (select 1 from public.streak_prefs f where f.user_id = p_user and f.app = p_app and not f.enabled) then
        return jsonb_build_object('counted', false, 'reason', 'off') || public.streak_status_at(p_user, p_at, p_tz);
    end if;

    insert into public.streak_state (user_id) values (p_user) on conflict (user_id) do nothing;
    select * into s from public.streak_state where user_id = p_user for update;

    v_tz := coalesce(public.streak_tz(p_tz), s.tz);
    v_day := (p_at at time zone v_tz)::date;
    v_new := s.last_day is null or v_day > s.last_day;

    insert into public.streak_days as d (user_id, day, apps) values (p_user, v_day, array[p_app])
    on conflict (user_id, day) do update
        set frozen = false,
            apps = case when p_app = any (d.apps) then d.apps else d.apps || p_app end;

    if s.last_day is null then
        s.current := 1;
    elsif v_day > s.last_day then
        v_gap := v_day - s.last_day - 1;
        if v_gap = 0 then
            s.current := s.current + 1;
        elsif v_gap <= s.freezes then
            insert into public.streak_days (user_id, day, frozen)
            select p_user, g::date, true from generate_series(s.last_day + 1, v_day - 1, interval '1 day') g
            on conflict (user_id, day) do nothing;
            s.freezes := s.freezes - v_gap;
            s.current := s.current + 1;
        else
            s.current := 1;
        end if;
        -- je 7 Tage Serie ein Freeze, höchstens 2 auf Vorrat
        if s.current % 7 = 0 and s.freezes < 2 then
            s.freezes := s.freezes + 1;
            v_earned := true;
        end if;
    end if;
    -- v_day <= last_day: gleicher Tag (oder per Zeitzonenwechsel zurück): Tag ist erfasst, Zähler bleibt

    update public.streak_state
       set current = s.current, best = greatest(s.best, s.current), last_day = greatest(s.last_day, v_day),
           freezes = s.freezes, tz = v_tz, updated_at = now()
     where user_id = p_user;

    return jsonb_build_object('counted', true, 'new_day', v_new,
                              'earned_freeze', v_earned)
        || public.streak_status_at(p_user, p_at, v_tz);
end;
$$;

-- Öffentliche Schnittstelle für alle Seiten (angemeldet). Zeit kommt vom Server, nicht vom Client.
create or replace function public.streak_log(p_app text, p_kind text, p_tz text default null)
returns jsonb language sql volatile security definer set search_path to '' as $$
    select public.streak_apply((select auth.uid()), p_app, p_kind, now(), p_tz);
$$;

-- p_app: zusätzlich 'enabled' = persönlicher Schalter dieser App
create or replace function public.streak_status(p_tz text default null, p_app text default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
    if (select auth.uid()) is null then raise exception 'Nicht angemeldet' using errcode = '42501'; end if;
    return public.streak_status_at((select auth.uid()), now(), p_tz)
        || jsonb_build_object('enabled', not exists (select 1 from public.streak_prefs f
                                                     where f.user_id = (select auth.uid()) and f.app = p_app and not f.enabled));
end;
$$;

-- Admin-Übersicht: Streaks aller Konten (nur globale Admins)
create or replace function public.streak_admin_overview()
returns table (user_id uuid, display_name text, email text, current integer, best integer, last_day date,
               freezes integer, today_done boolean, at_risk boolean, off_apps text[])
language plpgsql stable security definer set search_path to '' as $$
begin
    if not public.overall_is_admin() then raise exception 'Nur für Admins' using errcode = '42501'; end if;
    return query
    select u.id, p.display_name, u.email::text,
           (st->>'current')::int, (st->>'best')::int, (st->>'last_day')::date, (st->>'freezes')::int,
           (st->>'today_done')::boolean, (st->>'at_risk')::boolean,
           array(select f.app from public.streak_prefs f where f.user_id = u.id and not f.enabled order by f.app)
      from auth.users u
      left join public.overall_profiles p on p.id = u.id
      cross join lateral (select public.streak_status_at(u.id, now(), null) - 'days' as st) x
     order by (st->>'current')::int desc, (st->>'best')::int desc, coalesce(p.display_name, u.email);
end;
$$;

-- Trigger für bestehende Apps: Aktivität aus Tabellenzeilen ableiten, ohne die Apps zu ändern.
-- TG_ARGV: app, kind, Spalte mit der User-ID. Fehler hier dürfen das Speichern in der App nie verhindern.
create or replace function public.streak_from_row()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
    begin
        perform public.streak_apply((to_jsonb(new) ->> tg_argv[2])::uuid, tg_argv[0], tg_argv[1], now(), null);
    exception when others then
        raise warning 'streak_from_row %/%: %', tg_argv[0], tg_argv[1], sqlerrm;
    end;
    return null;
end;
$$;

-- DailyMind: zählt, sobald eine Routine neu als erledigt gespeichert wird (an dem Tag, an dem das passiert)
drop trigger if exists streak_dailymind on public.dailymind_entries;
create trigger streak_dailymind after insert on public.dailymind_entries
    for each row when (new.morning_done_at is not null or new.evening_done_at is not null)
    execute function public.streak_from_row('dailymind', 'entry', 'user_id');
drop trigger if exists streak_dailymind_upd on public.dailymind_entries;
create trigger streak_dailymind_upd after update of morning_done_at, evening_done_at on public.dailymind_entries
    for each row when (new.morning_done_at is distinct from old.morning_done_at and new.morning_done_at is not null
                    or new.evening_done_at is distinct from old.evening_done_at and new.evening_done_at is not null)
    execute function public.streak_from_row('dailymind', 'entry', 'user_id');

-- Interne Funktionen nicht über die API erreichbar
revoke execute on function public.streak_apply(uuid, text, text, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.streak_status_at(uuid, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.streak_from_row() from public, anon, authenticated;
revoke execute on function public.streak_log(text, text, text) from public, anon;
revoke execute on function public.streak_status(text, text) from public, anon;
revoke execute on function public.streak_admin_overview() from public, anon;
grant execute on function public.streak_log(text, text, text), public.streak_status(text, text), public.streak_admin_overview() to authenticated;
