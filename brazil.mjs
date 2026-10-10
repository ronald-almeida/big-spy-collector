// Country BR is fixed in the Meta search URL. This extra conservative language
// filter does not establish the advertiser's nationality or company registration.
export function isBrazilOffer(ad){
 const body=String(ad.body||'').replace(/https?:\/\/\S+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(body.length<20)return false;
 const pt=new Set((body.match(/\b(voce|voces|nao|sua|seu|suas|seus|inscricoes|inscricao|matriculas|matricula|vagas|aulas|aprenda|conheca|garanta|saiba|gratis|gratuito|gratuita|oferta|ofertas|desconto|formacao|pos|graduacao|participe|tenha|agora|hoje|mais|nosso|nossa|para|com|uma|curso|cursos|brasil|brasileiro|reais|pix)\b/g)||[]));
 const other=new Set((body.match(/\b(your|you|with|the|and|learn|join|apply|enroll|today|free|this|that|nuestro|nuestra|aprende|inscribete|ahora|hoy|ofertas|plazas|tienes|quieres|nosotros|con|una|para)\b/g)||[]));
 // Shared Portuguese/Spanish words alone never qualify an ad.
 const distinctive=[...pt].filter(w=>!['para','curso','cursos','oferta','ofertas','com','una','mais','agora'].includes(w)).length;
 const foreignPrice=/(?:€|\beur\b|\bus\$|\busd\b|\bmxn\b|\bars\b)/i.test(String(ad.body||''));
 return !foreignPrice&&distinctive>=2&&pt.size>=3&&pt.size>other.size;
}
