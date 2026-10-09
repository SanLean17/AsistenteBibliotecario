export const DEFAULT_LOAN_POLICY=Object.freeze({
  allowReservations:true,
  allowRenewals:true,
  allowStaffLoans:false,
  maxRenewals:1,
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
    maxRenewals:clamp(raw.maxRenewals,0,10,DEFAULT_LOAN_POLICY.maxRenewals),
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
