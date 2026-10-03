import { describe, expect, it, beforeEach } from 'vitest';
import { createAshaApp, getDefaultTomorrowStartDate } from '../src/app';

describe('Seam 1: Client Application Boundary — Ticket 1 (Walking Skeleton)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = '';
  });

  it('toggles UI language between EN and ID on welcome screen while keeping Master Prompt in English with Bahasa Indonesia response mandate', () => {
    const app = createAshaApp({ root: document.getElementById('app')! });

    expect(app.getState().ui.language).toBe('id');
    expect(document.body.textContent).toContain('Mulai');

    app.setLanguage('en');
    expect(app.getState().ui.language).toBe('en');
    expect(document.body.textContent).toContain('Welcome to ASHA');

    app.updatePersonal({ age: 34, sex: 'male', height: 172, weight: 74 });
    app.updateGoal({ aspiration: 'build_muscle', target: 'Gain 3 kg lean mass' });
    app.setConfirmed(true);

    const prompt = app.getMasterPrompt();
    expect(prompt).toContain('ASHA MASTER PROMPT');
    expect(prompt).toContain('SELURUH RESPONS HARUS MENGGUNAKAN BAHASA INDONESIA.');
    expect(prompt).toContain('Age: 34');
    expect(prompt).toContain('Aspiration: Build muscle');
  });

  it('updates Visual Persona state and dynamic #app-background image upon sex selection matching asha_prompt_generator_v1_7_bootstrap_5.html', () => {
    const app = createAshaApp({ root: document.getElementById('app')! });

    expect(app.getState().personalization.visualPersona).toBe('neutral');
    expect(document.documentElement.style.getPropertyValue('--asha-persona-background')).toContain(
      'Modern Activewear Duo in White Studio.png'
    );
    expect(document.getElementById('app-background')?.getAttribute('data-persona-asset')).toContain(
      'Modern Activewear Duo in White Studio.png'
    );

    app.updatePersonal({ sex: 'male' });
    expect(app.getState().personalization.visualPersona).toBe('female_active');
    expect(document.documentElement.style.getPropertyValue('--asha-persona-background')).toContain(
      'Hijabi Athlete in Mauve Activewear.png'
    );
    expect(document.getElementById('app-background')?.getAttribute('data-persona-asset')).toContain(
      'Hijabi Athlete in Mauve Activewear.png'
    );

    app.updatePersonal({ sex: 'female' });
    expect(app.getState().personalization.visualPersona).toBe('male_active');
    expect(document.documentElement.style.getPropertyValue('--asha-persona-background')).toContain(
      'Minimalist Fitness Portrait with Negative Space.png'
    );
    expect(document.getElementById('app-background')?.getAttribute('data-persona-asset')).toContain(
      'Minimalist Fitness Portrait with Negative Space.png'
    );

    app.updatePersonal({ sex: 'unspecified' });
    expect(app.getState().personalization.visualPersona).toBe('neutral');
    expect(document.documentElement.style.getPropertyValue('--asha-persona-background')).toContain(
      'Modern Activewear Duo in White Studio.png'
    );
  });

  it('enforces mandatory Review confirmation gate and resets confirmation when any upstream input changes', () => {
    const app = createAshaApp({ root: document.getElementById('app')! });

    app.updatePersonal({ age: 29, sex: 'female', height: 162, weight: 58 });
    app.updateGoal({ aspiration: 'fat_loss', target: 'Reduce body fat safely' });

    expect(app.getState().confirmation.confirmed).toBe(false);
    expect(() => app.getMasterPrompt()).toThrow(/confirmation required/i);

    app.setConfirmed(true);
    expect(app.getState().confirmation.confirmed).toBe(true);
    expect(app.getMasterPrompt()).toContain('Reduce body fat safely');

    // Upstream mutation must automatically reset confirmation
    app.updatePersonal({ weight: 59 });
    expect(app.getState().confirmation.confirmed).toBe(false);
    expect(() => app.getMasterPrompt()).toThrow(/confirmation required/i);
  });

  it('maintains strict zero-storage privacy boundary and wipes runtime state on Clear Session', () => {
    const app = createAshaApp({ root: document.getElementById('app')! });

    app.updatePersonal({ age: 41, sex: 'male', ethnicity: 'Javanese', height: 170, weight: 78 });
    app.updateGoal({ aspiration: 'improve_overall_health', target: 'Better daily energy' });
    app.setConfirmed(true);

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');

    app.clearSession();

    expect(app.getState().personal.age).toBeNull();
    expect(app.getState().personal.sex).toBeNull();
    expect(app.getState().personal.ethnicity).toBeNull();
    expect(app.getState().confirmation.confirmed).toBe(false);
    expect(app.getState().personalization.visualPersona).toBe('neutral');
  });
});

describe('Seam 1: Client Application Boundary — Ticket 2 (Health Snapshot & Health Report OCR)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('records Health Snapshot indicators, preserves missing Field State as Not provided, and never fabricates values', () => {
    const app = createAshaApp({ root: document.getElementById('app')! });

    app.updateHealthSnapshot({
      bloodPressure: '125/82 mmHg',
      restingHeartRate: '64 bpm',
      fastingGlucoseOrGlucose: undefined
    } as Record<string, string | undefined>);

    const state = app.getState();
    expect(state.health.bloodPressure.value).toBe('125/82 mmHg');
    expect(state.health.bloodPressure.fieldState).toBe('provided');
    expect(state.health.restingHeartRate.value).toBe('64 bpm');
    expect(state.health.restingHeartRate.fieldState).toBe('provided');
    expect(state.health.uricAcid.value).toBeNull();
    expect(state.health.uricAcid.fieldState).toBe('missing');

    app.setConfirmed(true);
    const prompt = app.getMasterPrompt();
    expect(prompt).toContain('Blood Pressure: 125/82 mmHg');
    expect(prompt).toContain('Resting Heart Rate: 64 bpm');
    expect(prompt).toContain('Uric Acid: Not provided');
    expect(prompt).toContain('LDL: Not provided');
  });

  it('extracts biomarkers from Health Report via OCR adapter, tags Extraction Confidence, and requires explicit user confirmation before entering Health Snapshot', async () => {
    const fakeOcrAdapter = async () => ({
      rawText: [
        'Tekanan Darah: 130/85 mmHg',
        'Glukosa Puasa: 98 mg/dL',
        'Kolesterol Total: 215 mg/dL',
        'LDL: 142 mg/dL',
        'HDL: 48 mg/dL',
        'Trigliserida: ???',
        'Asam Urat: 6.4 mg/dL'
      ].join('\n'),
      confidenceScore: 88
    });

    const app = createAshaApp({
      root: document.getElementById('app')!,
      ocrAdapter: fakeOcrAdapter
    });

    await app.uploadHealthReport('lab-result.png');

    const reportAfterUpload = app.getState().healthReport;
    expect(reportAfterUpload.confirmed).toBe(false);
    expect(reportAfterUpload.extracted.bloodPressure?.normalizedValue).toBe('130/85 mmHg');
    expect(reportAfterUpload.extracted.bloodPressure?.confidence).toBe('High confidence');
    expect(reportAfterUpload.extracted.bloodPressure?.fieldState).toBe('requires_confirmation');
    expect(reportAfterUpload.extracted.triglycerides?.confidence).toBe('Unable to determine');

    // Before user confirmation, authoritative Health Snapshot must NOT include unconfirmed OCR values
    expect(app.getState().health.bloodPressure.value).toBeNull();

    // User edits/corrects an extracted value and confirms the Health Report
    app.editExtractedBiomarker('ldl', '138 mg/dL');
    app.confirmHealthReport();

    expect(app.getState().healthReport.confirmed).toBe(true);
    expect(app.getState().health.bloodPressure.value).toBe('130/85 mmHg');
    expect(app.getState().health.bloodPressure.fieldState).toBe('provided');
    expect(app.getState().health.ldl.value).toBe('138 mg/dL');
    expect(app.getState().health.uricAcid.value).toBe('6.4 mg/dL');

    app.setConfirmed(true);
    const prompt = app.getMasterPrompt();
    expect(prompt).toContain('Blood Pressure: 130/85 mmHg');
    expect(prompt).toContain('LDL: 138 mg/dL');
    expect(prompt).toContain('Triglycerides: Not provided');
  });
});

