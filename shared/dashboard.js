// Dashboard (index.html): Kacheln, Login-Pflicht, Profilmenü, Suche, Uhr, Theme, PWA.
// Wird mit defer nach supabase-js, overall-account.js, streak.js und projects.js geladen.

// Gruppen ergeben sich aus dem Badge: badge: 'Login' → „Mit Login“, sonst „Ohne Login“
let allowed = null; // App-IDs, für die das angemeldete Konto eine Rolle hat (null = noch unbekannt → keine Login-Kacheln)
const visible = it => !hidden.includes(it.url) && (!it.app || (allowed || []).includes(it.app));

/* Ausgeblendetes aus den Kontoeinstellungen (konto.html): user_metadata.dash_hidden im Konto,
   Einträge sind App-URL, 'quick:<aria-label>' oder 'tool:<Button-ID>'. Lokal gemerkt für offline. */
const HIDDEN_KEY = 'dash-hidden';
let hidden = [];
try { hidden = JSON.parse(localStorage.getItem(HIDDEN_KEY)) || []; } catch (e) {}
function setHidden(list) {
  list = Array.isArray(list) ? list : [];
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(list)); } catch (e) {}
  const changed = String(list) !== String(hidden);
  hidden = list;
  paintHidden();
  if (changed && started) render();
}
function paintHidden() {
  document.querySelectorAll('.quick').forEach(box => {
    const items = [...box.children];
    items.forEach(el => { el.hidden = hidden.includes(el.id ? 'tool:' + el.id : 'quick:' + el.getAttribute('aria-label')); });
    box.closest('section').hidden = items.every(el => el.hidden);
  });
}
paintHidden();
/* Reihenfolge der Apps aus den Kontoeinstellungen: user_metadata.dash_order (App-URLs), neue Apps hinten. Lokal gemerkt. */
const ORDER_KEY = 'dash-order';
let order = [];
try { order = JSON.parse(localStorage.getItem(ORDER_KEY)) || []; } catch (e) {}
const rank = it => order.includes(it.url) ? order.indexOf(it.url) : 1e3 + PROJECTS.indexOf(it);
const sorted = list => list.sort((a, b) => rank(a) - rank(b));
function setOrder(list) {
  list = Array.isArray(list) ? list : [];
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(list)); } catch (e) {}
  const changed = String(list) !== String(order);
  order = list;
  if (changed && started) render();
}
const SECTIONS = [
  { title: 'Mit Login',  get items() { return sorted(PROJECTS.filter(it => it.badge === 'Login' && visible(it))); } },
  { title: 'Ohne Login', get items() { return sorted(PROJECTS.filter(it => it.badge !== 'Login' && visible(it))); } },
];

const GITHUB_USER = 'mvs2-bot';
const repoName = it => it.repo || String(it.url).split('/').filter(Boolean)[0] || '';
const repoUrl = it => {
  const name = repoName(it);
  return name ? `https://github.com/${GITHUB_USER}/${name}` : '';
};
const GH_ICON = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

let arranging = false; // Sortiermodus („Anordnen“)
const GRIP_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
const STAR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';

// Linien-Symbole für Kopf und Menü (gleiche Strichstärke wie in „Zuhause“)
const IC = {
  moon:   '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  sun:    '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>',
  person: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
  gear:   '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  shield: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  logout: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/></svg>',
  lock:   '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  gauge:  '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 18a8.5 8.5 0 1 1 15 0"/><path d="m12 13.5 4-4.5"/><circle cx="12" cy="14" r="1.3"/></svg>',
  drop:   '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
  chev:   '<svg class="ic chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  star:   '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
};


