import axios from "axios";

function safeJSONParse(text) {
  const trimmed = String(text || "").trim();

  // First attempt: direct parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // Try to extract JSON object {...}
  const objStart = trimmed.indexOf("{");
  const objEnd = trimmed.lastIndexOf("}");

  // Try to extract JSON array [...]
  const arrStart = trimmed.indexOf("[");
  const arrEnd = trimmed.lastIndexOf("]");

  // Prefer whichever looks valid & appears first
  const candidates = [];

  if (objStart >= 0 && objEnd > objStart) {
    candidates.push(trimmed.slice(objStart, objEnd + 1));
  }
  if (arrStart >= 0 && arrEnd > arrStart) {
    candidates.push(trimmed.slice(arrStart, arrEnd + 1));
  }

  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {}
  }

  throw new Error("LLM response was not valid JSON");
}

export async function callLLM({ system, user, schemaReminder }) {
  const provider = (process.env.LLM_PROVIDER || "ollama").toLowerCase();

  if (provider !== "ollama") {
    const err = new Error(
      `Unsupported LLM_PROVIDER "${provider}". Use "ollama" for free local inference.`
    );
    err.statusCode = 500;
    throw err;
  }

  const baseURL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.1:8b";

  const messages = [
    { role: "system", content: system.trim() },
    { role: "user", content: schemaReminder.trim() },
    { role: "user", content: JSON.stringify(user) },
    { role: "user", content: "Return ONLY JSON. No markdown. No commentary." },
  ];

  let res;
  try {
    res = await axios.post(
      `${baseURL}/api/chat`,
      {
        model,
        messages,
        stream: false,

        // ✅ If your Ollama/model supports JSON format, keep this:
        // If it errors, remove it and continue.
        format: "json",

        options: {
          temperature: 0.6,

          // ✅ helps prevent endless text after JSON
          stop: ["\n\n", "```"],

          // ✅ avoid silent truncation
          num_ctx: 8192,
        },
      },
      { timeout: 120000 }
    );
  } catch (e) {
    const err = new Error(
      `Failed to call Ollama at ${baseURL}. Is Ollama running and the model pulled?`
    );
    err.statusCode = 500;
    err.details = e?.response?.data || e.message;
    throw err;
  }

  const content = res.data?.message?.content;
  if (!content) {
    const err = new Error("LLM returned empty response");
    err.statusCode = 500;
    throw err;
  }

  let parsed;
  try {
    parsed = safeJSONParse(content);
  } catch (e) {
    const err = new Error("LLM response was not valid JSON");
    err.statusCode = 500;
    err.details = content;
    throw err;
  }

  return { parsed, model, provider: "ollama" };
}
