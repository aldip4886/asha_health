# ASHA --- Personal Health Companion

## Product Requirements Document

**Version:** 1.7\
**Status:** Product Specification\
**Product Type:** Privacy-first personal health planning companion\
**Primary AI:** Google Gemini via user-initiated handoff\
**MVP Platform:** Single-file HTML application

------------------------------------------------------------------------

# 1. Product Vision

ASHA transforms a user's health information, aspirations, constraints,
schedule, equipment, diet, and preferences into an understandable and
adaptable health plan.

> **Hope is not the plan. Hope is the beginning of the plan.**

ASHA uses the conceptual framework:

**A --- Aspiration**\
**S --- Strategy**\
**H --- Habit**\
**A --- Adaptation**

The product loop is:

`Aspiration → Strategy → Action/Habit → Reflection → Adaptation → Progress → New Aspiration`

------------------------------------------------------------------------

# 2. Product Definition

ASHA is a privacy-first personal health companion that transforms user
context into a structured health plan through Gemini.

It combines:

-   health education;
-   goal analysis;
-   training planning;
-   exercise guidance;
-   nutrition/meal planning;
-   integrated training + nutrition;
-   recovery;
-   monitoring;
-   adaptation;
-   calendar planning.

ASHA is not:

-   a doctor;
-   a diagnostic engine;
-   a medication prescriber;
-   an emergency service;
-   a replacement for healthcare professionals;
-   an autonomous calendar manager.

------------------------------------------------------------------------

# 3. Core User Journey

``` text
Start
→ Personal Information
→ Health Snapshot
→ Health Report / OCR
→ Goal / Aspiration
→ Target
→ Time Frame
→ Schedule
→ Equipment
→ Diet
→ Plan Type
→ Calendar
→ Exercise Visual Preferences
→ Review
→ User Confirmation
→ Generate Master Prompt
→ Copy Prompt
→ Open Gemini
→ Gemini Generates Plan
→ Review Plan
→ Personal Trainer Chat
→ Adapt Plan
→ Update Calendars
```

------------------------------------------------------------------------

# 4. Personal Information

Fields:

-   age;
-   sex;
-   ethnic group;
-   height;
-   weight.

Rules:

-   Age is generally critical.
-   Height and weight are important when relevant.
-   Sex is used as contextual information, not as a standalone
    determinant.
-   Ethnic group is optional.
-   Never infer ethnicity.

## 4.1 Sex Selection

Supported states:

-   `male`
-   `female`
-   `unspecified`

The UI may also present the user-facing option:

> Prefer not to say

The application must not infer sex from name, appearance, voice, or
other data.

------------------------------------------------------------------------

# 5. Dynamic Persona Background

After the user selects sex, ASHA changes the application background
persona.

  User sex      Background
  ------------- ----------------------------------
  Male          Active Indonesian female persona
  Female        Active Indonesian male persona
  Unspecified   Neutral ASHA background

## 5.1 Visual Requirements

Persona images:

-   Indonesian/Southeast Asian appearance;
-   approximately 30--40 years old;
-   full body;
-   studio-grade photography;
-   clean white background;
-   bright but calm sports apparel;
-   confident smile;
-   physically active appearance;
-   welcoming rather than aggressive;
-   subject positioned in the lower-right area;
-   16:9 composition;
-   2K source image.

Female persona:

-   modest Muslim sportswear;
-   hijab;
-   coordinated athletic apparel.

Male persona:

-   athletic shirt;
-   shorts;
-   sports shoes;
-   sports watch.

## 5.2 Persona Meaning

The background persona represents an **active health companion**, not
the user's body or expected physical appearance.

The visual must not communicate:

-   body-shaming;
-   transformation pressure;
-   unrealistic fitness standards;
-   gender stereotypes.

## 5.3 Transition

Recommended transition:

-   subtle fade;
-   approximately 300--500 ms;
-   no disruptive layout shift.

The background selection is visual personalization only. It must not
automatically change health recommendations.

------------------------------------------------------------------------

# 6. Health Snapshot

Supported indicators:

