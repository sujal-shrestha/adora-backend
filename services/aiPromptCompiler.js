// services/aiPromptCompiler.js

export function validateTask(task) {
  const allowed = [
    "meta_ad_variants",
    "tiktok_script",
    "google_ads",
    "email_promo",
    "email_welcome",
    "landing_page_section",
    "campaign_plan",
    "angle_bank",
    "creative_brief",
    "image_prompt",
  ];

  if (!allowed.includes(task)) {
    const err = new Error("Invalid task");
    err.statusCode = 400;
    throw err;
  }
}

function safeText(v) {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.filter(Boolean).join(", ").trim();
  return String(v).trim();
}

function buildBrandContext(brandKit) {
  const bk = brandKit || {};

  const brandName = safeText(bk.brandName || bk.name);
  const niche = safeText(bk.niche);
  const tones = Array.isArray(bk.tones) ? bk.tones.filter(Boolean) : [];
  const audience = safeText(bk.audience);
  const offer = safeText(bk.offer);
  const usp = safeText(bk.usp || bk.usps);
  const claimsAllowed = safeText(bk.claimsAllowed);
  const claimsDisallowed = safeText(bk.claimsDisallowed);
  const forbiddenWords = safeText(bk.forbiddenWords);

  // Keep this compact so it doesn’t overpower the actual task input
  return `
Brand Context (use only if provided — do not invent missing details):
- Brand name: ${brandName || "(not provided)"}
- Niche: ${niche || "(not provided)"}
- Tone: ${tones.length ? tones.join(", ") : "(not provided)"}
- Audience: ${audience || "(not provided)"}
- Offer: ${offer || "(not provided)"}
- USPs: ${usp || "(not provided)"}

Constraints (follow if provided):
- Allowed claims: ${claimsAllowed || "(not provided)"}
- Disallowed claims: ${claimsDisallowed || "(not provided)"}
- Forbidden words: ${forbiddenWords || "(not provided)"}
`.trim();
}

function taskStyleHint(task) {
  // This ensures “normal language” outputs look good & consistent.
  switch (task) {
    case "tiktok_script":
      return `
Output format (human language):
- Hook (1 line)
- Script (8–12 short lines, spoken style)
- On-screen text suggestions (3 bullets)
- CTA (1 line)
Rules:
- Do not invent product features. Use only what user/brand context states.
`.trim();

    case "google_ads":
      return `
Output format (human language):
- Headlines: 8 options (short)
- Descriptions: 4 options
- Keywords: 10 suggestions (broad, phrase, exact mixed)
Rules:
- Do not invent product features. Use only what user/brand context states.
`.trim();

    case "email_promo":
    case "email_welcome":
      return `
Output format (human language):
- Subject (1 line)
- Preview text (1 line)
- Email body (short paragraphs, skimmable)
- CTA line (1 line)
Rules:
- No placeholders like [BRAND], [PRICE], [LINK].
- Do not invent product features or guarantees.
`.trim();

    case "landing_page_section":
      return `
Output format (human language):
- Headline (1 line)
- Subheadline (1 line)
- Body (3–5 short bullets)
- CTA (1 line)
Rules:
- No invented numbers, awards, certifications, or guarantees.
`.trim();

    case "campaign_plan":
      return `
Output format (human language):
- Goal (1 line)
- Audience (1–2 lines)
- 7-day plan (Day 1–Day 7, each with: angle + creative + CTA)
- KPIs to track (bullets)
Rules:
- No invented performance promises or fake stats.
`.trim();

    case "angle_bank":
      return `
Output format (human language):
- 12 angles (bullets) with a 1-line explanation each
Rules:
- Keep angles grounded in provided product/offers only.
`.trim();

    case "creative_brief":
      return `
Output format (human language):
- Objective
- Target audience
- Core promise (only if supported)
- Offer (if provided)
- Key messages (bullets)
- Creative direction (visual + copy notes)
- Do/Don’t list
Rules:
- Do not invent features/claims.
`.trim();

    case "image_prompt":
      return `
Output format (human language):
- Prompt (1 block)
- Negative prompt (1 block)
- Aspect ratio suggestion (1 line)
Rules:
- Do not claim brand colors unless provided.
`.trim();

    default:
      return `
Output format (human language):
- Clear answer, short sections
- Bullets where helpful
Rules:
- Do not invent missing details.
`.trim();
  }
}

export function compileNovaPrompt({ task, brandKit, input, constraints, examples }) {
  validateTask(task);

  const wantsStrictJSON = task === "meta_ad_variants";

  const brandContext = buildBrandContext(brandKit);
  const styleHint = taskStyleHint(task);

  // Strong global no-invention rules (applies to both JSON and non-JSON)
  const globalRules = `
Global rules (non-negotiable):
- NEVER invent or assume details (price, country, materials, dimensions, colors, certifications, guarantees, timelines, stats).
- If something is missing, write in a more abstract/high-level way.
- Avoid placeholders like [BRAND], [PRICE], [LINK].
- Keep output conversion-focused and easy to paste into marketing tools.
`.trim();

  const system = `
You are Nova, an AI marketing assistant.
${globalRules}

${wantsStrictJSON
  ? `
CRITICAL OUTPUT RULES:
- Output ONLY valid JSON.
- No markdown, no code fences, no commentary.
- No text before or after JSON.
`
  : `
CRITICAL OUTPUT RULES:
- Output in clear, natural human language.
- DO NOT output JSON.
- DO NOT output a JSON-looking object or braces.
`
}

${brandContext}
`.trim();

  const schemaReminder = wantsStrictJSON
    ? `
Return EXACTLY this JSON shape:

{
  "output": {
    "format": {
      "variants": [
        { "primary_text": "...", "headline": "...", "description": "...", "cta": "...", "angle": "..." },
        { "primary_text": "...", "headline": "...", "description": "...", "cta": "...", "angle": "..." },
        { "primary_text": "...", "headline": "...", "description": "...", "cta": "...", "angle": "..." },
        { "primary_text": "...", "headline": "...", "description": "...", "cta": "...", "angle": "..." },
        { "primary_text": "...", "headline": "...", "description": "...", "cta": "...", "angle": "..." }
      ]
    },
    "notes": "..."
  }
}

ABSOLUTE RULES:
- Exactly 5 variants.
- Every field must be a non-empty string.
- Do not invent product facts (no pricing, countries, materials, features).
- Keep copy ready-to-paste for Meta Ads.
- notes = max 2 sentences.
`.trim()
    : `
Write the final answer in normal human language (NOT JSON).
${styleHint}
`.trim();

  // Keep the user payload simple + clean
  const user = {
    task,
    input: input || {},
    constraints: constraints || {},
    // examples are optional; keep them short
    few_shot_examples: (examples || []).map((e) => e.raw).filter(Boolean),
  };

  return { system, user, schemaReminder, wantsStrictJSON };
}
