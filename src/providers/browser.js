import { googleRecord, openLibraryRecord } from './records.js?v=20261010-7';

export function createBrowserProviders(){
 return [
  {id:'open-library',name:'Open Library',async lookup({isbn,variants,fetchJSON}){
   const keys=variants.map(v=>'ISBN:'+v).join(',');
   return openLibraryRecord(await fetchJSON(`https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(keys)}&jscmd=data&format=json`),isbn);
  }},
  {id:'google-books',name:'Google Books',async lookup({isbn,variants,fetchJSON}){
   let lastError,answered=false;
   for(const variant of variants){
    try{const data=await fetchJSON(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(variant)}&maxResults=10&printType=books`);answered=true;const record=googleRecord(data,isbn);if(record)return record;}
    catch(error){if(error.name==='AbortError')throw error;lastError=error;}
   }
   if(!answered&&lastError)throw lastError;
   return null;
  }}
 ];
}
