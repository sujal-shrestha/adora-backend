// services/exampleRetriever.js
import SyntheticExample from "../models/SyntheticExample.js";

function tokenize(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  const inter = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size ? inter.size / union.size : 0;
}

export async function retrieveExamples({ task, niche = "", tones = [], limit = 3 }) {
  const candidates = await SyntheticExample.find({ task }).limit(200).lean();

  const targetTokens = [
    ...tokenize(niche),
    ...tones.flatMap((t) => tokenize(t)),
  ];

  const scored = candidates
    .map((c) => {
      const cTokens = [...tokenize(c.niche), ...c.tones.flatMap((t) => tokenize(t))];
      return { c, score: jaccard(targetTokens, cTokens) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);

  return scored;
}
