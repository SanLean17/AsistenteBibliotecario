// References are identifiers, never authorization tokens or school names.
export function holdingReference(institutionId, internalCode) {
  for (const value of [institutionId, internalCode]) {
    if (typeof value !== 'string' || !value || value !== value.trim() || value.length > 160)
      throw new Error('Identidad de ejemplar inválida.');
  }
  if (institutionId === 'local-institution') throw new Error('La institución necesita una identidad de intercambio.');
  return `ab-holding:v1:${encodeURIComponent(institutionId)}:${encodeURIComponent(internalCode)}`;
}

export function parseHoldingReference(reference) {
  const match = typeof reference === 'string' && reference.match(/^ab-holding:v1:([^:]+):([^:]+)$/);
  if (!match) throw new Error('Referencia de ejemplar inválida.');
  let institutionId, internalCode;
  try { institutionId = decodeURIComponent(match[1]); internalCode = decodeURIComponent(match[2]); }
  catch { throw new Error('Referencia de ejemplar inválida.'); }
  if (holdingReference(institutionId, internalCode) !== reference) throw new Error('Referencia de ejemplar no canónica.');
  return {institutionId, internalCode};
}

export function shareableHolding(exemplar, institutionId) {
  if (typeof exemplar?.id !== 'string' || !exemplar.id) throw new Error('Ejemplar sin identidad técnica.');
  return {exemplarId: exemplar.id, institutionId, internalCode: exemplar.internalCode,
    globalHoldingRef: holdingReference(institutionId, exemplar.internalCode)};
}

export function validateSharedHolding(holding, institutionId) {
  if (!holding || Object.keys(holding).some(key => !['exemplarId','institutionId','internalCode','globalHoldingRef'].includes(key)))
    throw new Error('Identidad compartida inválida.');
  const expected = shareableHolding({id: holding.exemplarId, internalCode: holding.internalCode}, institutionId);
  if (holding.institutionId !== institutionId || holding.globalHoldingRef !== expected.globalHoldingRef)
    throw new Error('La referencia no coincide con la institución propietaria.');
  return holding;
}
