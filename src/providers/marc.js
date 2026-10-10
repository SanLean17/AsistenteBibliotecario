import { canonicalISBN, cleanISBN, validISBN } from '../isbn.js?v=20261010-1';
const clean=value=>String(value??'').trim().replace(/[\s/:;,]+$/,'').trim();
const unique=values=>[...new Set(values.filter(Boolean))];

/** MARCJSON -> edition metadata. Copies/holdings are never imported as local stock. */
export function marcToMetadata(record,{source='Biblioteca Nacional Mariano Moreno',isbn}={}){
 const fields=record.fields||[];
 const all=tag=>fields.filter(f=>Object.hasOwn(f,tag)).map(f=>f[tag]);
 const values=(tag,codes)=>all(tag).flatMap(f=>(f.subfields||[]).flatMap(s=>Object.entries(s).filter(([c])=>codes.includes(c)).map(([,v])=>clean(v))));
 const control=tag=>String(all(tag)[0]||'');
 const identifiers=unique(values('020',['a']).map(v=>cleanISBN(v.match(/^[\dXx\s-]+/)?.[0])).filter(validISBN));
 if(isbn&&!identifiers.some(v=>canonicalISBN(v)===canonicalISBN(isbn)))return null;
 const title=values('245',['a'])[0];if(!title)return null;
 const publication=all('264').filter(f=>f.ind2==='1');
 const pubValues=code=>publication.flatMap(f=>(f.subfields||[]).filter(s=>s[code]).map(s=>clean(s[code])));
 const publishedDate=pubValues('c')[0]||values('260',['c'])[0]||'';
 const authors=unique(['100','110','111','700','710','711'].flatMap(t=>all(t).map(f=>(f.subfields||[]).flatMap(s=>Object.entries(s).filter(([c])=>['a','b'].includes(c)).map(([,v])=>clean(v))).join(' '))));
 const subjects=unique(['600','610','611','630','650','651','655'].flatMap(t=>all(t).map(f=>(f.subfields||[]).flatMap(s=>Object.entries(s).filter(([c])=>['a','b','v','x','y','z'].includes(c)).map(([,v])=>clean(v))).join(' — '))));
 return {title,subtitle:values('245',['b','n','p']).join(' '),authors,edition:values('250',['a','b']).join(' '),publisher:pubValues('b').join('; ')||values('260',['b']).join('; '),publishedDate,year:publishedDate.match(/\d{4}/)?.[0],isbn:identifiers[0]||'',isbns:identifiers,language:values('041',['a'])[0]||control('008').slice(35,38).trim(),pages:Number(values('300',['a'])[0]?.match(/\d+/)?.[0])||null,subjects,classification:unique(['080','082','084'].flatMap(t=>values(t,['a','b']))),contents:values('505',['a','t']),description:values('520',['a','b']).join('\n'),identifiers:{controlNumber:control('001'),agency:control('003'),isbn:identifiers},source};
}

/** UTF-8 ISO2709 records returned by the documented BN target. Byte offsets matter. */
export function parseISO2709(bytes){
 const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),decoder=new TextDecoder('utf-8',{fatal:true}),records=[];
 const decode=(a,b)=>decoder.decode(data.slice(a,b));
 for(let offset=0;offset<data.length;){
  const length=Number(decode(offset,offset+5)),base=Number(decode(offset+12,offset+17));
  if(!Number.isInteger(length)||length<25||offset+length>data.length||base<25||base>=length||(base-25)%12!==0||data[offset+base-1]!==30||data[offset+length-1]!==29)throw new Error('Registro MARC21 inválido.');
  const fields=[];
  for(let dir=offset+24;dir<offset+base-1;dir+=12){
   const tag=decode(dir,dir+3),size=Number(decode(dir+3,dir+7)),start=offset+base+Number(decode(dir+7,dir+12));
   if(!/^\d{3}$/.test(tag)||!Number.isInteger(size)||size<1||start<offset+base||start+size>offset+length||data[start+size-1]!==30)throw new Error('Directorio MARC21 inválido.');
   const value=decode(start,start+size-1);
   if(Number(tag)<10)fields.push({[tag]:value});
   else fields.push({[tag]:{ind1:value[0]||' ',ind2:value[1]||' ',subfields:value.slice(2).split('\x1f').filter(Boolean).map(s=>({[s[0]]:s.slice(1)}))}});
  }
  records.push({leader:decode(offset,offset+24),fields});offset+=length;
 }
 return records;
}
