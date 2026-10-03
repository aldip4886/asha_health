# ASHA Data & State Schema

**Version:** 1.7

## 1. Personal (`Step 1/7`)

``` json
{
  "nickname": "string | null",
  "age": "number | null",
  "sex": "male | female | unspecified",
  "ethnicity": "Asian | Kaukasian | American | Latin | Indian | Other | null",
  "heightCm": "number | null",
  "weightKg": "number | null"
}
```

## 2. Health Report OCR (`Step 2/7`) & Authoritative Health Snapshot (`Step 3/7`)

``` json
{
  "healthReportOcr": {
    "extractedValues": {},
    "unreadableFields": []
  },
  "healthSnapshot": {
    "bloodPressureSystolic": null,
    "bloodPressureDiastolic": null,
    "fastingGlucose": null,
    "uricAcid": null,
    "totalCholesterol": null,
    "ldl": null,
    "hdl": null,
    "triglycerides": null,
    "restingHeartRate": null,
    "conditions": [],
    "medications": [],
    "injuriesOrLimitations": [],
    "menstrualOrPregnancyContext": null
  }
}
```

## 3. Staged Goals, Target & Timeframe (`Step 4/7`)

``` json
{
  "aspiration": "build_muscle | fat_loss | weight_loss | improve_mobility | running_performance | health_indicator | null",
  "targetDescription": "string | null",
  "muscleMassPercent": "number | null",
  "fatPercent": "number | null",
  "targetWeightKg": "number | null",
  "runningDistance": "5K | 10K | Half Marathon | Full Marathon | null",
  "targetPace": "string | null",
  "healthIndicatorName": "string | null",
  "healthIndicatorTarget": "string | null",
  "timeframeWeeks": "number | null"
}
```

## 4. Schedule, Training Types, Equipment & Diet (`Step 5/7`)

``` json
{
  "trainingDays": ["Senin", "Rabu", "Jumat"],
  "restDays": ["Selasa", "Kamis", "Sabtu", "Minggu"],
  "trainingTypes": ["Cardio", "Strength", "Mobility & Flexibility"],
  "sessionDurationMinutes": 45,
  "preferredTrainingTime": "06:30",
  "equipment": [
    "Tidak Ada (Gunakan Bodyweight)",
    "Dumbbells",
    "Barbell",
    "Fitness Ball",
    "Treadmil / Walking Pad"
  ],
  "dietPattern": "no_specific_diet | vegan | vegetarian | carnivore | keto | intermittent_fasting",
  "ifProtocol": "12:12 | 14:10 | 16:8 | 18:6 | custom | null",
  "eatingWindow": "string | null"
}
```

## 5. Plan Preferences & Calendar (`Step 6/7`)

``` json
{
  "planType": "training_only | meal_only | integrated",
  "planStartDate": "YYYY-MM-DD | null",
  "calendarProvider": "google | outlook | apple",
  "exerciseVisualMode": "external_reference | ai_illustration | video_reference | text_fallback"
}
```

## 6. Personalization & Confirmation (`Step 7/7`)

``` json
{
  "personalization": {
    "visualPersona": "male_active | female_active | neutral",
    "sexSpecificFactors": [],
    "trainingConsiderations": [],
    "nutritionConsiderations": [],
    "conditionalQuestions": []
  },
  "assumptions": [],
  "confirmedByUser": false
}
```

## 7. Field State

Every important field may have:

``` text
provided
missing
ai_assumption
not_applicable
requires_confirmation
```

## 8. Privacy

This object exists only in runtime memory (`src/state/runtime-state.ts`) during the MVP session.

Any mutation to steps 1–6 automatically resets `confirmedByUser` to `false`. It must never be serialized to browser persistence (`localStorage`, `sessionStorage`, `IndexedDB`, or cookies).
