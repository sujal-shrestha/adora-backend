// controllers/aiEngineController.js

import User from "../models/User.js";
import BusinessProfile from "../models/BusinessProfile.js";
import AIJob from "../models/AIJob.js";
import { validateTask, compileNovaPrompt } from "../services/aiPromptCompiler.js";
import { retrieveExamples } from "../services/exampleRetriever.js";
import { callLLM } from "../services/llmService.js";

function taskCost(task) {
  const map = {
    meta_ad_variants: 2,
    tiktok_script: 2,
    google_ads: 2,
    email_promo: 3,
    email_welcome: 3,
    landing_page_section: 4,
    campaign_plan: 4,
    angle_bank: 4,
    creative_brief: 3,
    image_prompt: 2,
  };
  return map[task] ?? 3;
}

function normalizeNotes(notes) {
  if (!notes) return "";
  if (typeof notes === "string") return notes.trim();
  if (Array.isArray(notes)) return notes.filter(Boolean).join(" ").trim();
  return String(notes).trim();
}

/**
 * Normalize meta variants into:
 * { output: { format: { variants: [...] }, notes: "..." } }
 */
function normalizeMetaAds(parsed) {
  if (!parsed || typeof parsed !== "object") return parsed;

  const variantsC = parsed?.output?.format?.variants;
  const variantsA = parsed?.meta_ad_variants?.output?.format?.variants;
  const variantsB = parsed?.output?.meta_ad_variants?.variants;

  const pickedVariants = Array.isArray(variantsC)
    ? variantsC
    : Array.isArray(variantsA)
    ? variantsA
    : Array.isArray(variantsB)
    ? variantsB
    : null;

  const notesC = parsed?.output?.notes;
  const notesA = parsed?.meta_ad_variants?.output?.notes;
  const notesRoot = parsed?.notes;

  const finalNotes =
    normalizeNotes(notesC) ||
    normalizeNotes(notesA) ||
    normalizeNotes(notesRoot) ||
    "Generated based on your input and constraints.";

  parsed.output = parsed.output || {};
  parsed.output.format = parsed.output.format || {};

  if (pickedVariants && !Array.isArray(parsed.output.format.variants)) {
    parsed.output.format.variants = pickedVariants;
  }

  parsed.output.notes = finalNotes;

  if (parsed.meta_ad_variants) delete parsed.meta_ad_variants;
  if (parsed.notes) delete parsed.notes;
  if (parsed.output?.meta_ad_variants) delete parsed.output.meta_ad_variants;

  return parsed;
}

function assertMetaAdsShape(parsed) {
  const variants = parsed?.output?.format?.variants;
  if (!Array.isArray(variants) || variants.length !== 5) return false;

  const required = ["primary_text", "headline", "description", "cta", "angle"];
  return variants.every((v) =>
    required.every((k) => typeof v?.[k] === "string" && v[k].trim().length > 0)
  );
}

/**
 * One repair attempt for meta_ad_variants if the first response is invalid.
 */
async function repairMetaAds({ brandKit, input, constraints, examples, badParsed }) {
  const system = `
You are Nova, an AI marketing assistant.
You MUST output ONLY valid JSON. No markdown. No commentary.

You are fixing a meta_ad_variants response that did not match the required schema.
Regenerate the 5 variants from scratch using the brand info + input + constraints.
Do not invent product facts.
`.trim();

  const schemaReminder = `
Return EXACTLY this JSON shape, with 5 variants:

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

Rules:
- notes must be a STRING (max 2 sentences)
- Follow tone + audience if provided
- Never invent pricing/country/features
- Ready to paste into Meta Ads
`.trim();

  const user = {
    task: "meta_ad_variants",
    brand_kit: brandKit,
    input,
    constraints,
    few_shot_examples: (examples || []).map((e) => e.raw).filter(Boolean),
    previous_invalid_output: badParsed,
  };

  const second = await callLLM({
    system,
    user,
    schemaReminder,
    options: { temperature: 0.2 },
  });

  return normalizeMetaAds(second.parsed);
}

/**
 * Unwrap to frontend-friendly shape:
 * Return { format, notes } rather than nested objects.
 */
function unwrapOutput(parsed) {
  if (!parsed || typeof parsed !== "object") return parsed;

  if (parsed?.output?.format) return parsed.output;
  if (parsed?.output?.output?.format) return parsed.output.output;
  if (parsed?.meta_ad_variants?.output?.format) return parsed.meta_ad_variants.output;
  return parsed.output || parsed;
}

/**
 * Convert output to UI-friendly human text (NO JSON exposure).
 */
