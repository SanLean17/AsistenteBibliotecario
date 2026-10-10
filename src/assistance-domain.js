import {CAPTURE_KINDS,ASSIST_FIELDS,proposeFromOCR,confirmedPatch} from './assistance.js?v=20261010-rc1';
import {createAssistanceDraft,MATERIAL_TYPES} from './material-types.js?v=20261010-rc1';
import {hasPermission,requirePermission} from './permissions.js?v=20261010-rc1';
import {validateBook} from './catalog.js?v=20261010-rc1';
import {classifyCapture} from './cataloging.js?v=20261010-rc1';
import {detectCatalogMatches} from './duplicates.js?v=20261010-rc1';
import {validAssistImage} from './assistance-image.js?v=20261010-rc1';
const at=()=>new Date().toISOString();
const shared=['title','subtitle','author','authors','subjects','contentEntries','contents','description'];
export function canAssist(s,actor,target='new'){return (target==='material'?['catalog.edit','contents.manage','topics.manage']:['catalog.create']).some(p=>hasPermission(actor,p,s.grants));}
function targetFor(s,a){if(a.target==='material'){const book=s.books.find(b=>b.id===a.materialId);if(!book)throw new Error('La ficha ya no existe.');return book;}if(a.target==='item'){const j=s.catalogingSessions.find(j=>j.id===a.sessionId),item=j?.items.find(i=>i.id===a.itemId);if(!j||j.status!=='open'||!item||item.status==='incorporated')throw new Error('El ítem de jornada ya no se puede editar.');return item.draft;}return a.draft||{copies:0,materialType:a.materialType||'libro'};}
function fingerprint(s,a){if(a.target==='item'){const j=s.catalogingSessions.find(j=>j.id===a.sessionId),i=j?.items.find(i=>i.id===a.itemId);return JSON.stringify(i);}if(a.target==='material'){const b=targetFor(s,a);return JSON.stringify(s.books.filter(x=>x.id===b.id||x.workId===b.workId));}return '';}
function requireAccess(s,actor,a){if(!canAssist(s,s.patrons.find(p=>p.id===actor),a.target))throw new Error('No tenés permiso vigente para asistir este material.');}
export function assistanceCommand(s,actor,type,d={},helpers){
 if(d.expectedActor&&d.expectedActor!==actor||d.expectedInstitution&&d.expectedInstitution!==s.institutionId)throw new Error('Cambió el perfil o la institución. Volvé a abrir la asistencia.');
 s.assistanceSessions??=[];
 if(type==='start'){
  const target=['material','item'].includes(d.target)?d.target:'new';requireAccess(s,actor,{target});
  if(s.assistanceSessions.filter(a=>a.status==='active').length>=10)throw new Error('Hay diez asistencias abiertas. Aplicá o descartá alguna antes de iniciar otra.');
  const a={...createAssistanceDraft({materialId:d.materialId||'',captureKind:d.captureKind}),id:crypto.randomUUID(),target,sessionId:d.sessionId||'',itemId:d.itemId||'',institutionId:s.institutionId||s.settings.find(x=>x.id==='local').institutionId,createdBy:actor,status:'active',materialType:d.materialType||'libro',revision:0,text:'',image:'',proposals:[]};
  const base=targetFor(s,a);a.materialType=base.materialType||a.materialType;a.fingerprint=fingerprint(s,a);s.assistanceSessions.push(a);return a;
 }
 const a=s.assistanceSessions.find(a=>a.id===d.id);if(!a)throw new Error('Asistencia inexistente.');requireAccess(s,actor,a);
 if(type==='apply'&&a.status==='applied')return a;
 if(a.status!=='active')throw new Error('La asistencia ya está cerrada.');
 if(type==='image'){
  if(!validAssistImage(d.image))throw new Error('Imagen de asistencia inválida o demasiado grande.');a.image=d.image;a.imageName=String(d.name||'Fotografía').slice(0,160);a.captureKind=Object.hasOwn(CAPTURE_KINDS,d.captureKind)?d.captureKind:'cover';a.materialType=d.materialType||a.materialType;a.text='';a.proposals=[];a.remoteBook=null;a.message='Imagen preparada. Todavía no se leyó el texto.';
 }else if(type==='recognized'){
  if(d.revision!==a.revision)return a;
  if(!a.image)throw new Error('Elegí una imagen primero.');a.text=String(d.text||'').slice(0,40000);a.confidence=Number.isFinite(d.confidence)?d.confidence:null;a.engine=String(d.engine||'OCR local').slice(0,100);
  Object.assign(a,proposeFromOCR(a.text,{captureKind:a.captureKind,confidence:a.confidence,materialType:a.materialType,knownSubjects:s.books.flatMap(b=>b.subjects||[])}));
 }else if(type==='decide'){
  const p=a.proposals.find(p=>p.id===d.proposalId);if(!p)throw new Error('Propuesta inexistente.');if(!['accepted','rejected','edited','proposed'].includes(d.status))throw new Error('Estado inválido.');
  if(d.status==='edited'){p.originalValue??=structuredClone(p.value);p.value=structuredClone(d.value);}
  p.status=d.status;p.reviewedBy=actor;p.reviewedAt=at();
  if(['accepted','edited'].includes(p.status)&&!['contentEntries','subjects'].includes(p.field))for(const other of a.proposals)if(other.id!==p.id&&other.field===p.field&&['accepted','edited'].includes(other.status))other.status='rejected';
 }else if(type==='accept-contents'){
  for(const p of a.proposals.filter(p=>p.field==='contentEntries'&&p.status==='proposed')){p.status='accepted';p.reviewedBy=actor;p.reviewedAt=at();}
 }else if(type==='add'){
  if(!Object.hasOwn(ASSIST_FIELDS,d.field)||a.proposals.length>=500)throw new Error('Campo inválido o demasiadas propuestas.');a.proposals.push({id:crypto.randomUUID(),field:d.field,value:structuredClone(d.value),source:'Biblioteca · revisión humana',confidence:null,status:'proposed',evidence:'Agregado por la persona.'});
 }else if(type==='sources'){
  if(d.revision!==a.revision)return a;
  const chosen=a.proposals.find(p=>p.id===d.proposalId&&p.field==='isbn');if(!chosen)throw new Error('Seleccioná un ISBN detectado.');const probe=confirmedPatch({},[{...chosen,status:'accepted'}]);if(!probe.isbn)throw new Error('ISBN inválido.');
  if(!d.book){a.message='Las fuentes no devolvieron datos. Podés seguir revisando el texto OCR.';return a;}
  const b=validateBook({...d.book,copies:0});if(b.isbn&&confirmedPatch({},[{field:'isbn',value:b.isbn,status:'accepted'}]).isbn!==probe.isbn)throw new Error('La fuente devolvió otro ISBN.');
  a.remoteBook=b;for(const field of ['title','subtitle','author','publisher','year','edition','isbn','description','subjects','contentEntries']){
   const values=['subjects','contentEntries'].includes(field)?b[field]:[b[field]];
   for(const value of values||[])if(value&&(!Array.isArray(value)||value.length)&&!a.proposals.some(p=>p.field===field&&JSON.stringify(p.value)===JSON.stringify(value)&&p.source.startsWith('Fuente'))){a.proposals.push({id:crypto.randomUUID(),field,value,source:'Fuente bibliográfica · '+(b.fieldSources[field==='author'?'authors':field]||b.sources.join(' + ')),confidence:null,status:'proposed',evidence:'Consulta explícita del ISBN '+probe.isbn});}
  }a.message='Las fuentes agregaron propuestas. Revisá las diferencias antes de aceptar.';
 }else if(type==='discard'){a.status='discarded';a.image='';a.text='';a.proposals=[];a.remoteBook=null;a.identifiers=null;a.fingerprint='';a.closedAt=at();
 }else if(type==='apply'){
  if(d.confirmed!==true)throw new Error('Confirmá los datos seleccionados.');if(fingerprint(s,a)!==a.fingerprint)throw new Error('Cambió la ficha o el ítem. Iniciá otra asistencia para revisar la versión actual.');
  const base=targetFor(s,a),patch=confirmedPatch(base,a.proposals);
  for(const field of Object.keys(patch))if(a.target==='material')requirePermission(s,actor,['contentEntries','contents'].includes(field)?'contents.manage':field==='subjects'?'topics.manage':'catalog.edit');else requirePermission(s,actor,'catalog.create');
  if(patch.materialType&&!Object.hasOwn(MATERIAL_TYPES,patch.materialType))throw new Error('Tipo de material inválido.');
  const checked=validateBook({...base,...patch,copies:base.copies||0});
  if(a.target==='material'&&detectCatalogMatches(s.books,checked,{excludeId:base.id}).some(m=>m.kind==='exact-edition'))throw new Error('El identificador coincide con otra ficha. Revisá el catálogo; no se fusionó nada.');
  const approved=a.proposals.filter(p=>['accepted','edited'].includes(p.status)).map(p=>({field:p.field,value:p.value,source:p.source,confidence:p.confidence,status:p.status,reviewedBy:actor,reviewedAt:at()}));
  const history=[...(base.enrichment?.history||[]),{assistanceId:a.id,captureKind:a.captureKind,imageName:a.imageName,engine:a.engine,confirmedAt:at(),confirmedBy:actor,proposals:approved}].slice(-20);
  const enrichment={...createAssistanceDraft({materialId:base.id||''}),status:'confirmed',confirmedAt:at(),history};
  const provenance={...base.fieldSources};for(const p of approved){const key=p.field==='author'?'authors':p.field==='contentEntries'?'contents':p.field;delete provenance[key];if(p.source.startsWith('Fuente')&&a.remoteBook?.fieldSources[key])provenance[key]=a.remoteBook.fieldSources[key];}
  const sourcePatch=a.remoteBook&&approved.some(p=>p.source.startsWith('Fuente'))?{sources:[...new Set([...(base.sources||[]),...a.remoteBook.sources])],sourceRecords:[...(base.sourceRecords||[]),...a.remoteBook.sourceRecords].slice(-10)}:{};
  for(const key of Object.keys(patch))if(Object.hasOwn(checked,key))patch[key]=checked[key];
  const final={...base,...patch,...sourcePatch,fieldSources:provenance,enrichment};
  if(a.target==='material'){
   Object.assign(base,final,{updatedAt:at()});for(const other of s.books.filter(b=>b.id!==base.id&&b.workId===base.workId)){for(const field of shared)if(Object.hasOwn(patch,field)){other[field]=structuredClone(patch[field]);const key=field==='author'?'authors':field==='contentEntries'?'contents':field;other.fieldSources={...other.fieldSources};delete other.fieldSources[key];}const related=approved.filter(p=>shared.includes(p.field));if(related.length)other.enrichment={...createAssistanceDraft({materialId:other.id}),status:'confirmed',confirmedAt:at(),history:[...(other.enrichment?.history||[]),{assistanceId:a.id,captureKind:a.captureKind,confirmedAt:at(),confirmedBy:actor,proposals:related}].slice(-20)};other.updatedAt=at();}
   helpers.audit(s,'assistance.applied',actor,{bookId:base.id,assistanceId:a.id,fields:Object.keys(patch)});a.result={materialId:base.id};
  }else if(a.target==='item'){
   const j=s.catalogingSessions.find(j=>j.id===a.sessionId),item=j.items.find(i=>i.id===a.itemId);item.draft=final;item.isbn=checked.isbn;item.key=checked.isbn||item.id;item.manualReviewed=true;item.resolution='';item.revision++;const c=classifyCapture(s.books,item);item.status=c.status;item.reason=c.reason||'';item.targetId=c.targetId||'';j.revision++;j.updatedAt=at();a.result={sessionId:j.id,itemId:item.id};
  }else{a.result={draft:{...final,copies:0}};}
  a.status='applied';a.confirmedAt=at();a.image='';a.text='';a.remoteBook=null;a.identifiers=null;a.fingerprint='';a.proposals=approved;
 }else throw new Error('Operación de asistencia desconocida.');
 a.revision++;a.updatedAt=at();return a;
}
export function validateAssistanceBackup(items){if(!Array.isArray(items)||items.length>10000)throw new Error('Asistencias inválidas.');for(const a of items){if(!/^[a-zA-Z0-9_-]+$/.test(a.id||'')||!['active','applied','discarded'].includes(a.status)||!['new','material','item'].includes(a.target)||!Object.hasOwn(CAPTURE_KINDS,a.captureKind)||!Array.isArray(a.proposals)||a.proposals.length>500||String(a.text||'').length>40000||(a.image&&!validAssistImage(a.image))||a.proposals.some(p=>!p||!Object.hasOwn(ASSIST_FIELDS,p.field)||!['proposed','accepted','rejected','edited'].includes(p.status)||(a.status==='active'&&(!p.id||typeof p.id!=='string'))||(p.field==='contentEntries'?(!p.value||typeof p.value!=='object'||typeof p.value.title!=='string'):typeof p.value!=='string')))throw new Error('Asistencia inválida en respaldo.');}}
