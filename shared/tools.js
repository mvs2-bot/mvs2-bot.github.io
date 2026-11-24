// Mini-Tools des Dashboards (Sonne, Münze, Würfel, Wetter, Timer, Stoppuhr, Urlaub, Mond). Lädt mit defer.

/* ---------------- Mini-Tools: Sonnenauf-/-untergang ----------------
   Lokal berechnet (Sonnenstand-Formel wie suncalc), keine API nötig. Standort per Browser-GPS. */
function sunTimes(date, lat, lng) {
  const rad = Math.PI / 180, J1970 = 2440588, J2000 = 2451545, day = 864e5, e = rad * 23.4397, lw = -lng * rad, phi = lat * rad;
  const n = Math.round(date / day - 0.5 + J1970 - J2000 - 0.0009 - lw / (2 * Math.PI));
  const ds = J2000 + 0.0009 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * (ds - J2000));
  const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(L) * Math.sin(e));
  const noon = ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const cosW = (Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (Math.abs(cosW) > 1) return null; // Polartag/-nacht
  const set = noon + Math.acos(cosW) / (2 * Math.PI), toDate = j => new Date((j + 0.5 - J1970) * day);
  return { rise: toDate(2 * noon - set), set: toDate(set) };
}
(function () {
  const $ = id => document.getElementById(id), out = $('toolOut'), clk = $('clockOut');
  const show = t => { out.textContent = t; out.hidden = false; };
  const hm = d => d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const getPos = ok => {
    if (!navigator.geolocation) return show('Standort wird von diesem Browser nicht unterstützt.');
    show('Standort wird ermittelt …');
    navigator.geolocation.getCurrentPosition(p => ok(p.coords.latitude, p.coords.longitude),
      err => show(err.code === 1 ? 'Standortzugriff verweigert.' : 'Standort nicht verfügbar.'), { maximumAge: 6e5, timeout: 15000 });
  };

  $('sunBtn').addEventListener('click', () => getPos((lat, lng) => {
    const t = sunTimes(new Date(), lat, lng);
    if (!t) return show('Heute kein Sonnenauf- oder -untergang (Polartag/-nacht).');
    const min = Math.round((t.set - t.rise) / 6e4);
    show(`Aufgang ${hm(t.rise)} · Untergang ${hm(t.set)} · Tageslänge ${Math.floor(min / 60)} h ${min % 60} min`);
  }));

  const rnd = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  $('coinBtn').addEventListener('click', () => show(`Münze: ${rnd(2) ? 'Kopf' : 'Zahl'}`));
  $('diceBtn').addEventListener('click', () => { const n = rnd(6); show(`Würfel: ${'⚀⚁⚂⚃⚄⚅'[n]} ${n + 1}`); });

  // Wetter: Open-Meteo, kostenlos und ohne API-Key
  const WX = { 0: 'klar', 1: 'überwiegend klar', 2: 'teils bewölkt', 3: 'bedeckt', 45: 'Nebel', 48: 'Reifnebel', 51: 'leichter Niesel', 53: 'Niesel', 55: 'starker Niesel',
    56: 'gefrierender Niesel', 57: 'gefrierender Niesel', 61: 'leichter Regen', 63: 'Regen', 65: 'starker Regen', 66: 'gefrierender Regen', 67: 'gefrierender Regen',
    71: 'leichter Schnee', 73: 'Schnee', 75: 'starker Schnee', 77: 'Schneegriesel', 80: 'Regenschauer', 81: 'Regenschauer', 82: 'heftige Schauer',
    85: 'Schneeschauer', 86: 'Schneeschauer', 95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'Gewitter mit Hagel' };
  $('wxBtn').addEventListener('click', () => getPos(async (lat, lng) => {
    show('Wetter wird geladen …');
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&timezone=auto`);
      if (!r.ok) throw 0;
      const c = (await r.json()).current, n = v => Math.round(v);
      show(`${n(c.temperature_2m)} °C (gefühlt ${n(c.apparent_temperature)} °C) · ${WX[c.weather_code] || '–'} · Wind ${n(c.wind_speed_10m)} km/h · Niederschlag ${c.precipitation} mm`);
    } catch (e) { show('Wetter nicht abrufbar (offline?).'); }
  }));

  // Timer und Stoppuhr teilen sich eine Zeile; es läuft immer nur eins
  let tick = null, mode = '';
  const stop = () => { clearInterval(tick); tick = null; mode = ''; };
  const fmt = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const line = t => { clk.textContent = t; clk.hidden = false; };
  $('timerBtn').addEventListener('click', () => {
    if (mode === 'timer') { stop(); return line('Timer abgebrochen.'); }
    const m = parseFloat(String(prompt('Timer – wie viele Minuten?', '5') || '').replace(',', '.'));
    if (!(m > 0)) return;
    stop(); mode = 'timer';
    const end = Date.now() + m * 6e4;
    const run = () => {
      const left = end - Date.now();
      if (left > 0) return line(`Timer: ${fmt(left + 999)} (nochmal tippen = abbrechen)`);
      stop(); line('Timer abgelaufen!');
      if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
      try { const a = new AudioContext(), o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(); o.stop(a.currentTime + 0.8); } catch (e) {}
    };
    run(); tick = setInterval(run, 250);
  });
  $('swBtn').addEventListener('click', () => {
    if (mode === 'sw') { const t = clk.textContent.replace(/ \(.*/, ''); stop(); return line(`${t} – gestoppt`); }
    stop(); mode = 'sw';
    const start = Date.now();
    const run = () => { const ms = Date.now() - start; line(`Stoppuhr: ${fmt(ms)},${Math.floor(ms % 1000 / 100)} (nochmal tippen = stoppen)`); };
    run(); tick = setInterval(run, 100);
  });

  // Mondphase: Alter seit Referenz-Neumond 06.01.2000 18:14 UTC, synodischer Monat 29,53 Tage (Genauigkeit ca. ±1 Tag)
  $('moonBtn').addEventListener('click', () => {
    const P = 29.530588853, age = (((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % P + P) % P;
    const names = ['Neumond', 'zunehmende Sichel', 'erstes Viertel', 'zunehmender Mond', 'Vollmond', 'abnehmender Mond', 'letztes Viertel', 'abnehmende Sichel'];
    const light = Math.round((1 - Math.cos(2 * Math.PI * age / P)) / 2 * 100);
    const toFull = (P / 2 - age + P) % P, toNew = P - age;
    show(`Mond: ${names[Math.round(age / P * 8) % 8]} · ${light} % beleuchtet · nächster Vollmond in ${Math.round(toFull)} Tagen · Neumond in ${Math.round(toNew)} Tagen`);
  });

  // Reisen 2027 – Termine hier pflegen
  const TRIPS = [{ name: 'Thailand & Sri Lanka', start: '2027-01-01', end: '2027-02-23' }, { name: 'Südamerika', start: '2027-03-15', end: '2027-05-28' }];
  $('tripBtn').addEventListener('click', () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = d => Math.round((new Date(d + 'T00:00') - today) / 864e5);
    show(TRIPS.map(t => {
      const a = days(t.start), b = days(t.end);
      return `${t.name}: ${a > 0 ? `noch ${a} Tage` : b >= 0 ? `läuft (Tag ${1 - a})` : 'vorbei'}`;
    }).join(' · '));
  });
})();
