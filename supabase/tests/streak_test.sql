-- Tests der Streak-Berechnung (Tageswechsel, Doppelte, Fehltage, Freeze, Zeitzonen, Rechte).
-- Läuft über run.sh gegen stub.sql + 001_streak.sql. Jeder Fehler bricht mit ASSERT ab.
\set QUIET on
insert into auth.users values
    ('00000000-0000-0000-0000-00000000000a', 'a@test'), ('00000000-0000-0000-0000-00000000000b', 'b@test'),
    ('00000000-0000-0000-0000-00000000000c', 'c@test'), ('00000000-0000-0000-0000-00000000000d', 'd@test');
insert into public.overall_profiles values ('00000000-0000-0000-0000-00000000000a', 'Admin', 'admin'), ('00000000-0000-0000-0000-00000000000b', 'Bea', 'member');

-- Testregel, damit die Tests nicht von den echten Regeln abhängen
insert into public.streak_rules (app, kind, label) values ('test', 'visit', 'Test');

-- Kurzform: Aktivität für Nutzer u zum Zeitpunkt at (Zeitzone tz) melden
create function t(u char, at text, tz text default 'Europe/Berlin', app text default 'test', kind text default 'visit')
returns jsonb language sql as $$
    select public.streak_apply(('00000000-0000-0000-0000-00000000000' || u)::uuid, app, kind, at::timestamptz, tz)
$$;
create function st(u char, at text, tz text default 'Europe/Berlin') returns jsonb language sql as $$
    select public.streak_status_at(('00000000-0000-0000-0000-00000000000' || u)::uuid, at::timestamptz, tz)
$$;

do $$ declare r jsonb; begin
    -- Erster Tag
    r := t('a', '2026-03-02 09:00+01');
    assert (r->>'current')::int = 1 and (r->>'best')::int = 1 and (r->>'new_day')::bool, 'erster Tag: ' || r::text;
    -- Doppelte Aktivität am selben Tag, auch aus einer anderen App
    r := t('a', '2026-03-02 09:00+01');
    r := t('a', '2026-03-02 21:00+01', 'Europe/Berlin', 'dailymind', 'entry');
    assert (r->>'current')::int = 1 and not (r->>'new_day')::bool, 'doppelt: ' || r::text;
    assert (select apps from streak_days where day = '2026-03-02') = '{test,dailymind}', 'apps je Tag';
    -- Tageswechsel um Mitternacht Ortszeit: 23:59 und 00:01 sind zwei Tage
    r := t('a', '2026-03-03 23:59+01');
    r := t('a', '2026-03-04 00:01+01');
    assert (r->>'current')::int = 3 and (r->>'last_day')::date = '2026-03-04', 'Mitternacht: ' || r::text;
    assert (r->>'today_done')::bool and not (r->>'at_risk')::bool, 'heute erledigt: ' || r::text;
end $$;

do $$ declare r jsonb; begin
    -- Lesesicht: am nächsten Tag noch offen (Erinnerung), übermorgen ohne Freeze gebrochen
    r := st('a', '2026-03-05 12:00+01');
    assert (r->>'current')::int = 3 and (r->>'at_risk')::bool and not (r->>'today_done')::bool, 'offen: ' || r::text;
    r := st('a', '2026-03-06 12:00+01');
    assert (r->>'current')::int = 0 and not (r->>'at_risk')::bool and (r->>'best')::int = 3, 'gebrochen (Lesen): ' || r::text;
    -- Verpasster Tag ohne Freeze: neue Serie, Rekord bleibt
    r := t('a', '2026-03-06 12:00+01');
    assert (r->>'current')::int = 1 and (r->>'best')::int = 3, 'Neustart: ' || r::text;
end $$;

