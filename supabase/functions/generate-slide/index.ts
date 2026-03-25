import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function: generate-slide
 *
 * Generates a single slide using Claude AI, returning positioned SlideElement[]
 * that fit the selected template's layout.
 *
 * Request body: {
 *   prompt: string,         // What the slide should contain
 *   context?: string,       // Presentation title/context
 *   themeTokens?: object,   // Current theme for styling
 *   existingSlides?: array, // Context from other slides
 * }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, context, themeTokens, existingSlides } = await req.json();

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const palette = themeTokens?.palette || {
      primary: "#6366f1",
      secondary: "#8b5cf6",
      accent: "#f59e0b",
      bg: "#ffffff",
      text: "#1e293b",
    };
    const typography = themeTokens?.typography || {
      titleFont: "Inter",
      bodyFont: "Inter",
      titleSize: 48,
      bodySize: 24,
    };

    const systemPrompt = `You are a presentation designer AI. Generate a single slide as a JSON array of SlideElement objects positioned within a 1920x1080 canvas.

Each element has: { type, content, x, y, width, height, style }
- type: "text" | "shape"
- For text: content is the text string, style includes fontFamily, fontSize, fontWeight, color, textAlign
- For shapes: content is empty, style includes shapeType ("rectangle"|"circle"|"triangle"), shapeFill (hex color), borderRadius

Theme colors: primary=${palette.primary}, secondary=${palette.secondary}, accent=${palette.accent}, bg=${palette.bg}, text=${palette.text}

CRITICAL FONT RULES:
- Title text: fontFamily="${typography.titleFont}", fontSize=${typography.titleSize}, fontWeight="bold", color="${palette.text}"
- Subtitle text: fontFamily="${typography.bodyFont}", fontSize=${Math.round(typography.titleSize * 0.6)}, color="${palette.text}"
- Body text: fontFamily="${typography.bodyFont}", fontSize=${typography.bodySize}, color="${palette.text}"
- Numbers/stats: fontFamily="${typography.titleFont}", fontSize=${Math.round(typography.titleSize * 1.5)}, fontWeight="bold"
- Small labels: fontFamily="${typography.bodyFont}", fontSize=${Math.round(typography.bodySize * 0.6)}

Canvas rules:
- Canvas is 1920x1080 pixels
- Title at top (y: 60-120, x: 120), width: 800-1200, height: 80-150
- Body below title (y: 250+), width: 600-1000
- Leave margins: x minimum 120px
- Elements should be LARGE and readable — this is for projection
- Minimum text height: 60px for body, 100px for titles
- Use theme colors for ALL text
- Return ONLY a JSON array, no markdown or explanation`;

    const userPrompt = context
      ? `Presentation: "${context}"\n\nGenerate a slide about: ${prompt}\n\n${existingSlides?.length ? `Context: This presentation has ${existingSlides.length} other slides.` : ""}`
      : `Generate a slide about: ${prompt}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    const text = data.content[0]?.text || "[]";

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No valid JSON array in AI response");
    }

    const elements = JSON.parse(jsonMatch[0]);

    // Normalize elements
    const normalized = elements.map((el: any, i: number) => ({
      type: el.type || "text",
      content: el.content || "",
      x: el.x ?? 128,
      y: el.y ?? 100 + i * 150,
      width: el.width ?? 1664,
      height: el.height ?? 120,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      style: el.style || {},
    }));

    return new Response(JSON.stringify({ elements: normalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
