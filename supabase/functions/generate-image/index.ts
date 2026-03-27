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

    const errors: string[] = [];

    // ─── Strategy 1: Imagen models (predict endpoint) — best quality ───
    const imagenModels = ["imagen-4.0-generate-001", "imagen-4.0-fast-generate-001", "imagen-3.0-generate-001"];
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
          errors.push(`${imagenModel}: no predictions in response`);
        } else {
          const errText = (await imagenRes.text()).substring(0, 300);
          errors.push(`${imagenModel}: ${imagenRes.status} ${errText}`);
        }
        console.log(`${imagenModel} failed, trying next...`);
      } catch (e) {
        errors.push(`${imagenModel}: ${e.message}`);
        console.log(`${imagenModel} error:`, e.message);
      }
    }

    // ─── Strategy 2: Gemini generateContent with image output ───
    const geminiModels = [
      "gemini-2.0-flash-preview-image-generation",
    ];

    for (const model of geminiModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Generate a ${aspectRatio} image: ${prompt}` }] }],
              generationConfig: {
                responseModalities: ["IMAGE", "TEXT"],
              },
            }),
          },
        );

        if (!geminiRes.ok) {
          const errText = (await geminiRes.text()).substring(0, 300);
          errors.push(`${model}: ${geminiRes.status} ${errText}`);
          console.log(`${model} failed:`, errText);
          continue;
        }

        const geminiData = await geminiRes.json();
        const imagePart = geminiData.candidates?.[0]?.content?.parts?.find(
          (p: any) => p.inlineData?.mimeType?.startsWith("image/"),
        );

        if (!imagePart?.inlineData?.data) {
          errors.push(`${model}: no image data in response`);
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
        errors.push(`${model}: ${e.message}`);
        console.log(`${model} error:`, e.message);
      }
    }

    throw new Error(`All models failed: ${errors.join(' | ')}`);
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
