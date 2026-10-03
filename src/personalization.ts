import { AshaAppState, BIOMARKER_KEYS, ConditionalQuestionItem } from './types';

export function applyAssumptionsAndPersonalization(state: AshaAppState): void {
  const assumptions: string[] = [];

  // 1. Equipment fallback (Hard rule: default to bodyweight with explicit notice)
  if (state.equipment.selected.length === 0 || state.equipment.fieldState === 'ai_assumption') {
    state.equipment.selected = ['bodyweight'];
    state.equipment.fieldState = 'ai_assumption';
    assumptions.push(
      'No equipment selected by user; defaulting to bodyweight only (no external equipment required).'
    );
  }

  // 2. Timeframe conservative assumption
  if (state.timeframe.durationWeeks === null || state.timeframe.fieldState === 'ai_assumption') {
    state.timeframe.durationWeeks = 8;
    state.timeframe.fieldState = 'ai_assumption';
    assumptions.push('Timeframe not specified; assuming a conservative 8-week progression.');
  }

  // 3. Schedule conservative assumptions
  if (
    state.schedule.trainingDays.length === 0 ||
    state.schedule.fieldStates.trainingDays === 'ai_assumption'
  ) {
    state.schedule.trainingDays = ['Monday', 'Wednesday', 'Friday'];
    state.schedule.fieldStates.trainingDays = 'ai_assumption';
    assumptions.push(
      'Training days not specified; assuming 3 non-consecutive days per week (Monday, Wednesday, Friday).'
    );
  }

  if (
    state.schedule.sessionDurationMinutes === null ||
    state.schedule.fieldStates.sessionDurationMinutes === 'ai_assumption'
  ) {
    state.schedule.sessionDurationMinutes = 45;
    state.schedule.fieldStates.sessionDurationMinutes = 'ai_assumption';
    assumptions.push(
      'Session duration not specified; assuming 45 minutes per session including warm-up and cool-down.'
    );
  }

  if (
    state.schedule.restDays.length === 0 ||
    state.schedule.fieldStates.restDays === 'ai_assumption'
  ) {
    state.schedule.restDays = ['Tuesday', 'Thursday', 'Saturday', 'Sunday'];
    state.schedule.fieldStates.restDays = 'ai_assumption';
    assumptions.push(
      'Rest days not specified; assuming 4 recovery/rest days per week (Tuesday, Thursday, Saturday, Sunday).'
    );
  }

  if (
    !state.schedule.preferredTime ||
    state.schedule.fieldStates.preferredTime === 'ai_assumption'
  ) {
    state.schedule.preferredTime = '07:00';
    state.schedule.fieldStates.preferredTime = 'ai_assumption';
    assumptions.push('Preferred training time not specified; assuming morning session at 07:00.');
  }

  state.assumptions = assumptions;

  // 4. Sex-Aware Context & Conditional Questions (strictly separate from Visual Persona)
  // Triggered only when sex AND specific Aspiration or Health Snapshot context make them materially relevant.
  const sex = state.personal.sex;
  const planType = state.planning.planType ?? 'training_and_meal';
  const hasTraining = planType === 'training_only' || planType === 'training_and_meal';
  const hasMeal = planType === 'meal_only' || planType === 'training_and_meal';
  const hasHealthData =
    Boolean(state.health.other) ||
    BIOMARKER_KEYS.some((k) => state.health[k].fieldState === 'provided');
  const hasRelevantPlanningContext = Boolean(state.goal.aspiration || hasHealthData);

  const existingAnswers = new Map<string, string | null>(
    state.personalization.conditionalQuestions.map((q) => [q.id, q.answer])
  );

  if (sex === 'female' && hasRelevantPlanningContext) {
    state.personalization.sexSpecificFactors = [
      'Consider contextual body-composition, iron, and calcium/vitamin D needs only when relevant to goal and health data.',
      'Do not apply sex-based calorie restriction or lighter training stereotypes.'
    ];

    state.personalization.trainingConsiderations = hasTraining
      ? [
          'Consider recovery, bone-health stimulus, and voluntarily provided cycle/pregnancy/postpartum context without assuming lighter load.'
        ]
      : [];

    state.personalization.nutritionConsiderations = hasMeal
      ? [
          'Integrate energy, protein, iron, and bone-supporting micronutrients with training load and recovery without restrictive stereotyping.'
        ]
      : [];

    const candidates: Omit<ConditionalQuestionItem, 'answer'>[] = [];
    const age = state.personal.age ?? 30;

    if (age >= 18 && age <= 50) {
      candidates.push(
        {
          id: 'pregnancy',
          questionEn: 'Are you currently pregnant? (Optional — only if relevant to your plan)',
          questionId:
            'Apakah Anda sedang hamil saat ini? (Opsional — hanya jika relevan dengan rencana Anda)'
        },
        {
          id: 'postpartum',
          questionEn: 'Are you in the postpartum period? (Optional)',
          questionId: 'Apakah Anda sedang dalam masa pascapersalinan? (Opsional)'
        },
        {
          id: 'breastfeeding',
          questionEn: 'Are you currently breastfeeding? (Optional)',
          questionId: 'Apakah Anda sedang menyusui? (Opsional)'
        },
        {
          id: 'menstrual_cycle',
          questionEn:
            'Are there menstrual-cycle considerations you want training/nutrition to account for? (Optional)',
          questionId:
            'Apakah ada pertimbangan siklus menstruasi yang ingin diperhitungkan dalam latihan/nutrisi? (Opsional)'
        }
      );
    }

    if (
      age >= 40 ||
      state.goal.aspiration === 'build_muscle' ||
      state.goal.aspiration === 'improve_mobility' ||
      state.goal.aspiration === 'running_performance'
    ) {
      candidates.push({
        id: 'bone_health',
        questionEn: 'Do you have any bone-health considerations? (Optional)',
        questionId: 'Apakah ada pertimbangan kesehatan tulang yang relevan? (Opsional)'
      });
    }

    state.personalization.conditionalQuestions = candidates.map((c) => ({
      ...c,
      answer: existingAnswers.get(c.id) ?? null
    }));
  } else if (sex === 'male' && hasRelevantPlanningContext) {
    state.personalization.sexSpecificFactors = [
      'Consider male physiological context only when supported by user health data and goals; do not assume heavier load or specific diet stereotypes.'
    ];
    state.personalization.trainingConsiderations = hasTraining
      ? [
          'Match load and volume to actual fitness level, recovery, and equipment rather than sex stereotypes.'
        ]
      : [];
    state.personalization.nutritionConsiderations = hasMeal
      ? [
          'Align energy, protein, and fiber targets with body measurements, activity, and health indicators.'
        ]
      : [];
    state.personalization.conditionalQuestions = [];
  } else {
    state.personalization.sexSpecificFactors = [];
    state.personalization.trainingConsiderations = [];
    state.personalization.nutritionConsiderations = [];
    state.personalization.conditionalQuestions = [];
  }
}
