import { AshaAppState } from './types';

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

export function buildTrainingCalendarIcs(state: AshaAppState): string {
  const days =
    state.schedule.trainingDays.length > 0
      ? state.schedule.trainingDays
      : ['Monday', 'Wednesday', 'Friday'];
  const duration = state.schedule.sessionDurationMinutes ?? 45;
  const preferredTime = state.schedule.preferredTime ?? '07:00';
  const reminderMinutes = state.planning.reminderMinutesBefore ?? 30;
  const latestReply = getLatestAssistantReply(state);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ASHA//Personal Health Companion v1.7//ID',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:My Training Plan'
  ];

  days.forEach((day, index) => {
    const dayRegex = new RegExp(`(?:Latihan\\s+Hari\\s+${day}|${day})\\s*[:=-]\\s*([^\\r\\n]+)`, 'i');
    const enrichedMatch = latestReply.match(dayRegex);
    const summaryDetail = enrichedMatch
      ? enrichedMatch[1].trim()
      : `ASHA Training Session (${day}, ${duration} min)`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:asha-training-${index + 1}@asha.local`,
      'DTSTART:20261005T070000',
      `SUMMARY:${escapeIcsText(summaryDetail)}`,
      `DESCRIPTION:${escapeIcsText(
        `Day: ${day} at ${preferredTime} (${duration} minutes). Equipment: ${
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

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function buildDietCalendarIcs(state: AshaAppState): string {
  const diet = state.nutrition.diet ?? 'no_specific_diet';
  const windowInfo = state.nutrition.eatingWindow
    ? `Eating Window: ${state.nutrition.eatingWindow}`
    : `Diet Preference: ${diet}`;
  const reminderMinutes = state.planning.reminderMinutesBefore ?? 30;
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
    'X-WR-CALNAME:My Diet Plan',
    'BEGIN:VEVENT',
    'UID:asha-diet-1@asha.local',
    'DTSTART:20261005T120000',
    `SUMMARY:${escapeIcsText(mealSummary)}`,
    `DESCRIPTION:${escapeIcsText(windowInfo)}`,
    'BEGIN:VALARM',
    `TRIGGER:-PT${reminderMinutes}M`,
    'ACTION:DISPLAY',
    'DESCRIPTION:ASHA Nutrition Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  return lines.join('\r\n');
}

export function buildContextSnapshotMarkdown(
  state: AshaAppState,
  masterPrompt: string
): string {
  const assumptionLines =
    state.assumptions.length > 0
      ? state.assumptions.map((a) => `- ${a}`)
      : ['- None (all fields explicitly provided)'];

  const transcriptLines =
    state.chat.turns.length > 0
      ? state.chat.turns.map(
          (turn) =>
            `### ${turn.role === 'assistant' ? `ASHA (${turn.planVersion ?? state.chat.currentVersion})` : 'User'}\n\n${turn.content}`
        )
      : ['_No Personal Trainer Chat messages recorded in this session._'];

  return [
    '# ASHA Context Snapshot',
    '',
    '## Verified Personal & Goal Context',
    `- Age: ${state.personal.age ?? 'Not provided'}`,
    `- Sex: ${state.personal.sex ?? 'Not provided'}`,
    `- Height: ${state.personal.height !== null ? `${state.personal.height} cm` : 'Not provided'}`,
    `- Weight: ${state.personal.weight !== null ? `${state.personal.weight} kg` : 'Not provided'}`,
    `- Aspiration: ${state.goal.aspiration ?? 'Not provided'}`,
    `- Target: ${state.goal.target ?? 'Not provided'}`,
    '',
    '## AI Assumptions',
    ...assumptionLines,
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
