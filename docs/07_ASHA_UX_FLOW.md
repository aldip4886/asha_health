# ASHA UX Flow

**Version:** 1.7

## 1. Entry

``` text
ASHA
↓
Start
↓
Personal Information
```

## 2. Sex Interaction

``` text
Jenis Kelamin

○ Laki-laki
○ Perempuan
○ Prefer tidak menyebutkan
```

Immediately after selection:

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
│                                             │
│       ASHA content                          │
│                                             │
│                              PERSONA        │
│                              ↓              │
│                         lower-right         │
└─────────────────────────────────────────────┘
```

## 4. Wizard

``` text
Personal
→ Health
→ Health Report
→ Goal
→ Target
→ Timeframe
→ Schedule
→ Equipment
→ Diet
→ Plan Type
→ Calendar
→ Exercise Preferences
→ Review
→ Confirm
→ Generate Prompt
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

## 6. Review Screen

Show:

``` text
PERSONAL
Health
Goal
Target
Schedule
Equipment
Diet
Plan Type
Personalization
Assumptions
Safety
```

Personalization panel:

``` text
Visual persona:
Female active companion

Planning context:
Sex will be used as contextual information.
No sex-based training stereotype will be applied.

Additional physiological information:
Not provided / Not required
```

## 7. Confirmation

Checkbox:

> Saya telah memeriksa informasi dan asumsi yang akan digunakan untuk
> membuat prompt.

Button:

> Generate Master Prompt

Disabled until checked.

## 8. Responsive Behavior

On mobile:

-   preserve persona visibility;
-   reduce image scale;
-   retain readable content;
-   avoid covering form controls;
-   allow background image to crop gracefully.

The persona is decorative and should never reduce form usability.
