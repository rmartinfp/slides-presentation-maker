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

    // ─── Gemini generateContent models (Nano Banana Pro → Flash fallbacks) ───
    const geminiModels = [
      "gemini-3-pro-image-preview",   // Nano Banana Pro — best quality
      "gemini-3.1-flash-image-preview", // Nano Banana 2 — fast
      "gemini-2.5-flash-image",        // Nano Banana — efficient
    ];

    for (const model of geminiModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseModalities: ["IMAGE"],
                aspectRatio,
              },
            }),
          },
        );

        if (!geminiRes.ok) {
          console.log(`${model} failed:`, (await geminiRes.text()).substring(0, 200));
          continue;
        }

        const geminiData = await geminiRes.json();
        const imagePart = geminiData.candidates?.[0]?.content?.parts?.find(
          (p: any) => p.inlineData?.mimeType?.startsWith("image/"),
        );

        if (!imagePart?.inlineData?.data) {
          console.log(`${model} returned no image data`);
          continue;
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
      } catch (e) {
        console.log(`${model} error:`, e.message);
      }
    }

    // ─── Fallback: Imagen models (predict endpoint) ───
    const imagenModels = ["imagen-4.0-fast-generate-001", "imagen-3.0-generate-002"];
    for (const imagenModel of imagenModels) {
      try {
        const imagenRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${imagenModel}:predict?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instances: [{ prompt }],
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
        console.log(`${imagenModel} failed, trying next...`);
      } catch (e) {
        console.log(`${imagenModel} error:`, e.message);
      }
    }

    throw new Error("Image generation failed with all available models");
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
