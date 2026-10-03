import {
  AshaAppState,
  AspirationType,
  BIOMARKER_KEYS,
  BIOMARKER_LABELS,
  CalendarProvider,
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

const CALENDAR_PROVIDER_LABELS: Record<CalendarProvider, string> = {
  google: 'Google Calendar',
  outlook: 'Outlook Calendar',
  apple: 'Apple Calendar'
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
  const calendarProvider = state.planning.calendarProvider ?? 'google';
  const calendarLabel = CALENDAR_PROVIDER_LABELS[calendarProvider];
  const durationWeeks = state.timeframe.durationWeeks ?? 8;

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
    ...(state.goal.muscleMassPercent !== null && state.goal.muscleMassPercent !== undefined
      ? [`- Target Muscle Mass: ${state.goal.muscleMassPercent}% of body weight`]
      : []),
    ...(state.goal.fatPercent !== null && state.goal.fatPercent !== undefined
      ? [`- Target Body Fat Percentage: ${state.goal.fatPercent}% of body weight`]
      : []),
    ...(state.goal.targetWeightKg !== null && state.goal.targetWeightKg !== undefined
      ? [`- Target Weight: ${state.goal.targetWeightKg} Kg`]
      : []),
    ...(state.goal.runningDistance ? [`- Running Distance: ${state.goal.runningDistance}`] : []),
    ...(state.goal.targetPace ? [`- Target Pace: ${state.goal.targetPace}`] : []),
    ...(state.goal.currentPerformance
      ? [`- Current Performance / History: ${state.goal.currentPerformance}`]
      : []),
    ...(state.goal.targetBiomarker ? [`- Target Biomarker: ${state.goal.targetBiomarker}`] : []),
    ...(state.goal.targetBiomarkerValue
      ? [`- Target Biomarker Value: ${state.goal.targetBiomarkerValue}`]
      : []),
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
    '## 6. PLAN TYPE, INTEGRATION, START DATE, CALENDAR PLATFORM & EXERCISE VISUAL PREFERENCES',
    `- Plan Type: ${PLAN_TYPE_LABELS[planType]}`,
    `- Integration Mode: ${integrationMode}`,
    ...(planType === 'training_and_meal' && integrationMode === 'optimize_together'
      ? [
          'INTEGRATED REQUIREMENT: Jangan menyusun rencana latihan dan rencana makan sebagai dua rencana yang berdiri sendiri. Optimalkan keduanya secara bersama-sama berdasarkan tujuan, beban latihan, waktu latihan, pemulihan, kebutuhan energi, dan pola diet pengguna.'
        ]
      : []),
    `- Plan Start Date: ${
      state.planning.startDate ?? 'Not provided (use upcoming Monday or current date)'
    }`,
    `- Exercise Visual Reference Mode: ${VISUAL_MODE_LABELS[state.planning.exerciseVisualMode]}`,
    `- Target Calendar Platform: ${calendarLabel} (Reminder: ${state.planning.reminderMinutesBefore} minutes before event)`,
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
    '## 9. DAILY DETAILED PLAN, EXERCISE MOVEMENT GUIDE & GENERATIVE AI .ICS CALENDAR REQUIREMENTS',
    `- Sajikan Training Plan dan Meal Plan dalam bentuk TERINCI SETIAP HARINYA (day-by-day schedule) dimulai dari tanggal mulai (${
      state.planning.startDate ?? 'hari pertama rencana'
    }) selama seluruh periode pencapaian target pengguna (${durationWeeks} minggu penuh / Hari ke-1 hingga Hari ke-${durationWeeks * 7}).`,
    '- PANDUAN DETAIL GERAKAN LATIHAN (WAJIB): Selain menyajikan training plan harian, berikan juga informasi lengkap untuk setiap gerakan yang diberikan meliputi:',
    '  1. Nama Gerakan;',
    '  2. Fungsi (manfaat gerakan bagi kebugaran/tujuan pengguna);',
    '  3. Otot yang dilatih (otot utama dan otot pendukung);',
    '  4. Repetisi, jumlah set, tempo, dan waktu istirahat antar set;',
    '  5. Cara melakukan gerakan langkah demi langkah (posisi awal, pelaksanaan gerakan, pola pernapasan, kesalahan umum yang harus dihindari, dan tips keamanan);',
    '  6. Contoh (gambar gerakan): Ambil dan sertakan contoh gambar gerakan / tautan ilustrasi visual langsung dari situs referensi latihan terpercaya seperti https://darebee.com (misalnya pustaka gerakan DAREBEE Video/Illustrated Exercise Library di `https://darebee.com/exercises/` atau workout visual card DAREBEE yang relevan) agar pengguna dapat melihat contoh visual gerakan secara jelas.',
    '- For each daily meal plan include: daily meals for every single day across the target period, food choices, portion guidance, estimated energy, protein, carbohydrates, fats, fiber, hydration, meal timing, and diet compatibility.',
    `- GENERATIVE AI CALENDAR (.ICS) OUTPUT: Kalender (.ics) dihasilkan langsung oleh Generative AI setelah prompt ini dimasukkan ke chat interface. Sediakan blok kode file kalender (.ics) standar RFC 5545 yang kompatibel penuh dengan ${calendarLabel} (dimulai pada tanggal ${
      state.planning.startDate ?? 'mulai rencana'
    }, lengkap dengan VALARM pengingat ${state.planning.reminderMinutesBefore} menit sebelum jadwal) untuk seluruh jadwal latihan dan makan harian selama ${durationWeeks} minggu.`,
    '- Include recovery habits, monitoring indicators, and clear safety disclaimers (ASHA is educational, not a medical diagnosis or prescription; distinguish personal targets from medical targets).',
    '',
    '## 10. QUALITY CONTROL CHECKLIST',
    '☐ Sex used contextually',
    '☐ No sex stereotype',
    '☐ Relevant physiological factors considered',
    '☐ Unknown physiological states not invented',
    '☐ Detailed day-by-day Training & Meal Plan covers full target timeframe',
    '☐ Detailed exercise guide included (fungsi/manfaat gerakan, otot yang dilatih, repetisi, cara melakukan gerakan, contoh/gambar gerakan dari darebee.com)',
    '☐ Generative AI outputs valid .ics calendar blocks for selected calendar platform',
    '☐ Equipment respected',
    '☐ Diet respected',
    '☐ Safety included',
    '☐ Assumptions disclosed',
    '☐ Bahasa Indonesia used'
  ].join('\n');
}
