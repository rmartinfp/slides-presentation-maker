import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

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
    if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");

    const { imageUrl, instruction, mode } = await req.json();
    // mode: "edit" (general edit), "remove-bg" (background removal), "extend" (outpaint)

    if (!imageUrl || !instruction) {
      return new Response(
        JSON.stringify({ error: "imageUrl and instruction are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Download the source image and convert to base64
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error("Failed to fetch source image");
    const imgBuffer = await imgResponse.arrayBuffer();
    const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
    const mimeType = imgResponse.headers.get("content-type") || "image/png";

    // Use Gemini with image editing capability
    const editPrompt = mode === "remove-bg"
      ? "Remove the background from this image, keep only the main subject with a transparent/white background"
      : mode === "extend"
      ? `Extend/outpaint this image: ${instruction}`
      : instruction;

    // Try Gemini 2.0 Flash for image editing
    const models = ["gemini-2.0-flash"];
    let resultBase64 = null;

    for (const model of models) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: imgBase64,
                    },
                  },
                  {
                    text: `Edit this image: ${editPrompt}. Return the edited image.`,
                  },
                ],
              }],
              generationConfig: {
                responseModalities: ["IMAGE", "TEXT"],
                temperature: 0.4,
              },
            }),
          }
        );

        if (!geminiResponse.ok) continue;

        const geminiData = await geminiResponse.json();
        const parts = geminiData.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
        if (imagePart) {
          resultBase64 = imagePart.inlineData.data;
          break;
        }
      } catch (e) {
        console.error(`${model} failed:`, e);
        continue;
      }
    }

    if (!resultBase64) {
      throw new Error("Image editing failed — no model returned an edited image. Try a different instruction.");
    }

    // Upload to Supabase storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const fileName = `ai-edited/${crypto.randomUUID()}.png`;
    const imageBytes = Uint8Array.from(atob(resultBase64), (c) => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from("presentation-assets")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: publicData } = supabase.storage
      .from("presentation-assets")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ url: publicData.publicUrl }),
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
