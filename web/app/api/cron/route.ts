import {timingSafeEqual} from 'node:crypto';
import {runEngine} from '@/lib/engine-runner';
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,header=request.headers.get('authorization')||'';
 const expected='Bearer '+secret;
 if(!secret||Buffer.byteLength(header)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(header),Buffer.from(expected)))return Response.json({error:'Não autorizado.'},{status:401});
 try{return Response.json(await runEngine('scheduled',false))}catch{return Response.json({error:'Rodada interrompida. Nenhuma tentativa repetida nesta execução.'},{status:502})}
}
