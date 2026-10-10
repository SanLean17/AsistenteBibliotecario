// Synthetic QA only. Never imported by the application or included in its offline cache.
import {STORES,normalizeHoldings} from '../../src/local-domain.js';
import {migrateAccess,projectState,mergeScope} from '../../src/access-model.js';
import {validateBook} from '../../src/catalog.js';
export const SIZES={small:[100,150,20,30],medium:[2000,3000,200,500],large:[10000,15000,1000,4000]};
export function fieldState(size='small'){
 const [materials,copies,people,history]=SIZES[size],all=Object.fromEntries(STORES.map(k=>[k,[]]));migrateAccess(all);
 const s=projectState(all,'local-institution','local-admin');
 for(let n=1;n<people;n++){const id='qa-person-'+n;s.people.push({id,name:'Persona de prueba '+n,email:''});s.memberships.push({id:'qa-member-'+n,personId:id,institutionId:s.institutionId,cargo:n%2?'Docente de quinto':'Estudiante',course:'Quinto',accessProfile:n%2?'docente':'lector',status:'active'});}
 for(let n=0;n<materials;n++)s.books.push(validateBook({title:'Material sintético '+String(n).padStart(5,'0'),author:'Autoría '+n,materialType:'libro',subjects:[n%2?'Océanos':'Bosques'],contents:['Capítulo sobre murciélagos '+n],copies:n<copies-materials?2:1}));
 normalizeHoldings(s);
 for(let n=0;n<history;n++){const b=s.books[n%materials];s.loans.push({id:'qa-loan-'+n,institutionId:s.institutionId,bookId:b.id,exemplarId:b.exemplars[0].id,patron:{id:'qa-person-1',name:'Persona de prueba 1'},status:'returned',loanedAt:'2025-01-01T12:00:00.000Z',dueAt:'2025-01-15T12:00:00.000Z',returnedAt:'2025-01-10T12:00:00.000Z'});}
 mergeScope(all,s,s.institutionId);const result=projectState(all,s.institutionId,'local-admin');delete result.availableInstitutions;
 return {app:'asistente-bibliotecario',version:5,exportedAt:'2026-10-10T12:00:00.000Z',...result};
}
