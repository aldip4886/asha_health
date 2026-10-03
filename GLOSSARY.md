# ASHA — Personal Health Companion

ASHA is a privacy-first personal health planning companion built around the cycle **Aspiration → Strategy → Habit → Adaptation**. It collects a user's personal and physiological context, discloses assumptions, and partners with an AI health companion to produce and adapt structured training and nutrition plans.

## Core Framework & User Context

**Aspiration**:
The high-level health or fitness outcome a user wants to achieve (build muscle, fat loss, weight loss, improve mobility, improve overall health, running performance, or improve health indicator).
_Avoid_: Objective, wish, dream

**Target**:
The specific, measurable milestone paired with an Aspiration (such as a 5K finish time, a target body weight, or a clinical reference range for a health indicator).
_Avoid_: Goal metric, KPI, quota

**Health Snapshot**:
The collection of self-reported clinical or physiological indicators provided by the user (blood pressure, resting heart rate, blood glucose, uric acid, total cholesterol, LDL, HDL, triglycerides).
_Avoid_: Medical record, EHR, patient chart, diagnosis

**Health Report**:
An uploaded image or document of laboratory or clinical test results from which indicator values are extracted and normalized, requiring explicit user verification before becoming authoritative.
_Avoid_: Lab scan, medical attachment

**Extraction Confidence**:
The trustworthiness rating assigned to an indicator value extracted from a Health Report (`High confidence`, `Review recommended`, or `Unable to determine`).
_Avoid_: Accuracy score, OCR probability

**Field State**:
The provenance status of any user context field (`provided`, `missing`, `ai_assumption`, `not_applicable`, or `requires_confirmation`).
_Avoid_: Validation state, input flag

**AI Assumption**:
A conservative default proposed when non-critical planning context is omitted by the user, which must always be explicitly disclosed before plan generation.
_Avoid_: Inferred value, silent default, fabricated value

## Personalization & Safety

**Visual Persona**:
The decorative active-companion background figure selected solely from the user's stated sex (`female_active` for male users, `male_active` for female users, `neutral` for unspecified), representing a welcoming health companion rather than the user's body.
_Avoid_: Avatar, body goal, transformation model

**Sex-Aware Context**:
Relevant physiological considerations linked to the user's stated sex (such as bone health, iron needs, or voluntarily disclosed pregnancy, postpartum, lactation, or menstrual-cycle context) used as one contextual variable without stereotyping training intensity or calorie restriction.
_Avoid_: Gender profile, gender-based rules, biological preset

**Conditional Question**:
A follow-up physiological question asked only when the combination of sex, Aspiration, Health Snapshot, and Plan Type makes the answer materially relevant to the plan.
_Avoid_: Demographic questionnaire, mandatory screening

## Planning, Handoff & Execution

**Plan Type**:
The scope of planning requested by the user: `Training Plan Only`, `Meal Plan Only`, or `Training + Meal Plan`.
_Avoid_: Package, subscription tier

**Integration Mode**:
The coordination strategy when `Training + Meal Plan` is selected: either `Independent` or `Optimize Together` (aligning energy intake, macronutrients, and meal timing with training load and recovery).
_Avoid_: Sync mode, combined mode

**Training Type**:
The exercise modality categories selected by the user (`Cardio`, `Strength`, or `Mobility & Flexibility`) that shape the structure of the prescribed workout sessions.
_Avoid_: Workout genre, sport class

**Master Prompt**:
The structured English instruction document assembled from verified user context, disclosed AI Assumptions, Sex-Aware Context, and safety rules that is copied to the user's clipboard upon confirmation and instructs the chosen AI companion to generate a day-by-day plan, detailed exercise movement guide (with external visual references such as DAREBEE), and `.ics` calendar blocks in Bahasa Indonesia.
_Avoid_: System query, payload

**Personal Trainer Chat**:
The ongoing Bahasa Indonesia conversation with the AI companion (ChatGPT, Gemini, Claude, Grok, or Copilot) primed by the user's verified Master Prompt, serving as the living source of truth for plan adjustments and version increments (`v1.0`, `v1.1`, etc.).
_Avoid_: Helpdesk bot, medical consultation

**Training Calendar**:
The dedicated `.ics` schedule of workout and recovery sessions (`My Training Plan`) starting from the user's selected Plan Start Date and compatible with Google, Outlook, and Apple Calendar, kept strictly separate from nutrition events.
_Avoid_: Workout log, general calendar

**Diet Calendar**:
The dedicated `.ics` schedule of daily meals, eating windows, and hydration reminders (`My Diet Plan`) starting from the user's selected Plan Start Date and compatible with Google, Outlook, and Apple Calendar, kept strictly separate from training events.
_Avoid_: Meal log, food diary

**Context Snapshot**:
A user-downloaded portable document containing the current session's verified inputs, Master Prompt, and Personal Trainer Chat transcript, enabling session recovery without persistent browser storage.
_Avoid_: Cloud backup, saved profile
