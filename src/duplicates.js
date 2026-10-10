import {canonicalISBN} from './isbn.js?v=20261009-13';

const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const normDOI=value=>String(value??'').trim().toLowerCase().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i,'');
const normURL=value=>{try{const u=new URL(String(value??'').trim());u.hash='';return u.toString().replace(/\/$/,'');}catch{return '';}}
const issn=value=>String(value??'').replace(/[^0-9Xx]/g,'').toUpperCase();

const TITLE_STOPWORDS=new Set(['de','del','la','el','los','las','un','una','y','e','en','por','para','con']);
function tokens(value){return new Set(norm(value).split(' ').filter(t=>t&&!TITLE_STOPWORDS.has(t)));}
function overlap(a,b){
  const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;
  let common=0;for(const t of A)if(B.has(t))common++;
  return common/Math.max(A.size,B.size);
}
function sameAuthor(a,b){
  const aa=norm(a).split(';')[0].trim(),bb=norm(b).split(';')[0].trim();
  return Boolean(aa&&bb&&aa===bb);
}
function exactReason(a,b){
  const ai=canonicalISBN(a.isbn),bi=canonicalISBN(b.isbn);
  if(ai&&bi&&ai===bi)return 'Mismo ISBN / edición';
  const ad=normDOI(a.doi),bd=normDOI(b.doi);
  if(ad&&bd&&ad===bd)return 'Mismo DOI';
  const au=normURL(a.resourceUrl),bu=normURL(b.resourceUrl);
  if(au&&bu&&au===bu&&['digital','articulo','documento'].includes(a.materialType||''))return 'Mismo enlace del recurso';
  const as=issn(a.issn),bs=issn(b.issn),sameIssue=norm(a.issueNumber)===norm(b.issueNumber),sameDate=String(a.publicationDate||'')===String(b.publicationDate||'');
  if(as&&bs&&as===bs&&(sameIssue||sameDate)&&(a.issueNumber||a.publicationDate)&&(b.issueNumber||b.publicationDate))return 'Mismo ISSN y edición/número';
  return '';
}

export function detectCatalogMatches(books,draft,{excludeId=''}={}){
  const title=norm(draft.title),author=draft.author||draft.authors?.join('; ')||'';
  const results=[];
  for(const book of books||[]){
    if(book.id===excludeId)continue;
    const exact=exactReason(draft,book);
    if(exact){results.push({kind:'exact-edition',score:100,reasons:[exact],book});continue;}
    if(draft.workId&&book.workId&&draft.workId===book.workId)continue;
    const sameTitle=Boolean(title&&title===norm(book.title));
    const authorMatch=sameAuthor(author,book.author||book.authors?.join('; ')||'');
    if((draft.materialType||'libro')==='libro'&&(book.materialType||'libro')==='libro'&&sameTitle&&authorMatch){
      results.push({kind:'same-work',score:85,reasons:['Mismo título y autoría','Posible otra edición'],book});continue;
    }
    const titleOverlap=overlap(draft.title,book.title);
    const samePub=Boolean(draft.publisher&&book.publisher&&norm(draft.publisher)===norm(book.publisher));
    const sameYear=Boolean(draft.year&&book.year&&String(draft.year)===String(book.year));
    if(titleOverlap>=0.75&&(authorMatch||samePub||sameYear)){
      const reasons=['Título muy parecido'];if(authorMatch)reasons.push('Autoría coincidente');if(samePub)reasons.push('Editorial coincidente');if(sameYear)reasons.push('Año coincidente');
      results.push({kind:'similar',score:60+Math.round(titleOverlap*20),reasons,book});
    }
  }
  const weight={ 'exact-edition':3,'same-work':2,similar:1 };
  return results.sort((a,b)=>weight[b.kind]-weight[a.kind]||b.score-a.score||String(a.book.title).localeCompare(String(b.book.title),'es'));
}

export function strongestMatch(books,draft,options){
  return detectCatalogMatches(books,draft,options)[0]||null;
}
