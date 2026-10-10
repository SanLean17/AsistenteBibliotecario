import { LOCAL_SCOPE } from './domain.js?v=20261010-3';

const FT='\x1e', RT='\x1d', SD='\x1f';
const trim=value=>String(value??'').replace(/[\s\/:;,]+$/g,'').trim();

function decodeBytes(bytes){try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('Codificación MARC no compatible. Exportá en UTF-8; MARC-8 requiere conversión explícita.');}}
export function parseMarcField(tag,text){
  if(Number(tag)<10)return {tag,value:trim(text)};
  const indicators=(text.slice(0,2)+'  ').slice(0,2);
  const body=text.slice(2);
  const subfields=[];
  for(const piece of body.split(SD)){
    if(!piece)continue;
    subfields.push({code:piece[0],value:trim(piece.slice(1))});
  }
  return {tag,ind1:indicators[0],ind2:indicators[1],subfields};
}
export function parseISO2709(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input),records=[];let offset=0;
 while(offset<bytes.length){if(bytes.length-offset<25)throw new Error('Registro MARC truncado.');const leader=decodeBytes(bytes.slice(offset,offset+24)),length=Number(leader.slice(0,5)),base=Number(leader.slice(12,17));if(!Number.isInteger(length)||length<25||offset+length>bytes.length||!Number.isInteger(base)||base<25||base>=length||(base-25)%12||bytes[offset+base-1]!==30||bytes[offset+length-1]!==29)throw new Error('Directorio o longitud ISO 2709 inválidos.');const fields=[];for(let i=offset+24;i<offset+base-1;i+=12){const entry=decodeBytes(bytes.slice(i,i+12)),tag=entry.slice(0,3),size=Number(entry.slice(3,7)),start=Number(entry.slice(7,12)),begin=offset+base+start,end=begin+size-1;if(!/^\d{3}$/.test(tag)||!Number.isInteger(size)||size<1||!Number.isInteger(start)||start<0||end>=offset+length-1||bytes[end]!==30)throw new Error('Campo ISO 2709 inválido.');fields.push(parseMarcField(tag,decodeBytes(bytes.slice(begin,end))));}records.push({leader,recordLength:length,fields});offset+=length;
 }return records;
}
const fields=(record,tag)=>record.fields.filter(f=>f.tag===tag);
const sub=(field,code)=>field?.subfields?.filter(s=>s.code===code).map(s=>s.value).filter(Boolean)||[];
const firstSub=(record,tag,code)=>sub(fields(record,tag)[0],code)[0]||'';
const allSub=(record,tags,code)=>tags.flatMap(tag=>fields(record,tag).flatMap(f=>sub(f,code))).filter(Boolean);
const yearFrom=value=>String(value||'').match(/(?:18|19|20)\d{2}/)?.[0]||'';
const pagesFrom=value=>Number(String(value||'').match(/\d+/)?.[0])||null;
function normalizeCondition(value){
  const v=String(value||'').trim().toLowerCase();
  if(!v)return 'Bueno';
  if(['b','bueno','good'].includes(v))return 'Bueno';
  if(['m','malo','deteriorado','bad'].includes(v))return 'Deteriorado';
  if(v.includes('regular'))return 'Regular';
  if(v.includes('nuevo'))return 'Nuevo';
  return 'Bueno';
}
function marcMaterialType(record){const type=record.leader?.[6]||'',level=record.leader?.[7]||'';if(type==='m')return 'digital';if(level==='s'||level==='i')return 'revista';return 'libro';}
export function marcRecordToCatalog(record,{source='Aguapey · MARC ISO 2709'}={}){
  const titleField=fields(record,'245')[0];
  const title=trim(firstSub(record,'245','a'));
  if(!title)return null;
  const subtitle=trim(firstSub(record,'245','b'));
  const mainAuthor=trim(firstSub(record,'100','a')||firstSub(record,'110','a'));
  const addedAuthors=[...allSub(record,['700','710'],'a')];
  const authors=[...new Set([mainAuthor,...addedAuthors].filter(Boolean))];
  const isbnRaw=firstSub(record,'020','a').match(/[0-9Xx-]{10,20}/)?.[0]||'';
  const publisherField=fields(record,'264')[0]||fields(record,'260')[0];
  const publisher=trim(sub(publisherField,'b')[0]||'');
  const publishedDate=trim(sub(publisherField,'c')[0]||'');
  const extent=firstSub(record,'300','a');
  const subjects=[...new Set([...allSub(record,['650','653','659'],'a'),...allSub(record,['600','651'],'a')])];
  const contents=fields(record,'505').flatMap(f=>sub(f,'t')).filter(Boolean);
  const classification=[...new Set([...allSub(record,['080','082'],'a'),...allSub(record,['859'],'m')])];
  const institutionField=fields(record,'852')[0];
  const institution={
    province:firstSub(record,'852','n'),
    locality:firstSub(record,'852','z'),
    name:firstSub(record,'852','a')
  };
  let holdings=fields(record,'859').map((f,index)=>{
    const inventoryCode=sub(f,'a')[0]||'';
    const location=sub(f,'l')[0]||'';
    return {...LOCAL_SCOPE,
      id:crypto.randomUUID(),inventoryCode,
      part:sub(f,'b')[0]||'',volume:sub(f,'c')[0]||'',
      loanPolicy:sub(f,'d')[0]||'',provenance:[sub(f,'e')[0],sub(f,'f')[0]].filter(Boolean).join(' · '),
      localNotes:sub(f,'g')[0]||'',condition:normalizeCondition(sub(f,'h')[0]),
      location,classification:sub(f,'m')[0]||'',shelfmark:sub(f,'n')[0]||'',
      status:/extraviado|perdido/i.test(sub(f,'h')[0]||'')?'lost':/baja/i.test(sub(f,'h')[0]||'')?'withdrawn':'available',sourceIndex:index
    };
  });
  if(!holdings.length)holdings=fields(record,'852').filter(f=>sub(f,'p').length||sub(f,'c').length).map(f=>({...LOCAL_SCOPE,id:crypto.randomUUID(),inventoryCode:sub(f,'p')[0]||'',location:sub(f,'c')[0]||'',physicalLocation:{sector:sub(f,'b')[0]||'',shelving:sub(f,'c')[0]||'',shelf:''},classification:sub(f,'h')[0]||'',shelfmark:sub(f,'i')[0]||'',condition:'Bueno',status:'available'}));
  const copies=holdings.length;
  const exemplars=holdings.length?holdings:Array.from({length:copies},()=>({...LOCAL_SCOPE,id:crypto.randomUUID(),inventoryCode:'',location:'',condition:'Bueno',status:'available'}));
  return {
    id:crypto.randomUUID(),workId:crypto.randomUUID(),editionId:crypto.randomUUID(),materialType:marcMaterialType(record),
    title,subtitle,author:authors.join('; '),authors,isbn:isbnRaw,category:'Otros',publisher,
    publishedDate,year:yearFrom(publishedDate),pages:pagesFrom(extent),language:firstSub(record,'041','a'),
    subjects,sourceSubjects:[...subjects],contents,description:firstSub(record,'520','a'),audience:firstSub(record,'521','a'),
    edition:firstSub(record,'250','a'),classification,identifiers:{marc001:fields(record,'001')[0]?.value||''},
    copies,location:exemplars[0]?.location||'',condition:exemplars[0]?.condition||'Bueno',exemplars,
    sources:[source],fieldSources:{title:source,authors:source,publisher:source,subjects:source,contents:contents.length?source:''},
    sourceRecords:[{source,format:'MARC21/ISO2709',leader:record.leader,institution,fields:record.fields}],
    importedFrom:{system:'Aguapey-compatible',format:'MARC21/ISO2709',institution},
    createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),schemaVersion:2,
    enrichment:{version:1,status:'not-requested',attachments:[],suggestions:[]}
  };
}
export function importAguapeyISO(input){
  const records=parseISO2709(input);
  const books=records.map(r=>marcRecordToCatalog(r)).filter(Boolean);
  return {records:records.length,books,skipped:records.length-books.length};
}
