import {proxy} from '@/lib/backend';
export const maxDuration=120;
export const POST=(r:Request)=>proxy(r,'search');
