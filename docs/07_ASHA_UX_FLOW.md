# ASHA UX Flow

**Version:** 1.7

## 1. Entry & Global Shell

-   **Theme**: Dominant **White & Orange** (`#ffffff` surface, `#f97316` / `#ea580c` accents).
-   **Global Header**: ASHA brand emblem, title & subtitle, privacy badge (`100% Memori Runtime`), and `Hapus Sesi` button.
-   **Global Footer**: Privacy guarantee and medical disclaimer across all wizard steps.
-   **Dual Navigation Bars**: Steps 1–6 provide both **Top** and **Bottom** navigation bars (`Sebelumnya` / `Selanjutnya`) so users never need to scroll back to the top after completing a form.

``` text
ASHA Header
↓
Step 1/7: Profil Pribadi ("What should I call you?", Usia, Tinggi, Berat, Jenis Kelamin, Etnis)
```

## 2. Sex & Ethnicity Interaction (Step 1/7)

``` text
What should I call you?
[ Nama panggilan Anda ]

Jenis Kelamin
○ Laki-laki
○ Perempuan
○ Prefer tidak menyebutkan

Etnis
[ Pilih Etnis: Asian | Kaukasian | American | Latin | Indian | Other ]
```

Immediately after sex selection:

``` text
Male
→ Female active persona

Female
→ Male active persona

Unspecified
→ Neutral ASHA background
```

## 3. Visual Composition

The persona image occupies the background/lower-right region.

The main content area remains readable against the white negative space.

Recommended composition:

``` text
┌─────────────────────────────────────────────┐
│  ASHA Header (White & Orange)               │
├─────────────────────────────────────────────┤
│  [Top Wizard Navigation Bar]                │
│                                             │
│       ASHA Step Content                     │
│                                             │
│                              PERSONA        │
│                              ↓              │
│                         lower-right         │
│  [Bottom Wizard Navigation Bar]             │
├─────────────────────────────────────────────┤
│  ASHA Footer (Privacy & Medical Notice)     │
└─────────────────────────────────────────────┘
```

## 4. 7-Step Wizard Sequence

``` text
Step 1/7: Profil Pribadi (Nickname, Age, Sex, Ethnicity, Height, Weight)
→ Step 2/7: Unggah Hasil Tes Kesehatan (Client-Side OCR Upload)
→ Step 3/7: Ringkasan Kesehatan Otoritatif (Pre-filled from OCR + Conditional Questions)
→ Step 4/7: Aspirasi, Target & Jangka Waktu (Staged Disclosure: Aspiration → Sub-Target → Timeframe Weeks)
→ Step 5/7: Jadwal, Jenis Latihan, Peralatan & Pola Diet (3 Session Blocks separated by 2 <hr> dividers)
    ├── Session 1: Hari Latihan (+ Pilih Semua / Select All disabling Hari Istirahat), Hari Istirahat, Jenis Latihan (Cardio, Strength, Mobility & Flexibility), Peralatan yang Tersedia (Tidak Ada / Bodyweight, Dumbbells, Barbell, Fitness Ball, Treadmil / Walking Pad)
    ├── Session 2: Waktu Pilihan Latihan (<input type="time">) & Durasi Sesi (menit)
    └── Session 3: Pola Diet (+ conditional Protokol IF & Jendela Makan)
→ Step 6/7: Jenis Rencana, Tanggal Mulai Plan (<input type="date">) & Pilihan Kalender (Google, Outlook, Apple)
→ Step 7/7: Tinjauan, Konfirmasi, Auto-Copy Popup & Pilih AI Chat Interface
```

## 5. Conditional Personalization

After core information is available:

``` text
Sex
+
Goal
+
Health Context
+
Requested Plan
        ↓
Is additional physiological context relevant?
        ↓
Yes → ask minimal relevant question
No  → continue
```

Never ask questions simply because the user selected a sex.

## 6. Step 7/7 Review, Auto-Copy Popup & Multi-AI Handoff

Step 7/7 Navigation:

-   Standard `Selanjutnya` buttons are removed and replaced with **"Sebelumnya"** and **"Mulai Lagi"**.

Review Screen Summary:

``` text
Profil Pribadi (Nickname, Usia, Jenis Kelamin, Etnis, Tinggi, Berat)
Indikator Kesehatan (Step 2 OCR & Step 3 Otoritatif)
Aspirasi, Target Spesifik & Jangka Waktu (Step 4)
Jadwal, Jenis Latihan, Peralatan, Waktu Latihan & Pola Diet (Step 5)
Jenis Rencana, Tanggal Mulai Plan & Pilihan Kalender (Step 6)
Konteks Personalisasi & Asumsi Sistem
```

Confirmation Checkbox (only interactive control shown after the review statement):

> Saya telah memeriksa informasi dan asumsi yang akan digunakan untuk
> membuat prompt.

When the user checks the confirmation checkbox:

1.  The Master Prompt is **not** displayed on screen; it is **automatically copied to the user's clipboard**.
2.  A **Pop-Up Message (`role="dialog"`)** is displayed:
    ``` text
    Selamat [nama_pengguna], prompt kamu sudah siap!
    Silakan klik AI Chat Interface favoritmu untuk membuat plan.
    “[Random motivational quote]”
    ```
3.  Five **AI Chat Interface logo buttons** are rendered so the user can immediately open their preferred AI assistant in a new tab:
    -   **ChatGPT** (`https://chatgpt.com/`)
    -   **Gemini** (`https://gemini.google.com/`)
    -   **Claude** (`https://claude.ai/`)
    -   **Grok** (`https://grok.com/`)
    -   **Copilot** (`https://copilot.microsoft.com/`)

## 7. Responsive Behavior

On mobile:

-   preserve persona visibility;
-   reduce image scale;
-   retain readable content;
-   avoid covering form controls;
-   allow background image to crop gracefully.

The persona is decorative and should never reduce form usability.
