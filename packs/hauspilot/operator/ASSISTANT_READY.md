# Operations Assistant — Standardkunde end to end

## Ziel

Nach bestätigter Anzahlung kann eine nicht-technische Operations Assistenz einen **Standardpilot** ohne Founder-Intervention abarbeiten.

Die Assistenz arbeitet nur in der **Operations Console**. Kein Terminal, kein JSON-Editieren, kein GitHub und kein Prompt Engineering im Tagesgeschäft.

## Einmaliges Admin-Setup vor dem ersten Kunden

1. Node.js 22+ auf dem Operations-Rechner installieren.
2. Repository lokal bereitstellen.
3. `OPENAI_API_KEY` als lokale Umgebungsvariable oder in der gitignorierten `.env.local` konfigurieren.
4. `start-hauspilot-ops.cmd` testen.
5. Sicheren Datei-Transferkanal festlegen (z. B. kundenseitig freigegebener Upload/File Request).
6. Stripe-Zugriff für Rechnungsstatus und Rechnungsversand geben.

Diese Schritte sind **Admin-Setup, nicht pro Kunde**.

## Standardkunde — danach komplett durch Operations

### 1. Zahlung prüfen

- In Stripe: **1.330 € eingegangen**.
- Operations Console öffnen.
- Kunde, Workflow, Reviewer und Operations-Namen eintragen.
- Zahlungseingang bestätigen.
- `Kunde starten`.

### 2. Genau drei Dinge anfordern

1. **20–50 abgeschlossene Beispiele** (`.csv` oder unser `.json`-Format)
2. **eine Stammdatenliste** als CSV (`property_id,address,unit`, optional `aliases`)
3. **eine fachlich prüfende Person**

Für Reparatur/Postfach kann die Beispiele-CSV sehr einfach sein:

```csv
case_id,message
1,"Heizung in der Wohnung komplett kalt"
2,"Wann kommt die Nebenkostenabrechnung?"
```

Für Rechnungen unterstützt der Intake u. a.:

```csv
case_id,invoice_number,amount_eur,vendor,property_reference,po_amount_eur,po_vendor
1,INV-1,950,Sanitär GmbH,P-1,900,Sanitär GmbH
```

### 3. Daten einlesen

- Beispiele auswählen.
- Stammdatenliste auswählen.
- Kundenfreigabe bestätigen.
- Bei wirklich anonymisierten Daten: Anonymisierung bestätigen.
- `Prüfen`.

Die Console zeigt nur:

- **STARTEN** → weiter
- **ANFORDERN** → genau die fehlenden Daten nachfordern
- **WARTEN** → erforderliche Freigabe abwarten
- **STOPP** → nicht improvisieren; eskalieren

### 4. Pilot starten

Bei `STARTEN` auf **Starten** klicken.

Im Hintergrund laufen automatisch:

`Preflight → Privacy Manifest → Konfiguration → echter Modelllauf → Safety Boundary → Ergebnisdatei → Review-Paket`

Operations muss diese Schritte nicht einzeln ausführen.

### 5. Fachreview

- `Review-Datei herunterladen`.
- Über den vereinbarten sicheren Kanal an den Reviewer schicken.
- Reviewer öffnet die HTML-Datei lokal.
- Pro Fall nur:
  - **Richtig**
  - **Ändern**
  - **Falsch**
- Reviewer sendet `review-decisions.json` zurück.

### 6. Ergebnis erzeugen

In der Console:

- Review-Datei auswählen.
- Fälle/Monat eintragen.
- Minuten/Fall vorher eintragen.
- Minuten/Fall mit Workflow eintragen.
- internen Stundenwert eintragen.
- `Ergebnis erzeugen`.

Der Report entsteht automatisch und zeigt vorne nur:

- **Funktioniert es?**
- **Spart es Zeit?**
- **Ist es sicher?**
- **WEITER / VERBESSERN / STOPPEN**

### 7. Abschluss

- Kundenreport senden.
- In Stripe die **570-€-Restrechnung** senden.
- Zahlungseingang bestätigen.
- vereinbarte Löschung/Retention dokumentieren.

Wenn Ergebnis = `WEITER`:

- Standardangebot für denselben bewiesenen Workflow: **750 €/Monat**.
- Bei Annahme Checkbox `Standardbetrieb 750 €/Monat` aktivieren.
- Die Console legt den wiederkehrenden Operations-Workspace an.

## Die drei einzigen Eskalationen

### Datenschutz-Ausnahme

Personenbezogene/pseudonymisierte Daten ohne vollständige dokumentierte Gates, besondere Kategorien oder unklare Rechts-/Processor-Fragen.

**→ STOPP. Privacy/Owner entscheidet.**

### Technikfehler

Console/Runtime/API funktioniert nicht, unerwarteter interner Fehler oder Safety Gate rot.

**→ STOPP. Engineering entscheidet.**

### Kommerzielle Ausnahme

anderer Preis, anderer Scope, mehrere Workflows, neue Produktionsrechte oder Sondervertrag.

**→ STOPP. Sales/Founder entscheidet.**

## Definition „Assistant-ready“

Ein Standardkunde darf vom Zahlungseingang bis zum Closeout ohne Founder-Eingriff laufen.

Der Founder ist **nicht** Teil des Standard-Workflows. Er wird nur über die drei Eskalationspfade hinzugezogen.
