export const MATERIAL_TYPES=Object.freeze({
  libro:'Libro',
  revista:'Revista',
  diario:'Diario / periódico',
  articulo:'Artículo',
  documento:'Documento',
  produccion:'Producción escolar',
  digital:'Recurso digital',
  otro:'Otro material'
});

export const MATERIAL_PROFILES=Object.freeze({
  libro:{
    label:'Libro',
    identifierHint:'ISBN cuando exista',
    contentsLabel:'Cuentos, capítulos o partes',
    physicalDefault:1,
    fields:['isbn','publisher','year','pages','language','edition','audience']
  },
  revista:{
    label:'Revista',
    identifierHint:'ISSN cuando exista',
    contentsLabel:'Artículos, notas, secciones o dossier',
    physicalDefault:1,
    fields:['publication','issn','publicationDate','volume','issueNumber','publisher','language']
  },
  diario:{
    label:'Diario / periódico',
    identifierHint:'ISSN si corresponde',
    contentsLabel:'Titulares, artículos, suplementos o secciones',
    physicalDefault:1,
    fields:['publication','issn','publicationDate','editionLabel','issueNumber','publisher']
  },
  articulo:{
    label:'Artículo',
    identifierHint:'DOI o URL cuando exista',
    contentsLabel:'Apartados o temas internos',
    physicalDefault:0,
    fields:['containerTitle','doi','resourceUrl','publicationDate','volume','issueNumber','pageRange','language']
  },
  documento:{
    label:'Documento',
    identifierHint:'Número de documento o URL',
    contentsLabel:'Secciones o apartados',
    physicalDefault:1,
    fields:['issuingBody','documentNumber','publicationDate','resourceUrl','language']
  },
  produccion:{
    label:'Producción escolar',
    identifierHint:'Identificador interno si existe',
    contentsLabel:'Secciones, capítulos o partes',
    physicalDefault:1,
    fields:['schoolArea','courseLevel','publicationDate','language']
  },
  digital:{
    label:'Recurso digital',
    identifierHint:'URL o DOI',
    contentsLabel:'Secciones o contenidos',
    physicalDefault:0,
    fields:['resourceUrl','doi','digitalFormat','publicationDate','language']
  },
  otro:{
    label:'Otro material',
    identifierHint:'Identificador si existe',
    contentsLabel:'Contenido interno',
    physicalDefault:1,
    fields:['otherIdentifier','publicationDate','language']
  }
});

export const profileForMaterial=type=>MATERIAL_PROFILES[type]||MATERIAL_PROFILES.otro;

const text=(value,max=500)=>String(value??'').trim().slice(0,max);

export function normalizeContentEntries(value){
  const list=Array.isArray(value)?value:String(value??'').split(/\n|;/);
  return list.slice(0,500).map((entry,index)=>{
    if(typeof entry==='string'){
      const title=text(entry);
      return title?{id:'content-'+index,kind:'item',title,author:'',page:'',source:'manual'}:null;
    }
    if(!entry||typeof entry!=='object')return null;
    const title=text(entry.title);
    if(!title)return null;
    return {
      id:text(entry.id,100)||'content-'+index,
      kind:text(entry.kind,40)||'item',
      title,
      author:text(entry.author,180),
      page:text(entry.page,40),
      source:text(entry.source,80)||'manual'
    };
  }).filter(Boolean);
}

export function contentSearchText(book){
  const entries=normalizeContentEntries(book.contentEntries?.length?book.contentEntries:book.contents);
  return entries.flatMap(e=>[e.title,e.author,e.page,e.kind]).join(' ');
}

export function createAssistanceDraft({materialId='',captureKind='cover',imageRef=''}={}){
  return {
    version:1,
    status:'not-requested',
    materialId,
    captureKind:['cover','title-page','copyright-page','index','newspaper-front','magazine-cover','document','other'].includes(captureKind)?captureKind:'cover',
    imageRef:text(imageRef,200),
    createdAt:new Date().toISOString(),
    proposals:[],
    confirmedAt:null
  };
}

export function normalizeAssistanceProposal(raw={}){
  return {
    id:text(raw.id,100)||crypto.randomUUID(),
    field:text(raw.field,80),
    value:Array.isArray(raw.value)?raw.value.map(v=>text(v)).filter(Boolean):text(raw.value,5000),
    confidence:Number.isFinite(Number(raw.confidence))?Math.max(0,Math.min(1,Number(raw.confidence))):null,
    source:text(raw.source,80)||'photo-assistance',
    status:['proposed','accepted','rejected','edited'].includes(raw.status)?raw.status:'proposed'
  };
}
