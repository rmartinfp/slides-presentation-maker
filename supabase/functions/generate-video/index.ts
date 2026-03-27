import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const VEO_MODEL = "veo-3.1-generate-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_AI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { action = "generate" } = body;

    // ── Phase 1: Start video generation ──
    if (action === "generate") {
      return await handleGenerate(body, apiKey);
    }

    // ── Phase 2: Poll operation & download when ready ──
    if (action === "poll") {
      return await handlePoll(body, apiKey);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "generate" or "poll".' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ── Generate: call Veo predictLongRunning, return operationName ──

async function handleGenerate(
  body: { prompt?: string; aspectRatio?: string },
  apiKey: string,
) {
  const { prompt, aspectRatio = "16:9" } = body;

  if (!prompt) {
    return new Response(
      JSON.stringify({ error: "prompt is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const enhancedPrompt = `Cinematic background video for a presentation slide: ${prompt}. Slow motion, seamless loop, no text, no people, ambient mood, high quality.`;

  const res = await fetch(
    `${BASE_URL}/models/${VEO_MODEL}:predictLongRunning?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: enhancedPrompt }],
        parameters: { aspectRatio },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Veo API error:", text);
    throw new Error(`Veo API error (${res.status}): ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  const operationName = data.name;

  if (!operationName) {
    throw new Error("No operation name returned from Veo API");
  }

  return new Response(
    JSON.stringify({ operationName, status: "processing" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ── Poll: check operation status, download + upload when done ──

async function handlePoll(
  body: { operationName?: string },
  apiKey: string,
) {
  const { operationName } = body;

  if (!operationName) {
    return new Response(
      JSON.stringify({ error: "operationName is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const res = await fetch(
    `${BASE_URL}/${operationName}`,
    { headers: { "x-goog-api-key": apiKey } },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Poll error (${res.status}): ${text.substring(0, 200)}`);
  }

  const data = await res.json();

  if (!data.done) {
    return new Response(
      JSON.stringify({ status: "processing", operationName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Check for errors in the completed operation
  if (data.error) {
    throw new Error(`Video generation failed: ${JSON.stringify(data.error)}`);
  }

  const videoUri =
    data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

  if (!videoUri) {
    throw new Error("No video URI in completed operation");
  }

  // Download the generated video from Google
  const videoRes = await fetch(videoUri, {
    headers: { "x-goog-api-key": apiKey },
    redirect: "follow",
  });

  if (!videoRes.ok) {
    throw new Error(`Failed to download video: ${videoRes.status}`);
  }

  const videoBytes = new Uint8Array(await videoRes.arrayBuffer());

  // Upload to Supabase Storage
  const url = await uploadToStorage(videoBytes);

  return new Response(
    JSON.stringify({ status: "completed", url }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ── Upload video to Supabase Storage ──

async function uploadToStorage(videoBytes: Uint8Array): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const fileName = `ai-generated/${crypto.randomUUID()}.mp4`;
  const { error } = await supabase.storage
    .from("presentation-assets")
    .upload(fileName, videoBytes, {
      contentType: "video/mp4",
      cacheControl: "3600",
    });

  if (error) throw new Error(`Upload error: ${error.message}`);

  const { data } = supabase.storage
    .from("presentation-assets")
    .getPublicUrl(fileName);

  return data.publicUrl;
}
