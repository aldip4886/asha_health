import {
  BiomarkerKey,
  ExtractedBiomarker,
  ExtractionConfidence,
  OcrAdapter,
  OcrExtractionResult
} from './types';

interface BiomarkerPattern {
  key: BiomarkerKey;
  lineRegex: RegExp;
  valueRegex: RegExp;
  defaultUnit: string;
}

const BIOMARKER_PATTERNS: BiomarkerPattern[] = [
  {
    key: 'bloodPressure',
    lineRegex: /(?:tekanan\s*darah|blood\s*pressure|\bbp\b)\s*[:=-]?\s*([^\r\n]+)/i,
    valueRegex: /(\d{2,3}\s*\/\s*\d{2,3})(?:\s*(mmhg))?/i,
    defaultUnit: 'mmHg'
  },
  {
    key: 'restingHeartRate',
    lineRegex:
      /(?:denyut\s*nadi|detak\s*jantung(?:\s*istirahat)?|resting\s*heart\s*rate|\brhr\b|heart\s*rate)\s*[:=-]?\s*([^\r\n]+)/i,
    valueRegex: /(\d{2,3})(?:\s*(bpm|x\/menit))?/i,
    defaultUnit: 'bpm'
  },
  {
    key: 'bloodGlucose',
    lineRegex: /(?:glukosa(?:\s*puasa|\s*darah)?|gula\s*darah|blood\s*glucose|fasting\s*glucose)\s*[:=-]?\s*([^\r\n]+)/i,
    valueRegex: /(\d{2,3}(?:\.\d+)?)(?:\s*(mg\/dl|mmol\/l))?/i,
    defaultUnit: 'mg/dL'
  },
  {
    key: 'uricAcid',
    lineRegex: /(?:asam\s*urat|uric\s*acid)\s*[:=-]?\s*([^\r\n]+)/i,
    valueRegex: /(\d{1,2}(?:\.\d+)?)(?:\s*(mg\/dl))?/i,
    defaultUnit: 'mg/dL'
  },
  {
    key: 'totalCholesterol',
    lineRegex: /(?:kolesterol\s*total|total\s*cholesterol)\s*[:=-]?\s*([^\r\n]+)/i,
    valueRegex: /(\d{2,3}(?:\.\d+)?)(?:\s*(mg\/dl))?/i,
    defaultUnit: 'mg/dL'
  },
  {
    key: 'ldl',
    lineRegex: /\bldl(?:\s*[-:]?\s*cholesterol|\s*kolesterol)?\s*[:=-]?\s*([^\r\n]+)/i,
    valueRegex: /(\d{2,3}(?:\.\d+)?)(?:\s*(mg\/dl))?/i,
    defaultUnit: 'mg/dL'
  },
  {
    key: 'hdl',
    lineRegex: /\bhdl(?:\s*[-:]?\s*cholesterol|\s*kolesterol)?\s*[:=-]?\s*([^\r\n]+)/i,
    valueRegex: /(\d{2,3}(?:\.\d+)?)(?:\s*(mg\/dl))?/i,
    defaultUnit: 'mg/dL'
  },
  {
    key: 'triglycerides',
    lineRegex: /(?:trigliserida|triglycerides)\s*[:=-]?\s*([^\r\n]+)/i,
    valueRegex: /(\d{2,3}(?:\.\d+)?)(?:\s*(mg\/dl))?/i,
    defaultUnit: 'mg/dL'
  }
];

function classifyConfidence(
  hasNormalizedValue: boolean,
  hasExplicitUnit: boolean,
  overallConfidenceScore = 85
): ExtractionConfidence {
  if (!hasNormalizedValue) {
    return 'Unable to determine';
  }
  if (overallConfidenceScore >= 80 && hasExplicitUnit) {
    return 'High confidence';
  }
  return 'Review recommended';
}

export function parseHealthReportText(
  rawText: string,
  confidenceScore = 85
): Record<BiomarkerKey, ExtractedBiomarker | null> {
  const result: Record<BiomarkerKey, ExtractedBiomarker | null> = {
    bloodPressure: null,
    restingHeartRate: null,
    bloodGlucose: null,
    uricAcid: null,
    totalCholesterol: null,
    ldl: null,
    hdl: null,
    triglycerides: null
  };

  for (const pattern of BIOMARKER_PATTERNS) {
    const lineMatch = rawText.match(pattern.lineRegex);
    if (!lineMatch) continue;

    const segment = lineMatch[1].trim();
    const valueMatch = segment.match(pattern.valueRegex);

    if (!valueMatch) {
      result[pattern.key] = {
        key: pattern.key,
        rawText: segment,
        normalizedValue: null,
        confidence: 'Unable to determine',
        fieldState: 'requires_confirmation'
      };
      continue;
    }

    const numericPart = valueMatch[1].replace(/\s+/g, '');
    const explicitUnit = valueMatch[2];
    const unit = explicitUnit ? pattern.defaultUnit : pattern.defaultUnit;
    const normalizedValue = `${numericPart} ${unit}`;

    result[pattern.key] = {
      key: pattern.key,
      rawText: segment,
      normalizedValue,
      confidence: classifyConfidence(true, Boolean(explicitUnit), confidenceScore),
      fieldState: 'requires_confirmation'
    };
  }

  return result;
}

export const defaultTesseractOcrAdapter: OcrAdapter = async (
  file: File | Blob | string
): Promise<OcrExtractionResult> => {
  const { recognize } = await import('tesseract.js');
  const response = await recognize(file, 'eng+ind');
  return {
    rawText: response.data.text ?? '',
    confidenceScore: response.data.confidence ?? 80
  };
};