const ICONS = {
  globePin: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z"/></svg>',
  tools:    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>',
  camper:   '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6.5 9 4h6l4 2.5"/><path d="M3 16V9a2 2 0 0 1 2-2h11l4 4v5h-1"/><path d="M3 16h2m4 0h6"/><circle cx="7" cy="16.5" r="1.8"/><circle cx="17" cy="16.5" r="1.8"/><path d="M14 7v4h6"/></svg>',
  quest:    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h11v13a3 3 0 0 1-3 3H7"/><path d="M8 4a2 2 0 0 0-2 2v11a3 3 0 0 1-3-3v-1h3"/><path d="m10 10 2 2 4-4M10 15h5"/></svg>',
  trophy:   '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M8 20h8M9.5 17h5l.5 3h-6z"/></svg>',
  sunrise:  '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 15a5.5 5.5 0 0 1 11 0M3 15h18M7 19h10M12 5v2.5M5.6 8.1l1.6 1.6M18.4 8.1l-1.6 1.6"/></svg>',
  migraine: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 20v-3.5c1.9-1.3 3-3.4 3-5.8A8 8 0 0 0 4.4 8.6"/><path d="M13 4.5 9 11h3.5l-1.5 6 5-7.5h-3.5z"/><path d="M4 12.5c0 2.4 1.1 4.6 3 5.9V20"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/><path d="M11 12.5v1.5h2v-1.5"/></svg>',
  glass:    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12l-1.2 15.1a1.5 1.5 0 0 1-1.5 1.4H8.7a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M6.6 10h10.8"/><circle cx="11" cy="14" r=".6"/><circle cx="13.5" cy="16.5" r=".6"/></svg>',
  coin:     '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="8" ry="9"/><path d="M12 7.5v9M9.5 9.5c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.6c0 2.3-5 1.2-5 3.6 0 1 1.1 1.7 2.5 1.7s2.5-.7 2.5-1.7"/></svg>',
  shell:    '<svg viewBox="0 0 24 24" fill="none" stroke="#f6c21c" stroke-width="1.8" stroke-linecap="round"><path d="M4 12h16"/><path d="m4 12 15-6M4 12l15 6"/><path d="m4 12 12-9M4 12l12 9"/><path d="M4 12 10 2.5M4 12l6 9.5"/></svg>',
  cube:     '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8 20 7.3v9.4l-8 4.5-8-4.5V7.3z"/><path d="M4 7.3l8 4.5 8-4.5M12 11.8v9.4"/></svg>',
  pixels:   '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/><path d="M4 4h5.3v5.3H4zM14.7 9.3H20v5.4h-5.3zM9.3 14.7h5.4V20H9.3z" fill="#fff"/></svg>',
  dice:     '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r=".9" fill="#fff"/><circle cx="12" cy="12" r=".9" fill="#fff"/><circle cx="15.5" cy="15.5" r=".9" fill="#fff"/></svg>',
  bars:     '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="13" width="3.5" height="7" rx="1"/><rect x="10.25" y="10" width="3.5" height="10" rx="1"/><rect x="16" y="6" width="3.5" height="14" rx="1"/><circle cx="6.25" cy="7.5" r="2.2"/></svg>',
  firstAid: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="6.5" width="17" height="13" rx="2.5"/><path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5"/><path d="M12 10v6M9 13h6"/></svg>',
  camera:   '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M5.5 7V5.5h3V7M16 5h2.5v2"/><circle cx="14" cy="13" r="3.2"/><rect x="5.5" y="9.3" width="3" height="2" rx=".4"/></svg>',
};

/* ---------------- Rendering ---------------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Echtes App-Icon der Seite über dem Symbol; lädt es nicht, entfernt es sich und das Symbol bleibt sichtbar.
const iconHtml = it => (ICONS[it.icon] || esc(it.icon))
  + (it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy" onerror="this.remove()">` : '');

/* ---------------- Favoriten (Stern, nur lokal auf diesem Gerät) ---------------- */
/* ---------------- Einklappen (Mit Login, Ohne Login, Schnellzugriff, Mini-Tools; nur auf diesem Gerät) ---------------- */
const FOLD_KEY = 'dash-folded';
const CHEV_ICON = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
let folded = [];
try { folded = JSON.parse(localStorage.getItem(FOLD_KEY)) || []; } catch (e) {}
function paintFolded() {
  document.querySelectorAll('[data-fold]').forEach(sec => {
    const on = folded.includes(sec.dataset.fold);
    sec.classList.toggle('collapsed', on);
    sec.querySelector('.fold').setAttribute('aria-expanded', String(!on));
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest('.fold'); if (!b) return;
  const key = b.closest('[data-fold]').dataset.fold;
  folded = folded.includes(key) ? folded.filter(k => k !== key) : folded.concat(key);
  try { localStorage.setItem(FOLD_KEY, JSON.stringify(folded)); } catch (e) {}
  paintFolded();
});
paintFolded();

/* Favoriten: user_metadata.dash_favs im Konto (App-URLs, gilt auf allen Geräten). Lokal gemerkt für offline. */
const FAV_KEY = 'dash-favs';
try { localStorage.removeItem('dash-usage'); } catch (e) {} // Altlast von „Häufig benutzt“
let favs = [];
try { favs = JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) {}
const isFav = it => favs.includes(it.url);
function setFavs(list) {
  // Noch nie im Konto gespeichert: bisherige Favoriten dieses Geräts einmalig ins Konto übernehmen
  if (!Array.isArray(list)) { if (favs.length && sb) sb.auth.updateUser({ data: { dash_favs: favs } }).catch(() => {}); return; }
  try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) {}
  const changed = String(list) !== String(favs);
  favs = list;
  if (changed && started) render();
}
async function toggleFav(url) {
  const before = favs;
  setFavs(favs.includes(url) ? favs.filter(u => u !== url) : favs.concat(url));
  try {
    const { error } = await sb.auth.updateUser({ data: { dash_favs: favs } });
    if (error) throw error;
  } catch (e) { console.warn('Favorit speichern', e); setFavs(before); }
}

