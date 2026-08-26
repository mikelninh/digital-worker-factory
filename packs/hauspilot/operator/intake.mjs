export function detectCsvDelimiter(text='') {
  const firstLine=String(text).replace(/^\uFEFF/,'').split(/\r?\n/).find(x=>x.trim()!=='')||'';
  let commas=0,semicolons=0,quoted=false;
  for(let i=0;i<firstLine.length;i++){
    const ch=firstLine[i];
    if(ch==='"'){
      if(quoted&&firstLine[i+1]==='"')i++;
      else quoted=!quoted;
    } else if(!quoted&&ch===',') commas++;
    else if(!quoted&&ch===';') semicolons++;
  }
  return semicolons>commas?';':',';
}

export function parseCsv(text='') {
  text=String(text).replace(/^\uFEFF/,'');
  const delimiter=detectCsvDelimiter(text);
  const rows=[]; let row=[], cell='', quoted=false;
  const pushCell=()=>{row.push(cell);cell=''}; const pushRow=()=>{if(row.some(x=>String(x).trim()!==''))rows.push(row);row=[]};
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted && text[i+1]==='"'){cell+='"';i++;} else quoted=!quoted;
    } else if(ch===delimiter && !quoted){pushCell();}
    else if((ch==='\n'||ch==='\r') && !quoted){if(ch==='\r'&&text[i+1]==='\n')i++;pushCell();pushRow();}
    else cell+=ch;
  }
  if(quoted)throw new Error('CSV enthält nicht geschlossene Anführungszeichen.');
  pushCell();pushRow();
  if(!rows.length)return [];
  const headers=rows[0].map(h=>String(h).replace(/^\uFEFF/,'').trim());
  if(headers.some(h=>!h))throw new Error('CSV enthält eine leere Spaltenüberschrift.');
  if(new Set(headers).size!==headers.length)throw new Error('CSV enthält doppelte Spaltenüberschriften.');
  return rows.slice(1).map(values=>Object.fromEntries(headers.map((h,i)=>[h,String(values[i]??'').trim()])));
}

export function propertiesFromCsv(text='') {
  return parseCsv(text).filter(r=>r.property_id||r.address||r.unit).map(r=>({
    property_id:r.property_id||null,
    address:r.address||'',
    unit:r.unit||'',
    aliases:String(r.aliases||'').split('|').map(x=>x.trim()).filter(Boolean)
  }));
}

export function validateProperties(properties=[]) {
  if(!Array.isArray(properties)||!properties.length)throw new Error('Stammdatenliste enthält keine Einträge.');
  const ids=new Set();
  for(let i=0;i<properties.length;i++){
    const p=properties[i]||{};
    if(!String(p.property_id||'').trim())throw new Error(`Stammdaten Zeile ${i+1}: property_id fehlt.`);
    if(ids.has(p.property_id))throw new Error(`Stammdaten: property_id doppelt (${p.property_id}).`);
    ids.add(p.property_id);
    if(!String(p.address||'').trim())throw new Error(`Stammdaten ${p.property_id}: address fehlt.`);
    if(!String(p.unit||'').trim())throw new Error(`Stammdaten ${p.property_id}: unit fehlt.`);
  }
  return properties;
}

const first=(row,names)=>{for(const n of names){if(row[n]!=null && String(row[n]).trim()!=='')return String(row[n]).trim();}return '';};
const num=v=>{const raw=String(v??'').trim();if(raw==='')return null;const normalised=raw.includes(',')&&!raw.includes('.')?raw.replace(',','.'):raw.replace(/\s/g,'');const n=Number(normalised);return Number.isFinite(n)?n:null;};

export function casesFromCsv(template, text='', properties=[]) {
  const rows=parseCsv(text);
  return rows.map((r,i)=>{
    const id=first(r,['case_id','id'])||`case-${String(i+1).padStart(3,'0')}`;
    const gold={};
    const expected=first(r,['expected_classification','classification']); if(expected)gold.classification=expected;
    const expectedProperty=first(r,['expected_property_id']); if(expectedProperty)gold.property_id=expectedProperty;
    const expectedUrgency=first(r,['expected_urgency','urgency']); if(expectedUrgency)gold.urgency=expectedUrgency;
    const base={id,template,context:{properties}};
    if(Object.keys(gold).length)base.gold=gold;

    if(template==='repair_intake'||template==='tenant_inbox'){
      const message=first(r,['message','text','case_text','body']);
      if(!message)throw new Error(`${id}: message/text fehlt.`);
      base.message=message;
      return base;
    }

    if(template==='invoice_review'){
      const invoiceNumber=first(r,['invoice_number','rechnung_nr','invoice']);
      const vendor=first(r,['vendor','supplier','lieferant']);
      const amount=num(first(r,['amount_eur','amount','betrag']));
      const propertyReference=first(r,['property_reference','property_id','object_id']);
      if(!invoiceNumber&&!vendor&&amount==null&&!propertyReference)throw new Error(`${id}: Rechnungsdaten fehlen.`);
      base.invoice={invoice_number:invoiceNumber||null,amount_eur:amount,vendor:vendor||null,property_reference:propertyReference||null};
      const poAmount=num(first(r,['po_amount_eur','purchase_order_amount_eur']));
      const poVendor=first(r,['po_vendor','purchase_order_vendor']);
      if(poAmount!=null||poVendor)base.context.purchase_order={amount_eur:poAmount,vendor:poVendor||null,property_reference:propertyReference||null};
      const previous=first(r,['duplicate_of_invoice_number','previous_invoice_number']);
      if(previous)base.context.invoice_history=[{invoice_number:previous,amount_eur:amount,vendor:vendor||null}];
      return base;
    }
    throw new Error(`unknown template: ${template}`);
  });
}

export function normaliseCasesInput({template,fileName='',text='',properties=[]}) {
  const lower=String(fileName).toLowerCase();
  if(lower.endsWith('.csv')) return {synthetic:false,cases:casesFromCsv(template,text,properties)};
  if(lower && !lower.endsWith('.json'))throw new Error('Beispiele bitte als .csv oder .json bereitstellen. XLSX zuerst als CSV exportieren.');
  const parsed=JSON.parse(String(text).replace(/^\uFEFF/,''));
  const cases=Array.isArray(parsed)?parsed:parsed.cases;
  if(!Array.isArray(cases))throw new Error('JSON muss ein Array oder {cases:[...]} enthalten.');
  return {synthetic:Boolean(parsed.synthetic),cases:cases.map((c,i)=>({
    ...c,
    id:c.id||c.case_id||`case-${String(i+1).padStart(3,'0')}`,
    template:c.template||template,
    context:{...(c.context||{}),properties:(c.context?.properties?.length?c.context.properties:properties)}
  }))};
}
