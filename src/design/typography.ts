export const fontFamily = {
  sans: undefined,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.sans,
    fontSize: 34,
    fontWeight: fontWeight.heavy,
    lineHeight: 40,
    letterSpacing: 0,
  },
  title: {
    fontFamily: fontFamily.sans,
    fontSize: 28,
    fontWeight: fontWeight.heavy,
    lineHeight: 34,
    letterSpacing: 0,
  },
  subtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 22,
    fontWeight: fontWeight.bold,
    lineHeight: 28,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: fontWeight.regular,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyStrong: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: fontWeight.semibold,
    lineHeight: 24,
    letterSpacing: 0,
  },
  label: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: fontWeight.regular,
    lineHeight: 18,
    letterSpacing: 0,
  },
  eyebrow: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: fontWeight.heavy,
    lineHeight: 16,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
} as const;
