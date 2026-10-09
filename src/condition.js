export const PHYSICAL_CONDITIONS=Object.freeze(['Nuevo','Bueno','Regular','Deteriorado']);
export const CARE_LEVELS=Object.freeze(['normal','careful','restricted']);

const RANK=Object.freeze({Nuevo:0,Bueno:1,Regular:2,Deteriorado:3});

export function normalizePhysicalCondition(value,fallback='Bueno'){
  return PHYSICAL_CONDITIONS.includes(value)?value:fallback;
}

export function normalizeCareLevel(value,condition='Bueno'){
  if(CARE_LEVELS.includes(value))return value;
  return condition==='Deteriorado'?'careful':'normal';
}

export function nextWorseCondition(value){const condition=normalizePhysicalCondition(value);const i=PHYSICAL_CONDITIONS.indexOf(condition);return PHYSICAL_CONDITIONS[Math.min(PHYSICAL_CONDITIONS.length-1,i+1)];}

export function conditionWorsened(before,after){
  const a=RANK[normalizePhysicalCondition(before)]??1;
  const b=RANK[normalizePhysicalCondition(after)]??1;
  return b>a;
}

export function careLabel(value){
  return ({normal:'Uso normal',careful:'Usar con cuidado',restricted:'No prestar'})[value]||'Uso normal';
}

export function circulationAllowedForCare(value){
  return normalizeCareLevel(value)!=='restricted';
}

export function conditionAttentionItems({books=[],activity=[]}={}){
  const latestWorsened=new Map();
  for(const event of activity){
    if(event.type!=='holding.condition.worsened'||!event.exemplarId)continue;
    const current=latestWorsened.get(event.exemplarId);
    if(!current||Date.parse(event.createdAt||0)>Date.parse(current.createdAt||0))latestWorsened.set(event.exemplarId,event);
  }
  const items=[];
  for(const book of books)for(const copy of (book.exemplars||[])){
    const care=normalizeCareLevel(copy.careLevel,copy.condition);
    const event=latestWorsened.get(copy.id);
    const pendingWorsened=Boolean(event&&(!copy.conditionReviewedAt||Date.parse(event.createdAt)>Date.parse(copy.conditionReviewedAt)));
    if(care==='normal'&&!pendingWorsened)continue;
    const reasons=[];
    if(care==='restricted')reasons.push('No prestar');
    else if(care==='careful')reasons.push('Usar con cuidado');
    if(pendingWorsened)reasons.push('Volvió en peor estado');
    const priority=care==='restricted'?3:pendingWorsened?2:1;
    items.push({
      book,copy,careLevel:care,priority,reasons,
      note:copy.conditionNote||event?.note||'',
      worsenedAt:pendingWorsened?event.createdAt:null,
      beforeCondition:pendingWorsened?event.beforeCondition||'':null,
      currentCondition:copy.condition||'Bueno'
    });
  }
  return items.sort((a,b)=>b.priority-a.priority||Date.parse(b.worsenedAt||0)-Date.parse(a.worsenedAt||0)||String(a.book.title).localeCompare(String(b.book.title),'es'));
}
