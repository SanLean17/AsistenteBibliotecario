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
