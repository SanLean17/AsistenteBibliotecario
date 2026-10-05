const normalize = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// Controlled Spanish vocabulary. Unrecognized terms remain in sourceSubjects;
// do not invent translations or expose a long, multilingual source list by default.
const topics = [
 ['Fantasía',/fantasy|fantasti/],['Aventuras',/adventure|aventura|quests/],['Literatura juvenil',/young adult|juvenile|youth|juvenil/],
 ['Literatura infantil',/children|infantil/],['Ciencia ficción',/science fiction|ciencia ficcion/],['Poesía',/poetry|poesia|poems/],
 ['Cuentos',/short stories|fairy tales|cuentos/],['Misterio',/mystery|detective|misterio/],['Terror',/horror|terror/],
 ['Historia',/\bhistory\b|\bhistoria\b/],['Ciencias',/\bscience\b(?! fiction)|\bciencias\b/],['Naturaleza',/nature|naturaleza/],
 ['Animales',/\banimals\b|\banimales\b/],['Magia',/magic|magia|wizards|magiciens/],['Dragones',/dragons|dragones/],
 ['Amistad',/friendship|amistad/],['Familia',/family|familia/],['Escuela',/school|escuela/],['Valentía',/courage|valentia/],
 ['Bien y mal',/good and evil|bien y mal/],['Clásicos',/classics|clasicos/],['Novela',/\bnovels\b|\bnovela\b/],
 ['Biografías',/biograph|biografia/],['Geografía',/geography|geografia/],['Matemática',/mathematics|matematica/],
 ['Arte',/\bart\b|\barte\b/],['Música',/music|musica/],['Mitología',/mythology|mitologia/],
 ['Segunda Guerra Mundial',/world war.*(1939|ii|2)|segunda guerra mundial/],['Murciélagos',/\bbats\b|murcielago/],
 ['Tierra Media',/middle[ -]earth|tierra media|terre du milieu/],['Hobbits',/hobbits/],['Elfos',/\belves\b|\belfos\b/],
 ['Enanos',/\bdwarves\b|\bdwarfs\b|\benanos\b/],['Ficción',/^fiction$|^ficcion$/]
];
export function spanishSubjects(subjects=[]) {
 const text=subjects.map(normalize).join(' | ');
 return topics.filter(([,pattern])=>pattern.test(text)).map(([label])=>label);
}
export function suggestCategory(subjects=[]) {
 const text=subjects.map(normalize).join(' | ');
 // Explicit forms take priority over broad fiction/children labels shared by works.
 if(/\bnovela\b|\bnovels\b/.test(text))return 'Novela';
 if(/poetry|poesia|poems/.test(text))return 'Poesía';
 if(/short stories|fairy tales|cuentos/.test(text))return 'Cuentos';
 if(/nonfiction|non-fiction|informativo|encyclop|enciclop|textbook/.test(text))return 'Informativo';
 return 'Otros';
}
export function localizeBook(book) {
 if(book.subjectsLocalized || !book.sources?.length)return book;
 const original=book.sourceSubjects?.length?book.sourceSubjects:(book.subjects||[]);
 const suggested=suggestCategory(original);
 return {...book,sourceSubjects:original,subjects:spanishSubjects(original),subjectsLocalized:true,
   category:book.category && book.category!=='Otros'?book.category:suggested,
   categorySuggested:(!book.category||book.category==='Otros')&&suggested!=='Otros'};
}
