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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// === KFW Förderberechnung ===
// TODO: Echte KFW-Formel hier einsetzen!
// Aktuell: Platzhalter-Logik
function berechneKfwFoerderung(eingaben) {
  let foerdersatz = 0;

  // --- PLATZHALTER-FORMEL (durch echte ersetzen) ---
  // Basis: 30% wenn Eigentümer + Haus > 5 Jahre
  if (eingaben.eigentuemer && eingaben.hausAlt) {
    foerdersatz = 30;
  }

  // Bonus: +20% wenn Heizung > 20 Jahre (Öl oder Gas)
  if (eingaben.heizungAlt && eingaben.heizungstyp) {
    foerdersatz += 20;
  }

  // Einkommensbonus: +30% wenn unter 40k
  if (eingaben.einkommenUnter40k) {
    foerdersatz += 30;
  }

  // Cap bei 70%
  foerdersatz = Math.min(foerdersatz, 70);
  // --- ENDE PLATZHALTER ---

  const foerdersumme = Math.round(eingaben.preisBrutto * (foerdersatz / 100));
  const preisNachFoerderung = eingaben.preisBrutto - foerdersumme;

  return { foerdersatz, foerdersumme, preisNachFoerderung };
}

// === Form Submit ===
document.getElementById('foerder-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const eingaben = {
    preisBrutto: parseFloat(document.getElementById('preis').value) || 0,
    wohneinheiten: parseInt(document.getElementById('wohneinheiten').value) || 1,
    eigentuemer: getToggleValue('eigentuemer'),
    hausAlt: getToggleValue('haus-alt'),
    heizungstyp: document.getElementById('heizungstyp').value,
    heizungAlt: getToggleValue('heizung-alt'),
    einkommenUnter40k: getToggleValue('einkommen-unter-40k')
  };

  if (!eingaben.preisBrutto || !eingaben.heizungstyp) {
    return;
  }

  const ergebnis = berechneKfwFoerderung(eingaben);

  document.getElementById('foerdersumme').textContent = formatEuro(ergebnis.foerdersumme);
  document.getElementById('foerdersatz').textContent = ergebnis.foerdersatz + ' %';
  document.getElementById('preis-nach-foerderung').textContent = formatEuro(ergebnis.preisNachFoerderung);

  const card = document.getElementById('ergebnis');
  card.classList.remove('hidden');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
