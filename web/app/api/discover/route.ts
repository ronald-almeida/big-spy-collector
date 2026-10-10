import {proxy} from '@/lib/backend';
export const GET=(r:Request)=>proxy(r,'discover');
export const POST=(r:Request)=>proxy(r,'discover');
