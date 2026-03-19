import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function: import-pdf
 *
 * Receives a PDF (as base64), extracts text content,
 * then uses Claude to distribute content across slides.
 *
 * Request body: {
 *   pdfBase64: string,
 *   fileName?: string,
 *   themeTokens?: object,
 * }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName, themeTokens } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "pdfBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const palette = themeTokens?.palette || {
      primary: "#6366f1",
      text: "#1e293b",
    };
    const typography = themeTokens?.typography || {
      titleFont: "Inter",
      bodyFont: "Inter",
      titleSize: 48,
      bodySize: 24,
    };

    // Use Claude's vision capability to read the PDF
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: `You are a presentation designer. Convert the document content into a series of presentation slides.

Each slide should be a JSON object with an "elements" array containing SlideElement objects:
{ type: "text", content: string, x: number, y: number, width: number, height: number, style: { fontFamily, fontSize, fontWeight, color, textAlign } }

Canvas size: 1920x1080px
Theme: primary=${palette.primary}, text=${palette.text}
Fonts: title=${typography.titleFont} at ${typography.titleSize}px, body=${typography.bodyFont} at ${typography.bodySize}px

Rules:
- First slide should be a cover/title slide
- Group related content into slides (4-6 slides total)
- Each slide: title at top (y~80), content below (y~240+)
- Titles: large, bold, primary color
- Body: smaller, text color
- Keep text concise — summarize, don't copy verbatim
- Return ONLY a JSON array of slide objects: [{ elements: [...] }, ...]`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: `Convert this PDF${fileName ? ` (${fileName})` : ""} into presentation slides. Return JSON array of slides.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    const text = data.content[0]?.text || "[]";

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No valid JSON in AI response");
    }

    const slides = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ slides }), {
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
