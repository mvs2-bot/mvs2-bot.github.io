# Streak-System

Tages-Serie nach dem Prinzip von Duolingo. Liegt im gemeinsamen Supabase-Core-Projekt (`syaonnedmidaipwjjmio`), damit alle Seiten auf mvs2-bot.github.io dieselbe Serie je Konto sehen. **Vorerst zählt nur DailyMind** und nur DailyMind sowie die DailyMind-Kachel im Dashboard zeigen den Streak.

| Teil | Datei | Aufgabe |
|---|---|---|
| Speicherung + Berechnung | `supabase/001_streak.sql` | Tabellen, Regeln, Trigger, RPCs (verbindlich, manipulationssicher) |
| Tests | `supabase/tests/run.sh` | Tageswechsel, Doppelte, Fehltage, Freeze, Zeitzonen, Rechte, Parallelität |
| Schnittstelle + Darstellung | `shared/streak.js`, `shared/streak.css` | Abrufen/Melden, Cache, Chip, Detail-Dialog, Meldungen |
| Einbindung | `index.html` (Kachel), `konto.html` (Schalter), `admin.html` (alle Konten), DailyMind `index.html` | |

## Regeln der Berechnung

1. **Aktiver Tag**: Ein Kalendertag zählt, sobald eine aktive Regel aus `streak_rules` (App + Art) für das Konto ausgelöst wird. Derzeit nur `dailymind/entry`: eine Morgen- oder Abendroutine wird erstmals gespeichert (`morning_done_at`/`evening_done_at` wechselt auf einen Wert).
2. **Kalendertag** = Datum in der Zeitzone des Kontos. Die Seite schickt ihre IANA-Zeitzone mit (`Intl…timeZone`), der Server prüft sie gegen `pg_timezone_names` und merkt sie sich in `streak_state.tz`. Ungültig oder fehlend: zuletzt gemerkte Zone, sonst `Europe/Berlin`. Trigger nutzen die gemerkte Zone.
3. **Zeit kommt vom Server** (`now()`), nie vom Client. Ein Eintrag für ein vergangenes Datum zählt für heute, nicht rückwirkend.
4. **Mehrfach am Tag** zählt einmal: `streak_days` hat einen Eintrag je Konto und Tag (Primärschlüssel), weitere Apps werden nur in `apps` ergänzt.
5. **Folgetag** (genau 1 Tag nach `last_day`): Serie +1.
6. **Verpasste Tage**: fehlen `n` Tage und sind mindestens `n` Freezes vorhanden, werden sie verbraucht, die Tage als `frozen` gespeichert und die Serie läuft weiter (+1). Sonst beginnt eine neue Serie mit 1. Gefrorene Tage zählen nicht als aktiv.
7. **Freeze**: jedes Mal, wenn die Serie ein Vielfaches von 7 erreicht, gibt es einen Freeze, höchstens 2 auf Vorrat.
8. **Rekord** (`best`) = höchste je erreichte Serie, sinkt nie.
9. **Anzeige ohne Schreiben** (`streak_status`): Serie gilt als gebrochen (0), wenn mehr Tage fehlen als Freezes da sind. `at_risk` = Serie läuft, heute fehlt noch (Erinnerungspunkt am Chip). Gespeichert wird der Bruch erst beim nächsten aktiven Tag.
10. **Persönlicher Schalter** (`streak_prefs`, Kontoeinstellungen → DailyMind): aus = Aktivitäten dieser App zählen nicht, die App und die Kachel zeigen nichts. Keine Zeile = an. Die Serie läuft beim Ausschalten nicht weiter; nach dem Einschalten gelten die normalen Regeln.

## Randfälle

- **Gleichzeitige Anfragen** (zwei Tabs, Doppelklick, Trigger + Aufruf): `streak_state` wird mit `select … for update` gesperrt, `streak_days` per `on conflict`. Ergebnis ist immer genau +1 je Tag (Test mit 20 parallelen Aufrufen).
- **Tageswechsel um Mitternacht**: 23:59 und 00:01 Ortszeit sind zwei Tage. Seiten holen den Stand beim Zurückkehren (`visibilitychange`) neu.
- **Sommer-/Winterzeit**: Rechnung über Kalenderdaten, nicht über 24-h-Abstände.
- **Zeitzonenwechsel** (Reise): springt das Datum zurück auf einen schon gezählten Tag, bleibt der Zähler gleich; vorwärts gilt Regel 5/6.
- **Fehler im Trigger** (z. B. Zeile ohne User) werden als Warnung geloggt und verhindern das Speichern in der App nie.
- **Offline**: Seiten zeigen den letzten Stand aus `localStorage` (`streak:<user-id>`), der Server bleibt maßgeblich.

## Schnittstelle für weitere Seiten

Serverseitig (empfohlen, manipulationssicher): Regel eintragen und einen Trigger auf die Tabelle der App legen.

```sql
insert into public.streak_rules (app, kind, label) values ('questlog', 'quest', 'Quest erledigt');
create trigger streak_questlog after insert on public.questlog_quest_progress
    for each row execute function public.streak_from_row('questlog', 'quest', 'user_id');
```

Oder vom Client melden (angemeldet, Regel muss aktiv sein):

```js
await Streak.log(sb, 'questlog', 'quest');        // RPC streak_log(p_app, p_kind, p_tz)
const st = await Streak.status(sb, 'questlog');   // RPC streak_status(p_tz, p_app)
Streak.chip(document.getElementById('streakBtn'), st, sb);  // Flamme + Zahl, Klick = Detailansicht
```

Rückgabe beider RPCs: `{ current, best, last_day, freezes, today, tz, today_done, at_risk, missed, days: [{ d, f, apps }], enabled }`; `streak_log` zusätzlich `counted`, `reason` (`rule`/`off`), `new_day`, `earned_freeze`.

Admins: `streak_admin_overview()` liefert alle Konten (nur globale Admins), Regeln in `streak_rules` können Admins an-/ausschalten (`active`).

Einbinden: `shared/streak.js` und `shared/streak.css` (Kopie in DailyMind unter `shared/`, Änderungen im Dashboard-Repo machen und kopieren). Farben kommen aus den Seiten-Tokens `--star` (Flamme), `--card`, `--well`, `--ink`, `--mute`; Freeze-Farbe `--streak-ice`.

## Tests

```sh
sh supabase/tests/run.sh   # braucht lokal PostgreSQL (initdb, pg_ctl, psql), nicht als root
```

Startet ein Wegwerf-Postgres, spielt `tests/stub.sql` (Nachbau von `auth`, Rollen, Profilen, DailyMind-Tabelle), die Migration und `tests/streak_test.sql` ein.