function tileHtml(it, sortable) {
  const ico = iconHtml(it);
  const gh = repoUrl(it);
  const fav = isFav(it);
  return `
        <div class="tile" data-url="${esc(it.url)}">
          <a class="main" href="${esc(it.url)}">
            <span class="ico" style="background:${esc(it.color || '#334155')}">${ico}</span>
            <span class="txt">
              <span class="name">${esc(it.name)}</span>
              <span class="desc">${esc(it.desc)}</span>
            </span>
            ${IC.chev}
          </a>
          <div class="foot">
            <span class="meta" data-repo="${esc(repoName(it))}"></span>
            ${it.streak ? `<button class="streak-chip" type="button" data-streak="${esc(it.streak)}" hidden></button>` : ''}
            <button class="mini fav${fav ? ' on' : ''}" type="button" data-fav="${esc(it.url)}" aria-pressed="${fav}" aria-label="${esc(it.name)} ${fav ? 'aus Favoriten entfernen' : 'zu Favoriten'}" title="${fav ? 'Aus Favoriten entfernen' : 'Als Favorit oben anheften'}">${STAR_ICON}</button>
            ${gh ? `<a class="mini" href="${esc(gh)}" target="_blank" rel="noopener" aria-label="${esc(it.name)} auf GitHub" title="Repo auf GitHub">${GH_ICON}</a>` : ''}
            ${sortable && arranging ? `<button class="mini grip" type="button" data-grip aria-label="${esc(it.name)} verschieben (Pfeiltasten)" title="Ziehen zum Verschieben">${GRIP_ICON}</button>` : ''}
          </div>
        </div>`;
}

function render() {
  const host = document.getElementById('sections');
  // Favoriten stehen oben (in der Reihenfolge, in der sie markiert wurden) und fehlen dafür in ihrer Gruppe
  const all = SECTIONS.flatMap(sec => sec.items);
  const top = favs.map(u => all.find(it => it.url === u)).filter(Boolean);
  const groups = [{ title: 'Favoriten', items: top, fav: true }]
    .concat(SECTIONS.map(sec => ({ title: sec.title, items: sec.items.filter(it => !isFav(it)) })));
  // Supabase-Status einmal: bei „Mit Login“, sonst bei der ersten Gruppe mit einer Supabase-App
  const hasSb = sec => sec.items.some(it => it.supabase && it.supabaseKey);
  const live = groups.find(sec => !sec.fav && hasSb(sec)) || groups.find(hasSb);
  let html = '';
  for (const sec of groups) {
    if (!sec.items.length) continue;
    html += sec.fav
      ? `<section class="group"><div class="group-head"><h2>${esc(sec.title)}</h2><span class="count">${sec.items.length}</span>${sec === live ? LIVE_HTML(sec) : ''}</div><div class="grid">`
      : `<section class="group${folded.includes(sec.title) ? ' collapsed' : ''}" data-fold="${esc(sec.title)}"><div class="group-head"><h2><button class="fold" type="button" aria-expanded="${!folded.includes(sec.title)}">${esc(sec.title)}${CHEV_ICON}</button></h2><span class="count">${sec.items.length}</span><button class="arrange" type="button" data-arrange aria-pressed="${arranging}">${arranging ? 'Fertig' : 'Anordnen'}</button>${sec === live ? LIVE_HTML(sec) : ''}</div><div class="grid" data-sortable>`;
    for (const it of sec.items) html += tileHtml(it, !sec.fav);
    html += `</div></section>`;
  }
  host.innerHTML = html;
  host.classList.toggle('arranging', arranging);
  paintPushed();
  paintStatus();
  paintStreak();
}

/* ---------------- Streak an der Kachel (Berechnung auf dem Server, shared/streak.js) ---------------- */
let streakSt = null;
function paintStreak() {
  document.querySelectorAll('[data-streak]').forEach(el => {
    el.hidden = !(streakSt && streakSt.enabled !== false);
    if (!el.hidden) Streak.chip(el, streakSt, sb);
  });
}
async function loadStreak() {
  if (!window.Streak || !sb) return;
  streakSt = streakSt || Streak.cached(localStorage.getItem(ACCESS_KEY));
  paintStreak();
  try { streakSt = await Streak.status(sb, 'dailymind'); paintStreak(); }
  catch (e) { if (navigator.onLine) console.warn('Streak', e); }
}

/* ---------------- Letzte Änderung (GitHub, 15 Min. zwischengespeichert) ---------------- */
const PUSH_KEY = 'dash-pushed';
const PUSH_TTL = 15 * 60 * 1000;
let pushed = {};
try { pushed = (JSON.parse(localStorage.getItem(PUSH_KEY)) || {}).repos || {}; } catch (e) {}

