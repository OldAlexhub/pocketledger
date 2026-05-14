import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import {
  getTransactions,
  getStatements,
  getSubscriptions,
  getInsights,
} from '../../storage/storage';
import { Transaction, Statement } from '../../models/types';
import { generateCSV, generateReportHTML } from '../../utils/reportGenerator';
import {
  getMonthKey,
  getMonthsFromTransactions,
  monthKeyToLabel,
  today,
} from '../../utils/dateUtils';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight, Radius, Spacing } from '../../constants/theme';

export function ReportsScreen() {
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(today()));
  const [exporting, setExporting] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getTransactions(), getStatements()]).then(([t, s]) => {
        setTransactions(t);
        setStatements(s);
      });
    }, []),
  );

  const months = getMonthsFromTransactions(transactions.map(t => t.date));

  const monthTxns = transactions.filter(t => getMonthKey(t.date) === selectedMonth);
  const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      Alert.alert('No Data', 'No transactions to export.');
      return;
    }
    setExporting('csv');
    try {
      const csv = generateCSV(transactions);
      await Share.share({
        message: csv,
        title: 'PocketLedger-transactions.csv',
      });
    } catch (err: any) {
      if (err.message !== 'User did not share') {
        Alert.alert('Error', 'Could not export CSV.');
      }
    }
    setExporting(null);
  };

  const handleExportPDF = async () => {
    if (monthTxns.length === 0) {
      Alert.alert('No Data', 'No transactions for the selected month.');
      return;
    }
    setExporting('pdf');
    try {
      const [subs, insights] = await Promise.all([getSubscriptions(), getInsights()]);
      const html = generateReportHTML({
        transactions: monthTxns,
        statements,
        subscriptions: subs,
        insights,
        monthKey: selectedMonth,
        currencySymbol: '$',
      });
      await Share.share({
        message: html,
        title: `PocketLedger-Report-${selectedMonth}.html`,
      });
    } catch (err: any) {
      if (err.message !== 'User did not share') {
        Alert.alert('Error', 'Could not export report.');
      }
    }
    setExporting(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month Selector */}
        {months.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Select Month</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthRow}>
              {months.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.monthChip, selectedMonth === m && styles.monthChipActive]}
                  onPress={() => setSelectedMonth(m)}>
                  <Text style={[styles.monthChipText, selectedMonth === m && styles.monthChipTextActive]}>
                    {monthKeyToLabel(m)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Month Summary */}
        <Text style={styles.sectionTitle}>
          {monthKeyToLabel(selectedMonth)} Summary
        </Text>
        <Card>
          <View style={styles.summaryRow}>
            <SummaryBox label="Income" value={`$${income.toFixed(2)}`} color={Colors.income} />
            <SummaryBox label="Spending" value={`$${expenses.toFixed(2)}`} color={Colors.expense} />
            <SummaryBox label="Balance" value={`$${(income - expenses).toFixed(2)}`} color={income >= expenses ? Colors.income : Colors.expense} />
          </View>
          <Text style={styles.txnCount}>{monthTxns.length} transaction{monthTxns.length !== 1 ? 's' : ''}</Text>
        </Card>

        {/* Export Options */}
        <Text style={styles.sectionTitle}>Export</Text>

        <TouchableOpacity
          style={styles.exportOption}
          onPress={handleExportCSV}
          disabled={exporting !== null}
          activeOpacity={0.75}>
          <View style={styles.exportIconContainer}>
            <Text style={styles.exportIcon}>📁</Text>
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Export CSV</Text>
            <Text style={styles.exportDesc}>All transactions as a spreadsheet file</Text>
          </View>
          {exporting === 'csv' ? (
            <Text style={styles.exportLoading}>...</Text>
          ) : (
            <Text style={styles.exportArrow}>›</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportOption}
          onPress={handleExportPDF}
          disabled={exporting !== null}
          activeOpacity={0.75}>
          <View style={styles.exportIconContainer}>
            <Text style={styles.exportIcon}>📄</Text>
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Export Monthly Report</Text>
            <Text style={styles.exportDesc}>HTML report with spending summary, categories, and insights</Text>
          </View>
          {exporting === 'pdf' ? (
            <Text style={styles.exportLoading}>...</Text>
          ) : (
            <Text style={styles.exportArrow}>›</Text>
          )}
        </TouchableOpacity>

        {/* Privacy note */}
        <Card style={styles.privacyCard} elevation="none">
          <Text style={styles.privacyText}>
            🔒 Exported files are controlled entirely by you. PocketLedger does not transmit data anywhere.
          </Text>
        </Card>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryBoxLabel}>{label}</Text>
      <Text style={[styles.summaryBoxValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: FontSize.md, color: Colors.primary, fontWeight: FontWeight.medium },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sectionTitle: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textLight,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  monthRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xs },
  monthChip: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  monthChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  monthChipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  monthChipTextActive: { color: '#fff', fontWeight: FontWeight.semibold },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.sm },
  summaryBox: { alignItems: 'center' },
  summaryBoxLabel: { fontSize: FontSize.xs, color: Colors.textLight, textTransform: 'uppercase', marginBottom: 4 },
  summaryBoxValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  txnCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    elevation: 2,
  },
  exportIconContainer: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  exportIcon: { fontSize: 22 },
  exportInfo: { flex: 1 },
  exportTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  exportDesc: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2, lineHeight: 18 },
  exportArrow: { fontSize: 22, color: Colors.textMuted },
  exportLoading: { fontSize: FontSize.xl, color: Colors.primary },
  privacyCard: {
    backgroundColor: Colors.primary + '0D',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  privacyText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, textAlign: 'center' },
  bottomPad: { height: Spacing.xxxl },
});
