import {suggestKeywords} from './assistance.js?v=20261015-entry1';
import {validISSN} from './recognition.js?v=20261015-entry1';
import {validateBook} from './catalog.js?v=20261015-entry1';
import {requirePermission} from './permissions.js?v=20261015-entry1';

export const SERIAL_STORES=['serialPublications','serialIssues'];
export const SERIAL_TYPES=['revista','diario','boletín','publicación institucional','otro seriado'];
export const FREQUENCIES=['desconocido','diario','semanal','quincenal','mensual','trimestral','irregular'];
export const ARTICLE_TYPES=['article','headline','column','story','other'];
const text=(v,n=500)=>String(v??'').trim().slice(0,n);
const tags=v=>(Array.isArray(v)?v:String(v||'').split(',')).map(v=>text(v,100)).filter(Boolean).slice(0,100);
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function normalizeISSN(value){const v=text(value).replace(/^ISSN\s*/i,'').replace(/[\s-]/g,'').toUpperCase();if(!v)return '';if(!validISSN(v))throw Error('ISSN inválido.');return v.slice(0,4)+'-'+v.slice(4);}
export function serialDate(value){const v=text(value);if(v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))throw Error('Fecha de número inválida.');return v;}
export function serialURL(value){const v=text(value,2000);if(v){try{const u=new URL(v);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error();}catch{throw Error('Ingresá un enlace oficial HTTP o HTTPS válido.');}}return v;}
export function publicationRecord(d,old={}){const title=text(d.title,180);if(!title)throw Error('Completá el título de la publicación.');const type=d.type||old.type||'revista',frequency=d.frequency||'desconocido',circulationPolicy=d.circulationPolicy||'standard';if(!SERIAL_TYPES.includes(type)||!FREQUENCIES.includes(frequency)||!['standard','room-only','non-renewable'].includes(circulationPolicy))throw Error('Tipo, periodicidad o circulación inválidos.');return {...old,id:old.id||crypto.randomUUID(),title,subtitle:text(d.subtitle),issn:normalizeISSN(d.issn),eIssn:normalizeISSN(d.eIssn),publisher:text(d.publisher),place:text(d.place),type,frequency,language:text(d.language,30),subjects:tags(d.subjects),description:text(d.description,5000),resourceUrl:serialURL(d.resourceUrl),circulationPolicy,sourceRecords:Array.isArray(d.sourceRecords)?structuredClone(d.sourceRecords.slice(0,10)):old.sourceRecords||[],createdAt:old.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};}
export function publicationMatches(publications,d){const issn=normalizeISSN(d.issn);return {exact:issn?publications.filter(p=>p.issn===issn):[],suggested:publications.filter(p=>norm(p.title)===norm(d.title)&&(!issn||p.issn!==issn))};}
export function sameIssue(a,b){
 if(a.serialPublicationId!==b.serialPublicationId)return false;
 for(const f of ['publicationDate','year','volume','issueNumber','editionLabel'])if(a[f]&&b[f]&&norm(a[f])!==norm(b[f]))return false;
 return Boolean(a.publicationDate&&a.publicationDate===b.publicationDate||a.issueNumber&&a.issueNumber===b.issueNumber&&(a.year&&a.year===b.year||a.volume&&a.volume===b.volume));
}
export const issueTitle=(p,i)=>[p.title,i.volume&&'Vol. '+i.volume,i.issueNumber&&'N° '+i.issueNumber,i.editionLabel,i.publicationDate||i.year].filter(Boolean).join(' · ');
export function issueRecord(d,old={}){const publicationDate=serialDate(d.publicationDate),year=text(d.year||publicationDate.slice(0,4));if(year&&!/^\d{4}$/.test(year)||publicationDate&&year!==publicationDate.slice(0,4))throw Error('Año y fecha inconsistentes.');const issueNumber=text(d.issueNumber,80),volume=text(d.volume,80);if(!publicationDate&&!(issueNumber&&(year||volume)))throw Error('Indicá fecha completa o número con año/volumen para identificar la edición.');return {...old,id:old.id||crypto.randomUUID(),serialPublicationId:text(d.serialPublicationId,100),publicationDate,year,volume,issueNumber,editionLabel:text(d.editionLabel,120),subjects:tags(d.subjects),notes:text(d.notes,5000),createdAt:old.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};}
export function articleRecord(d,issue,materialId){const title=text(d.title);if(!title)throw Error('Artículo sin título.');const type=d.type||d.kind||'article';if(!ARTICLE_TYPES.includes(type))throw Error('Tipo de contenido inválido.');return {id:text(d.id,100)||crypto.randomUUID(),issueId:issue.id,materialId,title,author:text(d.author,180),page:text(d.pageRange||d.page,40),pageRange:text(d.pageRange||d.page,40),section:text(d.section,120),subtitle:text(d.subtitle),type,kind:type,subjects:tags(d.subjects),source:text(d.source,80)||'manual',createdAt:d.createdAt||new Date().toISOString()};}

