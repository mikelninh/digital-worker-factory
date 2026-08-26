import { resolveProperty } from './entity-resolution.mjs';

const cases=[];
for(let i=1;i<=20;i++){
  const p={property_id:`EX-${i}`,address:`Weserstraße ${10+i}, Berlin`,unit:`WE ${i}`};
  cases.push({id:`exact-${i}`,expected_status:'exact',expected_property_id:p.property_id,input:{text:`Meldung zu ${p.address}, ${p.unit}.`,properties:[p]}});
}
for(let i=1;i<=20;i++){
  const p={property_id:`AL-${i}`,address:`Kantstraße ${30+i}, Berlin`,unit:`WE ${i}`,aliases:[`Kantstr. ${30+i} Whg. ${i}`,`Kantstrasse ${30+i} Wohnung ${i}`]};
  cases.push({id:`alias-${i}`,expected_status:'alias',expected_property_id:p.property_id,input:{text:`Hallo, es geht um Kantstr. ${30+i}, Whg. ${i}.`,properties:[p]}});
}
for(let i=1;i<=10;i++){
  const address=`Lindenstraße ${50+i}, Berlin`;
  const p1={property_id:`AM-${i}-1`,address,unit:'WE 1'};
  const p2={property_id:`AM-${i}-2`,address,unit:'WE 2'};
  cases.push({id:`ambiguous-${i}`,expected_status:'ambiguous',expected_property_id:null,input:{text:`Frage zum Objekt ${address}.`,properties:[p1,p2]}});
}
for(let i=1;i<=10;i++){
  const p={property_id:`UN-${i}`,address:`Torstraße ${70+i}, Berlin`,unit:'WE 1'};
  cases.push({id:`unresolved-${i}`,expected_status:'unresolved',expected_property_id:null,input:{text:`Ich wohne irgendwo in Neukölln und kenne die Adresse gerade nicht.`,properties:[p]}});
}

let correctResolved=0,actualResolved=0,expectedResolved=0,statusCorrect=0,propertyCorrect=0;
const failures=[];
for(const c of cases){
  const r=resolveProperty(c.input);
  const expectedIsResolved=['exact','alias'].includes(c.expected_status);
  const actualIsResolved=['exact','alias'].includes(r.status);
  if(expectedIsResolved) expectedResolved++;
  if(actualIsResolved) actualResolved++;
  if(expectedIsResolved&&actualIsResolved&&r.property_id===c.expected_property_id) correctResolved++;
  if(r.status===c.expected_status) statusCorrect++;
  if(r.property_id===c.expected_property_id) propertyCorrect++;
  if(r.status!==c.expected_status||r.property_id!==c.expected_property_id) failures.push({id:c.id,expected_status:c.expected_status,expected_property_id:c.expected_property_id,actual:r});
}
const precision=actualResolved?correctResolved/actualResolved:0;
const recall=expectedResolved?correctResolved/expectedResolved:0;
const result={
  suite:'HausPilot entity resolution benchmark',cases:cases.length,
  expected_resolved:expectedResolved,actual_resolved:actualResolved,correct_resolved:correctResolved,
  precision:Number((precision*100).toFixed(1)),recall:Number((recall*100).toFixed(1)),
  status_accuracy:Number((statusCorrect/cases.length*100).toFixed(1)),property_accuracy:Number((propertyCorrect/cases.length*100).toFixed(1)),
  failures:failures.length
};
console.log(JSON.stringify(result,null,2));
if(precision<0.98||recall<0.98||statusCorrect/cases.length<0.98||failures.length) process.exit(1);
