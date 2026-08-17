import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

type CategoryChipProps = {
  categories?: string[];
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  label?: string;
  isActive?: boolean;
  onPress?: () => void;
};

export default function CategoryChip({
  categories,
  activeCategory,
  onSelectCategory,
  label,
  isActive,
  onPress,
}: CategoryChipProps) {
  if (label !== undefined) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.chip, isActive ? styles.activeChip : styles.inactiveChip]}
      >
        <Text
          style={[
            styles.chipText,
            isActive ? styles.activeText : styles.inactiveText,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  if (!categories) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map(cat => {
        const active = cat === activeCategory;
        return (
          <TouchableOpacity
            key={cat}
            activeOpacity={0.8}
            onPress={() => onSelectCategory?.(cat)}
            style={[styles.chip, active ? styles.activeChip : styles.inactiveChip]}
          >
            <Text
              style={[
                styles.chipText,
                active ? styles.activeText : styles.inactiveText,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    marginRight: 10,
  },
  activeChip: {
    backgroundColor: '#8C331A',
  },
  inactiveChip: {
    backgroundColor: '#EFECE8',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeText: {
    color: '#FFFFFF',
  },
  inactiveText: {
    color: '#554A42',
  },
});
