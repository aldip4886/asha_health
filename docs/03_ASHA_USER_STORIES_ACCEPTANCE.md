# ASHA User Stories & Acceptance Criteria

**Version:** 1.7

## US-01 --- Personal Profile, Nickname, Sex & Ethnicity (Step 1/7)

**As a user**, I want to provide what ASHA should call me (`nickname`), my sex, and my ethnicity so ASHA can personalize both my greeting and relevant physiological context.

### Acceptance

-   User can enter `"What should I call you?"` (`nickname`).
-   User can select `Male`, `Female`, or `Prefer not to say` for sex.
-   User can select ethnicity from `Asian`, `Kaukasian`, `American`, `Latin`, `Indian`, or `Other`.
-   ASHA does not infer sex or ethnicity.
-   Selections are stored only in runtime state, and changing any field resets downstream confirmation.

------------------------------------------------------------------------

## US-02 --- Dynamic Background

**As a user**, I want the app to adapt its visual persona after I select
sex.

### Acceptance

-   Male selection loads female active-person persona.
-   Female selection loads male active-person persona.
-   Unspecified loads neutral ASHA background.
-   Transition is visually smooth within the dominant White & Orange theme.
-   Background does not alter health recommendations by itself.
-   Images remain decorative and accessible.

------------------------------------------------------------------------

## US-03 --- OCR Upload Before Manual Health Snapshot (Steps 2/7 & 3/7)

**As a user**, I want to upload my lab/health report image in Step 2/7 before reviewing the manual Health Snapshot in Step 3/7 so extracted biomarkers automatically populate Step 3/7 for me to verify or override.

### Acceptance

-   Step 2/7 presents Client-Side Health Report OCR Upload.
-   Step 3/7 presents the Authoritative Health Snapshot pre-filled with any OCR-extracted values.
-   Manual edits in Step 3/7 always override OCR-extracted values.

------------------------------------------------------------------------

## US-04 --- Staged Goal, Target & Timeframe Disclosure (Step 4/7)

**As a user**, I want Step 4/7 to guide me step-by-step from my primary aspiration to the specific target metric and finally the target timeframe.

### Acceptance

-   Selecting `Build Muscle` reveals `Muscle Mass (% dari berat badan)`.
-   Selecting `Fat Loss` reveals `Fat Percentage (% dari berat badan)`.
-   Selecting `Weight Loss` reveals `Target Weight (Kg)`.
-   Selecting `Improve Mobility` allows immediate progression to timeframe.
-   Selecting `Running Performance` reveals `Running Distance` and `Target Pace`.
-   Selecting `Health Indicator` reveals `Health Indicator` and `Target Indicator Value`.
-   `Target Timeframe (Weeks)` is revealed only after the aspiration and its required target fields are completed.

------------------------------------------------------------------------

## US-05 --- Schedule, Select All, Training Types, Equipment & Diet Sessions (Step 5/7)

**As a user**, I want to configure my training days, training types, available equipment, preferred training time, and diet in clearly separated session blocks.

### Acceptance

-   Step 5/7 renders 3 session blocks separated by 2 `<hr class="asha-session-divider" />` elements.
-   Checking **Pilih Semua (Select All)** on Training Days selects all 7 training days and automatically clears and disables (greys out) all Rest Days checkboxes.
-   User can select multiple **Training Types** (`Cardio`, `Strength`, `Mobility & Flexibility`) placed before Available Equipment.
-   User can select **Available Equipment** including `Tidak Ada (Gunakan Bodyweight)`, `Dumbbells`, `Barbell`, `Fitness Ball`, and `Treadmil / Walking Pad`.
-   Session Block 2 provides a `<input type="time">` time picker for **Preferred Training Time** and a numerical input for **Session Duration (minutes)**.
-   Session Block 3 provides **Diet Preference** and conditionally reveals **IF Protocol** and **Eating Window** when `Intermittent Fasting` is chosen.

------------------------------------------------------------------------

## US-06 --- Plan Start Date, Calendar Platform & Exercise Guide (Step 6/7)

**As a user**, I want to pick a Plan Start Date and my Calendar Platform (`Google`, `Outlook`, `Apple`), and receive detailed exercise movement instructions with external visual references.

### Acceptance

-   Step 6/7 includes a `<input type="date">` date picker for **Plan Start Date**.
-   Step 6/7 includes Calendar Platform selection (`Google`, `Outlook`, `Apple`).
-   The generated Master Prompt instructs the AI to produce a detailed **day-by-day** Training & Meal Plan starting on `Plan Start Date`, a complete **Exercise Movement Guide** (`fungsi/manfaat gerakan`, `otot yang dilatih`, `repetisi`, `cara melakukan gerakan`, and `contoh/gambar gerakan` from `darebee.com`), and `.ics` calendar outputs inside the AI chat.

------------------------------------------------------------------------

## US-07 --- Sex-Aware Training & Nutrition

**As a user**, I want training and meal recommendations to consider relevant physiological context without gender stereotypes.

### Acceptance

-   Sex is included in the Master Prompt as contextual, not determinative.
-   No stereotypical intensity or calorie restriction rules are generated.
-   Goal, health, fitness level, training types, equipment, schedule, and recovery remain primary inputs.
-   Conditional physiological follow-up questions are only asked when relevant and never assumed.

------------------------------------------------------------------------

## US-08 --- Step 7/7 Review, Auto-Copy Popup & Multi-AI Handoff

**As a user**, I want Step 7/7 to let me confirm my inputs, automatically copy the Master Prompt to my clipboard without cluttering the screen, greet me by nickname with an encouraging quote, and let me launch my favorite AI Chat Interface.

### Acceptance

-   Steps 1–6 display both top and bottom navigation bars (`Sebelumnya` / `Selanjutnya`).
-   Step 7/7 replaces standard wizard navigation with **"Sebelumnya"** and **"Mulai Lagi"**.
-   Step 7/7 displays the review summary and only the confirmation checkbox after the statement.
-   Upon checking the confirmation checkbox:
    -   The Master Prompt is **not** rendered on screen; it is automatically copied to the user's clipboard.
    -   A pop-up dialog (`role="dialog"`) displays:
        `Selamat [nama_pengguna], prompt kamu sudah siap!`
        `Silakan klik AI Chat Interface favoritmu untuk membuat plan.`
        `“[Random motivational quote]”`
    -   5 AI Chat Interface logo buttons (**ChatGPT**, **Gemini**, **Claude**, **Grok**, **Copilot**) are displayed and open their respective chat URLs when clicked.

------------------------------------------------------------------------

## US-09 --- Privacy

### Acceptance

-   Health data is not persisted to browser storage (`localStorage`, `sessionStorage`, `IndexedDB`, or cookies).
-   `Hapus Sesi` or `Mulai Lagi` removes all runtime state.
-   Refresh discards runtime data.
-   No analytics event contains health data.
