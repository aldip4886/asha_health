# ASHA Changelog

## 1.7 --- Sex-Aware Personalization & Dynamic Persona

### Added

-   Sex selection states: male, female, unspecified.
-   Dynamic persona background.
-   Male user → female active persona.
-   Female user → male active persona.
-   Neutral background for unspecified selection.
-   Sex-aware training context.
-   Sex-aware nutrition context.
-   Conditional physiological questions.
-   Anti-stereotyping rules.
-   Visual-persona resolver.
-   Personalization state object.
-   UX acceptance criteria.
-   Master-prompt personalization block.

### Changed

-   Personal information model now explicitly includes `sex`.
-   Review screen includes personalization context.
-   Quality-control checklist includes sex-aware validation.
-   Technical architecture adds `Personalization Engine`.
-   Asset structure includes male/female/neutral background assets.

### Safety / Privacy

-   Sex is not inferred.
-   Physiological states are not inferred.
-   Sensitive follow-up questions are conditional.
-   Runtime-only data handling remains unchanged.
-   Visual personalization is separated from health recommendation
    logic.

## 1.6

Previous ASHA documentation baseline.

Core product:

-   privacy-first;
-   wizard-based;
-   Gemini handoff;
-   health snapshot;
-   OCR;
-   goals;
-   training;
-   nutrition;
-   recovery;
-   monitoring;
-   Personal Trainer Chat;
-   separate training/diet calendars.
