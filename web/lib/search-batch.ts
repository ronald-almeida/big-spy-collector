export type BatchItem={word:string;status:'waiting'|'running'|'done'|'error';message:string};
export async function searchBatch(words:string[],options:{limit:number;start:string;end:string},hooks:{update:(items:BatchItem[])=>void;stopped:()=>boolean},deps:{request?:typeof fetch;wait?:(ms:number)=>Promise<void>;now?:()=>number}={}){
 const request=deps.request||fetch,wait=deps.wait||(ms=>new Promise(r=>setTimeout(r,ms))),now=deps.now||Date.now;
 const items:BatchItem[]=[...new Set(words.map(w=>w.trim()).filter(Boolean))].map(word=>({word,status:'waiting',message:''}));
 const publish=()=>hooks.update(items.map(i=>({...i})));publish();let previous:number|null=null;
 for(const item of items){
  if(hooks.stopped())break;
  if(previous!==null){let remaining=21000-(now()-previous);while(remaining>0&&!hooks.stopped()){const n=Math.min(500,remaining);await wait(n);remaining-=n;}}
  if(hooks.stopped())break;
  item.status='running';publish();previous=now();
  try{
   const r=await request('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word:item.word,...options}),signal:AbortSignal.timeout(95000)});
   const d=await r.json();item.status=r.ok?'done':'error';item.message=r.ok?d.message||'Busca concluída.':d.error||'Não foi possível pesquisar.';publish();
   if(!r.ok&&(r.status===401||r.status===429||/limite de uso|franquia|demorou mais|não configurad/i.test(item.message)))break;
  }catch{item.status='error';item.message='A conexão foi interrompida. Confira o histórico antes de repetir esta busca.';publish();break;}
 }
 return items;
}
