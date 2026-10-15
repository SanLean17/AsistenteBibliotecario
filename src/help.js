import {helpArticles,glossary,contextualHelp,HELP_VERSION} from './help-content.js?v=20261015-help1';
export const normalizeHelp=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const visibleArticles=role=>helpArticles.filter(a=>a.roleVisibility.includes(role));
export function searchHelp(query,role){
 const words=normalizeHelp(query).split(' ').filter(Boolean);
 return visibleArticles(role).map(article=>{const title=normalizeHelp(article.title),keys=normalizeHelp(article.keywords.join(' ')),body=normalizeHelp(article.content.join(' '));return {article,score:words.reduce((n,w)=>n+(title.includes(w)?6:keys.includes(w)?4:body.includes(w)?1:0),0),matches:words.every(w=>[title,keys,body].some(t=>t.includes(w)))};}).filter(r=>!words.length||r.matches).sort((a,b)=>b.score-a.score).map(r=>r.article);
}
export function validateHelp(articles=helpArticles,routes=new Set(),mapping=contextualHelp){
 const issues=[],ids=new Set(articles.map(a=>a.id));
 if(ids.size!==articles.length)issues.push('Duplicate article id');
 for(const a of articles){if(!a.title||!a.summary||!a.content.length||!a.keywords.length||!a.roleVisibility.length)issues.push('Incomplete article '+a.id);if(a.version!==HELP_VERSION)issues.push('Stale version '+a.id);if(!routes.has(a.relatedRoute))issues.push('Unknown route '+a.relatedRoute);for(const id of a.relatedArticles)if(!ids.has(id))issues.push('Unknown article '+id);if(a.tour.length&&(a.tour.length<3||a.tour.length>5))issues.push('Invalid tour '+a.id);}
 for(const [route,id] of Object.entries(mapping)){if(!routes.has(route))issues.push('Unknown context route '+route);if(!ids.has(id))issues.push('Unknown contextual article '+id);}
 if(new Set(glossary.map(g=>g.term)).size!==glossary.length)issues.push('Duplicate glossary term');
 return issues;
}
export function tourTransition(state,event,article,identity){
 if(event==='start')return article?.tour.length?{id:article.id,step:0,identity}:null;
 if(!state||state.identity!==identity||state.id!==article?.id||event==='close')return null;
 const step=state.step+(event==='next'?1:event==='back'?-1:0);
 return step>=article.tour.length?null:{...state,step:Math.max(0,step)};
}
