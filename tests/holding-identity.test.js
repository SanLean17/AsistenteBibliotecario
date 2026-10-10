import test from 'node:test';
import assert from 'node:assert/strict';
import {holdingReference,parseHoldingReference,shareableHolding} from '../src/holding-identity.js';
import {STORES,normalizeHoldings,config} from '../src/local-domain.js';
import {formatInventoryCode} from '../src/domain.js';
import {shareableCatalogRecord,validateSharedCatalogRecord,buildFederatedSearchDocument} from '../src/federation.js';
const state=()=>Object.fromEntries(STORES.map(k=>[k,[]]));
const book=(institutionId,internalCode)=>({id:crypto.randomUUID(),institutionId,title:'Atlas',exemplars:[{id:crypto.randomUUID(),internalCode}]});

test('same AB in two institutions has distinct references and preserved UUIDs',()=>{
 const s=state();s.books=[book('school-a','AB-000001'),book('school-b','AB-000001')];
 const ids=s.books.map(b=>b.exemplars[0].id);normalizeHoldings(s);
 const refs=s.books.map(b=>shareableHolding(b.exemplars[0],b.institutionId));
 assert.notEqual(refs[0].globalHoldingRef,refs[1].globalHoldingRef);
 assert.deepEqual(refs.map(r=>r.exemplarId),ids);
 assert.deepEqual(refs.map(r=>r.internalCode),['AB-000001','AB-000001']);
});
test('existing legacy codes and UUIDs are never renumbered; same institution collisions reject',()=>{
 const s=state();s.books=[book('school-a','AB00001')];normalizeHoldings(s);
 const before=structuredClone(s.books[0].exemplars[0]);normalizeHoldings(s);
 assert.equal(s.books[0].exemplars[0].internalCode,'AB00001');assert.equal(s.books[0].exemplars[0].id,before.id);
 s.books.push(book('school-a','AB00001'));assert.throws(()=>normalizeHoldings(s),/duplicado/);
});
test('allocator and formatter grow past six and seven digits',()=>{
 for(const n of [999999,1000000,9999999,10000000])assert.equal(formatInventoryCode(n),'AB-'+n);
 assert.equal(formatInventoryCode(1),'AB-000001');
 const s=state();s.books=[book('school-a','AB-999999'),book('school-a',undefined)];normalizeHoldings(s);
 assert.equal(s.books[1].exemplars[0].internalCode,'AB-1000000');
 normalizeHoldings(s);assert.equal(s.books[1].exemplars[0].internalCode,'AB-1000000');
});
test('reference roundtrip is lossless and rejects malformed or ambiguous encodings',()=>{
 for(const pair of [['school-a','AB-1000000'],['school:b/%é','AB00001']]){
  const ref=holdingReference(...pair);assert.deepEqual(parseHoldingReference(ref),{institutionId:pair[0],internalCode:pair[1]});
 }
 for(const ref of ['', 'ab-holding:v2:a:b','ab-holding:v1:a:%ZZ','ab-holding:v1:a:b:c','ab-holding:v1:%61:b'])assert.throws(()=>parseHoldingReference(ref));
 assert.throws(()=>holdingReference('local-institution','AB-000001'));
});
test('legacy installation identity persists through rename and backup, distinct installations differ',()=>{
 const a=state(),b=state();normalizeHoldings(a);normalizeHoldings(b);
 const id=config(a).federationInstitutionId;assert.notEqual(id,config(b).federationInstitutionId);
 config(a).institutionName='Nuevo nombre';normalizeHoldings(a);
 const restored=JSON.parse(JSON.stringify(a));normalizeHoldings(restored);assert.equal(config(restored).federationInstitutionId,id);
 const c=state();c.settings=[{id:'local',institutionId:crypto.randomUUID(),sequence:1}];
 assert.equal(config(c).federationInstitutionId,config(c).institutionId);
});
test('federation v1 keeps aggregate contract and optionally roundtrips safe holding identities',()=>{
 const b=book('school-a','AB-000001');b.exemplars[0].borrower={name:'Private'};b.exemplars[0].location='Private';
 const old=shareableCatalogRecord(b,{institutionId:'school-a'});assert.equal(old.holdings.items,undefined);validateSharedCatalogRecord(old);
 const record=shareableCatalogRecord(b,{institutionId:'school-a',includeHoldings:true});
 const restored=JSON.parse(JSON.stringify(record));validateSharedCatalogRecord(restored);
 assert.equal(restored.version,1);assert.equal(buildFederatedSearchDocument([restored])[0].availability.items[0].exemplarId,b.exemplars[0].id);
 assert.doesNotMatch(JSON.stringify(record),/Private|borrower|location/);
 restored.holdings.items[0].institutionId='school-b';assert.throws(()=>validateSharedCatalogRecord(restored));
 const bad=structuredClone(record);bad.holdings.items.push(bad.holdings.items[0]);assert.throws(()=>validateSharedCatalogRecord(bad),/duplicado/);
});
