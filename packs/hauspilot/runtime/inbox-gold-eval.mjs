import { classifyInboxMessage } from './inbox-taxonomy.mjs';

const groups={
  service_charge_question:{route:'billing',samples:['Wann kommt die Nebenkostenabrechnung?','Ich habe eine Frage zu den Betriebskosten.','Die Abrechnung für 2025 fehlt noch.','Bitte erklären Sie die Betriebskostenpositionen.','Service charge statement is missing.','Wann erhalte ich die NK Abrechnung?','Frage zur Nebenkosten-Abrechnung.','Die Betriebskosten wirken ungewöhnlich hoch.','Können Sie mir die Abrechnung erläutern?','Utility bill / service charge question.']},
  rent_question:{route:'rent',samples:['Frage zu meiner Miete.','Wie setzt sich die Miethöhe zusammen?','Ich habe eine Frage zur Indexmiete.','Was bedeutet die Staffelmiete?','My rent amount seems different.','Bitte prüfen Sie meine Miete.','Warum hat sich die Miete geändert?','Frage zur Miet Höhe.','Ich brauche Auskunft zur Miethöhe.','Rent question for my flat.']},
  document_request:{route:'documents',samples:['Bitte senden Sie mir eine Mietbescheinigung.','Ich brauche eine Kopie des Protokolls.','Können Sie den Energieausweis schicken?','Bitte um ein Dokument aus der Hausakte.','I need a copy of the certificate.','Wo finde ich die Bescheinigung?','Bitte senden Sie mir eine Kopie.','Ich benötige das letzte Protokoll.','Document request: Energieausweis.','Könnten Sie mir die Mietbescheinigung zusenden?']},
  access_key_request:{route:'access',samples:['Ich brauche einen neuen Schlüssel.','Mein Transponder funktioniert nicht.','Bitte Ersatz für den Haustürschlüssel.','Der Chip für den Zugang ist defekt.','I need a replacement key.','Mein Schluessel ist verloren gegangen.','Wie bekomme ich einen neuen Transponder?','Zugangschip bitte ersetzen.','Key replacement request.','Der Haustür-Schlüssel ist abgebrochen.']},
  appointment_request:{route:'scheduling',samples:['Ich brauche einen Termin.','Wann können Sie zur Besichtigung kommen?','Bitte nennen Sie ein Zeitfenster.','Können wir einen Termin vereinbaren?','I need an appointment.','Wann kann jemand kommen?','Bitte Termin für nächste Woche.','Ich möchte eine Besichtigung vereinbaren.','Schedule a visit please.','Welches Zeitfenster wäre möglich?']},
  complaint:{route:'complaints',samples:['Die Nachbarn sind nachts sehr laut.','Beschwerde wegen Lärm.','Im Hof liegt ständig Müll.','Starker Geruch im Treppenhaus.','Noise complaint from the neighbour.','Seit Tagen ist es extrem laut.','Ich möchte mich über den Nachbarn beschweren.','Laerm jede Nacht bis 3 Uhr.','Complaint: Müll im Hausflur.','Es gibt dauernd störenden Lärm.']},
  repair_request:{route:'maintenance',samples:['Die Heizung ist kaputt.','Unter dem Waschbecken ist ein Wasserleck.','Mehrere Steckdosen haben keinen Strom.','Im Schlafzimmer ist Schimmel.','The elevator is broken.','Warmwasser funktioniert nicht.','Das Fenster lässt sich nicht schließen.','Die Sicherung fliegt ständig raus.','Bitte Reparatur der Haustür.','Heizung kalt seit heute Morgen.']},
  contract_question:{route:'contracts',samples:['Wie kann ich meinen Mietvertrag kündigen?','Frage zur Kündigungsfrist.','Was steht im Vertrag zur Kündigung?','Ich brauche Auskunft zu einem Vertragsnachtrag.','How can I terminate the contract?','Welche Frist gilt für die Kündigung?','Frage zu meinem Mietvertrag.','Bitte erklären Sie den Nachtrag zum Vertrag.','Termination notice question.','Wann endet mein Vertrag nach Kündigung?']}
};

const cases=[];
for(const [classification,g] of Object.entries(groups)) for(const [i,message] of g.samples.entries()) cases.push({id:`${classification}-${i+1}`,message,expected:{classification,route:g.route}});
for(let i=1;i<=10;i++) cases.push({id:`ambiguous-${i}`,message:i%2?`Die Heizung ist kaputt und ich habe außerdem eine Frage zur Nebenkostenabrechnung ${i}.`:`Ich möchte kündigen und brauche zugleich einen Termin ${i}.`,expected:{classification:'ambiguous_request',route:'manual_triage'}});
const general=['Danke für Ihre Nachricht.','Können Sie mich bitte zurückrufen?','Ich hätte eine allgemeine Frage.','Bitte melden Sie sich bei Gelegenheit.','Hello, I have a general question.'];
for(const [i,message] of general.entries()) cases.push({id:`general-${i+1}`,message,expected:{classification:'general_question',route:'general'}});
const unknown=['','?','Hi','..','  '];
for(const [i,message] of unknown.entries()) cases.push({id:`unknown-${i+1}`,message,expected:{classification:'unknown_request',route:'manual_triage'}});

let passed=0;const failures=[];const confusion={};
for(const c of cases){
  const r=classifyInboxMessage(c.message);
  const ok=r.classification===c.expected.classification&&r.route===c.expected.route;
  if(ok) passed++; else failures.push({id:c.id,message:c.message,expected:c.expected,actual:r});
  const k=`${c.expected.classification} -> ${r.classification}`;confusion[k]=(confusion[k]||0)+1;
}
const accuracy=passed/cases.length*100;
const result={suite:'HausPilot tenant inbox gold set',cases:cases.length,passed,failures:failures.length,accuracy_percent:Number(accuracy.toFixed(1)),ambiguous_cases:10,unknown_cases:5,confusion,failure_samples:failures};
console.log(JSON.stringify(result,null,2));
if(cases.length!==100||accuracy<90||failures.length) process.exit(1);
