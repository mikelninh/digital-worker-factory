# One Simple Flow — Operations Assistant

## Deine ganze Aufgabe

> Schau, was als Nächstes zu tun ist. Wenn alles grün ist, weiter. Wenn etwas rot ist, nicht improvisieren — eskalieren.

## Dein Werkzeug

Auf dem vorbereiteten Operations-Rechner doppelklicken:

**`start-hauspilot-ops.cmd`**

Danach arbeitest du nur in der Browser-Console.

Kein Terminal, kein GitHub, kein JSON-Editieren und kein Prompt Engineering im Tagesgeschäft.

## Vor dem ersten echten Kunden — Admin, nicht deine tägliche Aufgabe

- aktueller Release freigegeben
- echter 20-Case Live-Smoke: `KEEP`
- echter 100-Case Live-Full-Gate: `KEEP`
- Operations-Rechner + API-Key + Release-Proof eingerichtet
- sicherer Datei-Transferkanal festgelegt
- Stripe-Zugriff für Operations vorhanden

## Der Standardkunde

### 1 · Zahlung + Kunde

- **1.330 €** Zahlungseingang in Stripe prüfen.
- Kunde, **einen** vereinbarten Workflow, Reviewer und dich als Operations Assistant eintragen.
- Kein Reviewer → nicht starten.
- Kunde/Pilot existiert bereits → bestehenden Eintrag verwenden, nicht überschreiben.

### 2 · Kunde gibt genau drei Dinge

- **20–50** abgeschlossene Beispiele (`CSV` oder `JSON`)
- **eine** Stammdatenliste (`CSV`)
- **eine** fachlich prüfende Person

CSV aus deutschem Excel darf Komma oder Semikolon verwenden. XLSX zuerst als CSV exportieren.

### 3 · Prüfen + Starten

Console zeigt immer nur:

- **STARTEN** → ein Klick
- **ANFORDERN** → genau Fehlendes nachfordern
- **WARTEN** → Freigabe abwarten
- **STOPP** → nicht improvisieren; zuständige Person übernehmen lassen

Vor dem Start laufen Release Lock, Daten-/Privacy-/Safety-Preflight und Scope-Gates.

Standardpilot = maximal 50 Fälle. Mehr Fälle / mehrere Workflows / andere Rechte → Sales/Founder.

### 4 · Reviewer prüft

Review-Datei sicher an den benannten Reviewer senden.

Pro Fall nur:

- **Richtig**
- **Ändern**
- **Falsch**

Bei Ändern/Falsch wird kurz der Fehlergrund gewählt. Die Console akzeptiert nur vollständige, zum Pilot passende Review-Dateien.

### 5 · Ergebnis

Review-Datei zurück in die Console.

Zeit-/ROI-Felder nur ausfüllen, wenn die Baseline/Quelle **vom Kunden bestätigt oder gemeinsam gemessen** wurde. Sonst leer lassen. Der Report zeigt dann korrekt **„Noch messen“** statt erfundener Einsparung.

Der Report beantwortet zuerst:

- **Funktioniert es?**
- **Spart es Zeit?**
- **Ist es sicher?**
- **Weiter · Verbessern · Stoppen · Weiter messen**

### 6 · Abschluss

- Kundenreport sicher senden
- **570-€-Restrechnung** in Stripe senden
- Zahlungseingang prüfen
- Upload-/Transferkopien (z. B. Dropbox) gemäß Retention löschen und bestätigen
- lokale Pilotdaten über die Console löschen
- minimaler Löschbeleg bleibt erhalten

Die 14-Tage-Retention läuft ab Dateneingang. Sie wartet nicht unbegrenzt auf Reviewer oder Restzahlung.

### 7 · Nur bei ausdrücklichem Ja

Wenn Ergebnis **WEITER** und der Kunde **750 €/Monat ausdrücklich annimmt**, darfst du den Standardbetrieb für **denselben** bewiesenen Workflow aktivieren.

Kein Kunden-Opt-in → kein monatlicher Betrieb.

## Du eskalierst nur drei Arten von Fällen

### Datenschutz / Legal

Personenbezogene oder pseudonymisierte Daten, besondere Kategorien, unklare Anonymisierung oder reale Objekt-/Wohnungsbezüge, die Personen rückführbar machen könnten.

→ **STOPP · Privacy/Owner**

### Technik / Safety

Runtime/API/Console defekt, Safety Gate rot, Release Lock nicht ready oder unerwarteter interner Fehler.

→ **STOPP · Engineering**

### Kommerziell / Scope

Sonderpreis, mehr als 50 Fälle, mehrere Workflows, neue Produktionsrechte, Sondervertrag oder Preis ≠ 750 €/Monat für den Standardbetrieb.

→ **STOPP · Sales/Founder**

## Erfolgsdefinition

Ein normaler bezahlter Standardkunde läuft vom bestätigten Zahlungseingang bis zum Closeout **ohne Founder-Eingriff**.

> **Was ist mein nächster Klick?**

Wenn du technische Dokumentation brauchst, um einen Standardfall zu bedienen, ist der Prozess noch nicht simpel genug.
