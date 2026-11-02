/* Seitennavigation für die Einstellungsseiten (konto.html, admin.html), wie die iOS-Einstellungen:
   links eine Liste der Bereiche (am Handy eine waagerechte Leiste), rechts immer nur ein Bereich.
   Ein Bereich ist ein <section class="pane" id="…">. Der Hash (#profil, #app-travelbase, #g-users …)
   wählt den Bereich; zeigt er auf ein Element in einem Bereich, wird dieser geöffnet und dorthin gescrollt.

   SettingsNav.build(navEl, [{ title, items: [{ id, label, icon, color, img }] }])
     icon: Schlüssel aus SettingsNav.ICONS, img: Bild-URL (App-Icon); color: Kachelfarbe;
     feature: kurzer Zusatz (z. B. 'Startseite') → Eintrag hervorgehoben */
window.SettingsNav = (() => {
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    key: svg('<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.2-8.2M17 6l3 3M14.5 8.5l2 2"/>'),
    display: svg('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'),
    apps: svg('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
    users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>'),
    shield: svg('<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    flame: svg('<path d="M12 21c-4 0-7-2.7-7-6.5 0-3.6 3-5.6 4-9.5 2.5 1.5 4 4 4 6 1-1 1.5-2 1.5-3.5 2.5 2 4.5 4.5 4.5 7 0 3.8-3 6.5-7 6.5z"/>'),
    more: svg('<circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/>'),
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Symbol-Kachel: App-Icon als Bild (fällt beim Ladefehler auf den Anfangsbuchstaben zurück) oder Liniensymbol
  const tile = it => `<span class="ti" style="background:${esc(it.color || '#8e8e93')}">${it.img
    ? `<b>${esc((it.label || '?')[0])}</b><img src="${esc(it.img)}" alt="" loading="lazy" onerror="this.remove()">`
    : ICONS[it.icon] || ''}</span>`;
  let nav = null;

  function build(navEl, groups) {
    nav = navEl;
    nav.innerHTML = groups.filter(g => g.items.length).map(g => `
      <div class="snav-group">${g.title ? `<p class="snav-title">${esc(g.title)}</p>` : ''}
        ${g.items.map(it => `<a href="#${esc(it.id)}" data-pane="${esc(it.id)}"${it.feature ? ' class="feature"' : ''}>${tile(it)}<span>${esc(it.label)}</span>${it.feature ? `<small>${esc(it.feature)}</small>` : ''}</a>`).join('')}
      </div>`).join('');
    fromHash(true);
  }

  function show(id) {
    const panes = [...document.querySelectorAll('.pane')].filter(p => nav && nav.querySelector(`[data-pane="${p.id}"]`));
    const target = panes.find(p => p.id === id) || panes[0];
    panes.forEach(p => p.classList.toggle('on', p === target));
    if (!nav || !target) return target;
    nav.querySelectorAll('a').forEach(a => {
      const on = a.dataset.pane === target.id;
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
      // Am Handy den aktiven Eintrag in der Leiste sichtbar halten
      if (on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2;
    });
    return target;
  }

  function fromHash(first) {
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id && document.getElementById(id);
    const pane = el && el.closest('.pane');
    const shown = show(pane ? pane.id : '');
    if (el && el.tagName === 'DETAILS') el.open = true;
    if (el && pane && el !== pane) el.scrollIntoView();
    else if (!first && shown) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', () => fromHash(false));

  return { build, show, refresh: () => fromHash(true), ICONS, tile };
})();
