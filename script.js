// === Toggle Button Logic ===
document.querySelectorAll('.toggle-wrapper').forEach(wrapper => {
  wrapper.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wrapper.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

// === Helper: Get toggle value ===
function getToggleValue(field) {
  const activeBtn = document.querySelector(`.toggle-btn.active[data-field="${field}"]`);
  return activeBtn ? activeBtn.dataset.value === 'ja' : false;
}

// === Format currency ===
function formatEuro(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// === Format percent ===
function formatPct(value) {
  return value + ' %';
}

// === KFW Förderberechnung ===
function berechneKfwFoerderung(eingaben) {
  const { hausAlt, eigentuemer, einkommenUnter40k, heizungstyp, heizungAlt, heizungFunktioniert } = eingaben;

  // 1. Grundförderung: 30 % wenn Haus älter als 5 Jahre
  const grundfoerderung = hausAlt ? 30 : 0;

  // 3. Effizienzbonus: 5 % wenn Haus älter als 5 Jahre
  const effizienzbonus = hausAlt ? 5 : 0;

  // 2. Einkommensbonus: 30 % wenn Haus >5J + selbstnutzender Eigentümer + Einkommen <40k + max. 2 WE
  const einkommensbonus = (hausAlt && eigentuemer && einkommenUnter40k && eingaben.wohneinheiten <= 2) ? 30 : 0;

  // 4. Klimageschwindigkeitsbonus
  // Grundbedingung für b) und c): selbstnutzender Eigentümer + Haus >5J + Heizung funktionstüchtig
  let klimabonus = 0;
  if (heizungstyp === 'waermepumpe') {
    // a) Bestandsheizung ist Wärmepumpe → 0 %
    klimabonus = 0;
  } else if (eigentuemer && hausAlt && heizungFunktioniert && ['oel', 'kohle', 'nachtspeicher'].includes(heizungstyp)) {
    // b) Öl / Kohle / Nachtspeicher → kein Alterserfordernis → 20 %
    klimabonus = 20;
  } else if (eigentuemer && hausAlt && heizungFunktioniert && heizungAlt && ['gas', 'biomasse'].includes(heizungstyp)) {
    // c) Gas / Biomasse → nur wenn Heizung >20 Jahre → 20 %
    klimabonus = 20;
  }

  // Fördersatz selbstgenutzte WE: alle Boni, max. 70 %
  const foerdersatzSelbst = Math.min(grundfoerderung + effizienzbonus + klimabonus + einkommensbonus, 70);

  // Fördersatz weitere WE: nur Grundförderung + Effizienzbonus (persönliche Boni entfallen)
  const foerdersatzWeitere = Math.min(grundfoerderung + effizienzbonus, 70);

  // Förderfähige Höchstkosten (KFW 458)
  const MAX_SELBST  = 30000; // selbstgenutzte WE
  const MAX_WEITERE = 15000; // jede weitere WE

  const selbstAnzahl  = eigentuemer ? 1 : 0;
  const weitereAnzahl = Math.max(0, eingaben.wohneinheiten - selbstAnzahl);

  const foerderbareKostenSelbst  = selbstAnzahl  * MAX_SELBST;
  const foerderbareKostenWeitere = weitereAnzahl * MAX_WEITERE;

  const foerdersumme =
    Math.min(eingaben.preisBrutto, foerderbareKostenSelbst) * (foerdersatzSelbst / 100) +
    Math.min(Math.max(0, eingaben.preisBrutto - foerderbareKostenSelbst), foerderbareKostenWeitere) * (foerdersatzWeitere / 100);

  const foerdersummeRounded = Math.round(foerdersumme);

  const effektiverFoerdersatz = eingaben.preisBrutto > 0
    ? Math.round((foerdersummeRounded / eingaben.preisBrutto) * 100)
    : 0;

  const neuerPreis = eingaben.preisBrutto - foerdersummeRounded;

  return {
    grundfoerderung,
    effizienzbonus,
    klimabonus,
    einkommensbonus,
    foerdersatzSelbst,
    foerdersatzWeitere,
    selbstAnzahl,
    weitereAnzahl,
    effektiverFoerdersatz,
    foerdersumme: foerdersummeRounded,
    neuerPreis
  };
}

// === Ergebnis anzeigen ===
function aktualisiereErgebnis() {
  const eingaben = {
    preisBrutto:       parseFloat(document.getElementById('preis').value) || 0,
    wohneinheiten:     parseInt(document.getElementById('wohneinheiten').value) || 1,
    eigentuemer:       getToggleValue('eigentuemer'),
    hausAlt:           getToggleValue('haus-alt'),
    heizungstyp:       document.getElementById('heizungstyp').value,
    heizungAlt:           getToggleValue('heizung-alt'),
    heizungFunktioniert:  getToggleValue('heizung-funktioniert'),
    einkommenUnter40k:    getToggleValue('einkommen-unter-40k')
  };

  if (!eingaben.preisBrutto || !eingaben.heizungstyp) return;

  const r = berechneKfwFoerderung(eingaben);

  document.getElementById('t-grundfoerderung').textContent     = formatPct(r.grundfoerderung);
  document.getElementById('t-effizienzbonus').textContent      = formatPct(r.effizienzbonus);
  document.getElementById('t-klimabonus').textContent          = formatPct(r.klimabonus);
  document.getElementById('t-einkommensbonus').textContent     = formatPct(r.einkommensbonus);
  document.getElementById('t-foerdersatz-selbst').textContent  = r.selbstAnzahl  > 0 ? formatPct(r.foerdersatzSelbst)  : '—';
  document.getElementById('t-foerdersatz-weitere').textContent = r.weitereAnzahl > 0 ? formatPct(r.foerdersatzWeitere) : '—';
  document.getElementById('t-effektiv').textContent            = formatPct(r.effektiverFoerdersatz);
  document.getElementById('t-foerdersumme').textContent        = formatEuro(r.foerdersumme);
  document.getElementById('t-neuer-preis').textContent         = formatEuro(r.neuerPreis);
}

// === Live-Update bei jeder Eingabe ===
document.getElementById('preis').addEventListener('input', aktualisiereErgebnis);
document.getElementById('wohneinheiten').addEventListener('input', aktualisiereErgebnis);
document.getElementById('heizungstyp').addEventListener('change', aktualisiereErgebnis);

document.querySelectorAll('.toggle-wrapper').forEach(wrapper => {
  wrapper.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', aktualisiereErgebnis);
  });
});

// === Form Submit (verhindert Seitenreload) ===
document.getElementById('foerder-form').addEventListener('submit', function (e) {
  e.preventDefault();
  aktualisiereErgebnis();

  // Button-Puls-Effekt
  const btn = document.querySelector('.btn-berechnen');
  btn.classList.remove('btn-fired');
  void btn.offsetWidth; // reflow zum Reset der Animation
  btn.classList.add('btn-fired');
  btn.addEventListener('animationend', () => btn.classList.remove('btn-fired'), { once: true });

  // Ergebnis-Card Highlight
  const card = document.getElementById('ergebnis');
  card.classList.remove('card-updated');
  void card.offsetWidth;
  card.classList.add('card-updated');
  card.addEventListener('animationend', () => card.classList.remove('card-updated'), { once: true });
});
