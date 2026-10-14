import 'server-only';
export async function runEngine(source:'manual'|'scheduled',savedOnly:boolean){
 const base=process.env.BACKEND_URL,token=process.env.BACKEND_TOKEN;
 if(!base||!token)throw Error('Conexão com os dados não configurada.');
 const deadline=Date.now()+235000;const results=[];
 for(let i=0;i<10&&Date.now()<deadline-90000;i++){
  const r=await fetch(new URL('/api/discover',base),{method:'POST',headers:{'Content-Type':'application/json','OAI-Sites-Authorization':'Bearer '+token},body:JSON.stringify({action:'tick',source,savedOnly}),signal:AbortSignal.timeout(90000),redirect:'manual',cache:'no-store'});
  if(!(r.headers.get('content-type')||'').includes('application/json'))throw Error('Falha na conexão com o motor.');
  const result=await r.json();results.push(result);
  if(!r.ok||result.stop||result.error)break;
 }
 return {ok:true,results};
}
