import {timingSafeEqual} from 'node:crypto';
import {runEngine} from '@/lib/engine-runner';
import {createRemoteJWKSet,jwtVerify} from 'jose';
const jwks=createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,header=request.headers.get('authorization')||'';
 const expected='Bearer '+secret;
 let allowed=!!secret&&Buffer.byteLength(header)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(header),Buffer.from(expected));
 if(!allowed&&header.startsWith('Bearer '))try{
  const {payload:p}=await jwtVerify(header.slice(7),jwks,{issuer:'https://token.actions.githubusercontent.com',audience:'https://big-spy.vercel.app/api/cron',algorithms:['RS256'],maxTokenAge:'10m'});
  allowed=p.repository_id==='1411147371'&&p.repository_owner_id==='114614394'&&p.ref==='refs/heads/main'&&p.workflow_ref==='ronald-almeida/big-spy-collector/.github/workflows/big-spy-engine.yml@refs/heads/main'&&['schedule','workflow_dispatch'].includes(String(p.event_name))&&p.runner_environment==='github-hosted';
 }catch{}
 if(!allowed)return Response.json({error:'Não autorizado.'},{status:401});
 try{return Response.json(await runEngine('scheduled',false))}catch{return Response.json({error:'Rodada interrompida. Nenhuma tentativa repetida nesta execução.'},{status:502})}
}
