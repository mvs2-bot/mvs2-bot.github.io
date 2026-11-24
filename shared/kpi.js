/* Kpi – kleine Kennzahl an den Dashboard-Kacheln (ähnlich der DailyMind-Streak).
   Gerechnet wird auf dem Server: RPC overall_tile_kpis(p_tz) im Repo supabase-core, ein Aufruf für alle Apps,
   nur eigene Daten, Apps ohne Zugang fehlen. Hier: holen, zwischenspeichern (localStorage kpi:<uid>), anzeigen.

   Benutzung:
     <span class="kpi" data-kpi="<app-id>" hidden></span>   Platzhalter an der Kachel (projects.js: kpi: true)
     Kpi.paint(uid)        Werte aus Speicher/Cache in alle [data-kpi] schreiben (nach jedem Rendern)
     Kpi.load(sb, uid)     frisch vom Server holen, speichern, anzeigen
   Neue Kennzahl: Feld im RPC ergänzen und hier in FORMAT eine Zeile { text, title } anlegen. */
(function () {
    const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return null; } })();
    const num = n => Number(n).toLocaleString('de-DE', { maximumFractionDigits: 0 });
    const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;

    // Je App: aus den Rohwerten Text und Tooltip machen; null = nichts anzeigen
    const FORMAT = {
        travelbase:    k => k.on_trip ? { text: 'unterwegs', title: 'Reise läuft gerade' }
                          : k.days == null ? null
                          : { text: k.days === 1 ? 'morgen' : `in ${num(k.days)} T.`, title: 'Bis zur nächsten Reise' },
        questlog:      k => ({ text: `${num(k.done)}/${num(k.total)}`, title: 'Erledigte Quests' }),
        matchboard:    k => ({ text: plural(k.wins, 'Sieg', 'Siege'), title: 'Deine Siege ' + new Date().getFullYear() }),
        migralog:      k => k.free_days == null ? null : { text: `${num(k.free_days)} T. frei`, title: 'Tage ohne Kopfschmerz in Folge' },
        jobtracker:    k => ({ text: `${num(k.open)} offen`, title: 'Offene Bewerbungen' }),
        caminotracker: k => ({ text: `${num(k.km)} km`, title: 'Gelaufene Kilometer gesamt' }),
        pegeltracker:  k => ({ text: plural(k.week, 'Getränk', 'Getränke'), title: 'Diese Woche (ohne Koffein)' }),
        yearinpixels:  k => ({ text: plural(k.days, 'Tag', 'Tage'), title: 'Tage mit Einträgen ' + new Date().getFullYear() }),
    };

    let data = null, dataUid = null;
    const key = uid => 'kpi:' + uid;
    function get(uid) {
        if (uid && dataUid !== uid) {
            try { data = JSON.parse(localStorage.getItem(key(uid))); } catch (e) { data = null; }
            dataUid = uid;
        }
        return uid ? data : null;
    }

    function paint(uid) {
        const all = get(uid) || {};
        document.querySelectorAll('[data-kpi]').forEach(el => {
            const app = el.dataset.kpi, f = FORMAT[app];
            const out = f && all[app] ? f(all[app]) : null;
            el.hidden = !out;
            if (!out) return;
            el.textContent = out.text;
            el.title = out.title;
            el.setAttribute('aria-label', `${out.title}: ${out.text}`);
        });
    }

    async function load(sb, uid) {
        if (!sb || !uid) return;
        try {
            const { data: res, error } = await sb.rpc('overall_tile_kpis', { p_tz: TZ });
            if (error) throw error;
            data = res || {};
            dataUid = uid;
            try { localStorage.setItem(key(uid), JSON.stringify(data)); } catch (e) {}
            paint(uid);
        } catch (e) { if (navigator.onLine) console.warn('KPI', e); }
    }

    window.Kpi = { paint, load };
})();
