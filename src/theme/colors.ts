// Admin / Network Owner Theme Tokens
export const adminTheme = {
  primary: '#8C331A',
  primaryLight: '#B74A21',
  primaryDark: '#662210',
  primaryBg: '#FDEBE4',
  primaryBorder: '#F5C6B8',
  badgeBg: '#F7EFE9',
  accent: '#7A2E19',
  text: '#7A2E19',
};

// Delivery Partner Theme Tokens
export const deliveryTheme = {
  primary: '#059669',
  primaryLight: '#10B981',
  primaryDark: '#047857',
  primaryBg: '#ECFDF5',
  primaryBorder: '#A7F3D0',
  badgeBg: '#ECFDF5',
  accent: '#047857',
  text: '#047857',
};

// Global Unified Color Palette
export const colors = {
  // Role Specific Tokens
  admin: adminTheme,
  delivery: deliveryTheme,

  // Primary Default (Admin Brand)
  primary: '#8C331A',
  primaryLight: '#B74A21',
  primaryDark: '#662210',
  secondary: '#F8F8F8',

  // Status & Functional Colors
  success: '#059669',
  successBg: '#ECFDF5',
  danger: '#D32F2F',
  dangerBg: '#FEF2F2',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  info: '#2563EB',
  infoBg: '#EFF6FF',
  pending: '#F59E0B',
  completed: '#10B981',

  // Base Neutrals
  white: '#FFFFFF',
  black: '#111827',
  gray50: '#FAF8F5',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Aliases for layout & screens
  gray: '#888888',
  grayLight: '#EFEAE4',
  grayDark: '#4A4A4A',
  background: '#FAF8F5',
  cardBackground: '#FFFFFF',
  surface: '#FFFFFF',

  // Typography
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E5E7EB',
  borderLight: '#EFECE8',
  borderDark: '#D1D5DB',
};

export default colors;
