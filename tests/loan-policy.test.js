import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLoanPolicy,policyForPatron,dueDateFromPolicy,reservationExpiryFromPolicy,activeLoansForPatron} from '../src/loan-policy.js';

test('normaliza política y conserva reglas por perfil',()=>{
 const p=normalizeLoanPolicy({maxRenewals:2,reservationPickupDays:3,profiles:{docente:{loanDays:21,maxLoans:7},lector:{loanDays:5,maxLoans:1}}});
 assert.equal(p.maxRenewals,1);
 assert.equal(p.reservationPickupDays,3);
 assert.deepEqual(policyForPatron(p,{accessProfile:'docente'}),{loanDays:21,maxLoans:7});
 assert.deepEqual(policyForPatron(p,{accessProfile:'lector'}),{loanDays:5,maxLoans:1});
});

test('calcula vencimiento según perfil',()=>{
 const p=normalizeLoanPolicy({profiles:{docente:{loanDays:10,maxLoans:4}}});
 assert.equal(dueDateFromPolicy(p,{accessProfile:'docente'},new Date('2030-01-01T12:00:00Z')).toISOString(),'2030-01-11T12:00:00.000Z');
});

test('calcula plazo de retiro de reserva',()=>{
 const p=normalizeLoanPolicy({reservationPickupDays:2});
 const end=reservationExpiryFromPolicy(p,new Date('2030-01-01T10:00:00'));
 assert.equal(end.getDate(),3);
 assert.equal(end.getHours(),23);
});

test('cuenta únicamente préstamos activos de la persona',()=>{
 const loans=[
  {patron:{id:'a'},status:'loaned',returnedAt:null},
  {patron:{id:'a'},status:'overdue',returnedAt:null},
  {patron:{id:'a'},status:'returned',returnedAt:'2030-01-01'},
  {patron:{id:'b'},status:'loaned',returnedAt:null}
 ];
 assert.equal(activeLoansForPatron(loans,'a').length,2);
});


test('bloqueo por vencidos es opcional y admite tolerancia',async()=>{
 const {overdueLoansForPatron}=await import('../src/loan-policy.js');
 const loans=[{patron:{id:'a'},status:'loaned',returnedAt:null,dueAt:new Date(Date.now()-2*86400000).toISOString()}];
 assert.equal(overdueLoansForPatron(loans,'a',{blockNewLoansIfOverdue:false,overdueGraceDays:0}).length,1);
 assert.equal(overdueLoansForPatron(loans,'a',{overdueGraceDays:3}).length,0);
});
