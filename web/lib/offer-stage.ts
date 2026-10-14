export type StagedOffer={qualification_status?:string;review_status?:string};
export function matchesReview(o:StagedOffer,filter:string){
 const review=o.review_status||'pending',stage=o.qualification_status||'screening';
 if(filter==='all')return true;
 if(filter==='pending')return review==='pending'&&stage==='ready';
 if(filter==='queue')return review==='pending'&&['screening','page_pending','incomplete'].includes(stage);
 if(filter==='discarded')return review==='pending'&&stage==='discarded';
 return review===filter;
}
export function canApprove(o:StagedOffer){return o.qualification_status==='ready'||o.review_status==='approved';}
