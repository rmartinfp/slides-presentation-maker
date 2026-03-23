import "@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const { slides, currentTheme } = await req.json();

    if (!slides || slides.length === 0) {
      return new Response(
        JSON.stringify({ error: "slides are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Collect all styling data from the presentation
    const styleData: any = {
      fonts: new Map<string, number>(),
      colors: new Map<string, number>(),
      fontSizes: new Map<number, number>(),
      backgrounds: [] as string[],
    };

    slides.forEach((slide: any) => {
      if (slide.background?.value) styleData.backgrounds.push(slide.background.value);
      (slide.elements || []).forEach((el: any) => {
        const s = el.style || {};
        if (s.fontFamily) styleData.fonts.set(s.fontFamily, (styleData.fonts.get(s.fontFamily) || 0) + 1);
        if (s.color) styleData.colors.set(s.color, (styleData.colors.get(s.color) || 0) + 1);
        if (s.backgroundColor) styleData.colors.set(s.backgroundColor, (styleData.colors.get(s.backgroundColor) || 0) + 1);
        if (s.shapeFill) styleData.colors.set(s.shapeFill, (styleData.colors.get(s.shapeFill) || 0) + 1);
        if (s.fontSize) styleData.fontSizes.set(s.fontSize, (styleData.fontSizes.get(s.fontSize) || 0) + 1);
      });
    });

    const fontsList = [...styleData.fonts.entries()].sort((a, b) => b[1] - a[1]);
    const colorsList = [...styleData.colors.entries()].sort((a, b) => b[1] - a[1]);
    const sizesList = [...styleData.fontSizes.entries()].sort((a, b) => b[0] - a[0]);

    const systemPrompt = `You are a brand identity expert. Analyze the styling patterns in this presentation and extract a coherent brand kit.

Return this exact JSON structure:
{
  "brandName": "<detected brand name or 'Custom Brand'>",
  "palette": {
    "primary": "<most prominent accent/brand color hex>",
    "secondary": "<second accent color hex>",
    "accent": "<highlight/CTA color hex>",
    "bg": "<most common background color hex>",
    "text": "<most common text color hex>"
  },
  "typography": {
    "titleFont": "<most used heading font>",
    "bodyFont": "<most used body font>",
    "titleSize": <heading font size in pt>,
    "bodySize": <body font size in pt>
  },
  "style": {
    "radii": "<0px|8px|16px|24px — detected corner radius style>",
    "shadows": "<none|sm|md|lg|xl — detected shadow style>",
    "mood": "<professional|creative|minimal|bold|elegant — brand mood>"
  },
  "recommendations": [
    "<suggestion for improving brand consistency>"
  ]
}

Be smart about color detection:
- Ignore black/white/gray as primary colors unless the brand is truly monochrome
- The primary color is the most distinctive brand color, not the most frequent
- Background colors are usually white, off-white, or very dark
- Text colors are usually very dark or white

Return ONLY the JSON.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Current theme: ${JSON.stringify(currentTheme || {})}

Detected fonts (sorted by frequency): ${JSON.stringify(fontsList)}
Detected colors (sorted by frequency): ${JSON.stringify(colorsList)}
Detected font sizes (sorted largest first): ${JSON.stringify(sizesList)}
Background styles: ${JSON.stringify(styleData.backgrounds.slice(0, 5))}
Total slides: ${slides.length}`,
        }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const result = await response.json();
    let content = result.content[0]?.text?.trim();

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();

    const brandKit = JSON.parse(content);

    return new Response(
      JSON.stringify(brandKit),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
