import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../context/AppContext';

interface ActivityTimelineProps {
  limit?: number;
}

export default function ActivityTimeline({ limit = 5 }: ActivityTimelineProps) {
  const { activities = [] } = useApp();

  const displayedActivities = activities.slice(0, limit);

  if (displayedActivities.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>No recent activity</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {displayedActivities.map((item, index) => {
        const isLast = index === displayedActivities.length - 1;
        return (
          <View
            key={item.id}
            style={[styles.row, isLast && styles.lastRow]}
          >
            <View style={styles.leftTimeline}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              {!isLast && <View style={styles.verticalLine} />}
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#9E9288',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  lastRow: {
    marginBottom: 0,
  },
  leftTimeline: {
    alignItems: 'center',
    marginRight: 14,
    width: 14,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  verticalLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#EAE6E1',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    fontSize: 14,
    color: '#2C201A',
  },
  subtitle: {
    color: '#6E6259',
    fontSize: 13,
    marginTop: 2,
  },
  time: {
    color: '#9E9288',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

