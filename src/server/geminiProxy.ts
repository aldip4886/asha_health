import { ChatTurn, GeminiProxyResponse } from '../types';

export interface AppsScriptHttpResponse {
  getResponseCode(): number;
  getContentText(): string;
}

export interface AppsScriptEnv {
  getScriptProperty(key: string): string | null;
  setScriptProperty(key: string, value: string): void;
  getActiveUserEmail(): string;
  getCurrentDateKey(): string;
  fetchUrl(
    url: string,
    options: {
      method: 'post';
      contentType: string;
      payload: string;
      muteHttpExceptions?: boolean;
    }
  ): AppsScriptHttpResponse;
}

const DAILY_LIMIT_PER_USER = 30;
const GEMINI_MODEL = 'gemini-2.0-flash';

export function handleGeminiProxyRequest(
  request: {
    masterPrompt: string;
    history: ChatTurn[];
    userMessage?: string;
  },
  env: AppsScriptEnv
): GeminiProxyResponse {
  const apiKey = env.getScriptProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return {
      ok: false,
      error: 'GEMINI_API_KEY belum dikonfigurasi pada Script Properties.'
    };
  }

  const userEmail = env.getActiveUserEmail() || 'anonymous@google-account';
  const dateKey = env.getCurrentDateKey();
  const quotaKey = `ASHA_QUOTA_${dateKey}_${userEmail}`;
  const currentCount = parseInt(env.getScriptProperty(quotaKey) ?? '0', 10) || 0;

  if (currentCount >= DAILY_LIMIT_PER_USER) {
    return {
      ok: false,
      remainingQuota: 0,
      error: `Batas harian ${DAILY_LIMIT_PER_USER} pesan Personal Trainer Chat telah tercapai untuk akun Anda hari ini. Silakan lanjutkan besok atau ekspor Context Snapshot Anda.`
    };
  }

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const turn of request.history) {
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }]
    });
  }

  if (request.userMessage) {
    contents.push({
      role: 'user',
      parts: [{ text: request.userMessage }]
    });
  } else if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [
        {
          text: 'Silakan susun rencana kesehatan v1.0 saya secara lengkap dalam Bahasa Indonesia berdasarkan konteks pada sistem.'
        }
      ]
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const payload = JSON.stringify({
    systemInstruction: {
      parts: [{ text: request.masterPrompt }]
    },
    contents,
    generationConfig: {
      temperature: 0.4
    }
  });

  const httpResponse = env.fetchUrl(endpoint, {
    method: 'post',
    contentType: 'application/json',
    payload,
    muteHttpExceptions: true
  });

  if (httpResponse.getResponseCode() >= 400) {
    return {
      ok: false,
      error: `Gagal menghubungi layanan Gemini (${httpResponse.getResponseCode()}).`
    };
  }

  const nextCount = currentCount + 1;
  env.setScriptProperty(quotaKey, String(nextCount));

  const parsed = JSON.parse(httpResponse.getContentText());
  const replyText =
    parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
    'Maaf, respons rencana tidak dapat diproses saat ini.';

  const isMajorRevision =
    Boolean(request.userMessage && /ganti seluruh rencana|rombak total/i.test(request.userMessage)) ||
    /\[MAJOR_REVISION\]/i.test(replyText);

  return {
    ok: true,
    text: replyText,
    remainingQuota: DAILY_LIMIT_PER_USER - nextCount,
    isMajorRevision
  };
}
