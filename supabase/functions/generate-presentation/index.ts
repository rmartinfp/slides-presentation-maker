import "@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Layout library summary — embedded here so the LLM knows what layouts exist.
 * Must be kept in sync with src/lib/layout-library.ts
 */
const LAYOUT_CATALOG = `Available layouts (pick the best one for each slide):

COVERS:
- cover-centered: Title + subtitle centered. Best for: title, opening.
- cover-left: Title left large + subtitle below. Best for: title, bold opening.
- cover-bottom: Title at bottom, great with background images.

SECTIONS:
- section-centered: Section title centered with number. Best for: section dividers.
- section-left-number: Big number left, title right. Best for: chapters.

CONTENT:
- content-title-body: Title + paragraph. Best for: explanations, details. (max 400 chars body)
- content-image-left: Image left + title & text right. Best for: features, case studies.
- content-image-right: Title & text left + image right.
- content-full-image-overlay: Full background image + text overlay. Best for: impactful statements.

DATA:
- stats-three-cards: Three big numbers with labels. Best for: KPIs, metrics. (3 stats)
- stats-big-number: One huge number with context. Best for: key highlights. (1 stat)

COMPARISON:
- comparison-two-columns: Side by side. Best for: vs, pros/cons. (2 columns, 300 chars each)
- comparison-three-columns: Three items side by side. Best for: pricing, options. (3 columns, 200 chars each)

LISTS:
- list-bullets: Title + 5 bullet points. Best for: features, steps. (5 bullets, 80 chars each)
- list-two-column-bullets: Bullets in two columns. Best for: checklists. (6 bullets)

QUOTES:
- quote-centered: Big centered quote with attribution. Best for: testimonials, key messages.

TIMELINE:
- timeline-horizontal: 4 milestones on a horizontal line. Best for: roadmaps, history.

GRID:
- grid-four-items: 2x2 grid with titles + descriptions. Best for: team, pillars, values.
- grid-six-items: 3x2 grid. Best for: many features, services.

CLOSING:
- closing-thankyou: Thank you + contact. Best for: ending.
- closing-cta: Strong call to action. Best for: investment ask, next steps.`;

const SYSTEM_PROMPT = `You are an expert presentation designer and storyteller. Generate a presentation outline where EACH SLIDE specifies a layout from the catalog.

${LAYOUT_CATALOG}

RULES:
1. First slide MUST use a "cover-" layout
2. Last slide MUST use a "closing-" layout
3. Pick the BEST layout for each slide's content — don't just use "content-title-body" for everything
4. Vary the layouts: use stats, comparisons, lists, quotes, grids to make it visually interesting
5. Each slide has a "layout" field (layout ID from the catalog) and content fields matching that layout
6. Respect the character/word limits of each layout
7. Write in the same language as the user's prompt
8. Adapt the narrative structure to the topic (don't force a fixed structure)

RESPOND ONLY WITH VALID JSON:
{
  "title": "Presentation title",
  "slides": [
    {
      "layout": "cover-centered",
      "title": "Main Title",
      "subtitle": "Tagline",
      "notes": "Speaker notes"
    },
    {
      "layout": "stats-three-cards",
      "title": "Key Metrics",
      "stats": [
        { "value": "85%", "label": "Customer satisfaction" },
        { "value": "$4.2B", "label": "Market size" },
        { "value": "3x", "label": "Growth rate" }
      ],
      "notes": "Speaker notes"
    },
    {
      "layout": "content-title-body",
      "title": "Our Approach",
      "body": "Paragraph explaining the approach...",
      "notes": "Speaker notes"
    },
    {
      "layout": "list-bullets",
      "title": "Key Features",
      "bullets": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
      "notes": "Speaker notes"
    },
    {
      "layout": "comparison-two-columns",
      "title": "Before vs After",
      "subtitle": ["Before", "After"],
      "body": ["Description of before state...", "Description of after state..."],
      "notes": "Speaker notes"
    },
    {
      "layout": "quote-centered",
      "quote": "Innovation distinguishes between a leader and a follower.",
      "quoteAuthor": "Steve Jobs",
      "notes": "Speaker notes"
    },
    {
      "layout": "closing-cta",
      "title": "Let's Build Together",
      "body": "Contact us at hello@company.com",
      "notes": "Speaker notes"
    }
  ]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const { prompt, length = "informative", tone = "professional", audience = "general", templateBrief } = await req.json();

    if (!prompt || prompt.length < 3) {
      return new Response(
        JSON.stringify({ error: "Prompt must be at least 3 characters" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt: string;
    let userMessage: string;

    if (templateBrief && Array.isArray(templateBrief) && templateBrief.length > 0) {
      // ─── TEMPLATE-DRIVEN MODE ───
      // The AI must generate content matching the exact template structure
      systemPrompt = `You are an expert presentation content writer. You will receive a template brief describing the EXACT structure of a presentation — how many slides, what type each slide is, and what text slots each slide has with character limits.