const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto', style: 'short' });
function ago(iso) {
  const sec = (new Date(iso) - Date.now()) / 1000;
  const steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']];
  let v = sec;
  for (const [n, unit] of steps) {
    if (Math.abs(v) < n) return unit === 'second' ? 'gerade eben' : rtf.format(Math.round(v), unit);
    v /= n;
  }
}
function paintPushed() {
  document.querySelectorAll('.meta[data-repo]').forEach(el => {
    const iso = pushed[el.dataset.repo];
    el.textContent = iso ? 'Geändert ' + ago(iso) : '';
    el.title = iso ? new Date(iso).toLocaleString('de-DE') : '';
  });
}
async function loadPushed() {
  try {
    const c = JSON.parse(localStorage.getItem(PUSH_KEY));
    if (c && Date.now() - c.at < PUSH_TTL) return;
  } catch (e) {}
  try {
    const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return;
    const repos = {};
    for (const r of await res.json()) repos[r.name] = r.pushed_at;
    pushed = repos;
    try { localStorage.setItem(PUSH_KEY, JSON.stringify({ at: Date.now(), repos })); } catch (e) {}
    paintPushed();
  } catch (e) {}
}

/* ---------------- Supabase-Status ---------------- */
const sbStatus = {}; // id → 'ok' | 'bad'
const LIVE_HTML = sec => {
  const id = sec.items.find(it => it.supabase && it.supabaseKey).supabase;
  return `<a class="live" data-sb="${esc(id)}" href="https://supabase.com/dashboard/project/${esc(id)}" target="_blank" rel="noopener" title="Supabase-Dashboard"><i></i><span></span></a>`;
};
function paintStatus() {
  document.querySelectorAll('.live[data-sb]').forEach(el => {
    const st = sbStatus[el.dataset.sb];
    el.className = 'live' + (st ? ' ' + st : '');
    el.lastChild.textContent = st === 'ok' ? 'Supabase erreichbar' : st === 'bad' ? 'Supabase nicht erreichbar' : 'Supabase';
  });
}
/* Ergebnis 5 Minuten pro Tab gemerkt: Zurückkommen in den Tab oder aus einer App löst keine neue Prüfung aus. */
const SB_KEY = 'dash-sb-status', SB_TTL = 5 * 60 * 1000;
async function checkSupabase() {
  if (!navigator.onLine) return;
  try {
    const c = JSON.parse(sessionStorage.getItem(SB_KEY));
    if (c && Date.now() - c.t < SB_TTL) { Object.assign(sbStatus, c.st); return paintStatus(); }
  } catch (e) {}
  const items = SECTIONS.flatMap(sec => sec.items).filter(it => it.supabase && it.supabaseKey);
  await Promise.all(items.map(async it => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await fetch(`https://${it.supabase}.supabase.co/auth/v1/health`, { headers: { apikey: it.supabaseKey }, signal: ctl.signal, cache: 'no-store' });
      sbStatus[it.supabase] = res.ok ? 'ok' : 'bad';
    } catch (e) {
      sbStatus[it.supabase] = navigator.onLine ? 'bad' : undefined;
    } finally {
      clearTimeout(timer);
    }
  }));
  // Nur „alles erreichbar“ merken: Fehler und offline werden beim nächsten Mal sofort neu geprüft
  if (items.length && items.every(it => sbStatus[it.supabase] === 'ok')) {
    try { sessionStorage.setItem(SB_KEY, JSON.stringify({ t: Date.now(), st: sbStatus })); } catch (e) {}
  }
  paintStatus();
}

/* ---------------- Login-Pflicht (Supabase-Core-Projekt, gemeinsame Konten aller Apps) ----------------
   Hinein darf, wer im Core-Projekt globaler Admin ist oder für die App "dashboard" mindestens
   die Rolle member hat (overall_app_access, vergeben in der Verwaltung). Gäste bleiben draußen.
   Gleiche Domain wie TravelBase und QuestLog: wer dort angemeldet ist, ist es hier auch. */
