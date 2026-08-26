export function parseCsv(text='') {
  const rows=[]; let row=[], cell='', quoted=false;
  const pushCell=()=>{row.push(cell);cell=''}; const pushRow=()=>{if(row.some(x=>String(x).trim()!==''))rows.push(row);row=[]};
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted && text[i+1]==='"'){cell+='"';i++;} else quoted=!quoted;
    } else if(ch===',' && !quoted){pushCell();}
    else if((ch==='\n'||ch==='\r') && !quoted){if(ch==='\r'&&text[i+1]==='\n')i++;pushCell();pushRow();}
    else cell+=ch;
  }
  pushCell();pushRow();
  if(!rows.length)return [];
  const headers=rows[0].map(h=>String(h).trim());
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

const first=(row,names)=>{for(const n of names){if(row[n]!=null && String(row[n]).trim()!=='')return String(row[n]).trim();}return '';};
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null;};

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
      if(!message)throw new Error(`${id}: missing message/text column`);
      base.message=message;
      return base;
    }

    if(template==='invoice_review'){
      const invoiceNumber=first(r,['invoice_number','rechnung_nr','invoice']);
      const vendor=first(r,['vendor','supplier','lieferant']);
      const amount=num(first(r,['amount_eur','amount','betrag']));
      const propertyReference=first(r,['property_reference','property_id','object_id']);
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
  const parsed=JSON.parse(text);
  const cases=Array.isArray(parsed)?parsed:parsed.cases;
  if(!Array.isArray(cases))throw new Error('JSON must be an array or {cases:[...]}');
  return {synthetic:Boolean(parsed.synthetic),cases:cases.map((c,i)=>({
    ...c,
    id:c.id||c.case_id||`case-${String(i+1).padStart(3,'0')}`,
    template:c.template||template,
    context:{...(c.context||{}),properties:(c.context?.properties?.length?c.context.properties:properties)}
  }))};
}
