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

    const { slides, title, language, preBuilt } = await req.json();

    if (!slides || slides.length === 0) {
      return new Response(
        JSON.stringify({ error: "slides are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // If preBuilt=true, slides are already lightweight summaries from the client
    const slideSummaries = preBuilt ? slides : slides.map((slide: any, i: number) => {
      const elements = slide.elements || [];
      const textEls = elements.filter((e: any) => e.type === "text");
      const imageEls = elements.filter((e: any) => e.type === "image");
      const shapeEls = elements.filter((e: any) => e.type === "shape");
      const texts = textEls.map((e: any) => ({
        content: e.content?.substring(0, 200),
        fontSize: e.style?.fontSize,
        fontWeight: e.style?.fontWeight,
      }));

      return {
        slideNumber: i + 1,
        elementCount: elements.length,
        textCount: textEls.length,
        imageCount: imageEls.length,
        shapeCount: shapeEls.length,
        texts,
        hasNotes: !!slide.notes,
        background: slide.background?.type,
      };
    });

    const systemPrompt = `You are an expert presentation coach and design consultant. Analyze this presentation and provide actionable feedback.

Respond in ${language || "English"} with this exact JSON structure:
{
  "overallScore": <number 1-10>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "issues": [
    {
      "slide": <slide number or 0 for general>,
      "severity": "critical" | "warning" | "suggestion",
      "category": "content" | "design" | "flow" | "accessibility",
      "title": "<short title>",
      "description": "<specific actionable feedback>"
    }
  ],
  "tips": ["<pro tip 1>", "<pro tip 2>", "<pro tip 3>"]
}

ANALYSIS CRITERIA:
1. **Content**: Too much/little text per slide? Bullets too long? Missing intro/closing?
2. **Design**: Element count balance? Visual hierarchy? Consistent styling?
3. **Flow**: Logical narrative arc? Good transitions? Proper pacing?
4. **Accessibility**: Font sizes readable? Contrast? Alt text for images?
5. **Structure**: Has a clear intro, body, and conclusion? Section breaks?

Be specific — reference slide numbers. Be honest but constructive.
Return ONLY the JSON, no other text.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
        messages: [{
          role: "user",
          content: `Presentation: "${title || "Untitled"}"
Total slides: ${slides.length}

Slide-by-slide breakdown:
${JSON.stringify(slideSummaries, null, 2)}`,
        }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const result = await response.json();
    let content = result.content[0]?.text?.trim();

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();

    const feedback = JSON.parse(content);

    return new Response(
      JSON.stringify(feedback),
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
