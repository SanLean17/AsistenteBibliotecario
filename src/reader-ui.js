import {readState,getActorId,getInstitutionId,execute} from './storage.js?v=20261010-7';
import {hasPermission} from './permissions.js?v=20261010-7';
import {operationalProfile,renderPersonalLibrary,materialActions} from './reader.js?v=20261010-7';

export async function renderReader(route){
 const [base]=route.split('/');
 if(!['mi-biblioteca','mis-prestamos','mis-reservas','guardados','circulacion','reservas'].includes(base))return false;
 const actorId=getActorId(),institutionId=getInstitutionId();
 const state=await readState();
 if(actorId!==getActorId()||institutionId!==getInstitutionId())return true;
 const actor=state.patrons.find(p=>p.id===actorId);
 const can=p=>hasPermission(actor,p,state.grants);
 if(['circulacion','reservas'].includes(base)&&(operationalProfile(actor)||['circulation.loan','circulation.return','circulation.renew.approve','reservations.manage'].some(can)))return false;
 if((location.hash.slice(1)||'inicio')!==route)return true;
 const view=({circulacion:'mis-prestamos',reservas:'mis-reservas'})[base]||base;
 document.querySelector('#main').innerHTML=renderPersonalLibrary(state,actor,view);
 return true;
}

export function initReaderUI(refresh){
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-reader-command]');if(!button||button.disabled)return;
  const command=button.dataset.readerCommand;
  if(!['saved.toggle','reservation.create','loan.renew.request'].includes(command))return;
  const actorId=getActorId(),institutionId=getInstitutionId(),route=location.hash;
  button.disabled=true;
  try{
   const state=await readState();
   if(actorId!==getActorId()||institutionId!==getInstitutionId())return;
   const actor=state.patrons.find(p=>p.id===actorId),book=state.books.find(b=>b.id===button.dataset.bookId);
   if(command==='reservation.create'){
    if(!book)throw new Error('El material ya no está en el catálogo.');
    const eligibility=materialActions(state,actor,book);
    if(!eligibility.canReserve)throw new Error(eligibility.reservationReason);
   }
   await execute(command,{id:button.dataset.id,bookId:button.dataset.bookId,patronId:actorId});
   if(route!==location.hash||actorId!==getActorId()||institutionId!==getInstitutionId())return;
   await refresh();
   const feedback=document.querySelector('#reader-feedback');
   if(feedback)feedback.textContent=({'saved.toggle':'Guardados actualizados.','reservation.create':'Reserva solicitada. Biblioteca confirmará su estado.','loan.renew.request':'Extensión solicitada. Pendiente de autorización.'})[command];
  }catch(error){
   if(route===location.hash&&actorId===getActorId()&&institutionId===getInstitutionId()){const feedback=document.querySelector('#reader-feedback');if(feedback)feedback.textContent=error.message;}
  }finally{button.disabled=false;}
 });
}
