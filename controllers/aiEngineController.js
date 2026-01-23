import User from "../models/User.js";
import BusinessProfile from "../models/BusinessProfile.js";
import AIJob from "../models/AIJob.js";
import { validateTask, compileNovaPrompt } from "../services/aiPromptCompiler.js";
import { retrieveExamples } from "../services/exampleRetriever.js";
import { callLLM } from "../services/llmService.js";

/**
 * Credits cost per task (tune anytime)
 */
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

/**
 * Notes normalization: string | array | anything -> string
 */
function normalizeNotes(notes) {
  if (!notes) return "";
  if (typeof notes === "string") return notes.trim();
  if (Array.isArray(notes)) return notes.filter(Boolean).join(" ").trim();
  return String(notes).trim();
}

/**
 * Ensure base output shape exists:
 * parsed.output.format and parsed.output.notes
 */
function ensureBaseShape(parsed) {
  const safe = parsed && typeof parsed === "object" ? parsed : {};
  safe.output = safe.output && typeof safe.output === "object" ? safe.output : {};
  safe.output.format =
    safe.output.format && typeof safe.output.format === "object"
      ? safe.output.format
      : {};
  return safe;
}

/**
 * Meta ads normalization:
 * - If model returns output.meta_ad_variants.variants, move it to output.format.variants
 * - Normalize notes (root notes/output notes) into output.notes string
 * - Remove confusing extras to keep DB clean
 */
function normalizeMetaAds(parsed) {
  const safe = ensureBaseShape(parsed);

  const nestedVariants = safe?.output?.meta_ad_variants?.variants;
  const directVariants = safe?.output?.format?.variants;

  if (!Array.isArray(directVariants) && Array.isArray(nestedVariants)) {
    safe.output.format.variants = nestedVariants;
  }

  // Notes can appear at root, output.notes, or be an array
  const rootNotes = normalizeNotes(safe?.notes);
  const outNotes = normalizeNotes(safe?.output?.notes);

  const finalNotes = (outNotes || rootNotes || "").trim();
  safe.output.notes =
    finalNotes || "Generated based on your brand kit and constraints.";

  // Clean up extra wrappers if present
  if (safe?.output?.meta_ad_variants) delete safe.output.meta_ad_variants;
  if (safe?.notes) delete safe.notes;

  return safe;
}

/**
 * Generic normalization per task
 */
function normalizeByTask(task, parsed) {
  if (task === "meta_ad_variants") return normalizeMetaAds(parsed);

  // For other tasks: still ensure base shape + normalize notes if needed
  const safe = ensureBaseShape(parsed);
  const rootNotes = normalizeNotes(safe?.notes);
  const outNotes = normalizeNotes(safe?.output?.notes);
  safe.output.notes =
    (outNotes || rootNotes || "").trim() ||
    "Generated based on your brand kit and constraints.";

  if (safe?.notes) delete safe.notes;
  return safe;
}

/**
 * Validators: return true/false
 * (We can add more later per task)
 */
function assertMetaAdsShape(parsed) {
  // Expected:
  // { output: { format: { variants: [ { primary_text, headline, description, cta, angle } ] }, notes: "..." } }
  const variants = parsed?.output?.format?.variants;
  if (!Array.isArray(variants) || variants.length < 1) return false;

  const required = ["primary_text", "headline", "description", "cta", "angle"];
  return variants.every((v) => required.every((k) => typeof v?.[k] === "string"));
}

function assertGoogleAdsShape(parsed) {
  const headlines = parsed?.output?.format?.headlines;
  const descriptions = parsed?.output?.format?.descriptions;
  return (
    Array.isArray(headlines) &&
    headlines.length >= 3 &&
    headlines.every((h) => typeof h === "string") &&
    Array.isArray(descriptions) &&
    descriptions.length >= 2 &&
    descriptions.every((d) => typeof d === "string")
  );
}

function assertEmailShape(parsed) {
  const f = parsed?.output?.format;
  return (
    typeof f?.subject === "string" &&
    typeof f?.preview === "string" &&
    typeof f?.body === "string" &&
    typeof f?.cta === "string"
  );
}

function assertTikTokShape(parsed) {
  const f = parsed?.output?.format;
  return (
    typeof f?.hook === "string" &&
    Array.isArray(f?.script) &&
    f.script.every((x) => typeof x === "string") &&
    Array.isArray(f?.on_screen_text) &&
    f.on_screen_text.every((x) => typeof x === "string") &&
    typeof f?.cta === "string"
  );
}

function assertLandingShape(parsed) {
  const f = parsed?.output?.format;
  return (
    typeof f?.hero_headline === "string" &&
    typeof f?.subheadline === "string" &&
    Array.isArray(f?.bullets) &&
    f.bullets.every((x) => typeof x === "string") &&
    Array.isArray(f?.faq) &&
    f.faq.every((x) => typeof x?.q === "string" && typeof x?.a === "string")
  );
}

