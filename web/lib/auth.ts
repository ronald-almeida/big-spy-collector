import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { scryptSync, timingSafeEqual } from 'node:crypto';
const attempts = new Map<string,{count:number;until:number}>();
export const {handlers, auth, signIn, signOut} = NextAuth({
  trustHost:true,
  session:{strategy:'jwt',maxAge:60*60*12},
  pages:{signIn:'/login'},
  providers:[Credentials({
    credentials:{username:{label:'Usuário',type:'text'},password:{label:'Senha',type:'password'}},
    async authorize(c,request){
      const username=typeof c.username==='string'?c.username.trim():'';
      const password=typeof c.password==='string'?c.password:'';
      if(!username||username.length>120||!password||password.length>256)return null;
      const key=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
      const now=Date.now();
      for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);
      const entry=attempts.get(key)||{count:0,until:now+900000};
      if(entry.count>=10)return null;
      entry.count++;attempts.set(key,entry);
      const encoded=process.env.ADMIN_PASSWORD_HASH;
      if(!encoded||!process.env.ADMIN_USERNAME)return null;
      const [salt,hash]=encoded.split(':');
      if(!salt||!hash||hash.length!==128)return null;
      const expected=Buffer.from(hash,'hex'), actual=scryptSync(password,salt,64);
      const valid=timingSafeEqual(expected,actual)&&username===process.env.ADMIN_USERNAME;
      if(!valid)return null;
      attempts.delete(key);
      return {id:'owner',name:'Ronald',email:null};
    }
  })],
  callbacks:{session({session}){if(session.user)session.user.name='Ronald';return session;}}
});
