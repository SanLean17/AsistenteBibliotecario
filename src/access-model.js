import {legacyProfile,profileRole,ROLES} from './permissions.js?v=20261006-2';
export const EXTRA_STORES=['people','memberships','invitations','saved'];
export function migrateAccess(s){
 if(s.settings.some(x=>x.id==='access-model-v5'))return;
 for(const name of EXTRA_STORES)s[name]??=[];
 const c=s.settings.find(x=>x.id==='local')||{id:'local',institutionId:'local-institution',libraryId:'local-library',collectionId:'local-collection',institutionName:'Mi escuela',libraryName:'Biblioteca',sequence:1};
 if(!s.settings.includes(c))s.settings.push(c);
 if(!s.patrons.some(p=>p.id==='local-admin')&&!s.patrons.some(p=>['administrador','director','bibliotecario'].includes(p.role)&&p.active!==false))s.patrons.push({id:'local-admin',name:'Responsable local',role:'administrador',active:true});
 const owner=s.patrons.find(p=>p.id==='local-admin')||s.patrons.find(p=>['administrador','director','bibliotecario'].includes(p.role)&&p.active!==false)||s.patrons[0];
 s.institutions=[{...(s.institutions[0]||{}),id:c.institutionId,name:c.institutionName,mainAdminId:owner.id,status:'active'}];
 for(const p of s.patrons){s.people.push({id:p.id,name:p.name,email:p.email||''});s.memberships.push({...p,id:crypto.randomUUID(),personId:p.id,institutionId:c.institutionId,cargo:p.role==='administrador'?'Cargo por completar':ROLES[p.role]||'Cargo por completar',accessProfile:legacyProfile(p.role),status:p.active===false?'inactive':'active'});}
 for(const [name,records] of Object.entries(s))if(Array.isArray(records)&&!['people','memberships','institutions'].includes(name))for(const r of records)r.institutionId??=c.institutionId;
 s.settings.push({id:'access-model-v5'});
}
export function projectState(all,iid,actorId){
 const s={};for(const [name,records] of Object.entries(all))s[name]=records.filter(r=>name==='people'||r.institutionId===iid||(name==='institutions'&&r.id===iid));
 s.institutionId=iid;s.people=structuredClone(all.people);
 const institution=s.institutions[0];
 s.patrons=s.memberships.map(m=>({...all.people.find(p=>p.id===m.personId),...m,id:m.personId,role:profileRole(m.accessProfile),active:m.status==='active',mainAdmin:institution?.mainAdminId===m.personId}));
 s.availableInstitutions=all.institutions.filter(i=>all.memberships.some(m=>m.personId===actorId&&m.institutionId===i.id));
 s.settings=s.settings.map(c=>({...c,id:c.id==='config:'+iid?'local':c.id}));
 return s;
}
export function mergeScope(all,s,iid){
 all.people=s.people;
 for(const name of Object.keys(all)){if(name==='people'||name==='patrons')continue;const records=s[name]||[];all[name]=all[name].filter(r=>r.institutionId!==iid&&!(name==='institutions'&&r.id===iid));for(const r of records){if(name!=='settings'&&all[name].some(other=>other.id===r.id))throw new Error('Identificador ya utilizado en otra institución.');r.institutionId=iid;if(name==='settings'&&r.id==='local'&&iid!=='local-institution')r.id='config:'+iid;all[name].push(r);}}
 // Legacy projection is retained only for compatibility with old backups.
 all.patrons=all.people.map(p=>({...p}));
}
