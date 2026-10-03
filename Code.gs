/**
 * Google Apps Script Entry Points for ASHA — Personal Health Companion (v1.7)
 * Configured as "Execute as: Me" (USER_DEPLOYING) with Google Account sign-in.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ASHA — Personal Health Companion')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function sendMessageToGemini(requestPayload) {
  var scriptProps = PropertiesService.getScriptProperties();
  var apiKey = scriptProps.getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return {
      ok: false,
      error: 'GEMINI_API_KEY belum dikonfigurasi pada Script Properties.'
    };
  }

  var userEmail = Session.getActiveUser().getEmail() || 'authenticated-user';
  var dateKey = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  var quotaKey = 'ASHA_QUOTA_' + dateKey + '_' + userEmail;
  var currentCount = parseInt(scriptProps.getProperty(quotaKey) || '0', 10) || 0;
  var DAILY_LIMIT = 30;

  if (currentCount >= DAILY_LIMIT) {
    return {
      ok: false,
      remainingQuota: 0,
      error: 'Batas harian 30 pesan Personal Trainer Chat telah tercapai untuk akun Anda hari ini.'
    };
  }

  var contents = [];
  var history = requestPayload.history || [];
  for (var i = 0; i < history.length; i++) {
    contents.push({
      role: history[i].role === 'assistant' ? 'model' : 'user',
      parts: [{ text: history[i].content }]
    });
  }

  if (requestPayload.userMessage) {
    contents.push({
      role: 'user',
      parts: [{ text: requestPayload.userMessage }]
    });
  } else if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: 'Silakan susun rencana kesehatan v1.0 saya secara lengkap dalam Bahasa Indonesia.' }]
    });
  }

  var endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
    encodeURIComponent(apiKey);

  var response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      systemInstruction: { parts: [{ text: requestPayload.masterPrompt }] },
      contents: contents,
      generationConfig: { temperature: 0.4 }
    }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() >= 400) {
    return {
      ok: false,
      error: 'Gagal menghubungi layanan Gemini (' + response.getResponseCode() + ').'
    };
  }

  var nextCount = currentCount + 1;
  scriptProps.setProperty(quotaKey, String(nextCount));

  var parsed = JSON.parse(response.getContentText());
  var text =
    (parsed.candidates &&
      parsed.candidates[0] &&
      parsed.candidates[0].content &&
      parsed.candidates[0].content.parts &&
      parsed.candidates[0].content.parts[0] &&
      parsed.candidates[0].content.parts[0].text) ||
    '';

  return {
    ok: true,
    text: text,
    remainingQuota: DAILY_LIMIT - nextCount,
    isMajorRevision: /\[MAJOR_REVISION\]/i.test(text)
  };
}
