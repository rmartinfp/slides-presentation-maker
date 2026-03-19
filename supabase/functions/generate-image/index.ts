import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function: generate-image
 *
 * Generates an image using OpenAI DALL-E 3 and uploads it to Supabase Storage.
 *
 * Request body: {
 *   prompt: string,
 *   size?: "1024x1024" | "1792x1024" | "1024x1792",
 *   quality?: "standard" | "hd",
 * }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, size = "1792x1024", quality = "standard" } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate image with DALL-E 3
    const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Professional presentation graphic: ${prompt}. Clean, modern, high quality, suitable for a business presentation slide.`,
        n: 1,
        size,
        quality,
        response_format: "url",
      }),
    });

    if (!dalleRes.ok) {
      const error = await dalleRes.text();
      throw new Error(`DALL-E error: ${error}`);
    }

    const dalleData = await dalleRes.json();
    const imageUrl = dalleData.data[0]?.url;
    const revisedPrompt = dalleData.data[0]?.revised_prompt;

    if (!imageUrl) {
      throw new Error("No image URL in DALL-E response");
    }

    // Download the image
    const imgRes = await fetch(imageUrl);
    const imgBlob = await imgRes.blob();
    const imgBuffer = await imgBlob.arrayBuffer();

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `ai-generated/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("presentation-assets")
      .upload(fileName, imgBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
      });

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("presentation-assets")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ url: publicUrl, revisedPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
