import {auth} from './auth';
export async function proxy(request:Request,path:'data'|'search'|'feedback'|'discover'){
  const session=await auth();
  if(!session?.user)return Response.json({error:'Entre na sua conta para continuar.'},{status:401});
  if(request.method!=='GET'){
    const origin=request.headers.get('origin');
    if(!origin||origin!==new URL(request.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
  }
  const base=process.env.BACKEND_URL,token=process.env.BACKEND_TOKEN;
  if(!base||!token)return Response.json({error:'Conexão com os dados não configurada.'},{status:503});
  try{
    const response=await fetch(new URL('/api/'+path,base),{method:request.method,headers:{'Content-Type':'application/json','OAI-Sites-Authorization':'Bearer '+token},body:request.method==='GET'?undefined:await request.text(),cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(85000)});
    const type=response.headers.get('content-type')||'';
    if(!type.includes('application/json'))return Response.json({error:'Não foi possível acessar os dados. Tente novamente.'},{status:502});
    return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }catch{return Response.json({error:'A consulta demorou mais que o esperado. Confira o histórico antes de tentar novamente.'},{status:502});}
}
