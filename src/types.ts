export type Language = 'id' | 'en';

export type SexSelection = 'male' | 'female' | 'unspecified';

export type VisualPersonaType = 'male_active' | 'female_active' | 'neutral';

export type FieldState =
  | 'provided'
  | 'missing'
  | 'ai_assumption'
  | 'not_applicable'
  | 'requires_confirmation';

export type ExtractionConfidence =
  | 'High confidence'
  | 'Review recommended'
  | 'Unable to determine';

export type AspirationType =
  | 'build_muscle'
  | 'fat_loss'
  | 'weight_loss'
  | 'improve_mobility'
  | 'improve_overall_health'
  | 'running_performance'
  | 'improve_health_indicator';

export type RunningDistance = '5K' | '10K' | 'half_marathon' | 'full_marathon';

export type BiomarkerKey =
  | 'bloodPressure'
  | 'restingHeartRate'
  | 'bloodGlucose'
  | 'uricAcid'
  | 'totalCholesterol'
  | 'ldl'
  | 'hdl'
  | 'triglycerides';

export const BIOMARKER_KEYS: BiomarkerKey[] = [
  'bloodPressure',
  'restingHeartRate',
  'bloodGlucose',
  'uricAcid',
  'totalCholesterol',
  'ldl',
  'hdl',
  'triglycerides'
];

export const BIOMARKER_LABELS: Record<BiomarkerKey, string> = {
  bloodPressure: 'Blood Pressure',
  restingHeartRate: 'Resting Heart Rate',
  bloodGlucose: 'Blood Glucose',
  uricAcid: 'Uric Acid',
  totalCholesterol: 'Total Cholesterol',
  ldl: 'LDL',
  hdl: 'HDL',
  triglycerides: 'Triglycerides'
};

export interface PersonalInfo {
  age: number | null;
  sex: SexSelection | null;
  ethnicity: string | null;
  height: number | null;
  weight: number | null;
}

export interface HealthIndicatorEntry {
  value: string | null;
  fieldState: FieldState;
  confidence?: ExtractionConfidence;
}

export type HealthSnapshot = Record<BiomarkerKey, HealthIndicatorEntry> & {
  other: string | null;
};

export interface ExtractedBiomarker {
  key: BiomarkerKey;
  rawText: string;
  normalizedValue: string | null;
  confidence: ExtractionConfidence;
  fieldState: FieldState;
}

export interface HealthReportState {
  fileName: string | null;
  rawText: string | null;
  extracted: Record<BiomarkerKey, ExtractedBiomarker | null>;
  confirmed: boolean;
}

export const ETHNICITY_OPTIONS = [
  'Asian',
  'Kaukasian',
  'American',
  'Latin',
  'Indian',
  'Other'
] as const;

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const;

export type CalendarProvider = 'google' | 'outlook' | 'apple';

export interface GoalState {
  aspiration: AspirationType | null;
  target: string | null;
  muscleMassPercent?: number | null;
  fatPercent?: number | null;
  targetWeightKg?: number | null;
  runningDistance?: RunningDistance | null;
  targetPace?: string | null;
  currentPerformance?: string | null;
  targetBiomarker?: BiomarkerKey | 'other' | null;
  targetBiomarkerValue?: string | null;
}

export interface TimeframeState {
  durationWeeks: number | null;
  fieldState: FieldState;
}

export interface ScheduleState {
  trainingDays: string[];
  sessionDurationMinutes: number | null;
  restDays: string[];
  preferredTime: string | null;
  fieldStates: {
    trainingDays: FieldState;
    sessionDurationMinutes: FieldState;
    restDays: FieldState;
    preferredTime: FieldState;
  };
}

export type EquipmentItem = 'bodyweight' | 'dumbbells' | 'barbell' | 'fitness_ball';

export interface EquipmentState {
  selected: EquipmentItem[];
  fieldState: FieldState;
}

export type DietType =
  | 'no_specific_diet'
  | 'vegan'
  | 'vegetarian'
  | 'carnivore'
  | 'keto'
  | 'intermittent_fasting';

export type FastingProtocol = '12:12' | '14:10' | '16:8' | '18:6' | 'custom';

export interface NutritionState {
  diet: DietType | null;
  fastingProtocol: FastingProtocol | null;
  eatingWindow: string | null;
}

export type PlanTypeOption = 'training_only' | 'meal_only' | 'training_and_meal';

export type IntegrationModeOption = 'independent' | 'optimize_together';

export type ExerciseVisualMode =
  | 'external_reference'
  | 'ai_illustration'
  | 'video_reference'
  | 'text_only';

export interface PlanningState {
  planType: PlanTypeOption | null;
  integrationMode: IntegrationModeOption | null;
  exerciseVisualMode: ExerciseVisualMode;
  reminderMinutesBefore: number;
  calendarProvider?: CalendarProvider;
  startDate?: string | null;
}

export interface ExerciseGuideState {
  visualMode: ExerciseVisualMode;
}

export interface CalendarState {
  reminderMinutesBefore: number;
  previewOpen: boolean;
  provider?: CalendarProvider;
  startDate?: string | null;
}

export interface ConditionalQuestionItem {
  id:
    | 'pregnancy'
    | 'postpartum'
    | 'breastfeeding'
    | 'menstrual_cycle'
    | 'bone_health';
  questionEn: string;
  questionId: string;
  answer: string | null;
}

export interface PersonalizationState {
  visualPersona: VisualPersonaType;
  sexSpecificFactors: string[];
  trainingConsiderations: string[];
  nutritionConsiderations: string[];
  conditionalQuestions: ConditionalQuestionItem[];
  confirmed: boolean;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  planVersion?: string;
  requiresReplacementConfirmation?: boolean;
}

export interface ChatState {
  active: boolean;
  loading: boolean;
  loadingMessage: string | null;
  currentVersion: string;
  pendingReplacementContent: string | null;
  turns: ChatTurn[];
  error: string | null;
}

export interface AshaAppState {
  ui: {
    language: Language;
    currentStep: number;
    showMasterPrompt: boolean;
    showCalendarPreview: boolean;
  };
  personal: PersonalInfo;
  health: HealthSnapshot;
  healthReport: HealthReportState;
  goal: GoalState;
  timeframe: TimeframeState;
  schedule: ScheduleState;
  equipment: EquipmentState;
  nutrition: NutritionState;
  planning: PlanningState;
  exerciseGuide: ExerciseGuideState;
  calendar: CalendarState;
  personalization: PersonalizationState;
  assumptions: string[];
  confirmation: {
    confirmed: boolean;
  };
  chat: ChatState;
}

export interface OcrExtractionResult {
  rawText: string;
  confidenceScore?: number;
}

export type OcrAdapter = (file: File | Blob | string) => Promise<OcrExtractionResult>;

export interface GeminiProxyResponse {
  ok: boolean;
  text?: string;
  error?: string;
  remainingQuota?: number;
  planVersion?: string;
  isMajorRevision?: boolean;
}

export type GeminiBridgeAdapter = (payload: {
  masterPrompt: string;
  history: ChatTurn[];
  userMessage?: string;
}) => Promise<GeminiProxyResponse>;