-   blood pressure;
-   resting heart rate;
-   blood glucose;
-   uric acid;
-   total cholesterol;
-   LDL;
-   HDL;
-   triglycerides;
-   other user-provided indicators.

Missing values must be shown as:

> Not provided

Health values must never be fabricated.

------------------------------------------------------------------------

# 7. Health Report OCR

Supported formats where implementation permits:

-   JPG/JPEG;
-   PNG;
-   WebP;
-   PDF.

Flow:

``` text
Upload
→ Extract
→ Normalize
→ Display
→ User verifies
→ Confirm
→ Use in prompt
```

Confidence:

-   High confidence;
-   Review recommended;
-   Unable to determine.

Extracted values are not authoritative until user confirmation.

------------------------------------------------------------------------

# 8. Goals

Supported goals:

-   build muscle;
-   fat loss;
-   weight loss;
-   improve mobility;
-   improve overall health;
-   running performance;
-   improve health indicator.

Running:

-   5K;
-   10K;
-   half marathon;
-   full marathon;
-   target pace or finish time;
-   optional current performance and training history.

Health indicator:

-   blood pressure;
-   glucose;
-   uric acid;
-   total cholesterol;
-   LDL;
-   HDL;
-   triglycerides;
-   resting heart rate;
-   other.

------------------------------------------------------------------------

# 9. Schedule

Inputs:

-   training days;
-   session duration;
-   rest days;
-   preferred training time.

AI may propose conservative assumptions when non-critical information is
missing.

Every assumption must be disclosed.

------------------------------------------------------------------------

# 10. Equipment

Supported:

-   bodyweight;
-   dumbbells;
-   barbell;
-   fitness ball.

Hard rule:

> Never prescribe an exercise requiring equipment the user does not
> have.

If nothing is selected, default to bodyweight with explicit notice.

------------------------------------------------------------------------

# 11. Diet

Supported:

-   no specific diet;
-   vegan;
-   vegetarian;
-   carnivore;
-   keto;
-   intermittent fasting.

IF:

-   12:12;
-   14:10;
-   16:8;
-   18:6;
-   custom;
-   eating window.

Never infer diet type.

------------------------------------------------------------------------

# 12. Sex-Aware Training Personalization

Sex is one contextual variable among many.

The training engine must consider, where relevant:

-   average body-composition context;
-   muscle-mass considerations;
-   exercise response;
-   recovery;
-   bone-health considerations;
-   menstrual-cycle considerations when voluntarily provided;
-   pregnancy/postpartum status when relevant.

It must not assume:

-   men need heavier training;
-   women need lighter training;
-   men need a particular diet;
-   women need calorie restriction.

Training should primarily reflect:

1.  goal;
2.  health information;
3.  age;
4.  body measurements;
5.  fitness level;
6.  training experience;
7.  schedule;
8.  equipment;
9.  recovery;
10. relevant physiological context.

------------------------------------------------------------------------

# 13. Sex-Aware Nutrition Personalization

Sex may be considered when relevant to:

-   estimated energy requirements;
-   protein requirements;
-   body-composition goals;
-   micronutrient considerations;
-   iron considerations;
-   calcium/vitamin D and bone-health considerations;
-   pregnancy/lactation requirements where applicable.

Sex must not automatically determine a calorie target or restrictive
diet.

Nutrition should integrate:

`Sex + Age + Height + Weight + Activity + Training Load + Goal + Diet Preference + Recovery`

------------------------------------------------------------------------

# 14. Conditional Physiological Questions

ASHA should not create a long sex-specific questionnaire.

Additional questions are conditional.

For example, when relevant for a female user, the system may ask about:

-   pregnancy;
-   postpartum status;
-   breastfeeding;
-   menstrual-cycle considerations;
-   information relevant to bone health.

Only ask information that is relevant to the requested plan.

Do not assume these conditions.

------------------------------------------------------------------------

# 15. Plan Type

Options:

-   training plan only;
-   meal plan only;
-   training + meal plan.

If both:

-   independently;
-   optimize together.

Integrated requirement:

