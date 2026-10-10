export function publicUrl(value){
 try{const u=new URL(value),h=u.hostname.toLowerCase();
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port&&!['80','443'].includes(u.port))return false;
 if(!h.includes('.')||h.includes(':')||/^\d+\./.test(h)||/(^|\.)(localhost|local|internal|test|invalid|example)$/.test(h))return false;
 return u.href;}catch{return false;}
}
export function analyzeSnapshot(s){
 const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const lines=String(s.text||'').split(/\n+/).map(v=>v.trim()).filter(Boolean);
 const evidence=lines.filter((line,i)=>{
  const t=normalize(lines.slice(Math.max(0,i-1),i+2).join(' '));
  return /\b(grupo|comunidade)\b/.test(normalize(line))&&/\b(entre|entrar|participe|participar|acesse|acessar|clique|vip|gratuit|garant)/.test(t);
 }).slice(0,5).map(v=>v.slice(0,400));
 const groupLinks=(s.links||[]).filter(l=>{try{const u=new URL(l.href);return u.hostname==='chat.whatsapp.com'&&u.pathname.length>2||['t.me','telegram.me'].includes(u.hostname)&&/^\/(\+|joinchat\/)/.test(u.pathname);}catch{return false;}}).slice(0,8);
 const forms=(s.forms||[]).filter(f=>f.fields.some(v=>['email','tel'].includes(v.type)||/nome|name|telefone|celular|whatsapp|e-?mail/.test(normalize(v.label)))).slice(0,5);
 return {hasForm:forms.length>0,hasGroupCall:evidence.length>0,hasGroupLink:groupLinks.length>0,evidence,groupLinks,forms};
}
export async function inspectPage(browser,url){
 if(!publicUrl(url))throw Error('Endereço de destino inválido ou não público.');
 const page=await browser.newPage();
 await page.setViewport({width:1365,height:1000});
 await page.setRequestInterception(true);
 page.on('request',r=>{const safe=publicUrl(r.url());if(!safe||!['GET','HEAD'].includes(r.method())||['media','font'].includes(r.resourceType()))void r.abort().catch(()=>{});else void r.continue().catch(()=>{});});
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
 await new Promise(r=>setTimeout(r,2000));
 const snap=await page.evaluate(()=>{
  const visible=e=>!!(e.getBoundingClientRect().width&&e.getBoundingClientRect().height)&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
  const inputs=[...document.querySelectorAll('input,select,textarea')].filter(e=>visible(e)&&!['hidden','submit','button','checkbox','radio','search','password'].includes(e.type));
  const containers=[...new Set(inputs.map(e=>e.closest('form')||e.parentElement))];
  return {title:document.title,text:document.body?.innerText.slice(0,100000)||'',iframes:document.querySelectorAll('iframe').length,
   links:[...document.querySelectorAll('a[href]')].filter(visible).map(a=>({href:a.href,text:a.innerText.slice(0,120)})),
   forms:containers.map(f=>({fields:inputs.filter(e=>f.contains(e)).map(e=>({type:e.type||e.tagName.toLowerCase(),label:(e.labels?.[0]?.innerText||e.getAttribute('aria-label')||e.getAttribute('placeholder')||e.name||'Campo').slice(0,100)}))}))};
 });
 const blocked=!response?.ok()||/just a moment|verify you are human|verifique se.*humano|access denied|checking your browser/i.test(snap.title+' '+snap.text.slice(0,1500));
 if(blocked||snap.text.trim().length<30)return {status:'incomplete',message:'A página não pôde ser lida completamente. Pode haver bloqueio, erro ou conteúdo carregado apenas após interação.',url:page.url(),checkedAt:new Date().toISOString()};
 return {status:'done',...analyzeSnapshot(snap),url:page.url(),title:snap.title.slice(0,200),checkedAt:new Date().toISOString(),message:snap.iframes?'Análise do conteúdo principal. Formulários incorporados em outras páginas podem não aparecer.':'Análise do conteúdo visível, sem enviar formulários nem entrar em grupos.'};
}
