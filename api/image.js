export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { prompt, size = "1792x1024" } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  // Parse dimensions
  const [width, height] = (size || "1792x1024").split("x").map(Number);
  const w = width || 1792;
  const h = height || 1024;

  try {
    // Use Pollinations.ai — free, no key needed, good quality
    const encoded = encodeURIComponent(prompt.substring(0, 500));
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&seed=${seed}&model=flux&nologo=true&enhance=true`;

    // Verify it's reachable by fetching the image
    const imageRes = await fetch(url, { method: "GET" });
    if (!imageRes.ok) {
      return res.status(500).json({ error: "Pollinations image generation failed: " + imageRes.status });
    }

    // Return the URL directly — Pollinations generates on-demand
    res.status(200).json({ url });
  } catch (e) {
    console.error("Image generation error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
