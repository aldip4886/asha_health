import {
  AshaAppState,
  AspirationType,
  BIOMARKER_KEYS,
  BIOMARKER_LABELS,
  BiomarkerKey,
  CalendarProvider,
  ConditionalQuestionItem,
  DAYS_OF_WEEK,
  DietType,
  ETHNICITY_OPTIONS,
  EquipmentItem,
  ExerciseVisualMode,
  FastingProtocol,
  GeminiBridgeAdapter,
  GoalState,
  HealthSnapshot,
  IntegrationModeOption,
  Language,
  NutritionState,
  OcrAdapter,
  PersonalInfo,
  PlanningState,
  PlanTypeOption,
  RunningDistance,
  ScheduleState,
  SexSelection,
  TrainingType
} from './types';
import { applyPersonaBackgroundToDom, resolveVisualPersona } from './persona';
import { defaultTesseractOcrAdapter, parseHealthReportText } from './ocr';
import { applyAssumptionsAndPersonalization } from './personalization';
import { generateEnglishMasterPrompt } from './prompt';
import {
  buildContextSnapshotMarkdown,
  buildDietCalendarIcs,
  buildTrainingCalendarIcs
} from './exporters';

const LOADING_MESSAGE_ID = 'ASHA sedang menyiapkan rencanamu...';
const TOTAL_WIZARD_STEPS = 7;

export const MOTIVATIONAL_QUOTES: readonly string[] = [
  'Langkah kecil hari ini adalah awal dari perubahan besar esok hari. Kamu pasti bisa!',
  'Konsistensi lebih penting daripada kesempurnaan. Terus bergerak maju!',
  'Tubuh yang sehat dibangun dari kebiasaan baik yang dilakukan setiap hari.',
  'Setiap tetes keringat hari ini adalah investasi terbaik untuk masa depanmu.',
  'Jangan tunggu sempurna untuk memulai — mulailah sekarang dan jadilah lebih kuat setiap hari!',
  'Disiplin adalah jembatan antara target kesehatanmu dan pencapaian nyata.'
];

function pickRandomMotivationalQuote(): string {
  const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[index] ?? MOTIVATIONAL_QUOTES[0];
}

const DAY_LABELS_ID: Record<(typeof DAYS_OF_WEEK)[number], string> = {
  Monday: 'Senin',
  Tuesday: 'Selasa',
  Wednesday: 'Rabu',
  Thursday: 'Kamis',
  Friday: 'Jumat',
  Saturday: 'Sabtu',
  Sunday: 'Minggu'
};

function incrementMinorVersion(version: string): string {
  const match = version.match(/^v(\d+)\.(\d+)$/);
  if (!match) return 'v1.1';
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10) + 1;
  return `v${major}.${minor}`;
}

function isGoalTargetReadyForTimeframe(goal: GoalState): boolean {
  if (!goal.aspiration) return false;
  switch (goal.aspiration) {
    case 'build_muscle':
      return goal.muscleMassPercent !== null && goal.muscleMassPercent !== undefined;
    case 'fat_loss':
      return goal.fatPercent !== null && goal.fatPercent !== undefined;
    case 'weight_loss':
      return goal.targetWeightKg !== null && goal.targetWeightKg !== undefined;
    case 'improve_mobility':
    case 'improve_overall_health':
      return true;
    case 'running_performance':
      return Boolean(
        goal.runningDistance && goal.targetPace && goal.targetPace.trim().length > 0
      );
    case 'improve_health_indicator':
      return Boolean(
        goal.targetBiomarker &&
          goal.targetBiomarkerValue &&
          goal.targetBiomarkerValue.trim().length > 0
      );
    default:
      return false;
  }
}

function deriveStructuredTargetSummary(goal: GoalState): string | null {
  switch (goal.aspiration) {
    case 'build_muscle':
      return goal.muscleMassPercent !== null && goal.muscleMassPercent !== undefined
        ? `Muscle Mass: ${goal.muscleMassPercent}% (% dari berat badan)`
        : goal.target;
    case 'fat_loss':
      return goal.fatPercent !== null && goal.fatPercent !== undefined
        ? `Fat Percentage: ${goal.fatPercent}% (% dari berat badan)`
        : goal.target;
    case 'weight_loss':
      return goal.targetWeightKg !== null && goal.targetWeightKg !== undefined
        ? `Target Weight: ${goal.targetWeightKg} Kg`
        : goal.target;
    case 'improve_mobility':
      return goal.target ?? 'Improve Mobility';
    case 'running_performance':
      if (goal.runningDistance && goal.targetPace) {
        return `Jarak Lari: ${goal.runningDistance}, Target Pace: ${goal.targetPace}`;
      }
      return goal.target;
    case 'improve_health_indicator':
      if (goal.targetBiomarker && goal.targetBiomarkerValue) {
        const label =
          goal.targetBiomarker === 'other'
            ? 'Other Indicator'
            : BIOMARKER_LABELS[goal.targetBiomarker];
        return `${label}: ${goal.targetBiomarkerValue}`;
      }
      return goal.target;
    default:
      return goal.target;
  }
}

function createInitialHealthSnapshot(): HealthSnapshot {
  const snapshot = { other: null } as HealthSnapshot;
  for (const key of BIOMARKER_KEYS) {
    snapshot[key] = { value: null, fieldState: 'missing' };
  }
  return snapshot;
}

export function getDefaultTomorrowStartDate(now: Date = new Date()): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function createInitialState(): AshaAppState {
  const defaultStartDate = getDefaultTomorrowStartDate();
  return {
    ui: {
      language: 'id',
      currentStep: 0,
      showMasterPrompt: false,
      showCalendarPreview: false,
      motivationalQuote: null
    },
    personal: {
      nickname: null,
      age: null,
      sex: null,
      ethnicity: null,
      height: null,
      weight: null
    },
    health: createInitialHealthSnapshot(),
    healthReport: {
      fileName: null,
      rawText: null,
      extracted: {
        bloodPressure: null,
        restingHeartRate: null,
        bloodGlucose: null,
        uricAcid: null,
        totalCholesterol: null,
        ldl: null,
        hdl: null,
        triglycerides: null
      },
      confirmed: false
    },
    goal: {
      aspiration: null,
      target: null,
      muscleMassPercent: null,
      fatPercent: null,
      targetWeightKg: null,
      runningDistance: null,
      targetPace: null,
      currentPerformance: null,
      targetBiomarker: null,
      targetBiomarkerValue: null
    },
    timeframe: {
      durationWeeks: null,
      fieldState: 'missing'
    },
    schedule: {
      trainingDays: [],
      trainingTypes: [],
      sessionDurationMinutes: null,
      restDays: [],
      preferredTime: null,
      fieldStates: {
        trainingDays: 'missing',
        trainingTypes: 'missing',
        sessionDurationMinutes: 'missing',
        restDays: 'missing',
        preferredTime: 'missing'
      }
    },
    equipment: {
      selected: [],
      fieldState: 'missing'
    },
    nutrition: {
      diet: null,
      fastingProtocol: null,
      eatingWindow: null
    },
    planning: {
      planType: 'training_and_meal',
      integrationMode: 'optimize_together',
      exerciseVisualMode: 'external_reference',
      reminderMinutesBefore: 30,
      calendarProvider: 'google',
      startDate: defaultStartDate
    },
    exerciseGuide: {
      visualMode: 'external_reference'
    },
    calendar: {
      reminderMinutesBefore: 30,
      previewOpen: false,
      provider: 'google',
      startDate: defaultStartDate
    },
    personalization: {
      visualPersona: 'neutral',
      sexSpecificFactors: [],
      trainingConsiderations: [],
      nutritionConsiderations: [],
      conditionalQuestions: [],
      confirmed: false
    },
    assumptions: [],
    confirmation: {
      confirmed: false
    },
    chat: {
      active: false,
      loading: false,
      loadingMessage: null,
      currentVersion: 'v1.0',
      pendingReplacementContent: null,
      turns: [],
      error: null
    }
  };
}

const defaultAppsScriptBridge: GeminiBridgeAdapter = async (payload) => {
  const g = (globalThis as unknown as {
    google?: {
      script?: {
        run?: {
          withSuccessHandler: (cb: (res: unknown) => void) => {
            withFailureHandler: (errCb: (err: unknown) => void) => {
              sendMessageToGemini: (arg: unknown) => void;
            };
          };
        };
      };
    };
  }).google;

  if (g?.script?.run) {
    return new Promise((resolve) => {
      g.script!.run!
        .withSuccessHandler((res) => resolve(res as Awaited<ReturnType<GeminiBridgeAdapter>>))
        .withFailureHandler((err) =>
          resolve({
            ok: false,
            error: err instanceof Error ? err.message : String(err)
          })
        )
        .sendMessageToGemini(payload);
    });
  }

  return {
    ok: true,
    text: 'Rencana Kesehatan ASHA (v1.0) siap dalam Bahasa Indonesia. Silakan gunakan tombol Salin Master Prompt jika Anda menjalankan mode lokal tanpa Apps Script.',
    planVersion: 'v1.0'
  };
};

