import { layout, radius, spacing } from './spacing';
import { shadows } from './shadows';
import { typography } from './typography';

export const colors = {
  background: '#F2EADB',
  backgroundAlt: '#F7EFE0',
  surface: '#FFFDF8',
  surfaceSoft: '#FBF5E9',
  surfaceSea: '#D9EAE5',
  surfaceSky: '#EAF6F8',
  surfaceSun: '#FFF2D3',
  surfaceCoral: '#FCE9DF',
  border: '#E3D5C1',
  borderStrong: '#CDBAA2',
  text: '#1F2A2E',
  textMuted: '#5E6B69',
  textSubtle: '#8B938F',
  primary: '#2E7A6F',
  primaryHover: '#24655C',
  primarySoft: '#D9EAE5',
  primaryText: '#FFFFFF',
  sea: '#2E7A6F',
  coral: '#E58A6F',
  coralSoft: '#FCE9DF',
  sun: '#E8B958',
  sunSoft: '#FFF2D3',
  sky: '#7CB1C4',
  skySoft: '#EAF6F8',
  success: '#2E7A6F',
  successSoft: '#E5F4EC',
  warning: '#A36F13',
  warningSoft: '#FFF2D3',
  danger: '#B33A32',
  dangerSoft: '#FDE7E4',
  info: '#4A8798',
  infoSoft: '#EAF6F8',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(31, 42, 46, 0.36)',
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
