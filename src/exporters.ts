import { AshaAppState, BIOMARKER_KEYS, BIOMARKER_LABELS } from './types';

function escapeIcsText(text: string): string {
  return text.replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function getLatestAssistantReply(state: AshaAppState): string {
  for (let i = state.chat.turns.length - 1; i >= 0; i--) {
    if (state.chat.turns[i].role === 'assistant') {
      return state.chat.turns[i].content;
    }
  }
  return '';
}

const DAY_INDEX_MAP: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6
};

function resolveBaseMondayDate(startDateStr?: string | null): Date {
  if (startDateStr && /^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
    const [y, m, d] = startDateStr.split('-').map((n) => parseInt(n, 10));
    return new Date(Date.UTC(y, m - 1, d));
  }
  return new Date(Date.UTC(2026, 9, 5)); // 2026-10-05
}

function formatUtcDateToken(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function addUtcDays(base: Date, daysToAdd: number): Date {
  const copy = new Date(base.getTime());
  copy.setUTCDate(copy.getUTCDate() + daysToAdd);
  return copy;
}

function formatTimeToken(timeStr: string | null, fallback = '070000'): string {
  if (!timeStr) return fallback;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const hh = match[1].padStart(2, '0');
  const mm = match[2];
  return `${hh}${mm}00`;
}

export function buildTrainingCalendarIcs(state: AshaAppState): string {
  const days =
    state.schedule.trainingDays.length > 0
      ? state.schedule.trainingDays
      : ['Monday', 'Wednesday', 'Friday'];
  const duration = state.schedule.sessionDurationMinutes ?? 45;
  const preferredTime = state.schedule.preferredTime ?? '07:00';
  const timeToken = formatTimeToken(preferredTime, '070000');
  const reminderMinutes = state.planning.reminderMinutesBefore ?? 30;
  const weeks = Math.max(1, state.timeframe.durationWeeks ?? 1);
  const baseDate = resolveBaseMondayDate(state.planning.startDate);
  const latestReply = getLatestAssistantReply(state);
  const trainingTypesStr =
    state.schedule.trainingTypes && state.schedule.trainingTypes.length > 0
      ? state.schedule.trainingTypes.join(', ')
      : 'General Fitness';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ASHA//Personal Health Companion v1.7//ID',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:My Training Plan'
  ];

  let eventCounter = 1;
  for (let week = 0; week < weeks; week++) {
    days.forEach((day, index) => {
      const dayOffset = DAY_INDEX_MAP[day] ?? index;
      const eventDate = addUtcDays(baseDate, week * 7 + dayOffset);
      const dateToken = formatUtcDateToken(eventDate);

      const dayRegex = new RegExp(
        `(?:Latihan\\s+Hari\\s+${day}|${day})\\s*[:=-]\\s*([^\\r\\n]+)`,
        'i'
      );
      const enrichedMatch = latestReply.match(dayRegex);
      const summaryDetail = enrichedMatch
        ? enrichedMatch[1].trim()
        : `ASHA Training Session — Week ${week + 1} (${day}, ${duration} min)`;

      lines.push(
        'BEGIN:VEVENT',
        `UID:asha-training-${eventCounter++}@asha.local`,
        `DTSTART:${dateToken}T${timeToken}`,
        `SUMMARY:${escapeIcsText(summaryDetail)}`,
        `DESCRIPTION:${escapeIcsText(
          `Day: ${day} at ${preferredTime} (${duration} minutes). Types: ${trainingTypesStr}. Equipment: ${
            state.equipment.selected.join(', ') || 'bodyweight'
          }.`
        )}`,
        'BEGIN:VALARM',
        `TRIGGER:-PT${reminderMinutes}M`,
        'ACTION:DISPLAY',
        'DESCRIPTION:ASHA Training Reminder',
        'END:VALARM',
        'END:VEVENT'
      );
    });
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function buildDietCalendarIcs(state: AshaAppState): string {
  const diet = state.nutrition.diet ?? 'no_specific_diet';
  const windowInfo = state.nutrition.eatingWindow
    ? `Eating Window: ${state.nutrition.eatingWindow} (${state.nutrition.fastingProtocol ?? '16:8'})`
    : `Diet Preference: ${diet}`;
  const timeToken = formatTimeToken(state.nutrition.eatingWindow, '120000');
  const reminderMinutes = state.planning.reminderMinutesBefore ?? 30;
  const weeks = Math.max(1, state.timeframe.durationWeeks ?? 1);
  const baseDate = resolveBaseMondayDate(state.planning.startDate);
  const latestReply = getLatestAssistantReply(state);

  const mealMatch = latestReply.match(/(?:Menu\s+Sarapan|Makan\s+Pagi|Meal)\s*[:=-]\s*([^\r\n]+)/i);
  const mealSummary = mealMatch
    ? `ASHA Meal Plan — ${mealMatch[1].trim()}`
    : `ASHA Daily Nutrition (${diet})`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ASHA//Personal Health Companion v1.7//ID',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:My Diet Plan'
  ];

  const totalDays = weeks * 7;
  for (let d = 0; d < totalDays; d++) {
    const eventDate = addUtcDays(baseDate, d);
    const dateToken = formatUtcDateToken(eventDate);
    lines.push(
      'BEGIN:VEVENT',
      `UID:asha-diet-${d + 1}@asha.local`,
      `DTSTART:${dateToken}T${timeToken}`,
      `SUMMARY:${escapeIcsText(mealSummary)}`,
      `DESCRIPTION:${escapeIcsText(windowInfo)}`,
      'BEGIN:VALARM',
      `TRIGGER:-PT${reminderMinutes}M`,
      'ACTION:DISPLAY',
      'DESCRIPTION:ASHA Nutrition Reminder',
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function buildContextSnapshotMarkdown(
  state: AshaAppState,
  masterPrompt: string
): string {
  const healthLines = BIOMARKER_KEYS.map(
    (k) => `- ${BIOMARKER_LABELS[k]}: ${state.health[k].value ?? 'Not provided'}`
  );
  if (state.health.other) {
    healthLines.push(`- Other Indicators: ${state.health.other}`);
  }

  const assumptionLines =
    state.assumptions.length > 0
      ? state.assumptions.map((a) => `- ${a}`)
      : ['- None (all fields explicitly provided)'];

  const transcriptLines =
    state.chat.turns.length > 0
      ? state.chat.turns.map(
          (turn) =>
            `### ${
              turn.role === 'assistant'
                ? `ASHA (${turn.planVersion ?? state.chat.currentVersion})`
                : 'User'
            }\n\n${turn.content}`
        )
      : ['_No Personal Trainer Chat messages recorded in this session._'];

  return [
    '# ASHA Context Snapshot',
    '',
    '## Verified Personal & Goal Context',
    `- Preferred Name / Nickname: ${state.personal.nickname ?? 'Not provided'}`,
    `- Age: ${state.personal.age ?? 'Not provided'}`,
    `- Sex: ${state.personal.sex ?? 'Not provided'}`,
    `- Ethnicity: ${state.personal.ethnicity ?? 'Not provided'}`,
    `- Height: ${state.personal.height !== null ? `${state.personal.height} cm` : 'Not provided'}`,
    `- Weight: ${state.personal.weight !== null ? `${state.personal.weight} kg` : 'Not provided'}`,
    `- Aspiration: ${state.goal.aspiration ?? 'Not provided'}`,
    `- Target: ${state.goal.target ?? 'Not provided'}`,
    `- Timeframe: ${
      state.timeframe.durationWeeks !== null ? `${state.timeframe.durationWeeks} weeks` : 'Not provided'
    }`,
    `- Training Days: ${state.schedule.trainingDays.join(', ') || 'Not provided'}`,
    `- Training Types: ${(state.schedule.trainingTypes ?? []).join(', ') || 'Not provided'}`,
    `- Session Duration: ${
      state.schedule.sessionDurationMinutes !== null
        ? `${state.schedule.sessionDurationMinutes} minutes`
        : 'Not provided'
    }`,
    `- Rest Days: ${state.schedule.restDays.join(', ') || 'Not provided'}`,
    `- Preferred Time: ${state.schedule.preferredTime ?? 'Not provided'}`,
    `- Equipment: ${state.equipment.selected.join(', ') || 'bodyweight'}`,
    `- Diet: ${state.nutrition.diet ?? 'Not provided'}`,
    `- Plan Type: ${state.planning.planType ?? 'training_and_meal'} (${
      state.planning.integrationMode ?? 'optimize_together'
    })`,
    `- Plan Start Date: ${state.planning.startDate ?? 'Not provided'}`,
    `- Calendar Platform: ${state.planning.calendarProvider ?? 'google'}`,
    '',
    '## Health Snapshot & Confirmed Health Report',
    ...healthLines,
    '',
    '## AI Assumptions',
    ...assumptionLines,
    '',
    '## Safety Disclaimer',
    '- Educational health planning companion only; not a medical diagnosis, prescription, or emergency service.',
    '',
    '## Master Prompt',
    '```markdown',
    masterPrompt,
    '```',
    '',
    `## Personal Trainer Chat Transcript (${state.chat.currentVersion})`,
    ...transcriptLines
  ].join('\n');
}
