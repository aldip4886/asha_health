# ASHA Documentation Index

**Product:** ASHA --- Personal Health Companion\
**Documentation Version:** 1.7\
**Update:** Sex-aware personalization + dynamic persona background

## Document Set

  ------------------------------------------------------------------------------
  File                                       Purpose
  ------------------------------------------ -----------------------------------
  `01_ASHA_PRD.md`                           Master Product Requirements
                                             Document

  `02_ASHA_MVP_SCOPE.md`                     MVP scope and release boundaries

  `03_ASHA_USER_STORIES_ACCEPTANCE.md`       User stories and acceptance
                                             criteria

  `04_ASHA_PRODUCT_TECHNICAL_GUIDE.md`       Single-file HTML architecture and
                                             implementation guidance

  `05_ASHA_DATA_STATE_SCHEMA.md`             Runtime state and data model

  `06_ASHA_MASTER_PROMPT_SPECIFICATION.md`   Gemini master-prompt specification

  `07_ASHA_UX_FLOW.md`                       Wizard, personalization, background
                                             and review flow

  `08_ASHA_CHANGELOG.md`                     Version history and v1.7 changes
  ------------------------------------------------------------------------------

## v1.7 Change Summary

ASHA now supports:

1.  Dynamic persona background after sex selection (`male` → female active companion, `female` → male active companion, `unspecified` → neutral background).
2.  Dominant White & Orange visual theme with professional Header & Footer across all steps, plus top and bottom wizard navigation bars.
3.  Preferred user nickname (`What should I call you?`) and structured ethnic group selection (`Asian`, `Kaukasian`, `American`, `Latin`, `Indian`, `Other`) in Step 1/7.
4.  Client-side Health Report OCR Upload in Step 2/7 before the authoritative Health Snapshot in Step 3/7.
5.  Progressive, staged Aspiration → Sub-Target → Timeframe disclosure in Step 4/7 (Muscle Mass %, Fat Percentage %, Target Weight Kg, Running Distance + Target Pace, Health Indicator + Target Value).
6.  Step 5/7 structured into 3 session blocks separated by dividers:
    - Training Days checkboxes with `Pilih Semua (Select All)` (automatically disabling/greying out Rest Days), Rest Days checkboxes, Training Types multiple-select checkboxes (`Cardio`, `Strength`, `Mobility & Flexibility`), and Available Equipment checkboxes (`Tidak Ada (Gunakan Bodyweight)`, `Dumbbells`, `Barbell`, `Fitness Ball`, `Treadmil / Walking Pad`);
    - Preferred Training Time (`<input type="time">` time picker) and Session Duration;
    - Diet Preference with conditional Intermittent Fasting protocol and eating window fields.
7.  Step 6/7 with Plan Start Date (`<input type="date">` date picker), Calendar Platform (`Google`, `Outlook`, `Apple`), Exercise Visual Reference Mode, and Conditional Physiological Questions.
8.  Step 7/7 Mandatory Review with navigation replaced by **"Sebelumnya"** and **"Mulai Lagi"**, hidden prompt text, automatic clipboard copy upon confirmation, a personalized pop-up dialog (`Selamat [nama_pengguna], prompt kamu sudah siap!` + random motivational quote), and direct launch buttons with logos for **ChatGPT**, **Gemini**, **Claude**, **Grok**, and **Copilot**.
9.  Master Prompt instructing Generative AI to output a day-by-day Training & Meal Plan across the entire target timeframe, a comprehensive Exercise Movement Guide (`fungsi/manfaat gerakan`, `otot yang dilatih`, `repetisi`, `cara melakukan gerakan`, and `contoh/gambar gerakan` from `darebee.com`), and RFC 5545 `.ics` calendar blocks.
10. Clear separation between **visual personalization** and **health-plan personalization**.

## Core Principle

> ASHA adapts to the user without reducing the user to a demographic
> category.

Sex is a contextual variable. Training and nutrition remain primarily
driven by goals, health information, age, body measurements, fitness
level, training history, schedule, training types, equipment, diet,
recovery, and relevant physiological factors.
