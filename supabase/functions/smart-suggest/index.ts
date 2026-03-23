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

    const { slide, slideIndex, totalSlides, presentationTitle } = await req.json();

    if (!slide) {
      return new Response(
        JSON.stringify({ error: "slide is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const elements = slide.elements || [];
    const textElements = elements.filter((e: any) => e.type === "text");
    const totalTextLength = textElements.reduce((sum: number, e: any) => sum + (e.content?.length || 0), 0);
    const imageCount = elements.filter((e: any) => e.type === "image").length;
    const hasTitle = textElements.some((e: any) => (e.style?.fontSize || 0) >= 28 || e.style?.fontWeight === "bold");

    const systemPrompt = `You are a real-time presentation assistant. Analyze this slide and provide 2-3 quick, actionable suggestions.

Return this exact JSON:
{
  "suggestions": [
    {
      "id": "<unique short id>",
      "type": "content" | "design" | "add" | "split",
      "icon": "💡" | "✂️" | "📊" | "🖼️" | "📝" | "⚠️",
      "title": "<short title, max 40 chars>",
      "description": "<one sentence, max 80 chars>",
      "action": "<what to do — specific enough for automation>",
      "priority": "high" | "medium" | "low"
    }
  ]
}

COMMON SUGGESTIONS:
- Too much text (>300 chars total): suggest splitting into 2 slides
- No images: suggest adding a relevant image
- No title/heading: suggest adding one
- Text too small (<14pt): suggest increasing
- Too many elements (>8): suggest simplifying
- Only images, no text: suggest adding context
- Slide looks empty (<2 elements): suggest adding content
- Text could benefit from a chart/data viz
- Consecutive text-heavy slides: suggest visual break

RULES:
- Be specific to THIS slide's content
- Only suggest what's genuinely useful
- Max 3 suggestions
- Priority: high = broken/bad, medium = improvement, low = nice-to-have

Return ONLY the JSON.`;

    const slideInfo = {
      slideNumber: slideIndex + 1,
      totalSlides,
      elementCount: elements.length,
      textElementCount: textElements.length,
      totalTextLength,
      imageCount,
      hasTitle,
      texts: textElements.map((e: any) => ({
        content: e.content?.substring(0, 150),
        fontSize: e.style?.fontSize,
      })),
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Presentation: "${presentationTitle || "Untitled"}"
Slide analysis: ${JSON.stringify(slideInfo, null, 2)}`,
        }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const result = await response.json();
    let content = result.content[0]?.text?.trim();

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();

    const suggestions = JSON.parse(content);

    return new Response(
      JSON.stringify(suggestions),
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
