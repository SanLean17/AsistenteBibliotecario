import { LOCAL_SCOPE } from './domain.js?v=20261005-8';

const FT='\x1e', RT='\x1d', SD='\x1f';
const trim=value=>String(value??'').replace(/[\s\/:;,]+$/g,'').trim();

function decodeBytes(bytes){
  const utf8=new TextDecoder('utf-8',{fatal:false}).decode(bytes);
  const bad=(utf8.match(/�/g)||[]).length;
  if(!bad)return utf8;
  try{
    const latin=new TextDecoder('windows-1252').decode(bytes);
    return (latin.match(/�/g)||[]).length<bad?latin:utf8;
  }catch{return utf8;}
}
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
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  const records=[];let offset=0;
  while(offset<bytes.length){
    const next=bytes.indexOf(0x1d,offset);
    if(next<0)break;
    const raw=bytes.slice(offset,next+1);offset=next+1;
    if(raw.length<25)continue;
    const text=decodeBytes(raw);
    const leader=text.slice(0,24);
    const recordLength=Number(leader.slice(0,5));
    const baseAddress=Number(leader.slice(12,17));
    if(!Number.isInteger(baseAddress)||baseAddress<25||baseAddress>text.length)continue;
    const directory=text.slice(24,baseAddress-1);
    const fields=[];
    for(let i=0;i+11<directory.length;i+=12){
      const entry=directory.slice(i,i+12),tag=entry.slice(0,3),length=Number(entry.slice(3,7)),start=Number(entry.slice(7,12));
      if(!/^\d{3}$/.test(tag)||!Number.isFinite(length)||!Number.isFinite(start))continue;
      const fieldText=text.slice(baseAddress+start,baseAddress+start+Math.max(0,length-1));
      fields.push(parseMarcField(tag,fieldText.replace(new RegExp(FT+'$'),'')));
    }
    records.push({leader,recordLength:Number.isFinite(recordLength)?recordLength:raw.length,fields});
  }
  return records;
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
  const holdings=fields(record,'859').map((f,index)=>{
    const inventoryCode=sub(f,'a')[0]||'';
    const location=sub(f,'l')[0]||'';
    return {...LOCAL_SCOPE,
      id:crypto.randomUUID(),inventoryCode,
      part:sub(f,'b')[0]||'',volume:sub(f,'c')[0]||'',
      loanPolicy:sub(f,'d')[0]||'',provenance:[sub(f,'e')[0],sub(f,'f')[0]].filter(Boolean).join(' · '),
      localNotes:sub(f,'g')[0]||'',condition:normalizeCondition(sub(f,'h')[0]),
      location,classification:sub(f,'m')[0]||'',shelfmark:sub(f,'n')[0]||'',
      status:'available',sourceIndex:index
    };
  });
  const copies=Math.max(1,holdings.length);
  const exemplars=holdings.length?holdings:Array.from({length:copies},()=>({...LOCAL_SCOPE,id:crypto.randomUUID(),inventoryCode:'',location:'',condition:'Bueno',status:'available'}));
  return {
    id:crypto.randomUUID(),workId:crypto.randomUUID(),editionId:crypto.randomUUID(),
    title,subtitle,author:authors.join('; '),authors,isbn:isbnRaw,category:'Otros',publisher,
    publishedDate,year:yearFrom(publishedDate),pages:pagesFrom(extent),language:firstSub(record,'041','a'),
    subjects,sourceSubjects:[...subjects],contents,description:firstSub(record,'520','a'),audience:firstSub(record,'521','a'),
    edition:firstSub(record,'250','a'),classification,identifiers:{marc001:fields(record,'001')[0]?.value||''},
    copies,location:exemplars[0]?.location||'',condition:exemplars[0]?.condition||'Bueno',exemplars,
    sources:[source],fieldSources:{title:source,authors:source,publisher:source,subjects:source,contents:contents.length?source:''},
    sourceRecords:[{source,format:'MARC21/ISO2709',leader:record.leader,institution}],
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
