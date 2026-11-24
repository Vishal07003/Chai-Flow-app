import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, radius, spacing, typography, fontFamilies } from '../../theme';

export interface CardProps {
  title?: string;
  subtitle?: string;
  avatarUrl?: string;
  initials?: string;
  icon?: string;
  iconColor?: string;
  iconBgColor?: string;
  badge?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  amount?: string | number;
  amountColor?: string;
  amountSubtext?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: TextStyle;
}

export default function Card({
  title,
  subtitle,
  avatarUrl,
  initials,
  icon,
  iconColor = colors.primary,
  iconBgColor = colors.surfaceContainerLow,
  badge,
  badgeBgColor = colors.correctionBackground,
  badgeTextColor = colors.correction,
  amount,
  amountColor = colors.primary,
  amountSubtext,
  onPress,
  rightElement,
  children,
  style,
  titleStyle,
}: CardProps) {
  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      style={[styles.card, style]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.contentRow}>
        {/* Leading Avatar/Icon */}
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : initials ? (
          <View style={[styles.avatarFallback, { backgroundColor: iconBgColor }]}>
            <Text style={[styles.avatarInitials, { color: iconColor }]}>
              {initials}
            </Text>
          </View>
        ) : icon ? (
          <View style={[styles.avatarFallback, { backgroundColor: iconBgColor }]}>
            <Ionicons name={icon} size={22} color={iconColor} />
          </View>
        ) : null}

        {/* Middle Info */}
        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            {title ? (
              <Text style={[styles.title, titleStyle]} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {badge ? (
              <View style={[styles.badge, { backgroundColor: badgeBgColor }]}>
                <Text style={[styles.badgeText, { color: badgeTextColor }]}>
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>

          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right Info */}
        {amount !== undefined || rightElement ? (
          <View style={styles.rightCol}>
            {amount !== undefined ? (
              <Text style={[styles.amountText, { color: amountColor }]}>
                {typeof amount === 'number' ? `₹${amount.toLocaleString()}` : amount}
              </Text>
            ) : null}
            {amountSubtext ? (
              <Text style={styles.amountSubtext}>{amountSubtext}</Text>
            ) : null}
            {rightElement}
          </View>
        ) : onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
        ) : null}
      </View>

      {children ? <View style={styles.extraContent}>{children}</View> : null}
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.LG,
    padding: spacing.LG,
    marginBottom: spacing.MD,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: radius.FULL,
    marginRight: 12,
    backgroundColor: colors.surfaceContainerLow,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.FULL,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    fontWeight: '700',
  },
  infoCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.heading2,
    color: colors.primary,
    marginRight: 8,
  },
  subtitle: {
    ...typography.caption,
    color: colors.secondaryText,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.SM,
    paddingVertical: spacing.XS,
    borderRadius: radius.FULL,
  },
  badgeText: {
    ...typography.badge,
  },
  rightCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amountText: {
    ...typography.heading2,
    fontWeight: '700',
  },
  amountSubtext: {
    ...typography.caption,
    color: colors.secondaryText,
    marginTop: 2,
  },
  extraContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
