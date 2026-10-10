import {conditionAttentionItems} from './condition.js?v=20261010-6';

const activeLoan=l=>['loaned','overdue'].includes(l.status)&&!l.returnedAt;

export function libraryAnalytics({books=[],loans=[],reservations=[],activity=[]}={}){
  const loansByBook=new Map();
  for(const loan of loans){
    if(!loan.bookId)continue;
    loansByBook.set(loan.bookId,(loansByBook.get(loan.bookId)||0)+1);
  }

  const topLoaned=books.map(book=>({
    book,
    count:loansByBook.get(book.id)||0
  })).filter(x=>x.count>0).sort((a,b)=>b.count-a.count||String(a.book.title).localeCompare(String(b.book.title),'es')).slice(0,5);

  const neverLoaned=books.filter(book=>(book.exemplars||[]).length>0&&!loansByBook.has(book.id));
  const attention=conditionAttentionItems({books,activity});
  const damaged=attention.filter(x=>x.copy.condition==='Deteriorado'||x.careLevel==='restricted');
  const overdue=loans.filter(l=>activeLoan(l)&&Date.parse(l.dueAt)<Date.now());

  const demandMap=new Map();
  for(const event of activity){
    if(event.type!=='search.no_results'||!event.query)continue;
    const key=String(event.query).trim().toLocaleLowerCase('es');
    if(!key)continue;
    const current=demandMap.get(key)||{query:String(event.query).trim(),count:0,lastAt:event.createdAt};
    current.count++;
    if(Date.parse(event.createdAt)>Date.parse(current.lastAt||0))current.lastAt=event.createdAt;
    demandMap.set(key,current);
  }
  const unmetDemand=[...demandMap.values()].sort((a,b)=>b.count-a.count||Date.parse(b.lastAt)-Date.parse(a.lastAt)).slice(0,8);
  const activeReservations=reservations.filter(r=>['requested','approved','ready'].includes(r.status));

  return {
    topLoaned,neverLoaned,damaged,attention,overdue,unmetDemand,activeReservations,
    totals:{
      materials:books.length,
      exemplars:books.reduce((n,b)=>n+(b.exemplars||[]).length,0),
      loans:loans.length,
      activeLoans:loans.filter(activeLoan).length,
      attention:attention.length,
      searchesWithoutResults:activity.filter(a=>a.type==='search.no_results').length
    }
  };
}
