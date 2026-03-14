const crypto = require('node:crypto');
const { all, run } = require('./db');

const emotionRules = [
  { emotion: 'calm', terms: ['calm', 'peace', 'relax', 'breathe', 'rain', 'still'] },
  { emotion: 'happy', terms: ['happy', 'joy', 'grateful', 'smile', 'excited'] },
  { emotion: 'anxious', terms: ['anxious', 'stress', 'worry', 'tense', 'overwhelmed'] },
  { emotion: 'sad', terms: ['sad', 'lonely', 'down', 'tired', 'hopeless'] },
  { emotion: 'focused', terms: ['focus', 'productive', 'clear', 'motivated', 'sharp'] },
];

function hashText(text) {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

function getAnalysisProfile() {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    return {
      provider: 'openai',
      apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      apiKey: openAiKey,
    };
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    return {
      provider: 'openrouter',
      apiUrl: process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free',
      apiKey: openRouterKey,
      headers: {
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_TITLE || 'ArvyaX Journal',
      },
    };
  }

  return null;
}

function heuristicAnalysis(text) {
  const normalized = text.toLowerCase();
  const matched = emotionRules
    .map((rule) => ({ ...rule, score: rule.terms.filter((t) => normalized.includes(t)).length }))
    .sort((a, b) => b.score - a.score);

  const emotion = matched[0].score > 0 ? matched[0].emotion : 'reflective';
  const keywords = [...new Set(normalized.match(/[a-z]{4,}/g) || [])].slice(0, 5);
  const summary = `User expressed a ${emotion} state after the session with themes around ${keywords.slice(0, 3).join(', ') || 'personal reflection'}.`;

  return { emotion, keywords, summary };
}

async function llmAnalysis(text) {
  const profile = getAnalysisProfile();
  if (!profile) {
    return heuristicAnalysis(text);
  }

  const res = await fetch(profile.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${profile.apiKey}`,
      'Content-Type': 'application/json',
      ...(profile.headers || {}),
    },
    body: JSON.stringify({
      model: profile.model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You analyze journal text. Return strict JSON with keys: emotion (single word), keywords (array up to 5 strings), summary (1 sentence).',
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) {
    console.warn(`LLM analysis failed (${profile.provider}) with status ${res.status}; falling back to heuristics.`);
    return heuristicAnalysis(text);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  try {
    const parsed = JSON.parse(content);
    return {
      emotion: parsed.emotion || 'reflective',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
      summary: parsed.summary || 'User reflected on their session.',
    };
  } catch {
    return heuristicAnalysis(text);
  }
}

async function analyzeWithCache(text) {
  const profile = getAnalysisProfile();
  const cacheScope = profile ? `${profile.provider}:${profile.model}` : 'heuristic';
  const textHash = hashText(`${cacheScope}\n${text}`);
  const cached = all('SELECT emotion, keywords, summary FROM analysis_cache WHERE text_hash = ?', [textHash])[0];
  if (cached) {
    return { ...cached, keywords: JSON.parse(cached.keywords), cached: true };
  }

  const analysis = await llmAnalysis(text);
  run(
    'INSERT OR REPLACE INTO analysis_cache (text_hash, emotion, keywords, summary) VALUES (?, ?, ?, ?)',
    [textHash, analysis.emotion, JSON.stringify(analysis.keywords), analysis.summary],
  );

  return { ...analysis, cached: false };
}

module.exports = {
  analyzeWithCache,
  heuristicAnalysis,
  hashText,
};
