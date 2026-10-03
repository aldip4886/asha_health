# ASHA Product Technical Guide

**Version:** 1.7\
**Architecture:** Single-file HTML MVP

## 1. Architecture

``` text
index.html
├── UI
├── Wizard Engine
├── State Manager
├── Validation Engine
├── OCR Handler
├── Fallback Engine
├── Assumption Engine
├── Personalization Engine
├── Prompt Generator
├── Exercise Reference Manager
├── Clipboard Manager
├── Gemini Launcher
├── Calendar Parser
├── ICS Generator
└── Privacy/Clear Session Manager
```

## 2. Runtime State

``` javascript
const appState = {
  personal: {
    age: null,
    sex: null,
    ethnicity: null,
    height: null,
    weight: null
  },

  health: {},
  healthReport: {},

  goal: {},
  timeframe: {},
  schedule: {},
  equipment: {},
  nutrition: {},
  planning: {},
  exerciseGuide: {},
  calendar: {},

  personalization: {
    visualPersona: null,
    sexSpecificFactors: [],
    trainingConsiderations: [],
    nutritionConsiderations: [],
    conditionalQuestions: [],
    confirmed: false
  },

  assumptions: {},
  confirmation: {}
};
```

## 3. Background Resolver

``` javascript
function resolveVisualPersona(sex) {
  if (sex === "male") {
    return {
      type: "female_active",
      asset: "assets/background-female-active.webp"
    };
  }

  if (sex === "female") {
    return {
      type: "male_active",
      asset: "assets/background-male-active.webp"
    };
  }

  return {
    type: "neutral",
    asset: "assets/background-neutral.webp"
  };
}
```

## 4. Background Update

``` javascript
function updatePersonaBackground(sex) {
  const persona = resolveVisualPersona(sex);

  document.documentElement.style.setProperty(
    "--asha-persona-background",
    `url("${persona.asset}")`
  );

  document.body.classList.add("persona-transition");

  setTimeout(() => {
    document.body.classList.remove("persona-transition");
  }, 400);

  appState.personalization.visualPersona = persona.type;
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

``` javascript
function buildSexAwareContext(state) {
  const result = {
    relevant: false,
    factors: [],
    additionalQuestions: []
  };

  // Apply only rules supported by available user information.
  // Never infer pregnancy, lactation, menstrual status,
  // medical conditions, or other physiological states.

  return result;
}
```

## 7. Data Handling

No health or personal data may be written to:

-   localStorage;
-   sessionStorage;
-   IndexedDB;
-   cookies.

Runtime JavaScript memory is the MVP persistence boundary.

## 8. Gemini Handoff

``` javascript
navigator.clipboard.writeText(generatedPrompt);
window.open("https://gemini.google.com/", "_blank");
```

Do not claim automatic cross-site pasting.

## 9. Asset Guidelines

Persona background assets should be:

-   16:9;
-   2K source;
-   white studio background;
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
