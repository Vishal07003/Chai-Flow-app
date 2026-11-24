// Chai Flow Executive Ledger Design System - Typography

export const fontFamilies = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  black: 'Inter-Black',
};

export const typography = {
  // Display: 28px / 32px / 800
  display: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  // Heading 1: 20px / 26px / 700
  heading1: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  // Heading 2: 16px / 22px / 600
  heading2: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  // Metric Label: 13px / 18px / 600
  metricLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  // Body: 14px / 20px / 400
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  // Caption: 12px / 16px / 400
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
  // Badge: 11px / 14px / 600
  badge: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
};

// Backward-compatible fonts export
export const fonts = {
  ...fontFamilies,
  sizes: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    title: 28,
  },
};

export default typography;
