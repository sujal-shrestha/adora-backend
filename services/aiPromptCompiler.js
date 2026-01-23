// services/aiPromptCompiler.js

const TASKS = new Set([
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
]);

export function validateTask(task) {
  if (!TASKS.has(task)) {
    const allowed = Array.from(TASKS).join(", ");
    const err = new Error(`Invalid task "${task}". Allowed: ${allowed}`);
    err.statusCode = 400;
    throw err;
  }
}

export function compileNovaPrompt({ task, brandKit, input, constraints, examples = [] }) {
  // strict instruction: model MUST return JSON only
  const system = `
You are Nova, an AI marketing assistant.
You must output ONLY valid JSON (no markdown, no commentary).

You are given:
- task
- brand_kit (business context)
- input (request details)
- constraints (rules)

Follow these rules:
1) Respect brand kit tones, audience, and forbidden/allowed claims.
2) Never include disallowed claims or forbidden words.
3) Be specific, conversion-focused, and ready to use.
4) Output must match the task schema exactly in output.format.
5) Include output.notes (max 2 sentences).
`;

  const schemaReminder = `
TASK OUTPUT REQUIREMENTS (STRICT):

meta_ad_variants => output.format = { "variants": [ { "primary_text": "", "headline": "", "description": "", "cta": "", "angle": "" } ] } (5 variants)
tiktok_script => output.format = { "hook": "", "script": ["..."], "on_screen_text": ["..."], "cta": "" }
google_ads => output.format = { "headlines": ["...x10"], "descriptions": ["...x4"] }
email_promo/email_welcome => output.format = { "subject":"", "preview":"", "body":"", "cta":"" }
landing_page_section => output.format = { "hero_headline":"", "subheadline":"", "bullets":["...x5"], "faq":[{"q":"","a":""}] }
campaign_plan => output.format = { "objective":"", "big_idea":"", "angles":["...x6"], "creatives":["...x6"], "funnel":["step1","step2","step3"], "audiences":["..."], "budget_split":{"prospecting_pct":70,"retargeting_pct":30}, "timeline_days":7, "kpis":["..."] }
angle_bank => output.format = { "angles":[{"angle_name":"","insight":"","hook_examples":["...x3"],"cta_examples":["...x3"]}] } (10 angles)
creative_brief => output.format = { "concept":"", "visuals":["...x5"], "layout_notes":"", "copy_on_image":["...x3"], "do_not_do":["...x3"] }
image_prompt => output.format = { "prompt":"", "negative_prompt":"", "aspect_ratio":"1:1|4:5|16:9", "text_overlay":["...optional"], "color_palette":["...from brand colors"] }
`;

  const fewShot = examples.length
    ? {
        few_shot_examples: examples.map((e) => e.raw),
      }
    : { few_shot_examples: [] };

  const user = {
    task,
    brand_kit: brandKit,
    input,
    constraints,
    ...fewShot,
    required_response_shape: {
      output: {
        format: "task-specific object (match schema)",
        notes: "max 2 sentences",
      },
    },
  };

  return { system, user, schemaReminder };
}
