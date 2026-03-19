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
 * Two modes:
 * 1. GET  ?action=auth        → Returns Google OAuth2 URL for user to authorize
 * 2. GET  ?code=xxx           → Callback from Google, exchanges code for token
 * 3. POST { presentationId, accessToken } → Fetches presentation and re-hosts images
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/import-google-slides`;

  // ---- Step 1: Redirect to Google OAuth ----
  if (url.searchParams.get("action") === "auth") {
    const redirectUri = `${functionUrl}/callback`;
    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/presentations.readonly"
    );
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&access_type=offline` +
      `&prompt=consent`;

    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- Step 2: OAuth callback — exchange code for token ----
  if (url.pathname.endsWith("/callback") && url.searchParams.get("code")) {
    const code = url.searchParams.get("code")!;
    const redirectUri = `${functionUrl}/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new Response(
        `<html><body><h2>Error</h2><pre>${JSON.stringify(tokenData, null, 2)}</pre></body></html>`,
        { headers: { "Content-Type": "text/html" } },
      );
    }

    // Return a page that sends the token back to the opener window
    return new Response(
      `<html>
        <body>
          <h2>Authorization successful!</h2>
          <p>You can close this window.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'google-auth-success',
                accessToken: ${JSON.stringify(tokenData.access_token)},
                refreshToken: ${JSON.stringify(tokenData.refresh_token || "")},
                expiresIn: ${tokenData.expires_in || 3600}
              }, '*');
              setTimeout(() => window.close(), 1500);
            }
          </script>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }

  // ---- Step 3: POST — Fetch presentation with access token ----
  if (req.method === "POST") {
    try {
      const { presentationId, accessToken } = await req.json();

      if (!presentationId || !accessToken) {
        return new Response(
          JSON.stringify({ error: "presentationId and accessToken are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Fetch presentation from Google Slides API
      const slidesRes = await fetch(
        `https://slides.googleapis.com/v1/presentations/${presentationId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!slidesRes.ok) {
        const error = await slidesRes.text();
        return new Response(
          JSON.stringify({ error: `Google Slides API error: ${error}` }),
          { status: slidesRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const presentation = await slidesRes.json();

      // Collect and re-host images
      const imageMap = new Map<string, string>();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      for (const slide of presentation.slides || []) {
        for (const pe of slide.pageElements || []) {
          await processElement(pe, imageMap, accessToken, supabase);
        }
      }

      // Replace image URLs
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
  }

  return new Response(
    JSON.stringify({ error: "Invalid request" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

async function processElement(
  pe: any,
  imageMap: Map<string, string>,
  accessToken: string,
  supabase: any,
) {
  if (pe.image?.contentUrl && !imageMap.has(pe.image.contentUrl)) {
    const newUrl = await downloadAndUpload(pe.image.contentUrl, accessToken, supabase);
    if (newUrl) imageMap.set(pe.image.contentUrl, newUrl);
  }

  if (pe.elementGroup?.children) {
    for (const child of pe.elementGroup.children) {
      await processElement(child, imageMap, accessToken, supabase);
    }
  }
}

async function downloadAndUpload(
  url: string,
  accessToken: string,
  supabase: any,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};
    if (url.includes("googleusercontent.com") || url.includes("googleapis.com")) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "image/png";
    const ext = contentType.includes("jpeg") ? "jpg"
      : contentType.includes("png") ? "png"
      : contentType.includes("gif") ? "gif"
      : "png";

    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const fileName = `imported/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("presentation-assets")
      .upload(fileName, arrayBuffer, { contentType, cacheControl: "3600" });

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
