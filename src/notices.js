import {normalizeLoanPolicy} from './loan-policy.js?v=20261010-rc1';
import {isEnabled,LABELS} from './permissions.js?v=20261010-rc1';
import {conditionAttentionItems} from './condition.js?v=20261010-rc1';

export const NOTICE_PRIORITIES={high:'Alta',medium:'Media',low:'Baja'};
export const NOTICE_AREAS={loans:'Préstamos',reservations:'Reservas',renewals:'Extensiones',permissions:'Permisos',condition:'Estado físico',inventory:'Inventario'};
const managers=['biblioteca','autoridad'];
const DAY=86400000;
const timestamp=value=>Date.parse(value||'');
const date=value=>new Date(value).toLocaleString('es-AR');

export function noticeVisibleTo(notice,actor,at=new Date()){
  return Boolean(actor?.id&&isEnabled(actor,new Date(at))&&actor.institutionId===notice.institutionId&&
    (notice.visibility.profiles.includes(actor.accessProfile)||notice.visibility.actorIds.includes(actor.id)));
}

// Pure projection of one institution. Never call config(): it initializes persisted identity.
export function deriveNotices(state,actor,{at=new Date()}={}){
  const now=+new Date(at),iid=state.institutionId;
  if(!iid||!Number.isFinite(now)||actor?.institutionId!==iid||!isEnabled(actor,new Date(now)))return [];
  const scoped=record=>!record.institutionId||record.institutionId===iid;
  const records=name=>(state[name]||[]).filter(scoped);
  const policy=normalizeLoanPolicy(records('settings').find(c=>c.id==='local')?.policy||{});
  const window=policy.renewalRequestWindowDays*DAY,notices=new Map();
  const books=records('books').map(b=>({...b,exemplars:(b.exemplars||[]).filter(scoped)}));
  const bookMap=new Map(books.map(b=>[b.id,b]));
  const patrons=new Map(records('patrons').map(p=>[p.id,p]));
  const soon=value=>Number.isFinite(timestamp(value))&&timestamp(value)>=now&&timestamp(value)<=now+window;
  const material=record=>record.title||bookMap.get(record.bookId)?.title||'Material';
  const person=id=>patrons.get(id)?.name||'Persona de la institución';
  function add(area,sourceId,type,priority,title,detail,target,ownerId='',dueAt=null){
    if(!sourceId)return;
    const id=JSON.stringify([iid,area,sourceId]);
    const notice={id,institutionId:iid,type,area,priority,title,detail,target,dueAt,
      visibility:{profiles:[...managers],actorIds:ownerId?[ownerId]:[]}};
    if(noticeVisibleTo(notice,actor,new Date(now)))notices.set(id,notice);
  }
  for(const loan of records('loans')){
    if(!['loaned','overdue'].includes(loan.status)||loan.returnedAt)continue;
    const owner=loan.patron?.id,target={route:'circulacion/'+encodeURIComponent(loan.exemplarId||''),entityId:loan.id,label:'Ver préstamo',permissions:['catalog.view']};
    const detail=`${material(loan)} · ${person(owner)} · Devolver: ${Number.isFinite(timestamp(loan.dueAt))?date(loan.dueAt):'sin fecha válida'}`;
    if(timestamp(loan.dueAt)<now)add('loans',loan.id,'loan.overdue','high','Préstamo vencido',detail,target,owner,loan.dueAt);
    else if(soon(loan.dueAt))add('loans',loan.id,'loan.due-soon','medium','Préstamo por vencer',detail,target,owner,loan.dueAt);
    // A separate task: the deadline and the approval require different actions.
    if(loan.renewalRequest?.status==='pending')add('renewals',loan.id,'renewal.pending','medium','Extensión pendiente de aprobación',`${material(loan)} · ${person(owner)} · Biblioteca debe autorizar o rechazar la solicitud.`,{...target,route:'circulacion',label:'Ver solicitud'},owner);
  }
  for(const reservation of records('reservations')){
    if(!['requested','approved','ready'].includes(reservation.status)||timestamp(reservation.expiresAt)<=now)continue;
    const expiresSoon=soon(reservation.expiresAt);
    if(reservation.status!=='ready'&&!expiresSoon)continue;
    add('reservations',reservation.id,expiresSoon?'reservation.expiring':'reservation.ready',expiresSoon?'high':'medium',
      expiresSoon?(reservation.status==='ready'?'Retiro de reserva por vencer':'Reserva por vencer'):'Reserva lista para retirar',
      `${material(reservation)} · ${person(reservation.patron?.id)}${Number.isFinite(timestamp(reservation.expiresAt))?' · Retirar hasta: '+date(reservation.expiresAt):''}`,
      {route:'reservas',entityId:reservation.id,label:'Ver reserva',permissions:['catalog.view']},reservation.patron?.id,reservation.expiresAt||null);
  }
  const grants=records('grants');
  for(const grant of grants){
    // Expiration processing marks active=false and expiredAt; revocation is different.
    if(grant.revokedAt||grant.active===false&&!grant.expiredAt||!patrons.has(grant.userId))continue;
    if(grant.startsAt&&timestamp(grant.startsAt)>now)continue;
    const expired=timestamp(grant.expiresAt)<=now;
    if(!expired&&!soon(grant.expiresAt))continue;
    if(expired&&grants.some(other=>!other.revokedAt&&other.id!==grant.id&&other.userId===grant.userId&&other.permission===grant.permission&&isEnabled(other,new Date(now))))continue;
    add('permissions',grant.id,expired?'permission.expired':'permission.expiring',expired?'medium':'low',
      expired?'Permiso temporal vencido':'Permiso temporal por vencer',
      `${person(grant.userId)} · ${LABELS[grant.permission]||grant.permission} · ${date(grant.expiresAt)}`,
      {route:'permisos/'+encodeURIComponent(grant.userId),entityId:grant.id,label:'Revisar permiso',permissions:['permissions.manage','permissions.revoke']},grant.userId,grant.expiresAt);
  }
  if(managers.includes(actor.accessProfile)){
    for(const item of conditionAttentionItems({books,activity:records('activity')})){
      add('condition',item.copy.id,'holding.attention',item.priority===3?'high':item.priority===2?'medium':'low',
        'Ejemplar que requiere atención',`${item.copy.internalCode} · ${item.book.title} · ${item.reasons.join(' · ')}`,
        {route:'ejemplar/'+encodeURIComponent(item.copy.id),entityId:item.copy.id,label:'Ver ejemplar',permissions:['catalog.view']});
    }
    for(const session of records('inventorySessions')){
      if(!['draft','open'].includes(session.status))continue;
      const draft=session.status==='draft'||!session.scope;
      const seen=new Set((session.findings||[]).filter(f=>f.status!=='unscanned').map(f=>f.exemplarId));
      const missing=[...new Set(session.expectedExemplarIds||[])].filter(id=>!seen.has(id)).length;
      add('inventory',session.id,draft?'inventory.configure':missing?'inventory.incomplete':'inventory.close','medium',
        draft?'Inventario pendiente de configuración':missing?'Inventario incompleto':'Inventario pendiente de cierre',
        draft?`${seen.size} ejemplares capturados. Falta asignar la zona.`:`${session.scope.label||'Zona configurada'} · ${missing} ejemplares esperados sin registrar. Revisá las diferencias antes de cerrar.`,
        {route:'inventario',entityId:session.id,label:'Continuar inventario',permissions:['inventory.manage']});
    }
  }
  const rank={high:0,medium:1,low:2};
  return [...notices.values()].sort((a,b)=>rank[a.priority]-rank[b.priority]||(timestamp(a.dueAt)||Infinity)-(timestamp(b.dueAt)||Infinity)||a.id.localeCompare(b.id));
}

export function filterNotices(notices,{priority='',area=''}={}){
  return notices.filter(n=>(!priority||n.priority===priority)&&(!area||n.area===area));
}
