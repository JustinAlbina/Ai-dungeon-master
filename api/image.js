export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { prompt, size = "1024x1024" } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "No prompt" });

  let dalleError = null;

  // Try DALL-E 3
  if (process.env.OPENAI_API_KEY) {
    try {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt.substring(0, 900),
          n: 1,
          size: "1024x1024",
          quality: "standard",
        }),
      });
      const d = await r.json();
      if (r.ok && d.data?.[0]?.url) {
        console.log("DALL-E success");
        return res.status(200).json({ url: d.data[0].url });
      }
      // Capture the real error so we can return it
      dalleError = d.error?.message || d.error?.code || JSON.stringify(d).substring(0, 300);
      console.error("DALL-E failed:", dalleError);
    } catch(e) {
      dalleError = e.message;
      console.error("DALL-E exception:", e.message);
    }
  }

  // Fallback: Stability AI
  if (process.env.STABILITY_API_KEY) {
    try {
      const r = await fetch("https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + process.env.STABILITY_API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
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

  // Return the actual DALL-E error so you can see what's going wrong
  return res.status(503).json({
    error: "Image generation failed",
    dalle_error: dalleError || "OPENAI_API_KEY not set",
    hint: "Check browser console or Vercel logs for details",
  });
}
