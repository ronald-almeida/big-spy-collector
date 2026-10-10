import {isBrazilOffer} from './brazil.mjs';
import {parseAds} from './parser.mjs';
// Runs in the page. Preserve text, links and creatives in DOM order.
export function snapshot(){
 function walk(n){
  if(n.nodeType===3)return n.textContent;
  if(n.nodeType!==1)return '';
  const tag=n.tagName;
  if(['SCRIPT','STYLE','NOSCRIPT','SVG'].includes(tag)||n.hidden||n.getAttribute('aria-hidden')==='true')return '';
  if(tag==='IMG')return `![${n.alt||''}](${n.currentSrc||n.src})`;
  if(tag==='BR')return '\n';
  const text=Array.from(n.childNodes,walk).join('');
  if(tag==='A'&&n.href)return `[${text.trim()}](${n.href})`;
  return /^(DIV|P|SECTION|ARTICLE|LI|H[1-6])$/.test(tag)?'\n'+text+'\n':text;
 }
 return walk(document.body).replace(/\n{3,}/g,'\n\n');
}
export async function collectPages(page,{limit,start='',end='',excludeIds=[],deadline=Date.now()+48000,maxScrolls=12},clock=Date.now){
 const known=new Set(excludeIds),seen=new Map(),scrollPositions=[];let scrolls=0,stagnant=0,reason='time_limit',error='',firstBatch=0;
 const eligible=()=>[...seen.values()].filter(a=>isBrazilOffer(a)&&!known.has(a.id)&&(!start||(a.started&&a.started>=start))&&(!end||(a.started&&a.started<=end)));
 try{
  while(clock()<deadline){
   const text=await page.evaluate(snapshot);
   if(/verify you are human|unusual traffic|temporarily blocked|temporariamente bloqueado|access denied/i.test(text)){reason='blocked';error='A Meta interrompeu o acesso. Não houve tentativa de contornar o bloqueio.';break;}
   const batch=parseAds(text),before=seen.size;
   for(const ad of batch)seen.set(ad.id,ad);
   if(scrolls===0)firstBatch=seen.size;
   if(eligible().length>=limit){reason='target';break;}
   if(!seen.size&&/nenhum resultado|nenhum anúncio|\b0 resultados|no results|no ads found|\b0 results/i.test(text)){reason='empty';break;}
   const previous=scrollPositions.at(-1);
   const atEnd=!previous||previous.after+previous.height>=previous.total-5;
   stagnant=seen.size===before&&atEnd?stagnant+1:0;
   if(stagnant>=3){reason=seen.size?'stalled':'unrecognized';break;}
   if(scrolls>=maxScrolls){reason='scroll_limit';break;}
   if(deadline-clock()<4000)break;
   scrollPositions.push(await page.evaluate(()=>{
    const candidates=[document.scrollingElement,...document.querySelectorAll('div')].filter(e=>e&&e.clientHeight>200&&e.clientWidth>300&&e.scrollHeight>e.clientHeight+100&&(/auto|scroll/.test(getComputedStyle(e).overflowY)||e===document.scrollingElement));
    candidates.sort((a,b)=>(b.clientWidth*b.clientHeight)-(a.clientWidth*a.clientHeight));
    const e=candidates[0]||document.scrollingElement||document.documentElement;const before=e.scrollTop;
    e.scrollTo({top:Math.min(e.scrollHeight,e.scrollTop+Math.max(500,e.clientHeight*.8)),behavior:'instant'});
    return {tag:e.tagName,height:e.clientHeight,total:e.scrollHeight,before,after:e.scrollTop,containers:candidates.length};
   }));
   scrolls++;
   await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,1200)));
  }
 }catch(e){reason='interrupted';error='O carregamento foi interrompido; os anúncios já encontrados foram preservados.';}
 const ads=eligible().slice(0,limit);
 const descriptions={target:'Quantidade solicitada encontrada.',empty:'Nenhum anúncio encontrado.',stalled:'A página deixou de carregar novos anúncios.',unrecognized:'A página não apresentou anúncios reconhecíveis; pode exigir login ou estar incompleta.',scroll_limit:'Limite de rolagens atingido.',time_limit:'Limite de tempo atingido.',blocked:error,interrupted:error};
 return {ads,analyzed:seen.size,partial:!['target','empty'].includes(reason),stopReason:reason,scrolls,scrollPositions,firstBatch,skippedKnown:[...seen.keys()].filter(id=>known.has(id)).length,message:`${descriptions[reason]} ${seen.size} anúncios únicos analisados em ${scrolls} rolagens.`,error:!seen.size&&['blocked','unrecognized','interrupted'].includes(reason)?descriptions[reason]:undefined};
}
