import { getBooks,saveBook,getLoans,saveLoan,getReservations,saveReservation,savePatron,appendActivity } from '../storage.js?v=20261005-8';
import { makePatron,createLoan,returnLoan,createReservation,transitionReservation,refreshLoanStatus } from '../circulation.js?v=20261005-8';

async function findBookAndExemplar(bookId,exemplarId){
 const books=await getBooks();const book=books.find(b=>b.id===bookId);const exemplar=book?.exemplars?.find(e=>e.id===exemplarId);
 if(!book||!exemplar)throw new Error('No encontramos ese ejemplar en el catálogo.');
 return {book,exemplar};
}
async function setExemplarStatus(book,exemplarId,status){
 const updated={...book,exemplars:book.exemplars.map(e=>e.id===exemplarId?{...e,status}:e),updatedAt:new Date().toISOString()};
 await saveBook(updated);return updated;
}
export async function lend({bookId,exemplarId,patron:rawPatron,dueAt,notes=''}) {
 const {book,exemplar}=await findBookAndExemplar(bookId,exemplarId);
 const loans=(await getLoans()).map(l=>refreshLoanStatus(l));
 if(loans.some(l=>l.exemplarId===exemplarId&&['loaned','overdue'].includes(l.status)))throw new Error('Este ejemplar ya tiene un préstamo activo.');
 if(['lost','withdrawn','reserved'].includes(exemplar.status))throw new Error('Este ejemplar no está disponible para préstamo.');
 const patron=makePatron(rawPatron);await savePatron(patron);
 const loan=createLoan({bookId,exemplarId,patron,dueAt,notes});await saveLoan(loan);await setExemplarStatus(book,exemplarId,'loaned');
 await appendActivity({type:'loan.created',bookId,exemplarId,loanId:loan.id,patronId:patron.id});
 return loan;
}
export async function returnCopy(loanId) {
 const loans=await getLoans();const loan=loans.find(l=>l.id===loanId);
 if(!loan)throw new Error('No encontramos ese préstamo.');
 const returned=returnLoan(loan);await saveLoan(returned);
 const {book}=await findBookAndExemplar(loan.bookId,loan.exemplarId);await setExemplarStatus(book,loan.exemplarId,'available');
 await appendActivity({type:'loan.returned',bookId:loan.bookId,exemplarId:loan.exemplarId,loanId});
 return returned;
}
export async function reserve({bookId,patron:rawPatron,notes=''}) {
 const patron=makePatron(rawPatron);await savePatron(patron);
 const reservation=createReservation({bookId,patron,notes});await saveReservation(reservation);
 await appendActivity({type:'reservation.requested',bookId,reservationId:reservation.id,patronId:patron.id});
 return reservation;
}
export async function prepareReservation(reservationId) {
 const reservations=await getReservations();const reservation=reservations.find(r=>r.id===reservationId);
 if(!reservation)throw new Error('No encontramos esa reserva.');
 const books=await getBooks();const book=books.find(b=>b.id===reservation.bookId);if(!book)throw new Error('El material reservado ya no está en el catálogo.');
 const loans=await getLoans();
 const available=(book.exemplars||[]).find(e=>!['lost','withdrawn'].includes(e.status)&&!loans.some(l=>l.exemplarId===e.id&&['loaned','overdue'].includes(refreshLoanStatus(l).status)));
 if(!available)throw new Error('No hay ejemplares disponibles para preparar esta reserva.');
 const ready=transitionReservation(reservation,'ready',{exemplarId:available.id});await saveReservation(ready);await setExemplarStatus(book,available.id,'reserved');
 await appendActivity({type:'reservation.ready',bookId:book.id,exemplarId:available.id,reservationId});
 return ready;
}
export async function cancelReservation(reservationId) {
 const reservations=await getReservations();const reservation=reservations.find(r=>r.id===reservationId);if(!reservation)throw new Error('No encontramos esa reserva.');
 const cancelled=transitionReservation(reservation,'cancelled');await saveReservation(cancelled);
 if(reservation.exemplarId){const {book}=await findBookAndExemplar(reservation.bookId,reservation.exemplarId);await setExemplarStatus(book,reservation.exemplarId,'available');}
 await appendActivity({type:'reservation.cancelled',bookId:reservation.bookId,reservationId});
 return cancelled;
}
