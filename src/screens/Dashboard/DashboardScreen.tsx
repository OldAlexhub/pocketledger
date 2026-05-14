import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { AmountText } from '../../components/AmountText';
import { ProgressBar } from '../../components/ProgressBar';
import { EmptyState } from '../../components/EmptyState';
import {
  getTransactions,
  getStatements,
  getBudget,
  getBills,
} from '../../storage/storage';
import { Transaction, Budget, Bill, Statement } from '../../models/types';
import {
  getMonthKey,
  formatCurrency,
  today,
  formatShortDate,
} from '../../utils/dateUtils';
import { getCategoryTotals } from '../../utils/insights';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../../constants/theme';
import { CATEGORY_ICONS } from '../../constants/categories';

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const currentMonth = getMonthKey(today());

  const load = useCallback(async () => {
    const [txns, stmts, b, bls] = await Promise.all([
      getTransactions(),
      getStatements(),
      getBudget(),
      getBills(),
    ]);
    setTransactions(txns);
    setStatements(stmts);
    setBudget(b);
    setBills(bls);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const monthTxns = transactions.filter(t => getMonthKey(t.date) === currentMonth);
  const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;
  const savingsGoal = budget?.savingsGoal || 0;
  const savingsPotential = Math.max(0, balance - savingsGoal);

  const categoryTotals = getCategoryTotals(monthTxns);
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const monthlyBudget = (budget?.monthlyIncome || 0) - (budget?.savingsGoal || 0);
  const spendingProgress = monthlyBudget > 0 ? expenses / monthlyBudget : 0;

  const upcomingBills = bills
    .filter(b => !b.paidThisMonth)
    .sort((a, b) => a.dueDay - b.dueDay)
    .slice(0, 3);

  const sym = '$';
  const hasData = transactions.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>PocketLedger</Text>
            <Text style={styles.headerMonth}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{statements.length}/3</Text>
            <Text style={styles.headerBadgeSub}>Statements</Text>
          </View>
        </View>

        {/* Balance Summary Card */}
        <Card style={styles.summaryCard} elevation="md">
          <Text style={styles.summaryLabel}>Remaining Balance</Text>
          <AmountText
            amount={balance}
            type={balance >= 0 ? 'income' : 'expense'}
            size="display"
            style={styles.summaryAmount}
          />
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Income</Text>
              <AmountText amount={income} type="income" size="md" symbol={sym} />
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Spending</Text>
              <AmountText amount={expenses} type="expense" size="md" symbol={sym} />
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Savings Goal</Text>
              <AmountText amount={savingsGoal} type="neutral" size="md" symbol={sym} />
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickAction
            icon="➕"
            label="Add"
            onPress={() => navigation.navigate('Transactions', { screen: 'MainTabs', params: { openAdd: true } })}
            color={Colors.primary}
          />
          <QuickAction
            icon="📥"
            label="Import"
            onPress={() => navigation.navigate('Import')}
            color={Colors.accent}
          />
          <QuickAction
            icon="💡"
            label="Insights"
            onPress={() => navigation.navigate('Insights')}
            color={Colors.warning}
          />
          <QuickAction
            icon="📊"
            label="Report"
            onPress={() => navigation.navigate('Insights', { screen: 'Reports' })}
            color={Colors.primaryLight}
          />
        </View>

        {hasData ? (
          <>
            {/* Spending Pace */}
            {monthlyBudget > 0 && (
              <Card>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>Spending Pace</Text>
                  <Text
                    style={[
                      styles.paceLabel,
                      spendingProgress > 1
                        ? styles.paceOver
                        : spendingProgress > 0.85
                        ? styles.paceWarning
                        : styles.paceGood,
                    ]}>
                    {spendingProgress > 1 ? 'Over Budget' : spendingProgress > 0.85 ? 'At Risk' : 'On Track'}
                  </Text>
                </View>
                <ProgressBar
                  progress={spendingProgress}
                  color={spendingProgress > 0.85 ? Colors.warning : Colors.accent}
                  style={styles.progressBar}
                />
                <View style={styles.paceNumbers}>
                  <Text style={styles.paceNum}>{sym}{expenses.toFixed(0)} spent</Text>
                  <Text style={styles.paceNum}>of {sym}{monthlyBudget.toFixed(0)} budget</Text>
                </View>
              </Card>
            )}

            {/* Budget Clarity */}
            {budget && budget.monthlyIncome > 0 && (
              <Card>
                <Text style={styles.cardTitle}>Budget Clarity</Text>
                <BudgetRow label="Income" amount={budget.monthlyIncome} sym={sym} />
                <BudgetRow label="Fixed Bills" amount={-(budget.fixedBills || 0)} sym={sym} color={Colors.expense} />
                <BudgetRow label="Variable Spending" amount={-expenses} sym={sym} color={Colors.expense} />
                <BudgetRow label="Savings Goal" amount={-savingsGoal} sym={sym} color={Colors.warning} />
                <View style={styles.divider} />
                <BudgetRow
                  label="Available Balance"
                  amount={budget.monthlyIncome - (budget.fixedBills || 0) - expenses - savingsGoal}
                  sym={sym}
                  bold
                />
              </Card>
            )}

            {/* Top Category */}
            {topCategory && (
              <Card>
                <Text style={styles.cardTitle}>Top Spending Category</Text>
                <View style={styles.topCatRow}>
                  <Text style={styles.topCatIcon}>{CATEGORY_ICONS[topCategory[0]] || '📦'}</Text>
                  <View style={styles.topCatInfo}>
                    <Text style={styles.topCatName}>{topCategory[0]}</Text>
                    <Text style={styles.topCatSub}>This month</Text>
                  </View>
                  <AmountText amount={topCategory[1]} type="expense" size="lg" symbol={sym} />
                </View>
              </Card>
            )}

            {/* Savings Potential */}
            {savingsPotential > 0 && (
              <Card style={styles.savingsCard}>
                <View style={styles.row}>
                  <Text style={[styles.cardTitle, { color: Colors.success }]}>💰 Savings Potential</Text>
                </View>
                <Text style={styles.savingsAmount}>{sym}{savingsPotential.toFixed(2)}</Text>
                <Text style={styles.savingsSub}>Available after goal · Review Insights for optimization tips</Text>
              </Card>
            )}
          </>
        ) : (
          <EmptyState
            icon="📊"
            title="No data yet"
            message="Add transactions or import a statement to build your spending picture."
            style={styles.emptyState}
          />
        )}

        {/* Upcoming Bills */}
        {upcomingBills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Upcoming Bills</Text>
            {upcomingBills.map(bill => (
              <Card key={bill.id} style={styles.billCard}>
                <View style={styles.row}>
                  <View>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billDue}>Due day {bill.dueDay}</Text>
                  </View>
                  <AmountText amount={bill.amount} type="expense" size="md" symbol={sym} />
                </View>
              </Card>
            ))}
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: color + '15' }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '25' }]}>
        <Text style={styles.quickActionEmoji}>{icon}</Text>
      </View>
      <Text style={[styles.quickActionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function BudgetRow({ label, amount, sym, color, bold }: {
  label: string; amount: number; sym: string; color?: string; bold?: boolean;
}) {
  return (
    <View style={styles.budgetRow}>
      <Text style={[styles.budgetLabel, bold && styles.budgetLabelBold]}>{label}</Text>
      <Text style={[styles.budgetAmount, bold && styles.budgetAmountBold, color ? { color } : {}]}>
        {amount < 0 ? `-${sym}${Math.abs(amount).toFixed(2)}` : `${sym}${amount.toFixed(2)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.md,
  },
  headerLabel: { fontSize: FontSize.xxl, fontWeight: FontWeight.heavy, color: Colors.primary },
  headerMonth: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2 },
  headerBadge: {
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  headerBadgeText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary },
  headerBadgeSub: { fontSize: FontSize.xxs, color: Colors.textLight },
  summaryCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
  summaryLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  summaryAmount: { color: '#fff', marginBottom: Spacing.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryItemLabel: { fontSize: FontSize.xxs, color: 'rgba(255,255,255,0.65)', marginBottom: 2, textTransform: 'uppercase' },
  summaryDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickAction: {
    flex: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  quickActionEmoji: { fontSize: 20 },
  quickActionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paceLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  paceOver: { color: Colors.danger },
  paceWarning: { color: Colors.warning },
  paceGood: { color: Colors.success },
  progressBar: { marginVertical: Spacing.sm },
  paceNumbers: { flexDirection: 'row', justifyContent: 'space-between' },
  paceNum: { fontSize: FontSize.xs, color: Colors.textLight },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  budgetLabel: { fontSize: FontSize.base, color: Colors.textSecondary },
  budgetLabelBold: { fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  budgetAmount: { fontSize: FontSize.base, color: Colors.textSecondary },
  budgetAmountBold: { fontWeight: FontWeight.bold, color: Colors.textPrimary },
  topCatRow: { flexDirection: 'row', alignItems: 'center' },
  topCatIcon: { fontSize: 32, marginRight: Spacing.md },
  topCatInfo: { flex: 1 },
  topCatName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  topCatSub: { fontSize: FontSize.sm, color: Colors.textLight },
  savingsCard: { backgroundColor: Colors.successLight },
  savingsAmount: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.success },
  savingsSub: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  emptyState: { marginTop: Spacing.xl },
  billCard: { marginVertical: 4 },
  billName: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  billDue: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  bottomPad: { height: Spacing.xxxl },
});
