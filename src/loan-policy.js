export const DEFAULT_LOAN_POLICY=Object.freeze({
  allowReservations:true,
  allowRenewals:true,
  allowStaffLoans:false,
  maxRenewals:1,
  blockNewLoansIfOverdue:false,
  overdueGraceDays:0,
  renewalRequestWindowDays:1,
  renewalExtensionDays:7,
  reservationPickupDays:2,
  profiles:Object.freeze({
    autoridad:Object.freeze({loanDays:14,maxLoans:5}),
    biblioteca:Object.freeze({loanDays:14,maxLoans:5}),
    docente:Object.freeze({loanDays:14,maxLoans:5}),
    personal:Object.freeze({loanDays:7,maxLoans:2}),
    lector:Object.freeze({loanDays:7,maxLoans:2})
  })
});

const clamp=(value,min,max,fallback)=>{
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):fallback;
};

export function normalizeLoanPolicy(raw={}){
  const profiles={};
  for(const [profile,defaults] of Object.entries(DEFAULT_LOAN_POLICY.profiles)){
    const incoming=raw.profiles?.[profile]||{};
    profiles[profile]={
      loanDays:clamp(incoming.loanDays,1,180,defaults.loanDays),
      maxLoans:clamp(incoming.maxLoans,1,50,defaults.maxLoans)
    };
  }
  return {
    allowReservations:raw.allowReservations!==false,
    allowRenewals:raw.allowRenewals!==false,
    allowStaffLoans:raw.allowStaffLoans===true,
    blockNewLoansIfOverdue:raw.blockNewLoansIfOverdue===true,
    overdueGraceDays:clamp(raw.overdueGraceDays,0,30,DEFAULT_LOAN_POLICY.overdueGraceDays),
    maxRenewals:raw.allowRenewals===false?0:1,
    renewalRequestWindowDays:clamp(raw.renewalRequestWindowDays,1,14,DEFAULT_LOAN_POLICY.renewalRequestWindowDays),
    renewalExtensionDays:clamp(raw.renewalExtensionDays,1,90,DEFAULT_LOAN_POLICY.renewalExtensionDays),
    reservationPickupDays:clamp(raw.reservationPickupDays,1,30,DEFAULT_LOAN_POLICY.reservationPickupDays),
    profiles
  };
}

export function policyForPatron(policy,patron){
  const normalized=normalizeLoanPolicy(policy);
  const profile=patron?.accessProfile||'lector';
  return normalized.profiles[profile]||normalized.profiles.lector;
}

export function activeLoansForPatron(loans,patronId){
  return (loans||[]).filter(l=>l.patron?.id===patronId&&['loaned','overdue'].includes(l.status)&&!l.returnedAt);
}

export function dueDateFromPolicy(policy,patron,from=new Date()){
  const {loanDays}=policyForPatron(policy,patron);
  const d=new Date(from);
  d.setDate(d.getDate()+loanDays);
  return d;
}

export function reservationExpiryFromPolicy(policy,from=new Date()){
  const {reservationPickupDays}=normalizeLoanPolicy(policy);
  const d=new Date(from);
  d.setDate(d.getDate()+reservationPickupDays);
  d.setHours(23,59,59,999);
  return d;
}

export function daysUntilDue(loan,at=new Date()){
  return (Date.parse(loan?.dueAt||'')-+at)/86400000;
}
export function renewalRequestStatus(loan,policy,{reservations=[],book=null,at=new Date()}={}){
  const p=normalizeLoanPolicy(policy);
  if(!loan||!['loaned','overdue'].includes(loan.status)||loan.returnedAt)return {allowed:false,reason:'inactive'};
  if(!p.allowRenewals||p.maxRenewals<1)return {allowed:false,reason:'disabled'};
  if(book?.circulationPolicy==='non-renewable'||book?.circulationPolicy==='room-only')return {allowed:false,reason:'material'};
  if((loan.renewals||0)>=p.maxRenewals)return {allowed:false,reason:'limit'};
  if(loan.renewalRequest?.status==='pending')return {allowed:false,reason:'pending'};
  if(Date.parse(loan.dueAt)<+at)return {allowed:false,reason:'overdue'};
  if(reservations.some(r=>r.bookId===loan.bookId&&r.patron?.id!==loan.patron?.id&&['requested','approved','ready'].includes(r.status)))return {allowed:false,reason:'reserved'};
  const remaining=daysUntilDue(loan,at);
  if(remaining>p.renewalRequestWindowDays)return {allowed:false,reason:'too-early',days:remaining};
  return {allowed:true,reason:'eligible',days:remaining};
}
export function renewalDueDate(policy,loan){
  const p=normalizeLoanPolicy(policy),d=new Date(loan.dueAt);
  d.setDate(d.getDate()+p.renewalExtensionDays);
  return d;
}

export function overdueLoansForPatron(loans,patronId,policy,at=new Date()){
  const p=normalizeLoanPolicy(policy),cutoff=+at-p.overdueGraceDays*86400000;
  return activeLoansForPatron(loans,patronId).filter(l=>Date.parse(l.dueAt)<cutoff);
}