describe('Seam 1: Client Application Boundary — Ticket 3 (Schedule, Equipment, Diet, AI Assumptions & Sex-Aware Context)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('defaults empty equipment to bodyweight with ai_assumption Field State, generates conservative schedule AI Assumptions, and never infers diet', () => {
    const app = createAshaApp({ root: document.getElementById('app')! });

    app.updatePersonal({ age: 36, sex: 'male', height: 175, weight: 80 });
    app.updateGoal({
      aspiration: 'running_performance',
      runningDistance: '10K',
      target: 'Finish 10K in 55 minutes'
    });

    // Leave equipment, timeframe, and schedule empty so conservative AI Assumptions are computed
    app.recomputeAssumptionsAndPersonalization();

    const state = app.getState();
    expect(state.equipment.selected).toEqual(['bodyweight']);
    expect(state.equipment.fieldState).toBe('ai_assumption');
    expect(state.timeframe.fieldState).toBe('ai_assumption');
    expect(state.schedule.fieldStates.trainingDays).toBe('ai_assumption');
    expect(state.nutrition.diet).toBeNull();
    expect(state.assumptions.some((a) => /bodyweight/i.test(a))).toBe(true);

    app.setConfirmed(true);
    const prompt = app.getMasterPrompt();
    expect(prompt).toContain('Never prescribe an exercise requiring equipment the user does not have');
    expect(prompt).toContain('Equipment: bodyweight (AI Assumption)');
    expect(prompt).toContain('Diet: Not provided (do not infer diet type)');
    expect(prompt).toContain('## AI ASSUMPTIONS');
  });

  it('triggers Conditional Questions only when sex and planning context make them relevant, and includes anti-stereotyping and integrated planning blocks in Master Prompt', () => {
    const app = createAshaApp({ root: document.getElementById('app')! });

    app.updatePersonal({ age: 32, sex: 'female', height: 160, weight: 60 });
    app.updateGoal({ aspiration: 'fat_loss', target: 'Lose 4 kg safely' });
    app.updateEquipment(['dumbbells', 'fitness_ball']);
    app.updateNutrition({
      diet: 'intermittent_fasting',
      fastingProtocol: '16:8',
      eatingWindow: '12:00 - 20:00'
    });
    app.updatePlanning({
      planType: 'training_and_meal',
      integrationMode: 'optimize_together',
      exerciseVisualMode: 'external_reference'
    });

    app.recomputeAssumptionsAndPersonalization();

    const questions = app.getState().personalization.conditionalQuestions;
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.map((q) => q.id)).toContain('pregnancy');
    expect(questions.map((q) => q.id)).toContain('menstrual_cycle');

    app.answerConditionalQuestion('menstrual_cycle', 'Luteal phase fatigue in week 4');
    app.setConfirmed(true);

    const prompt = app.getMasterPrompt();
    expect(prompt).toContain('SEX-AWARE PERSONALIZATION');
    expect(prompt).toContain('Jangan membuat stereotip seperti:');
    expect(prompt).toContain(
      'Jangan menyusun rencana latihan dan rencana makan sebagai dua rencana yang berdiri sendiri. Optimalkan keduanya secara bersama-sama'
    );
    expect(prompt).toContain('Intermittent Fasting (16:8, window: 12:00 - 20:00)');
    expect(prompt).toContain('Luteal phase fatigue in week 4');
    expect(prompt).toContain('DAREBEE');
  });
});

describe('Seam 1: Client Application Boundary — Ticket 4 (Auto-Primed Personal Trainer Chat)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('auto-primes Personal Trainer Chat with English Master Prompt, shows Bahasa Indonesia blocking loading state, tracks plan versions (v1.0 -> v1.1), and gates major plan replacements behind user confirmation', async () => {
    let resolveInitialCall!: (val: { ok: boolean; text: string; planVersion: string }) => void;

    const fakeGeminiBridge = async (payload: {
      masterPrompt: string;
      history: { role: string; content: string }[];
      userMessage?: string;
    }) => {
      if (payload.history.length === 0) {
        return new Promise<{ ok: boolean; text: string; planVersion: string }>((resolve) => {
          resolveInitialCall = resolve;
        });
      }
      if (payload.userMessage?.includes('Ganti seluruh rencana')) {
        return {
          ok: true,
          text: 'Rencana baru penuh v2.0 dengan perubahan total jadwal dan diet.',
          isMajorRevision: true
        };
      }
      return {
        ok: true,
        text: 'Penyesuaian latihan hari Jumat menjadi sesi pemulihan aktif.',
        isMajorRevision: false
      };
    };

    const app = createAshaApp({
      root: document.getElementById('app')!,
      geminiBridge: fakeGeminiBridge
    });

    app.updatePersonal({ age: 30, sex: 'male', height: 170, weight: 70 });
    app.updateGoal({ aspiration: 'build_muscle', target: 'Tambah massa otot' });
    app.setConfirmed(true);

    const startPromise = app.startPersonalTrainerChat();

    // While blocking call is in flight, loading state must be visible in Bahasa Indonesia
    expect(app.getState().chat.active).toBe(true);
    expect(app.getState().chat.loading).toBe(true);
    expect(app.getState().chat.loadingMessage).toBe('ASHA sedang menyiapkan rencanamu...');

    resolveInitialCall({
      ok: true,
      text: 'Halo! Berikut rencana latihan dan nutrisi awal v1.0 Anda.',
      planVersion: 'v1.0'
    });
    await startPromise;

    expect(app.getState().chat.loading).toBe(false);
    expect(app.getState().chat.currentVersion).toBe('v1.0');
    expect(app.getState().chat.turns).toHaveLength(1);
    expect(app.getState().chat.turns[0].content).toContain('rencana latihan dan nutrisi awal v1.0');

    // Minor adaptation increments version to v1.1
    await app.sendChatMessage('Tolong ubah latihan hari Jumat menjadi ringan');
    expect(app.getState().chat.currentVersion).toBe('v1.1');
    expect(app.getState().chat.turns).toHaveLength(3);

    // Major replacement requires confirmation before replacing whole plan version
    await app.sendChatMessage('Ganti seluruh rencana saya ke program maraton');
    expect(app.getState().chat.pendingReplacementContent).toContain('Rencana baru penuh v2.0');
    expect(app.getState().chat.currentVersion).toBe('v1.1');

    app.confirmPlanReplacement();
    expect(app.getState().chat.pendingReplacementContent).toBeNull();
    expect(app.getState().chat.currentVersion).toBe('v1.2');
  });
});

