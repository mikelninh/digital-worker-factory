# Operations Assistant — Standardkunde end to end

## Ziel

Nach bestätigter Anzahlung kann eine nicht-technische Operations Assistenz einen **Standardpilot ohne Founder-Intervention** abarbeiten.

Die Assistenz arbeitet nur in der **Operations Console**. Kein Terminal, kein JSON-Editieren, kein GitHub und kein Prompt Engineering im Tagesgeschäft.

## Einmaliges Admin-/Release-Setup

Nicht pro Kunde:

1. aktuelle Offline-CI grün
2. echter **20-Case Smoke = KEEP**
3. echter **100-Case Full = KEEP**
4. beide Audit-Artefakte über `activate-release.mjs` aktivieren
5. Node 22+, Repo, lokaler `OPENAI_API_KEY`, Release-Proof auf dem Operations-Rechner
6. `start-hauspilot-ops.cmd` testen
7. einen sicheren Transferkanal festlegen
8. Operations mit den nötigen Stripe-/Datei-Zugriffen ausstatten

Der Kundenrunner bleibt ohne Release-Proof technisch gesperrt.

## Standardkunde — was ist erlaubt?

- **ein** vereinbarter Workflow
- **20–50** Fälle
- synthetische oder wirklich de-identifizierte/anonymisierte historische Daten
- ein fachlicher Reviewer
- keine produktiven Schreib-/Ausführungsrechte

Wenn reale Objekt-/Wohnungsbezüge Personen für den Kunden rückführbar machen könnten, wird das **nicht automatisch als anonym** behandelt.

Pseudonymisierte/personenbezogene Daten, besondere Kategorien oder unklare Anonymisierung:

**→ STOPP · Privacy/Owner.**

## Standardablauf

### 1 · Zahlung + Kunde

- **1.330 €** Zahlungseingang in Stripe prüfen.
- Kunde, vereinbarten Workflow, Reviewer und Operations Assistant eintragen.
- Kunde/Pilot darf nicht doppelt angelegt werden.

### 2 · Genau drei Kundendinge

1. **20–50 abgeschlossene Beispiele** (`CSV` oder `JSON`)
2. **eine Stammdatenliste** (`CSV`)
3. **eine fachlich prüfende Person**

CSV mit Komma oder Semikolon wird unterstützt. XLSX zuerst als CSV exportieren.

### 3 · Intake / Preflight

- Dateien über den vereinbarten sicheren Kanal erhalten.
- Kundenfreigabe bestätigen.
- bei anonymisiertem Standardpfad: Anonymisierung/de-identification bestätigen.
- `Prüfen`.

Die Console zeigt genau:

- **STARTEN**
- **ANFORDERN**
- **WARTEN**
- **STOPP**

Mehr als 50 Fälle = Sonderscope → Sales/Founder.

### 4 · Start

Bei `STARTEN` einmal klicken.

Im Hintergrund:

`Release Lock → Preflight → Privacy Manifest → Konfiguration → Modelllauf → Safety Boundary → Ergebnisse → Review-Paket`

### 5 · Reviewer

- Review-Datei sicher senden.
- Reviewer entscheidet pro Fall nur:
  - **Richtig**
  - **Ändern**
  - **Falsch**
- bei Ändern/Falsch wird ein kurzer Fehlergrund gewählt.
- zurückgesendete Review-Datei einlesen.

Das System blockiert unvollständige Reviews, fremde/duplizierte Case-IDs, ungültige Entscheidungen oder fehlende Fehlergründe.

### 6 · Ergebnis

Zeit-/ROI-Felder nur ausfüllen, wenn Baseline/Quelle **vom Kunden bestätigt oder gemeinsam gemessen** wurde.

Wenn keine belastbare Baseline existiert: leer lassen. Der Report zeigt **Noch messen** statt einer erfundenen Einsparung.

Report vorne:

- **Funktioniert es?**
- **Spart es Zeit?**
- **Ist es sicher?**
- **WEITER / VERBESSERN / STOPPEN / WEITER MESSEN**

### 7 · Abschluss

- Kundenreport sicher senden
- **570-€-Restrechnung** senden
- Zahlung prüfen
- temporäre Upload-/Transferkopien (z. B. Dropbox) gemäß Retention löschen und bestätigen
- lokale Pilotdaten über die Console löschen
- minimaler `deletion-proof.local.json` bleibt erhalten

Die Pilot-Retention beträgt standardmäßig **14 Tage ab Dateneingang**. Sie wartet nicht unbegrenzt auf Review oder Restzahlung; bei Fristablauf löscht die Operations Console die lokalen Pilot-Rohdaten fail-closed und setzt `STOPP_RETENTION`.

### 8 · Monatlich nur nach ausdrücklichem Kunden-Ja

Nur wenn:

- Ergebnis = **WEITER / KEEP**
- gleicher bewiesener Workflow
- Standardpreis = **750 €/Monat**
- Kunde hat **ausdrücklich angenommen**

Dann darf Operations den Standardbetrieb aktivieren.

Kein Opt-in → kein Abo.

## Nur drei Eskalationsklassen

### 1. Privacy / Legal

Personenbezogene/pseudonymisierte Daten, besondere Kategorien, unklare De-identification oder Datenschutz-/Processor-Fragen.

→ **STOPP · Privacy/Owner**

### 2. Technik / Safety

Release Lock, API, Runtime, Console, Safety Gate oder unerwarteter interner Fehler.

→ **STOPP · Engineering**

### 3. Commercial / Scope

>50 Fälle, mehrere Workflows, anderer Preis, Sondervertrag, neue Produktionsrechte oder anderer monatlicher Scope.

→ **STOPP · Sales/Founder**

## Definition „Assistant-ready“

Ein normaler bezahlter Standardkunde läuft vom bestätigten Zahlungseingang bis zum Closeout **ohne Founder-Eingriff**.

Der Founder ist kein regulärer Delivery-Schritt.

**Release-Regel:** Diese Aussage gilt nur für einen Commit, dessen relevante Assistant-/Stakeholder-/Privacy-/Safety-Tests grün sind und dessen 20/100 Live-Release-Proof aktiviert ist.
