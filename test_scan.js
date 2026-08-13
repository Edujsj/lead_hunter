const niche = "Restaurantes";
const city = "Torres, RS";

async function test() {
  console.log("Iniciando scan...");
  const res = await fetch("http://localhost:3000/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ niche, city })
  });
  
  if (!res.ok) {
    console.error("Erro na request:", await res.text());
    return;
  }
  
  const data = await res.json();
  console.log(`Modo: ${data.mode}`);
  console.log(`Leads extraídos: ${data.total}`);
  
  if (data.leads && data.leads.length > 0) {
    const lead = data.leads[0];
    console.log("Primeiro lead:", lead.title, lead.category, lead.rating);
    
    console.log("\nIniciando Deep Crawl para o lead...");
    const deepRes = await fetch("http://localhost:3000/api/deep-crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead })
    });
    
    if (!deepRes.ok) {
      console.error("Erro no deep crawl:", await deepRes.text());
      return;
    }
    
    const deepData = await deepRes.json();
    console.log("Deep Crawl Prompt:", deepData.prompt?.substring(0, 200) + "...");
    console.log("Deep Crawl Imagens:", deepData.images);
  }
}

test();
