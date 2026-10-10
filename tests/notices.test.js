import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveNotices,filterNotices,noticeVisibleTo} from '../src/notices.js';
import {expireAccess} from '../src/access-domain.js';

const at=new Date('2026-10-10T12:00:00Z');
const time=hours=>new Date(+at+hours*3600000).toISOString();
const actor=(id='library',accessProfile='biblioteca')=>({id,accessProfile,institutionId:'school',status:'active',name:id});
function state(){return {institutionId:'school',settings:[{id:'local',policy:{}}],patrons:[actor(),actor('authority','autoridad'),actor('teacher','docente'),actor('reader','lector')],books:[{id:'book',title:'Atlas',exemplars:[{id:'copy',internalCode:'AB-000001',careLevel:'normal'}]}],loans:[],reservations:[],grants:[],inventorySessions:[],activity:[]};}
const loan=(id='loan',owner='teacher',hours=12)=>({id,bookId:'book',exemplarId:'copy',patron:{id:owner},status:'loaned',dueAt:time(hours)});
const derive=(s,a=s.patrons[0],when=at)=>deriveNotices(s,a,{at:when});

test('deadlines reuse the policy, have stable identities and ignore grace for due notices',()=>{
 const s=state();s.loans=[loan('soon'),loan('far','teacher',48),loan('overdue','teacher',-1),loan('boundary','teacher',24),loan('now','teacher',0),{...loan('invalid'),dueAt:'bad'}];
 const before=structuredClone(s),first=derive(s);
 assert.deepEqual(s,before);assert.equal(first.length,4);
 assert.equal(first[0].type,'loan.overdue');
 const soon=first.find(n=>n.type==='loan.due-soon');
 const later=derive(s,undefined,new Date(+at+25*3600000)).find(n=>n.id===soon.id);
 assert.equal(later.type,'loan.overdue');
 s.settings[0].policy={renewalRequestWindowDays:3,overdueGraceDays:7};
 assert.equal(derive(s).length,5);assert.equal(derive(s)[0].type,'loan.overdue');
 s.loans.forEach(l=>l.returnedAt=time(0));assert.deepEqual(derive(s),[]);
});

test('reservations have one notice, escalate near pickup expiry and vanish after expiry or completion',()=>{
 const s=state();s.reservations=[{id:'ready',status:'ready',bookId:'book',patron:{id:'teacher'},expiresAt:time(48)},{id:'approved',status:'approved',patron:{id:'teacher'},expiresAt:time(12)}];
 const ready=derive(s).find(n=>n.type==='reservation.ready');assert.ok(ready);
 s.reservations[0].expiresAt=time(12);
 const current=derive(s);assert.equal(current.length,2);assert.equal(current.find(n=>n.id===ready.id).type,'reservation.expiring');
 s.reservations[0].expiresAt=time(0);s.reservations[1].status='collected';assert.equal(derive(s).length,0);
 for(const status of ['cancelled','expired','collected']){s.reservations[0]={...s.reservations[0],status,expiresAt:time(12)};assert.equal(derive(s).length,0);}
});

test('pending approvals are a distinct actionable task and disappear after decision or return',()=>{
 const s=state();s.loans=[{...loan(),renewalRequest:{status:'pending'}}];
 assert.equal(derive(s).length,2);assert.equal(new Set(derive(s).map(n=>n.id)).size,2);
 for(const status of ['approved','rejected']){s.loans[0].renewalRequest.status=status;assert.equal(derive(s).length,1);}
 s.loans[0].renewalRequest.status='pending';s.loans[0].status='returned';assert.equal(derive(s).length,0);
});

test('temporary grants distinguish expired, revoked, permanent, future and invalid windows',()=>{
 const s=state();const grant={id:'g',userId:'teacher',permission:'catalog.create',active:true,expiresAt:time(12)};
 s.grants=[grant,{...grant,id:'permanent',permission:'catalog.edit',expiresAt:''},{...grant,id:'revoked',revokedAt:time(-1)},{...grant,id:'inactive',active:false},{...grant,id:'future',startsAt:time(6)},{...grant,id:'bad',expiresAt:'bad'}];
 assert.equal(derive(s).length,1);const id=derive(s)[0].id;
 grant.expiresAt=time(0);assert.equal(derive(s)[0].type,'permission.expired');
 expireAccess(s,+at);assert.equal(grant.active,false);assert.equal(derive(s)[0].id,id);
 grant.revokedAt=time(0);assert.equal(derive(s).length,0);
});