Your job: generate compelling content that fits EXACTLY into this structure.

RULES:
1. Generate EXACTLY the number of slides specified in the brief — no more, no less.
2. Each slide must have a "texts" array with EXACTLY the number of entries matching the textSlots (expand "count" slots into individual entries).
3. Each text entry must respect the maxChars limit strictly. Never exceed it.
4. Slot roles guide the tone:
   - "title": concise, impactful heading
   - "subtitle": supporting tagline or description
   - "body": detailed paragraph or explanation
   - "item": short label or bullet point (for TOC items, list items, etc.)
   - "number": SKIP these — do not generate text for number slots
5. Write in the same language as the user's prompt.
6. Make the content flow as a coherent narrative across slides.
7. Do NOT include any text for "number" role slots — they are handled by the template.
8. Cover slide = first. Closing/thank-you slide = last. Follow the brief order exactly.

RESPOND ONLY WITH VALID JSON:
{
  "title": "Presentation Title",
  "slides": [
    {
      "slideIndex": 0,
      "texts": [
        { "content": "Main Title Here" },
        { "content": "A compelling subtitle" }
      ],
      "notes": "Optional speaker notes"
    }
  ]
}`;

      // Build a readable description of the brief
      const briefDescription = templateBrief.map((slide: { slideIndex: number; type: string; textSlots: Array<{ role: string; maxChars: number; count?: number }> }) => {
        const slots = slide.textSlots
          .filter((s: { role: string }) => s.role !== 'number')
          .map((s: { role: string; maxChars: number; count?: number }) => {
            if (s.count && s.count > 1) {
              return `${s.count}x "${s.role}" (max ${s.maxChars} chars each)`;
            }
            return `1x "${s.role}" (max ${s.maxChars} chars)`;
          })
          .join(', ');
        return `Slide ${slide.slideIndex} [${slide.type}]: ${slots}`;
      }).join('\n');

      userMessage = `Create content for a presentation with the following template structure:

${briefDescription}

Topic: ${prompt}
Tone: ${tone}
Audience: ${audience}

Generate content that fits EXACTLY into each slot. Respect character limits. Do NOT generate entries for "number" slots. For slots with count > 1, generate that many separate text entries in the texts array.

Generate the JSON now.`;
    } else {
      // ─── LEGACY FREE-FORM MODE ───
      systemPrompt = SYSTEM_PROMPT;

      const slideCount = length === "short" ? "5-7" : length === "detailed" ? "12-15" : "8-10";

      userMessage = `Create a presentation with ${slideCount} slides.

Topic: ${prompt}
Tone: ${tone}
Audience: ${audience}

IMPORTANT: Pick varied layouts from the catalog. Don't repeat the same layout more than twice. Use stats, lists, comparisons, and quotes where appropriate for the topic. The narrative structure should fit the topic naturally.

Generate the slides JSON now.`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.content[0]?.text;

    if (!content) {
      throw new Error("Empty response from Claude");
    }

    // Extract JSON
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const presentation = JSON.parse(jsonStr);

    // Add UUIDs
    presentation.slides = presentation.slides.map((slide: Record<string, unknown>) => ({
      ...slide,
      id: crypto.randomUUID().slice(0, 9),
    }));

    return new Response(
      JSON.stringify(presentation),
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
