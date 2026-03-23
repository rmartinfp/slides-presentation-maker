import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, aspectRatio = "16:9" } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_AI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const enhancedPrompt = `Professional presentation graphic: ${prompt}. Clean, modern, high quality, suitable for a business presentation slide.`;

    // Try Imagen 3 first
    try {
      const imagenRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: enhancedPrompt }],
            parameters: { sampleCount: 1, aspectRatio },
          }),
        },
      );

      if (imagenRes.ok) {
        const data = await imagenRes.json();
        const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (imageBase64) {
          const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
          const url = await uploadToStorage(imageBytes, "image/png");
          return new Response(
            JSON.stringify({ url }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
      console.log("Imagen 3 failed, trying Gemini fallback...");
    } catch (e) {
      console.log("Imagen 3 error:", e.message);
    }

    // Fallback: Gemini 2.0 Flash with image generation
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `Generate an image: ${enhancedPrompt}` },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Gemini error:", errorText);

      // Last resort: try gemini-2.0-flash-preview-image-generation
      const imgGenRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate an image: ${enhancedPrompt}` }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        },
      );

      if (!imgGenRes.ok) {
        const err2 = await imgGenRes.text();
        throw new Error(`All models failed. Last error: ${err2.substring(0, 200)}`);
      }

      const imgGenData = await imgGenRes.json();
      const imgPart = imgGenData.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData?.mimeType?.startsWith("image/"),
      );
      if (!imgPart?.inlineData?.data) throw new Error("No image in response");

      const bytes = Uint8Array.from(atob(imgPart.inlineData.data), (c) => c.charCodeAt(0));
      const url = await uploadToStorage(bytes, imgPart.inlineData.mimeType || "image/png");
      return new Response(
        JSON.stringify({ url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiData = await geminiRes.json();
    const imagePart = geminiData.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.mimeType?.startsWith("image/"),
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error("No image generated — model may not support image output");
    }

    const imageBytes = Uint8Array.from(
      atob(imagePart.inlineData.data),
      (c) => c.charCodeAt(0),
    );

    const url = await uploadToStorage(imageBytes, imagePart.inlineData.mimeType || "image/png");
    return new Response(
      JSON.stringify({ url }),
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

async function uploadToStorage(imageBytes: Uint8Array, contentType: string): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const fileName = `ai-generated/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from("presentation-assets")
    .upload(fileName, imageBytes, { contentType, cacheControl: "3600" });

  if (error) throw new Error(`Upload error: ${error.message}`);

  const { data } = supabase.storage.from("presentation-assets").getPublicUrl(fileName);
  return data.publicUrl;
}
