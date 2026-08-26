# One Simple Flow — Operations Assistant

## Deine ganze Aufgabe

> Schau, was als Nächstes zu tun ist. Wenn alles grün ist, weiter. Wenn etwas rot ist, nicht improvisieren — eskalieren.

## Dein Werkzeug

Auf dem vorbereiteten Operations-Rechner doppelklicken:

**`start-hauspilot-ops.cmd`**

Danach arbeitest du nur in der Browser-Console.

Kein Terminal, kein GitHub, kein JSON-Editieren und kein Prompt Engineering im Tagesgeschäft.

## Der Standardkunde

1. **Zahlung prüfen**
   - 1.330 € Anzahlung in Stripe eingegangen
   - Kunde in der Console anlegen

2. **Kunde gibt genau drei Dinge**
   - 20–50 Beispiele
   - eine einfache Stammdatenliste
   - eine prüfende Person

3. **Operations prüft und startet**
   - Console zeigt nur `STARTEN`, `ANFORDERN`, `WARTEN` oder `STOPP`.
   - Bei `STARTEN` klickst du einmal.
   - Preflight, Privacy Manifest, Konfiguration, Modelllauf und Safety Boundary laufen im Hintergrund.

4. **Reviewer entscheidet**
   - Review-Datei aus der Console herunterladen und sicher senden.
   - Reviewer wählt pro Fall nur:
     - `Richtig`
     - `Ändern`
     - `Falsch`
   - zurückgesendete Review-Datei in der Console einlesen.

5. **Ergebnis**
   - Fälle/Monat + Zeit vorher/nachher eintragen
   - Console erzeugt automatisch den Report
   - sichtbar sind nur:
     - funktioniert es?
     - spart es Zeit?
     - ist es sicher?
     - `Weiter`, `Verbessern` oder `Stoppen`

6. **Abschluss**
   - Report senden
   - 570-€-Restrechnung in Stripe senden
   - Zahlung prüfen
   - Retention/Löschung dokumentieren
   - bei `Weiter`: Standardbetrieb 750 €/Monat für denselben Workflow anbieten

## Wenn der Kunde weitermacht

Kein neues Projekt und keine zweite Bedienwelt:

`Neue Fälle → Starten → nur Ausnahmen prüfen → Ergebnis`

## Du eskalierst nur drei Arten von Fällen

### Datenschutz

Personenbezogene/pseudonymisierte Daten ohne vollständige dokumentierte Gates, besondere Datenkategorien oder unklare Rechts-/Processor-Fragen.

→ **STOPP · Privacy/Owner**

### Technik

Runtime/API/Console defekt oder unerwarteter interner Fehler.

→ **STOPP · Engineering**

### Kommerziell

Sonderpreis, Sonderscope, mehrere Workflows oder neue Produktionsrechte.

→ **STOPP · Sales/Founder**

## Einmaliges Admin-Setup

Vor dem ersten Kunden muss der Operations-Rechner einmal vorbereitet sein: Node.js, lokaler API-Key, Repo und sicherer Datei-Transferkanal. Das ist **kein Schritt pro Kunde**.

## Erfolgsdefinition

Ein normaler bezahlter Kunde läuft vom bestätigten Zahlungseingang bis zum Closeout **ohne Founder-Eingriff**.

> **Was ist mein nächster Klick?**

Wenn du technische Dokumentation brauchst, ist der Standardprozess noch nicht simpel genug.