const CORE = { url: 'https://syaonnedmidaipwjjmio.supabase.co', key: 'sb_publishable_a3tggKZJmotlFtIqKKdSYg_cNsazRkX' };
const ACCESS_KEY = 'dash-access'; // User-ID der letzten erfolgreichen Prüfung, damit das Dashboard offline aufgeht
const sb = window.supabase ? window.supabase.createClient(CORE.url, CORE.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
let started = false;

/* Login-Kacheln nur für Apps mit Zugriff: je Kachel overall_has_app_role(app, min)
   (globale Admins sehen alles). Ergebnis pro Konto zwischengespeichert, damit es offline und ohne Flackern geht. */
const APPS_KEY = 'dash-apps';
let syncedAt = null, syncFailed = false; // Zeitpunkt des letzten erfolgreichen Abgleichs (für den Offline-Hinweis)
function cachedApps(id) {
  try {
    const c = JSON.parse(localStorage.getItem(APPS_KEY));
    if (!c || c.id !== id) return null;
    syncedAt = c.t ? new Date(c.t) : null;
    return c.apps;
  } catch (e) { return null; }
}
async function loadAllowed(id) {
  const tiles = PROJECTS.filter(it => it.app), apps = tiles.map(it => it.app);
  try {
    const res = await Promise.all(tiles.map(it => sb.rpc('overall_has_app_role', { p_app: it.app, p_min_role: it.min || 'member' })));
    const err = res.find(r => r.error);
    if (err) throw err.error;
    const list = apps.filter((app, i) => res[i].data);
    syncedAt = new Date(); syncFailed = false;
    try { localStorage.setItem(APPS_KEY, JSON.stringify({ id, apps: list, t: syncedAt.getTime() })); } catch (e) {}
    if (String(list) !== String(allowed)) { allowed = list; render(); }
  } catch (e) { syncFailed = true; if (navigator.onLine) console.warn('App-Zugriff', e); }
  paintOffline();
}

/* ---------------- Offline-Hinweis: Kacheln kommen aus dem Zwischenspeicher ---------------- */
function paintOffline() {
  const el = document.getElementById('offlineNote');
  const off = !navigator.onLine || syncFailed;
  el.hidden = !started || !off;
  if (!off) return;
  const when = syncedAt && syncedAt.toLocaleString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  el.lastChild.textContent = (navigator.onLine ? 'Keine Verbindung zum Server' : 'Offline')
    + (when ? ` · Stand von ${when}` : ' · zuletzt gespeicherter Stand');
}
window.addEventListener('offline', paintOffline);
window.addEventListener('online', () => {
  paintOffline();
  if (!started) return;
  let id = null;
  try { id = localStorage.getItem(ACCESS_KEY); } catch (e) {}
  if (sb && id) loadAllowed(id);
  loadPushed(); checkSupabase(); loadStreak();
});

function startDashboard() {
  document.body.classList.add('unlocked');
  let id = null;
  try { id = localStorage.getItem(ACCESS_KEY); } catch (e) {}
  const prev = allowed;
  allowed = cachedApps(id);
  if (sb && id) loadAllowed(id);
  if (started) { if (String(allowed) !== String(prev)) render(); return; }
  started = true;
  render();
  paintOffline();
  loadPushed();
  checkSupabase();
  loadStreak();
}

/* ---------------- Profilbild oben rechts + Menü ----------------
   Bild und Name aus overall_profiles (gilt für alle Apps), Kontoeinstellungen auf konto.html (für alle Apps).
   Admin-Einstellungen nur für globale Admins; vorerst die Verwaltung in TravelBase. */
const profileMenu = (() => {
  const btn = document.getElementById('profileBtn');
  const ADMIN_URL = 'admin.html?from=dashboard';
  const CACHE_KEY = 'dash-profile';
  let user = null, profile = {}, photo = null, menu = null, onLogout = () => {}, lastSync = null;
  const AVATAR_COLORS = ['#0b6e79', '#4a7356', '#b25000', '#5856d6', '#0066cc', '#a2453a'];
  const ROLE_LABELS = { admin: 'Admin', member: 'Mitglied', guest: 'Gast' };
  const dark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const myRole = () => profile.role === 'admin' ? 'admin' : (profile.app_role || null);
  function menuAva() {
    if (photo) return `<span class="pm-ava"><img src="${photo}" alt=""></span>`;
    const n = shownName();
    let h = 0; for (const c of n) h = (h * 31 + c.codePointAt(0)) >>> 0;
    const ini = n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
    return `<span class="pm-ava" style="background:${AVATAR_COLORS[h % AVATAR_COLORS.length]}">${esc(ini)}</span>`;
  }
  function syncHtml() {
    const off = !navigator.onLine;
    const text = off ? 'Offline' : lastSync ? 'Verbunden · zuletzt ' + lastSync.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Verbunden';
    return `<div class="pm-sync" role="status"><i class="${off ? 'pending' : ''}"></i><span><b>Cloud-Sync</b> · ${esc(text)}</span></div>`;
  }

  const shownName = () => (profile.display_name || '').trim() || (user && user.email) || '';
  const avatarHtml = () => photo ? `<img src="${photo}" alt="">` : IC.person;
  const save = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ id: user.id, profile, photo })); } catch (e) {} };
  const load = id => { try { const c = JSON.parse(localStorage.getItem(CACHE_KEY)); return c && c.id === id ? c : null; } catch (e) { return null; } };

  function paint() {
    btn.innerHTML = avatarHtml();
    btn.classList.toggle('has-photo', !!photo);
    btn.title = shownName();
    // Begrüßung mit Vornamen (die Uhr aktualisiert sie jede Sekunde)
    window.dashUserName = (profile.display_name || '').trim().split(/\s+/)[0] || '';
    if (menu && !menu.hidden) renderMenu();
  }

  function renderMenu() {
    menu.innerHTML = `
      <div class="pm-head">
        ${menuAva()}
        <div><b>${esc(shownName())}</b><small>${esc(user.email)}</small>${myRole() ? `<span class="pm-role">${esc(ROLE_LABELS[myRole()] || myRole())}</span>` : ''}</div>
      </div>
      ${syncHtml()}
      <a class="pm-item" role="menuitem" href="konto.html?from=dashboard">${IC.gear}Kontoeinstellungen</a>
      ${myRole() === 'admin' ? '<a class="pm-item" role="menuitem" href="' + ADMIN_URL + '">' + IC.shield + 'Admin-Einstellungen<small>nur Admins</small></a>'
        + '<a class="pm-item" role="menuitem" href="usage.html">' + IC.gauge + 'Nutzung &amp; Limits<small>nur Admins</small></a>'
        + '<a class="pm-item" role="menuitem" href="colors.html">' + IC.drop + 'Farbarchitektur &amp; Design-Token<small>nur Admins</small></a>' : ''}
      <button class="pm-item" type="button" role="menuitem" data-act="theme">${dark() ? IC.sun + 'Helles Design' : IC.moon + 'Dunkles Design'}</button>
      <div class="pm-sep"></div>
      <button class="pm-item danger" type="button" role="menuitem" data-act="logout">${IC.logout}Abmelden</button>`;
  }

  function open() {
    if (!user) return;
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'pm-menu'; menu.setAttribute('role', 'menu'); menu.hidden = true;
      menu.addEventListener('click', e => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'theme') { e.stopPropagation(); window.dashToggleTheme(); renderMenu(); menu.querySelector('[data-act="theme"]').focus(); return; }
        close();
        if (b.dataset.act === 'logout') onLogout();
      });
      document.body.appendChild(menu);
    }
    renderMenu();
    const r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 8) + 'px';
    menu.style.right = Math.max(10, window.innerWidth - r.right) + 'px';
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    const first = menu.querySelector('.pm-item'); if (first) first.focus();
  }
  function close() {
    if (menu) menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', e => { e.stopPropagation(); (menu && !menu.hidden) ? close() : open(); });
  document.addEventListener('click', e => { if (menu && !menu.hidden && !menu.contains(e.target)) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', close);

  // Mit dem gespeicherten Stand sofort anzeigen, dann aus der Datenbank nachladen
  async function refresh(session) {
    user = session ? { id: session.user.id, email: session.user.email } : null;
    if (!user) { profile = {}; photo = null; close(); if (window.OverallAccount) OverallAccount.close(); paint(); return; }
    const c = load(user.id);
    profile = (c && c.profile) || {}; photo = (c && c.photo) || null;
    paint();
    try {
      const [{ data, error }, appRole] = await Promise.all([
        sb.from('overall_profiles').select('display_name, avatar_path, role').eq('id', user.id).maybeSingle(),
        sb.rpc('overall_app_role', { p_app: 'dashboard' }).then(r => r.data || null, () => null),
      ]);
      if (error) throw error;
      const path = data && data.avatar_path;
      if (path !== profile.avatar_path || !photo) photo = path ? await OverallAccount.loadPhoto(sb, path) : null;
      profile = { ...(data || {}), app_role: appRole };
      lastSync = new Date();
      save(); paint();
    } catch (e) { if (navigator.onLine) console.warn('Profil laden', e); }
  }

  return { refresh, setLogout: fn => { onLogout = fn; } };
})();

const gate = (() => {
  const $ = id => document.getElementById(id);
  const msg = (text, ok) => { const el = $('loginMsg'); el.textContent = text || ''; el.className = 'gate-msg' + (ok ? ' ok' : ''); el.hidden = !text; };
  function show(view) {
    document.body.classList.remove('unlocked');
    ['gateBusy', 'loginForm', 'noAccess'].forEach(id => { $(id).hidden = id !== view; });
  }
  function errText(e) {
    const m = String(e && (e.message || e));
    if (/invalid login credentials/i.test(m)) return 'E-Mail oder Passwort ist falsch.';
    if (/email not confirmed/i.test(m)) return 'Die E-Mail-Adresse ist noch nicht bestätigt.';
    if (/rate limit|too many/i.test(m)) return 'Zu viele Versuche, bitte kurz warten.';
    if (!navigator.onLine || /fetch|network|load failed/i.test(m)) return 'Keine Verbindung zum Server. Bist du online?';
    return m;
  }
  const remember = id => { try { id ? localStorage.setItem(ACCESS_KEY, id) : localStorage.removeItem(ACCESS_KEY); } catch (e) {} };
  const remembered = () => { try { return localStorage.getItem(ACCESS_KEY); } catch (e) { return null; } };

  async function check() {
    if (!sb) {
      // supabase-js nicht geladen (offline ohne Cache): nur wer schon einmal geprüft wurde, kommt hinein
      if (remembered()) return startDashboard();
      show('loginForm'); msg('Keine Verbindung zum Server. Bist du online?'); return;
    }
    const { data: { session } } = await sb.auth.getSession();
    document.body.classList.toggle('signed-in', !!session);
    profileMenu.refresh(session);
    if (!session) { remember(null); show('loginForm'); return; }
    const applyMeta = m => { setOrder(m.dash_order); setHidden(m.dash_hidden); setFavs(m.dash_favs); };
    applyMeta(session.user.user_metadata);
    // Gespeicherte Sitzung kann veraltet sein (auf anderem Gerät geändert): frisch vom Server holen
    sb.auth.getUser().then(({ data }) => { if (data && data.user) applyMeta(data.user.user_metadata); }).catch(() => {});
    try {
      const { data, error } = await sb.rpc('overall_has_app_role', { p_app: 'dashboard', p_min_role: 'member' });
      if (error) throw error;
      if (data) { remember(session.user.id); return startDashboard(); }
      remember(null);
      $('noAccessEmail').textContent = session.user.email;
      show('noAccess');
    } catch (e) {
      if (!navigator.onLine && remembered() === session.user.id) return startDashboard();
      show('loginForm'); msg(errText(e));
    }
  }

  async function logout() {
    remember(null);
    if (sb) await sb.auth.signOut().catch(() => {});
    document.body.classList.remove('signed-in');
    profileMenu.refresh(null);
    show('loginForm'); msg('');
  }

  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!sb) return msg('Keine Verbindung zum Server. Bist du online?');
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; msg('');
    try {
      const { error } = await sb.auth.signInWithPassword({ email: $('loginEmail').value.trim(), password: $('loginPassword').value });
      if (error) throw error;
      $('loginPassword').value = '';
      show('gateBusy');
      await check();
    } catch (err) { msg(errText(err)); }
    finally { btn.disabled = false; }
  });
  // Der Link führt zu TravelBase: dort ist das Setzen des neuen Passworts schon eingebaut
  $('resetBtn').addEventListener('click', async () => {
    const email = $('loginEmail').value.trim();
    if (!email) { msg('Bitte zuerst die E-Mail-Adresse eintragen.'); $('loginEmail').focus(); return; }
    if (!sb) return msg('Keine Verbindung zum Server. Bist du online?');
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/TravelBase/' });
      if (error) throw error;
      msg('Falls die Adresse bekannt ist, kommt gleich eine E-Mail mit einem Link.', true);
    } catch (err) { msg(errText(err)); }
  });
  profileMenu.setLogout(logout);
  $('noAccessLogout').addEventListener('click', logout);
  // Ab- oder Anmeldung in einem anderen Tab (auch in TravelBase/QuestLog) gilt sofort auch hier
  if (sb) sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' || ev === 'SIGNED_IN') setTimeout(check, 0); });

  return { check };
})();

