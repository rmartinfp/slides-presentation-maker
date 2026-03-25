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

    // Extract text elements only — don't send images/shapes/positions to the AI
    const elements = slide.elements || [];
    const textElements = elements
      .filter((el: any) => el.type === "text" && el.content?.trim())
      .map((el: any, i: number) => ({
        index: i,
        id: el.id,
        content: el.content,
        fontSize: el.style?.fontSize,
        fontWeight: el.style?.fontWeight,
      }));

    if (textElements.length === 0) {
      // No text to rewrite — return original slide
      return new Response(
        JSON.stringify({ elements: slide.elements, notes: slide.notes }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a presentation text editor. You will receive text elements from a slide and an instruction.

RULES:
- ONLY modify the text content of each element as instructed
- Keep the SAME number of elements — do NOT add or remove elements
- Keep the same language unless told to change it
- Return a JSON array with objects: { "id": "<same id>", "content": "<rewritten text>" }
- Be concise — presentation text should be short and impactful
- Preserve any HTML tags (like <br>, <b>, etc.) if present
- If the instruction says to add a certain element, add it to the last text element or first element

Return ONLY the JSON array, no other text.`;

    const userMessage = `${presentationContext ? `Presentation: "${presentationContext}"\n` : ""}
Text elements on this slide:
${JSON.stringify(textElements, null, 2)}

${slide.notes ? `Speaker notes: ${slide.notes}\n` : ""}
Instruction: ${instruction}

Return the rewritten texts as a JSON array of { id, content } objects.`;

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
    let content = result.content[0]?.text?.trim();

    // Extract JSON
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();

    const rewrittenTexts: { id: string; content: string }[] = JSON.parse(content);

    // Apply rewritten texts back to the ORIGINAL elements (preserve positions, styles, images, etc.)
    const rewriteMap = new Map(rewrittenTexts.map((t) => [t.id, t.content]));
    const updatedElements = elements.map((el: any) => {
      if (el.type === "text" && rewriteMap.has(el.id)) {
        return { ...el, content: rewriteMap.get(el.id) };
      }
      return el;
    });

    return new Response(
      JSON.stringify({ elements: updatedElements, notes: slide.notes }),
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