// Books remain the circulation projection. Copies and their AB identifiers live only there.
export function syncSerials(s){
 s.serialPublications??=[];s.serialIssues??=[];
 const pubs=new Map(s.serialPublications.map(p=>[p.id,p])),books=new Map(s.books.map(b=>[b.id,b]));
 for(const i of s.serialIssues){const p=pubs.get(i.serialPublicationId),b=books.get(i.materialId);if(!p||!b)continue;
  for(const f of ['publicationDate','year','volume','issueNumber','editionLabel','notes','subjects','cover','resourceUrl','circulationPolicy','updatedAt'])i[f]=b[f];
  Object.assign(b,{serialPublicationId:p.id,serialIssueId:i.id,publication:p.title,publicationSubjects:[...p.subjects],serialType:p.type,issn:p.issn,eIssn:p.eIssn,title:issueTitle(p,i)});
  b.contentEntries=(b.contentEntries||[]).map(c=>({...c,issueId:i.id,materialId:b.id}));
 }
}
export function serialCommand(s,actorId,type,d,{command,audit,normalizeHoldings}){
 requirePermission(s,actorId,'catalog.view');
 if(d.expectedInstitution&&d.expectedInstitution!==s.institutionId||d.expectedActor&&d.expectedActor!==actorId)throw Error('Cambió la institución o el perfil.');
 s.serialPublications??=[];s.serialIssues??=[];
 const iid=s.institutionId||s.settings.find(c=>c.id==='local')?.institutionId;
 const issue=id=>{const i=s.serialIssues.find(i=>i.id===id&&i.institutionId===iid);if(!i)throw Error('Número inexistente.');return i;};
 if(type==='search'){const c=s.settings.find(c=>c.id==='local');c.hemerotecaSearches=(c.hemerotecaSearches||0)+1;return;}
 if(type==='reserve'){const i=issue(d.issueId),b=s.books.find(b=>b.id===i.materialId);if(!b||d.contentEntryId&&!b.contentEntries.some(c=>c.id===d.contentEntryId))throw Error('Contenido sin número contenedor.');if(b.circulationPolicy==='room-only')throw Error('Solo consulta en sala.');if(!b.exemplars.some(e=>!['lost','withdrawn'].includes(e.status)))throw Error('Sin ejemplares físicos habilitados.');return command(s,actorId,'reservation.create',{bookId:b.id,patronId:actorId});}
 let result;
 if(type==='publication.save'){
  requirePermission(s,actorId,d.id?'catalog.edit':'catalog.create');const old=d.id?s.serialPublications.find(p=>p.id===d.id&&p.institutionId===iid):undefined;if(d.id&&!old)throw Error('Publicación inexistente.');const p=publicationRecord(d,old);p.institutionId=iid;
  if(p.issn&&s.serialPublications.some(x=>x.id!==p.id&&x.issn===p.issn))throw Error('Ya existe una publicación con ese ISSN. Seleccionala.');
  if(old)s.serialPublications.splice(s.serialPublications.indexOf(old),1,p);else s.serialPublications.push(p);result=p;
 }else if(type==='issue.save'){
  requirePermission(s,actorId,d.id?'catalog.edit':'catalog.create');const old=d.id?issue(d.id):undefined;
  const exact=d.issn?publicationMatches(s.serialPublications,d).exact:[];if(exact.length>1)throw Error('ISSN ambiguo. Revisá publicaciones.');
  const p=s.serialPublications.find(p=>p.id===(d.serialPublicationId||exact[0]?.id)&&p.institutionId===iid);if(!p)throw Error('Creá o seleccioná la publicación madre.');if(d.issn&&normalizeISSN(d.issn)!==p.issn)throw Error('ISSN y publicación no coinciden.');
  const i=issueRecord({...d,serialPublicationId:p.id},old);i.institutionId=iid;if(s.serialIssues.some(x=>x.id!==i.id&&sameIssue(x,i)))throw Error('Este número ya existe. Agregá ejemplares a su ficha.');
  const previous=old?s.books.find(b=>b.id===old.materialId):d.materialId?s.books.find(b=>b.id===d.materialId&&!b.serialIssueId):null;if((old||d.materialId)&&!previous)throw Error('Material no disponible para vincular.');
  if(d.materialId&&!old)requirePermission(s,actorId,'catalog.edit');
  const copies=previous?previous.copies:Number(d.copies??1);if(!previous&&copies)requirePermission(s,actorId,'holdings.create');
  const b=validateBook({...previous,...i,id:previous?.id||crypto.randomUUID(),title:issueTitle(p,i),copies,exemplars:previous?.exemplars||[],materialType:p.type==='diario'?'diario':'revista',issn:p.issn,isbn:d.isbn??previous?.isbn,cover:d.cover??previous?.cover,resourceUrl:serialURL(d.resourceUrl??previous?.resourceUrl),publisher:p.publisher,language:p.language,sourceRecords:d.sourceRecords||previous?.sourceRecords||[],location:d.location||previous?.location||'',circulationPolicy:d.circulationPolicy||previous?.circulationPolicy||p.circulationPolicy,contentEntries:previous?.contentEntries||[]});
  if(previous&&!old&&s.books.some(x=>x.id!==previous.id&&x.workId===previous.workId))b.workId=crypto.randomUUID();if(d.articleRows){requirePermission(s,actorId,'contents.manage');if(d.confirmed!==true||!Array.isArray(d.articleRows)||d.articleRows.length>500)throw Error('Revisá las propuestas antes de guardar el número.');const accepted=d.articleRows.filter(r=>['accepted','edited'].includes(r.status)).map(r=>articleRecord(r,i,b.id));b.contentEntries.push(...accepted);if(b.contentEntries.length>500||new Set(b.contentEntries.map(c=>c.id)).size!==b.contentEntries.length)throw Error('Contenidos duplicados o demasiados.');b.contents=b.contentEntries.map(c=>c.title);}b.institutionId=iid;b.serialPublicationId=p.id;b.serialIssueId=i.id;i.materialId=b.id;
  if(previous)s.books.splice(s.books.indexOf(previous),1,b);else s.books.push(b);if(old)s.serialIssues.splice(s.serialIssues.indexOf(old),1,i);else s.serialIssues.push(i);result=i;
 }else if(type==='articles.confirm'){
  requirePermission(s,actorId,'contents.manage');if(d.confirmed!==true)throw Error('Confirmá explícitamente las propuestas revisadas.');const i=issue(d.issueId),b=s.books.find(b=>b.id===i.materialId);if(!b)throw Error('Número sin material.');if(!Array.isArray(d.rows)||d.rows.length>500)throw Error('Lote de artículos inválido.');
  const rows=d.rows.filter(r=>['accepted','edited'].includes(r.status)).map(r=>articleRecord(r,i,b.id));if(!rows.length)throw Error('Aceptá al menos una fila.');if(b.contentEntries.length+rows.filter(r=>!b.contentEntries.some(c=>c.id===r.id)).length>500)throw Error('Máximo 500 contenidos por número.');
  for(const r of rows){const old=b.contentEntries.find(c=>c.id===r.id);if(old)Object.assign(old,{...r,createdAt:old.createdAt||r.createdAt});else b.contentEntries.push(r);}b.contents=b.contentEntries.map(c=>c.title);b.updatedAt=new Date().toISOString();result=i;
 }else throw Error('Operación de hemeroteca desconocida.');
 syncSerials(s);normalizeHoldings(s);audit(s,'serial.'+type,actorId,{entityId:result.id});return result;
}

