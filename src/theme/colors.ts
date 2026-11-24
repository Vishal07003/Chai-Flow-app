// Chai Flow Theme Tokens - Authentic Brown / Chai Design System

export const colors = {
  // Primary Chai / Brown Brand Identity (Single Source of Truth)
  primary: '#8C331A',
  primaryLight: '#B74A21',
  primaryDark: '#662210',
  primaryBg: '#FDEBE4',
  primaryBorder: '#F5C6B8',
  primaryContainer: '#662210',
  onPrimary: '#FFFFFF',

  // Accent & Brand Colors
  accent: '#7A2E19',
  chaiAccent: '#8C331A',
  brandChai: '#8C331A',
  brandChaiLight: '#B74A21',
  brandChaiDark: '#662210',
  brandChaiBg: '#FDEBE4',
  brandChaiBorder: '#F5C6B8',

  // Surfaces & Backgrounds (Warm light off-white and pure white cards)
  surface: '#FAF8F5',
  surfaceContainer: '#FFFFFF',
  surfaceContainerLow: '#F7EFE9',
  surfaceDim: '#EFEAE4',
  background: '#FAF8F5',
  cardBackground: '#FFFFFF',
  border: '#EFEAE4',
  borderLight: '#F5EFE9',
  borderDark: '#D8CEC4',

  // Typography & Neutrals
  textPrimary: '#1E1E1E',
  textSecondary: '#6B5E55',
  secondaryText: '#6B5E55',
  textMuted: '#8E8278',
  textInverse: '#FFFFFF',
  white: '#FFFFFF',
  black: '#1E1E1E',

  gray50: '#FAF8F5',
  gray100: '#F5EFE9',
  gray200: '#EFEAE4',
  gray300: '#D8CEC4',
  gray400: '#8E8278',
  gray500: '#6B5E55',
  gray600: '#4A3E36',
  gray700: '#332219',
  gray800: '#231610',
  gray900: '#140B07',

  // Status Colors (Preserved semantics across Owner & Delivery Partner)
  approved: '#047857',
  approvedBackground: '#ECFDF5',
  success: '#059669',
  successBg: '#ECFDF5',

  pending: '#D97706',
  pendingBackground: '#FFFBEB',
  warning: '#D97706',
  warningBg: '#FFFBEB',

  correction: '#DC2626',
  correctionBackground: '#FEF2F2',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',

  info: '#0284C7',
  infoBackground: '#F0F9FF',
};

// Admin / Owner Theme Tokens
export const adminTheme = {
  primary: '#8C331A',
  primaryLight: '#B74A21',
  primaryDark: '#662210',
  primaryBg: '#FDEBE4',
  primaryBorder: '#F5C6B8',
  badgeBg: '#F7EFE9',
  accent: '#7A2E19',
  text: '#7A2E19',
  chaiAccent: '#8C331A',
};

// Delivery Partner Theme Tokens (Unified with Chai Flow Brand)
export const deliveryTheme = {
  primary: '#8C331A',
  primaryLight: '#B74A21',
  primaryDark: '#662210',
  primaryBg: '#FDEBE4',
  primaryBorder: '#F5C6B8',
  badgeBg: '#F7EFE9',
  accent: '#7A2E19',
  text: '#7A2E19',
  // Specific operational status indicators
  deliverySuccess: '#047857',
  deliverySuccessBg: '#ECFDF5',
};

export default colors;
