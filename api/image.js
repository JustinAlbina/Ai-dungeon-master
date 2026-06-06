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

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured in Vercel environment variables" });
  }

  // DALL-E 3 only supports specific sizes
  const validSizes = ["1024x1024", "1792x1024", "1024x1792"];
  const finalSize = validSizes.includes(size) ? size : "1792x1024";

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt.substring(0, 900),
        n: 1,
        size: finalSize,
        quality: "standard",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("DALL-E error:", JSON.stringify(data));
      return res.status(response.status).json({
        error: data.error?.message || "DALL-E API error",
        details: data.error
      });
    }

    if (!data.data?.[0]?.url) {
      console.error("No URL in response:", JSON.stringify(data));
      return res.status(500).json({ error: "No image URL returned from DALL-E" });
    }

    res.status(200).json({ url: data.data[0].url });
  } catch (e) {
    console.error("Image generation exception:", e.message);
    res.status(500).json({ error: e.message });
  }
}
