function safeUrl(value) {
  try {
    let url = new URL(value.replace(/&amp;/g, "&"));
    if (url.hostname === "l.facebook.com") {
      url = new URL(url.searchParams.get("u"));
    }
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function parseAds(markdown) {
  const markers = [...markdown.matchAll(/(?:Identificação da biblioteca|Library ID):\s*(?:\*\*)?(\d+)/gi)];
  const ads = new Map();
  const months = {jan:1,fev:2,feb:2,mar:3,abr:4,apr:4,mai:5,may:5,jun:6,jul:7,ago:8,aug:8,set:9,sep:9,out:10,oct:10,nov:11,dez:12,dec:12};
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const block = markdown.slice(marker.index, markers[i + 1]?.index || markdown.length);
    const sponsored = /\*{0,2}(?:Patrocinado|Sponsored)\*{0,2}/i.exec(block);
    const header = sponsored ? block.slice(0, sponsored.index) : block;
    const pageLinks = [...header.matchAll(/(?<!!)\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g)]
      .map(m => ({text:m[1],url:safeUrl(m[2])})).filter(l=>l.url);
    const page = pageLinks.find(l => /(^|\.)facebook\.com$/.test(new URL(l.url).hostname) && !new URL(l.url).pathname.startsWith("/ads/"));
    const pt = block.match(/Veiculação iniciada em\s+(\d{1,2})\s+de\s+([\p{L}]+)\s+de\s+(\d{4})/u);
    const en = block.match(/Started running on\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
    const month = months[(pt?.[2] || en?.[1] || "").toLowerCase().slice(0,3)];
    const day = pt?.[1] || en?.[2], year = pt?.[3] || en?.[3];
    const started = month && day && year ? year+"-"+String(month).padStart(2,"0")+"-"+day.padStart(2,"0") : null;
    const creative = sponsored ? block.slice(sponsored.index+sponsored[0].length) : "";
    const destinations = [...creative.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)]
      .map(m=>safeUrl(m[1])).filter(Boolean)
      .filter(u=>!/(^|\.)(facebook\.com|fbcdn\.net)$/.test(new URL(u).hostname));
    const images = [...creative.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g)].map(m=>safeUrl(m[1])).filter(Boolean);
    let body = creative.split(/\[!\[/)[0].split(/Status do sistema|System status|API da Biblioteca de Anúncios|Ad Library API/)[0];
    body = body.replace(/(?<!!)\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]+\)/g,"")
      .replace(/(?:\n\s*)+(?:Active|Ativo)\s*$/i,"")
      .replace(/[\u200B-\u200D\uFEFF]/g,"").trim().slice(0,15000);
    ads.set(marker[1],{id:marker[1],page:page?.text||"Anunciante",title:page?.text||"Anúncio",body,started,
      pageUrl:page?.url||null,destination:destinations.at(-1)||null,image:images[0]||null,video:null});
  }
  return [...ads.values()];
}

