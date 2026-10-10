import {deriveNotices} from './notices.js?v=20261010-6';
import {isEnabled} from './permissions.js?v=20261010-6';

const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const activeLoan=l=>['loaned','overdue'].includes(l.status)&&!l.returnedAt;
const activeReservation=r=>['requested','approved','ready'].includes(r.status);
const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();

export function findHoldingByCode(state,code){
  const value=String(code||'').trim().toUpperCase();
  if(!/^AB-\d{6,}$/.test(value))return null;
  for(const book of state.books||[]){
    const copy=(book.exemplars||[]).find(e=>String(e.internalCode||'').toUpperCase()===value);
    if(copy)return {book,copy};
  }
  return null;
}

export function searchPeople(state,query,{at=new Date(),limit=12}={}){
  const q=norm(query),parts=q.split(' ').filter(Boolean);
  return (state.patrons||[]).filter(p=>isEnabled(p,new Date(at))).map(person=>{
    const hay=norm([person.name,person.cargo,person.course,person.accessProfile].filter(Boolean).join(' '));
    const score=!q?1:parts.reduce((n,t)=>n+(hay.includes(t)?1:0),0);
    const active=(state.loans||[]).filter(l=>activeLoan(l)&&l.patron?.id===person.id).length;
    const overdue=(state.loans||[]).filter(l=>activeLoan(l)&&l.patron?.id===person.id&&Date.parse(l.dueAt)<+new Date(at)).length;
    return {person,score,activeLoans:active,overdueLoans:overdue};
  }).filter(x=>!q||x.score===parts.length)
    .sort((a,b)=>b.score-a.score||a.person.name.localeCompare(b.person.name,'es'))
    .slice(0,Math.max(1,Math.min(50,limit)));
}

export function deskHoldingSnapshot(state,code,{at=new Date()}={}){
  const found=findHoldingByCode(state,code);if(!found)return null;
  const {book,copy}=found;
  const loan=(state.loans||[]).find(l=>activeLoan(l)&&l.exemplarId===copy.id)||null;
  const reservations=(state.reservations||[]).filter(r=>activeReservation(r)&&r.bookId===book.id);
  const assigned=reservations.find(r=>r.exemplarId===copy.id)||null;
  return {book,copy,loan,reservations,assigned,at:new Date(at)};
}

export function personOperations(state,personId,{at=new Date(),limit=8}={}){
  const person=(state.patrons||[]).find(p=>p.id===personId);if(!person)return null;
  const loans=(state.loans||[]).filter(l=>l.patron?.id===personId).slice().sort((a,b)=>Date.parse(b.loanedAt||0)-Date.parse(a.loanedAt||0));
  const reservations=(state.reservations||[]).filter(r=>r.patron?.id===personId).slice().sort((a,b)=>Date.parse(b.requestedAt||0)-Date.parse(a.requestedAt||0));
  return {person,activeLoans:loans.filter(activeLoan),history:loans.filter(l=>!activeLoan(l)).slice(0,limit),reservations:reservations.filter(activeReservation).slice(0,limit),overdue:loans.filter(l=>activeLoan(l)&&Date.parse(l.dueAt)<+new Date(at))};
}

export function todayOperations(state,actor,{at=new Date()}={}){
  const now=new Date(at),notices=deriveNotices(state,actor,{at:now});
  const dueToday=(state.loans||[]).filter(l=>activeLoan(l)&&Number.isFinite(Date.parse(l.dueAt))&&sameDay(new Date(l.dueAt),now));
  const overdue=(state.loans||[]).filter(l=>activeLoan(l)&&Date.parse(l.dueAt)<+now);
  const ready=(state.reservations||[]).filter(r=>r.status==='ready'&&(!r.expiresAt||Date.parse(r.expiresAt)>+now));
  const activity=(state.activity||[]).filter(a=>a.createdAt&&sameDay(new Date(a.createdAt),now)).slice().sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  return {
    notices,
    dueToday,
    overdue,
    readyReservations:ready,
    renewalPending:(state.loans||[]).filter(l=>activeLoan(l)&&l.renewalRequest?.status==='pending'),
    inventoryOpen:(state.inventorySessions||[]).filter(i=>['draft','open'].includes(i.status)),
    condition: notices.filter(n=>n.area==='condition'),
    activity,
    totalAttention:new Set(notices.map(n=>n.id)).size
  };
}
