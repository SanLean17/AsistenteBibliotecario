// QA ONLY: synthetic people/materials. No application import or production seeding.
import {STORES,command,normalizeHoldings} from '../../src/local-domain.js';
import {createEntryInstitution,entryCommand} from '../../src/entry.js';
import {projectState,mergeScope} from '../../src/access-model.js';
import {validateBook} from '../../src/catalog.js';
export function at(iso,fn){const RealDate=globalThis.Date,now=RealDate.parse(iso);globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};try{return fn();}finally{globalThis.Date=RealDate;}}
export function refreshPeople(s){s.patrons=s.memberships.map(m=>({...s.people.find(p=>p.id===m.personId),...m,id:m.personId,active:m.status==='active',mainAdmin:s.institutions[0].mainAdminId===m.personId}));}
export function archiveSchool(source){const s=structuredClone(source),all=Object.fromEntries(STORES.map(k=>[k,[]]));normalizeHoldings(s);mergeScope(all,s,s.institutionId);const result=projectState(all,s.institutionId,s.institutions[0].createdByPersonId);delete result.availableInstitutions;return {...result,app:'asistente-bibliotecario',version:5,exportedAt:'2027-10-30T12:00:00.000Z'};}
export function createSchoolV2({materials=2000,readers=200,name='Escuela Primaria FICTICIA QA V2'}={}){return at('2027-03-01T12:00:00Z',()=>{
 const all=Object.fromEntries(STORES.map(k=>[k,[]])),entry=createEntryInstitution(all,{institutionName:name,libraryName:'Biblioteca FICTICIA QA',name:'Autoridad FICTICIA QA',cargo:'Directora',initialRole:'autoridad'}),s=projectState(all,entry.id,entry.personId),authority=entry.personId;
 entryCommand(s,authority,'entry.policy',{loanDays:14,allowReservations:'true'});entryCommand(s,authority,'entry.finish');
 const people={autoridad:[authority],biblioteca:[],docente:[],personal:[],lector:[]};
 for(const [role,count] of [['biblioteca',2],['docente',15],['personal',5],['lector',readers]])for(let i=0;i<count;i++){const person=command(s,authority,'person.save',{name:role+' FICTICIO QA '+i,cargo:role,accessProfile:role,status:'active'});people[role].push(person.id);refreshPeople(s);}
 const library=people.biblioteca[0],teacher=people.docente[0],year=command(s,authority,'organization.year.create',{year:2027,startDate:'2027-03-01',endDate:'2027-12-20'});command(s,authority,'organization.year.activate',{id:year.id});
 const groups=Array.from({length:7},(_,i)=>command(s,authority,'organization.group.create',{academicYearId:year.id,level:'primary',gradeOrYear:(i+1)+'°',division:'A'}));
 const assignments=people.docente.map((teacherId,i)=>command(s,authority,'organization.assignment.create',{teacherId,groupId:groups[i%7].id,startDate:'2027-03-01',endDate:'2027-12-20'}));
 for(let i=0;i<7;i++)command(s,authority,'organization.readers.assign',{personIds:people.lector.filter((_,n)=>n%7===i),groupId:groups[i].id,confirm:'REASIGNAR'});refreshPeople(s);
 const zones=['Sala','Aula','Depósito'].map(name=>command(s,library,'location.save',{name,type:'sector'}));
 // Real serial commands keep publication -> issue -> article relationships coherent.
 for(const type of ['revista','diario']){const publication=command(s,library,'serial.publication.save',{title:'Publicación FICTICIA QA '+type,type});for(let i=1;i<=3;i++){const issue=command(s,library,'serial.issue.save',{serialPublicationId:publication.id,year:'2027',issueNumber:String(i),copies:2});command(s,library,'serial.articles.confirm',{issueId:issue.id,confirmed:true,rows:[{id:crypto.randomUUID(),title:'Artículo océanos '+type+' '+i,status:'accepted',page:'12'}]});}}
 for(let i=s.books.length;i<materials;i++)s.books.push(validateBook({title:'Material FICTICIO QA '+String(i).padStart(5,'0'),author:'Autoría sintética '+i%37,materialType:i%10===0?'documento':'libro',isbn:i===10?'9505470630':i===11?'9789505470631':'',publisher:'Editorial de prueba',year:String(2020+i%7),subjects:[i%2?'Océanos':'Historia'],contentEntries:i%5===0?[{id:crypto.randomUUID(),title:'Cuento murciélagos '+i,type:'cuento',author:'Autora sintética'}]:[],copies:2}));
 const c=s.settings.find(c=>c.id==='local');for(const b of s.books){Object.assign(b,{institutionId:c.institutionId,libraryId:c.libraryId,collectionId:c.collectionId});for(const e of b.exemplars)Object.assign(e,{institutionId:c.institutionId,libraryId:c.libraryId,collectionId:c.collectionId});}
 normalizeHoldings(s);
 // Two controlled duplicate candidates; they remain separate until human review.
 s.books[12].title=s.books[13].title='Antología FICTICIA: cuentos del río';s.books[12].author=s.books[13].author='Autoría duplicado controlado';s.books[12].authors=s.books[13].authors=['Autoría duplicado controlado'];
 for(let i=0;i<s.books.length;i++)for(const copy of s.books[i].exemplars){const zone=zones[i%3];copy.physicalLocation={sectorId:zone.id,sector:zone.name};copy.location=zone.name;if(i>100&&i%101===0){copy.condition='Regular';copy.careLevel='careful';}if(i>100&&i%211===0){copy.condition='Deteriorado';copy.careLevel='restricted';copy.status='damaged';}}
 s.books[14].workId=s.books[15].workId;normalizeHoldings(s);
 const policy=s.settings.find(c=>c.id==='local').policy;Object.assign(policy,{allowRenewals:true,maxRenewals:1,renewalRequestWindowDays:1,renewalExtensionDays:7});
 return {s,authority,library,teacher,people,year,groups,assignments,zones};
 });}