> Jangan menyusun rencana latihan dan rencana makan sebagai dua rencana
> yang berdiri sendiri. Optimalkan keduanya secara bersama-sama
> berdasarkan tujuan, beban latihan, waktu latihan, pemulihan, kebutuhan
> energi, dan pola diet pengguna.

------------------------------------------------------------------------

# 16. Exercise Guide

Each exercise should include:

-   name;
-   objective;
-   primary muscles/area;
-   difficulty;
-   equipment;
-   starting position;
-   step-by-step instructions;
-   breathing;
-   sets/reps/time;
-   rest;
-   common mistakes;
-   safety cues;
-   modification;
-   progression;
-   visual/reference.

Visual modes:

1.  external reference;
2.  AI-generated illustration;
3.  video reference;
4.  text-only fallback.

DAREBEE may be used as an external reference provider, but third-party
copyrighted images must not be copied or hosted without appropriate
permission.

------------------------------------------------------------------------

# 17. Meal Plan

Should include:

-   daily meals;
-   food choices;
-   portion guidance;
-   estimated energy where appropriate;
-   protein;
-   carbohydrates;
-   fats;
-   fiber;
-   hydration;
-   meal timing;
-   diet compatibility.

Estimates are not medical prescriptions.

------------------------------------------------------------------------

# 18. Recovery and Monitoring

Recovery:

-   rest;
-   sleep-supporting habits;
-   hydration;
-   recovery days;
-   training-load management.

Monitoring:

-   weight;
-   body composition;
-   running pace;
-   distance;
-   training performance;
-   resting heart rate;
-   relevant health indicators;
-   perceived recovery;
-   RPE.

------------------------------------------------------------------------

# 19. Mandatory Review

Before prompt generation, show:

-   personal information;
-   sex;
-   health snapshot;
-   OCR values;
-   goal;
-   target;
-   timeframe;
-   schedule;
-   equipment;
-   diet;
-   plan type;
-   integration mode;
-   AI assumptions;
-   relevant physiological considerations;
-   safety considerations.

Required checkbox:

> Saya telah memeriksa informasi dan asumsi yang akan digunakan untuk
> membuat prompt.

------------------------------------------------------------------------

# 20. Privacy

MVP:

-   no localStorage;
-   no sessionStorage;
-   no IndexedDB;
-   no cookies for health data;
-   no backend;
-   no database;
-   no analytics/logging of personal health data;
-   runtime JavaScript memory only;
-   Clear Session wipes state;
-   refresh/close discards data.

Once information is pasted into Gemini, handling is subject to Gemini's
applicable policies and account controls.

------------------------------------------------------------------------

# 21. Calendar

Two separate calendars:

1.  My Training Plan
2.  My Diet Plan

MVP:

-   generate `.ics`;
-   preview;
-   user confirmation;
-   manual import.

Never merge, overwrite, or modify existing calendars without explicit
future integration.

------------------------------------------------------------------------

# 22. Personal Trainer Chat

The Gemini conversation is the source of truth for ongoing plan context.

ASHA should instruct:

> Jangan membuat percakapan Gemini baru. Gunakan percakapan ini sebagai
> Personal Trainer Chat ASHA.

Plan versioning:

-   v1.0 initial;
-   v1.1 modified;
-   v1.2 etc.

Significant changes require confirmation before replacing the whole
plan.

------------------------------------------------------------------------

# 23. Safety

Gemini must:

-   provide educational/general information;
-   not diagnose;
-   not prescribe medication;
-   not fabricate values;
-   not guarantee outcomes;
-   distinguish user targets from medical targets;
-   recommend professional evaluation when appropriate.

Urgent symptoms require appropriate urgent medical care.

------------------------------------------------------------------------

# 24. Quality Control

``` text
☐ Health values not fabricated
☐ Goal matches plan
☐ Target clearly identified
☐ Timeframe considered
☐ Equipment respected
☐ Diet respected
☐ Sex-aware factors considered only when relevant
☐ No sex-based stereotyping
☐ Training and nutrition integrated when requested
☐ Exercises have instructions
☐ References valid or fallback provided
☐ URLs not fabricated
☐ Safety cues present
☐ Assumptions disclosed
☐ Calendar separation preserved
☐ Output in Bahasa Indonesia
```
