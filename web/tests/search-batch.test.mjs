import test from 'node:test';
import assert from 'node:assert/strict';
import {searchBatch} from '../lib/search-batch.ts';
test('all terms sequentially, deduplication, interval and same filters',async()=>{
 let time=0,active=0;const calls=[];
 const result=await searchBatch(['A','B','A','C'],{limit:10,start:'2026-10-01',end:''},{update:()=>{},stopped:()=>false},{now:()=>time,wait:async n=>{time+=n},request:async(u,o)=>{assert.equal(active++,0);calls.push({at:time,...JSON.parse(o.body)});await Promise.resolve();active--;return Response.json({message:'ok'});}});
 assert.deepEqual(calls.map(x=>x.word),['A','B','C']);assert.deepEqual(calls.map(x=>x.at),[0,21000,42000]);assert(calls.every(x=>x.limit===10&&x.start==='2026-10-01'));assert(result.every(x=>x.status==='done'));
});
test('continues ordinary errors, halts quota failure with remaining terms visible',async()=>{let i=0;const result=await searchBatch(['A','B','C'],{limit:10,start:'',end:''},{update:()=>{},stopped:()=>false},{wait:async()=>{},request:async()=>++i===1?Response.json({error:'Falha na palavra'},{status:502}):Response.json({error:'Limite de uso'},{status:429})});assert.deepEqual(result.map(x=>x.status),['error','error','waiting']);});
test('stop finishes current word, does not start next',async()=>{let stop=false;const result=await searchBatch(['A','B'],{limit:10,start:'',end:''},{update:()=>{},stopped:()=>stop},{request:async()=>{stop=true;return Response.json({message:'ok'})}});assert.deepEqual(result.map(x=>x.status),['done','waiting']);});