function formatHuman(task, out) {
  if (!out) return "";

  // meta variants summary (cards UI)
  if (task === "meta_ad_variants" && out?.format?.variants) {
    const notes = out?.notes ? `Notes: ${out.notes}` : "";
    const angles = out.format.variants.map((v, i) => `#${i + 1} — ${v.angle}`).join("\n");
    return ["Meta Ad Variants generated (5).", angles, notes].filter(Boolean).join("\n\n");
  }

  // image prompt
  if (task === "image_prompt") {
    const prompt = out?.prompt || out?.format?.prompt || out?.format?.positive_prompt;
    const neg = out?.negative_prompt || out?.format?.negative_prompt;
    const ratio = out?.ratio || out?.format?.ratio;
    const notes = out?.notes;
    return [
      prompt ? `Prompt:\n${prompt}` : null,
      neg ? `Negative:\n${neg}` : null,
      ratio ? `Ratio: ${ratio}` : null,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  // email tasks
  if (task === "email_promo" || task === "email_welcome") {
    const subject = out?.subject || out?.format?.subject;
    const preview = out?.preview_text || out?.preview || out?.format?.preview_text;
    const body = out?.body || out?.format?.body || out?.email || out?.text;
    const notes = out?.notes;
    return [
      subject ? `Subject: ${subject}` : null,
      preview ? `Preview: ${preview}` : null,
      body ? `Email:\n${body}` : null,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  // plain text fallback
  if (typeof out === "string") return out;
  if (out?.text && typeof out.text === "string") return out.text;
  if (out?.output?.text && typeof out.output.text === "string") return out.output.text;
  if (out?.notes) return String(out.notes);

  // Final fallback (no JSON)
  return "Generated successfully.";
}

// Dedicated endpoint (Meta Ads)
export const generateMetaAds = async (req, res) => {
  req.body = { ...(req.body || {}), task: "meta_ad_variants" };
  return generate(req, res);
};

export const generate = async (req, res) => {
  let job;

  try {
    const { task, input = {}, constraints = {} } = req.body || {};
    validateTask(task);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const creditsNeeded = taskCost(task);
    if ((user.credits ?? 0) < creditsNeeded) {
      return res.status(403).json({ message: "Not enough credits", creditsNeeded });
    }

    // ✅ Brand kit is OPTIONAL
    const brandKitDoc = await BusinessProfile.findOne({ user: req.user.id }).lean();
    const brandKitExists = !!brandKitDoc;

    // Safe fallback kit (no _id)
    const brandKit = brandKitDoc || {
      brandName: "",
      niche: "",
      tones: [],
      audience: "",
      offer: "",
    };

    // ✅ Create job (brandKitId only if real kit exists)
    const jobPayload = {
      user: req.user.id,
      task,
      input,
      constraints,
      status: "running",
      creditsUsed: creditsNeeded,
    };

    if (brandKitExists && brandKitDoc?._id) {
      jobPayload.brandKitId = brandKitDoc._id;
    }

    job = await AIJob.create(jobPayload);

    const examples = await retrieveExamples({
      task,
      niche: brandKit.niche,
      tones: brandKit.tones || [],
      limit: 4,
    });

    const { system, user: compiledUser, schemaReminder } = compileNovaPrompt({
      task,
      brandKit,
      input,
      constraints,
      examples,
    });

    const TOKEN_LIMITS = {
      meta_ad_variants: 500,
      email_promo: 900,
      email_welcome: 900,
      campaign_plan: 1200,
      creative_brief: 900,
      angle_bank: 600,
    };

    const first = await callLLM({
      system,
      user: compiledUser,
      schemaReminder,
      options: {
        temperature: task === "meta_ad_variants" ? 0.6 : 0.4,
        num_predict: TOKEN_LIMITS[task] || 800,
      },
    });


    let parsed = first.parsed;

    // Meta ads strict validation + repair
    if (task === "meta_ad_variants") {
      parsed = normalizeMetaAds(parsed);

      if (!assertMetaAdsShape(parsed)) {
        parsed = await repairMetaAds({
          brandKit,
          input,
          constraints,
          examples,
          badParsed: first.parsed,
        });
      }

      if (!assertMetaAdsShape(parsed)) {
        job.status = "failed";
        job.error = "Invalid output format from LLM (meta_ad_variants)";
        job.output = parsed; // optional debug
        await job.save();

        return res.status(500).json({
          message: "LLM returned invalid format for meta_ad_variants",
        });
      }
    }

    // ✅ Deduct credits only after success
    user.credits = (user.credits ?? 0) - creditsNeeded;
    await user.save();

    job.status = "done";
    job.provider = first.provider;
    job.model = first.model;
    job.output = parsed;
    job.error = "";
    await job.save();

    // Frontend-friendly shape
    const finalOutput = unwrapOutput(parsed);

    // Human text
    const message = formatHuman(task, finalOutput);

    return res.json({
      success: true,
      creditsUsed: creditsNeeded,
      remainingCredits: user.credits,
      jobId: job._id,
      // output used for cards/advanced UI; users read message
      output: finalOutput,
      message,
      usedFallbackKit: !brandKitExists,
    });
  } catch (err) {
    const code = err?.statusCode || 500;
    console.error("AI generate error:", err);

    if (job) {
      try {
        job.status = "failed";
        job.error = err?.message || "AI generation failed";
        if (err?.details) job.output = { details: err.details };
        await job.save();
      } catch {}
    }

    return res.status(code).json({
      message: err?.message || "AI generation failed",
      details: err?.details || undefined,
    });
  }
};

export const history = async (req, res) => {
  const items = await AIJob.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const normalized = items.map((x) => {
    const out = x?.output ? unwrapOutput(x.output) : x.output;
    return {
      ...x,
      output: out,
      message: formatHuman(x.task, out),
    };
  });

  return res.json(normalized);
};
