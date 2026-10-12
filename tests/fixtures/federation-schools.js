// Synthetic institutions for tests only. Never loaded by the application.
import {createFederationSnapshot} from '../../src/federation.js';
import {STORES,config,normalizeHoldings} from '../../src/local-domain.js';
export function schoolState(id='local-school',name='Escuela de prueba'){
 const s=Object.fromEntries(STORES.map(k=>[k,[]]));s.institutionId=id;
 s.settings=[{id:'local',institutionId:id,federationInstitutionId:id,libraryId:id+'-library',collectionId:id+'-collection',institutionName:name,libraryName:'Biblioteca ficticia',sequence:1}];
 s.patrons=[{id:'lib',name:'Responsable ficticio privado',institutionId:id,accessProfile:'biblioteca',status:'active',active:true},{id:'teacher',institutionId:id,accessProfile:'docente',status:'active',active:true}];
 s.books=[{id:id+'-book',title:'Segunda Guerra Mundial',author:'Autora ficticia',isbn:'9505470630',materialType:'libro',subjects:['Historia'],circulationPolicy:'standard',federationVisibility:'shared',notes:'Nota privada secreta',exemplars:[{id:id+'-copy',internalCode:'AB-000001',condition:'Bueno',status:'available',location:'Ubicación privada',conditionNote:'Dato privado'}]}];
 normalizeHoldings(s);config(s);return s;
}
export async function schoolFixtures(){return Promise.all([['belgrano','Escuela Belgrano'],['sarmiento','Escuela Sarmiento'],['san-martin','Escuela San Martín']].map(async([id,name])=>createFederationSnapshot(schoolState(id,name),{includeHoldings:true,at:new Date('2026-01-10T12:00:00.000Z')})));}
