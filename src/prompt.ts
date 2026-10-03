import {
  AshaAppState,
  AspirationType,
  BiomarkerKey,
  DietType,
  ExerciseVisualMode,
  PlanTypeOption
} from './types';

const ASPIRATION_LABELS: Record<AspirationType, string> = {
  build_muscle: 'Build muscle',
  fat_loss: 'Fat loss',
  weight_loss: 'Weight loss',
  improve_mobility: 'Improve mobility',
  improve_overall_health: 'Improve overall health',
  running_performance: 'Running performance',
  improve_health_indicator: 'Improve health indicator'
};

const BIOMARKER_KEYS: BiomarkerKey[] = [
  'bloodPressure',
  'restingHeartRate',
  'bloodGlucose',
  'uricAcid',
  'totalCholesterol',
  'ldl',
  'hdl',
  'triglycerides'
];

const BIOMARKER_LABELS: Record<BiomarkerKey, string> = {
  bloodPressure: 'Blood Pressure',
  restingHeartRate: 'Resting Heart Rate',
  bloodGlucose: 'Blood Glucose',
  uricAcid: 'Uric Acid',
  totalCholesterol: 'Total Cholesterol',
  ldl: 'LDL',
  hdl: 'HDL',
  triglycerides: 'Triglycerides'
};

const DIET_LABELS: Record<DietType, string> = {
  no_specific_diet: 'No specific diet',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  carnivore: 'Carnivore',
  keto: 'Keto',
  intermittent_fasting: 'Intermittent Fasting'
};

const PLAN_TYPE_LABELS: Record<PlanTypeOption, string> = {
  training_only: 'Training Plan Only',
  meal_only: 'Meal Plan Only',
  training_and_meal: 'Training + Meal Plan'
};

const VISUAL_MODE_LABELS: Record<ExerciseVisualMode, string> = {
  external_reference:
    'External reference links (e.g., DAREBEE outbound links — never copy or host third-party copyrighted images)',
  ai_illustration: 'AI-generated illustration description',
  video_reference: 'Video reference search link',
  text_only: 'Text-only step-by-step fallback'
};