gate.check();

// Stern antippen = Favorit an/aus; „Anordnen“ schaltet den Sortiermodus
document.getElementById('sections').addEventListener('click', e => {
  const b = e.target.closest('button[data-fav]');
  if (b) toggleFav(b.dataset.fav);
  if (e.target.closest('button[data-arrange]')) { arranging = !arranging; render(); }
});

/* ---------------- Anordnen: Kacheln ziehen (Maus/Touch) oder per Pfeiltasten verschieben ----------------
   Gespeichert wie in den Kontoeinstellungen in user_metadata.dash_order (gilt auf allen Geräten), lokal gemerkt.
   Favoriten bleiben in der Reihenfolge, in der sie markiert wurden. */
// Neue Reihenfolge: Gesamtliste wie bisher, die verschobenen Kacheln nehmen die Plätze der Kacheln ihrer Gruppen ein
function domOrder() {
  const moved = [...document.querySelectorAll('#sections .grid[data-sortable] .tile')].map(t => t.dataset.url);
  let i = 0;
  return sorted(PROJECTS.slice()).map(it => it.url).map(u => moved.includes(u) ? moved[i++] : u);
}
async function saveOrder() {
  const before = order, list = domOrder();
  if (String(list) === String(order)) return;
  order = list; // DOM stimmt schon, nicht neu zeichnen
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(list)); } catch (e) {}
  try {
    const { error } = await sb.auth.updateUser({ data: { dash_order: list } });
    if (error) throw error;
  } catch (e) { console.warn('Reihenfolge speichern', e); setOrder(before); }
}
(function () {
  const host = document.getElementById('sections');
  host.addEventListener('pointerdown', e => {
    const grip = e.target.closest('[data-grip]');
    if (!grip || e.button > 0) return;
    e.preventDefault();
    const tile = grip.closest('.tile'), grid = tile.parentNode;
    tile.classList.add('dragging');
    // Listener am Fenster statt Pointer-Capture: Verschieben im DOM würde die Capture sonst aufheben
    const move = ev => {
      const over = document.elementFromPoint(ev.clientX, ev.clientY), t = over && over.closest('.tile');
      if (!t || t === tile || t.parentNode !== grid) return;
      const tiles = [...grid.children];
      grid.insertBefore(tile, tiles.indexOf(t) > tiles.indexOf(tile) ? t.nextSibling : t);
    };
    const end = () => {
      tile.classList.remove('dragging');
      ['pointermove', 'pointerup', 'pointercancel'].forEach((ev, i) => window.removeEventListener(ev, i ? end : move));
      saveOrder();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  });
  host.addEventListener('keydown', e => {
    const grip = e.target.closest('[data-grip]');
    const dir = grip && { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const tile = grip.closest('.tile'), sib = dir < 0 ? tile.previousElementSibling : tile.nextElementSibling;
    if (!sib) return;
    tile.parentNode.insertBefore(tile, dir < 0 ? sib : sib.nextSibling);
    grip.focus();
    saveOrder();
  });
  // Esc beendet den Sortiermodus
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && arranging && !document.querySelector('dialog[open]')) { arranging = false; render(); } });
})();
// Zurück aus einem Projekt (bfcache) oder App wieder im Vordergrund: Zeiten & Status auffrischen
window.addEventListener('pageshow', e => { if (e.persisted) { loadPushed(); checkSupabase(); loadStreak(); } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { paintPushed(); loadPushed(); checkSupabase(); if (started) loadStreak(); } });

