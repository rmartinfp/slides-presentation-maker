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

    const { elements, mode, themeTokens, instruction } = await req.json();

    // mode: "reorganize" (AI Layout #1), "redesign" (Redesign Slide #2)
    if (!elements || elements.length === 0) {
      return new Response(
        JSON.stringify({ error: "elements are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const palette = themeTokens?.palette || {};
    const typography = themeTokens?.typography || {};

    const isRedesign = mode === "redesign";
    const variantCount = isRedesign ? 3 : 1;

    const systemPrompt = `You are an expert slide designer. Canvas is 1920×1080px.

${isRedesign ? `Generate ${variantCount} DIFFERENT layout variants for the same content.
Each variant should have a distinctly different visual approach:
- Variant 1: Clean, minimal layout with generous whitespace
- Variant 2: Bold, asymmetric layout with strong visual hierarchy
- Variant 3: Magazine-style layout with creative element placement

Return a JSON object: { "variants": [ { "name": "Minimal", "elements": [...] }, ... ] }` :
`Reorganize these elements for optimal visual design.
${instruction ? `User instruction: ${instruction}` : ""}
Return a JSON object: { "variants": [ { "name": "Optimized", "elements": [...] } ] }`
}

DESIGN RULES:
- Canvas: 1920×1080. Safe margins: 80px all sides.
- Title: top area, large font (${typography.titleSize || 42}pt), bold
- Body text: below title, readable font (${typography.bodySize || 24}pt)
- Images: can be full-bleed, half-slide, or accent-sized
- Shapes: use as decorative accents or containers
- Visual hierarchy: largest element = most important
- Alignment: elements should snap to an invisible grid
- Breathing room: minimum 40px gap between elements
- Theme colors: primary=${palette.primary || "#4F46E5"}, bg=${palette.bg || "#ffffff"}, text=${palette.text || "#1e293b"}

Each element in the output must have:
{ "id": "<keep original id>", "type": "<keep original>", "content": "<keep original>", "x": number, "y": number, "width": number, "height": number, "rotation": number, "opacity": number, "style": { ...keep original style but can adjust fontSize, textAlign, color } }

IMPORTANT: Keep the SAME element IDs, types, and content. Only change positions, sizes, and layout-related styles.
Return ONLY valid JSON.`;

    const simplifiedElements = elements.map((el: any) => ({
      id: el.id,
      type: el.type,
      content: el.type === "text" ? el.content?.substring(0, 300) : (el.type === "image" ? "[IMAGE]" : el.content?.substring(0, 100)),
      x: el.x, y: el.y, width: el.width, height: el.height,
      rotation: el.rotation || 0,
      opacity: el.opacity ?? 1,
      style: el.style,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Elements to ${isRedesign ? "redesign" : "reorganize"}:\n${JSON.stringify(simplifiedElements, null, 2)}`,
        }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const result = await response.json();
    let content = result.content[0]?.text?.trim();

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();

    const parsed = JSON.parse(content);

    // Merge AI layout with original element data (preserve content, images, etc.)
    const originalMap = new Map(elements.map((el: any) => [el.id, el]));
    const mergedVariants = (parsed.variants || [parsed]).map((variant: any) => ({
      name: variant.name || "Layout",
      elements: (variant.elements || []).map((aiEl: any) => {
        const original = originalMap.get(aiEl.id);
        if (!original) return aiEl;
        return {
          ...original,
          x: aiEl.x ?? original.x,
          y: aiEl.y ?? original.y,
          width: aiEl.width ?? original.width,
          height: aiEl.height ?? original.height,
          rotation: aiEl.rotation ?? original.rotation,
          opacity: aiEl.opacity ?? original.opacity,
          style: { ...original.style, ...aiEl.style },
        };
      }),
    }));

    return new Response(
      JSON.stringify({ variants: mergedVariants }),
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