function triggerBrowserDownload(filename: string, content: string, mimeType: string) {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export interface CreateAshaAppOptions {
  root?: HTMLElement;
  ocrAdapter?: OcrAdapter;
  geminiBridge?: GeminiBridgeAdapter;
}

export function createAshaApp(options: CreateAshaAppOptions = {}) {
  let state: AshaAppState = createInitialState();
  const root = options.root;
  const ocrAdapter: OcrAdapter = options.ocrAdapter ?? defaultTesseractOcrAdapter;
  const geminiBridge: GeminiBridgeAdapter = options.geminiBridge ?? defaultAppsScriptBridge;

  function markDirty() {
    state.confirmation.confirmed = false;
  }

  function escapeAttr(val: string | number | null | undefined): string {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderStep4GoalSection(isId: boolean): string {
    const aspiration = state.goal.aspiration;
    let targetStageHtml = '';

    if (aspiration === 'build_muscle') {
      targetStageHtml = `
        <label class="form-label">
          <span>${isId ? 'Muscle Mass (% dari berat badan)' : 'Muscle Mass (% of body weight)'}</span>
          <input type="number" step="0.1" class="form-control" data-field="muscleMassPercent" value="${
            state.goal.muscleMassPercent ?? ''
          }" placeholder="42" />
        </label>
      `;
    } else if (aspiration === 'fat_loss') {
      targetStageHtml = `
        <label class="form-label">
          <span>${
            isId ? 'Fat Percentage (% dari berat badan)' : 'Fat Percentage (% of body weight)'
          }</span>
          <input type="number" step="0.1" class="form-control" data-field="fatPercent" value="${
            state.goal.fatPercent ?? ''
          }" placeholder="18" />
        </label>
      `;
    } else if (aspiration === 'weight_loss') {
      targetStageHtml = `
        <label class="form-label">
          <span>${isId ? 'Target Weight (Kg)' : 'Target Weight (Kg)'}</span>
          <input type="number" step="0.1" class="form-control" data-field="targetWeightKg" value="${
            state.goal.targetWeightKg ?? ''
          }" placeholder="65" />
        </label>
      `;
    } else if (aspiration === 'improve_mobility') {
      targetStageHtml = `
        <p class="asha-stage-note alert alert-warning mb-0">${
          isId
            ? 'Improve Mobility dipilih — silakan langsung tentukan target waktu Anda di bawah.'
            : 'Improve Mobility selected — you may proceed directly to set your target timeframe below.'
        }</p>
      `;
    } else if (aspiration === 'improve_overall_health') {
      targetStageHtml = `
        <label class="form-label">
          <span>${isId ? 'Target Spesifik (Opsional)' : 'Specific Target (Optional)'}</span>
          <input type="text" class="form-control" data-field="target" value="${escapeAttr(state.goal.target)}" />
        </label>
      `;
    } else if (aspiration === 'running_performance') {
      targetStageHtml = `
        <label class="form-label">
          <span>${isId ? 'Jarak Lari' : 'Running Distance'}</span>
          <select class="form-select" data-field="runningDistance">
            <option value="" ${!state.goal.runningDistance ? 'selected' : ''}>${
              isId ? '-- Pilih Jarak --' : '-- Select Distance --'
            }</option>
            <option value="5K" ${state.goal.runningDistance === '5K' ? 'selected' : ''}>5K</option>
            <option value="10K" ${state.goal.runningDistance === '10K' ? 'selected' : ''}>10K</option>
            <option value="half_marathon" ${
              state.goal.runningDistance === 'half_marathon' ? 'selected' : ''
            }>Half Marathon</option>
            <option value="full_marathon" ${
              state.goal.runningDistance === 'full_marathon' ? 'selected' : ''
            }>Full Marathon</option>
          </select>
        </label>
        <label class="form-label">
          <span>${isId ? 'Target Pace (menit/km atau waktu tempuh)' : 'Target Pace'}</span>
          <input type="text" class="form-control" data-field="targetPace" value="${escapeAttr(
            state.goal.targetPace
          )}" placeholder="5:30 /km" />
        </label>
        <label class="form-label">
          <span>${isId ? 'Performa Saat Ini (Opsional)' : 'Current Performance (Optional)'}</span>
          <input type="text" class="form-control" data-field="currentPerformance" value="${escapeAttr(
            state.goal.currentPerformance
          )}" />
        </label>
      `;
    } else if (aspiration === 'improve_health_indicator') {
      const biomarkerOptions = BIOMARKER_KEYS.map(
        (key) =>
          `<option value="${key}" ${
            state.goal.targetBiomarker === key ? 'selected' : ''
          }>${BIOMARKER_LABELS[key]}</option>`
      ).join('');

      targetStageHtml = `
        <label class="form-label">
          <span>${isId ? 'Indikator Kesehatan' : 'Health Indicator'}</span>
          <select class="form-select" data-field="targetBiomarker">
            <option value="" ${!state.goal.targetBiomarker ? 'selected' : ''}>${
              isId ? '-- Pilih Indikator --' : '-- Select Indicator --'
            }</option>
            ${biomarkerOptions}
            <option value="other" ${state.goal.targetBiomarker === 'other' ? 'selected' : ''}>${
              isId ? 'Lainnya' : 'Other'
            }</option>
          </select>
        </label>
        <label class="form-label">
          <span>${isId ? 'Target Indikator Kesehatan' : 'Target Indicator Value'}</span>
          <input type="text" class="form-control" data-field="targetBiomarkerValue" value="${escapeAttr(
            state.goal.targetBiomarkerValue
          )}" placeholder="< 100 mg/dL" />
        </label>
      `;
    }

    const showTimeframe = isGoalTargetReadyForTimeframe(state.goal);
    const timeframeHtml = showTimeframe
      ? `
        <div class="asha-timeframe-stage mt-3">
          <label class="form-label">
            <span>${isId ? 'Target Waktu / Durasi Rencana (Minggu)' : 'Target Timeframe (Weeks)'}</span>
            <input type="number" min="1" class="form-control" data-field="durationWeeks" value="${
              state.timeframe.durationWeeks ?? ''
            }" placeholder="8" />
          </label>
        </div>
      `
      : '';

    return `
      <section class="asha-card card shadow-sm">
        <h2>${isId ? '4. Aspirasi, Target & Jangka Waktu' : '4. Aspiration, Target & Timeframe'}</h2>
        <div class="asha-grid">
          <label class="form-label">
            <span>${isId ? 'Aspirasi Utama' : 'Primary Aspiration'}</span>
            <select class="form-select" data-field="aspiration">
              <option value="" ${state.goal.aspiration === null ? 'selected' : ''}>${
                isId ? '-- Pilih Aspirasi --' : '-- Select Aspiration --'
              }</option>
              <option value="build_muscle" ${
                state.goal.aspiration === 'build_muscle' ? 'selected' : ''
              }>Build Muscle</option>
              <option value="fat_loss" ${
                state.goal.aspiration === 'fat_loss' ? 'selected' : ''
              }>Fat Loss</option>
              <option value="weight_loss" ${
                state.goal.aspiration === 'weight_loss' ? 'selected' : ''
              }>Weight Loss</option>
              <option value="improve_mobility" ${
                state.goal.aspiration === 'improve_mobility' ? 'selected' : ''
              }>Improve Mobility</option>
              <option value="improve_overall_health" ${
                state.goal.aspiration === 'improve_overall_health' ? 'selected' : ''
              }>Improve Overall Health</option>
              <option value="running_performance" ${
                state.goal.aspiration === 'running_performance' ? 'selected' : ''
              }>Running Performance</option>
              <option value="improve_health_indicator" ${
                state.goal.aspiration === 'improve_health_indicator' ? 'selected' : ''
              }>Improve Health Indicator</option>
            </select>
          </label>
          ${targetStageHtml}
        </div>
        ${timeframeHtml}
      </section>
    `;
  }

  function renderStepContent(isId: boolean): string {
    const step = state.ui.currentStep;

    if (step === 0) {
      const ethnicityOptionsHtml = ETHNICITY_OPTIONS.map(
        (eth) =>
          `<option value="${eth}" ${
            state.personal.ethnicity === eth ? 'selected' : ''
          }>${eth}</option>`
      ).join('');

      return `
        <section class="asha-card card shadow-sm">
          <h2>${isId ? '1. Informasi Pribadi' : '1. Personal Information'}</h2>
          <p class="asha-subtitle text-muted">${
            isId
              ? 'Mulai dengan informasi dasar Anda. Data hanya disimpan di memori sesi ini.'
              : 'Start with your core personal context. Data stays strictly in runtime memory.'
          }</p>
          <div class="asha-grid">
            <label class="form-label">
              <span>${isId ? 'What should I call you? (Nama Panggilan)' : 'What should I call you?'}</span>
              <input type="text" class="form-control" data-field="nickname" value="${escapeAttr(
                state.personal.nickname
              )}" placeholder="${isId ? 'Contoh: Budi / Sari' : 'e.g., Alex'}" />
            </label>
            <label class="form-label">
              <span>${isId ? 'Usia (tahun)' : 'Age (years)'}</span>
              <input type="number" class="form-control" data-field="age" value="${state.personal.age ?? ''}" placeholder="35" />
            </label>
            <label class="form-label">
              <span>${isId ? 'Jenis Kelamin' : 'Sex'}</span>
              <select class="form-select" data-field="sex">
                <option value="" ${state.personal.sex === null ? 'selected' : ''}>${
                  isId ? '-- Pilih --' : '-- Select --'
                }</option>
                <option value="male" ${state.personal.sex === 'male' ? 'selected' : ''}>${
                  isId ? 'Laki-laki' : 'Male'
                }</option>
                <option value="female" ${state.personal.sex === 'female' ? 'selected' : ''}>${
                  isId ? 'Perempuan' : 'Female'
                }</option>
                <option value="unspecified" ${
                  state.personal.sex === 'unspecified' ? 'selected' : ''
                }>${isId ? 'Prefer tidak menyebutkan' : 'Prefer not to say'}</option>
              </select>
            </label>
            <label class="form-label">
              <span>${isId ? 'Tinggi Badan (cm)' : 'Height (cm)'}</span>
              <input type="number" class="form-control" data-field="height" value="${state.personal.height ?? ''}" placeholder="168" />
            </label>
            <label class="form-label">
              <span>${isId ? 'Berat Badan (kg)' : 'Weight (kg)'}</span>
              <input type="number" class="form-control" data-field="weight" value="${state.personal.weight ?? ''}" placeholder="65" />
            </label>
            <label class="form-label">
              <span>${isId ? 'Suku / Etnis (Opsional)' : 'Ethnic Group (Optional)'}</span>
              <select class="form-select" data-field="ethnicity">
                <option value="" ${!state.personal.ethnicity ? 'selected' : ''}>${
                  isId ? '-- Pilih Etnis (Opsional) --' : '-- Select Ethnic Group (Optional) --'
                }</option>
                ${ethnicityOptionsHtml}
              </select>
            </label>
          </div>
        </section>
      `;
    }

    // Step 2 (index 1): Upload Hasil Tes Kesehatan (OCR) ditampilkan sebelum Langkah Ringkasan Kesehatan
    if (step === 1) {
      const extractedRows = BIOMARKER_KEYS.map((key) => {
        const item = state.healthReport.extracted[key];
        if (!item) return '';
        return `
          <div class="asha-ocr-row d-flex align-items-center gap-2 mb-2">
            <strong>${BIOMARKER_LABELS[key]}</strong>
            <input type="text" class="form-control" data-edit-ocr="${key}" value="${escapeAttr(item.normalizedValue)}" placeholder="Unable to determine" />
            <span class="asha-badge badge bg-warning text-dark">${item.confidence}</span>
          </div>
        `;
      }).join('');

      return `
        <section class="asha-card card shadow-sm">
          <h2>${
            isId
              ? '2. Upload Hasil Tes Kesehatan (OCR)'
              : '2. Upload Health Test Results (Client-Side OCR)'
          }</h2>
          <p class="asha-subtitle text-muted">${
            isId
              ? 'Ekstraksi dilakukan 100% di browser menggunakan Tesseract.js. Verifikasi sebelum dilanjutkan ke Ringkasan Kesehatan.'
              : 'Extracted 100% in-browser via Tesseract.js. Verify and confirm before proceeding to Health Snapshot.'
          }</p>
          <input type="file" class="form-control mb-3" data-action="ocr-file" accept=".jpg,.jpeg,.png,.webp" />
          <div class="asha-ocr-results mb-3">${extractedRows}</div>
          <button type="button" class="btn btn-primary asha-primary-btn" data-action="confirm-ocr">${
            isId ? 'Konfirmasi Hasil Ekstraksi' : 'Confirm Extracted Values'
          }</button>
        </section>
      `;
    }

    // Step 3 (index 2): Ringkasan Kesehatan (Health Snapshot)
    if (step === 2) {
      const inputs = BIOMARKER_KEYS.map(
        (key) => `
          <label class="form-label">
            <span>${BIOMARKER_LABELS[key]}</span>
            <input type="text" class="form-control" data-biomarker="${key}" value="${escapeAttr(
              state.health[key].value
            )}" placeholder="${isId ? 'Belum diisi' : 'Not provided'}" />
          </label>
        `
      ).join('');

      return `
        <section class="asha-card card shadow-sm">
          <h2>${isId ? '3. Ringkasan Kesehatan (Health Snapshot)' : '3. Health Snapshot'}</h2>
          <p class="asha-subtitle text-muted">${
            isId
              ? 'Nilai yang dikosongkan akan ditandai "Not provided" dan tidak pernah dikarang.'
              : 'Omitted values are marked "Not provided" and never fabricated.'
          }</p>
          <div class="asha-grid">
            ${inputs}
            <label class="form-label">
              <span>${isId ? 'Indikator Lainnya (Opsional)' : 'Other Indicators (Optional)'}</span>
              <input type="text" class="form-control" data-field="health-other" value="${escapeAttr(state.health.other)}" />
            </label>
          </div>
        </section>
      `;
    }

    if (step === 3) {
      return renderStep4GoalSection(isId);
    }

    if (step === 4) {
      const allTrainingDaysSelected = DAYS_OF_WEEK.every((d) =>
        state.schedule.trainingDays.includes(d)
      );

      const trainingDayCheckboxes = DAYS_OF_WEEK.map(
        (day) => `
          <label class="asha-inline-check form-check-label">
            <input type="checkbox" class="form-check-input" data-training-day="${day}" ${
              state.schedule.trainingDays.includes(day) ? 'checked' : ''
            } />
            <span>${isId ? DAY_LABELS_ID[day] : day}</span>
          </label>
        `
      ).join('');

      const restDayCheckboxes = DAYS_OF_WEEK.map(
        (day) => `
          <label class="asha-inline-check form-check-label ${allTrainingDaysSelected ? 'asha-disabled-check' : ''}">
            <input type="checkbox" class="form-check-input" data-rest-day="${day}" ${
              allTrainingDaysSelected
                ? 'disabled'
                : state.schedule.restDays.includes(day)
                ? 'checked'
                : ''
            } />
            <span>${isId ? DAY_LABELS_ID[day] : day}</span>
          </label>
        `
      ).join('');

      const trainingTypeLabels: Record<TrainingType, string> = {
        cardio: 'Cardio',
        strength: 'Strength',
        mobility_flexibility: 'Mobility & Flexibility'
      };
      const trainingTypeItems: TrainingType[] = ['cardio', 'strength', 'mobility_flexibility'];
      const selectedTrainingTypes = state.schedule.trainingTypes ?? [];
      const trainingTypeCheckboxes = trainingTypeItems
        .map(
          (item) => `
            <label class="asha-inline-check form-check-label">
              <input type="checkbox" class="form-check-input" data-training-type="${item}" ${
                selectedTrainingTypes.includes(item) ? 'checked' : ''
              } />
              <span>${trainingTypeLabels[item]}</span>
            </label>
          `
        )
        .join('');

      const equipLabels: Record<EquipmentItem, string> = {
        bodyweight: isId ? 'Tidak Ada (Gunakan Bodyweight)' : 'None (Use Bodyweight)',
        dumbbells: 'Dumbbells',
        barbell: 'Barbell',
        fitness_ball: 'Fitness Ball',
        treadmill_walking_pad: 'Treadmil / Walking Pad'
      };
      const equipItems: EquipmentItem[] = [
        'bodyweight',
        'dumbbells',
        'barbell',
        'fitness_ball',
        'treadmill_walking_pad'
      ];
      const equipCheckboxes = equipItems
        .map(
          (item) => `
            <label class="asha-inline-check form-check-label">
              <input type="checkbox" class="form-check-input" data-equipment="${item}" ${
                state.equipment.selected.includes(item) ? 'checked' : ''
              } />
              <span>${equipLabels[item]}</span>
            </label>
          `
        )
        .join('');

      const ifConditionalFields =
        state.nutrition.diet === 'intermittent_fasting'
          ? `
            <label class="form-label">
              <span>${isId ? 'Protokol IF' : 'IF Protocol'}</span>
              <select class="form-select" data-field="fastingProtocol">
                <option value="">--</option>
                <option value="12:12" ${state.nutrition.fastingProtocol === '12:12' ? 'selected' : ''}>12:12</option>
                <option value="14:10" ${state.nutrition.fastingProtocol === '14:10' ? 'selected' : ''}>14:10</option>
                <option value="16:8" ${state.nutrition.fastingProtocol === '16:8' ? 'selected' : ''}>16:8</option>
                <option value="18:6" ${state.nutrition.fastingProtocol === '18:6' ? 'selected' : ''}>18:6</option>
                <option value="custom" ${state.nutrition.fastingProtocol === 'custom' ? 'selected' : ''}>Custom</option>
              </select>
            </label>
            <label class="form-label">
              <span>${isId ? 'Jendela Makan' : 'Eating Window'}</span>
              <input type="text" class="form-control" data-field="eatingWindow" value="${escapeAttr(
                state.nutrition.eatingWindow
              )}" placeholder="12:00 - 20:00" />
            </label>
          `
          : '';

      return `
        <section class="asha-card card shadow-sm">
          <h2>${isId ? '5. Jadwal, Peralatan & Diet' : '5. Schedule, Equipment & Diet'}</h2>

          <div class="asha-session-block">
            <fieldset class="asha-checkbox-group">
              <legend>${isId ? 'Pilihan Hari Latihan' : 'Training Days'}</legend>
              <div class="asha-select-all-row">
                <label class="asha-inline-check asha-select-all-check form-check-label">
                  <input type="checkbox" class="form-check-input" data-action="select-all-training-days" ${
                    allTrainingDaysSelected ? 'checked' : ''
                  } />
                  <span>${isId ? 'Pilih Semua (Select All)' : 'Select All'}</span>
                </label>
              </div>
              <div class="asha-checkbox-grid">${trainingDayCheckboxes}</div>
            </fieldset>

            <fieldset class="asha-checkbox-group asha-rest-days-group ${
              allTrainingDaysSelected ? 'asha-disabled-group' : ''
            }" ${allTrainingDaysSelected ? 'disabled' : ''}>
              <legend>${isId ? 'Pilihan Hari Istirahat' : 'Rest Days'}</legend>
              <div class="asha-checkbox-grid">${restDayCheckboxes}</div>
            </fieldset>

            <fieldset class="asha-checkbox-group asha-training-types-group">
              <legend>${isId ? 'Jenis Latihan' : 'Training Types'}</legend>
              <div class="asha-checkbox-grid">${trainingTypeCheckboxes}</div>
            </fieldset>

            <fieldset class="asha-checkbox-group asha-equipment-group">
              <legend>${isId ? 'Peralatan yang Tersedia' : 'Available Equipment'}</legend>
              <div class="asha-checkbox-grid">${equipCheckboxes}</div>
            </fieldset>
          </div>

          <hr class="asha-session-divider" />

          <div class="asha-session-block">
            <h3>${isId ? 'Waktu Latihan & Durasi' : 'Training Time & Duration'}</h3>
            <div class="asha-grid">
              <label class="form-label">
                <span>${isId ? 'Waktu Pilihan Latihan' : 'Preferred Training Time'}</span>
                <input type="time" class="form-control" data-field="preferredTime" value="${escapeAttr(
                  state.schedule.preferredTime
                )}" />
              </label>
              <label class="form-label">
                <span>${isId ? 'Durasi Sesi (menit)' : 'Session Duration (minutes)'}</span>
                <input type="number" class="form-control" data-field="sessionDurationMinutes" value="${
                  state.schedule.sessionDurationMinutes ?? ''
                }" placeholder="45" />
              </label>
            </div>
          </div>

          <hr class="asha-session-divider" />

          <div class="asha-session-block">
            <h3>${isId ? 'Pola Diet' : 'Diet Preference'}</h3>
            <div class="asha-grid">
              <label class="form-label">
                <span>${isId ? 'Pola Diet' : 'Diet Preference'}</span>
                <select class="form-select" data-field="diet">
                  <option value="">${isId ? 'Tidak ditentukan' : 'Not specified'}</option>
                  <option value="no_specific_diet" ${
                    state.nutrition.diet === 'no_specific_diet' ? 'selected' : ''
                  }>No specific diet</option>
                  <option value="vegan" ${state.nutrition.diet === 'vegan' ? 'selected' : ''}>Vegan</option>
                  <option value="vegetarian" ${
                    state.nutrition.diet === 'vegetarian' ? 'selected' : ''
                  }>Vegetarian</option>
                  <option value="carnivore" ${
                    state.nutrition.diet === 'carnivore' ? 'selected' : ''
                  }>Carnivore</option>
                  <option value="keto" ${state.nutrition.diet === 'keto' ? 'selected' : ''}>Keto</option>
                  <option value="intermittent_fasting" ${
                    state.nutrition.diet === 'intermittent_fasting' ? 'selected' : ''
                  }>Intermittent Fasting</option>
                </select>
              </label>
              ${ifConditionalFields}
            </div>
          </div>
        </section>
      `;
    }

    if (step === 5) {
      applyAssumptionsAndPersonalization(state);
      const conditionalHtml =
        state.personalization.conditionalQuestions.length > 0
          ? state.personalization.conditionalQuestions
              .map(
                (q) => `
                  <label class="asha-conditional-q form-label">
                    <span>${isId ? q.questionId : q.questionEn}</span>
                    <input type="text" class="form-control" data-conditional="${q.id}" value="${escapeAttr(q.answer)}" />
                  </label>
                `
              )
              .join('')
          : `<p class="text-muted mb-0">${
              isId
                ? 'Tidak ada pertanyaan fisiologis tambahan yang diperlukan.'
                : 'No additional conditional physiological questions required.'
            }</p>`;

      return `
        <section class="asha-card card shadow-sm">
          <h2>${
            isId
              ? '6. Tipe Rencana, Kalender, Referensi Visual & Konteks Fisiologis'
              : '6. Plan Type, Calendar, Visual Preferences & Conditional Context'
          }</h2>
          <div class="asha-grid">
            <label class="form-label">
              <span>${isId ? 'Tipe Rencana' : 'Plan Type'}</span>
              <select class="form-select" data-field="planType">
                <option value="training_and_meal" ${
                  state.planning.planType === 'training_and_meal' ? 'selected' : ''
                }>Training + Meal Plan</option>
                <option value="training_only" ${
                  state.planning.planType === 'training_only' ? 'selected' : ''
                }>Training Plan Only</option>
                <option value="meal_only" ${
                  state.planning.planType === 'meal_only' ? 'selected' : ''
                }>Meal Plan Only</option>
              </select>
            </label>
            <label class="form-label">
              <span>${isId ? 'Mode Integrasi' : 'Integration Mode'}</span>
              <select class="form-select" data-field="integrationMode">
                <option value="optimize_together" ${
                  state.planning.integrationMode === 'optimize_together' ? 'selected' : ''
                }>Optimize Together</option>
                <option value="independent" ${
                  state.planning.integrationMode === 'independent' ? 'selected' : ''
                }>Independent</option>
              </select>
            </label>
            <label class="form-label">
              <span>${isId ? 'Tanggal Dimulainya Plan' : 'Plan Start Date'}</span>
              <input type="date" class="form-control" data-field="startDate" value="${escapeAttr(state.planning.startDate)}" />
            </label>
            <label class="form-label">
              <span>${isId ? 'Pilihan Kalender' : 'Calendar Platform'}</span>
              <select class="form-select" data-field="calendarProvider">
                <option value="google" ${
                  (state.planning.calendarProvider ?? 'google') === 'google' ? 'selected' : ''
                }>Google</option>
                <option value="outlook" ${
                  state.planning.calendarProvider === 'outlook' ? 'selected' : ''
                }>Outlook</option>
                <option value="apple" ${
                  state.planning.calendarProvider === 'apple' ? 'selected' : ''
                }>Apple</option>
              </select>
            </label>
            <label class="form-label">
              <span>${isId ? 'Mode Referensi Visual Latihan' : 'Exercise Visual Mode'}</span>
              <select class="form-select" data-field="exerciseVisualMode">
                <option value="external_reference" ${
                  state.planning.exerciseVisualMode === 'external_reference' ? 'selected' : ''
                }>External Reference (DAREBEE link)</option>
                <option value="ai_illustration" ${
                  state.planning.exerciseVisualMode === 'ai_illustration' ? 'selected' : ''
                }>AI-Generated Illustration</option>
                <option value="video_reference" ${
                  state.planning.exerciseVisualMode === 'video_reference' ? 'selected' : ''
                }>Video Reference</option>
                <option value="text_only" ${
                  state.planning.exerciseVisualMode === 'text_only' ? 'selected' : ''
                }>Text-Only Fallback</option>
              </select>
            </label>
            <label class="form-label">
              <span>${isId ? 'Pengingat Kalender (menit sebelum)' : 'Calendar Reminder (minutes before)'}</span>
              <input type="number" class="form-control" data-field="reminderMinutesBefore" value="${state.planning.reminderMinutesBefore}" />
            </label>
          </div>
          <div class="asha-conditionals mt-4">
            <h3>${isId ? 'Konteks Fisiologis (Opsional)' : 'Conditional Physiological Context (Optional)'}</h3>
            ${conditionalHtml}
          </div>
        </section>
      `;
    }

    // Step 7 (index 6): Review & Confirmation Screen with Pre-Filled Form Style
    applyAssumptionsAndPersonalization(state);

    const notProvidedText = isId ? 'Belum diisi (Not provided)' : 'Not provided';
    const biomarkerFormFields = BIOMARKER_KEYS.map(
      (k) => `
        <div class="col-md-4 col-sm-6">
          <label class="form-label">
            <span>${BIOMARKER_LABELS[k]}</span>
            <input
              type="text"
              class="form-control asha-prefilled-input"
              readonly
              data-review-field="health-${k}"
              value="${escapeAttr(state.health[k].value ?? notProvidedText)}"
            />
          </label>
        </div>
      `
    ).join('');

    const displayName =
      state.personal.nickname && state.personal.nickname.trim().length > 0
        ? state.personal.nickname.trim()
        : isId
        ? 'Sahabat ASHA'
        : 'Friend';
    const quoteText = state.ui.motivationalQuote ?? pickRandomMotivationalQuote();

    const dietValueDisplay =
      state.nutrition.diet === 'intermittent_fasting'
        ? `Intermittent Fasting (${state.nutrition.fastingProtocol ?? '16:8'}, Window: ${
            state.nutrition.eatingWindow ?? '-'
          })`
        : state.nutrition.diet ?? notProvidedText;

    const promptReadySection = state.confirmation.confirmed
      ? `
          <div class="asha-floating-popup-overlay" data-role="floating-popup-overlay">
            <div class="asha-prompt-ready-popup asha-floating-popup" data-role="prompt-ready-popup" role="dialog" aria-modal="true" aria-live="polite">
              <button
                type="button"
                class="btn-close asha-popup-close-btn"
                aria-label="Close"
                data-action="close-popup"
                title="${isId ? 'Tutup Pop-up' : 'Close Pop-up'}"
              ></button>
              <div class="d-flex align-items-center justify-content-center text-center gap-3">
                <div class="asha-popup-badge">✓</div>
                <div class="asha-popup-body">
                  <strong class="asha-popup-greeting">Selamat ${displayName}, prompt kamu sudah siap!</strong>
                  <p class="asha-popup-instruction mb-0">Silakan klik AI Chat Interface favoritmu untuk membuat plan.</p>
                </div>
              </div>

              <div class="asha-ai-providers-section text-center">
                <h3 class="asha-ai-providers-title text-center">${
                  isId
                    ? 'Buka Chat Interface Pilihan Anda:'
                    : 'Open Your Preferred AI Chat Interface:'
                }</h3>
                <div class="asha-ai-providers-grid justify-content-center">
                  <a
                    href="https://chatgpt.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="asha-ai-logo-btn btn"
                    data-ai-provider="chatgpt"
                    title="ChatGPT"
                  >
                    <span class="asha-ai-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 4.98 4.18a5.98 5.98 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.51 2.9A5.98 5.98 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.21 5.99 5.99 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07zM13.26 22.43a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.8.8 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.49 4.5zm-9.66-4.13a4.47 4.47 0 0 1-.54-3.01l.14.09 4.78 2.76a.77.77 0 0 0 .78 0l5.84-3.37v2.33a.08.08 0 0 1-.03.06L9.74 19.95a4.5 4.5 0 0 1-6.14-1.65zM2.34 7.9a4.49 4.49 0 0 1 2.37-1.97V11.6a.77.77 0 0 0 .39.68l5.81 3.35-2.02 1.17a.08.08 0 0 1-.07 0l-4.83-2.79A4.5 4.5 0 0 1 2.34 7.9zm16.6 3.86-5.84-3.38 2.02-1.16a.08.08 0 0 1 .07 0l4.83 2.79a4.49 4.49 0 0 1-.68 8.1v-5.67a.79.79 0 0 0-.4-.68zm2.01-3.02-.14-.09-4.77-2.78a.78.78 0 0 0-.79 0L9.41 9.23V6.9a.07.07 0 0 1 .03-.06l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66zM8.31 12.86l-2.02-1.16a.08.08 0 0 1-.04-.06V6.07a4.5 4.5 0 0 1 7.38-3.45l-.14.08-4.78 2.76a.8.8 0 0 0-.39.68zm1.1-2.37 2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5z"/>
                      </svg>
                    </span>
                    <span>ChatGPT</span>
                  </a>

                  <a
                    href="https://gemini.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="asha-ai-logo-btn btn"
                    data-ai-provider="gemini"
                    title="Google Gemini"
                  >
                    <span class="asha-ai-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M12 2C12 7.52 16.48 12 22 12C16.48 12 12 16.48 12 22C12 16.48 7.52 12 2 12C7.52 12 12 7.52 12 2Z"/>
                      </svg>
                    </span>
                    <span>Gemini</span>
                  </a>

                  <a
                    href="https://claude.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="asha-ai-logo-btn btn"
                    data-ai-provider="claude"
                    title="Anthropic Claude"
                  >
                    <span class="asha-ai-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M12 2L14.4 9.2L21.5 6.8L16.3 12.4L22 17.2L14.6 16.1L15.2 23.5L11.2 17.2L5.8 22.4L8.5 15.4L1.5 14.5L7.9 10.8L4.2 4.2L10.6 8.2L12 2Z"/>
                      </svg>
                    </span>
                    <span>Claude</span>
                  </a>

                  <a
                    href="https://grok.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="asha-ai-logo-btn btn"
                    data-ai-provider="grok"
                    title="xAI Grok"
                  >
                    <span class="asha-ai-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M3 21L21 3M8 3H21V16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                      </svg>
                    </span>
                    <span>Grok</span>
                  </a>

                  <a
                    href="https://copilot.microsoft.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="asha-ai-logo-btn btn"
                    data-ai-provider="copilot"
                    title="Microsoft Copilot"
                  >
                    <span class="asha-ai-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M7.5 4C5.01 4 3 6.01 3 8.5v2.25C3 12.55 4.45 14 6.25 14h2.5c1.24 0 2.25-1.01 2.25-2.25V8.5C11 6.01 8.99 4 6.5 4h1zm9 0c2.49 0 4.5 2.01 4.5 4.5v2.25c0 1.8-1.45 3.25-3.25 3.25h-2.5C14.01 14 13 12.99 13 11.75V8.5C13 6.01 15.01 4 17.5 4h-1zM6.5 15.5C4.57 15.5 3 17.07 3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2 0-1.93-1.57-3.5-3.5-3.5h-11z"/>
                      </svg>
                    </span>
                    <span>Copilot</span>
                  </a>
                </div>

                <div class="asha-new-plan-btn-wrapper mt-3 text-center">
                  <button
                    type="button"
                    class="btn btn-primary asha-primary-btn rounded-pill px-4"
                    data-action="start-over"
                    data-role="popup-new-plan-btn"
                  >
                    ${isId ? 'Susun Rencana Baru' : 'Susun Rencana Baru'}
                  </button>
                </div>
              </div>

              <blockquote class="asha-popup-quote text-center" data-role="motivational-quote">
                “${quoteText}”
              </blockquote>
            </div>
          </div>
        `
      : '';

    return `
      <section class="asha-card asha-review-card card shadow-sm">
        <h2>${isId ? '7. Tinjauan & Konfirmasi (Mandatory Review)' : '7. Mandatory Review & Confirmation'}</h2>
        <p class="asha-subtitle text-muted">${
          isId
            ? 'Periksa kembali seluruh informasi yang telah Anda isikan dalam tampilan form di bawah ini sebelum membuat prompt.'
            : 'Review all your pre-filled form details below before confirming.'
        }</p>

        <form class="asha-review-summary asha-review-prefilled-form" data-role="review-prefilled-form" onsubmit="return false;">
          <div class="asha-review-form-section">
            <h3>${isId ? '1. Informasi Pribadi' : '1. Personal Information'}</h3>
            <div class="row g-3">
              <div class="col-md-4 col-sm-6">
                <label class="form-label">
                  <span>${isId ? 'Nama Panggilan' : 'Nickname'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="nickname" value="${escapeAttr(
                    state.personal.nickname ?? notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-4 col-sm-6">
                <label class="form-label">
                  <span>${isId ? 'Usia (tahun)' : 'Age (years)'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="age" value="${escapeAttr(
                    state.personal.age !== null ? `${state.personal.age}` : notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-4 col-sm-6">
                <label class="form-label">
                  <span>${isId ? 'Jenis Kelamin' : 'Sex'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="sex" value="${escapeAttr(
                    state.personal.sex ?? notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-4 col-sm-6">
                <label class="form-label">
                  <span>${isId ? 'Tinggi Badan (cm)' : 'Height (cm)'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="height" value="${escapeAttr(
                    state.personal.height !== null ? `${state.personal.height} cm` : notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-4 col-sm-6">
                <label class="form-label">
                  <span>${isId ? 'Berat Badan (kg)' : 'Weight (kg)'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="weight" value="${escapeAttr(
                    state.personal.weight !== null ? `${state.personal.weight} kg` : notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-4 col-sm-6">
                <label class="form-label">
                  <span>${isId ? 'Suku / Etnis' : 'Ethnicity'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="ethnicity" value="${escapeAttr(
                    state.personal.ethnicity ?? notProvidedText
                  )}" />
                </label>
              </div>
            </div>
          </div>

          <div class="asha-review-form-section">
            <h3>${isId ? '2 & 3. Ringkasan Kesehatan & Biomarker' : '2 & 3. Health Snapshot & Biomarkers'}</h3>
            <div class="row g-3">
              ${biomarkerFormFields}
              <div class="col-md-4 col-sm-6">
                <label class="form-label">
                  <span>${isId ? 'Indikator Lainnya' : 'Other Indicators'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="health-other" value="${escapeAttr(
                    state.health.other ?? notProvidedText
                  )}" />
                </label>
              </div>
            </div>
          </div>

          <div class="asha-review-form-section">
            <h3>${isId ? '4. Aspirasi, Target & Jangka Waktu' : '4. Aspiration, Target & Timeframe'}</h3>
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label">
                  <span>${isId ? 'Aspirasi Utama' : 'Primary Aspiration'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="aspiration" value="${escapeAttr(
                    state.goal.aspiration ?? notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-5">
                <label class="form-label">
                  <span>${isId ? 'Target Spesifik' : 'Specific Target'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="target" value="${escapeAttr(
                    state.goal.target ?? notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-3">
                <label class="form-label">
                  <span>${isId ? 'Jangka Waktu (Minggu)' : 'Timeframe (Weeks)'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="durationWeeks" value="${escapeAttr(
                    `${state.timeframe.durationWeeks ?? 8} minggu`
                  )}" />
                </label>
              </div>
            </div>
          </div>

          <div class="asha-review-form-section">
            <h3>${isId ? '5. Jadwal, Jenis Latihan, Peralatan & Pola Diet' : '5. Schedule, Training Types, Equipment & Diet'}</h3>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">
                  <span>${isId ? 'Hari Latihan' : 'Training Days'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="trainingDays" value="${escapeAttr(
                    state.schedule.trainingDays.length > 0
                      ? state.schedule.trainingDays.join(', ')
                      : notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-6">
                <label class="form-label">
                  <span>${isId ? 'Hari Istirahat' : 'Rest Days'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="restDays" value="${escapeAttr(
                    state.schedule.restDays.length > 0
                      ? state.schedule.restDays.join(', ')
                      : notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-6">
                <label class="form-label">
                  <span>${isId ? 'Jenis Latihan' : 'Training Types'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="trainingTypes" value="${escapeAttr(
                    (state.schedule.trainingTypes ?? []).length > 0
                      ? (state.schedule.trainingTypes ?? []).join(', ')
                      : notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-6">
                <label class="form-label">
                  <span>${isId ? 'Peralatan yang Tersedia' : 'Available Equipment'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="equipment" value="${escapeAttr(
                    state.equipment.selected.length > 0
                      ? `${state.equipment.selected.join(', ')} (${state.equipment.fieldState})`
                      : notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-4">
                <label class="form-label">
                  <span>${isId ? 'Waktu Pilihan Latihan' : 'Preferred Training Time'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="preferredTime" value="${escapeAttr(
                    state.schedule.preferredTime ?? '07:00'
                  )}" />
                </label>
              </div>
              <div class="col-md-4">
                <label class="form-label">
                  <span>${isId ? 'Durasi Sesi (menit)' : 'Session Duration (minutes)'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="sessionDurationMinutes" value="${escapeAttr(
                    `${state.schedule.sessionDurationMinutes ?? 45} menit`
                  )}" />
                </label>
              </div>
              <div class="col-md-4">
                <label class="form-label">
                  <span>${isId ? 'Pola Diet' : 'Diet Preference'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="diet" value="${escapeAttr(
                    dietValueDisplay
                  )}" />
                </label>
              </div>
            </div>
          </div>

          <div class="asha-review-form-section">
            <h3>${isId ? '6. Tipe Rencana, Tanggal Mulai & Kalender' : '6. Plan Type, Start Date & Calendar'}</h3>
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label">
                  <span>${isId ? 'Tipe Rencana & Integrasi' : 'Plan Type & Integration'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="planType" value="${escapeAttr(
                    `${state.planning.planType ?? 'training_and_meal'} (${
                      state.planning.integrationMode ?? 'optimize_together'
                    })`
                  )}" />
                </label>
              </div>
              <div class="col-md-4">
                <label class="form-label">
                  <span>${isId ? 'Tanggal Dimulainya Plan' : 'Plan Start Date'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="startDate" value="${escapeAttr(
                    state.planning.startDate ?? notProvidedText
                  )}" />
                </label>
              </div>
              <div class="col-md-4">
                <label class="form-label">
                  <span>${isId ? 'Pilihan Kalender' : 'Calendar Platform'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="calendarProvider" value="${escapeAttr(
                    (state.planning.calendarProvider ?? 'google').toUpperCase()
                  )}" />
                </label>
              </div>
            </div>
          </div>

          <div class="asha-review-form-section">
            <h3>${isId ? 'Konteks Personalisasi, Asumsi Sistem & Keamanan' : 'Personalization Context, AI Assumptions & Safety'}</h3>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label">
                  <span>${isId ? 'Konteks Perencanaan' : 'Planning Context'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="planningContext" value="${escapeAttr(
                    isId
                      ? 'Jenis kelamin digunakan sebagai variabel kontekstual. Tidak ada stereotip latihan berbasis jenis kelamin.'
                      : 'Sex will be used as contextual information. No sex-based training stereotype will be applied.'
                  )}" />
                </label>
              </div>
              <div class="col-12">
                <label class="form-label">
                  <span>AI Assumptions</span>
                  <textarea class="form-control asha-prefilled-input" rows="2" readonly data-review-field="assumptions">${
                    state.assumptions.length > 0 ? state.assumptions.join(' | ') : 'None'
                  }</textarea>
                </label>
              </div>
              <div class="col-12">
                <label class="form-label">
                  <span>${isId ? 'Pertimbangan Keamanan' : 'Safety Considerations'}</span>
                  <input type="text" class="form-control asha-prefilled-input" readonly data-review-field="safety" value="${escapeAttr(
                    isId
                      ? 'ASHA bersifat edukatif dan bukan diagnosis atau resep medis.'
                      : 'ASHA provides educational health planning and is not a medical diagnosis or prescription.'
                  )}" />
                </label>
              </div>
            </div>
          </div>
        </form>

        <label class="asha-confirm-checkbox form-check-label">
          <input type="checkbox" class="form-check-input" data-action="toggle-confirm" ${
            state.confirmation.confirmed ? 'checked' : ''
          } />
          <span>${
            isId
              ? 'Saya telah memeriksa informasi dan asumsi yang akan digunakan untuk membuat prompt.'
              : 'I have reviewed the information and assumptions (Saya telah memeriksa informasi dan asumsi yang akan digunakan untuk membuat prompt).'
          }</span>
        </label>

        ${promptReadySection}
      </section>
    `;
  }

  function renderChatPanel(isId: boolean): string {
    if (!state.chat.active) return '';

    const turnsHtml = state.chat.turns
      .map(
        (t) => `
          <div class="asha-chat-turn asha-chat-${t.role}">
            <strong>${
              t.role === 'assistant'
                ? `ASHA (${t.planVersion ?? state.chat.currentVersion})`
                : isId
                ? 'Anda'
                : 'You'
            }:</strong>
            <div>${t.content}</div>
          </div>
        `
      )
      .join('');

    const replacementGateHtml = state.chat.pendingReplacementContent
      ? `
        <div class="asha-replacement-banner alert alert-warning">
          <p>${
            isId
              ? 'Perubahan signifikan terdeteksi. Konfirmasi sebelum mengganti seluruh rencana?'
              : 'Significant plan change detected. Confirm before replacing the whole plan?'
          }</p>
          <button type="button" class="btn btn-primary asha-primary-btn" data-action="confirm-replacement">${
            isId ? 'Konfirmasi Rencana Baru' : 'Confirm Plan Replacement'
          }</button>
        </div>
      `
      : '';

    return `
      <section class="asha-card asha-chat-panel card shadow-sm">
        <div class="asha-chat-header">
          <h2>Personal Trainer Chat — Plan ${state.chat.currentVersion}</h2>
          <span class="asha-ephemeral-note">${
            isId
              ? 'Sesi ini hanya di memori. Jangan lupa unduh Context Snapshot (.md) dan kalender (.ics) sebelum menutup tab.'
              : 'In-memory session only. Download your Context Snapshot (.md) and (.ics) calendars before closing this tab.'
          }</span>
        </div>
        ${
          state.chat.loading
            ? `<div class="asha-loading alert alert-info" role="status">${state.chat.loadingMessage}</div>`
            : ''
        }
        ${state.chat.error ? `<div class="asha-error alert alert-danger">${state.chat.error}</div>` : ''}
        <div class="asha-chat-history">${turnsHtml}</div>
        ${replacementGateHtml}
        <div class="asha-chat-composer d-flex gap-2 mt-3">
          <input type="text" class="form-control" data-field="chat-input" placeholder="${
            isId
              ? 'Tanyakan atau sesuaikan rencana Anda dalam Bahasa Indonesia...'
              : 'Ask or adapt your plan (Gemini responds in Bahasa Indonesia)...'
          }" />
          <button type="button" class="btn btn-primary asha-primary-btn" data-action="send-chat">${isId ? 'Kirim' : 'Send'}</button>
        </div>
      </section>
    `;
  }

  function renderWizardNav(isId: boolean, position: 'top' | 'bottom'): string {
    const isFinalStep = state.ui.currentStep === TOTAL_WIZARD_STEPS - 1;
    const buttonsHtml = isFinalStep
      ? `
          <button type="button" class="btn btn-outline-primary rounded-pill px-3" data-action="prev-step">${isId ? 'Sebelumnya' : 'Back'}</button>
          <button type="button" class="btn btn-primary asha-primary-btn rounded-pill px-3" data-action="start-over">${
            isId ? 'Mulai Lagi' : 'Start Over'
          }</button>
        `
      : `
          <button type="button" class="btn btn-outline-primary rounded-pill px-3" data-action="prev-step" ${
            state.ui.currentStep === 0 ? 'disabled' : ''
          }>${isId ? 'Sebelumnya' : 'Back'}</button>
          <button type="button" class="btn btn-primary asha-primary-btn rounded-pill px-3" data-action="next-step">${
            isId ? 'Selanjutnya' : 'Next'
          }</button>
        `;

    return `
      <nav class="asha-wizard-nav asha-wizard-nav-${position} asha-floating-nav asha-floating-nav-${position}" data-role="floating-nav" aria-label="Wizard Progress ${position}">
        <span class="badge bg-warning text-dark fs-6 rounded-pill px-3">${isId ? 'Langkah' : 'Step'} ${state.ui.currentStep + 1} / ${TOTAL_WIZARD_STEPS}</span>
        <div class="asha-step-buttons">
          ${buttonsHtml}
        </div>
      </nav>
    `;
  }

  function renderTimelineDotStepTabs(isId: boolean): string {
    const stepDescriptors = isId
      ? [
          { title: 'Langkah 1', subtitle: 'Profil Diri' },
          { title: 'Langkah 2', subtitle: 'Upload OCR' },
          { title: 'Langkah 3', subtitle: 'Kesehatan' },
          { title: 'Langkah 4', subtitle: 'Target & Waktu' },
          { title: 'Langkah 5', subtitle: 'Jadwal & Diet' },
          { title: 'Langkah 6', subtitle: 'Kalender & Plan' },
          { title: 'Langkah 7', subtitle: 'Konfirmasi' }
        ]
      : [
          { title: 'Step 1', subtitle: 'Personal Info' },
          { title: 'Step 2', subtitle: 'OCR Upload' },
          { title: 'Step 3', subtitle: 'Health Snapshot' },
          { title: 'Step 4', subtitle: 'Goal & Time' },
          { title: 'Step 5', subtitle: 'Schedule & Diet' },
          { title: 'Step 6', subtitle: 'Calendar & Plan' },
          { title: 'Step 7', subtitle: 'Review & Confirm' }
        ];

    const itemsHtml = stepDescriptors
      .map((item, idx) => {
        const stateClass =
          idx === state.ui.currentStep
            ? 'active'
            : idx < state.ui.currentStep
            ? 'done'
            : '';
        return `
          <li class="nav-item asha-timeline-step ${stateClass}">
            <a href="#step-${idx + 1}" class="nav-link asha-timeline-link" data-step-tab="${idx}">
              <span class="asha-timeline-dot" data-role="timeline-dot" aria-hidden="true"></span>
              <span class="asha-timeline-label">
                <span class="asha-timeline-title">${item.title}</span>
                <small class="asha-timeline-subtitle">${item.subtitle}</small>
              </span>
            </a>
          </li>
        `;
      })
      .join('');

    return `
      <ul class="nav nav-tabs step-anchor asha-timeline-steps" data-role="wizard-timeline-tabs">
        ${itemsHtml}
      </ul>
    `;
  }

  function render() {
    if (!root) return;
    const isId = state.ui.language === 'id';
    root.innerHTML = `
      <div class="asha-shell container py-4" data-persona="${state.personalization.visualPersona}">
        <header class="asha-header shadow-sm">
          <div class="asha-brand">
            <div class="asha-brand-title-row">
              <img src="pics/logo.png" alt="ASHA Logo" class="asha-logo-img" data-role="asha-logo" />
              <div>
                <div class="d-flex align-items-center gap-2">
                  <span class="asha-logo-badge">ASHA</span>
                  <h1>ASHA — Personal Health Companion</h1>
                </div>
                <p class="asha-cta">${
                  isId
                    ? 'Mulai — Hope is the beginning of the plan'
                    : 'Start — Hope is the beginning of the plan'
                }</p>
              </div>
            </div>
          </div>
          <div class="asha-controls">
            <button type="button" class="btn btn-outline-primary btn-sm" data-action="lang-id">${
              isId ? 'Bahasa Indonesia (Aktif)' : 'Bahasa Indonesia'
            }</button>
            <button type="button" class="btn btn-outline-primary btn-sm" data-action="lang-en">${
              !isId ? 'English (Active)' : 'English'
            }</button>
            <button type="button" class="btn btn-outline-primary btn-sm" data-action="clear-session">${
              isId ? 'Hapus Sesi' : 'Clear Session'
            }</button>
          </div>
        </header>

        ${renderWizardNav(isId, 'top')}

        <main class="asha-main">
          <div class="modal-dialog modal-xl modal-dialog-centered asha-wizard-modal-dialog" role="document" data-role="wizard-modal-dialog">
            <div class="modal-content asha-wizard-modal-content">
              <div class="modal-header asha-wizard-modal-header">
                <h5 class="modal-title" id="ashaWizardModalTitle">
                  ${
                    isId
                      ? 'Formulir Perencanaan Kesehatan & Kebugaran Personal'
                      : 'Personal Health & Fitness Planning Wizard'
                  }
                </h5>
                <span class="badge bg-light text-dark border">
                  ${isId ? 'Langkah' : 'Step'} ${state.ui.currentStep + 1} / ${TOTAL_WIZARD_STEPS}
                </span>
              </div>
              <div class="modal-body asha-wizard-modal-body">
                <div id="smartwizard" class="sw-main sw-theme-dots asha-timeline-wizard" data-role="smartwizard">
                  ${renderTimelineDotStepTabs(isId)}
                  <div class="sw-container tab-content asha-wizard-step-transition">
                    <div id="step-${state.ui.currentStep + 1}" class="tab-pane step-content active" style="display: block;">
                      ${renderStepContent(isId)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ${renderWizardNav(isId, 'bottom')}
          ${renderChatPanel(isId)}
        </main>

        <footer class="asha-footer shadow-sm">
          <div class="asha-footer-content">
            <div class="asha-footer-brand">
              <div class="d-flex align-items-center gap-2">
                <img src="pics/logo.png" alt="ASHA Logo" width="28" height="28" class="rounded" />
                <strong>ASHA — Adaptive Smart Health Assistant (v1.7)</strong>
              </div>
              <span>${
                isId
                  ? 'Perencanaan Kebugaran & Nutrisi Personal Berbasis Bukti'
                  : 'Evidence-Informed Personal Fitness & Nutrition Companion'
              }</span>
            </div>
            <div class="asha-footer-meta">
              <span>${
                isId
                  ? 'Privasi 100% In-Memory (Tanpa Penyimpanan Data Kesehatan) • Edukatif & Bukan Diagnosis Medis'
                  : '100% In-Memory Privacy (Zero Health Data Storage) • Educational & Not Medical Diagnosis'
              }</span>
            </div>
          </div>
        </footer>
      </div>
    `;

    attachDomListeners();
  }

  function attachDomListeners() {
    if (!root) return;

    root.querySelector('[data-action="lang-id"]')?.addEventListener('click', () => setLanguage('id'));
    root.querySelector('[data-action="lang-en"]')?.addEventListener('click', () => setLanguage('en'));
    root
      .querySelector('[data-action="clear-session"]')
      ?.addEventListener('click', () => clearSession());
    root.querySelectorAll('[data-action="prev-step"]').forEach((btn) => {
      btn.addEventListener('click', () => prevStep());
    });
    root.querySelectorAll('[data-action="next-step"]').forEach((btn) => {
      btn.addEventListener('click', () => nextStep());
    });
    root.querySelectorAll('[data-action="start-over"]').forEach((btn) => {
      btn.addEventListener('click', () => clearSession());
    });
    root.querySelectorAll('[data-step-tab]').forEach((tabLink) => {
      tabLink.addEventListener('click', (e) => {
        e.preventDefault();
        const stepIdx = parseInt(
          (e.currentTarget as HTMLElement).getAttribute('data-step-tab') ?? '0',
          10
        );
        if (!Number.isNaN(stepIdx)) {
          goToStep(stepIdx);
        }
      });
    });

    root.querySelector('[data-field="nickname"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      updatePersonal({ nickname: val || null });
    });

    root.querySelector('[data-field="sex"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as SexSelection | '';
      updatePersonal({ sex: val ? val : null });
    });

    root.querySelector('[data-field="age"]')?.addEventListener('change', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      updatePersonal({ age: Number.isNaN(val) ? null : val });
    });

    root.querySelector('[data-field="height"]')?.addEventListener('change', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      updatePersonal({ height: Number.isNaN(val) ? null : val });
    });

    root.querySelector('[data-field="weight"]')?.addEventListener('change', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      updatePersonal({ weight: Number.isNaN(val) ? null : val });
    });

    root.querySelector('[data-field="ethnicity"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value.trim();
      updatePersonal({ ethnicity: val || null });
    });

    root.querySelectorAll('[data-biomarker]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const key = target.getAttribute('data-biomarker') as BiomarkerKey;
        updateHealthSnapshot({ [key]: target.value });
      });
    });

    root.querySelector('[data-field="health-other"]')?.addEventListener('change', (e) => {
      updateHealthSnapshot({ other: (e.target as HTMLInputElement).value });
    });

    root.querySelectorAll('[data-edit-ocr]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const key = target.getAttribute('data-edit-ocr') as BiomarkerKey;
        editExtractedBiomarker(key, target.value);
      });
    });

    root.querySelector('[data-action="ocr-file"]')?.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files[0]) {
        void uploadHealthReport(files[0]);
      }
    });

    root
      .querySelector('[data-action="confirm-ocr"]')
      ?.addEventListener('click', () => confirmHealthReport());

    root.querySelector('[data-field="aspiration"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as AspirationType | '';
      updateGoal({ aspiration: val || null });
    });

    root.querySelector('[data-field="muscleMassPercent"]')?.addEventListener('change', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      updateGoal({ muscleMassPercent: Number.isNaN(val) ? null : val });
    });

    root.querySelector('[data-field="fatPercent"]')?.addEventListener('change', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      updateGoal({ fatPercent: Number.isNaN(val) ? null : val });
    });

    root.querySelector('[data-field="targetWeightKg"]')?.addEventListener('change', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      updateGoal({ targetWeightKg: Number.isNaN(val) ? null : val });
    });

    root.querySelector('[data-field="target"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      updateGoal({ target: val || null });
    });

    root.querySelector('[data-field="runningDistance"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as RunningDistance | '';
      updateGoal({ runningDistance: val || null });
    });

    root.querySelector('[data-field="targetPace"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      updateGoal({ targetPace: val || null });
    });

    root.querySelector('[data-field="currentPerformance"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      updateGoal({ currentPerformance: val || null });
    });

    root.querySelector('[data-field="targetBiomarker"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value.trim() as BiomarkerKey | 'other' | '';
      updateGoal({ targetBiomarker: val || null });
    });

    root.querySelector('[data-field="targetBiomarkerValue"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      updateGoal({ targetBiomarkerValue: val || null });
    });

    root.querySelector('[data-field="durationWeeks"]')?.addEventListener('change', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      updateTimeframe(Number.isNaN(val) ? null : val);
    });

    root
      .querySelector('[data-action="select-all-training-days"]')
      ?.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        if (isChecked) {
          updateSchedule({ trainingDays: [...DAYS_OF_WEEK], restDays: [] });
        } else {
          updateSchedule({ trainingDays: [] });
        }
      });

    root.querySelectorAll('[data-training-day]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const checked: string[] = [];
        root.querySelectorAll('[data-training-day]').forEach((el) => {
          const input = el as HTMLInputElement;
          if (input.checked) {
            const day = input.getAttribute('data-training-day');
            if (day) checked.push(day);
          }
        });
        const allSelected = DAYS_OF_WEEK.every((d) => checked.includes(d));
        if (allSelected) {
          updateSchedule({ trainingDays: checked, restDays: [] });
        } else {
          updateSchedule({ trainingDays: checked });
        }
      });
    });

    root.querySelectorAll('[data-rest-day]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const checked: string[] = [];
        root.querySelectorAll('[data-rest-day]').forEach((el) => {
          const input = el as HTMLInputElement;
          if (input.checked) {
            const day = input.getAttribute('data-rest-day');
            if (day) checked.push(day);
          }
        });
        updateSchedule({ restDays: checked });
      });
    });

    root.querySelectorAll('[data-training-type]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const checked: TrainingType[] = [];
        root.querySelectorAll('[data-training-type]').forEach((el) => {
          const input = el as HTMLInputElement;
          if (input.checked) {
            const tType = input.getAttribute('data-training-type') as TrainingType | null;
            if (tType) checked.push(tType);
          }
        });
        updateSchedule({ trainingTypes: checked });
      });
    });

    root.querySelector('[data-field="sessionDurationMinutes"]')?.addEventListener('change', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      updateSchedule({ sessionDurationMinutes: Number.isNaN(val) ? null : val });
    });

    root.querySelector('[data-field="preferredTime"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      updateSchedule({ preferredTime: val || null });
    });

    root.querySelector('[data-field="diet"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as DietType | '';
      updateNutrition({ diet: val || null });
    });

    root.querySelector('[data-field="fastingProtocol"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as FastingProtocol | '';
      updateNutrition({ fastingProtocol: val || null });
    });

    root.querySelector('[data-field="eatingWindow"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      updateNutrition({ eatingWindow: val || null });
    });

    root.querySelectorAll('[data-equipment]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const checked: EquipmentItem[] = [];
        root.querySelectorAll('[data-equipment]').forEach((el) => {
          const input = el as HTMLInputElement;
          if (input.checked) {
            checked.push(input.getAttribute('data-equipment') as EquipmentItem);
          }
        });
        updateEquipment(checked);
      });
    });

    root.querySelector('[data-field="planType"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as PlanTypeOption;
      updatePlanning({ planType: val });
    });

    root.querySelector('[data-field="integrationMode"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as IntegrationModeOption;
      updatePlanning({ integrationMode: val });
    });

    root.querySelector('[data-field="startDate"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      updatePlanning({ startDate: val || null });
    });

    root.querySelector('[data-field="calendarProvider"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as CalendarProvider;
      updatePlanning({ calendarProvider: val });
    });

    root.querySelector('[data-field="exerciseVisualMode"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as ExerciseVisualMode;
      updatePlanning({ exerciseVisualMode: val });
    });

    root.querySelector('[data-field="reminderMinutesBefore"]')?.addEventListener('change', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!Number.isNaN(val)) {
        updatePlanning({ reminderMinutesBefore: val });
      }
    });

    root.querySelectorAll('[data-conditional]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.getAttribute('data-conditional') as ConditionalQuestionItem['id'];
        answerConditionalQuestion(id, target.value);
      });
    });

    root.querySelector('[data-action="toggle-confirm"]')?.addEventListener('change', (e) => {
      setConfirmed((e.target as HTMLInputElement).checked);
    });

    root.querySelector('[data-action="close-popup"]')?.addEventListener('click', () => {
      setConfirmed(false);
    });

    root
      .querySelector('[data-action="toggle-prompt"]')
      ?.addEventListener('click', () => toggleMasterPromptDisclosure());

    root
      .querySelector('[data-action="toggle-ics-preview"]')
      ?.addEventListener('click', () => toggleCalendarPreview());

    root.querySelector('[data-action="copy-prompt"]')?.addEventListener('click', () => {
      void copyMasterPromptToClipboard();
    });

    root.querySelector('[data-action="open-gemini"]')?.addEventListener('click', () => {
      openGeminiInNewTab();
    });

    root.querySelector('[data-action="start-chat"]')?.addEventListener('click', () => {
      void startPersonalTrainerChat();
    });

    root.querySelector('[data-action="download-training-ics"]')?.addEventListener('click', () => {
      triggerBrowserDownload(
        'My-Training-Plan.ics',
        buildTrainingCalendarIcs(state),
        'text/calendar;charset=utf-8'
      );
    });

    root.querySelector('[data-action="download-diet-ics"]')?.addEventListener('click', () => {
      triggerBrowserDownload(
        'My-Diet-Plan.ics',
        buildDietCalendarIcs(state),
        'text/calendar;charset=utf-8'
      );
    });

    root.querySelector('[data-action="download-snapshot"]')?.addEventListener('click', () => {
      triggerBrowserDownload(
        'asha-context-snapshot.md',
        buildContextSnapshotMarkdown(state, getMasterPrompt()),
        'text/markdown;charset=utf-8'
      );
    });

    root.querySelector('[data-action="send-chat"]')?.addEventListener('click', () => {
      const input = root.querySelector('[data-field="chat-input"]') as HTMLInputElement | null;
      if (input && input.value.trim()) {
        void sendChatMessage(input.value.trim());
      }
    });

    root
      .querySelector('[data-action="confirm-replacement"]')
      ?.addEventListener('click', () => confirmPlanReplacement());
  }

  function setLanguage(language: Language) {
    state.ui.language = language;
    render();
  }

  function nextStep() {
    if (state.ui.currentStep < TOTAL_WIZARD_STEPS - 1) {
      state.ui.currentStep += 1;
      render();
    }
  }

  function prevStep() {
    if (state.ui.currentStep > 0) {
      state.ui.currentStep -= 1;
      render();
    }
  }

  function goToStep(stepIndex: number) {
    state.ui.currentStep = Math.max(0, Math.min(TOTAL_WIZARD_STEPS - 1, stepIndex));
    render();
  }

  function toggleMasterPromptDisclosure() {
    state.ui.showMasterPrompt = !state.ui.showMasterPrompt;
    render();
  }

  function toggleCalendarPreview() {
    state.ui.showCalendarPreview = !state.ui.showCalendarPreview;
    state.calendar.previewOpen = state.ui.showCalendarPreview;
    render();
  }

  async function copyMasterPromptToClipboard(): Promise<string> {
    const prompt = getMasterPrompt();
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(prompt);
    }
    return prompt;
  }

  function openGeminiInNewTab() {
    if (typeof window !== 'undefined' && window.open) {
      window.open('https://gemini.google.com/', '_blank');
    }
  }

  function updatePersonal(patch: Partial<PersonalInfo>) {
    markDirty();
    state.personal = { ...state.personal, ...patch };
    if ('sex' in patch) {
      const persona = applyPersonaBackgroundToDom(state.personal.sex);
      state.personalization.visualPersona = persona.type;
    }
    render();
  }

  function updateHealthSnapshot(
    patch: Partial<Record<BiomarkerKey | 'other', string | null | undefined>>
  ) {
    markDirty();
    for (const key of BIOMARKER_KEYS) {
      if (key in patch) {
        const rawVal = patch[key];
        const trimmed = typeof rawVal === 'string' ? rawVal.trim() : '';
        if (trimmed) {
          state.health[key] = { value: trimmed, fieldState: 'provided' };
        } else {
          state.health[key] = { value: null, fieldState: 'missing' };
        }
      }
    }
    if ('other' in patch) {
      const otherVal = patch.other;
      state.health.other = typeof otherVal === 'string' && otherVal.trim() ? otherVal.trim() : null;
    }
    render();
  }

  async function uploadHealthReport(file: File | Blob | string) {
    markDirty();
    const ocrResult = await ocrAdapter(file);
    const extracted = parseHealthReportText(
      ocrResult.rawText,
      ocrResult.confidenceScore ?? 85
    );
    state.healthReport = {
      fileName: typeof file === 'string' ? file : file instanceof File ? file.name : 'report',
      rawText: ocrResult.rawText,
      extracted,
      confirmed: false
    };
    render();
  }

  function editExtractedBiomarker(key: BiomarkerKey, value: string | null) {
    markDirty();
    const existing = state.healthReport.extracted[key];
    const trimmed = typeof value === 'string' && value.trim() ? value.trim() : null;
    state.healthReport.extracted[key] = {
      key,
      rawText: existing?.rawText ?? trimmed ?? '',
      normalizedValue: trimmed,
      confidence: trimmed ? 'High confidence' : 'Unable to determine',
      fieldState: 'requires_confirmation'
    };
    state.healthReport.confirmed = false;
    render();
  }

  function confirmHealthReport() {
    markDirty();
    state.healthReport.confirmed = true;
    for (const key of BIOMARKER_KEYS) {
      const item = state.healthReport.extracted[key];
      if (item && item.normalizedValue) {
        item.fieldState = 'provided';
        state.health[key] = {
          value: item.normalizedValue,
          fieldState: 'provided',
          confidence: item.confidence
        };
      }
    }
    render();
  }

  function updateGoal(patch: Partial<GoalState>) {
    markDirty();
    state.goal = { ...state.goal, ...patch };
    if (!('target' in patch)) {
      state.goal.target = deriveStructuredTargetSummary(state.goal);
    }
    render();
  }

  function updateTimeframe(durationWeeks: number | null) {
    markDirty();
    const sanitizedWeeks =
      durationWeeks !== null && !Number.isNaN(durationWeeks)
        ? Math.max(1, Math.floor(durationWeeks))
        : null;
    state.timeframe = {
      durationWeeks: sanitizedWeeks,
      fieldState: sanitizedWeeks !== null ? 'provided' : 'missing'
    };
    render();
  }

  function updateSchedule(
    patch: Partial<Omit<ScheduleState, 'fieldStates'>>
  ) {
    markDirty();
    if (patch.trainingDays !== undefined) {
      state.schedule.trainingDays = patch.trainingDays;
      state.schedule.fieldStates.trainingDays =
        patch.trainingDays.length > 0 ? 'provided' : 'missing';
    }
    if (patch.trainingTypes !== undefined) {
      state.schedule.trainingTypes = patch.trainingTypes;
      state.schedule.fieldStates.trainingTypes =
        patch.trainingTypes.length > 0 ? 'provided' : 'missing';
    }
    if (patch.sessionDurationMinutes !== undefined) {
      state.schedule.sessionDurationMinutes = patch.sessionDurationMinutes;
      state.schedule.fieldStates.sessionDurationMinutes =
        patch.sessionDurationMinutes !== null ? 'provided' : 'missing';
    }
    if (patch.restDays !== undefined) {
      state.schedule.restDays = patch.restDays;
      state.schedule.fieldStates.restDays = patch.restDays.length > 0 ? 'provided' : 'missing';
    }
    if (patch.preferredTime !== undefined) {
      state.schedule.preferredTime = patch.preferredTime;
      state.schedule.fieldStates.preferredTime = patch.preferredTime ? 'provided' : 'missing';
    }
    render();
  }

  function updateEquipment(selected: EquipmentItem[]) {
    markDirty();
    state.equipment = {
      selected: [...selected],
      fieldState: selected.length > 0 ? 'provided' : 'missing'
    };
    render();
  }

  function updateNutrition(patch: Partial<NutritionState>) {
    markDirty();
    state.nutrition = { ...state.nutrition, ...patch };
    render();
  }

  function updatePlanning(patch: Partial<PlanningState>) {
    markDirty();
    state.planning = { ...state.planning, ...patch };
    if (patch.exerciseVisualMode) {
      state.exerciseGuide.visualMode = patch.exerciseVisualMode;
    }
    if (patch.reminderMinutesBefore !== undefined) {
      state.calendar.reminderMinutesBefore = patch.reminderMinutesBefore;
    }
    if (patch.calendarProvider) {
      state.calendar.provider = patch.calendarProvider;
    }
    if (patch.startDate !== undefined) {
      state.calendar.startDate = patch.startDate;
    }
    render();
  }

  function recomputeAssumptionsAndPersonalization() {
    applyAssumptionsAndPersonalization(state);
    render();
  }

  function answerConditionalQuestion(
    id: ConditionalQuestionItem['id'],
    answer: string | null
  ) {
    markDirty();
    state.personalization.conditionalQuestions =
      state.personalization.conditionalQuestions.map((q) =>
        q.id === id ? { ...q, answer } : q
      );
    render();
  }

  function setConfirmed(confirmed: boolean) {
    if (confirmed) {
      applyAssumptionsAndPersonalization(state);
      state.ui.motivationalQuote = pickRandomMotivationalQuote();
    } else {
      state.ui.motivationalQuote = null;
    }
    state.confirmation.confirmed = confirmed;
    state.personalization.confirmed = confirmed;
    if (confirmed) {
      void copyMasterPromptToClipboard();
    }
    render();
  }

  function getMasterPrompt(): string {
    if (!state.confirmation.confirmed) {
      throw new Error(
        'User confirmation required before generating the Master Prompt (Saya telah memeriksa informasi dan asumsi yang akan digunakan untuk membuat prompt).'
      );
    }

    return generateEnglishMasterPrompt(state);
  }

  async function startPersonalTrainerChat() {
    const masterPrompt = getMasterPrompt();
    state.chat.active = true;
    state.chat.loading = true;
    state.chat.loadingMessage = LOADING_MESSAGE_ID;
    state.chat.error = null;
    render();

    const response = await geminiBridge({
      masterPrompt,
      history: []
    });

    state.chat.loading = false;
    state.chat.loadingMessage = null;

    if (!response.ok) {
      state.chat.error = response.error ?? 'Gagal memuat rencana.';
      render();
      return response;
    }

    state.chat.currentVersion = response.planVersion ?? 'v1.0';
    state.chat.turns.push({
      role: 'assistant',
      content: response.text ?? '',
      planVersion: state.chat.currentVersion
    });
    render();
    return response;
  }

  async function sendChatMessage(userMessage: string) {
    const masterPrompt = getMasterPrompt();
    const historySnapshot = [...state.chat.turns];

    state.chat.turns.push({
      role: 'user',
      content: userMessage
    });
    state.chat.loading = true;
    state.chat.loadingMessage = LOADING_MESSAGE_ID;
    state.chat.error = null;
    render();

    const response = await geminiBridge({
      masterPrompt,
      history: historySnapshot,
      userMessage
    });

    state.chat.loading = false;
    state.chat.loadingMessage = null;

    if (!response.ok) {
      state.chat.error = response.error ?? 'Gagal mengirim pesan.';
      render();
      return response;
    }

    if (response.isMajorRevision) {
      state.chat.pendingReplacementContent = response.text ?? '';
      state.chat.turns.push({
        role: 'assistant',
        content: response.text ?? '',
        requiresReplacementConfirmation: true
      });
    } else {
      const nextVersion = incrementMinorVersion(state.chat.currentVersion);
      state.chat.currentVersion = nextVersion;
      state.chat.turns.push({
        role: 'assistant',
        content: response.text ?? '',
        planVersion: nextVersion
      });
    }

    render();
    return response;
  }

  function confirmPlanReplacement() {
    if (!state.chat.pendingReplacementContent) return;
    const nextVersion = incrementMinorVersion(state.chat.currentVersion);
    state.chat.currentVersion = nextVersion;
    state.chat.pendingReplacementContent = null;
    render();
  }

  function clearSession() {
    state = createInitialState();
    applyPersonaBackgroundToDom(null);
    render();
  }

  applyPersonaBackgroundToDom(state.personal.sex);
  render();

  return {
    getState: () => state,
    setLanguage,
    nextStep,
    prevStep,
    goToStep,
    toggleMasterPromptDisclosure,
    toggleCalendarPreview,
    copyMasterPromptToClipboard,
    openGeminiInNewTab,
    updatePersonal,
    updateHealthSnapshot,
    uploadHealthReport,
    editExtractedBiomarker,
    confirmHealthReport,
    updateGoal,
    updateTimeframe,
    updateSchedule,
    updateEquipment,
    updateNutrition,
    updatePlanning,
    recomputeAssumptionsAndPersonalization,
    answerConditionalQuestion,
    setConfirmed,
    getMasterPrompt,
    startPersonalTrainerChat,
    sendChatMessage,
    confirmPlanReplacement,
    generateTrainingCalendarIcs: () => {
      if (!state.confirmation.confirmed) {
        throw new Error('User confirmation required before generating Training Calendar.');
      }
      return buildTrainingCalendarIcs(state);
    },
    generateDietCalendarIcs: () => {
      if (!state.confirmation.confirmed) {
        throw new Error('User confirmation required before generating Diet Calendar.');
      }
      return buildDietCalendarIcs(state);
    },
    exportContextSnapshotMarkdown: () => {
      const prompt = getMasterPrompt();
      return buildContextSnapshotMarkdown(state, prompt);
    },
    clearSession
  };
}
