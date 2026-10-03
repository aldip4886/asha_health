import { SexSelection, VisualPersonaType } from './types';

export interface ResolvedVisualPersona {
  type: VisualPersonaType;
  asset: string;
  labelEn: string;
  labelId: string;
}

export function resolveVisualPersona(sex: SexSelection | null): ResolvedVisualPersona {
  if (sex === 'male') {
    return {
      type: 'female_active',
      asset: '',
      labelEn: 'Female active companion',
      labelId: 'Pendamping aktif perempuan'
    };
  }

  if (sex === 'female') {
    return {
      type: 'male_active',
      asset: '',
      labelEn: 'Male active companion',
      labelId: 'Pendamping aktif laki-laki'
    };
  }

  return {
    type: 'neutral',
    asset: '',
    labelEn: 'Neutral ASHA theme',
    labelId: 'Tema netral ASHA'
  };
}

export function applyPersonaBackgroundToDom(sex: SexSelection | null): ResolvedVisualPersona {
  const persona = resolveVisualPersona(sex);

  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--asha-persona-background', 'none');
    document.body.style.backgroundImage = 'none';
  }

  return persona;
}
