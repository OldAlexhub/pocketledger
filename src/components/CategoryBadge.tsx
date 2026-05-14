import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { CategoryColors } from '../constants/colors';
import { CATEGORY_ICONS } from '../constants/categories';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  style?: ViewStyle;
}

function hexToRGBA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function CategoryBadge({ category, size = 'md', showIcon = true, style }: CategoryBadgeProps) {
  const color = CategoryColors[category] || '#7F8C8D';
  const bg = hexToRGBA(color, 0.12);
  const icon = CATEGORY_ICONS[category] || '📦';

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: bg },
        style,
      ]}>
      {showIcon && (
        <Text style={[styles.icon, size === 'sm' && styles.iconSm]}>{icon}</Text>
      )}
      <Text style={[styles.label, size === 'sm' && styles.labelSm, { color }]}>
        {category}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs - 1,
    paddingHorizontal: Spacing.sm,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs + 2,
  },
  icon: {
    fontSize: 12,
    marginRight: 4,
  },
  iconSm: {
    fontSize: 10,
    marginRight: 3,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  labelSm: {
    fontSize: FontSize.xxs,
  },
});