export function generateEnglishMasterPrompt(state: AshaAppState): string {
  const aspirationLabel = state.goal.aspiration
    ? ASPIRATION_LABELS[state.goal.aspiration]
    : 'Not provided';

  const healthLines = BIOMARKER_KEYS.map(
    (key) => `- ${BIOMARKER_LABELS[key]}: ${state.health[key].value ?? 'Not provided'}`
  );
  if (state.health.other) {
    healthLines.push(`- Other Indicators: ${state.health.other}`);
  }

  let dietFormatted = 'Not provided (do not infer diet type)';
  if (state.nutrition.diet) {
    dietFormatted = DIET_LABELS[state.nutrition.diet];
    if (state.nutrition.diet === 'intermittent_fasting') {
      const protocol = state.nutrition.fastingProtocol ?? '16:8';
      const windowStr = state.nutrition.eatingWindow
        ? `, window: ${state.nutrition.eatingWindow}`
        : '';
      dietFormatted = `Intermittent Fasting (${protocol}${windowStr})`;
    }
  }

  const equipmentList =
    state.equipment.selected.length > 0
      ? `${state.equipment.selected.join(', ')}${
          state.equipment.fieldState === 'ai_assumption' ? ' (AI Assumption)' : ''
        }`
      : 'bodyweight (AI Assumption)';

  const answeredConditionals = state.personalization.conditionalQuestions.filter(
    (q) => q.answer && q.answer.trim().length > 0
  );

  const conditionalLines =
    answeredConditionals.length > 0
      ? answeredConditionals.map((q) => `- ${q.id}: ${q.answer}`)
      : ['- Voluntary Physiological Context: Not provided / Not required'];

  const assumptionLines =
    state.assumptions.length > 0
      ? state.assumptions.map((a) => `- ${a}`)
      : ['- None (all fields explicitly provided by user)'];

  const planType = state.planning.planType ?? 'training_and_meal';
  const integrationMode = state.planning.integrationMode ?? 'optimize_together';

  return [
    '# ASHA MASTER PROMPT (Personal Health Companion v1.7)',
    '',
    '## 1. MANDATORY OUTPUT LANGUAGE',
    'SELURUH RESPONS HARUS MENGGUNAKAN BAHASA INDONESIA.',
    'All explanations, workout guides, meal plans, safety notes, and ongoing Personal Trainer Chat replies MUST be written in warm, clear Bahasa Indonesia. English is allowed only where technically necessary (such as iCalendar syntax or technical identifiers).',
    'Jangan membuat percakapan Gemini baru. Gunakan percakapan ini sebagai Personal Trainer Chat ASHA (mulai dari rencana v1.0).',
    '',
    '## 2. USER CONTEXT',
    `- Age: ${state.personal.age ?? 'Not provided'}`,
    `- Sex: ${state.personal.sex ?? 'Not provided'}`,
    `- Ethnicity: ${state.personal.ethnicity ?? 'Not provided'} (never infer ethnicity)`,
    `- Height: ${state.personal.height !== null ? `${state.personal.height} cm` : 'Not provided'}`,
    `- Weight: ${state.personal.weight !== null ? `${state.personal.weight} kg` : 'Not provided'}`,
    '',
    '## 3. HEALTH SNAPSHOT & VERIFIED HEALTH REPORT',
    'Never fabricate or guess missing health indicator values.',
    ...healthLines,
    '',
    '## 4. GOAL, TARGET & TIMEFRAME',
    `- Aspiration: ${aspirationLabel}`,
    `- Target: ${state.goal.target ?? 'Not provided'}`,
    ...(state.goal.runningDistance ? [`- Running Distance: ${state.goal.runningDistance}`] : []),
    ...(state.goal.currentPerformance
      ? [`- Current Performance / History: ${state.goal.currentPerformance}`]
      : []),
    ...(state.goal.targetBiomarker ? [`- Target Biomarker: ${state.goal.targetBiomarker}`] : []),
    `- Timeframe: ${
      state.timeframe.durationWeeks !== null
        ? `${state.timeframe.durationWeeks} weeks (${state.timeframe.fieldState})`
        : 'Not provided'
    }`,
    '',
    '## 5. SCHEDULE, EQUIPMENT & DIET',
    `- Training Days: ${
      state.schedule.trainingDays.length > 0
        ? state.schedule.trainingDays.join(', ')
        : 'Not provided'
    }`,
    `- Session Duration: ${
      state.schedule.sessionDurationMinutes !== null
        ? `${state.schedule.sessionDurationMinutes} minutes`
        : 'Not provided'
    }`,
    `- Rest Days: ${
      state.schedule.restDays.length > 0 ? state.schedule.restDays.join(', ') : 'Not provided'
    }`,
    `- Preferred Training Time: ${state.schedule.preferredTime ?? 'Not provided'}`,
    `- Equipment: ${equipmentList}`,
    'HARD EQUIPMENT RULE: Never prescribe an exercise requiring equipment the user does not have.',
    `- Diet: ${dietFormatted}`,
    '',
    '## 6. PLAN TYPE, INTEGRATION & EXERCISE VISUAL PREFERENCES',
    `- Plan Type: ${PLAN_TYPE_LABELS[planType]}`,
    `- Integration Mode: ${integrationMode}`,
    ...(planType === 'training_and_meal' && integrationMode === 'optimize_together'
      ? [
          'INTEGRATED REQUIREMENT: Jangan menyusun rencana latihan dan rencana makan sebagai dua rencana yang berdiri sendiri. Optimalkan keduanya secara bersama-sama berdasarkan tujuan, beban latihan, waktu latihan, pemulihan, kebutuhan energi, dan pola diet pengguna.'
        ]
      : []),
    `- Exercise Visual Reference Mode: ${VISUAL_MODE_LABELS[state.planning.exerciseVisualMode]}`,
    '',
    '## 7. SEX-AWARE PERSONALIZATION',
    'Gunakan informasi jenis kelamin pengguna hanya sebagai salah satu variabel kontekstual dalam personalisasi.',
    'Jangan menggunakan jenis kelamin sebagai satu-satunya dasar untuk menentukan latihan, intensitas, kebutuhan energi, jumlah kalori, komposisi makanan, atau target kesehatan.',
    'Pertimbangkan faktor fisiologis yang relevan dengan jenis kelamin hanya jika memiliki relevansi terhadap tujuan, kondisi kesehatan, usia, aktivitas, atau kebutuhan pengguna.',
    'Untuk pengguna perempuan, pertimbangkan faktor seperti kehamilan, pascapersalinan, menyusui, siklus menstruasi, atau kesehatan tulang hanya jika informasi tersebut tersedia atau relevan. Jangan mengasumsikan kondisi tersebut.',
    'Untuk pengguna laki-laki, pertimbangkan faktor fisiologis yang relevan hanya apabila didukung oleh informasi pengguna dan relevan terhadap perencanaan.',
    'Jangan membuat stereotip seperti:',
    '- laki-laki harus menggunakan latihan lebih berat;',
    '- perempuan harus menggunakan latihan lebih ringan;',
    '- laki-laki membutuhkan diet tertentu;',
    '- perempuan membutuhkan pembatasan kalori tertentu.',
    'Dasarkan rencana terutama pada:',
    '1. tujuan pengguna; 2. kondisi kesehatan; 3. usia; 4. ukuran tubuh; 5. tingkat kebugaran; 6. pengalaman latihan; 7. jadwal; 8. peralatan; 9. beban latihan; 10. pemulihan; 11. faktor fisiologis yang relevan.',
    'Jika informasi penting tidak tersedia, jangan mengarang.',
    ...conditionalLines,
    '',
    '## AI ASSUMPTIONS',
    'Explicitly disclose the following assumptions in your Bahasa Indonesia response:',
    ...assumptionLines,
    '',
    '## 9. TRAINING, NUTRITION, RECOVERY & SAFETY REQUIREMENTS',
    '- For each training session include: date/day, session type, duration, objective, warm-up, exercises (with starting position, step-by-step instructions, breathing, sets/reps/time, intensity/RPE, rest, common mistakes, safety cues, modification, progression, and visual reference), and cool-down.',
    '- For meal planning include: daily meals, food choices, portion guidance, estimated energy, protein, carbohydrates, fats, fiber, hydration, meal timing, and diet compatibility.',
    '- Include recovery habits, monitoring indicators, and clear safety disclaimers (ASHA is educational, not a medical diagnosis or prescription; distinguish personal targets from medical targets).',
    '',
    '## 10. QUALITY CONTROL CHECKLIST',
    '☐ Sex used contextually',
    '☐ No sex stereotype',
    '☐ Relevant physiological factors considered',
    '☐ Unknown physiological states not invented',
    '☐ Training matches goal',
    '☐ Nutrition matches goal',
    '☐ Equipment respected',
    '☐ Diet respected',
    '☐ Safety included',
    '☐ Assumptions disclosed',
    '☐ Bahasa Indonesia used'
  ].join('\n');
}
