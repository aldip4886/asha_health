# ASHA MVP Scope

**Version:** 1.7

## MVP Goal

Deliver a privacy-first single-file web app with a dominant **White & Orange** professional theme that collects structured personal context across 7 wizard steps and automatically copies a complete Bahasa Indonesia Master Prompt to the user's clipboard for immediate handoff to their preferred AI Chat Interface (ChatGPT, Gemini, Claude, Grok, or Copilot).

## MVP Included

### UI & Layout

-   Dominant **White & Orange** theme (`#ffffff`, `#f97316`, `#ea580c`)
-   Professional **Header** (brand emblem, title/subtitle, privacy badge, `Hapus Sesi` button) and **Footer** (privacy notice & medical disclaimer) across all pages
-   **Top & Bottom Wizard Navigation Bars** on Steps 1–6 so users do not need to scroll back to the top after completing a step
-   **Step 7 Navigation**: Only **"Sebelumnya"** and **"Mulai Lagi"** buttons are shown

### 7-Step Wizard

1.  **Step 1/7 — Personal Information**:
    -   `What should I call you?` (`nickname`) text input
    -   Age, Height (cm), Weight (kg)
    -   Sex selection (`Male`, `Female`, `Prefer not to say`)
    -   Ethnicity `<select>` (`Asian`, `Kaukasian`, `American`, `Latin`, `Indian`, `Other`)
2.  **Step 2/7 — Health Report OCR Upload (Client-Side)**:
    -   Presented before manual Health Snapshot so extracted values can pre-populate Step 3
3.  **Step 3/7 — Authoritative Health Snapshot**:
    -   Clinical indicators (blood pressure, glucose, uric acid, cholesterol, LDL, HDL, triglycerides, resting heart rate, conditions, medications, injuries/limitations)
    -   Conditional physiological follow-up questions when relevant
4.  **Step 4/7 — Staged Aspiration, Target & Timeframe**:
    -   Stage 1: Primary Aspiration selection (`Build Muscle`, `Fat Loss`, `Weight Loss`, `Improve Mobility`, `Running Performance`, `Health Indicator`)
    -   Stage 2: Specific sub-target input (`Muscle Mass %`, `Fat Percentage %`, `Target Weight Kg`, `Running Distance + Target Pace`, or `Health Indicator + Target Value`)
    -   Stage 3: `Target Timeframe (Weeks)` revealed after aspiration and sub-target are completed
5.  **Step 5/7 — Schedule, Training Types, Equipment & Diet (3 Session Blocks)**:
    -   Session 1: `Training Days` checkboxes with **Pilih Semua (Select All)** (which automatically disables/greys out `Rest Days`), `Rest Days` checkboxes, `Training Types` multi-select checkboxes (`Cardio`, `Strength`, `Mobility & Flexibility`) before equipment, and `Available Equipment` checkboxes (`Tidak Ada (Gunakan Bodyweight)`, `Dumbbells`, `Barbell`, `Fitness Ball`, `Treadmil / Walking Pad`)
    -   Session 2: `Preferred Training Time` (`<input type="time">` time picker) & `Session Duration (minutes)`
    -   Session 3: `Diet Preference` (with conditional `IF Protocol` and `Eating Window` when `Intermittent Fasting` is selected)
6.  **Step 6/7 — Plan Type, Start Date & Calendar Platform**:
    -   Plan Type (`Training Only`, `Meal Only`, `Integrated Training + Meal`)
    -   `Plan Start Date` (`<input type="date">` date picker)
    -   `Calendar Platform` (`Google`, `Outlook`, `Apple`)
7.  **Step 7/7 — Review, Confirmation, Auto-Copy Popup & Multi-AI Handoff**:
    -   Comprehensive summary review & mandatory confirmation checkbox
    -   Master Prompt is **hidden from screen** and **automatically copied to clipboard** upon confirmation
    -   Personalized **Pop-Up Dialog** greeting the user by `nickname` (`Selamat [nama_pengguna], prompt kamu sudah siap! Silakan klik AI Chat Interface favoritmu untuk membuat plan.`) with a **random motivational quote**
    -   Direct launch logo buttons for **ChatGPT**, **Gemini**, **Claude**, **Grok**, and **Copilot**

### Dynamic Persona

Included:

-   Male → female active persona
-   Female → male active persona
-   Unspecified → neutral background
-   responsive 16:9 background
-   fade transition

### Sex-Aware Planning & Exercise Movement Guide

Included in prompt generation:

-   contextual sex-aware training and nutrition considerations;
-   conditional physiological questions & anti-stereotyping rules;
-   detailed **day-by-day** Training Plan and Meal Plan across the full target timeframe starting on `Plan Start Date`;
-   mandatory **Exercise Movement Guide** for every exercise (`fungsi/manfaat gerakan`, `otot yang dilatih`, `repetisi`, `cara melakukan gerakan`, and `contoh/gambar gerakan` from external reference libraries such as `darebee.com`);
-   disclosure of assumptions.

### Calendar (`.ics` via Generative AI)

Included:

-   Prompt instructions for the Generative AI to generate two separate RFC 5545 `.ics` blocks (`My Training Plan` and `My Diet Plan`) starting on `Plan Start Date` and formatted for `Google`, `Outlook`, or `Apple` Calendar.

## MVP Excluded

-   direct AI conversation API control;
-   automatic cross-origin pasting into external AI chat windows;
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

-   Google Calendar OAuth integration;
-   Microsoft Graph;
-   Apple Calendar direct sync;
-   wearable data;
-   explicit progress tracking;
-   computer-vision exercise feedback.

## MVP Acceptance Principle

The product must remain useful if the user provides incomplete
information. It must disclose assumptions and must never invent health
measurements.
