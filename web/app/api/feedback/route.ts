import {proxy} from '@/lib/backend';
export const POST=(r:Request)=>proxy(r,'feedback');