/* ---------------- Suche (Lupe / Taste „/“ / Strg+K) ---------------- */
(function () {
  const dlg = document.getElementById('searchDlg');
  const q = document.getElementById('q');
  const box = document.getElementById('results');
  let all = [], hits = [], sel = 0;

  function update() {
    const f = q.value.trim().toLowerCase();
    hits = all.filter(it => !f || (it.name + ' ' + it.desc + ' ' + it.section).toLowerCase().includes(f));
    sel = Math.min(sel, Math.max(hits.length - 1, 0));
    box.innerHTML = hits.length ? hits.map((it, i) => `
      <a class="hit${i === sel ? ' sel' : ''}" href="${esc(it.url)}">
        <span class="ico" style="background:${esc(it.color || '#334155')}">${iconHtml(it)}</span>
        <span><span class="name">${esc(it.name)}</span><span class="desc">${esc(it.desc)}</span></span>
      </a>`).join('') : '<div class="none">Nichts gefunden.</div>';
    const cur = box.querySelector('.hit.sel');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    if (dlg.open) return;
    all = SECTIONS.flatMap(sec => sec.items.map(it => ({ ...it, section: sec.title })));
    q.value = ''; sel = 0; update();
    dlg.showModal();
    q.focus();
  }

  document.getElementById('searchBtn').addEventListener('click', open);
  q.addEventListener('input', () => { sel = 0; update(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' && hits.length) { sel = (sel + 1) % hits.length; update(); e.preventDefault(); }
    else if (e.key === 'ArrowUp' && hits.length) { sel = (sel - 1 + hits.length) % hits.length; update(); e.preventDefault(); }
    else if (e.key === 'Enter' && hits[sel]) { location.href = hits[sel].url; e.preventDefault(); }
  });
  // Klick auf den abgedunkelten Hintergrund schließt das Fenster
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  document.addEventListener('keydown', e => {
    if (!document.body.classList.contains('unlocked')) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); open(); }
  });
})();

