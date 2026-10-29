#!/bin/sh
# Lokale Tests der Streak-Berechnung gegen ein frisches Postgres (braucht initdb/pg_ctl/psql).
# Aufruf: sh supabase/tests/run.sh
set -e
cd "$(dirname "$0")"
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1); PATH="$BIN:$PATH"
DIR=$(mktemp -d); trap 'pg_ctl -D "$DIR/db" -m immediate stop >/dev/null 2>&1; rm -rf "$DIR"' EXIT
initdb -D "$DIR/db" -U postgres >/dev/null
pg_ctl -D "$DIR/db" -o "-k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
P="psql -h $DIR -U postgres -X -q -v ON_ERROR_STOP=1"; export PGOPTIONS="-c client_min_messages=warning"
$P -c 'create database t' && $P -d t -f stub.sql -f ../001_streak.sql -f streak_test.sql
# Gleichzeitige Anfragen: 20 parallele Meldungen desselben Kontos am selben Tag zählen einmal
$P -d t -c "insert into auth.users values ('00000000-0000-0000-0000-0000000000ee', 'p@test')"
for i in $(seq 20); do
  $P -d t -c "select public.streak_apply('00000000-0000-0000-0000-0000000000ee', 'dailymind', 'entry', now(), 'Europe/Berlin')" >/dev/null &
done
wait
$P -d t -c "do \$\$ begin assert (select current from streak_state where user_id = '00000000-0000-0000-0000-0000000000ee') = 1, 'parallel'; end \$\$"
echo 'Parallel-Test bestanden.'
