import { layout, radius, spacing } from './spacing';
import { shadows } from './shadows';
import { typography } from './typography';

export const colors = {
  background: '#FBF5EE',
  backgroundAlt: '#F6EFE6',
  surface: '#FFFDF9',
  surfaceSoft: '#F7EEE4',
  surfaceSea: '#E7F5EF',
  surfaceSky: '#EAF6FB',
  surfaceSun: '#FFF4D8',
  surfaceCoral: '#FFF0EA',
  border: '#E8DCCC',
  borderStrong: '#D9C7B2',
  text: '#17211D',
  textMuted: '#62706A',
  textSubtle: '#8A938E',
  primary: '#11745E',
  primaryHover: '#0D604E',
  primarySoft: '#DDF2EA',
  primaryText: '#FFFFFF',
  sea: '#11745E',
  coral: '#EA6B5D',
  coralSoft: '#FFE0DA',
  sun: '#F2B84B',
  sunSoft: '#FFF4D8',
  sky: '#67B7DC',
  skySoft: '#EAF6FB',
  success: '#14885F',
  successSoft: '#E5F6EC',
  warning: '#B77711',
  warningSoft: '#FFF2CC',
  danger: '#B33A32',
  dangerSoft: '#FDE7E4',
  info: '#26799D',
  infoSoft: '#E7F5FB',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(23, 33, 29, 0.36)',
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  layout,
  shadows,
  typography,
} as const;

export type Theme = typeof theme;
