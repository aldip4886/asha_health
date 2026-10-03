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
      asset: 'pics/Hijabi Athlete in Mauve Activewear.png',
      labelEn: 'Female active companion',
      labelId: 'Pendamping aktif perempuan'
    };
  }

  if (sex === 'female') {
    return {
      type: 'male_active',
      asset: 'pics/Modern Activewear Duo in White Studio.png',
      labelEn: 'Male active companion',
      labelId: 'Pendamping aktif laki-laki'
    };
  }

  return {
    type: 'neutral',
    asset: 'pics/Minimalist Fitness Portrait with Negative Space.png',
    labelEn: 'Neutral ASHA studio background',
    labelId: 'Latar netral ASHA'
  };
}

export function applyPersonaBackgroundToDom(sex: SexSelection | null): ResolvedVisualPersona {
  const persona = resolveVisualPersona(sex);

  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty(
      '--asha-persona-background',
      `url("${persona.asset}")`
    );
    document.body.classList.add('persona-transition');
    setTimeout(() => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('persona-transition');
      }
    }, 400);
  }

  return persona;
}