do $$ declare r jsonb; i int; begin
    -- 7 Tage am Stück bringen einen Freeze
    for i in 0..6 loop r := t('b', ('2026-04-01 10:00+02'::timestamptz + make_interval(days => i))::text); end loop;
    assert (r->>'current')::int = 7 and (r->>'freezes')::int = 1 and (r->>'earned_freeze')::bool, 'Freeze verdient: ' || r::text;
    -- Ein Tag fehlt (08.04.): Freeze überbrückt, Serie läuft weiter, Tag ist als frozen gespeichert
    assert (st('b', '2026-04-09 08:00+02')->>'current')::int = 7, 'mit Freeze nicht gebrochen';
    r := t('b', '2026-04-09 10:00+02');
    assert (r->>'current')::int = 8 and (r->>'freezes')::int = 0, 'Freeze genutzt: ' || r::text;
    assert (select frozen from streak_days where user_id = '00000000-0000-0000-0000-00000000000b' and day = '2026-04-08'), 'Tag gefroren';
    assert (select count(*) from streak_days where user_id = '00000000-0000-0000-0000-00000000000b' and not frozen) = 8, 'nur echte Tage aktiv';
    -- Zwei Fehltage bei 0 Freezes: Neustart
    r := t('b', '2026-04-12 10:00+02');
    assert (r->>'current')::int = 1 and (r->>'best')::int = 8, 'zu viele Fehltage: ' || r::text;
    -- Höchstens 2 Freezes auf Vorrat
    for i in 1..27 loop r := t('b', ('2026-04-12 10:00+02'::timestamptz + make_interval(days => i))::text); end loop;
    assert (r->>'current')::int = 28 and (r->>'freezes')::int = 2, 'max 2 Freezes: ' || r::text;
    -- Zwei Fehltage mit 2 Freezes: überbrückt
    r := t('b', '2026-05-12 10:00+02');  -- letzter Tag 09.05., es fehlen 10. und 11.
    assert (r->>'current')::int = 29 and (r->>'freezes')::int = 0, 'zwei Freezes: ' || r::text;
end $$;

do $$ declare r jsonb; begin
    -- Zeitzonen: 23:30 UTC ist in Berlin schon der nächste Tag, in New York noch derselbe
    r := t('c', '2026-03-10 23:30+00', 'Europe/Berlin');
    assert (r->>'last_day')::date = '2026-03-11', 'Berlin: ' || r::text;
    r := t('c', '2026-03-11 23:30+00', 'America/New_York');
    assert (r->>'last_day')::date = '2026-03-11' and (r->>'current')::int = 1, 'New York, gleicher Tag: ' || r::text;
    assert (r->>'tz') = 'America/New_York', 'Zeitzone gemerkt';
    -- Ungültige Zeitzone: gespeicherte gilt weiter
    r := t('c', '2026-03-12 18:00+00', 'Mars/Olympus');
    assert (r->>'tz') = 'America/New_York' and (r->>'current')::int = 2, 'ungültige Zone: ' || r::text;
    -- Zeitzonenwechsel zurück in einen schon gezählten Tag: Zähler bleibt
    r := t('c', '2026-03-12 23:30+00', 'Pacific/Kiritimati');  -- dort schon der 13.03.
    r := t('c', '2026-03-13 05:00+00', 'America/Los_Angeles'); -- dort noch der 12.03.
    assert (r->>'current')::int = 3 and (r->>'last_day')::date = '2026-03-13', 'Zone zurück: ' || r::text;
    -- Sommerzeit-Umstellung (29.03.2026 in Berlin) ändert keine Kalendertage
    r := t('d', '2026-03-28 23:30+01');
    r := t('d', '2026-03-29 00:30+01');
    assert (r->>'current')::int = 2, 'Sommerzeit: ' || r::text;
end $$;

