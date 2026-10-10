import { CIRCULATION_STATES, RESERVATION_STATES } from './domain.js?v=20261010-3';

const nowISO=()=>new Date().toISOString();
export function makePatron({id=crypto.randomUUID(),name='',role='docente',course='',institutionId='local-institution'}={}){
  return {id,name:String(name).trim().slice(0,160),role:['administrador','bibliotecario','docente','alumno'].includes(role)?role:'docente',course:String(course).trim().slice(0,80),institutionId,active:true};
}
export function createLoan({exemplarId,bookId,patron,dueAt,notes=''}){
  if(!exemplarId||!bookId)throw new Error('Falta identificar el ejemplar.');
  if(!patron?.id||!patron?.name)throw new Error('Seleccioná o identificá a la persona que retira el ejemplar.');
  const due=new Date(dueAt);
  if(Number.isNaN(due.getTime()))throw new Error('Indicá una fecha de devolución válida.');
  return {id:crypto.randomUUID(),bookId,exemplarId,patron:{id:patron.id,name:patron.name,role:patron.role,course:patron.course||''},loanedAt:nowISO(),dueAt:due.toISOString(),returnedAt:null,status:'loaned',notes:String(notes).slice(0,1000)};
}
export function returnLoan(loan,{returnedAt=nowISO()}={}){
  if(!loan||!['loaned','overdue'].includes(loan.status))throw new Error('Este préstamo no está activo.');
  return {...loan,status:'returned',returnedAt};
}
export function refreshLoanStatus(loan,at=new Date()){
  if(!loan||loan.status!=='loaned')return loan;
  return new Date(loan.dueAt)<at?{...loan,status:'overdue'}:loan;
}
export function createReservation({bookId,patron,notes=''}){
  if(!bookId)throw new Error('Falta identificar el material.');
  if(!patron?.id||!patron?.name)throw new Error('Seleccioná o identificá a la persona que reserva.');
  return {id:crypto.randomUUID(),bookId,exemplarId:null,patron:{id:patron.id,name:patron.name,role:patron.role,course:patron.course||''},status:'requested',requestedAt:nowISO(),updatedAt:nowISO(),notes:String(notes).slice(0,1000)};
}
export function transitionReservation(reservation,status,{exemplarId=null}={}){
  if(!RESERVATION_STATES.includes(status))throw new Error('Estado de reserva inválido.');
  return {...reservation,status,exemplarId:exemplarId||reservation.exemplarId||null,updatedAt:nowISO()};
}
export function circulationStateForExemplar(exemplar,{loans=[],reservations=[]}={}){
  if(['lost','withdrawn'].includes(exemplar?.status))return exemplar.status;
  const activeLoan=loans.find(l=>l.exemplarId===exemplar.id&&['loaned','overdue'].includes(l.status));
  if(activeLoan)return refreshLoanStatus(activeLoan).status;
  const reserved=reservations.some(r=>r.exemplarId===exemplar.id&&['approved','ready'].includes(r.status));
  return reserved?'reserved':'available';
}
export function normalizeCirculationState(value){
  return CIRCULATION_STATES.includes(value)?value:'available';
}
