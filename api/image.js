export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { prompt, size = "1792x1024" } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "No prompt" });

  // Try OpenAI DALL-E first (now that account may have access)
  if (process.env.OPENAI_API_KEY) {
    const [w, h] = (size || "1792x1024").split("x").map(Number);
    // DALL-E 3 valid sizes only
    const dalleSize = (w > h) ? "1792x1024" : w === h ? "1024x1024" : "1024x1792";
    try {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Authorization": "Bearer " + process.env.OPENAI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "dall-e-3", prompt: prompt.substring(0, 900), n: 1, size: dalleSize, quality: "standard" }),
      });
      const d = await r.json();
      if (r.ok && d.data?.[0]?.url) {
        console.log("DALL-E success");
        return res.status(200).json({ url: d.data[0].url });
      }
      console.error("DALL-E failed:", d.error?.message || JSON.stringify(d).substring(0, 200));
    } catch(e) { console.error("DALL-E exception:", e.message); }
  }

  // Fallback: Stability AI
  if (process.env.STABILITY_API_KEY) {
    try {
      const r = await fetch("https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image", {
        method: "POST",
        headers: { "Authorization": "Bearer " + process.env.STABILITY_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          text_prompts: [{ text: prompt.substring(0, 500), weight: 1 }],
          cfg_scale: 7, height: 1024, width: 1024, steps: 20, samples: 1,
        }),
      });
      const d = await r.json();
      if (r.ok && d.artifacts?.[0]?.base64) {
        console.log("Stability AI success");
        return res.status(200).json({ url: "data:image/png;base64," + d.artifacts[0].base64 });
      }
      console.error("Stability failed:", JSON.stringify(d).substring(0, 200));
    } catch(e) { console.error("Stability exception:", e.message); }
  }

  return res.status(503).json({ error: "No image provider available. Add OPENAI_API_KEY or STABILITY_API_KEY to Vercel environment variables." });
}
