# ASHA Product Technical Guide

**Version:** 1.7\
**Architecture:** Single-file HTML MVP (`index.html` + `Code.gs` for Google Apps Script, built from modular TypeScript in `src/`)

## 1. Architecture

``` text
index.html (built from src/client/app.ts)
├── Global Header & Footer (White & Orange Theme)
├── 7-Step Wizard Engine (Top & Bottom Navigation Bars; Step 7 Sebelumnya & Mulai Lagi)
├── Runtime State Manager (src/state/runtime-state.ts)
├── OCR Handler (Step 2/7 Client-Side Health Report Upload)
├── Authoritative Health Snapshot & Conditional Questions (Step 3/7)
├── Staged Aspiration, Sub-Target & Timeframe Engine (Step 4/7)
├── 3-Session Schedule, Training Types, Equipment & Diet Engine (Step 5/7)
├── Plan Type, Start Date & Calendar Platform Selector (Step 6/7)
├── Personalization & Assumption Engine (src/domain/personalization-engine.ts)
├── Master Prompt Builder (src/domain/prompt-builder.ts)
├── Auto-Copy Clipboard & Personalized Motivational Popup (Step 7/7)
├── Multi-AI Chat Launcher (ChatGPT, Gemini, Claude, Grok, Copilot)
└── Privacy / Clear Session Manager
```

## 2. Runtime State

``` typescript
const appState: AshaRuntimeState = {
  personal: {
    nickname: null,
    age: null,
    sex: "unspecified",
    ethnicity: null,
    heightCm: null,
    weightKg: null
  },

  healthReportOcr: {
    extractedValues: {},
    unreadableFields: []
  },

  healthSnapshot: {
    bloodPressureSystolic: null,
    bloodPressureDiastolic: null,
    fastingGlucose: null,
    uricAcid: null,
    totalCholesterol: null,
    ldl: null,
    hdl: null,
    triglycerides: null,
    restingHeartRate: null,
    conditions: [],
    medications: [],
    injuriesOrLimitations: [],
    menstrualOrPregnancyContext: null
  },

  goals: {
    aspiration: null,
    targetDescription: null,
    muscleMassPercent: null,
    fatPercent: null,
    targetWeightKg: null,
    runningDistance: null,
    targetPace: null,
    healthIndicatorName: null,
    healthIndicatorTarget: null,
    timeframeWeeks: null
  },

  scheduleEquipmentDiet: {
    trainingDays: [],
    restDays: [],
    trainingTypes: [], // ("Cardio" | "Strength" | "Mobility & Flexibility")[]
    sessionDurationMinutes: null,
    preferredTrainingTime: null,
    equipment: [], // includes "Tidak Ada (Gunakan Bodyweight)" and "Treadmil / Walking Pad"
    dietPattern: "no_specific_diet",
    ifProtocol: null,
    eatingWindow: null
  },

  preferences: {
    planType: "integrated",
    planStartDate: null,
    calendarProvider: "google",
    exerciseVisualMode: "external_reference"
  },

  personalization: {
    visualPersona: "neutral",
    sexSpecificFactors: [],
    trainingConsiderations: [],
    nutritionConsiderations: [],
    conditionalQuestions: []
  },

  assumptions: [],
  confirmedByUser: false
};
```

## 3. Background Resolver

``` typescript
function resolveVisualPersona(sex: BiologicalSex) {
  if (sex === "male") {
    return {
      persona: "female_active",
      assetPath: "assets/background-female-active.webp"
    };
  }

  if (sex === "female") {
    return {
      persona: "male_active",
      assetPath: "assets/background-male-active.webp"
    };
  }

  return {
    persona: "neutral",
    assetPath: "assets/background-neutral.webp"
  };
}
```

## 4. Background Update

``` typescript
function applyPersonaBackground(sex: BiologicalSex) {
  const persona = resolveVisualPersona(sex);

  document.documentElement.style.setProperty(
    "--asha-persona-background",
    `url("${persona.assetPath}")`
  );

  document.body.classList.add("persona-transition");

  setTimeout(() => {
    document.body.classList.remove("persona-transition");
  }, 400);
}
```

## 5. Important Separation

Do not connect the visual resolver directly to health recommendation
logic.

Correct:

``` text
Sex
├──→ Visual Persona Resolver
│
└──→ Personalization Engine
      └──→ Prompt Generator
```

Incorrect:

``` text
Sex → Background → Training Rules
```

The two paths share the input but have independent responsibilities.

## 6. Personalization Engine

The engine determines whether sex-related context is relevant.

``` typescript
function buildPersonalizationContext(state: AshaRuntimeState) {
  // Applies only rules supported by available user information.
  // Never infers pregnancy, lactation, menstrual status,
  // medical conditions, or other physiological states.
}
```

## 7. Data Handling

No health or personal data may be written to:

-   `localStorage`;
-   `sessionStorage`;
-   `IndexedDB`;
-   `cookies`.

Runtime JavaScript memory is the MVP persistence boundary.

## 8. Auto-Copy Clipboard, Personalized Popup & Multi-AI Handoff (Step 7/7)

When the user checks the confirmation checkbox on Step 7/7:

1.  The Master Prompt is generated in memory via `buildMasterPrompt(state)` (not rendered on screen).
2.  The prompt is automatically copied to the user's clipboard:
    ``` typescript
    navigator.clipboard.writeText(generatedPrompt);
    ```
3.  A modal popup (`role="dialog"`) greets the user by `personal.nickname` (defaulting to `"Teman ASHA"`) and displays a randomly selected motivational quote from `MOTIVATIONAL_QUOTES`.
4.  Five AI Chat Interface buttons (`ChatGPT`, `Gemini`, `Claude`, `Grok`, `Copilot`) launch the user's chosen AI assistant via `window.open(providerUrl, "_blank", "noopener,noreferrer")`.

Do not claim automatic cross-site pasting.

## 9. Asset Guidelines

Persona background assets should be:

-   16:9;
-   2K source;
-   white studio background harmonized with the White & Orange UI theme;
-   compressed to a web-appropriate format for delivery;
-   positioned with the subject on the lower-right;
-   optimized for readability of UI elements placed in the open area.

Recommended filenames:

``` text
assets/
├── background-male-active.webp
├── background-female-active.webp
└── background-neutral.webp
```

## 10. Accessibility

Background images must not contain information essential to
understanding the application.

Use:

``` css
background-image: var(--asha-persona-background);
```

with appropriate contrast overlays only if needed.

Do not rely on the image alone to communicate state.

Provide text labels and accessible form controls.
