import {
  AshaAppState,
  AspirationType,
  BIOMARKER_KEYS,
  BIOMARKER_LABELS,
  BiomarkerKey,
  ConditionalQuestionItem,
  DietType,
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
  SexSelection
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

function incrementMinorVersion(version: string): string {
  const match = version.match(/^v(\d+)\.(\d+)$/);
  if (!match) return 'v1.1';
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10) + 1;
  return `v${major}.${minor}`;
}

function createInitialHealthSnapshot(): HealthSnapshot {
  const snapshot = { other: null } as HealthSnapshot;
  for (const key of BIOMARKER_KEYS) {
    snapshot[key] = { value: null, fieldState: 'missing' };
  }
  return snapshot;
}

export function createInitialState(): AshaAppState {
  return {
    ui: {
      language: 'id',
      currentStep: 0,
      showMasterPrompt: false,
      showCalendarPreview: false
    },
    personal: {
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
      runningDistance: null,
      currentPerformance: null,
      targetBiomarker: null
    },
    timeframe: {
      durationWeeks: null,
      fieldState: 'missing'
    },
    schedule: {
      trainingDays: [],
      sessionDurationMinutes: null,
      restDays: [],
      preferredTime: null,
      fieldStates: {
        trainingDays: 'missing',
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
      reminderMinutesBefore: 30
    },
    exerciseGuide: {
      visualMode: 'external_reference'
    },
    calendar: {
      reminderMinutesBefore: 30,
      previewOpen: false
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

  function renderStepContent(isId: boolean): string {
    const step = state.ui.currentStep;

    if (step === 0) {
      return `
        <section class="asha-card">
          <h2>${isId ? '1. Informasi Pribadi' : '1. Personal Information'}</h2>
          <p class="asha-subtitle">${
            isId
              ? 'Mulai dengan informasi dasar Anda. Data hanya disimpan di memori sesi ini.'
              : 'Start with your core personal context. Data stays strictly in runtime memory.'
          }</p>
          <div class="asha-grid">
            <label>
              <span>${isId ? 'Usia (tahun)' : 'Age (years)'}</span>
              <input type="number" data-field="age" value="${state.personal.age ?? ''}" placeholder="35" />
            </label>
            <label>
              <span>${isId ? 'Jenis Kelamin' : 'Sex'}</span>
              <select data-field="sex">
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
            <label>
              <span>${isId ? 'Tinggi Badan (cm)' : 'Height (cm)'}</span>
              <input type="number" data-field="height" value="${state.personal.height ?? ''}" placeholder="168" />
            </label>
            <label>
              <span>${isId ? 'Berat Badan (kg)' : 'Weight (kg)'}</span>
              <input type="number" data-field="weight" value="${state.personal.weight ?? ''}" placeholder="65" />
            </label>
            <label>
              <span>${isId ? 'Suku / Etnis (Opsional)' : 'Ethnic Group (Optional)'}</span>
              <input type="text" data-field="ethnicity" value="${state.personal.ethnicity ?? ''}" />
            </label>
          </div>
        </section>
      `;
    }

    if (step === 1) {
      const inputs = BIOMARKER_KEYS.map(
        (key) => `
          <label>
            <span>${BIOMARKER_LABELS[key]}</span>
            <input type="text" data-biomarker="${key}" value="${
              state.health[key].value ?? ''
            }" placeholder="${isId ? 'Belum diisi' : 'Not provided'}" />
          </label>
        `
      ).join('');

      return `
        <section class="asha-card">
          <h2>${isId ? '2. Ringkasan Kesehatan (Health Snapshot)' : '2. Health Snapshot'}</h2>
          <p class="asha-subtitle">${
            isId
              ? 'Nilai yang dikosongkan akan ditandai "Not provided" dan tidak pernah dikarang.'
              : 'Omitted values are marked "Not provided" and never fabricated.'
          }</p>
          <div class="asha-grid">
            ${inputs}
            <label>
              <span>${isId ? 'Indikator Lainnya (Opsional)' : 'Other Indicators (Optional)'}</span>
              <input type="text" data-field="health-other" value="${state.health.other ?? ''}" />
            </label>
          </div>
        </section>
      `;
    }

    if (step === 2) {
      const extractedRows = BIOMARKER_KEYS.map((key) => {
        const item = state.healthReport.extracted[key];
        if (!item) return '';
        return `
          <div class="asha-ocr-row">
            <strong>${BIOMARKER_LABELS[key]}</strong>
            <input type="text" data-edit-ocr="${key}" value="${item.normalizedValue ?? ''}" placeholder="Unable to determine" />
            <span class="asha-badge">${item.confidence}</span>
          </div>
        `;
      }).join('');

      return `
        <section class="asha-card">
          <h2>${isId ? '3. Laporan Kesehatan / OCR' : '3. Health Report / Client-Side OCR'}</h2>
          <p class="asha-subtitle">${
            isId
              ? 'Ekstraksi dilakukan 100% di browser menggunakan Tesseract.js. Verifikasi sebelum digunakan.'
              : 'Extracted 100% in-browser via Tesseract.js. Verify and confirm before use.'
          }</p>
          <input type="file" data-action="ocr-file" accept=".jpg,.jpeg,.png,.webp" />
          <div class="asha-ocr-results">${extractedRows}</div>
          <button type="button" data-action="confirm-ocr">${
            isId ? 'Konfirmasi Hasil Ekstraksi' : 'Confirm Extracted Values'
          }</button>
        </section>
      `;
    }

    if (step === 3) {
      return `
        <section class="asha-card">
          <h2>${isId ? '4. Aspirasi, Target & Jangka Waktu' : '4. Aspiration, Target & Timeframe'}</h2>
          <div class="asha-grid">
            <label>
              <span>${isId ? 'Aspirasi Utama' : 'Primary Aspiration'}</span>
              <select data-field="aspiration">
                <option value="">${isId ? '-- Pilih --' : '-- Select --'}</option>
                <option value="build_muscle" ${state.goal.aspiration === 'build_muscle' ? 'selected' : ''}>Build Muscle</option>
                <option value="fat_loss" ${state.goal.aspiration === 'fat_loss' ? 'selected' : ''}>Fat Loss</option>
                <option value="weight_loss" ${state.goal.aspiration === 'weight_loss' ? 'selected' : ''}>Weight Loss</option>
                <option value="improve_mobility" ${state.goal.aspiration === 'improve_mobility' ? 'selected' : ''}>Improve Mobility</option>
                <option value="improve_overall_health" ${state.goal.aspiration === 'improve_overall_health' ? 'selected' : ''}>Improve Overall Health</option>
                <option value="running_performance" ${state.goal.aspiration === 'running_performance' ? 'selected' : ''}>Running Performance</option>
                <option value="improve_health_indicator" ${state.goal.aspiration === 'improve_health_indicator' ? 'selected' : ''}>Improve Health Indicator</option>
              </select>
            </label>
            <label>
              <span>${isId ? 'Target Spesifik' : 'Specific Target'}</span>
              <input type="text" data-field="target" value="${state.goal.target ?? ''}" />
            </label>
            <label>
              <span>${isId ? 'Jarak Lari (Jika Lari)' : 'Running Distance (If Running)'}</span>
              <select data-field="runningDistance">
                <option value="">--</option>
                <option value="5K" ${state.goal.runningDistance === '5K' ? 'selected' : ''}>5K</option>
                <option value="10K" ${state.goal.runningDistance === '10K' ? 'selected' : ''}>10K</option>
                <option value="half_marathon" ${state.goal.runningDistance === 'half_marathon' ? 'selected' : ''}>Half Marathon</option>
                <option value="full_marathon" ${state.goal.runningDistance === 'full_marathon' ? 'selected' : ''}>Full Marathon</option>
              </select>
            </label>
            <label>
              <span>${isId ? 'Performa Saat Ini (Opsional)' : 'Current Performance (Optional)'}</span>
              <input type="text" data-field="currentPerformance" value="${state.goal.currentPerformance ?? ''}" />
            </label>
            <label>
              <span>${isId ? 'Indikator Kesehatan Target (Opsional)' : 'Target Biomarker (Optional)'}</span>
              <input type="text" data-field="targetBiomarker" value="${state.goal.targetBiomarker ?? ''}" />
            </label>
            <label>
              <span>${isId ? 'Durasi Rencana (Minggu)' : 'Timeframe (Weeks)'}</span>
              <input type="number" data-field="durationWeeks" value="${state.timeframe.durationWeeks ?? ''}" placeholder="8" />
            </label>
          </div>
        </section>
      `;
    }

    if (step === 4) {
      const equipItems: EquipmentItem[] = ['bodyweight', 'dumbbells', 'barbell', 'fitness_ball'];
      const equipCheckboxes = equipItems
        .map(
          (item) => `
            <label class="asha-inline-check">
              <input type="checkbox" data-equipment="${item}" ${
                state.equipment.selected.includes(item) ? 'checked' : ''
              } />
              <span>${item}</span>
            </label>
          `
        )
        .join('');

      return `
        <section class="asha-card">
          <h2>${isId ? '5. Jadwal, Peralatan & Diet' : '5. Schedule, Equipment & Diet'}</h2>
          <div class="asha-grid">
            <label>
              <span>${isId ? 'Hari Latihan (pisahkan koma)' : 'Training Days (comma-separated)'}</span>
              <input type="text" data-field="trainingDays" value="${state.schedule.trainingDays.join(', ')}" placeholder="Monday, Wednesday, Friday" />
            </label>
            <label>
              <span>${isId ? 'Hari Istirahat (pisahkan koma)' : 'Rest Days (comma-separated)'}</span>
              <input type="text" data-field="restDays" value="${state.schedule.restDays.join(', ')}" placeholder="Tuesday, Thursday, Saturday, Sunday" />
            </label>
            <label>
              <span>${isId ? 'Durasi Sesi (menit)' : 'Session Duration (minutes)'}</span>
              <input type="number" data-field="sessionDurationMinutes" value="${
                state.schedule.sessionDurationMinutes ?? ''
              }" placeholder="45" />
            </label>
            <label>
              <span>${isId ? 'Waktu Latihan Pilihan' : 'Preferred Training Time'}</span>
              <input type="text" data-field="preferredTime" value="${
                state.schedule.preferredTime ?? ''
              }" placeholder="07:00" />
            </label>
            <label>
              <span>${isId ? 'Pola Diet' : 'Diet Preference'}</span>
              <select data-field="diet">
                <option value="">${isId ? 'Tidak ditentukan' : 'Not specified'}</option>
                <option value="no_specific_diet" ${state.nutrition.diet === 'no_specific_diet' ? 'selected' : ''}>No specific diet</option>
                <option value="vegan" ${state.nutrition.diet === 'vegan' ? 'selected' : ''}>Vegan</option>
                <option value="vegetarian" ${state.nutrition.diet === 'vegetarian' ? 'selected' : ''}>Vegetarian</option>
                <option value="carnivore" ${state.nutrition.diet === 'carnivore' ? 'selected' : ''}>Carnivore</option>
                <option value="keto" ${state.nutrition.diet === 'keto' ? 'selected' : ''}>Keto</option>
                <option value="intermittent_fasting" ${state.nutrition.diet === 'intermittent_fasting' ? 'selected' : ''}>Intermittent Fasting</option>
              </select>
            </label>
            <label>
              <span>${isId ? 'Protokol IF (Jika IF)' : 'IF Protocol (If IF)'}</span>
              <select data-field="fastingProtocol">
                <option value="">--</option>
                <option value="12:12" ${state.nutrition.fastingProtocol === '12:12' ? 'selected' : ''}>12:12</option>
                <option value="14:10" ${state.nutrition.fastingProtocol === '14:10' ? 'selected' : ''}>14:10</option>
                <option value="16:8" ${state.nutrition.fastingProtocol === '16:8' ? 'selected' : ''}>16:8</option>
                <option value="18:6" ${state.nutrition.fastingProtocol === '18:6' ? 'selected' : ''}>18:6</option>
                <option value="custom" ${state.nutrition.fastingProtocol === 'custom' ? 'selected' : ''}>Custom</option>
              </select>
            </label>
            <label>
              <span>${isId ? 'Jendela Makan (Jika IF)' : 'Eating Window (If IF)'}</span>
              <input type="text" data-field="eatingWindow" value="${state.nutrition.eatingWindow ?? ''}" placeholder="12:00 - 20:00" />
            </label>
          </div>
          <fieldset class="asha-equipment-group">
            <legend>${isId ? 'Peralatan yang Tersedia' : 'Available Equipment'}</legend>
            ${equipCheckboxes}
          </fieldset>
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
                  <label class="asha-conditional-q">
                    <span>${isId ? q.questionId : q.questionEn}</span>
                    <input type="text" data-conditional="${q.id}" value="${q.answer ?? ''}" />
                  </label>
                `
              )
              .join('')
          : `<p>${
              isId
                ? 'Tidak ada pertanyaan fisiologis tambahan yang diperlukan.'
                : 'No additional conditional physiological questions required.'
            }</p>`;

      return `
        <section class="asha-card">
          <h2>${
            isId
              ? '6. Tipe Rencana, Referensi Visual & Konteks Fisiologis'
              : '6. Plan Type, Visual Preferences & Conditional Context'
          }</h2>
          <div class="asha-grid">
            <label>
              <span>${isId ? 'Tipe Rencana' : 'Plan Type'}</span>
              <select data-field="planType">
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
            <label>
              <span>${isId ? 'Mode Integrasi' : 'Integration Mode'}</span>
              <select data-field="integrationMode">
                <option value="optimize_together" ${
                  state.planning.integrationMode === 'optimize_together' ? 'selected' : ''
                }>Optimize Together</option>
                <option value="independent" ${
                  state.planning.integrationMode === 'independent' ? 'selected' : ''
                }>Independent</option>
              </select>
            </label>
            <label>
              <span>${isId ? 'Mode Referensi Visual Latihan' : 'Exercise Visual Mode'}</span>
              <select data-field="exerciseVisualMode">
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
            <label>
              <span>${isId ? 'Pengingat Kalender (menit sebelum)' : 'Calendar Reminder (minutes before)'}</span>
              <input type="number" data-field="reminderMinutesBefore" value="${state.planning.reminderMinutesBefore}" />
            </label>
          </div>
          <div class="asha-conditionals">
            <h3>${isId ? 'Konteks Fisiologis (Opsional)' : 'Conditional Physiological Context (Optional)'}</h3>
            ${conditionalHtml}
          </div>
        </section>
      `;
    }

    // Step 6: Review & Confirmation Screen
    applyAssumptionsAndPersonalization(state);
    const personaInfo = resolveVisualPersona(state.personal.sex);
    const healthSummary = BIOMARKER_KEYS.map(
      (k) => `${BIOMARKER_LABELS[k]}: ${state.health[k].value ?? 'Not provided'}`
    ).join(' | ');

    const promptPreview =
      state.confirmation.confirmed && state.ui.showMasterPrompt
        ? `
          <div class="asha-prompt-container">
            <div class="asha-prompt-toolbar">
              <button type="button" data-action="copy-prompt">${
                isId ? 'Salin Master Prompt' : 'Copy Master Prompt'
              }</button>
              <button type="button" data-action="open-gemini">${
                isId ? 'Buka Gemini di Tab Baru' : 'Open Gemini in New Tab'
              }</button>
            </div>
            <pre class="asha-prompt-box">${generateEnglishMasterPrompt(state)}</pre>
          </div>
        `
        : '';

    const calendarPreview =
      state.confirmation.confirmed && state.ui.showCalendarPreview
        ? `
          <div class="asha-calendar-preview">
            <h4>My Training Plan (.ics)</h4>
            <pre class="asha-prompt-box">${buildTrainingCalendarIcs(state)}</pre>
            <h4>My Diet Plan (.ics)</h4>
            <pre class="asha-prompt-box">${buildDietCalendarIcs(state)}</pre>
          </div>
        `
        : '';

    return `
      <section class="asha-card asha-review-card">
        <h2>${isId ? '7. Tinjauan & Konfirmasi (Mandatory Review)' : '7. Mandatory Review & Confirmation'}</h2>
        <div class="asha-review-summary">
          <p><strong>Visual Persona:</strong> ${isId ? personaInfo.labelId : personaInfo.labelEn}</p>
          <p><strong>${isId ? 'Konteks Perencanaan' : 'Planning Context'}:</strong> ${
            isId
              ? 'Jenis kelamin digunakan sebagai variabel kontekstual. Tidak ada stereotip latihan berbasis jenis kelamin.'
              : 'Sex will be used as contextual information. No sex-based training stereotype will be applied.'
          }</p>
          <p><strong>${isId ? 'Informasi Pribadi' : 'Personal Info'}:</strong> ${
            state.personal.age ?? 'Not provided'
          } yrs | ${state.personal.sex ?? 'Not provided'} | ${
            state.personal.height !== null ? `${state.personal.height} cm` : 'Not provided'
          } | ${state.personal.weight !== null ? `${state.personal.weight} kg` : 'Not provided'} | ${
            state.personal.ethnicity ?? 'Not provided'
          }</p>
          <p><strong>Health Snapshot:</strong> ${healthSummary}</p>
          <p><strong>Aspiration / Target / Timeframe:</strong> ${
            state.goal.aspiration ?? 'Not provided'
          } — ${state.goal.target ?? 'Not provided'} (${
            state.timeframe.durationWeeks ?? 8
          } weeks)</p>
          <p><strong>Schedule:</strong> ${state.schedule.trainingDays.join(', ')} (${
            state.schedule.sessionDurationMinutes ?? 45
          } min at ${state.schedule.preferredTime ?? '07:00'}) | Rest: ${state.schedule.restDays.join(', ')}</p>
          <p><strong>Equipment:</strong> ${state.equipment.selected.join(', ')} (${
            state.equipment.fieldState
          })</p>
          <p><strong>Diet & Plan Type:</strong> ${state.nutrition.diet ?? 'Not provided'} | ${
            state.planning.planType ?? 'training_and_meal'
          } (${state.planning.integrationMode ?? 'optimize_together'})</p>
          <p><strong>AI Assumptions:</strong> ${
            state.assumptions.length > 0 ? state.assumptions.join(' | ') : 'None'
          }</p>
          <p><strong>${isId ? 'Pertimbangan Keamanan' : 'Safety Considerations'}:</strong> ${
            isId
              ? 'ASHA bersifat edukatif dan bukan diagnosis atau resep medis.'
              : 'ASHA provides educational health planning and is not a medical diagnosis or prescription.'
          }</p>
        </div>

        <label class="asha-confirm-checkbox">
          <input type="checkbox" data-action="toggle-confirm" ${
            state.confirmation.confirmed ? 'checked' : ''
          } />
          <span>${
            isId
              ? 'Saya telah memeriksa informasi dan asumsi yang akan digunakan untuk membuat prompt.'
              : 'I have reviewed the information and assumptions (Saya telah memeriksa informasi dan asumsi yang akan digunakan untuk membuat prompt).'
          }</span>
        </label>

        <div class="asha-review-actions">
          <button type="button" class="asha-primary-btn" data-action="start-chat" ${
            !state.confirmation.confirmed ? 'disabled' : ''
          }>
            ${isId ? 'Mulai Personal Trainer Chat (ASHA)' : 'Start Personal Trainer Chat (ASHA)'}
          </button>

          <button type="button" data-action="toggle-prompt" ${
            !state.confirmation.confirmed ? 'disabled' : ''
          }>
            ${isId ? 'Tampilkan Master Prompt (Power User)' : 'Show Master Prompt'}
          </button>

          <button type="button" data-action="toggle-ics-preview" ${
            !state.confirmation.confirmed ? 'disabled' : ''
          }>
            ${isId ? 'Pratinjau Kalender (.ics)' : 'Preview Calendars (.ics)'}
          </button>

          <button type="button" data-action="download-training-ics" ${
            !state.confirmation.confirmed ? 'disabled' : ''
          }>
            ${isId ? 'Unduh My Training Plan (.ics)' : 'Download My Training Plan (.ics)'}
          </button>

          <button type="button" data-action="download-diet-ics" ${
            !state.confirmation.confirmed ? 'disabled' : ''
          }>
            ${isId ? 'Unduh My Diet Plan (.ics)' : 'Download My Diet Plan (.ics)'}
          </button>

          <button type="button" data-action="download-snapshot" ${
            !state.confirmation.confirmed ? 'disabled' : ''
          }>
            ${isId ? 'Ekspor Context Snapshot (.md)' : 'Export Context Snapshot (.md)'}
          </button>
        </div>

        ${promptPreview}
        ${calendarPreview}
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
        <div class="asha-replacement-banner">
          <p>${
            isId
              ? 'Perubahan signifikan terdeteksi. Konfirmasi sebelum mengganti seluruh rencana?'
              : 'Significant plan change detected. Confirm before replacing the whole plan?'
          }</p>
          <button type="button" data-action="confirm-replacement">${
            isId ? 'Konfirmasi Rencana Baru' : 'Confirm Plan Replacement'
          }</button>
        </div>
      `
      : '';

    return `
      <section class="asha-card asha-chat-panel">
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
            ? `<div class="asha-loading" role="status">${state.chat.loadingMessage}</div>`
            : ''
        }
        ${state.chat.error ? `<div class="asha-error">${state.chat.error}</div>` : ''}
        <div class="asha-chat-history">${turnsHtml}</div>
        ${replacementGateHtml}
        <div class="asha-chat-composer">
          <input type="text" data-field="chat-input" placeholder="${
            isId
              ? 'Tanyakan atau sesuaikan rencana Anda dalam Bahasa Indonesia...'
              : 'Ask or adapt your plan (Gemini responds in Bahasa Indonesia)...'
          }" />
          <button type="button" data-action="send-chat">${isId ? 'Kirim' : 'Send'}</button>
        </div>
      </section>
    `;
  }

  function render() {
    if (!root) return;
    const isId = state.ui.language === 'id';
    root.innerHTML = `
      <div class="asha-shell" data-persona="${state.personalization.visualPersona}">
        <header class="asha-header">
          <div class="asha-brand">
            <h1>ASHA — Personal Health Companion</h1>
            <p class="asha-cta">${
              isId
                ? 'Mulai — Hope is the beginning of the plan'
                : 'Start — Hope is the beginning of the plan'
            }</p>
          </div>
          <div class="asha-controls">
            <button type="button" data-action="lang-id">${
              isId ? 'Bahasa Indonesia (Aktif)' : 'Bahasa Indonesia'
            }</button>
            <button type="button" data-action="lang-en">${
              !isId ? 'English (Active)' : 'English'
            }</button>
            <button type="button" data-action="clear-session">${
              isId ? 'Hapus Sesi' : 'Clear Session'
            }</button>
          </div>
        </header>

        <nav class="asha-wizard-nav" aria-label="Wizard Progress">
          <span>${isId ? 'Langkah' : 'Step'} ${state.ui.currentStep + 1} / ${TOTAL_WIZARD_STEPS}</span>
          <div class="asha-step-buttons">
            <button type="button" data-action="prev-step" ${
              state.ui.currentStep === 0 ? 'disabled' : ''
            }>${isId ? 'Sebelumnya' : 'Back'}</button>
            <button type="button" data-action="next-step" ${
              state.ui.currentStep >= TOTAL_WIZARD_STEPS - 1 ? 'disabled' : ''
            }>${isId ? 'Selanjutnya' : 'Next'}</button>
          </div>
        </nav>

        <main class="asha-main">
          ${renderStepContent(isId)}
          ${renderChatPanel(isId)}
        </main>
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
    root.querySelector('[data-action="prev-step"]')?.addEventListener('click', () => prevStep());
    root.querySelector('[data-action="next-step"]')?.addEventListener('click', () => nextStep());

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
      const val = (e.target as HTMLInputElement).value.trim();
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

    root.querySelector('[data-field="target"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      updateGoal({ target: val || null });
    });

    root.querySelector('[data-field="runningDistance"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as RunningDistance | '';
      updateGoal({ runningDistance: val || null });
    });

    root.querySelector('[data-field="currentPerformance"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      updateGoal({ currentPerformance: val || null });
    });

    root.querySelector('[data-field="targetBiomarker"]')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim() as BiomarkerKey | 'other' | '';
      updateGoal({ targetBiomarker: val || null });
    });

    root.querySelector('[data-field="durationWeeks"]')?.addEventListener('change', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      updateTimeframe(Number.isNaN(val) ? null : val);
    });

    root.querySelector('[data-field="trainingDays"]')?.addEventListener('change', (e) => {
      const days = (e.target as HTMLInputElement).value
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
      updateSchedule({ trainingDays: days });
    });

    root.querySelector('[data-field="restDays"]')?.addEventListener('change', (e) => {
      const days = (e.target as HTMLInputElement).value
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
      updateSchedule({ restDays: days });
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
    render();
  }

  function updateTimeframe(durationWeeks: number | null) {
    markDirty();
    state.timeframe = {
      durationWeeks,
      fieldState: durationWeeks !== null ? 'provided' : 'missing'
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
    }
    state.confirmation.confirmed = confirmed;
    state.personalization.confirmed = confirmed;
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
