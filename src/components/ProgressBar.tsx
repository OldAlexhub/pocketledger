import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/colors';
import { Radius } from '../constants/theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({ progress, color = Colors.primary, height = 6, style }: ProgressBarProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const overBudget = progress > 1;

  return (
    <View style={[styles.track, { height }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(100, clampedProgress * 100)}%`,
            backgroundColor: overBudget ? Colors.danger : color,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: Radius.full,
  },
});
