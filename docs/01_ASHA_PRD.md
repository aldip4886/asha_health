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
→ Step 1/7: Personal Information (What should I call you?, Age, Sex, Height, Weight, Ethnic Group)
→ Step 2/7: Health Report / OCR Upload (Verify & Confirm Extracted Biomarkers)
→ Step 3/7: Health Snapshot (Authoritative Biomarkers & Other Indicators)
→ Step 4/7: Staged Goal / Aspiration → Specific Target → Target Timeframe (Weeks)
→ Step 5/7: Schedule (Training Days + Select All, Rest Days, Training Types, Equipment)
            --- Session Divider ---
            Training Time (Time Picker) & Session Duration
            --- Session Divider ---
            Diet Preference (+ Conditional IF Protocol & Eating Window)
→ Step 6/7: Plan Type, Integration Mode, Plan Start Date (Date Picker), Calendar Platform (Google/Outlook/Apple), Visual Mode & Conditional Context
→ Step 7/7: Mandatory Review & Confirmation ("Sebelumnya" & "Mulai Lagi" Navigation)
→ User Confirmation Checkbox
→ Automatic Master Prompt Copy to Clipboard + Personalized Pop-up Notice with Random Motivational Quote
→ Launch Preferred AI Chat Interface (ChatGPT, Gemini, Claude, Grok, or Copilot)
→ Generative AI Produces Detailed Day-by-Day Plan, Exercise Guide (with DAREBEE visuals) & .ICS Calendar Blocks
```

------------------------------------------------------------------------

# 4. Personal Information

Fields:

-   preferred name / nickname (`What should I call you?`);
-   age;
-   sex;
-   ethnic group (`Asian`, `Kaukasian`, `American`, `Latin`, `Indian`, `Other`);
-   height;
-   weight.

Rules:

-   Preferred name / nickname is used to personalize the confirmation pop-up greeting and AI conversation greeting.
-   Age is generally critical.
-   Height and weight are important when relevant.
-   Sex is used as contextual information, not as a standalone determinant.
-   Ethnic group is optional (`Asian`, `Kaukasian`, `American`, `Latin`, `Indian`, `Other`).
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

# 8. Goals (Staged Disclosure — Step 4/7)

Step 4/7 uses progressive disclosure:

1.  **Primary Aspiration Selection**:
    -   `build_muscle` (Build Muscle) → reveals **Muscle Mass (% dari berat badan)** input;
    -   `fat_loss` (Fat Loss) → reveals **Fat Percentage (% dari berat badan)** input;
    -   `weight_loss` (Weight Loss) → reveals **Target Weight (Kg)** input;
    -   `improve_mobility` (Improve Mobility) → proceeds directly without a sub-target numerical input;
    -   `running_performance` (Running Performance) → reveals **Running Distance** (`5K`, `10K`, `Half Marathon`, `Full Marathon`) and **Target Pace** inputs;
    -   `health_indicator` (Health Indicator) → reveals **Health Indicator** (`Blood Pressure`, `Glucose`, `Uric Acid`, `Total Cholesterol`, `LDL`, `HDL`, `Triglycerides`, `Resting Heart Rate`, `Other`) and **Target Indicator Value** inputs.
2.  **Target Timeframe (Weeks)**:
    -   Revealed only after the Primary Aspiration and its required sub-target fields (if any) have been filled.

------------------------------------------------------------------------

# 9. Schedule, Training Types & Equipment (Step 5/7)

Step 5/7 is organized into **3 visual session blocks** separated by 2 `<hr class="asha-session-divider" />` dividers:

1.  **Session Block 1 — Days, Training Types & Equipment**:
    -   **Training Days** checkboxes (`Senin`–`Minggu`) with a **Pilih Semua (Select All)** master checkbox. When **Pilih Semua (Select All)** is checked, all 7 training days are selected and all **Rest Days** checkboxes are automatically cleared and disabled (greyed out).
    -   **Rest Days** checkboxes (`Senin`–`Minggu`).
    -   **Training Types (Jenis Latihan)** multiple-select checkboxes placed immediately before Available Equipment:
        -   `Cardio`
        -   `Strength`
        -   `Mobility & Flexibility`
    -   **Available Equipment (Peralatan yang Tersedia)** checkboxes:
        -   `Tidak Ada (Gunakan Bodyweight)`
        -   `Dumbbells`
        -   `Barbell`
        -   `Fitness Ball`
        -   `Treadmil / Walking Pad`
2.  **Session Block 2 — Training Time & Duration**:
    -   **Preferred Training Time** (`<input type="time">` time picker);
    -   **Session Duration (minutes)**.
3.  **Session Block 3 — Diet Preference**:
    -   **Diet Pattern** (`No Specific Diet`, `Vegan`, `Vegetarian`, `Carnivore`, `Keto`, `Intermittent Fasting`);
    -   When `Intermittent Fasting` is selected, conditionally reveals **IF Protocol** (`12:12`, `14:10`, `16:8`, `18:6`, `Custom`) and **Eating Window** (`<input type="text">`, e.g., `12:00 - 20:00`).

AI may propose conservative assumptions when non-critical information is
missing. Every assumption must be disclosed.

------------------------------------------------------------------------

# 10. Equipment Rules

Supported equipment options:

-   `Tidak Ada (Gunakan Bodyweight)` (bodyweight);
-   `Dumbbells`;
-   `Barbell`;
-   `Fitness Ball`;
-   `Treadmil / Walking Pad`.

Hard rule:

> Never prescribe an exercise requiring equipment the user does not
> have.

If nothing is selected or `Tidak Ada (Gunakan Bodyweight)` is chosen, default to bodyweight with explicit notice.

------------------------------------------------------------------------

# 11. Diet

Supported:

-   no specific diet;
-   vegan;
-   vegetarian;
-   carnivore;
-   keto;
-   intermittent fasting.

IF (conditional upon selecting `intermittent_fasting`):

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
7.  schedule & preferred training types (`Cardio`, `Strength`, `Mobility & Flexibility`);
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

# 15. Plan Type, Start Date & Calendar Platform (Step 6/7)

Step 6/7 collects:

-   **Plan Type**:
    -   `training_only` (Training Plan Only);
    -   `meal_only` (Meal Plan Only);
    -   `integrated` (Training + Meal Plan — optimized together).
-   **Plan Start Date (Tanggal Mulai Plan)**:
    -   `<input type="date">` date picker defining Day 1 of the generated daily schedule and `.ics` calendar events.
-   **Calendar Platform (Pilihan Kalender)**:
    -   `Google` (Google Calendar);
    -   `Outlook` (Microsoft Outlook);
    -   `Apple` (Apple Calendar).
-   **Exercise Visual Reference Preference**:
    -   External visual references (e.g. `https://darebee.com`).

