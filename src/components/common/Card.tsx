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
  iconColor = '#8C331A',
  iconBgColor = '#F7EFE9',
  badge,
  badgeBgColor = '#FEE2E2',
  badgeTextColor = '#DC2626',
  amount,
  amountColor = '#8C331A',
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
            <Text style={[styles.title, titleStyle]} numberOfLines={1}>
              {title}
            </Text>
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
          <Ionicons name="chevron-forward" size={18} color="#A89F97" />
        ) : null}
      </View>

      {children ? <View style={styles.extraContent}>{children}</View> : null}
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#EBE6E1',
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 16,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginRight: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rightCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
  },
  amountSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  extraContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});
