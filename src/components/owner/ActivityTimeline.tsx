import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../../context/AppContext';

interface ActivityTimelineProps {
  limit?: number;
}

export default function ActivityTimeline({ limit = 5 }: ActivityTimelineProps) {
  const { activities } = useApp();
  const [showAll, setShowAll] = useState(false);

  const displayedActivities =
    showAll || !limit ? activities : activities.slice(0, limit);
  const hasMore = activities.length > limit;

  return (
    <View style={styles.card}>
      {displayedActivities.map((item, index) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.leftTimeline}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            {index !== displayedActivities.length - 1 && (
              <View style={styles.verticalLine} />
            )}
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        </View>
      ))}

      {hasMore && (
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.viewAllBtn}
          onPress={() => setShowAll(!showAll)}
        >
          <Text style={styles.viewAllText}>
            {showAll ? 'Show Less' : `View All (${activities.length})`}
          </Text>
          <Ionicons
            name={showAll ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#8C331A"
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 18,
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
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8C331A',
  },
});