Integrated requirement:

> Jangan menyusun rencana latihan dan rencana makan sebagai dua rencana
> yang berdiri sendiri. Optimalkan keduanya secara bersama-sama
> berdasarkan tujuan, beban latihan, waktu latihan, pemulihan, kebutuhan
> energi, dan pola diet pengguna.

------------------------------------------------------------------------

# 16. Exercise Guide & Detailed Daily Schedule

The Master Prompt instructs the AI to output a **detailed day-by-day Training Plan and Meal Plan** across the entire target timeframe starting from the user's selected **Plan Start Date**.

Additionally, every prescribed exercise must include a mandatory **Panduan Gerakan Latihan (Exercise Movement Guide)** containing:

-   exercise name;
-   **fungsi / manfaat gerakan** (function and benefit of the movement);
-   **otot yang dilatih** (primary and secondary muscles worked);
-   **repetisi** (sets, reps, tempo, or duration);
-   **cara melakukan gerakan** (step-by-step execution instructions, starting position, breathing, and safety cues);
-   **contoh (gambar gerakan)** referencing external fitness libraries such as `https://darebee.com/workouts.html` or `https://darebee.com/exercises/` (with text-only fallback if a specific visual URL is unavailable).

DAREBEE may be used as an external reference provider, but third-party
copyrighted images must not be copied or hosted without appropriate
permission.

------------------------------------------------------------------------

# 17. Meal Plan

Should include a detailed **day-by-day schedule** covering:

-   daily meals for every day of the target timeframe;
-   food choices;
-   portion guidance;
-   estimated energy where appropriate;
-   protein;
-   carbohydrates;
-   fats;
-   fiber;
-   hydration;
-   meal timing (aligned with Training Time and IF Eating Window when applicable);
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

# 19. Mandatory Review, Auto-Copy Popup & Multi-AI Handoff (Step 7/7)

