import test from 'node:test';
import assert from 'node:assert/strict';
import { makePatron,createLoan,returnLoan,createReservation,transitionReservation,refreshLoanStatus,circulationStateForExemplar } from '../src/circulation.js';

test('préstamo y devolución mantienen estados coherentes',()=>{
 const patron=makePatron({name:'Docente de prueba',role:'docente',course:'5° B'});
 const loan=createLoan({bookId:'b1',exemplarId:'e1',patron,dueAt:'2030-01-10'});
 assert.equal(loan.status,'loaned');
 assert.equal(circulationStateForExemplar({id:'e1',status:'available'},{loans:[loan]}),'loaned');
 const returned=returnLoan(loan);
 assert.equal(returned.status,'returned');
 assert.equal(circulationStateForExemplar({id:'e1',status:'available'},{loans:[returned]}),'available');
});

test('marca vencido cuando supera la fecha',()=>{
 const patron=makePatron({name:'Alumno',role:'alumno'});
 const loan=createLoan({bookId:'b1',exemplarId:'e1',patron,dueAt:'2020-01-01'});
 assert.equal(refreshLoanStatus(loan,new Date('2020-01-02')).status,'overdue');
});

test('reserva pasa de solicitada a lista para retirar',()=>{
 const patron=makePatron({name:'Docente',role:'docente'});
 const reservation=createReservation({bookId:'b1',patron});
 assert.equal(reservation.status,'requested');
 const ready=transitionReservation(reservation,'ready',{exemplarId:'e1'});
 assert.equal(ready.status,'ready');
 assert.equal(ready.exemplarId,'e1');
});
