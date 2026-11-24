// Chai Flow Design System - Component Standards (Brown / Chai Brand)
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import colors from './colors';
import typography from './typography';
import spacing from './spacing';
import radius from './radius';
import shadows from './shadows';

export const components = StyleSheet.create({
  // Primary Button: Height 52px, Background #8C331A, Text white, Radius 12px
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary, // #8C331A
    borderRadius: radius.LG,
    paddingHorizontal: spacing.XL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  } as ViewStyle,
  primaryButtonText: {
    ...typography.heading2,
    color: colors.onPrimary,
    fontWeight: '600',
  } as TextStyle,

  // Secondary Button: Height 44-48px, White / warm background, Border #EFEAE4
  secondaryButton: {
    height: 48,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.LG,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.LG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  secondaryButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  } as TextStyle,

  // Cards: White background, 16px padding, 12px radius, subtle elevation
  card: {
    backgroundColor: colors.surfaceContainer,
    padding: spacing.LG,
    borderRadius: radius.LG,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  } as ViewStyle,

  // Badge Base
  badge: {
    paddingHorizontal: spacing.SM,
    paddingVertical: spacing.XS,
    borderRadius: radius.FULL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  badgeApproved: {
    backgroundColor: colors.approvedBackground,
  } as ViewStyle,
  badgeApprovedText: {
    ...typography.badge,
    color: colors.approved,
  } as TextStyle,
  badgePending: {
    backgroundColor: colors.pendingBackground,
  } as ViewStyle,
  badgePendingText: {
    ...typography.badge,
    color: colors.pending,
  } as TextStyle,
  badgeCorrection: {
    backgroundColor: colors.correctionBackground,
  } as ViewStyle,
  badgeCorrectionText: {
    ...typography.badge,
    color: colors.correction,
  } as TextStyle,
  badgeInfo: {
    backgroundColor: colors.infoBackground,
  } as ViewStyle,
  badgeInfoText: {
    ...typography.badge,
    color: colors.info,
  } as TextStyle,
});

export default components;
