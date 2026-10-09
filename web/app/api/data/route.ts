import {proxy} from '@/lib/backend';
export const dynamic='force-dynamic';
export const GET=(r:Request)=>proxy(r,'data');
export const POST=(r:Request)=>proxy(r,'data');
export const DELETE=(r:Request)=>proxy(r,'data');
