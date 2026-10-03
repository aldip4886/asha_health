# ASHA Data & State Schema

**Version:** 1.7

## 1. Personal

``` json
{
  "age": null,
  "sex": "male | female | unspecified",
  "ethnicity": null,
  "height": null,
  "weight": null
}
```

## 2. Personalization

``` json
{
  "visualPersona": "male_active | female_active | neutral",
  "sexSpecificFactors": [],
  "trainingConsiderations": [],
  "nutritionConsiderations": [],
  "conditionalQuestions": [],
  "confirmed": false
}
```

## 3. Field State

Every important field may have:

``` text
provided
missing
ai_assumption
not_applicable
requires_confirmation
```

## 4. Example

``` json
{
  "personal": {
    "age": 35,
    "sex": "female",
    "height": 165,
    "weight": 68
  },
  "personalization": {
    "visualPersona": "male_active",
    "sexSpecificFactors": [],
    "trainingConsiderations": [],
    "nutritionConsiderations": [],
    "conditionalQuestions": [],
    "confirmed": false
  }
}
```

## 5. Privacy

This object exists only in runtime memory during the MVP session.

It must not be serialized to browser persistence.
