const labels:Record<string,string>={screening:'Aguardando triagem',page_pending:'Aguardando página de destino',ready:'Qualificada para aprovação',discarded:'Descartada pelo motor',incomplete:'Análise incompleta'};
export default function QualificationSummary({status='screening',reason,evidence}:{status?:string;reason?:string;evidence?:string}){
 let items:string[]=[];try{const parsed=JSON.parse(evidence||'[]');if(Array.isArray(parsed))items=parsed.filter(v=>typeof v==='string')}catch{}
 return <section className={'qualification-summary '+status}><strong>{labels[status]||labels.screening}</strong><p>{reason||'O motor ainda verificará os sinais de lançamento antes de liberar esta oferta.'}</p>{status==='ready'&&items.length>0&&<ul>{items.slice(0,4).map((v,i)=><li key={i}>{v}</li>)}</ul>}</section>;
}
