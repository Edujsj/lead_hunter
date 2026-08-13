async function searchDuckDuckGoImages(query) {
  try {
    const res1 = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iar=images&iax=images&ia=images`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );
    const html = await res1.text();
    const vqdMatch = html.match(/vqd=([\d-]+)/);
    console.log("vqdMatch:", vqdMatch ? vqdMatch[1] : "not found");
    if (!vqdMatch) return [];
    
    const res2 = await fetch(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqdMatch[1]}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Accept: "application/json",
        },
      }
    );
    console.log("status:", res2.status);
    const data = await res2.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
searchDuckDuckGoImages("Restaurante Torres RS instagram");
