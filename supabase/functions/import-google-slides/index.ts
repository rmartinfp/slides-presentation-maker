import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function: import-google-slides
 *
 * Fetches a Google Slides presentation via the Slides API using a service account,
 * downloads all images, re-uploads them to Supabase Storage, and returns the
 * full presentation JSON with rewritten image URLs.
 *
 * Request body: { presentationId: string }
 * Response: Google Slides API presentation JSON with images re-hosted
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { presentationId } = await req.json();
    if (!presentationId) {
      return new Response(
        JSON.stringify({ error: "presentationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get Google service account credentials from env
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({ error: "Google service account not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    // Get access token via JWT
    const token = await getGoogleAccessToken(serviceAccount);

    // Fetch presentation from Google Slides API
    const slidesRes = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!slidesRes.ok) {
      const error = await slidesRes.text();
      return new Response(
        JSON.stringify({ error: `Google Slides API error: ${error}` }),
        { status: slidesRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const presentation = await slidesRes.json();

    // Collect image URLs from the presentation
    const imageMap = new Map<string, string>(); // original URL -> new Supabase URL

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Walk through all slides and download images
    for (const slide of presentation.slides || []) {
      for (const pe of slide.pageElements || []) {
        await processElement(pe, imageMap, token, supabase);
      }
    }

    // Replace image URLs in the response
    let json = JSON.stringify(presentation);
    for (const [original, replacement] of imageMap) {
      json = json.split(original).join(replacement);
    }

    return new Response(json, {
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

async function processElement(
  pe: any,
  imageMap: Map<string, string>,
  token: string,
  supabase: any,
) {
  if (pe.image?.contentUrl && !imageMap.has(pe.image.contentUrl)) {
    const newUrl = await downloadAndUpload(pe.image.contentUrl, token, supabase);
    if (newUrl) imageMap.set(pe.image.contentUrl, newUrl);
  }

  // Recurse into groups
  if (pe.elementGroup?.children) {
    for (const child of pe.elementGroup.children) {
      await processElement(child, imageMap, token, supabase);
    }
  }

  // Background images
  if (pe.pageProperties?.pageBackgroundFill?.stretchedPictureFill?.contentUrl) {
    const url = pe.pageProperties.pageBackgroundFill.stretchedPictureFill.contentUrl;
    if (!imageMap.has(url)) {
      const newUrl = await downloadAndUpload(url, token, supabase);
      if (newUrl) imageMap.set(url, newUrl);
    }
  }
}

async function downloadAndUpload(
  url: string,
  token: string,
  supabase: any,
): Promise<string | null> {
  try {
    // Download image (may need auth for Google-hosted images)
    const headers: Record<string, string> = {};
    if (url.includes("googleusercontent.com") || url.includes("googleapis.com")) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "image/png";
    const ext = contentType.includes("jpeg") ? "jpg"
      : contentType.includes("png") ? "png"
      : contentType.includes("gif") ? "gif"
      : contentType.includes("webp") ? "webp"
      : "png";

    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const fileName = `imported/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("presentation-assets")
      .upload(fileName, arrayBuffer, {
        contentType,
        cacheControl: "3600",
      });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data } = supabase.storage
      .from("presentation-assets")
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (e) {
    console.error("Download/upload error:", e);
    return null;
  }
}

/**
 * Get a Google OAuth2 access token using a service account JWT.
 */
async function getGoogleAccessToken(
  serviceAccount: {
    client_email: string;
    private_key: string;
    token_uri: string;
  },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/presentations.readonly",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
  const sigInput = `${headerB64}.${payloadB64}`;

  // Import the private key
  const pemContent = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(sigInput),
  );

  const jwt = `${sigInput}.${base64url(new Uint8Array(signature))}`;

  // Exchange JWT for access token
  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
