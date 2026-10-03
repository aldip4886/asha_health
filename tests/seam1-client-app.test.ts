import { describe, expect, it, beforeEach } from 'vitest';
import { createAshaApp } from '../src/app';

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
    expect(document.body.textContent).toContain('Start');

    app.updatePersonal({ age: 34, sex: 'male', height: 172, weight: 74 });
    app.updateGoal({ aspiration: 'build_muscle', target: 'Gain 3 kg lean mass' });
    app.setConfirmed(true);

    const prompt = app.getMasterPrompt();
    expect(prompt).toContain('ASHA MASTER PROMPT');
    expect(prompt).toContain('SELURUH RESPONS HARUS MENGGUNAKAN BAHASA INDONESIA.');
    expect(prompt).toContain('Age: 34');
    expect(prompt).toContain('Aspiration: Build muscle');
  });

  it('independently updates Visual Persona upon sex selection with fade transition without altering health recommendation rules', () => {
    const app = createAshaApp({ root: document.getElementById('app')! });

    expect(app.getState().personalization.visualPersona).toBe('neutral');

    app.updatePersonal({ sex: 'male' });
    expect(app.getState().personalization.visualPersona).toBe('female_active');
    expect(document.documentElement.style.getPropertyValue('--asha-persona-background')).toContain(
      'Hijabi Athlete in Mauve Activewear.png'
    );
    expect(document.body.classList.contains('persona-transition')).toBe(true);

    app.updatePersonal({ sex: 'female' });
    expect(app.getState().personalization.visualPersona).toBe('male_active');
    expect(document.documentElement.style.getPropertyValue('--asha-persona-background')).toContain(
      'Modern Activewear Duo in White Studio.png'
    );

    app.updatePersonal({ sex: 'unspecified' });
    expect(app.getState().personalization.visualPersona).toBe('neutral');
    expect(document.documentElement.style.getPropertyValue('--asha-persona-background')).toContain(
      'Minimalist Fitness Portrait with Negative Space.png'
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

  it('renders interactive step-by-step wizard navigation, shows Step 2 OCR upload before Step 3 Health Snapshot, and shows only confirmation without extra buttons on Step 7', () => {
    const root = document.getElementById('app')!;
    const app = createAshaApp({ root });

    expect(app.getState().ui.currentStep).toBe(0);

    // Step 2 (index 1) must be Health Report OCR Upload (before Health Snapshot)
    app.nextStep();
    expect(app.getState().ui.currentStep).toBe(1);
    expect(root.querySelector('[data-action="ocr-file"]')).not.toBeNull();
    expect(root.querySelector('[data-biomarker="bloodPressure"]')).toBeNull();

    // Step 3 (index 2) must be Health Snapshot
    app.nextStep();
    expect(app.getState().ui.currentStep).toBe(2);
    expect(root.querySelector('[data-biomarker="bloodPressure"]')).not.toBeNull();

    // Jump to Review step (step 6 / Bagian 7)
    app.goToStep(6);
    expect(root.textContent).toContain(
      'Saya telah memeriksa informasi dan asumsi yang akan digunakan untuk membuat prompt.'
    );

    // Bagian 7 must ONLY display the confirmation before confirming (0 buttons)
    const confirmCheckbox = root.querySelector(
      'input[type="checkbox"][data-action="toggle-confirm"]'
    ) as HTMLInputElement;
    expect(confirmCheckbox).not.toBeNull();
    expect(root.querySelectorAll('.asha-review-card button').length).toBe(0);

    // Once confirmed and prompt is generated, show the Copy Prompt button
    app.setConfirmed(true);
    const copyPromptBtn = root.querySelector(
      '.asha-review-card button[data-action="copy-prompt"]'
    ) as HTMLButtonElement;
    expect(copyPromptBtn).not.toBeNull();
    expect(root.querySelectorAll('.asha-review-card button').length).toBe(1);
    expect(root.textContent).toContain('SELURUH RESPONS HARUS MENGGUNAKAN BAHASA INDONESIA.');
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

  it('renders Step 5 with time picker, Select All training days greying out rest days, Tidak Ada (Gunakan Bodyweight) equipment option, top & bottom navigation, and professional Header/Footer', () => {
    const root = document.getElementById('app')!;
    const app = createAshaApp({ root });

    // Professional Header and Footer must exist on every step
    expect(root.querySelector('header.asha-header')).not.toBeNull();
    expect(root.querySelector('footer.asha-footer')).not.toBeNull();

    // Top and bottom navigation bars must exist on every step
    expect(root.querySelectorAll('.asha-wizard-nav').length).toBe(2);
    const bottomNextBtn = root.querySelector(
      '.asha-wizard-nav-bottom [data-action="next-step"]'
    ) as HTMLButtonElement;
    expect(bottomNextBtn).not.toBeNull();
    bottomNextBtn.click();
    expect(app.getState().ui.currentStep).toBe(1);

    // Navigate to Step 5 (index 4)
    app.goToStep(4);

    // Preferred Training Time must be a time picker (<input type="time">)
    const timePicker = root.querySelector(
      'input[type="time"][data-field="preferredTime"]'
    ) as HTMLInputElement;
    expect(timePicker).not.toBeNull();

    // Equipment must show "Tidak Ada (Gunakan Bodyweight)"
    expect(root.textContent).toContain('Tidak Ada (Gunakan Bodyweight)');

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
    startDateInput.value = '2026-10-05';
    startDateInput.dispatchEvent(new Event('change'));
    expect(app.getState().planning.startDate).toBe('2026-10-05');

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
  });
});