// Literal OCR proposals only. No semantic topics are generated or persisted here.
export function serialOCR(textValue,kind='index'){
 const lines=String(textValue||'').slice(0,50000).split(/\r?\n/).map(l=>l.trim()).filter(Boolean),dateMatch=lines.join(' ').match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/),iso=lines.join(' ').match(/\b\d{4}-\d{2}-\d{2}\b/);let publicationDate=iso?.[0]|| (dateMatch?`${dateMatch[3]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[1].padStart(2,'0')}`:'');
 if(!publicationDate){const m=norm(lines.join(' ')).match(/\b(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de (\d{4})\b/);if(m)publicationDate=`${m[3]}-${String(['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'].indexOf(m[2])+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
 try{serialDate(publicationDate);}catch{publicationDate='';}
 const title=kind==='newspaper-front'?lines[0]||'':'',editionLabel=lines.find(l=>/^edici[oó]n\s/i.test(l))||'';
 const rows=lines.filter((l,n)=>!(kind==='newspaper-front'&&n===0)&&!/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(l)&&!/^\d{4}-\d{2}-\d{2}$/.test(l)&&!/^\d{1,2} de \p{L}+ de \d{4}$/u.test(l.toLowerCase())&&!/^([ÍI]ndice|sumario|edici[oó]n\s)/i.test(l)).map(l=>{const match=l.match(/^(.*?)\s*(?:\.{2,}|\s)\s*(\d+(?:\s*[-–]\s*\d+)?)$/),parts=(match?match[1]:l).split(/\s+[—–|]\s+/);return {id:crypto.randomUUID(),title:parts[0],author:parts[1]||'',page:match?.[2]||'',section:'',subtitle:'',type:kind==='newspaper-front'?'headline':'article',subjects:[],source:'OCR local revisado',keywordProposals:suggestKeywords(parts[0],[]),status:'proposed'};}).filter(r=>r.title).slice(0,500);
 return {title,publicationDate,editionLabel,rows};
}
export function serialQuality(s){const issues=[],pubs=new Map((s.serialPublications||[]).map(p=>[p.id,p])),byBook=new Map((s.books||[]).map(b=>[b.id,b])),seen=new Map();
 for(const p of pubs.values())for(const f of ['issn','eIssn'])try{normalizeISSN(p[f]);}catch{issues.push({id:p.id,detail:'ISSN inválido en publicación.'});}
 for(const i of s.serialIssues||[]){const p=pubs.get(i.serialPublicationId),b=byBook.get(i.materialId);if(!p||!b||b.serialIssueId!==i.id||b.serialPublicationId!==p?.id)issues.push({id:i.id,detail:'Número sin publicación madre o material contenedor válido.'});try{issueRecord(i,i);}catch{issues.push({id:i.id,detail:'Fecha o identidad del número inválida.'});}
  const bucket=seen.get(i.serialPublicationId)||[];if(bucket.some(x=>sameIssue(x,i)))issues.push({id:i.id,detail:'Número duplicado fuerte.'});bucket.push(i);seen.set(i.serialPublicationId,bucket);
 }
 const issueIds=new Map((s.serialIssues||[]).map(i=>[i.id,i]));for(const b of s.books||[]){if(b.serialIssueId&&issueIds.get(b.serialIssueId)?.materialId!==b.id)issues.push({id:b.id,detail:'Material sin número válido.'});for(const c of b.contentEntries||[])if((c.issueId||b.serialIssueId)&&(issueIds.get(c.issueId)?.materialId!==b.id||c.materialId!==b.id||b.serialIssueId!==c.issueId))issues.push({id:c.id,detail:'Artículo sin número contenedor.'});}return issues;
}
export function validateSerialBackup(s){for(const k of SERIAL_STORES){s[k]??=[];if(!Array.isArray(s[k]))throw Error('Hemeroteca inválida.');}for(const p of s.serialPublications){publicationRecord(p,p);if(!Array.isArray(p.subjects)||p.subjects.some(t=>typeof t!=='string')||!Array.isArray(p.sourceRecords))throw Error('Datos de publicación inválidos.');}const issns=s.serialPublications.map(p=>p.issn).filter(Boolean);if(new Set(issns).size!==issns.length)throw Error('Publicación duplicada por ISSN.');for(const i of s.serialIssues){issueRecord(i,i);serialURL(i.resourceUrl);const b=s.books.find(b=>b.id===i.materialId);if(!Array.isArray(i.subjects)||!b||!Array.isArray(b.contentEntries)||new Set(b.contentEntries.map(c=>c.id)).size!==b.contentEntries.length||b.contentEntries.some(c=>c.issueId!==i.id||c.materialId!==b.id))throw Error('Relaciones de contenidos inválidas.');}const q=serialQuality(s);if(q.length)throw Error(q[0].detail);}
export function serialTimeline(issues){const counts=new Map();for(const i of issues){const key=i.publicationDate?.slice(0,7)||i.year||'Sin fecha';counts.set(key,(counts.get(key)||0)+1);}return [...counts].sort((a,b)=>b[0].localeCompare(a[0]));}
