const GERMAN_FOLDS = [
  [/ä/g,'ae'],[/ö/g,'oe'],[/ü/g,'ue'],[/ß/g,'ss']
];

export function normaliseGerman(value='') {
  let s=String(value).trim().toLowerCase();
  for(const [rx,to] of GERMAN_FOLDS) s=s.replace(rx,to);
  s=s
    .replace(/str\.(?=\s|$)/g,'strasse')
    .replace(/straße/g,'strasse')
    .replace(/\bstr\b/g,'strasse')
    .replace(/\bwohnung\b|\bwhg\.?\b|\bwe\b/g,'we')
    .replace(/\bvorderhaus\b|\bvh\b/g,'vh')
    .replace(/\bhinterhaus\b|\bhh\b/g,'hh')
    .replace(/\bseitenfluegel\b|\bsf\b/g,'sf')
    .replace(/[^a-z0-9@.+-]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  return s;
}

function includesNormalised(haystack,needle){
  const h=` ${normaliseGerman(haystack)} `;
  const n=normaliseGerman(needle);
  return Boolean(n)&&h.includes(` ${n} `);
}
function addressOnly(p){return normaliseGerman(p.address||'');}
function unitOnly(p){return normaliseGerman(p.unit||'');}
function propertyKeys(p){
  const keys=[{value:`${p.address||''} ${p.unit||''}`,method:'exact'}];
  for(const a of p.aliases||[]) keys.push({value:a,method:'alias'});
  return keys;
}
function senderMatches(p,sender){
  if(!sender) return false;
  const target=normaliseGerman(sender);
  return (p.contacts||[]).some(c=>normaliseGerman(c.email||c)===target);
}

export function resolveProperty({text='',sender_email=null,property_reference=null,properties=[]}={}){
  const hay=normaliseGerman(`${text} ${property_reference||''}`);
  const scored=[];
  for(const p of properties){
    let score=0,method=null,reasons=[];
    if(property_reference&&normaliseGerman(property_reference)===normaliseGerman(p.property_id)){
      score=1;method='exact';reasons.push('property_id');
    }
    for(const k of propertyKeys(p)){
      if(includesNormalised(hay,k.value)&&score<1){
        const candidate=k.method==='exact'?0.99:0.97;
        if(candidate>score){score=candidate;method=k.method;}
        reasons.push(`${k.method}_key`);
      }
    }
    const addr=addressOnly(p),unit=unitOnly(p);
    const addrMatch=addr&&hay.includes(addr);
    const unitMatch=unit&&hay.includes(unit);
    if(addrMatch&&unitMatch&&score<0.96){score=0.96;method='exact';reasons.push('address+unit');}
    else if(addrMatch&&score<0.78){score=0.78;method='address_only';reasons.push('address');}
    if(senderMatches(p,sender_email)&&score<0.93){score=0.93;method='alias';reasons.push('sender_contact');}
    if(score>0) scored.push({property_id:p.property_id,score:Number(score.toFixed(3)),method,reasons:[...new Set(reasons)]});
  }
  scored.sort((a,b)=>b.score-a.score||String(a.property_id).localeCompare(String(b.property_id)));
  if(!scored.length) return {status:'unresolved',property_id:null,confidence:0,candidates:[],reason:'no_candidate'};
  const top=scored[0],second=scored[1];
  const close=second&&Math.abs(top.score-second.score)<0.05;
  if(top.score<0.9||close){
    return {status:'ambiguous',property_id:null,confidence:top.score,candidates:scored.slice(0,5),reason:close?'multiple_close_candidates':'weak_candidate'};
  }
  return {status:top.method==='exact'?'exact':'alias',property_id:top.property_id,confidence:top.score,candidates:scored.slice(0,5),reason:top.reasons.join('+')};
}
