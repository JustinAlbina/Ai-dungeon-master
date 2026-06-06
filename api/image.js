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

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "No OPENAI_API_KEY set" });
  }

  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt.substring(0, 900),
        n: 1,
        size: "1024x1024",
      }),
    });
    const d = await r.json();
    if (r.ok && d.data?.[0]?.b64_json) {
      return res.status(200).json({ url: "data:image/png;base64," + d.data[0].b64_json });
    }
    if (r.ok && d.data?.[0]?.url) {
      return res.status(200).json({ url: d.data[0].url });
    }
    console.error("gpt-image-1 failed:", d.error?.message || JSON.stringify(d).substring(0, 300));
    return res.status(503).json({ error: "Image generation failed", detail: d.error?.message });
  } catch(e) {
    console.error("Image exception:", e.message);
    return res.status(503).json({ error: "Image generation failed", detail: e.message });
  }
}
