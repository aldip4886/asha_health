# ASHA User Stories & Acceptance Criteria

**Version:** 1.7

## US-01 --- Select Sex

**As a user**, I want to select my sex so ASHA can personalize relevant
context.

### Acceptance

-   User can select Male, Female, or Prefer not to say.
-   ASHA does not infer sex.
-   Selection is stored only in runtime state.
-   Changing the selection resets downstream confirmation.

------------------------------------------------------------------------

## US-02 --- Dynamic Background

**As a user**, I want the app to adapt its visual persona after I select
sex.

### Acceptance

-   Male selection loads female active-person persona.
-   Female selection loads male active-person persona.
-   Unspecified loads neutral ASHA background.
-   Transition is visually smooth.
-   Background does not alter health recommendations by itself.
-   Images remain decorative and accessible.

------------------------------------------------------------------------

## US-03 --- Sex-Aware Training

**As a user**, I want training recommendations to consider relevant
physiological context.

### Acceptance

-   Sex is included in the Gemini prompt.
-   Prompt states that sex is contextual, not determinative.
-   Relevant physiological factors may be considered.
-   No stereotypical intensity rules are generated.
-   Goal, health, fitness level, equipment, schedule, and recovery
    remain primary inputs.

------------------------------------------------------------------------

## US-04 --- Sex-Aware Nutrition

**As a user**, I want meal planning to consider relevant nutritional
differences.

### Acceptance

-   Sex is included as contextual information.
-   Energy and nutrient estimates may consider sex when relevant.
-   No automatic restrictive diet is assigned based on sex.
-   Pregnancy/lactation considerations are only used when known and
    relevant.

------------------------------------------------------------------------

## US-05 --- Conditional Follow-Up

**As a user**, I want ASHA to ask additional questions only when they
materially improve the plan.

### Acceptance

-   No unnecessary sex-specific questionnaire is shown.
-   Relevant questions can be triggered conditionally.
-   Unknown conditions are never assumed.
-   Sensitive information is optional unless essential to the requested
    plan.

------------------------------------------------------------------------

## US-06 --- Review Before Generation

### Acceptance

The review page displays:

-   sex;
-   health data;
-   goals;
-   targets;
-   schedule;
-   equipment;
-   diet;
-   assumptions;
-   relevant personalization considerations.

Generation remains disabled until confirmation.

------------------------------------------------------------------------

## US-07 --- Privacy

### Acceptance

-   Health data is not persisted to browser storage.
-   Clear Session removes runtime state.
-   Refresh discards runtime data.
-   No analytics event contains health data.
