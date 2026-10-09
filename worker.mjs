const json = (data, status = 200) => Response.json(data, { status });

function safeUrl(value) {
  try {
    let url = new URL(value.replace(/&amp;/g, "&"));
    if (url.hostname === "l.facebook.com") {
      url = new URL(url.searchParams.get("u"));
    }
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function parseAds(markdown) {
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
    const pt = block.match(/Veiculação iniciada em\s+(\d{1,2}) de ([\p{L}]+) de (\d{4})/u);
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

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return json({ service: "BIG Spy", version: "collector-bilingual-1", configured: !!env.BROWSER && !!env.COLLECTOR_TOKEN });
    }
    if (request.method !== "POST") return json({ error: "Use POST." }, 405);
    if (!env.COLLECTOR_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.COLLECTOR_TOKEN}`) {
      return json({ error: "Acesso não autorizado." }, 401);
    }
    if (!env.BROWSER || typeof env.BROWSER.quickAction !== "function") {
      return json({ error: "Adicione o vínculo Browser Run com o nome BROWSER." }, 503);
    }
    try {
      const p = await request.json();
      if (typeof p.word !== "string" || !p.word.trim() || p.word.length > 120 ||
          !Number.isInteger(p.limit) || p.limit < 1 || p.limit > 100) {
        return json({ error: "Informe word e limit entre 1 e 100." }, 400);
      }
      const start = p.start || "", end = p.end || "";
      const today = new Date().toISOString().slice(0, 10);
      if (typeof start !== "string" || typeof end !== "string" ||
          [start, end].some(v => v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v > today)) ||
          (start && end && start > end)) return json({ error: "Período inválido." }, 400);
      const url = new URL("https://www.facebook.com/ads/library/");
      for (const [name, value] of Object.entries({
        country: "BR", ad_type: "all", active_status: "active",
        search_type: "keyword_unordered", media_type: "all", q: p.word.trim()
      })) url.searchParams.set(name, value);
      const response = await env.BROWSER.quickAction("markdown", {
        url: url.href, gotoOptions: { waitUntil: "networkidle2", timeout: 25000 }
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        console.error("Browser Run falhou:", JSON.stringify({status: response.status, errors: data.errors || []}));
        return json({ error: "Falha no navegador. Confira a franquia e o vínculo BROWSER." }, 502);
      }
      const text = typeof data.result === "string" ? data.result : "";
      console.log("Página recebida:", {characters:text.length});
      if (/verify you are human|unusual traffic|temporarily blocked|temporariamente bloqueado|access denied/i.test(text)) {
        return json({ error: "A Meta bloqueou este navegador. A coleta foi interrompida." }, 502);
      }
      if (p.debug === true) return json({diagnostic: {length: text.length, excerpt: text.slice(0, 18000)}});
      const all = parseAds(text);
      if (!all.length && !/nenhum resultado|nenhum anúncio|\b0 resultados|no results|no ads found|\b0 results/i.test(text)) {
        return json({ error: "Não foi possível reconhecer os anúncios. Pode haver login, bloqueio ou carregamento incompleto." }, 502);
      }
      const ads = all.filter(a => (!start || (a.started && a.started >= start)) &&
        (!end || (a.started && a.started <= end))).slice(0, p.limit);
      return json({ ads, analyzed: all.length, partial: true,
        message: "Teste do primeiro lote carregado, sem rolagem automática." });
    } catch (error) {
      console.error("Falha do coletor:", error instanceof Error ? error.message : "Erro desconhecido");
      return json({ error: "A coleta não foi concluída. Confira a configuração e tente novamente." }, 502);
    }
  }
};
