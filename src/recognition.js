import {cleanISBN,validISBN} from './isbn.js?v=20261010-6';
import {MATERIAL_TYPES,profileForMaterial} from './material-types.js?v=20261010-6';
export {MATERIAL_TYPES};
export function validISSN(value){const s=String(value||'').replace(/^ISSN\s*:?[ ]*/i,'').replace(/[ -]/g,'').toUpperCase();return /^\d{7}[\dX]$/.test(s)&&([...s.slice(0,7)].reduce((sum,n,i)=>sum+Number(n)*(8-i),0)+(s[7]==='X'?10:Number(s[7])))%11===0;}
// A QR is a carrier, not a material type. Classify its contents without opening links.
export function recognizeIdentifier(value){const raw=String(value||'').trim().slice(0,2000),isbn=cleanISBN(raw.replace(/^ISBN(?:-1[03])?\s*:?\s*/i,''));if(/^(?:ISBN(?:-1[03])?\s*:?\s*)?[\dXx -]+$/i.test(raw)&&validISBN(isbn))return {kind:'isbn',value:isbn};
 const issn=raw.replace(/^ISSN\s*:?\s*/i,'').replace(/[ -]/g,'').toUpperCase();if(validISSN(issn))return {kind:'issn',value:issn.slice(0,4)+'-'+issn.slice(4)};
 const doi=raw.replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i,'');if(/^10\.\d{4,9}\/\S+$/i.test(doi))return {kind:'doi',value:doi};
 if(/^AB-\d{6,}$/.test(raw.toUpperCase()))return {kind:'internal',value:raw.toUpperCase()};
 try{const url=new URL(raw);if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password){for(const key of ['isbn','ISBN']){const v=url.searchParams.get(key);if(v&&validISBN(cleanISBN(v)))return {kind:'isbn',value:cleanISBN(v)};}return {kind:'url',value:url.href};}}catch{}
 return {kind:'unknown',value:raw};}
export function identifierDraft(value){const r=recognizeIdentifier(value),materialType=r.kind==='url'?'digital':r.kind==='doi'?'articulo':r.kind==='issn'?'revista':r.kind==='isbn'?'libro':'otro',profile=profileForMaterial(materialType);return {copies:profile.physicalDefault,category:'Otros',materialType,isbn:r.kind==='isbn'?r.value:'',issn:r.kind==='issn'?r.value:'',doi:r.kind==='doi'?r.value:'',resourceUrl:r.kind==='url'?r.value:'',otherIdentifier:r.kind==='unknown'?r.value:''};}
