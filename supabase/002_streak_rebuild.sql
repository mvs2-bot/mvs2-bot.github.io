-- Streak: Löschen zählt mit. Wird ein DailyMind-Eintrag gelöscht (oder ganz geleert), fällt sein Tag
-- aus der Historie und der Stand wird aus den verbleibenden Tagen neu berechnet. Regeln: docs/STREAK.md

-- Kern ohne Prüfungen: einen Kalendertag für eine App verbuchen (von streak_apply und streak_rebuild genutzt)
create or replace function public.streak_count(p_user uuid, p_app text, p_day date, p_tz text)
returns jsonb language plpgsql volatile security definer set search_path to '' as $$
declare
    s public.streak_state;
    v_gap integer;
    v_earned boolean := false;
    v_new boolean;
begin
    insert into public.streak_state (user_id) values (p_user) on conflict (user_id) do nothing;
    select * into s from public.streak_state where user_id = p_user for update;
    v_new := s.last_day is null or p_day > s.last_day;

    insert into public.streak_days as d (user_id, day, apps) values (p_user, p_day, array[p_app])
    on conflict (user_id, day) do update
        set frozen = false,
            apps = case when p_app = any (d.apps) then d.apps else d.apps || p_app end;

    if s.last_day is null then
        s.current := 1;
    elsif p_day > s.last_day then
        v_gap := p_day - s.last_day - 1;
        if v_gap = 0 then
            s.current := s.current + 1;
        elsif v_gap <= s.freezes then
            insert into public.streak_days (user_id, day, frozen)
            select p_user, g::date, true from generate_series(s.last_day + 1, p_day - 1, interval '1 day') g
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
    -- p_day <= last_day: gleicher Tag (oder per Zeitzonenwechsel zurück): Tag ist erfasst, Zähler bleibt

    update public.streak_state
       set current = s.current, best = greatest(s.best, s.current), last_day = greatest(s.last_day, p_day),
           freezes = s.freezes, tz = coalesce(p_tz, s.tz), updated_at = now()
     where user_id = p_user;
    return jsonb_build_object('new_day', v_new, 'earned_freeze', v_earned);
end;
$$;

-- Aktivität verbuchen: Regel und Schalter prüfen, Tag in der Zeitzone bestimmen, dann streak_count
create or replace function public.streak_apply(p_user uuid, p_app text, p_kind text, p_at timestamptz, p_tz text)
returns jsonb language plpgsql volatile security definer set search_path to '' as $$
declare
    v_tz text;
    r jsonb;
begin
    if p_user is null then raise exception 'Nicht angemeldet' using errcode = '42501'; end if;
    if not exists (select 1 from public.streak_rules r where r.app = p_app and r.kind = p_kind and r.active) then
        return jsonb_build_object('counted', false, 'reason', 'rule') || public.streak_status_at(p_user, p_at, p_tz);
    end if;
    if exists (select 1 from public.streak_prefs f where f.user_id = p_user and f.app = p_app and not f.enabled) then
        return jsonb_build_object('counted', false, 'reason', 'off') || public.streak_status_at(p_user, p_at, p_tz);
    end if;
    v_tz := coalesce(public.streak_tz(p_tz), (select s.tz from public.streak_state s where s.user_id = p_user), 'Europe/Berlin');
    r := public.streak_count(p_user, p_app, (p_at at time zone v_tz)::date, v_tz);
    return jsonb_build_object('counted', true) || r || public.streak_status_at(p_user, p_at, v_tz);
end;
$$;

-- Stand eines Kontos aus seinen aktiven Tagen neu aufbauen (Freezes und Rekord neu gerechnet)
create or replace function public.streak_rebuild(p_user uuid)
returns void language plpgsql volatile security definer set search_path to '' as $$
declare
    v_days jsonb;
    v_tz text;
    d jsonb;
    a text;
begin
    perform 1 from public.streak_state where user_id = p_user for update;
    select s.tz into v_tz from public.streak_state s where s.user_id = p_user;
    select coalesce(jsonb_agg(jsonb_build_object('day', x.day, 'apps', x.apps) order by x.day), '[]')
      into v_days from public.streak_days x where x.user_id = p_user and not x.frozen and cardinality(x.apps) > 0;
    delete from public.streak_days where user_id = p_user;
    delete from public.streak_state where user_id = p_user;
    for d in select * from jsonb_array_elements(v_days) loop
        for a in select jsonb_array_elements_text(d->'apps') loop
            perform public.streak_count(p_user, a, (d->>'day')::date, v_tz);
        end loop;
    end loop;
end;
$$;

-- DailyMind-Eintrag gelöscht oder geleert: Tag (Eintragsdatum) verliert DailyMind, Stand neu rechnen
create or replace function public.streak_dailymind_removed()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
    begin
        update public.streak_days set apps = array_remove(apps, 'dailymind')
         where user_id = old.user_id and day = old.entry_date and not frozen;
        delete from public.streak_days where user_id = old.user_id and day = old.entry_date and cardinality(apps) = 0 and not frozen;
        perform public.streak_rebuild(old.user_id);
    exception when others then
        raise warning 'streak_dailymind_removed: %', sqlerrm;
    end;
    return null;
end;
$$;

drop trigger if exists streak_dailymind_del on public.dailymind_entries;
create trigger streak_dailymind_del after delete on public.dailymind_entries
    for each row when (old.morning_done_at is not null or old.evening_done_at is not null)
    execute function public.streak_dailymind_removed();
drop trigger if exists streak_dailymind_clear on public.dailymind_entries;
create trigger streak_dailymind_clear after update of morning_done_at, evening_done_at on public.dailymind_entries
    for each row when (new.morning_done_at is null and new.evening_done_at is null
                       and (old.morning_done_at is not null or old.evening_done_at is not null))
    execute function public.streak_dailymind_removed();

revoke execute on function public.streak_count(uuid, text, date, text) from public, anon, authenticated;
revoke execute on function public.streak_rebuild(uuid) from public, anon, authenticated;
revoke execute on function public.streak_dailymind_removed() from public, anon, authenticated;
