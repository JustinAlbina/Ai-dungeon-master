export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "No prompt" });

  if (process.env.OPENAI_API_KEY) {
    try {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-2",
          prompt: prompt.substring(0, 900),
          n: 1,
          size: "512x512",
        }),
      });
      const d = await r.json();
      if (r.ok && d.data?.[0]?.url) {
        console.log("DALL-E 2 success");
        return res.status(200).json({ url: d.data[0].url });
      }
      console.error("DALL-E 2 failed:", d.error?.message);
      return res.status(503).json({ error: "Image generation failed", dalle_error: d.error?.message });
    } catch(e) {
      console.error("DALL-E exception:", e.message);
      return res.status(503).json({ error: "Image generation failed", dalle_error: e.message });
    }
  }

  return res.status(503).json({ error: "No image provider. Add OPENAI_API_KEY to Vercel env vars." });
}