/* ---------------- Begrüßung, Datum & Uhrzeit ---------------- */
(function () {
  const greet = document.getElementById('greeting');
  const today = document.getElementById('today');
  const clock = document.getElementById('clock');
  function tick() {
    const now = new Date();
    const h = now.getHours();
    const g = h < 5 ? 'Gute Nacht' : h < 11 ? 'Guten Morgen' : h < 17 ? 'Hallo' : h < 22 ? 'Guten Abend' : 'Gute Nacht';
    greet.textContent = g + (window.dashUserName ? ', ' + window.dashUserName : '');
    today.textContent = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    clock.textContent = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    clock.dateTime = now.toISOString();
    // auf die nächste volle Sekunde ausrichten
    setTimeout(tick, 1000 - now.getMilliseconds() + 5);
  }
  tick();
})();

/* ---------------- Hell/Dunkel ---------------- */
(function () {
  const meta = document.querySelector('meta[name="theme-color"]');
  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    meta.setAttribute('content', t === 'dark' ? '#000000' : '#f2f2f7');
  }
  apply(document.documentElement.getAttribute('data-theme') || 'light');
  // Umschalten nur über das Kontomenü
  window.dashToggleTheme = () => {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(t);
    try { localStorage.setItem('overall-theme', t); } catch (e) {}
  };
})();


/* ---------------- PWA ---------------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {}));
}
