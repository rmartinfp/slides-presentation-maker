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

    const { slides, targetLanguage, title } = await req.json();

    if (!slides || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "slides and targetLanguage are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Extract all text content with element references for efficient translation
    const textMap: { slideIdx: number; elemIdx: number; content: string }[] = [];
    slides.forEach((slide: any, si: number) => {
      (slide.elements || []).forEach((el: any, ei: number) => {
        if (el.type === "text" && el.content?.trim()) {
          textMap.push({ slideIdx: si, elemIdx: ei, content: el.content });
        }
      });
    });

    // Also collect speaker notes
    const notesMap: { slideIdx: number; notes: string }[] = [];
    slides.forEach((slide: any, si: number) => {
      if (slide.notes?.trim()) {
        notesMap.push({ slideIdx: si, notes: slide.notes });
      }
    });

    if (textMap.length === 0) {
      return new Response(
        JSON.stringify({ slides, title }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a professional translator for presentation content.

RULES:
- Translate ALL text to ${targetLanguage}
- Preserve HTML tags, formatting markers, line breaks exactly as they are
- Keep proper nouns, brand names, and technical terms that shouldn't be translated
- Maintain the same tone and register
- Keep text concise — presentations need short, punchy text
- Numbers, dates, and units should be adapted to the target locale
- Return ONLY the JSON array, no other text

You will receive a JSON array of text items. Translate each item's "content" field.
Return the same JSON array with translated "content" values.`;

    const itemsToTranslate = [
      ...textMap.map((t, i) => ({ id: `t${i}`, content: t.content })),
      ...notesMap.map((n, i) => ({ id: `n${i}`, content: n.notes })),
      ...(title ? [{ id: "title", content: title }] : []),
    ];

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
          content: `Translate to ${targetLanguage}:\n${JSON.stringify(itemsToTranslate, null, 2)}`,
        }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const result = await response.json();
    let content = result.content[0]?.text?.trim();

    // Extract JSON from code block if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();

    const translated: { id: string; content: string }[] = JSON.parse(content);
    const translatedMap = new Map(translated.map((t) => [t.id, t.content]));

    // Apply translations back to slides
    const translatedSlides = JSON.parse(JSON.stringify(slides)); // deep clone
    textMap.forEach((t, i) => {
      const newContent = translatedMap.get(`t${i}`);
      if (newContent) {
        translatedSlides[t.slideIdx].elements[t.elemIdx].content = newContent;
      }
    });
    notesMap.forEach((n, i) => {
      const newNotes = translatedMap.get(`n${i}`);
      if (newNotes) {
        translatedSlides[n.slideIdx].notes = newNotes;
      }
    });

    const translatedTitle = translatedMap.get("title") || title;

    return new Response(
      JSON.stringify({ slides: translatedSlides, title: translatedTitle }),
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
