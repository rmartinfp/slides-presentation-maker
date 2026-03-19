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
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const { slide, instruction, presentationContext } = await req.json();

    if (!slide || !instruction) {
      return new Response(
        JSON.stringify({ error: "slide and instruction are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a presentation content editor. You will receive a slide and an instruction to modify it.

RULES:
- Keep the same slide structure (type, layout)
- Only modify the content as requested
- Keep the same language as the original
- Return ONLY valid JSON matching the exact same schema as the input slide
- Be concise and professional
- Bullets should be 1-2 lines each, max 5 bullets

Return ONLY the JSON for the updated slide, no other text.`;

    const userMessage = `Here is the current slide:
${JSON.stringify(slide, null, 2)}

${presentationContext ? `Presentation context: ${presentationContext}` : ''}

Instruction: ${instruction}

Return the updated slide as JSON.`;

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
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.content[0]?.text;

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const updatedSlide = JSON.parse(jsonStr);

    return new Response(
      JSON.stringify(updatedSlide),
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
