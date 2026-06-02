/**
 * Plantir — tokens de color
 *
 * Sunset Coral (primary) + Trail Teal (secondary) + Sun Yellow (accent).
 * Paleta warm-gray para neutrals (nunca gris puro).
 *
 * Referencia: docs/01-ux/design-system.md §2.1.
 */

export const primary = {
  50: '#FFF4F0',
  100: '#FFE0D2',
  200: '#FFC2A6',
  400: '#FF8862',
  500: '#F2602D', // Default primary (CTAs, links, iconos activos)
  600: '#D9481C',
  700: '#A5370F',
} as const;

export const secondary = {
  50: '#EEFBF7',
  100: '#D0F5E9',
  300: '#7DDBC5',
  500: '#0EAA8A', // Default secondary
  700: '#06604D',
} as const;

export const accent = {
  300: '#FFD15C',
  500: '#F5B700',
} as const;

export const neutral = {
  0: '#FFFFFF',
  50: '#FAF7F4',
  100: '#F2EDE7',
  200: '#E3DCD2',
  400: '#A99E91',
  600: '#6B6258',
  800: '#332E27',
  900: '#1F1B16',
  950: '#0F0D0A',
} as const;

export const success = {
  DEFAULT: '#1A8F5C',
  light: '#3FBF85',
} as const;

export const warning = {
  DEFAULT: '#C77A02',
  light: '#E69A2B',
} as const;

export const danger = {
  DEFAULT: '#C53030',
  light: '#F26A6A',
} as const;

export const info = {
  DEFAULT: '#1F6FEB',
  light: '#5C9CF2',
} as const;

export const surface = {
  base: neutral[50],
  raised: neutral[0],
  sunken: neutral[100],
  'base-dark': neutral[950],
  'raised-dark': neutral[900],
  'sunken-dark': '#0A0806',
} as const;

export const overlay = {
  light: 'rgba(31,27,22,0.45)',
  dark: 'rgba(0,0,0,0.6)',
} as const;
