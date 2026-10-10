import puppeteer from '@cloudflare/puppeteer';
import {collectPages} from './pagination.mjs';
const json=(data,status=200)=>Response.json(data,{status});
export default {async fetch(request,env){
 if(request.method==='GET')return json({service:'BIG Spy',version:'collector-br-2',configured:!!env.BROWSER&&!!env.COLLECTOR_TOKEN});
 if(request.method!=='POST')return json({error:'Use POST.'},405);
 if(!env.COLLECTOR_TOKEN||request.headers.get('Authorization')!==`Bearer ${env.COLLECTOR_TOKEN}`)return json({error:'Acesso não autorizado.'},401);
 if(!env.BROWSER)return json({error:'Vínculo BROWSER não configurado.'},503);
 let browser,timer;const begun=Date.now();
 try{
  const p=await request.json();
  if(!p||typeof p.word!=='string'||!p.word.trim()||p.word.length>120||!Number.isInteger(p.limit)||p.limit<1||p.limit>100)return json({error:'Informe word e limit entre 1 e 100.'},400);
  const start=p.start||'',end=p.end||'',today=new Date().toISOString().slice(0,10);
  if(typeof start!=='string'||typeof end!=='string'||[start,end].some(v=>v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||v>today))||(start&&end&&start>end))return json({error:'Período inválido.'},400);
  if(p.excludeIds!==undefined&&(!Array.isArray(p.excludeIds)||p.excludeIds.length>10000||p.excludeIds.some(id=>typeof id!=='string'||!/^\d+$/.test(id))))return json({error:'Lista de anúncios já vistos inválida.'},400);
  const url=new URL('https://www.facebook.com/ads/library/');
  for(const [k,v] of Object.entries({country:'BR',ad_type:'all',active_status:'active',search_type:'keyword_unordered',media_type:'all',q:p.word.trim()}))url.searchParams.set(k,v);
  browser=await puppeteer.launch(env.BROWSER);
  timer=setTimeout(()=>{void browser.close().catch(()=>{});},Math.max(1,55000-(Date.now()-begun)));
  const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
  await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:25000});
  try{await page.waitForFunction(()=>/Library ID|Identificação da biblioteca|no results|nenhum resultado|verify you are human|temporariamente bloqueado/i.test(document.body.innerText),{timeout:Math.min(15000,Math.max(1,48000-(Date.now()-begun)))});}catch{}
  const result=await collectPages(page,{limit:p.limit,start,end,excludeIds:p.excludeIds||[],deadline:begun+50000});
  return json({...result,durationMs:Date.now()-begun},result.error?502:200);
 }catch(e){
  const message=String(e?.message||e);
  const quota=/429|limit exceeded|too many|quota/i.test(message);
  console.error('Coleta interrompida:',message);
  return json({error:quota?'Limite de uso da Cloudflare atingido. Aguarde a renovação da franquia ou confira o plano Workers Paid.':'Não foi possível concluir a coleta. Tente novamente e confira o histórico.'},quota?429:502);
 }finally{if(timer)clearTimeout(timer);if(browser)try{await browser.close();}catch{}}
}};
