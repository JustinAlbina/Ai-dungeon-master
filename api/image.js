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

  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) return res.status(500).json({ error: "HUGGINGFACE_API_KEY not set" });

  const [width, height] = (size || "1792x1024").split("x").map(Number);

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + hfKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt.substring(0, 500),
          parameters: {
            width: Math.min(width, 1024),
            height: Math.min(height, 1024),
            num_inference_steps: 20,
            guidance_scale: 7.5,
          }
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("HuggingFace error:", response.status, text);
      return res.status(response.status).json({ error: "Image generation failed: " + text.substring(0, 200) });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = "data:image/jpeg;base64," + base64;
    res.status(200).json({ url: dataUrl });
  } catch (e) {
    console.error("Image error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
