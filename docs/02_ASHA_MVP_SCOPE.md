# ASHA MVP Scope

**Version:** 1.7

## MVP Goal

Deliver a privacy-first single-file web app that collects structured
personal context and hands a complete Bahasa Indonesia master prompt to
Gemini.

## MVP Included

### Wizard

-   Personal information
-   Sex selection
-   Health snapshot
-   Health-report OCR interface
-   Goals
-   Targets
-   Timeframe
-   Schedule
-   Equipment
-   Diet
-   Plan type
-   Calendar preferences
-   Exercise visual preferences
-   Review and confirmation

### Dynamic Persona

Included:

-   Male → female active persona
-   Female → male active persona
-   Unspecified → neutral background
-   responsive 16:9 background
-   fade transition

### Sex-Aware Planning

Included in prompt generation:

-   contextual sex-aware training considerations;
-   contextual nutrition considerations;
-   conditional physiological questions;
-   anti-stereotyping rules;
-   disclosure of assumptions.

### Gemini Handoff

Included:

-   master prompt generation;
-   clipboard copy;
-   open Gemini;
-   instruction to continue the same conversation.

### Calendar

Included:

-   My Training Plan `.ics`;
-   My Diet Plan `.ics`;
-   preview;
-   reminder options;
-   manual import.

## MVP Excluded

-   direct Gemini conversation API control;
-   automatic pasting into Gemini;
-   automatic calendar OAuth;
-   wearable integrations;
-   long-term health database;
-   automatic medical diagnosis;
-   autonomous treatment;
-   automatic exercise form assessment;
-   automatic background personalization based on inferred
    characteristics.

## P1

-   richer exercise visual cards;
-   plan versioning UI;
-   improved OCR;
-   calendar update assistant;
-   richer adaptation controls.

## P2/Future

-   Google Calendar integration;
-   Microsoft Graph;
-   Apple Calendar;
-   wearable data;
-   explicit progress tracking;
-   computer-vision exercise feedback.

## MVP Acceptance Principle

The product must remain useful if the user provides incomplete
information. It must disclose assumptions and must never invent health
measurements.
