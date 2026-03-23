import "@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

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
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const { prompt, data, chartType, themeTokens } = await req.json();

    if (!prompt && !data) {
      return new Response(
        JSON.stringify({ error: "prompt or data is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const palette = themeTokens?.palette || {};

    const systemPrompt = `You are a data visualization expert. Generate chart configuration for Recharts library.

Available chart types: bar, line, area, pie, donut
Theme colors: primary=${palette.primary || "#4F46E5"}, secondary=${palette.secondary || "#60a5fa"}, accent=${palette.accent || "#fbbf24"}

Return this exact JSON structure:
{
  "chartType": "bar" | "line" | "area" | "pie",
  "title": "<chart title>",
  "data": [
    { "name": "<label>", "value": <number>, "value2"?: <number for comparison> }
  ],
  "config": {
    "xKey": "name",
    "yKeys": ["value"],
    "colors": ["<hex color for each series>"],
    "showGrid": true,
    "showLegend": <true if multiple series>,
    "unit": "<optional unit suffix like %, $, etc.>",
    "stacked": false
  }
}

RULES:
- If user provides raw data (CSV, table, numbers), parse it into the data array
- If user describes data in text, generate realistic sample data
- Choose the best chart type for the data if not specified
- Use theme colors for the series
- Maximum 12 data points for clarity
- Labels should be short (max 15 chars)
- Sort data meaningfully (chronological, descending value, etc.)

Return ONLY the JSON.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: data
            ? `Chart type preference: ${chartType || "auto"}\nData:\n${data}\n\nAdditional instruction: ${prompt || "Create the best chart for this data"}`
            : `${prompt}${chartType ? `\nPreferred chart type: ${chartType}` : ""}`,
        }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const result = await response.json();
    let content = result.content[0]?.text?.trim();

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();

    const chartConfig = JSON.parse(content);

    return new Response(
      JSON.stringify(chartConfig),
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
