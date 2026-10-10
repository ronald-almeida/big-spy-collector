import test from 'node:test';
import assert from 'node:assert/strict';
import {collectPages} from './pagination.mjs';
const ad=(id,date='Oct 8, 2026')=>`Library ID: ${id}\nStarted running on ${date}\n[Example](https://www.facebook.com/example)\nSponsored\nVocê pode aprender com nossas aulas. Inscrições abertas para seu curso.\n![Creative](https://example.com/image.jpg)\n[Saiba mais](https://example.com/course)`;
function fake(batches){let index=0;return {async evaluate(fn){if(fn.name==='snapshot')return batches[Math.min(index,batches.length-1)];if(fn.toString().includes('scrollTo'))index++;}};}
test('loads second batch, deduplicates, excludes saved ads and honors dates',async()=>{
 const r=await collectPages(fake([ad('1')+'\n'+ad('9','Jan 1, 2025'),ad('1')+'\n'+ad('2')+'\n'+ad('3')]),{limit:2,start:'2026-10-01',excludeIds:['1']});
 assert.deepEqual(r.ads.map(a=>a.id),['2','3']);assert.equal(r.firstBatch,2);assert.equal(r.scrolls,1);assert.equal(r.analyzed,4);assert.equal(r.partial,false);
});
test('stalled page returns partial results without infinite scrolling',async()=>{const r=await collectPages(fake([ad('1')]),{limit:5});assert.equal(r.stopReason,'stalled');assert.equal(r.ads.length,1);assert.equal(r.scrolls,3);});
test('block preserves results and stops',async()=>{const r=await collectPages(fake([ad('1'),'verify you are human']),{limit:5});assert.equal(r.stopReason,'blocked');assert.equal(r.ads.length,1);});
test('time and scroll budgets enforced',async()=>{const r=await collectPages(fake([ad('1')]),{limit:5,deadline:0});assert.equal(r.stopReason,'time_limit');const s=await collectPages(fake([ad('1')]),{limit:5,maxScrolls:0});assert.equal(s.stopReason,'scroll_limit');});
