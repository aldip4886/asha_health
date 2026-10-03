import { describe, expect, it, vi } from 'vitest';
import { handleGeminiProxyRequest, AppsScriptEnv } from '../src/server/geminiProxy';

function createFakeAppsScriptEnv(initialProps: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialProps));
  const fetchSpy = vi.fn().mockReturnValue({
    getResponseCode: () => 200,
    getContentText: () =>
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: 'Berikut rencana kesehatan v1.0 Anda dalam Bahasa Indonesia.' }]
            }
          }
        ]
      })
  });

  const env: AppsScriptEnv = {
    getScriptProperty: (key: string) => store.get(key) ?? null,
    setScriptProperty: (key: string, value: string) => {
      store.set(key, value);
    },
    getActiveUserEmail: () => 'user@kemenkeu.go.id',
    getCurrentDateKey: () => '2026-10-03',
    fetchUrl: fetchSpy
  };

  return { env, store, fetchSpy };
}

describe('Seam 2: Apps Script Server Proxy Handler', () => {
  it('reads GEMINI_API_KEY from Script Properties, calls Gemini 2.0 Flash via UrlFetchApp, and returns Bahasa Indonesia plan response', () => {
    const { env, fetchSpy } = createFakeAppsScriptEnv({
      GEMINI_API_KEY: 'secret-server-key-123'
    });

    const response = handleGeminiProxyRequest(
      {
        masterPrompt: '# ASHA MASTER PROMPT\nSELURUH RESPONS HARUS MENGGUNAKAN BAHASA INDONESIA.',
        history: [],
        userMessage: 'Buatkan rencana awal saya.'
      },
      env
    );

    expect(response.ok).toBe(true);
    expect(response.text).toContain('Berikut rencana kesehatan v1.0 Anda');
    expect(response.remainingQuota).toBe(29);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [calledUrl, calledOptions] = fetchSpy.mock.calls[0];
    expect(calledUrl).toContain('gemini-2.0-flash');
    expect(calledUrl).toContain('secret-server-key-123');
    expect(calledOptions.method).toBe('post');
  });

  it('enforces 30 messages/day/user rate limit in PropertiesService and blocks request #31 without calling UrlFetchApp', () => {
    const { env, fetchSpy } = createFakeAppsScriptEnv({
      GEMINI_API_KEY: 'secret-server-key-123'
    });

    for (let i = 1; i <= 30; i++) {
      const res = handleGeminiProxyRequest(
        {
          masterPrompt: '# ASHA MASTER PROMPT',
          history: [],
          userMessage: `Pesan ke-${i}`
        },
        env
      );
      expect(res.ok).toBe(true);
      expect(res.remainingQuota).toBe(30 - i);
    }

    expect(fetchSpy).toHaveBeenCalledTimes(30);

    // Request #31 must be rejected by rate limiter without calling fetchUrl
    const blocked = handleGeminiProxyRequest(
      {
        masterPrompt: '# ASHA MASTER PROMPT',
        history: [],
        userMessage: 'Pesan ke-31'
      },
      env
    );

    expect(blocked.ok).toBe(false);
    expect(blocked.remainingQuota).toBe(0);
    expect(blocked.error).toMatch(/batas harian|30/i);
    expect(fetchSpy).toHaveBeenCalledTimes(30);
  });
});