Before confirmation, Step 7/7 displays the review summary:

-   personal information (including nickname `"What should I call you?"`, sex, and ethnicity);
-   OCR values (Step 2) & authoritative health snapshot (Step 3);
-   goal, staged target, and timeframe (Step 4);
-   schedule, training types (`Cardio`, `Strength`, `Mobility & Flexibility`), equipment, preferred training time, session duration, and diet/IF protocol (Step 5);
-   plan type, plan start date, and calendar platform (Step 6);
-   AI assumptions, relevant physiological considerations, and safety notices.

Navigation & Confirmation Rules on Step 7/7:

-   Standard wizard navigation buttons (`Selanjutnya`) are hidden and replaced exclusively by **"Sebelumnya"** (to return to Step 6/7) and **"Mulai Lagi"** (to reset the session and return to Step 1/7).
-   Only the mandatory confirmation checkbox is shown after the review statement:
    > Saya telah memeriksa informasi dan asumsi yang akan digunakan untuk membuat prompt.
-   When the user checks the confirmation checkbox:
    1.  The Master Prompt is **not** displayed on screen.
    2.  Instead, the Master Prompt is **automatically copied to the user's clipboard**.
    3.  A personalized **Pop-Up Message (`role="dialog"`)** appears displaying:
        ``` text
        Selamat [nama_pengguna], prompt kamu sudah siap!
        Silakan klik AI Chat Interface favoritmu untuk membuat plan.
        “[Random motivational quote]”
        ```
        where `[nama_pengguna]` is the user's nickname from Step 1/7 (defaulting to `"Teman ASHA"` if left blank) and the motivational quote is randomly selected from ASHA's curated quote pool.
    4.  Five clickable **AI Chat Interface logo buttons** are rendered so the user can immediately open and paste the prompt into their preferred AI assistant:
        -   **ChatGPT** (`https://chatgpt.com/`)
        -   **Gemini** (`https://gemini.google.com/`)
        -   **Claude** (`https://claude.ai/`)
        -   **Grok** (`https://grok.com/`)
        -   **Copilot** (`https://copilot.microsoft.com/`)

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
-   Clear Session / Mulai Lagi wipes state;
-   refresh/close discards data.

Once information is pasted into the user's chosen AI Chat Interface, handling is subject to that provider's applicable policies and account controls.

------------------------------------------------------------------------

# 21. Calendar (`.ics` Generated by Generative AI)

Two separate calendars:

1.  `My Training Plan` (`asha-training-plan.ics`)
2.  `My Diet Plan` (`asha-diet-plan.ics`)

In v1.7, `.ics` calendar files are generated **by the Generative AI inside the chat interface** after the user pastes the Master Prompt, anchored to the user's selected **Plan Start Date** and formatted for the user's chosen **Calendar Platform** (`Google`, `Outlook`, or `Apple`) for manual import.

Never merge, overwrite, or modify existing calendars without explicit
future integration.

------------------------------------------------------------------------

# 22. Personal Trainer Chat

The AI Chat conversation (Gemini, ChatGPT, Claude, Grok, or Copilot) is the source of truth for ongoing plan context.

ASHA should instruct:

> Jangan membuat percakapan baru. Gunakan percakapan ini sebagai
> Personal Trainer Chat ASHA.

Plan versioning:

-   v1.0 initial;
-   v1.1 modified;
-   v1.2 etc.

Significant changes require confirmation before replacing the whole
plan.

------------------------------------------------------------------------

# 23. Safety

The AI assistant must:

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
☐ User nickname greeted and used in popup & prompt
☐ Goal & staged sub-target clearly identified
☐ Timeframe and Plan Start Date considered
☐ Training Types (Cardio, Strength, Mobility & Flexibility) respected
☐ Equipment respected (including Tidak Ada / Bodyweight and Treadmil / Walking Pad)
☐ Diet & IF protocol respected
☐ Sex-aware factors considered only when relevant
☐ No sex-based stereotyping
☐ Detailed day-by-day Training & Meal Plan generated for full timeframe
☐ Every exercise includes fungsi/manfaat, otot yang dilatih, repetisi, cara melakukan, and darebee.com visual reference
☐ Safety cues present
☐ Assumptions disclosed
☐ Generative AI .ics calendar blocks separated (Training vs. Diet)
☐ Output in Bahasa Indonesia
```
