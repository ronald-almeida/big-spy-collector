import {after} from 'next/server';
import {auth} from '@/lib/auth';
import {runEngine} from '@/lib/engine-runner';
export const maxDuration=300;
export async function POST(request:Request){
 if(!(await auth())?.user)return Response.json({error:'Entre na sua conta.'},{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 if(!process.env.BACKEND_URL||!process.env.BACKEND_TOKEN)return Response.json({error:'Conexão com os dados não configurada.'},{status:503});
 after(async()=>{try{await runEngine('manual',true)}catch{console.error('A rodada manual foi interrompida.')}});
 return Response.json({ok:true,message:'Rodada iniciada no servidor. Acompanhe o progresso abaixo e os sinais nos cartões.'},{status:202});
}