do $$ declare r jsonb; begin
    -- Abgeschaltete Regel zählt nicht
    update streak_rules set active = false where app = 'test';
    r := t('d', '2026-03-30 10:00+02');
    assert not (r->>'counted')::bool and (r->>'current')::int = 2, 'Regel aus: ' || r::text;
    r := t('d', '2026-03-30 10:00+02', 'Europe/Berlin', 'gibtsnicht', 'x');
    assert not (r->>'counted')::bool, 'unbekannte Regel';
    update streak_rules set active = true where app = 'test';
    -- Persönlich abgeschaltet: diese App zählt nicht
    insert into streak_prefs values ('00000000-0000-0000-0000-00000000000d', 'test', false);
    r := t('d', '2026-03-30 10:00+02');
    assert not (r->>'counted')::bool and r->>'reason' = 'off', 'Schalter aus: ' || r::text;
    delete from streak_prefs;
end $$;

-- Trigger aus bestehenden Apps; kaputte Zeilen dürfen das Speichern nicht verhindern
insert into dailymind_entries (user_id, morning_done_at) values (null, now());
insert into dailymind_entries (user_id) values ('00000000-0000-0000-0000-00000000000d');  -- noch nichts erledigt
do $$ begin
    assert (select count(*) from dailymind_entries) = 2, 'Insert trotz Fehler im Trigger gespeichert';
    assert not exists (select 1 from streak_days where 'dailymind' = any (apps) and user_id = '00000000-0000-0000-0000-00000000000d'), 'leerer DailyMind-Eintrag zählt nicht';
end $$;
update dailymind_entries set morning_done_at = now() where user_id is not null;
do $$ begin
    assert exists (select 1 from streak_days where 'dailymind' = any (apps) and user_id = '00000000-0000-0000-0000-00000000000d'
                   and day = (now() at time zone 'Europe/Berlin')::date), 'DailyMind zählt';
end $$;

-- Rechte: Clients schreiben nur über streak_log, sehen nur sich selbst, Übersicht nur für Admins
set role authenticated;
set test.uid = '00000000-0000-0000-0000-00000000000b';
do $$ declare r jsonb; ok boolean; begin
    r := public.streak_log('test', 'visit', 'Europe/Berlin');
    assert (r->>'counted')::bool, 'streak_log: ' || r::text;
    assert (select count(distinct user_id) from streak_state) = 1, 'nur eigener Stand sichtbar';
    insert into dailymind_entries (user_id, evening_done_at) values (auth.uid(), now());  -- Trigger läuft auch mit Client-Rechten
    assert (select 'dailymind' = any (apps) from streak_days where day = (now() at time zone 'Europe/Berlin')::date), 'Trigger als Client';
    insert into streak_prefs values (auth.uid(), 'dailymind', false);
    assert not (public.streak_status('Europe/Berlin', 'dailymind')->>'enabled')::bool, 'Schalter lesbar';
    assert (public.streak_status('Europe/Berlin', 'test')->>'enabled')::bool, 'andere App an';
    begin insert into streak_prefs values ('00000000-0000-0000-0000-00000000000a', 'dailymind', false); ok := false;
    exception when insufficient_privilege then ok := true; end;
    assert ok, 'fremden Schalter nicht setzbar';
    begin perform public.streak_apply(auth.uid(), 'test', 'visit', now(), null); ok := false;
    exception when insufficient_privilege then ok := true; end;
    assert ok, 'streak_apply gesperrt';
    begin update streak_state set current = 999; ok := false;
    exception when insufficient_privilege then ok := true; end;
    assert ok, 'kein direktes Schreiben';
    begin perform public.streak_admin_overview(); ok := false;
    exception when insufficient_privilege then ok := true; end;
    assert ok, 'Übersicht nur Admins';
    update streak_rules set active = false;
    assert (select bool_and(active) from streak_rules), 'Regeln nur Admins';
end $$;
set test.uid = '00000000-0000-0000-0000-00000000000a';
do $$ begin
    assert (select count(*) from public.streak_admin_overview()) = 4, 'Admin sieht alle Konten';
    assert (select count(distinct user_id) from streak_state) = 4, 'Admin liest alle';
end $$;
reset role;
\echo 'Alle Streak-Tests bestanden.'
