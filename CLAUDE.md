# CLAUDE.md – mvs2-bot.github.io (Dashboard)

Root-Seite von GitHub Pages: Dashboard mit Kacheln zu allen Projekten, Kontoeinstellungen, Admin.
Unterprojekte (TravelBase, PegelTracker, …) sind eigene Repos unter `/<Repo>/`.
Kein Build, kein npm: reines HTML/CSS/JS, supabase-js per CDN. Sprache in UI, Kommentaren und Commits: Deutsch.

## Arbeitsweise (Token-Effizienz)
- Nicht das ganze Repo einlesen. Große Dateien (`shared/dashboard.js` ~700, `admin.html` ~800 Zeilen) per `grep -n` anspringen.
- Vor dem PR selbst prüfen: Syntax, kaputte Referenzen/IDs, Design-Konsistenz mit `shared/tokens.css` und `shared/hub.css`.
- Bei Änderung an Architektur, Dateistruktur oder Schema diese Datei im selben PR anpassen (max. 150 Zeilen).
- Keine Secrets. Nur öffentliche Publishable Keys sind im Code erlaubt; niemals `service_role`/secret Key.

## Dateien
| Datei | Inhalt |
| --- | --- |
| `index.html` | Dashboard: Markup + CSS; Skripte alle mit `defer` (Reihenfolge zählt) |
| `shared/dashboard.js` | Dashboard-Logik: Kacheln aus `PROJECTS`, Anordnen (Drag & Drop → `dash_order`), Login, Statuspunkte, Offline-Hinweis, Streak-Chip |
| `shared/tools.js` | Mini-Tools des Dashboards (Sonne, Wetter, Timer, Stoppuhr, Urlaub, Mond …) |
| `konto.html` | Kontoeinstellungen (Profil, Passwort, Kacheln ein/aus, App-Bereiche) |
| `admin.html` | Verwaltung (Nutzer, App-Zugriffe, Streak-Übersicht, TravelBase-Admin), Edge Function `overall-admin` |
| `usage.html` | Nutzung/Datenbankgröße (`overall_usage`, Edge Function `overall-usage`) |
| `colors.html` | Farbübersicht |
| `shared/projects.js` | **Projektliste `PROJECTS`** – neues Projekt = Eintrag kopieren (Felder im Kopfkommentar) |
| `shared/tokens.css` | **Design-Tokens** (hell + dunkel) für alle Root-Seiten, vor `hub.css`/Seiten-CSS einbinden |
| `shared/hub.css` | gemeinsames CSS für konto/admin/usage (ohne Tokens) |
| `shared/overall-account.js` | Kopie aus `supabase-core/shared/` (Profil/Passwort-Modul). Nur im Original ändern. |
| `shared/ios-nav.js` | **Original** der iOS-Navigationsleiste; andere Repos haben Kopien |
| `shared/settings-nav.js` | Seitennavigation der Einstellungsseiten (`SettingsNav.build`, `<section class="pane">`) |
| `shared/streak.js`, `shared/streak.css` | Streak-Client (Chip, Dialog, Cache `localStorage streak:<uid>`), Doku `docs/STREAK.md` |
| `shared/kpi.js` | Kennzahl-Chip an Login-Kacheln (`kpi: true` in `PROJECTS`), RPC `overall_tile_kpis`, Cache `kpi:<uid>` |
| `sw.js` | Service Worker (nur Root), network-first. `ASSETS` ist die einzige Dateiliste. **Bei Änderungen `CACHE` (`mvs2-dashboard-vNN`) hochzählen.** Keine `?v=`-Parameter nötig. |
| `manifest.json`, `icon.svg`, `favicon.ico`, `icons/` | PWA |
| `_config.yml`, `.well-known/assetlinks.json` | Jekyll-Include für `.well-known` (Android-App QuicKniff) |

## Supabase-Anbindung
- Gemeinsames Core-Projekt (Konstante `CORE` mit url/key je Seite), `window.supabase.createClient(CORE.url, CORE.key, …)`.
- supabase-js `2.45.4` von jsDelivr.
- **Schema liegt ausschließlich im Repo `supabase-core`** (Migrationen). Schemaänderung = dort neue Migration, eigener PR.
- Genutzte RPCs: `overall_is_admin`, `overall_app_role(p_app)`, `overall_has_app_role(p_app, p_min_role)`,
  `overall_my_apps` (Kachel-Sichtbarkeit, Fallback `overall_has_app_role`), `overall_usage`, `streak_admin_overview`, `travelbase_admin_overview`, `travelbase_admin_set_member`,
  `travelbase_admin_set_trip_tentative`, `travelbase_my_trips`, `overall_tile_kpis(p_tz)`.
- Edge Functions via `sb.functions.invoke`: `overall-admin` (`{ action, … }`), `overall-usage`.
- Kachel-Sichtbarkeit: `app` + `min` aus `PROJECTS` gegen Rang aus `overall_my_apps()`; nur Anzeige, Schutz macht RLS.

## Design-Tokens (`shared/tokens.css` `:root`)
- Flächen: `--bg #f2f2f7`, `--card #fff`, `--well`, `--hover`, `--line`, `--sep`.
- Text: `--ink #1c1c1e`, `--text #3a3a3c`, `--mute #6c6c70`.
- Akzent Dashboard Blau: `--p1 #0066cc`, `--p1-soft #e6f0fd`, `--on-p1 #fff`.
- Status: `--ok`, `--ok-soft`, `--danger`, `--danger-soft`; Schalter `--toggle-off`, `--toggle-on`.
- `--radius 18px`, `--radius-s 12px`, `--shadow`, `--font` (Systemschrift/SF).
- Aliasse für `ios-nav.js`: `--border`, `--accent`, `--card-hover`, `--muted`.
- Dark Mode: Theme in `localStorage['overall-theme']` (app-übergreifend), Selektor in tokens.css `[data-theme="dark"]`.
- Apple-Designsprache: Typo 12–22 px (Basis 14), weiße Karten auf Grau, iOS-Segmente, Linien-Symbole statt Emojis
  (Projekt-Icons dürfen Emoji oder `ICONS`-Schlüssel sein).

## Konventionen
- Geteilte Dateien: Original ändern, dann Kopien in allen Repos aktualisieren (`ios-nav.js` hier, `overall-account.js` in supabase-core).
- Neue Farben als Variable in `shared/tokens.css` (`:root` und Dark-Theme), nicht hart im Markup.
- Dashboard-Einstellungen pro Konto in `user_metadata`: `dash_order`, `dash_favs`, `dash_hidden`, `dash_view` (lokal gespiegelt).
  `dash_view` = Ansicht der Kacheln, nur Abweichungen: `size: 'compact'`, `name|desc|changed|kpi|github|counts|status: false`;
  Dashboard setzt daraus Klassen `v-…` an `#sections` (CSS in `index.html`), keine DB-Migration nötig.
- Neue gecachte Datei → in `ASSETS` von `sw.js` aufnehmen und Version erhöhen.
