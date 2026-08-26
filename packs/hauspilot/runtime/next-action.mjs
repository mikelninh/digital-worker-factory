export function nextAction(preflight = {}) {
  const errors = Array.isArray(preflight.errors) ? preflight.errors : [];
  if (preflight.ok === true && errors.length === 0) {
    return { action: 'STARTEN', message: 'Alles vorhanden. Pilot kann gestartet werden.' };
  }

  const has = prefix => errors.some(e => String(e).startsWith(prefix));
  const missing = name => errors.some(e => String(e) === `missing_file:${name}`);

  if (has('secret_detected:')) {
    return { action: 'STOPP', message: 'Sensible Zugangsdaten erkannt. Datenpaket zuerst bereinigen.' };
  }
  if (has('personal_data_requires_gate:') || has('special_category_data_requires_specific_review') || has('anonymised_mode_direct_identifier:') || has('anonymised_data_requires_anonymisation_confirmation')) {
    return { action: 'STOPP', message: 'Datenschutz-Freigabe fehlt oder Datenpaket ist noch nicht ausreichend anonymisiert.' };
  }
  if (missing('cases.json') || has('too_few_cases:')) {
    return { action: 'ANFORDERN', message: 'Es fehlen genügend historische Beispiele. Bitte 20–50 abgeschlossene Fälle anfordern.' };
  }
  if (has('too_many_cases:')) {
    return { action: 'STOPP', message: 'Mehr als 50 Fälle sind außerhalb des Standardpiloten. Sales/Founder klärt den Scope.' };
  }
  if (missing('properties.csv') || has('properties_csv_missing_header:') || has('property_row_invalid:') || has('duplicate_property_id:')) {
    return { action: 'ANFORDERN', message: 'Die einfache Stammdatenliste fehlt oder ist unvollständig.' };
  }
  if (has('approval_gate_false:reviewer_named')) {
    return { action: 'ANFORDERN', message: 'Eine fachlich prüfende Person muss noch benannt werden.' };
  }
  if (has('approval_gate_false:operator_named')) {
    return { action: 'STOPP', message: 'Interner Operations-Verantwortlicher fehlt. Intern zuweisen, nicht den Kunden belasten.' };
  }
  if (has('approval_gate_false:data_authorised') || has('approval_gate_false:scope_confirmed') || has('approval_gate_false:retention_confirmed')) {
    return { action: 'WARTEN', message: 'Eine erforderliche Freigabe fehlt. Zuständige Person entscheidet zuerst.' };
  }
  if (missing('client.json') || missing('pilot-approval.json') || has('unknown_template:') || has('case_template_mismatch:') || has('invalid_json:') || has('invalid_data_mode') || has('duplicate_case_id:') || has('case_missing_id')) {
    return { action: 'STOPP', message: 'Interner Setup-Fehler. Nicht improvisieren; Engineering hinzuziehen.' };
  }
  return { action: 'STOPP', message: 'Pilot ist noch nicht startklar. Engineering hinzuziehen.' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => raw += chunk);
  process.stdin.on('end', () => {
    try {
      const result = nextAction(JSON.parse(raw || '{}'));
      console.log(JSON.stringify(result, null, 2));
    } catch {
      console.log(JSON.stringify({ action: 'STOPP', message: 'Prüfergebnis konnte nicht gelesen werden.' }, null, 2));
      process.exitCode = 1;
    }
  });
}
