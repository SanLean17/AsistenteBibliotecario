import {execute} from '../storage.js?v=20261006-2';
export const lend=data=>execute('loan.create',data);
export const returnCopy=(id,status='available')=>execute('loan.return',{id,status});
export const reserve=data=>execute('reservation.create',data);
export const prepareReservation=(id,exemplarId)=>execute('reservation.transition',{id,status:'ready',exemplarId});
export const cancelReservation=id=>execute('reservation.transition',{id,status:'cancelled'});
