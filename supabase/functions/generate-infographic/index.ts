import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const client = new Anthropic();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { slots, userContent } = await req.json();

    if (!slots || !Array.isArray(slots) || !userContent?.trim()) {
      return new Response(
        JSON.stringify({ error: "slots (array) and userContent (string) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt listing each slot with purpose, type, maxChars, example
    const slotList = slots
      .map(
        (s: any) =>
          `- ${s.id} (max ${s.maxChars} chars, type: ${s.type}): ${s.purpose}. Example: "${s.example}"`
      )
      .join("\n");

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a content writer for presentation infographics. Fill each text slot based on the user's content.

RULES:
1. NEVER exceed the character limit for any slot. Count carefully.
2. For "number" type: return ONLY the number with unit (e.g., "$2.4M", "98%", "150+")
3. For "percentage" type: return ONLY a number 0-100 (e.g., "85")
4. For "text" type: write concise, impactful text
5. Use the user's actual data. Don't invent statistics unless the user provides no data.

SLOTS TO FILL:
${slotList}

USER CONTENT:
${userContent.slice(0, 3000)}

Return ONLY valid JSON: { "slot_id": "value", ... }. No explanation.`,
        },
      ],
    });

    // Parse AI response
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const filledSlots = JSON.parse(jsonMatch[0]);

    // Safety: truncate any slot exceeding maxChars
    for (const slot of slots) {
      if (
        filledSlots[slot.id] &&
        typeof filledSlots[slot.id] === "string" &&
        filledSlots[slot.id].length > slot.maxChars
      ) {
        filledSlots[slot.id] = filledSlots[slot.id].slice(0, slot.maxChars);
      }
    }

    return new Response(JSON.stringify({ slots: filledSlots }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
