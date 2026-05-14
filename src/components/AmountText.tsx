import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/theme';

interface AmountTextProps {
  amount: number;
  type?: 'income' | 'expense' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'display';
  bold?: boolean;
  symbol?: string;
  style?: TextStyle;
  showSign?: boolean;
}

export function AmountText({
  amount,
  type = 'neutral',
  size = 'md',
  bold = true,
  symbol = '$',
  style,
  showSign = false,
}: AmountTextProps) {
  const color =
    type === 'income'
      ? Colors.income
      : type === 'expense'
      ? Colors.expense
      : Colors.textPrimary;

  const sign = showSign && type === 'income' ? '+' : '';
  const formatted = `${sign}${symbol}${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <Text
      style={[
        styles.base,
        styles[`size_${size}`],
        bold && styles.bold,
        { color },
        style,
      ]}>
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  bold: { fontWeight: FontWeight.bold },
  size_sm: { fontSize: FontSize.sm },
  size_md: { fontSize: FontSize.md },
  size_lg: { fontSize: FontSize.xl },
  size_xl: { fontSize: FontSize.xxl },
  size_display: { fontSize: FontSize.display },
});