function assertCampaignPlanShape(parsed) {
  const f = parsed?.output?.format;
  return (
    typeof f?.objective === "string" &&
    typeof f?.big_idea === "string" &&
    Array.isArray(f?.angles) &&
    Array.isArray(f?.creatives) &&
    Array.isArray(f?.funnel) &&
    Array.isArray(f?.audiences) &&
    typeof f?.budget_split === "object" &&
    typeof f?.timeline_days === "number" &&
    Array.isArray(f?.kpis)
  );
}

function assertAngleBankShape(parsed) {
  const angles = parsed?.output?.format?.angles;
  if (!Array.isArray(angles) || angles.length < 3) return false;
  return angles.every(
    (a) =>
      typeof a?.angle_name === "string" &&
      typeof a?.insight === "string" &&
      Array.isArray(a?.hook_examples) &&
      Array.isArray(a?.cta_examples)
  );
}

function assertCreativeBriefShape(parsed) {
  const f = parsed?.output?.format;
  return (
    typeof f?.concept === "string" &&
    Array.isArray(f?.visuals) &&
    typeof f?.layout_notes === "string" &&
    Array.isArray(f?.copy_on_image) &&
    Array.isArray(f?.do_not_do)
  );
}

function assertImagePromptShape(parsed) {
  const f = parsed?.output?.format;
  return (
    typeof f?.prompt === "string" &&
    typeof f?.negative_prompt === "string" &&
    typeof f?.aspect_ratio === "string" &&
    Array.isArray(f?.color_palette)
  );
}

function assertByTask(task, parsed) {
  switch (task) {
    case "meta_ad_variants":
      return assertMetaAdsShape(parsed);
    case "google_ads":
      return assertGoogleAdsShape(parsed);
    case "email_promo":
    case "email_welcome":
      return assertEmailShape(parsed);
    case "tiktok_script":
      return assertTikTokShape(parsed);
    case "landing_page_section":
      return assertLandingShape(parsed);
    case "campaign_plan":
      return assertCampaignPlanShape(parsed);
    case "angle_bank":
      return assertAngleBankShape(parsed);
    case "creative_brief":
      return assertCreativeBriefShape(parsed);
    case "image_prompt":
      return assertImagePromptShape(parsed);
    default:
      // If unknown (shouldn't happen due to validateTask), accept
      return true;
  }
}

/**
 * ✅ Option A: Meta Ads dedicated endpoint
 * frontend can call: POST /api/ai/meta-ads
 */
export const generateMetaAds = async (req, res) => {
  req.body = {
    ...(req.body || {}),
    task: "meta_ad_variants",
  };
  return generate(req, res);
};

/**
 * Main generation endpoint: POST /api/ai/generate
 */
export const generate = async (req, res) => {
  let job = null;

  try {
    const { task, input = {}, constraints = {} } = req.body || {};
    validateTask(task);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const creditsNeeded = taskCost(task);
    if ((user.credits ?? 0) < creditsNeeded) {
      return res
        .status(403)
        .json({ message: "Not enough credits", creditsNeeded });
    }

    const brandKit = await BusinessProfile.findOne({ user: req.user.id }).lean();
    if (!brandKit) {
      return res
        .status(400)
        .json({ message: "Brand kit missing. Create it first." });
    }

    // store job first (so we can track failures too)
    job = await AIJob.create({
      user: req.user.id,
      task,
      brandKitId: brandKit._id,
      input,
      constraints,
      status: "running",
      creditsUsed: creditsNeeded,
    });

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

    const { parsed: rawParsed, model, provider } = await callLLM({
      system,
      user: compiledUser,
      schemaReminder,
    });

    // ✅ Normalize FIRST (fix common model quirks)
    const parsed = normalizeByTask(task, rawParsed);

    // ✅ Validate AFTER normalize (so valid outputs don't fail)
    if (!assertByTask(task, parsed)) {
      job.status = "failed";
      job.provider = provider;
      job.model = model;
      job.output = {
        error: "Invalid output format from LLM",
        raw: rawParsed,
        normalized: parsed,
      };
      await job.save();

      return res.status(500).json({
        message: `LLM returned invalid format for ${task}`,
        details: parsed,
      });
    }

    // ✅ deduct credits only after success
    user.credits = (user.credits ?? 0) - creditsNeeded;
    await user.save();

    job.status = "done";
    job.provider = provider;
    job.model = model;
    job.output = parsed;
    await job.save();

    return res.json({
      success: true,
      creditsUsed: creditsNeeded,
      remainingCredits: user.credits,
      jobId: job._id,
      output: parsed,
    });
  } catch (err) {
    const code = err.statusCode || 500;
    console.error("AI generate error:", err.message);

    // If a job was created, mark it failed
    if (job?._id) {
      try {
        job.status = "failed";
        job.output = { error: err.message, details: err.details };
        await job.save();
      } catch (e) {
        console.error("Failed to update job status:", e.message);
      }
    }

    return res.status(code).json({
      message: err.message || "AI generation failed",
      details: err.details || undefined,
    });
  }
};

export const history = async (req, res) => {
  const items = await AIJob.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  return res.json(items);
};
