const ACTIVE_LOAN=new Set(['loaned','overdue']);
const ACTIVE_RESERVATION=new Set(['requested','approved','ready']);

const validDate=value=>Number.isFinite(Date.parse(value||''))?new Date(value):null;

export function materialAvailability(book,{loans=[],reservations=[],now=new Date()}={}){
  const copies=book?.exemplars||[];
  if(!copies.length){
    if(book?.resourceUrl||book?.doi)return {status:'online',label:'Disponible en línea',availableCount:0,totalCount:0,estimatedAt:null,note:'Acceso mediante enlace o identificador digital.'};
    return {status:'no-copy',label:'Sin ejemplar físico',availableCount:0,totalCount:0,estimatedAt:null,note:'La institución no registró un ejemplar físico disponible.'};
  }

  const copyStates=copies.map(copy=>{
    const loan=loans.find(l=>l.exemplarId===copy.id&&ACTIVE_LOAN.has(l.status)&&!l.returnedAt);
    if(loan){
      const overdue=Date.parse(loan.dueAt)<+now;
      return {copy,status:overdue?'overdue':'loaned',loan,estimatedAt:overdue?null:validDate(loan.dueAt)};
    }
    const reservation=reservations.find(r=>r.exemplarId===copy.id&&ACTIVE_RESERVATION.has(r.status));
    if(reservation)return {copy,status:'reserved',reservation,estimatedAt:validDate(reservation.expiresAt)};
    if(copy.status==='lost')return {copy,status:'lost',estimatedAt:null};
    if(copy.status==='withdrawn')return {copy,status:'withdrawn',estimatedAt:null};
    if(copy.status==='damaged'||copy.condition==='Deteriorado')return {copy,status:'damaged',estimatedAt:null};
    return {copy,status:'available',estimatedAt:null};
  });

  const availableCount=copyStates.filter(x=>x.status==='available').length;
  if(availableCount){
    return {
      status:'available',
      label:'Disponible',
      availableCount,
      totalCount:copies.length,
      estimatedAt:null,
      note:availableCount===1?'Hay 1 ejemplar disponible.':'Hay '+availableCount+' ejemplares disponibles.'
    };
  }

  const overdue=copyStates.filter(x=>x.status==='overdue');
  const activeReservations=reservations.filter(r=>r.bookId===book.id&&ACTIVE_RESERVATION.has(r.status));
  const dated=copyStates.filter(x=>x.estimatedAt).sort((a,b)=>+a.estimatedAt-+b.estimatedAt);

  if(overdue.length){
    return {
      status:'unavailable',
      label:'No disponible',
      availableCount:0,
      totalCount:copies.length,
      estimatedAt:null,
      note:overdue.length===1?'Hay un préstamo vencido; no podemos estimar una fecha confiable.':'Hay préstamos vencidos; no podemos estimar una fecha confiable.',
      hasQueue:activeReservations.length>0
    };
  }

  if(dated.length){
    return {
      status:'unavailable',
      label:'No disponible',
      availableCount:0,
      totalCount:copies.length,
      estimatedAt:dated[0].estimatedAt,
      note:activeReservations.length?'Fecha estimada sujeta a la devolución y al orden de reservas.':'Fecha estimada según la devolución o liberación registrada.',
      hasQueue:activeReservations.length>0
    };
  }

  return {
    status:'unavailable',
    label:'No disponible',
    availableCount:0,
    totalCount:copies.length,
    estimatedAt:null,
    note:'No hay una fecha estimada de disponibilidad.',
    hasQueue:activeReservations.length>0
  };
}

export function formatAvailabilityEstimate(info,locale='es-AR'){
  if(!info)return '';
  if(info.status==='available'||info.status==='online')return info.label;
  if(info.estimatedAt)return info.label+' · disponibilidad estimada desde '+info.estimatedAt.toLocaleDateString(locale);
  return info.label;
}

export function exemplarAvailability(copy,{loans=[],reservations=[],now=new Date()}={}){
  const loan=loans.find(l=>l.exemplarId===copy.id&&ACTIVE_LOAN.has(l.status)&&!l.returnedAt);
  if(loan){
    const overdue=Date.parse(loan.dueAt)<+now;
    return {status:overdue?'overdue':'loaned',label:overdue?'Vencido':'Prestado',estimatedAt:overdue?null:validDate(loan.dueAt),note:overdue?'Sin fecha confiable hasta registrar la devolución.':'Disponible aproximadamente después de la devolución.'};
  }
  const reservation=reservations.find(r=>r.exemplarId===copy.id&&ACTIVE_RESERVATION.has(r.status));
  if(reservation)return {status:'reserved',label:'Reservado',estimatedAt:validDate(reservation.expiresAt),note:'Sujeto al retiro o vencimiento de la reserva.'};
  if(copy.status==='lost')return {status:'lost',label:'Extraviado',estimatedAt:null,note:'Sin fecha estimada.'};
  if(copy.status==='withdrawn')return {status:'withdrawn',label:'Dado de baja',estimatedAt:null,note:'No disponible para circulación.'};
  if(copy.status==='damaged'||copy.condition==='Deteriorado')return {status:'damaged',label:'Deteriorado',estimatedAt:null,note:'No disponible hasta revisión.'};
  return {status:'available',label:'Disponible',estimatedAt:null,note:'Puede prestarse según la política de la institución.'};
}
