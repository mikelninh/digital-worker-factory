import { normaliseGerman } from './entity-resolution.mjs';

const RULES=[
  {classification:'repair_request',route:'maintenance',rx:/heizung|warmwasser|leck|wasser|strom|sicherung|schimmel|aufzug|elevator|\bfenster\b|reparatur|kaputt|broken/},
  {classification:'contract_question',route:'contracts',rx:/\b(?:kuendig\w*|kundig\w*|mietvertrag|vertrag\w*|frist|nachtrag\w*|vertragsnachtrag\w*|termination|terminate|notice)\b/},
  {classification:'service_charge_question',route:'billing',rx:/betriebskosten|nebenkosten|abrechnung|service charge|utility bill/},
  {classification:'rent_question',route:'rent',rx:/miethoehe|miet hoehe|miete|mieterhoeh|rent|indexmiete|staffelmiete/},
  {classification:'document_request',route:'documents',rx:/bescheinigung|dokument|kopie|protokoll|energieausweis|mietbescheinigung|document|certificate/},
  {classification:'access_key_request',route:'access',rx:/schluessel|schlussel|transponder|chip|zugang|\bkey\b|access card/},
  {classification:'appointment_request',route:'scheduling',rx:/\btermin(?:e|s)?\b|besichtigung|zeitfenster|wann\s+(?:kann|koennen).*kommen|\bappointment\b|\bschedule\b/},
  {classification:'complaint',route:'complaints',rx:/laerm|larm|laut|beschwerde|nachbar|geruch|muell|mull|noise|complaint/}
];

export const INBOX_TAXONOMY=[
  'service_charge_question','rent_question','document_request','access_key_request','appointment_request','complaint','repair_request','contract_question','ambiguous_request','general_question','unknown_request'
];

export function classifyInboxMessage(message=''){
  const text=normaliseGerman(message);
  if(!text||text.length<3) return {classification:'unknown_request',route:'manual_triage',confidence:0.2,signals:[],multi_intent:false};
  const hits=RULES.filter(r=>r.rx.test(text));
  if(hits.length===0) return {classification:'general_question',route:'general',confidence:0.68,signals:[],multi_intent:false};
  const unique=[...new Map(hits.map(h=>[h.classification,h])).values()];
  if(unique.length>1){
    return {classification:'ambiguous_request',route:'manual_triage',confidence:0.58,signals:unique.map(x=>x.classification),multi_intent:true};
  }
  return {classification:unique[0].classification,route:unique[0].route,confidence:0.93,signals:[unique[0].classification],multi_intent:false};
}
