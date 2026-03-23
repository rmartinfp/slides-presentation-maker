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

    const { elements, slideIndex, totalSlides, presentationTitle, language } = await req.json();

    if (!elements || elements.length === 0) {
      return new Response(
        JSON.stringify({ error: "elements array is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Extract visible text content from slide elements
    const slideContent = elements
      .filter((el: any) => el.type === "text" && el.content)
      .map((el: any) => el.content)
      .join("\n");

    const hasImages = elements.some((el: any) => el.type === "image");
    const hasCharts = elements.some((el: any) => el.type === "table" || el.type === "chart");

    const systemPrompt = `You are an expert presentation coach who writes speaker notes.
Write natural, conversational speaker notes that a presenter would actually say while showing this slide.

RULES:
- Write in ${language || "the same language as the slide content"}
- 3-5 sentences, ~100-150 words
- Start with what to say when the slide appears
- Include key talking points and transitions
- If slide ${slideIndex + 1} of ${totalSlides}: mention where we are in the presentation flow
- If there are images: mention what the audience should notice visually
- If there are data/charts: highlight the key takeaway number
- Don't read the slide text verbatim — expand on it
- Be conversational, not robotic
- End with a natural transition to the next slide (unless it's the last slide)

Return ONLY the speaker notes text, no formatting, no labels.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Presentation: "${presentationTitle || "Untitled"}"
Slide ${slideIndex + 1} of ${totalSlides}
${hasImages ? "(Slide contains images)" : ""}
${hasCharts ? "(Slide contains data/charts)" : ""}

Slide content:
${slideContent || "(Visual slide with no text)"}`,
        }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const result = await response.json();
    const notes = result.content[0]?.text?.trim();

    return new Response(
      JSON.stringify({ notes }),
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
