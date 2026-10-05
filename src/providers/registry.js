// Only enabled providers participate in browser lookups. Future services never
// appear as successful sources until an adapter returns a verified edition.
export const PROVIDERS = Object.freeze([
  {id:'open-library',name:'Open Library',status:'active',transport:'https'},
  {id:'google-books',name:'Google Books',status:'active',transport:'https'},
  {id:'bn-argentina',name:'Biblioteca Nacional Mariano Moreno',status:'adapter-ready',transport:'server-z3950'},
  {id:'bnm',name:'Biblioteca Nacional de Maestros',status:'official-access-needed',transport:null},
  {id:'isbn-argentina',name:'ISBN Argentina',status:'official-access-needed',transport:null},
  {id:'isbndb',name:'ISBNdb',status:'future-commercial',transport:null},
  {id:'oclc',name:'WorldCat/OCLC',status:'future-commercial',transport:null}
]);
export const SOURCE_NAMES=PROVIDERS.map(p=>p.name);
