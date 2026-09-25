import { limitSafeAnswer } from './fallbackAgent.js';

export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export function parseGeminiPayload(payload) {
  const candidateText =
    payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!candidateText.trim()) throw new Error('Gemini no devolvió contenido de texto');

  const jsonCandidate = candidateText.match(/\{[\s\S]*\}/)?.[0] || candidateText;
  const parsed = JSON.parse(jsonCandidate);
  const answerText = typeof parsed.answerText === 'string' ? parsed.answerText.trim() : '';
  if (!answerText) throw new Error('Gemini devolvió un answerText vacío');

  const safeAnswer = limitSafeAnswer(answerText);
  if (/villa del rosario|100% accesible|garantizad[ao]|cero escaleras|sin baches/i.test(safeAnswer)) {
    throw new Error('La respuesta contiene afirmaciones no verificadas');
  }
  return safeAnswer;
}

export async function callGeminiApi({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  systemPrompt,
  userContent,
  fetchImpl = globalThis.fetch,
  timeoutMs = 9000,
}) {
  if (!apiKey) throw new Error('Falta la clave de API de Gemini');

  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: typeof userContent === 'string' ? userContent : JSON.stringify(userContent) }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 600,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorJson = null;
      try {
        errorJson = JSON.parse(errorBody);
      } catch {}
      const errMsg = errorJson?.error?.message || errorBody;
      const error = new Error(`Gemini API ${response.status}: ${errMsg.slice(0, 200)}`);
      if (/API_KEY_INVALID|API key not valid/i.test(errMsg)) {
        error.fallbackReason = 'invalid_gemini_key';
      } else if (/QUOTA_EXCEEDED|Resource has been exhausted/i.test(errMsg)) {
        error.fallbackReason = 'gemini_quota_exceeded';
      }
      throw error;
    }

    const payload = await response.json();
    const answerText = parseGeminiPayload(payload);
    return {
      answerText,
      model: payload?.modelVersion || model,
    };
  } finally {
    clearTimeout(timer);
  }
}
