// services/llmService.js
import axios from "axios";

const PROVIDER = process.env.LLM_PROVIDER || "ollama";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "nova";

function safeStringify(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function tryParseJSON(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();

  // Fast path
  try {
    return JSON.parse(trimmed);
  } catch {}

  // Best-effort extract first JSON object
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {}
  }

  return null;
}

/**
 * callLLM supports BOTH modes:
 * - expectsJSON=true  => force Ollama JSON + parse JSON (do not throw; allow controller to repair)
 * - expectsJSON=false => normal text output (optionally parse if it happens to be JSON)
 */
export async function callLLM({
  system,
  user,
  schemaReminder,
  options = {},
  expectsJSON = false,
}) {
  if (PROVIDER !== "ollama") {
    const err = new Error(`Unsupported LLM_PROVIDER: ${PROVIDER}`);
    err.statusCode = 500;
    throw err;
  }

  const temperature =
    typeof options.temperature === "number" ? options.temperature : 0.6;

  const messages = [];

  // SYSTEM = identity + global rules
  if (system) {
    messages.push({ role: "system", content: String(system).trim() });
  }

  // If we expect JSON, schema reminder should be SYSTEM-strength
  // If we want normal language, schema reminder should be USER (gentler)
  if (schemaReminder) {
    messages.push({
      role: expectsJSON ? "system" : "user",
      content: String(schemaReminder).trim(),
    });
  }

  // USER payload
  if (user) {
    messages.push({
      role: "user",
      content: safeStringify(user),
    });
  }

  try {
    const url = `${OLLAMA_BASE_URL}/api/chat`;

    const payload = {
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature,
        top_p: typeof options.top_p === "number" ? options.top_p : 0.9,
        repeat_penalty:
          typeof options.repeat_penalty === "number" ? options.repeat_penalty : 1.1,

        // 🔑 THIS IS THE FIX
        num_predict:
          typeof options.num_predict === "number"
            ? options.num_predict
            : 900, // emails + plans need 600–1200 tokens
      },
    };

    // ✅ Only force JSON when task requires it
    if (expectsJSON) {
      payload.format = "json";
    }

    const resp = await axios.post(url, payload);

    const raw = resp?.data?.message?.content ?? "";
    const parsed = tryParseJSON(raw);

    // ✅ IMPORTANT:
    // - For JSON tasks: return parsed OR null (do NOT throw so controller can repair)
    // - For text tasks: if parsed exists, return it; else wrap as text
    if (expectsJSON) {
      return {
        provider: "ollama",
        model: OLLAMA_MODEL,
        raw,
        parsed: parsed && typeof parsed === "object" ? parsed : null,
      };
    }

    return {
      provider: "ollama",
      model: OLLAMA_MODEL,
      raw,
      parsed: parsed && typeof parsed === "object" ? parsed : { output: { text: raw.trim() } },
    };
  } catch (err) {
    const msg =
      err?.response?.data?.error ||
      err?.message ||
      "Failed to call Ollama";

    const e = new Error(msg);
    e.statusCode = 502;
    e.details = err?.response?.data;
    throw e;
  }
}
