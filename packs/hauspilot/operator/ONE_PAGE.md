# One Simple Flow — Operations Assistant

## Deine ganze Aufgabe

> Schau, was als Nächstes zu tun ist. Wenn alles grün ist, weiter. Wenn etwas rot ist, nicht improvisieren — eskalieren.

## Die vier Schritte

1. **Kunde gibt**
   - 20–50 Beispiele
   - eine einfache Stammdatenliste
   - eine prüfende Person

2. **Operations startet**
   - Die Bedienoberfläche zeigt `STARTEN`, `ANFORDERN`, `WARTEN` oder `STOPP`.
   - Kein Prompting und keine technischen Entscheidungen als tägliche Aufgabe.

3. **Reviewer entscheidet**
   - `Richtig`
   - `Ändern`
   - `Falsch`

4. **Ergebnis**
   - funktioniert es?
   - spart es Zeit?
   - gab es kritische Aktionen?
   - Entscheidung: `Weiter`, `Verbessern` oder `Stoppen`.

## Wenn der Kunde weitermacht

Kein neues Projekt und keine zweite Bedienwelt. Derselbe Ablauf wiederholt sich:

`Neue Fälle → Starten → nur Ausnahmen prüfen → Ergebnis`

## Was du NICHT entscheiden musst

- Datenschutz-/Rechtsfragen
- Zahlungen oder Bankdatenänderungen
- rechtliche/vertragliche Entscheidungen
- neue Produktionsrechte
- Safety-Regeln lockern
- Preise oder kommerzielle Sonderfälle

Das System soll diese Situationen blockieren und die richtige Eskalation anzeigen.

## Stand heute

Die **Bedienlogik** ist bereits auf diesen einfachen Ablauf reduziert. Der echte Modelllauf wird für den ersten bezahlten Pilot aber noch von einem **internen technischen Operator** über `run-pilot.mjs` gestartet.

Das ist absichtlich transparent:

- Die sichtbare `Starten`-Oberfläche ist derzeit eine Demo des Zielablaufs.
- Kunde und fachlicher Reviewer brauchen trotzdem kein Terminal, JSON oder API-Wissen.
- Für den ersten Kunden übernimmt der technische Operator diesen einen internen Schritt.
- Erst nach dem ersten bezahlten Proof lohnt es sich, diesen Runner an den `Starten`-Button zu hängen.

Wir nennen den Ablauf daher noch **nicht vollautomatisch oder self-service**.

## Erfolgsdefinition

Eine neue Operations-Assistenz muss nach wenigen Minuten verstehen:

> **Was ist mein nächster Klick?**

Wenn sie dafür technische Dokumentation lesen muss, ist das Interface noch zu kompliziert.
