// Synthetic MARC fixtures; byte offsets include multibyte Argentine characters.
export function isoFixture(fields,encoding='a'){
 const enc=new TextEncoder(),chunks=fields.map(([tag,data])=>({tag,bytes:enc.encode(data+'\x1e')}));let start=0,directory='';
 for(const c of chunks){directory+=c.tag+String(c.bytes.length).padStart(4,'0')+String(start).padStart(5,'0');start+=c.bytes.length;}
 const base=25+directory.length,total=base+start+1;let leader='00000nam a2200000   4500';leader=String(total).padStart(5,'0')+leader.slice(5,9)+encoding+leader.slice(10,12)+String(base).padStart(5,'0')+leader.slice(17);
 const out=new Uint8Array(total);out.set(enc.encode(leader+directory+'\x1e'));let p=base;for(const c of chunks){out.set(c.bytes,p);p+=c.bytes.length;}out[p]=29;return out;
}
export const marcFixtures={
 simple:()=>isoFixture([['001','CAT-1'],['020','  \x1fa9505470630'],['245','10\x1faEl Hobbit']]),
 authors:()=>isoFixture([['245','10\x1faAntología'],['100','1 \x1faNúñez, Ana'],['700','1 \x1faPérez, José'],['110','2 \x1faInstitución']]),
 subjects:()=>isoFixture([['245','10\x1faAves'],['650',' 4\x1faVocabulario escolar'],['650',' 4\x1faÑandú'],['022','  \x1fa0378-5955']]),
 contents:()=>isoFixture([['245','10\x1faCuentos'],['505','0 \x1faLa niña -- El árbol'],['505','0 \x1ftUn capítulo'],['500','  \x1faNota institucional'],['520','  \x1faResumen'],['490','0 \x1faSerie escolar'],['830',' 0\x1faColección']]),
 holding:()=>isoFixture([['245','10\x1faLibro'],['852','  \x1fpANT-001\x1fbSector\x1fcEstantería Ñ']]),
 local:()=>isoFixture([['245','10\x1faLibro'],['859','  \x1fa00123\x1flSala infantil\x1fhRegular\x1fm82\x1fnABC']]),
 isbn13:()=>isoFixture([['020','  \x1fa9789505470631'],['245','10\x1faEl Hobbit']]),
 invalid:()=>isoFixture([['245','10\x1fa']]).slice(0,-1),
 marc8:()=>isoFixture([['245','10\x1faSolo ASCII']],' ')
};
