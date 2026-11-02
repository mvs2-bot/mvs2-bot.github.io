// Projektliste für Dashboard (index.html) und Kontoeinstellungen (konto.html, Anzeige ein/aus).
/* ================================================================
   PROJEKTE – hier pflegen.
   Neues Projekt = neuen Eintrag in PROJECTS kopieren; mit badge: 'Login' landet es unter „Mit Login“.
   icon: Emoji ODER Schlüssel aus ICONS (unten)
   color: Hintergrundfarbe der Icon-Kachel
   repo:  optional, GitHub-Repo-Name (Standard: aus url abgeleitet, z. B. '/TravelBase/' → TravelBase)
   supabase: optional, Supabase-Projekt-ID → zusätzlicher Button zum Supabase-Dashboard
   supabaseKey: optional, öffentlicher Publishable Key → Statuspunkt (erreichbar / pausiert)
   streak: optional, App-ID → Streak-Anzeige an der Kachel (shared/streak.js), wenn für diese App eingeschaltet
   app:    App-ID aus overall_apps (Pflicht bei badge: 'Login') → Kachel nur, wenn das Konto dort eine Rolle hat
           (Zugriff in der Verwaltung; Admins sehen alles; nur Anzeige, Datenschutz macht RLS)
   min:    optional, Mindestrolle für die Kachel (Standard 'member'; 'guest' nur, wo Gäste in der App etwas sehen)
   ================================================================ */
const PROJECTS = [
  { name: 'TravelBase',         desc: 'Alle Reiseplanungen an einem Ort',            url: '/TravelBase/', img: '/TravelBase/icons/apple-touch-icon.png',             icon: 'globePin', color: '#2f7fc1', app: 'travelbase', min: 'guest', badge: 'Login', supabase: 'syaonnedmidaipwjjmio', supabaseKey: 'sb_publishable_a3tggKZJmotlFtIqKKdSYg_cNsazRkX' },
  { name: 'QuestLog',          desc: 'The Real World: 100 Quests, Level & Titel',   url: '/RealWorld-Questlog/', img: '/RealWorld-Questlog/icons/apple-touch-icon.png',     icon: 'quest',    color: '#5b4bd1', app: 'questlog', min: 'guest', badge: 'Login', supabase: 'syaonnedmidaipwjjmio', supabaseKey: 'sb_publishable_a3tggKZJmotlFtIqKKdSYg_cNsazRkX' },
  { name: 'MatchBoard',         desc: 'Lasset die Spiele beginnen!',                 url: '/MatchBoard/', img: '/MatchBoard/icon.svg',                       icon: 'trophy',   color: '#1e3a8a', app: 'matchboard', badge: 'Login', supabase: 'syaonnedmidaipwjjmio', supabaseKey: 'sb_publishable_a3tggKZJmotlFtIqKKdSYg_cNsazRkX' },
  { name: 'DailyMind',          desc: 'Dankbar sein',                                url: '/DailyMind/', img: '/DailyMind/icon.svg',                         icon: 'sunrise',  color: '#6f9a7c', app: 'dailymind', badge: 'Login', supabase: 'syaonnedmidaipwjjmio', supabaseKey: 'sb_publishable_a3tggKZJmotlFtIqKKdSYg_cNsazRkX', streak: 'dailymind' },
  { name: 'CaminoTracker',     desc: 'Meine Jakobswege, Karte & Unterkünfte',       url: '/CaminoTracker/', img: '/CaminoTracker/apple-touch-icon.png',      icon: 'shell',    color: '#1f4e9c', app: 'caminotracker', badge: 'Login', supabase: 'syaonnedmidaipwjjmio', supabaseKey: 'sb_publishable_a3tggKZJmotlFtIqKKdSYg_cNsazRkX' },
  { name: 'PegelTracker',       desc: 'Alles nur zu Forschungszwecken',              url: '/PegelTracker/', img: '/PegelTracker/icon.svg',                   icon: 'glass',    color: '#3b2f2b', app: 'pegeltracker', badge: 'Login', supabase: 'syaonnedmidaipwjjmio', supabaseKey: 'sb_publishable_a3tggKZJmotlFtIqKKdSYg_cNsazRkX' },
  { name: 'Quick-Tools',        desc: 'Währung, Phrasen, GPS & Notfall pro Land',    url: '/QuickTools/', img: '/QuickTools/icon.svg',             icon: 'tools',    color: '#8b949e' },
  { name: 'Camper-Namenssuche', desc: 'Namen für den Bus vorschlagen & abstimmen',   url: '/Spitznamensuche-Camper/', img: '/Spitznamensuche-Camper/apple-touch-icon.png', icon: 'camper',   color: '#2f6b4f' },
  { name: 'Münzwurf',           desc: 'Entscheidungshilfe: A oder B?',               url: '/Muenzwurf/', img: '/Muenzwurf/apple-touch-icon.png',              icon: 'coin',     color: '#12909c' },
  { name: 'QuickSTL',           desc: 'STL-Dateien ansehen & vermessen',             url: '/QuickSTL/', img: '/QuickSTL/icon.svg',                         icon: 'cube',     color: '#1f2024' },
  { name: 'QuicKniff',           desc: 'Der schnelle digitale Kniffel-Block',        url: '/QuicKniff/', img: '/QuicKniff/icon.svg',                         icon: 'dice',     color: '#a63a32' },
];
