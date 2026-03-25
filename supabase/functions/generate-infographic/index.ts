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

    const { content, themeTokens, style } = await req.json();

    if (!content?.trim()) {
      return new Response(
        JSON.stringify({ error: "content is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const palette = themeTokens?.palette || { primary: '#4F46E5', secondary: '#9333EA', accent: '#F59E0B', bg: '#ffffff', text: '#1e293b' };
    const typography = themeTokens?.typography || { titleFont: 'Inter', bodyFont: 'Inter', titleSize: 42, bodySize: 24 };

    // Style preference: 'clean', 'data-heavy', 'visual', 'minimal'
    const infographicStyle = style || 'clean';

    const systemPrompt = `You are a world-class infographic designer for presentations. You analyze content and create a visually stunning infographic slide.

Canvas: 1920×1080 pixels. Everything must be positioned precisely within this space.

You return a JSON object with this structure:
{
  "elements": [
    {
      "type": "text" | "shape" | "chart",
      "content": "...",
      "x": number, "y": number, "width": number, "height": number,
      "style": { ... }
    }
  ]
}

ELEMENT TYPES:

1. TEXT elements:
   - style: { fontFamily, fontSize (in pt), fontWeight, color (hex), textAlign, lineHeight, opacity }
   - Titles: fontFamily="${typography.titleFont}", fontSize=${typography.titleSize}, fontWeight="bold", color="${palette.text}"
   - Body: fontFamily="${typography.bodyFont}", fontSize=${typography.bodySize}, color="${palette.text}"
   - Big numbers: fontFamily="${typography.titleFont}", fontSize=${Math.round(typography.titleSize * 2)}, fontWeight="bold"
   - Small labels: fontFamily="${typography.bodyFont}", fontSize=${Math.round(typography.bodySize * 0.5)}

2. SHAPE elements (decorative):
   - style: { shapeType: "rectangle"|"circle"|"line", shapeFill: hex, borderRadius: number }
   - For backgrounds/cards: shapeType="rectangle", borderRadius=16-24
   - For dots/bullets: shapeType="circle"
   - For dividers: shapeType="line", shapeFill="transparent", shapeStroke=hex, shapeStrokeWidth=2
   - For colored accent bars: shapeType="rectangle", borderRadius=4, small height (3-6px)

3. CHART elements (inline data visualization):
   - content: JSON string of ChartData: {"chartType":"bar"|"line"|"pie"|"doughnut","data":[{"name":"...","value":N}],"dataKeys":["value"],"nameKey":"name","colors":["${palette.text}","${palette.accent}"],"showGrid":true,"showLegend":false}
   - Charts render as interactive Recharts components
   - Use for: comparisons, trends, distributions, proportions

THEME:
- Main accent color: "${palette.text}" (use for headings, numbers, accent bars, circles)
- Background awareness: slide bg is "${palette.bg}"
- Contrast text on accent: use white (#ffffff) if accent is dark, use dark (#1e293b) if accent is light
- Secondary colors: "${palette.accent}", "${palette.secondary}"
- Tinted backgrounds: append hex opacity to colors (e.g., "${palette.text}10" for 6% tint)

DESIGN RULES (NotebookLM quality):
1. HIERARCHY: One clear main title at top. Then sections flow top-to-bottom or in columns.
2. SECTIONS: Divide content into 3-5 visual sections with clear boundaries (color blocks, divider lines, or spacing).
3. BIG NUMBERS: If the content has statistics, show them LARGE (80-120pt) with colored accent bars beneath.
4. CONTRAST: Every text must be readable against its background. Use contrastText logic.
5. SPACING: Minimum 40px between sections. Elements breathe — don't pack them tight.
6. ICONS/BULLETS: Use colored circles (24-36px) as bullet indicators instead of text bullets.
7. VISUAL WEIGHT: The most important data point should be the largest visual element.
8. MAX ELEMENTS: Keep it to 15-25 elements total. More is clutter.
9. ALIGNMENT: Use a consistent grid. Columns should align. Numbers should align.
10. NO BUTTONS: This is a presentation slide, not a website. No CTAs, no links.

INFOGRAPHIC STYLE: "${infographicStyle}"
${infographicStyle === 'data-heavy' ? '- Focus on charts, numbers, comparisons. Use 1-2 charts + key stats.' : ''}
${infographicStyle === 'visual' ? '- Use more colored blocks, sections, visual hierarchy. Minimize text.' : ''}
${infographicStyle === 'minimal' ? '- Maximum whitespace. Very few elements. Let the data breathe.' : ''}
${infographicStyle === 'clean' ? '- Balanced between text and visuals. Professional and structured.' : ''}

Return ONLY the JSON object. No markdown, no explanation.`;

    const userMessage = `Create an infographic slide from this content:

${content.trim().slice(0, 3000)}

Design a complete, visually striking infographic. Extract key data points, statistics, comparisons, and structure them into a compelling visual layout.`;

    // Retry with backoff
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (response.ok || (response.status !== 429 && response.status !== 529)) break;
      await new Promise(r => setTimeout(r, (attempt + 1) * 5000));
    }

    if (!response || !response.ok) {
      throw new Error(`Anthropic API error: ${response?.status || 0}`);
    }

    const result = await response.json();
    let text = result.content[0]?.text?.trim();

    // Extract JSON
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) text = jsonMatch[1].trim();

    const parsed = JSON.parse(text);

    return new Response(
      JSON.stringify(parsed),
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