test('physical care reuses the queue and inventory counts expected identities, not scan totals',()=>{
 const s=state();s.books[0].exemplars[0].careLevel='restricted';s.inventorySessions=[{id:'i',status:'draft',scope:null,findings:[]}];
 const initial=derive(s);assert.equal(initial.length,2);assert.equal(initial[0].type,'holding.attention');
 const session=s.inventorySessions[0],id=initial.find(n=>n.area==='inventory').id;
 Object.assign(session,{status:'open',scope:{label:'Sala'},expectedExemplarIds:['a','b'],findings:[{exemplarId:'a',status:'found'},{exemplarId:'x',status:'misplaced'}]});
 assert.equal(derive(s).find(n=>n.id===id).type,'inventory.incomplete');
 session.findings.push({exemplarId:'b',status:'unscanned'});assert.equal(derive(s).find(n=>n.id===id).type,'inventory.incomplete');
 session.findings.push({exemplarId:'b',status:'found'});assert.equal(derive(s).find(n=>n.id===id).type,'inventory.close');
 session.status='closed';s.books[0].exemplars[0].careLevel='normal';assert.equal(derive(s).length,0);
 s.activity=[{type:'holding.condition.worsened',exemplarId:'copy',createdAt:time(-2)}];assert.equal(derive(s)[0].type,'holding.attention');
 s.books[0].exemplars[0].conditionReviewedAt=time(-1);assert.equal(derive(s).length,0);
});

test('a replacement grant resolves the old expiration without storing or dismissing a notice',()=>{
 const s=state();s.grants=[{id:'old',userId:'teacher',permission:'catalog.create',active:false,expiredAt:time(-1),expiresAt:time(-1)}];
 assert.equal(derive(s).length,1);
 s.grants.push({id:'replacement',userId:'teacher',permission:'catalog.create',active:true});
 assert.equal(derive(s).length,0);
});

test('profiles see only their own personal notices, irrespective of additional grants or mainAdmin',()=>{
 const s=state();s.loans=[{...loan('a'),renewalRequest:{status:'pending'}},loan('b','reader')];
 s.reservations=[{id:'r',status:'ready',patron:{id:'reader'}}];
 s.grants=[{id:'g',userId:'teacher',permission:'inventory.manage',expiresAt:time(12)}];
 s.inventorySessions=[{id:'i',status:'draft'}];
 assert.equal(derive(s).length,6);assert.equal(derive(s,s.patrons[1]).length,6);
 assert.equal(derive(s,s.patrons[2]).length,3);assert.equal(derive(s,s.patrons[3]).length,2);
 assert.equal(derive(s,{...s.patrons[2],mainAdmin:true}).length,3);
 assert.equal(derive(s,{...s.patrons[2],accessProfile:'personal'}).length,3);
 for(const patch of [{active:false},{status:'suspended'},{expiresAt:time(0)},{startsAt:time(1)},{institutionId:'other'}])assert.equal(derive(s,{...s.patrons[0],...patch}).length,0);
 assert.equal(deriveNotices(s,null,{at}).length,0);
 assert.equal(noticeVisibleTo(derive(s)[0],actor('outsider','lector'),at),false);
});

test('institution isolation, duplicate source ids, filters, deterministic output and no mutation',()=>{
 const s=state();s.loans=[loan(),loan(),{...loan('foreign'),institutionId:'other'}];
 s.grants=[{id:'foreign',userId:'teacher',permission:'catalog.create',institutionId:'other',expiresAt:time(12)}];
 s.books.push({id:'foreign',institutionId:'other',exemplars:[{id:'foreign-copy',careLevel:'restricted'}]});
 const before=structuredClone(s),notices=derive(s);
 assert.equal(notices.length,1);assert.deepEqual(derive(s),notices);assert.deepEqual(s,before);
 assert.equal(filterNotices(notices,{priority:'high'}).length,0);
 assert.equal(filterNotices(notices,{priority:'medium',area:'loans'}).length,1);
 const other=structuredClone(s);other.institutionId='other';other.patrons[0].institutionId='other';
 assert.notEqual(derive(other)[0].id,notices[0].id);
 assert.deepEqual(deriveNotices({},actor(),{at}),[]);
});