export function simulateThirtyDays(fixture){const {s,library,authority,people}=fixture,ledger=[],pending=[];const eligible=s.books.filter(b=>b.materialType==='libro'&&b.exemplars[0].careLevel!=='restricted'),start=Date.parse('2027-04-01T10:00:00Z');
 for(let day=0;day<30;day++){const now=new Date(start+day*86400000).toISOString();at(now,()=>{
  while(pending.length){const loan=pending.shift();command(s,library,'loan.return',{id:loan.id,condition:day%7===0?'Regular':'Bueno',careLevel:day%7===0?'careful':'normal'});}
  command(s,people.docente[day%15],'search.record',{query:'Océanos'});
  const journal=command(s,library,'cataloging.start',{name:'Jornada QA día '+(day+1)});for(let n=0;n<10;n++)command(s,library,'cataloging.capture',{sessionId:journal.id,raw:n%2?'9505470630':'9789505470631'});
  command(s,library,'cataloging.complete',{sessionId:journal.id,confirmed:true});
  if(day<15){const actor=people.docente[day],project=command(s,actor,'teaching.project.save',{title:'Proyecto FICTICIO QA '+day,visibility:'institution',academicYear:'2027',area:'Ciencias'}),b=s.books.find(b=>b.contentEntries?.length);command(s,actor,'teaching.item.add',{id:project.id,materialId:b.id});command(s,actor,'teaching.item.add',{id:project.id,materialId:b.id,contentEntryId:b.contentEntries[0].id});const e=command(s,actor,'teaching.experience.save',{projectId:project.id,courseLevel:'5 A',area:'Ciencias',activityDescription:'Lectura ficticia'});command(s,actor,'teaching.experience.transition',{id:e.id,status:'submitted'});command(s,library,'teaching.experience.transition',{id:e.id,status:'approved'});}
  for(let n=0;n<100;n++){const b=eligible[(day*100+n)%eligible.length],copy=b.exemplars[0],person=people.lector[n%people.lector.length];let reservation;
   if(n%10===0){reservation=command(s,person,'reservation.create',{bookId:b.id,patronId:person});command(s,library,'reservation.transition',{id:reservation.id,status:'approved',exemplarId:copy.id});command(s,library,'reservation.transition',{id:reservation.id,status:'ready'});}
   const due=new Date(start+(day+(n%10===1?0:7))*86400000).toISOString().slice(0,10),loan=command(s,library,'loan.create',{exemplarId:copy.id,patronId:person,dueAt:due,reservationId:reservation?.id});pending.push(loan);
  }
  ledger.push({day:day+1,date:now,loans:100,reservations:10,journals:1});
 });}
 at('2027-04-30T20:00:00Z',()=>{while(pending.length)command(s,library,'loan.return',{id:pending.shift().id});});
 // A separate coherent near-due loan proves request -> approval -> return.
 at('2027-05-01T12:00:00Z',()=>{const loan=command(s,library,'loan.create',{exemplarId:eligible[0].exemplars[1].id,patronId:people.docente[0],dueAt:'2027-05-01'});command(s,people.docente[0],'loan.renew.request',{id:loan.id});command(s,authority,'loan.renew.approve',{id:loan.id});command(s,library,'loan.return',{id:loan.id});});
 return ledger;
}
