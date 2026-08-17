import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export interface Props {
  title: string;
  value: string;
  icon: string;
  color: string;
  isFilled?: boolean;
}

export type SummaryCardProps = Props;

export const SummaryCard: React.FC<Props> = ({
  title,
  value,
  icon,
  color,
  isFilled = false,
}) => {
  return (
    <View style={[styles.card, isFilled && styles.filledCard]}>
      <View style={styles.row}>
        {icon === 'ellipse' ? (
          <View style={[styles.dot, { backgroundColor: color }]} />
        ) : (
          <Ionicons name={icon as any} size={18} color={isFilled ? '#4A5568' : color} />
        )}
        <Text style={[styles.title, isFilled && styles.filledTitle]}>{title}</Text>
      </View>

      <Text style={[styles.value, isFilled && styles.filledValue]}>{value}</Text>
    </View>
  );
};

export default SummaryCard;

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  filledCard: {
    backgroundColor: '#DCE5F7',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A3E37',
    marginLeft: 6,
  },
  filledTitle: {
    color: '#3B4863',
  },
  value: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '700',
    color: '#2C201A',
  },
  filledValue: {
    color: '#2D3748',
  },
});
