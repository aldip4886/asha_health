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

1.  Dynamic persona background after sex selection.
2.  Male user → female active-person persona background.
3.  Female user → male active-person persona background.
4.  Unspecified/prefer-not-to-say → neutral background.
5.  Sex-aware training personalization.
6.  Sex-aware nutrition/meal personalization.
7.  Physiological context is considered only when relevant.
8.  No sex-based stereotyping in training intensity, calorie
    restriction, or diet selection.
9.  Conditional follow-up questions only when additional physiological
    information is relevant.
10. Clear separation between **visual personalization** and
    **health-plan personalization**.

## Core Principle

> ASHA adapts to the user without reducing the user to a demographic
> category.

Sex is a contextual variable. Training and nutrition remain primarily
driven by goals, health information, age, body measurements, fitness
level, training history, schedule, equipment, diet, recovery, and
relevant physiological factors.
