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
  const markers = [...markdown.matchAll(/Identificação da biblioteca:\s*(?:\*\*)?(\d+)/g)];
  const ads = new Map();
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const block = markdown.slice(marker.index, markers[i + 1]?.index || markdown.length);
    const links = [...block.matchAll(/(?<!!)\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g)]
      .map(m => ({ text: m[1], url: safeUrl(m[2]) })).filter(l => l.url);
    const page = links.find(l => /(^|\.)facebook\.com$/.test(new URL(l.url).hostname));
    const destination = [...links].reverse().find(l => !/(^|\.)facebook\.com$/.test(new URL(l.url).hostname));
    const date = block.match(/Veiculação iniciada em\s+(\d{1,2}) de ([\p{L}]+) de (\d{4})/u);
    const month = date ? months.indexOf(date[2].toLowerCase().slice(0, 3)) : -1;
    const started = date && month >= 0 ? `${date[3]}-${String(month + 1).padStart(2, "0")}-${date[1].padStart(2, "0")}` : null;
    const sponsored = block.indexOf("Patrocinado");
    const body = sponsored >= 0 ? block.slice(sponsored + "Patrocinado".length).split(/Status do sistema|API da Biblioteca de Anúncios/)[0].trim().slice(0, 15000) : "";
    const image = block.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/);
    ads.set(marker[1], {
      id: marker[1], page: page?.text || "Anunciante", title: page?.text || "Anúncio",
      body, started, pageUrl: page?.url || null,
      destination: destination?.url || null,
      image: image ? safeUrl(image[1]) : null, video: null
    });
  }
  return [...ads.values()];
}

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return json({ service: "BIG Spy", version: "github-diagnostics-3", configured: !!env.BROWSER && !!env.COLLECTOR_TOKEN });
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
      console.log("Página recebida do Facebook:", text.slice(0, 3000));
      if (/verify you are human|unusual traffic|temporarily blocked|temporariamente bloqueado|access denied/i.test(text)) {
        return json({ error: "A Meta bloqueou este navegador. A coleta foi interrompida." }, 502);
      }
      if (p.debug === true) return json({diagnostic: {length: text.length, excerpt: text.slice(0, 18000)}});
      const all = parseAds(text);
      if (!all.length && !/nenhum resultado|nenhum anúncio|\b0 resultados/i.test(text)) {
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
