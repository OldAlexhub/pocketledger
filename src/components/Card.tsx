import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/colors';
import { Radius, Shadow, Spacing } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  noMargin?: boolean;
  elevation?: 'sm' | 'md' | 'lg' | 'none';
}

export function Card({ children, style, noPadding, noMargin, elevation = 'sm' }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        !noPadding && styles.padding,
        !noMargin && styles.margin,
        elevation === 'md' && Shadow.md,
        elevation === 'lg' && Shadow.lg,
        elevation === 'none' && styles.noElevation,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  padding: {
    padding: Spacing.lg,
  },
  margin: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  noElevation: {
    elevation: 0,
    shadowOpacity: 0,
  },
});