describe('Seam 1: Client Application Boundary — Ticket 5 (Dual .ics Calendars & Context Snapshot Export)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('generates two strictly separate .ics calendars (My Training Plan and My Diet Plan) from baseline wizard schedule and enriches them from Personal Trainer Chat', async () => {
    const fakeGeminiBridge = async () => ({
      ok: true,
      text: [
        'Berikut Rencana v1.0 Anda:',
        'Latihan Hari Monday: Squat & Push-up Dumbbell 45 menit',
        'Menu Sarapan: Oatmeal + Telur Rebus (35g protein)'
      ].join('\n'),
      planVersion: 'v1.0'
    });

    const app = createAshaApp({
      root: document.getElementById('app')!,
      geminiBridge: fakeGeminiBridge
    });

    app.updatePersonal({ age: 33, sex: 'female', height: 163, weight: 61 });
    app.updateGoal({ aspiration: 'improve_overall_health', target: 'Kebugaran harian' });
    app.updateSchedule({
      trainingDays: ['Monday', 'Thursday'],
      sessionDurationMinutes: 45,
      restDays: ['Tuesday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
      preferredTime: '06:30'
    });
    app.updateNutrition({
      diet: 'intermittent_fasting',
      fastingProtocol: '16:8',
      eatingWindow: '12:00 - 20:00'
    });
    app.setConfirmed(true);

    // Baseline .ics before chat
    const baselineTrainingIcs = app.generateTrainingCalendarIcs();
    const baselineDietIcs = app.generateDietCalendarIcs();

    expect(baselineTrainingIcs).toContain('BEGIN:VCALENDAR');
    expect(baselineTrainingIcs).toContain('X-WR-CALNAME:My Training Plan');
    expect(baselineTrainingIcs).not.toContain('My Diet Plan');

    expect(baselineDietIcs).toContain('BEGIN:VCALENDAR');
    expect(baselineDietIcs).toContain('X-WR-CALNAME:My Diet Plan');
    expect(baselineDietIcs).toContain('12:00 - 20:00');
    expect(baselineDietIcs).not.toContain('My Training Plan');

    // Enriched .ics after Personal Trainer Chat response
    await app.startPersonalTrainerChat();
    const enrichedTrainingIcs = app.generateTrainingCalendarIcs();
    const enrichedDietIcs = app.generateDietCalendarIcs();

    expect(enrichedTrainingIcs).toContain('Squat & Push-up Dumbbell');
    expect(enrichedDietIcs).toContain('Oatmeal + Telur Rebus');
  });

  it('exports a complete Markdown Context Snapshot containing verified wizard inputs, AI Assumptions, English Master Prompt, and Personal Trainer Chat transcript', async () => {
    const fakeGeminiBridge = async () => ({
      ok: true,
      text: 'Rencana v1.0 dalam Bahasa Indonesia siap dijalankan.',
      planVersion: 'v1.0'
    });

    const app = createAshaApp({
      root: document.getElementById('app')!,
      geminiBridge: fakeGeminiBridge
    });

    app.updatePersonal({ age: 38, sex: 'male', height: 174, weight: 76 });
    app.updateGoal({ aspiration: 'weight_loss', target: 'Turun 5 kg dalam 10 minggu' });
    app.setConfirmed(true);
    await app.startPersonalTrainerChat();

    const snapshotMd = app.exportContextSnapshotMarkdown();
    expect(snapshotMd).toContain('# ASHA Context Snapshot');
    expect(snapshotMd).toContain('Turun 5 kg dalam 10 minggu');
    expect(snapshotMd).toContain('## AI Assumptions');
    expect(snapshotMd).toContain('## Master Prompt');
    expect(snapshotMd).toContain('SELURUH RESPONS HARUS MENGGUNAKAN BAHASA INDONESIA.');
    expect(snapshotMd).toContain('## Personal Trainer Chat Transcript (v1.0)');
    expect(snapshotMd).toContain('Rencana v1.0 dalam Bahasa Indonesia siap dijalankan.');
  });

  it('renders interactive step-by-step wizard navigation, shows Step 2 OCR upload before Step 3 Health Snapshot, replaces Step 7 navigation with Sebelumnya & Mulai Lagi, hides prompt text while copying to clipboard with a popup notice, and renders ChatGPT, Gemini, Claude, Grok, and Copilot logo links', () => {
    const root = document.getElementById('app')!;
    const app = createAshaApp({ root });

    expect(app.getState().ui.currentStep).toBe(0);

    // Step 1 (index 0): Fill in "What should I call you?"
    const nicknameInput = root.querySelector('input[data-field="nickname"]') as HTMLInputElement;
    expect(nicknameInput).not.toBeNull();
    nicknameInput.value = 'Aldi';
    nicknameInput.dispatchEvent(new Event('change'));
    expect(app.getState().personal.nickname).toBe('Aldi');

    // Step 2 (index 1) must be Health Report OCR Upload (before Health Snapshot)
    app.nextStep();
    expect(app.getState().ui.currentStep).toBe(1);
    expect(root.querySelector('[data-action="ocr-file"]')).not.toBeNull();
    expect(root.querySelector('[data-biomarker="bloodPressure"]')).toBeNull();

    // Step 3 (index 2) must be Health Snapshot
    app.nextStep();
    expect(app.getState().ui.currentStep).toBe(2);
    expect(root.querySelector('[data-biomarker="bloodPressure"]')).not.toBeNull();

    // Jump to Review step (step 6 / Langkah 7/7)
    app.goToStep(6);
    expect(root.textContent).toContain(
      'Saya telah memeriksa informasi dan asumsi yang akan digunakan untuk membuat prompt.'
    );

    // On Step 7/7, standard next-step navigation button must be replaced by "Sebelumnya" and "Mulai Lagi"
    expect(root.querySelector('[data-action="next-step"]')).toBeNull();
    expect(root.querySelectorAll('[data-action="prev-step"]').length).toBeGreaterThan(0);
    const startOverBtns = root.querySelectorAll('[data-action="start-over"]');
    expect(startOverBtns.length).toBeGreaterThan(0);
    expect(startOverBtns[0].textContent).toContain('Mulai Lagi');

    // Before confirming: no popup and no prompt box displayed
    const confirmCheckbox = root.querySelector(
      'input[type="checkbox"][data-action="toggle-confirm"]'
    ) as HTMLInputElement;
    expect(confirmCheckbox).not.toBeNull();
    expect(root.querySelector('.asha-prompt-box')).toBeNull();
    expect(root.querySelector('[data-role="prompt-ready-popup"]')).toBeNull();

    // Once confirmed: prompt must NOT be displayed on screen, popup message appears with user's nickname and random motivational quote, and 5 AI logo links are rendered
    app.setConfirmed(true);
    expect(root.querySelector('.asha-prompt-box')).toBeNull();
    expect(root.textContent).not.toContain('SELURUH RESPONS HARUS MENGGUNAKAN BAHASA INDONESIA.');

    const popup = root.querySelector('[data-role="prompt-ready-popup"]');
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain('Selamat Aldi, prompt kamu sudah siap!');
    expect(popup?.textContent).toContain(
      'Silakan klik AI Chat Interface favoritmu untuk membuat plan.'
    );
    const quoteEl = root.querySelector('[data-role="motivational-quote"]');
    expect(quoteEl).not.toBeNull();
    expect((quoteEl?.textContent ?? '').trim().length).toBeGreaterThan(10);

    // Verify ChatGPT, Gemini, Claude, Grok, and Copilot logo links
    const chatgptLink = root.querySelector('[data-ai-provider="chatgpt"]') as HTMLAnchorElement;
    const geminiLink = root.querySelector('[data-ai-provider="gemini"]') as HTMLAnchorElement;
    const claudeLink = root.querySelector('[data-ai-provider="claude"]') as HTMLAnchorElement;
    const grokLink = root.querySelector('[data-ai-provider="grok"]') as HTMLAnchorElement;
    const copilotLink = root.querySelector('[data-ai-provider="copilot"]') as HTMLAnchorElement;

    expect(chatgptLink).not.toBeNull();
    expect(chatgptLink.href).toContain('chatgpt.com');
    expect(geminiLink).not.toBeNull();
    expect(geminiLink.href).toContain('gemini.google.com');
    expect(claudeLink).not.toBeNull();
    expect(claudeLink.href).toContain('claude.ai');
    expect(grokLink).not.toBeNull();
    expect(grokLink.href).toContain('grok.com');
    expect(copilotLink).not.toBeNull();
    expect(copilotLink.href).toContain('copilot.microsoft.com');

    // Clicking "Mulai Lagi" resets session and returns to Step 1 (index 0)
    (startOverBtns[0] as HTMLButtonElement).click();
    expect(app.getState().ui.currentStep).toBe(0);
    expect(app.getState().confirmation.confirmed).toBe(false);
  });

  it('provides the 6 specified ethnic group options (Asian, Kaukasian, American, Latin, Indian, Other) and progressively reveals Aspiration sub-targets before unlocking Timeframe in Step 4', () => {
    const root = document.getElementById('app')!;
    const app = createAshaApp({ root });

    // Step 0: Ethnicity should be a <select> with exact options: Asian, Kaukasian, American, Latin, Indian, Other
    const ethnicitySelect = root.querySelector('select[data-field="ethnicity"]') as HTMLSelectElement;
    expect(ethnicitySelect).not.toBeNull();
    const ethValues = Array.from(ethnicitySelect.options)
      .map((o) => o.value)
      .filter(Boolean);
    expect(ethValues).toEqual(['Asian', 'Kaukasian', 'American', 'Latin', 'Indian', 'Other']);

    // Navigate to Step 3 (4. Aspirasi, Target & Jangka Waktu)
    app.goToStep(3);

    // Initially, no aspiration is selected -> timeframe input must NOT be rendered yet
    expect(root.querySelector('[data-field="durationWeeks"]')).toBeNull();

    // 1. Build Muscle -> shows Muscle Mass (% dari berat badan), hides timeframe until filled
    app.updateGoal({ aspiration: 'build_muscle' });
    expect(root.querySelector('[data-field="muscleMassPercent"]')).not.toBeNull();
    expect(root.querySelector('[data-field="durationWeeks"]')).toBeNull();

    app.updateGoal({ muscleMassPercent: 42 });
    expect(root.querySelector('[data-field="durationWeeks"]')).not.toBeNull();
    expect(app.getState().goal.target).toContain('42%');

    // 2. Fat Loss -> shows Fat Percentage (% dari berat badan), hides timeframe until filled
    app.updateGoal({ aspiration: 'fat_loss' });
    expect(root.querySelector('[data-field="fatPercent"]')).not.toBeNull();
    expect(root.querySelector('[data-field="durationWeeks"]')).toBeNull();

    app.updateGoal({ fatPercent: 18 });
    expect(root.querySelector('[data-field="durationWeeks"]')).not.toBeNull();
    expect(app.getState().goal.target).toContain('18%');

    // 3. Weight Loss -> shows Target Weight (Kg), hides timeframe until filled
    app.updateGoal({ aspiration: 'weight_loss' });
    expect(root.querySelector('[data-field="targetWeightKg"]')).not.toBeNull();
    expect(root.querySelector('[data-field="durationWeeks"]')).toBeNull();

    app.updateGoal({ targetWeightKg: 65 });
    expect(root.querySelector('[data-field="durationWeeks"]')).not.toBeNull();
    expect(app.getState().goal.target).toContain('65 Kg');

    // 4. Improve Mobility -> immediately shows timeframe without requiring extra sub-input
    app.updateGoal({ aspiration: 'improve_mobility' });
    expect(root.querySelector('[data-field="durationWeeks"]')).not.toBeNull();

    // 5. Running Performance -> requires both Jarak Lari (runningDistance) and Target Pace (targetPace)
    app.updateGoal({ aspiration: 'running_performance' });
    expect(root.querySelector('[data-field="runningDistance"]')).not.toBeNull();
    expect(root.querySelector('[data-field="targetPace"]')).not.toBeNull();
    expect(root.querySelector('[data-field="durationWeeks"]')).toBeNull();

    app.updateGoal({ runningDistance: '10K' });
    expect(root.querySelector('[data-field="durationWeeks"]')).toBeNull();

    app.updateGoal({ targetPace: '5:30 /km' });
    expect(root.querySelector('[data-field="durationWeeks"]')).not.toBeNull();
    expect(app.getState().goal.target).toContain('10K');
    expect(app.getState().goal.target).toContain('5:30 /km');

    // 6. Health Indicator -> requires both targetBiomarker and targetBiomarkerValue
    app.updateGoal({ aspiration: 'improve_health_indicator' });
    expect(root.querySelector('select[data-field="targetBiomarker"]')).not.toBeNull();
    expect(root.querySelector('[data-field="targetBiomarkerValue"]')).not.toBeNull();
    expect(root.querySelector('[data-field="durationWeeks"]')).toBeNull();

    app.updateGoal({ targetBiomarker: 'ldl' });
    expect(root.querySelector('[data-field="durationWeeks"]')).toBeNull();

    app.updateGoal({ targetBiomarkerValue: '< 100 mg/dL' });
    expect(root.querySelector('[data-field="durationWeeks"]')).not.toBeNull();
    expect(app.getState().goal.target).toContain('LDL');
    expect(app.getState().goal.target).toContain('< 100 mg/dL');
  });

  it('renders Step 5 with time picker, Select All training days greying out rest days, Training Types checkboxes before Equipment, Treadmil / Walking Pad & Tidak Ada (Gunakan Bodyweight) equipment options, modal footer navigation, and professional Header/Footer', () => {
    const root = document.getElementById('app')!;
    const app = createAshaApp({ root });

    // Professional Header and Footer must exist on every step
    expect(root.querySelector('header.asha-header')).not.toBeNull();
    expect(root.querySelector('footer.asha-footer')).not.toBeNull();

    // Floating top/bottom wizard nav bars must be removed; navigation uses modal-footer
    expect(root.querySelectorAll('.asha-wizard-nav').length).toBe(0);
    expect(root.querySelectorAll('.asha-floating-nav').length).toBe(0);
    const modalNextBtn = root.querySelector(
      '.modal-footer [data-action="next-step"]'
    ) as HTMLButtonElement;
    expect(modalNextBtn).not.toBeNull();
    modalNextBtn.click();
    expect(app.getState().ui.currentStep).toBe(1);

    // Navigate to Step 5 (index 4)
    app.goToStep(4);

    // Preferred Training Time must be a time picker (<input type="time">)
    const timePicker = root.querySelector(
      'input[type="time"][data-field="preferredTime"]'
    ) as HTMLInputElement;
    expect(timePicker).not.toBeNull();

    // Training Types (Cardio, Strength, Mobility & Flexibility) must appear BEFORE Available Equipment
    const fieldsets = Array.from(root.querySelectorAll('.asha-session-block fieldset'));
    const trainingTypesIdx = fieldsets.findIndex((f) =>
      f.classList.contains('asha-training-types-group')
    );
    const equipmentIdx = fieldsets.findIndex((f) => f.classList.contains('asha-equipment-group'));
    expect(trainingTypesIdx).toBeGreaterThan(-1);
    expect(equipmentIdx).toBeGreaterThan(trainingTypesIdx);

    const cardioCheck = root.querySelector(
      'input[type="checkbox"][data-training-type="cardio"]'
    ) as HTMLInputElement;
    const strengthCheck = root.querySelector(
      'input[type="checkbox"][data-training-type="strength"]'
    ) as HTMLInputElement;
    const mobilityCheck = root.querySelector(
      'input[type="checkbox"][data-training-type="mobility_flexibility"]'
    ) as HTMLInputElement;
    expect(cardioCheck).not.toBeNull();
    expect(strengthCheck).not.toBeNull();
    expect(mobilityCheck).not.toBeNull();

    cardioCheck.checked = true;
    cardioCheck.dispatchEvent(new Event('change'));
    expect(app.getState().schedule.trainingTypes).toEqual(['cardio']);

    // Equipment must show "Tidak Ada (Gunakan Bodyweight)" and "Treadmil / Walking Pad"
    expect(root.textContent).toContain('Tidak Ada (Gunakan Bodyweight)');
    expect(root.textContent).toContain('Treadmil / Walking Pad');

    const treadmillCheck = root.querySelector(
      'input[type="checkbox"][data-equipment="treadmill_walking_pad"]'
    ) as HTMLInputElement;
    expect(treadmillCheck).not.toBeNull();
    treadmillCheck.checked = true;
    treadmillCheck.dispatchEvent(new Event('change'));
    expect(app.getState().equipment.selected).toContain('treadmill_walking_pad');

    // Training days and rest days must be checkboxes
    const monTrainCheck = root.querySelector(
      'input[type="checkbox"][data-training-day="Monday"]'
    ) as HTMLInputElement;
    expect(monTrainCheck).not.toBeNull();
    monTrainCheck.checked = true;
    monTrainCheck.dispatchEvent(new Event('change'));
    expect(app.getState().schedule.trainingDays).toContain('Monday');

    const tueRestCheck = root.querySelector(
      'input[type="checkbox"][data-rest-day="Tuesday"]'
    ) as HTMLInputElement;
    expect(tueRestCheck).not.toBeNull();
    tueRestCheck.checked = true;
    tueRestCheck.dispatchEvent(new Event('change'));
    expect(app.getState().schedule.restDays).toContain('Tuesday');

    // Select All (Pilih Semua) on Training Days must select all 7 days and disable/grey out Rest Days
    const selectAllTrain = root.querySelector(
      'input[type="checkbox"][data-action="select-all-training-days"]'
    ) as HTMLInputElement;
    expect(selectAllTrain).not.toBeNull();
    selectAllTrain.checked = true;
    selectAllTrain.dispatchEvent(new Event('change'));

    expect(app.getState().schedule.trainingDays.length).toBe(7);
    expect(app.getState().schedule.restDays.length).toBe(0);

    const restFieldset = root.querySelector('.asha-rest-days-group') as HTMLFieldSetElement;
    expect(restFieldset).not.toBeNull();
    expect(restFieldset.classList.contains('asha-disabled-group')).toBe(true);
    const disabledRestCheckboxes = root.querySelectorAll('input[data-rest-day]:disabled');
    expect(disabledRestCheckboxes.length).toBe(7);

    // Must have 2 session dividers in Step 5 separating the 3 sections
    const dividers = root.querySelectorAll('.asha-session-divider');
    expect(dividers.length).toBe(2);

    // IF Protocol & Eating Window must be hidden until intermittent_fasting is selected
    expect(root.querySelector('[data-field="fastingProtocol"]')).toBeNull();
    expect(root.querySelector('[data-field="eatingWindow"]')).toBeNull();

    app.updateNutrition({ diet: 'keto' });
    expect(root.querySelector('[data-field="fastingProtocol"]')).toBeNull();
    expect(root.querySelector('[data-field="eatingWindow"]')).toBeNull();

    app.updateNutrition({ diet: 'intermittent_fasting' });
    expect(root.querySelector('[data-field="fastingProtocol"]')).not.toBeNull();
    expect(root.querySelector('[data-field="eatingWindow"]')).not.toBeNull();

    // Navigate to Step 6 (index 5) and verify Calendar Provider options (Google, Outlook, Apple) and Plan Start Date date picker
    app.goToStep(5);
    const calSelect = root.querySelector(
      'select[data-field="calendarProvider"]'
    ) as HTMLSelectElement;
    expect(calSelect).not.toBeNull();
    const calOptions = Array.from(calSelect.options).map((o) => o.value);
    expect(calOptions).toEqual(['google', 'outlook', 'apple']);

    calSelect.value = 'apple';
    calSelect.dispatchEvent(new Event('change'));
    expect(app.getState().planning.calendarProvider).toBe('apple');

    const startDateInput = root.querySelector(
      'input[type="date"][data-field="startDate"]'
    ) as HTMLInputElement;
    expect(startDateInput).not.toBeNull();
    // Default startDate must be tomorrow (+1 day after today)
    const expectedTomorrow = getDefaultTomorrowStartDate();
    expect(app.getState().planning.startDate).toBe(expectedTomorrow);
    expect(startDateInput.value).toBe(expectedTomorrow);

    startDateInput.value = '2026-10-05';
    startDateInput.dispatchEvent(new Event('change'));
    expect(app.getState().planning.startDate).toBe('2026-10-05');

    // Target timeframe (durationWeeks) cannot be less than 1
    app.goToStep(3);
    app.updateGoal({ aspiration: 'improve_mobility' });
    const durationInput = root.querySelector(
      'input[type="number"][data-field="durationWeeks"]'
    ) as HTMLInputElement;
    expect(durationInput).not.toBeNull();
    expect(durationInput.getAttribute('min')).toBe('1');

    app.updateTimeframe(0);
    expect(app.getState().timeframe.durationWeeks).toBe(1);
    app.updateTimeframe(-4);
    expect(app.getState().timeframe.durationWeeks).toBe(1);

    // Verify Master Prompt instructs Gemini to generate detailed daily training & meal plan, exercise movement details, start date, and .ics calendar
    app.updateTimeframe(6);
    app.setConfirmed(true);
    const prompt = app.getMasterPrompt();
    expect(prompt).toContain('Apple');
    expect(prompt).toContain('2026-10-05');
    expect(prompt).toContain('.ics');
    expect(prompt).toMatch(/setiap harinya|day-by-day/i);
    expect(prompt).toContain('6 weeks');
    expect(prompt).toMatch(/fungsi.*manfaat gerakan/i);
    expect(prompt).toMatch(/otot yang dilatih/i);
    expect(prompt).toMatch(/repetisi/i);
    expect(prompt).toMatch(/cara melakukan gerakan/i);
    expect(prompt).toMatch(/contoh.*gambar gerakan/i);
    expect(prompt).toMatch(/darebee\.com/i);
  });

  it('SMOKE TEST: walks through Steps 1/7 to 7/7 via DOM inputs and verifies every single user input and AI-generated context is included in the Master Prompt', async () => {
    const root = document.getElementById('app')!;
    const fakeOcrAdapter = async () => ({
      rawText: [
        'Tekanan Darah: 118/76 mmHg',
        'Detak Jantung Istirahat: 62 bpm',
        'Glukosa Puasa: 91 mg/dL',
        'Asam Urat: 5.2 mg/dL',
        'Kolesterol Total: 185 mg/dL',
        'LDL: 110 mg/dL',
        'HDL: 56 mg/dL',
        'Trigliserida: 95 mg/dL'
      ].join('\n'),
      confidenceScore: 95
    });

    const app = createAshaApp({ root, ocrAdapter: fakeOcrAdapter });

    // --- STEP 1/7: Personal Info ---
    expect(app.getState().ui.currentStep).toBe(0);
    const nicknameEl = root.querySelector('input[data-field="nickname"]') as HTMLInputElement;
    nicknameEl.value = 'Rina';
    nicknameEl.dispatchEvent(new Event('change'));

    const ageEl = root.querySelector('input[data-field="age"]') as HTMLInputElement;
    ageEl.value = '31';
    ageEl.dispatchEvent(new Event('change'));

    const sexEl = root.querySelector('select[data-field="sex"]') as HTMLSelectElement;
    sexEl.value = 'female';
    sexEl.dispatchEvent(new Event('change'));

    const heightEl = root.querySelector('input[data-field="height"]') as HTMLInputElement;
    heightEl.value = '164';
    heightEl.dispatchEvent(new Event('change'));

    const weightEl = root.querySelector('input[data-field="weight"]') as HTMLInputElement;
    weightEl.value = '63';
    weightEl.dispatchEvent(new Event('change'));

    const ethEl = root.querySelector('select[data-field="ethnicity"]') as HTMLSelectElement;
    ethEl.value = 'Asian';
    ethEl.dispatchEvent(new Event('change'));

    // --- STEP 2/7: OCR Health Report Upload & Confirmation ---
    app.nextStep();
    expect(app.getState().ui.currentStep).toBe(1);
    await app.uploadHealthReport('medical-checkup.png');
    const confirmOcrBtn = root.querySelector('[data-action="confirm-ocr"]') as HTMLButtonElement;
    confirmOcrBtn.click();

    // --- STEP 3/7: Health Snapshot (verify OCR values & add custom indicator) ---
    app.nextStep();
    expect(app.getState().ui.currentStep).toBe(2);
    const otherHealthEl = root.querySelector('input[data-field="health-other"]') as HTMLInputElement;
    otherHealthEl.value = 'Vitamin D: 32 ng/mL';
    otherHealthEl.dispatchEvent(new Event('change'));

    // --- STEP 4/7: Aspiration, Target & Timeframe ---
    app.nextStep();
    expect(app.getState().ui.currentStep).toBe(3);
    const aspirationEl = root.querySelector('select[data-field="aspiration"]') as HTMLSelectElement;
    aspirationEl.value = 'running_performance';
    aspirationEl.dispatchEvent(new Event('change'));

    const runDistEl = root.querySelector('select[data-field="runningDistance"]') as HTMLSelectElement;
    runDistEl.value = 'half_marathon';
    runDistEl.dispatchEvent(new Event('change'));

    const paceEl = root.querySelector('input[data-field="targetPace"]') as HTMLInputElement;
    paceEl.value = '5:45 /km';
    paceEl.dispatchEvent(new Event('change'));

    const perfEl = root.querySelector('input[data-field="currentPerformance"]') as HTMLInputElement;
    perfEl.value = '10K in 58 minutes';
    perfEl.dispatchEvent(new Event('change'));

    const weeksEl = root.querySelector('input[data-field="durationWeeks"]') as HTMLInputElement;
    weeksEl.value = '12';
    weeksEl.dispatchEvent(new Event('change'));

    // --- STEP 5/7: Schedule, Training Types, Equipment, Time & Duration, Diet ---
    app.nextStep();
    expect(app.getState().ui.currentStep).toBe(4);
    for (const day of ['Monday', 'Wednesday', 'Friday', 'Saturday']) {
      const cb = root.querySelector(
        `input[type="checkbox"][data-training-day="${day}"]`
      ) as HTMLInputElement;
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
    }
    for (const day of ['Tuesday', 'Thursday', 'Sunday']) {
      const cb = root.querySelector(
        `input[type="checkbox"][data-rest-day="${day}"]`
      ) as HTMLInputElement;
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
    }
    for (const tType of ['cardio', 'strength', 'mobility_flexibility']) {
      const cb = root.querySelector(
        `input[type="checkbox"][data-training-type="${tType}"]`
      ) as HTMLInputElement;
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
    }
    for (const eq of ['dumbbells', 'treadmill_walking_pad']) {
      const cb = root.querySelector(
        `input[type="checkbox"][data-equipment="${eq}"]`
      ) as HTMLInputElement;
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
    }

    const prefTimeEl = root.querySelector('input[data-field="preferredTime"]') as HTMLInputElement;
    prefTimeEl.value = '06:15';
    prefTimeEl.dispatchEvent(new Event('change'));

    const durMinEl = root.querySelector(
      'input[data-field="sessionDurationMinutes"]'
    ) as HTMLInputElement;
    durMinEl.value = '50';
    durMinEl.dispatchEvent(new Event('change'));

    const dietEl = root.querySelector('select[data-field="diet"]') as HTMLSelectElement;
    dietEl.value = 'intermittent_fasting';
    dietEl.dispatchEvent(new Event('change'));

    const ifProtoEl = root.querySelector(
      'select[data-field="fastingProtocol"]'
    ) as HTMLSelectElement;
    ifProtoEl.value = '16:8';
    ifProtoEl.dispatchEvent(new Event('change'));

    const eatWinEl = root.querySelector('input[data-field="eatingWindow"]') as HTMLInputElement;
    eatWinEl.value = '11:30 - 19:30';
    eatWinEl.dispatchEvent(new Event('change'));

    // --- STEP 6/7: Plan Type, Integration, Start Date, Calendar, Visual Mode, Reminder, Conditionals ---
    app.nextStep();
    expect(app.getState().ui.currentStep).toBe(5);
    const startDateEl = root.querySelector('input[data-field="startDate"]') as HTMLInputElement;
    startDateEl.value = '2026-10-12';
    startDateEl.dispatchEvent(new Event('change'));

    const calProvEl = root.querySelector(
      'select[data-field="calendarProvider"]'
    ) as HTMLSelectElement;
    calProvEl.value = 'outlook';
    calProvEl.dispatchEvent(new Event('change'));

    const remEl = root.querySelector('input[data-field="reminderMinutesBefore"]') as HTMLInputElement;
    remEl.value = '45';
    remEl.dispatchEvent(new Event('change'));

    const cycleInput = root.querySelector(
      'input[data-conditional="menstrual_cycle"]'
    ) as HTMLInputElement;
    expect(cycleInput).not.toBeNull();
    cycleInput.value = 'Reduce high-impact load on day 1-2 of cycle';
    cycleInput.dispatchEvent(new Event('change'));

    const boneInput = root.querySelector(
      'input[data-conditional="bone_health"]'
    ) as HTMLInputElement;
    expect(boneInput).not.toBeNull();
    boneInput.value = 'Include tibial & hip bone-loading strength work';
    boneInput.dispatchEvent(new Event('change'));

    // --- STEP 7/7: Review (Pre-filled Form Style), Confirm, Popup & Master Prompt Verification ---
    app.nextStep();
    expect(app.getState().ui.currentStep).toBe(6);

    // Verify logo from pics/logo.png and Bootstrap layout classes
    const logoImg = root.querySelector('img[data-role="asha-logo"]') as HTMLImageElement;
    expect(logoImg).not.toBeNull();
    expect(logoImg.getAttribute('src')).toBe('pics/logo.png');
    expect(root.querySelector('.asha-shell.container')).not.toBeNull();

    // Verify Modal Dialog Form Wizard with Timeline & Dot Indicator (#smartwizard, sw-theme-dots, asha-timeline-wizard)
    expect(root.querySelector('[data-role="wizard-modal-dialog"].modal-dialog')).not.toBeNull();
    const smartWizardEl = root.querySelector(
      '#smartwizard.sw-main.sw-theme-dots.asha-timeline-wizard'
    );
    expect(smartWizardEl).not.toBeNull();
    const timelineTabs = smartWizardEl?.querySelectorAll(
      'ul.step-anchor[data-role="wizard-timeline-tabs"] > li.asha-timeline-step'
    );
    expect(timelineTabs?.length).toBe(7);
    expect(smartWizardEl?.querySelectorAll('[data-role="timeline-dot"].asha-timeline-dot').length).toBe(
      7
    );
    expect(smartWizardEl?.querySelectorAll('ul.step-anchor > li.done').length).toBe(6);
    expect(smartWizardEl?.querySelectorAll('ul.step-anchor > li.active').length).toBe(1);

    // Verify Step 7/7 uses pre-filled form style with readonly Bootstrap form-control inputs
    const reviewForm = root.querySelector('form[data-role="review-prefilled-form"]');
    expect(reviewForm).not.toBeNull();

    const getReviewVal = (field: string) =>
      (
        root.querySelector(
          `[data-review-field="${field}"].form-control.asha-prefilled-input[readonly]`
        ) as HTMLInputElement | HTMLTextAreaElement | null
      )?.value;

    expect(getReviewVal('nickname')).toBe('Rina');
    expect(getReviewVal('age')).toBe('31');
    expect(getReviewVal('sex')).toBe('female');
    expect(getReviewVal('height')).toBe('164 cm');
    expect(getReviewVal('weight')).toBe('63 kg');
    expect(getReviewVal('ethnicity')).toBe('Asian');
    expect(getReviewVal('health-bloodPressure')).toBe('118/76 mmHg');
    expect(getReviewVal('health-ldl')).toBe('110 mg/dL');
    expect(getReviewVal('health-other')).toBe('Vitamin D: 32 ng/mL');
    expect(getReviewVal('aspiration')).toBe('running_performance');
    expect(getReviewVal('durationWeeks')).toBe('12 minggu');
    expect(getReviewVal('trainingDays')).toBe('Monday, Wednesday, Friday, Saturday');
    expect(getReviewVal('trainingTypes')).toBe('cardio, strength, mobility_flexibility');
    expect(getReviewVal('preferredTime')).toBe('06:15');
    expect(getReviewVal('startDate')).toBe('2026-10-12');
    expect(getReviewVal('calendarProvider')).toBe('OUTLOOK');

    const confirmCheck = root.querySelector(
      'input[type="checkbox"][data-action="toggle-confirm"]'
    ) as HTMLInputElement;
    confirmCheck.checked = true;
    confirmCheck.dispatchEvent(new Event('change'));

    // Verify floating navigation bars are removed
    expect(root.querySelectorAll('[data-role="floating-nav"].asha-floating-nav').length).toBe(0);
    expect(root.querySelector('.asha-floating-nav-top')).toBeNull();
    expect(root.querySelector('.asha-floating-nav-bottom')).toBeNull();

    // Verify floating popup overlay and greeting with nickname and random quote
    const floatingOverlayEl = root.querySelector(
      '[data-role="floating-popup-overlay"].asha-floating-popup-overlay'
    );
    expect(floatingOverlayEl).not.toBeNull();

    const popupEl = root.querySelector('[data-role="prompt-ready-popup"].asha-floating-popup');
    expect(popupEl).not.toBeNull();
    expect(popupEl?.textContent).toContain('Selamat Rina, prompt kamu sudah siap!');
    expect(popupEl?.textContent).toContain(
      'Silakan klik AI Chat Interface favoritmu untuk membuat plan.'
    );

    // Verify no .ics download buttons inside the floating popup (.ics is generated by executing the prompt)
    expect(popupEl?.querySelector('[data-action="download-training-ics"]')).toBeNull();
    expect(popupEl?.querySelector('[data-action="download-diet-ics"]')).toBeNull();

    // Verify centered AI logos, "Susun Rencana Baru" button below logos, and centered quote at the bottom
    const logosGridEl = popupEl?.querySelector('.asha-ai-providers-grid.justify-content-center');
    expect(logosGridEl).not.toBeNull();
    expect(logosGridEl?.querySelectorAll('[data-ai-provider]').length).toBe(5);

    const newPlanBtn = popupEl?.querySelector(
      '[data-role="popup-new-plan-btn"][data-action="start-over"]'
    ) as HTMLButtonElement;
    expect(newPlanBtn).not.toBeNull();
    expect(newPlanBtn.textContent).toContain('Susun Rencana Baru');

    const quoteEl = popupEl?.querySelector('[data-role="motivational-quote"].text-center');
    expect(quoteEl).not.toBeNull();
    // Quote must be the last element inside the floating popup dialog
    expect(popupEl?.lastElementChild).toBe(quoteEl);

    // Verify EVERY user-provided field and generated personalization context is in the Master Prompt
    const masterPrompt = app.getMasterPrompt();
    expect(masterPrompt).toContain('Preferred Name / Nickname: Rina');
    expect(masterPrompt).toContain('Sapa pengguna dengan nama panggilan "Rina"');
    expect(masterPrompt).toContain('Age: 31');
    expect(masterPrompt).toContain('Sex: female');
    expect(masterPrompt).toContain('Ethnicity: Asian');
    expect(masterPrompt).toContain('Height: 164 cm');
    expect(masterPrompt).toContain('Weight: 63 kg');
    expect(masterPrompt).toContain('Blood Pressure: 118/76 mmHg');
    expect(masterPrompt).toContain('Resting Heart Rate: 62 bpm');
    expect(masterPrompt).toContain('Blood Glucose: 91 mg/dL');
    expect(masterPrompt).toContain('Uric Acid: 5.2 mg/dL');
    expect(masterPrompt).toContain('Total Cholesterol: 185 mg/dL');
    expect(masterPrompt).toContain('LDL: 110 mg/dL');
    expect(masterPrompt).toContain('HDL: 56 mg/dL');
    expect(masterPrompt).toContain('Triglycerides: 95 mg/dL');
    expect(masterPrompt).toContain('Other Indicators: Vitamin D: 32 ng/mL');
    expect(masterPrompt).toContain('Aspiration: Running performance');
    expect(masterPrompt).toContain('Running Distance: half_marathon');
    expect(masterPrompt).toContain('Target Pace: 5:45 /km');
    expect(masterPrompt).toContain('Current Performance / History: 10K in 58 minutes');
    expect(masterPrompt).toContain('Timeframe: 12 weeks (provided)');
    expect(masterPrompt).toContain('Training Days: Monday, Wednesday, Friday, Saturday');
    expect(masterPrompt).toContain('Training Types: Cardio, Strength, Mobility & Flexibility');
    expect(masterPrompt).toContain('Session Duration: 50 minutes');
    expect(masterPrompt).toContain('Rest Days: Tuesday, Thursday, Sunday');
    expect(masterPrompt).toContain('Preferred Training Time: 06:15');
    expect(masterPrompt).toContain('Equipment: Dumbbells, Treadmill / Walking Pad');
    expect(masterPrompt).toContain('Diet: Intermittent Fasting (16:8, window: 11:30 - 19:30)');
    expect(masterPrompt).toContain('Plan Start Date: 2026-10-12');
    expect(masterPrompt).toContain('Target Calendar Platform: Outlook Calendar (Reminder: 45 minutes before event)');
    expect(masterPrompt).toContain('menstrual_cycle: Reduce high-impact load on day 1-2 of cycle');
    expect(masterPrompt).toContain('bone_health: Include tibial & hip bone-loading strength work');
    expect(masterPrompt).toContain('Sex-Specific Factor:');
    expect(masterPrompt).toContain('Training Consideration:');
    expect(masterPrompt).toContain('Nutrition Consideration:');
    expect(masterPrompt).toContain('https://darebee.com');
    expect(masterPrompt).toMatch(/dalam bentuk tabel/i);
    expect(masterPrompt).toContain(
      'Hasilkan file .ics untuk training plan yang disusun yang siap saya download dan impor ke kalender saya'
    );
    expect(masterPrompt).not.toContain('QUALITY CONTROL CHECKLIST');

    // Verify floating popup close button dismisses the floating popup overlay
    const closePopupBtn = popupEl?.querySelector(
      '[data-action="close-popup"]'
    ) as HTMLButtonElement;
    expect(closePopupBtn).not.toBeNull();
    closePopupBtn.click();
    expect(root.querySelector('[data-role="floating-popup-overlay"]')).toBeNull();
  });
});


