import {proxy} from '../../../lib/backend';
export const maxDuration=90;
export async function POST(request:Request){return proxy(request,'inspect')}
