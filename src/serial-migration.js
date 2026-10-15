import {normalizeISSN,issueRecord,sameIssue,serialCommand} from './serials.js?v=20261015-entry1';
export const isSerialDraft=d=>Boolean(d.publication&&(d.publicationDate||d.issueNumber));
export function serialDraftKey(d){if(!isSerialDraft(d))return '';const i=issueRecord(d),issn=normalizeISSN(d.issn);return JSON.stringify([issn||d.publication.trim().toLowerCase(),i.publicationDate,i.year,i.volume,i.issueNumber,i.editionLabel]);}
export function serialDraftMatches(books,d){if(!d.issn)return [];const issn=normalizeISSN(d.issn);return books.filter(b=>b.serialIssueId&&b.issn===issn&&sameIssue({...b,serialPublicationId:issn},{...issueRecord(d),serialPublicationId:issn}));}
export function prepareSerialDraft(d){if(!isSerialDraft(d))return d;d.materialType=d.materialType==='diario'?'diario':'revista';d.title=d.publication;d.contentEntries??=[];if(d.article&&!d.contentEntries.some(c=>c.title===d.article&&c.source==='CSV revisado'))d.contentEntries.push({title:d.article,author:d.articleAuthor||'',page:d.articlePage||'',kind:'article',type:'article',source:'CSV revisado'});serialDraftKey(d);return d;}
// Exact rows of one reviewed import share their issue. Anonymous article rows do
// not imply more physical copies; distinct explicit inventory codes do.
export function combineSerialRows(target,incoming){
 target.contentEntries=[...(target.contentEntries||[]),...(incoming.contentEntries||[])];
 const codes=new Set(target.exemplars.map(e=>e.inventoryCode).filter(Boolean));
 for(const e of incoming.exemplars)if(e.inventoryCode&&!codes.has(e.inventoryCode)){target.exemplars.push(e);codes.add(e.inventoryCode);}target.copies=target.exemplars.length;
}
export function importSerialDraft(s,actor,d,hooks){
 const exact=serialDraftMatches(s.books,d);if(exact.length>1)throw Error('Número ambiguo: resolvé duplicados antes de importar.');
 let b=exact[0];
 if(!b){let p=d.issn?s.serialPublications.find(p=>p.issn===normalizeISSN(d.issn)):null;
  // Without ISSN only reuse a mother created in this same reviewed batch.
  if(!p&&!d.issn)p=s.serialPublications.find(p=>p.migrationId===hooks.migrationId&&p.title===d.publication);
  if(!p){p=serialCommand(s,actor,'publication.save',{title:d.publication,issn:d.issn,publisher:d.publisher,language:d.language,type:d.materialType==='diario'?'diario':'revista',frequency:d.frequency||'desconocido',sourceRecords:d.sourceRecords},hooks);p.migrationId=hooks.migrationId;}
  const i=serialCommand(s,actor,'issue.save',{...d,serialPublicationId:p.id,copies:0},hooks);b=s.books.find(b=>b.id===i.materialId);
 }
 if(d.contentEntries?.length){const existing=new Set(b.contentEntries.map(c=>JSON.stringify([c.title,c.author,c.page]))),rows=d.contentEntries.filter(c=>!existing.has(JSON.stringify([c.title,c.author||'',c.page||'']))).map(c=>({...c,id:crypto.randomUUID(),type:['article','headline','column','story','other'].includes(c.type||c.kind)?c.type||c.kind:'article',status:'accepted'}));if(rows.length)serialCommand(s,actor,'articles.confirm',{issueId:b.serialIssueId,confirmed:true,rows},hooks);}
 return b;
}
