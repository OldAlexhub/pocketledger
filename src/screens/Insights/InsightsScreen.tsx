import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ProgressBar } from '../../components/ProgressBar';
import {
  getTransactions,
  saveSubscriptions,
  getSubscriptions,
} from '../../storage/storage';
import { Transaction, Subscription, Insight } from '../../models/types';
import {
  generateInsights,
  detectSubscriptions,
  getCategoryTotals,
  getMonthlyTotals,
} from '../../utils/insights';
import { calculateSavingsPotential } from '../../utils/savingsCalculator';
import { getMonthKey, getMonthsFromTransactions, monthKeyToLabel, today } from '../../utils/dateUtils';
import { Colors, CategoryColors } from '../../constants/colors';
import { FontSize, FontWeight, Radius, Spacing } from '../../constants/theme';
import { CATEGORY_ICONS } from '../../constants/categories';

type InsightTab = 'overview' | 'subscriptions' | 'savings';

export function InsightsScreen() {
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeTab, setActiveTab] = useState<InsightTab>('overview');
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthKey(today()));

  const load = useCallback(async () => {
    const [txns, subs] = await Promise.all([
      getTransactions(),
      getSubscriptions(),
    ]);
    setTransactions(txns);

    const detectedSubs = detectSubscriptions(txns);
    // Merge status from stored subs
    const merged = detectedSubs.map(d => {
      const stored = subs.find(s => s.merchant.toLowerCase() === d.merchant.toLowerCase());
      return stored ? { ...d, status: stored.status } : d;
    });
    setSubscriptions(merged);
    await saveSubscriptions(merged);

    const ins = generateInsights(txns);
    setInsights(ins);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const months = getMonthsFromTransactions(transactions.map(t => t.date));
  const hasData = transactions.length > 0;

  const savingsPotential = hasData ? calculateSavingsPotential(transactions) : null;
  const categoryTotals = getCategoryTotals(transactions, selectedMonth);
  const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const { income, expenses } = getMonthlyTotals(transactions, selectedMonth);
  const maxCatAmt = topCategories[0]?.[1] || 1;

  const handleUpdateSubStatus = async (id: string, status: Subscription['status']) => {
    const updated = subscriptions.map(s => s.id === id ? { ...s, status } : s);
    setSubscriptions(updated);
    await saveSubscriptions(updated);
  };

  const activeAnomalies = insights.filter(i => i.type === 'anomaly' || i.type === 'trend');
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const yearlyCostOfSubs = activeSubs.reduce((s, sub) => s + sub.yearlyCost, 0);

  if (!hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
        </View>
        <EmptyState
          icon="💡"
          title="No insights yet"
          message="Insights appear after you add or import transactions."
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => navigation.navigate('Reports')}>
          <Text style={styles.reportBtnText}>📊 Report</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'subscriptions', 'savings'] as InsightTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? 'Overview' : tab === 'subscriptions' ? 'Subscriptions' : 'Savings'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <>
            {/* Month selector */}
            {months.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll} contentContainerStyle={styles.monthScrollContent}>
                {months.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthChip, selectedMonth === m && styles.monthChipActive]}
                    onPress={() => setSelectedMonth(m)}>
                    <Text style={[styles.monthChipText, selectedMonth === m && styles.monthChipTextActive]}>
                      {monthKeyToLabel(m).split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Monthly summary */}
            <Card>
              <Text style={styles.cardTitle}>{monthKeyToLabel(selectedMonth)}</Text>
              <View style={styles.summaryRow}>
                <SummaryItem label="Income" value={`$${income.toFixed(0)}`} color={Colors.income} />
                <SummaryItem label="Spending" value={`$${expenses.toFixed(0)}`} color={Colors.expense} />
                <SummaryItem label="Balance" value={`$${(income - expenses).toFixed(0)}`} color={income >= expenses ? Colors.income : Colors.expense} />
              </View>
            </Card>

            {/* Category breakdown */}
            {topCategories.length > 0 && (
              <Card>
                <Text style={styles.cardTitle}>Category Breakdown</Text>
                {topCategories.map(([cat, amt]) => (
                  <View key={cat} style={styles.catRow}>
                    <Text style={styles.catIcon}>{CATEGORY_ICONS[cat] || '📦'}</Text>
                    <View style={styles.catInfo}>
                      <View style={styles.catLabelRow}>
                        <Text style={styles.catName}>{cat}</Text>
                        <Text style={styles.catAmt}>${amt.toFixed(0)}</Text>
                      </View>
                      <ProgressBar
                        progress={amt / maxCatAmt}
                        color={CategoryColors[cat] || Colors.primary}
                        height={4}
                        style={styles.catBar}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* Anomalies */}
            {activeAnomalies.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Anomalies & Trends</Text>
                {activeAnomalies.map(insight => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </>
            )}
          </>
        )}

        {activeTab === 'subscriptions' && (
          <>
            {activeSubs.length > 0 ? (
              <>
                <Card style={styles.subSummary}>
                  <View style={styles.subSummaryRow}>
                    <View>
                      <Text style={styles.subSummaryLabel}>Monthly Cost</Text>
                      <Text style={styles.subSummaryVal}>${activeSubs.reduce((s, sub) => s + sub.estimatedAmount, 0).toFixed(2)}</Text>
                    </View>
                    <View>
                      <Text style={styles.subSummaryLabel}>Yearly Cost</Text>
                      <Text style={[styles.subSummaryVal, { color: Colors.expense }]}>${yearlyCostOfSubs.toFixed(2)}</Text>
                    </View>
                    <View>
                      <Text style={styles.subSummaryLabel}>Detected</Text>
                      <Text style={styles.subSummaryVal}>{activeSubs.length}</Text>
                    </View>
                  </View>
                </Card>
                {subscriptions.map(sub => (
                  <SubCard key={sub.id} sub={sub} onUpdate={handleUpdateSubStatus} />
                ))}
              </>
            ) : (
              <EmptyState
                icon="📺"
                title="No subscriptions detected"
                message="Import 2+ months of statements to detect recurring charges."
                style={{ marginTop: Spacing.xxxl }}
              />
            )}
          </>
        )}

        {activeTab === 'savings' && savingsPotential && (
          <>
            <Card style={styles.savingsSummary}>
              <Text style={styles.cardTitle}>Estimated Monthly Summary</Text>
              <View style={styles.savingsStats}>
                <SavingsStat label="Avg Income" value={`$${savingsPotential.avgIncome.toFixed(0)}`} />
                <SavingsStat label="Avg Spending" value={`$${savingsPotential.avgSpending.toFixed(0)}`} />
                <SavingsStat label="Avg Leftover" value={`$${savingsPotential.avgLeftover.toFixed(0)}`} color={savingsPotential.avgLeftover >= 0 ? Colors.income : Colors.expense} />
              </View>
              <Text style={styles.savingsDisclaimer}>
                Based on your imported statements and current spending pattern, you may have the potential to save more by reducing flexible spending categories.
              </Text>
            </Card>

            <Text style={styles.sectionTitle}>Savings Scenarios</Text>
            {savingsPotential.scenarios.map(scenario => (
              <Card key={scenario.label} style={styles.scenarioCard}>
                <View style={styles.scenarioHeader}>
                  <Text style={styles.scenarioLabel}>{scenario.label}</Text>
                  <Text style={styles.scenarioAmt}>+${scenario.additionalSavings.toFixed(0)}/mo</Text>
                </View>
                <Text style={styles.scenarioDesc}>{scenario.description}</Text>
                {scenario.tips.map((tip, i) => (
                  <Text key={i} style={styles.scenarioTip}>• {tip}</Text>
                ))}
              </Card>
            ))}

            <Card style={styles.noticeCard}>
              <Text style={styles.noticeText}>
                These are estimated budget clarity figures, not financial advice. Results are based on patterns in your imported data.
              </Text>
            </Card>
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const bgColor =
    insight.severity === 'danger' ? Colors.dangerLight :
    insight.severity === 'warning' ? Colors.warningLight :
    insight.severity === 'success' ? Colors.successLight : Colors.infoLight;

  const iconColor =
    insight.severity === 'danger' ? Colors.danger :
    insight.severity === 'warning' ? Colors.warning :
    insight.severity === 'success' ? Colors.success : Colors.info;

  const icon =
    insight.type === 'anomaly' ? '⚠️' :
    insight.type === 'savings' ? '💰' :
    insight.type === 'trend' ? '📈' : '💡';

  return (
    <Card style={[styles.insightCard, { backgroundColor: bgColor }]}>
      <View style={styles.insightRow}>
        <Text style={styles.insightIcon}>{icon}</Text>
        <View style={styles.insightContent}>
          <Text style={[styles.insightTitle, { color: iconColor }]}>{insight.title}</Text>
          <Text style={styles.insightMsg}>{insight.message}</Text>
          {insight.amountImpact && (
            <Text style={[styles.insightImpact, { color: iconColor }]}>
              Impact: ${insight.amountImpact.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

function SubCard({ sub, onUpdate }: { sub: Subscription; onUpdate: (id: string, status: Subscription['status']) => void }) {
  const isIgnored = sub.status === 'ignored';
  return (
    <Card style={[styles.subCard, isIgnored && styles.subCardIgnored]}>
      <View style={styles.subRow}>
        <View style={styles.subInfo}>
          <Text style={styles.subMerchant}>{sub.merchant}</Text>
          <Text style={styles.subCost}>
            ${sub.estimatedAmount.toFixed(2)}/mo · ${sub.yearlyCost.toFixed(2)}/yr
          </Text>
          <Text style={styles.subMonths}>Detected: {sub.detectedMonths.length} month{sub.detectedMonths.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={[styles.subIgnoreBtn, isIgnored && styles.subUnignoreBtn]}
          onPress={() => onUpdate(sub.id, isIgnored ? 'active' : 'ignored')}>
          <Text style={[styles.subIgnoreBtnText, isIgnored && styles.subUnignoreBtnText]}>
            {isIgnored ? 'Restore' : 'Ignore'}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryItemLabel}>{label}</Text>
      <Text style={[styles.summaryItemValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function SavingsStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.savingsStat}>
      <Text style={styles.savingsStatLabel}>{label}</Text>
      <Text style={[styles.savingsStatValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  reportBtn: {
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  reportBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1, alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  monthScroll: { marginBottom: Spacing.sm },
  monthScrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
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
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryItemLabel: { fontSize: FontSize.xs, color: Colors.textLight, textTransform: 'uppercase', marginBottom: 4 },
  summaryItemValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  catIcon: { fontSize: 18, width: 28, marginRight: Spacing.sm },
  catInfo: { flex: 1 },
  catLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: FontSize.sm, color: Colors.textPrimary },
  catAmt: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  catBar: { marginBottom: 4 },
  sectionTitle: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textLight,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.xs,
  },
  insightCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start' },
  insightIcon: { fontSize: 22, marginRight: Spacing.sm, marginTop: 2 },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, marginBottom: 4 },
  insightMsg: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  insightImpact: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginTop: 6 },
  subSummary: { backgroundColor: Colors.primary },
  subSummaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  subSummaryLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 },
  subSummaryVal: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#fff' },
  subCard: { marginVertical: 4 },
  subCardIgnored: { opacity: 0.6 },
  subRow: { flexDirection: 'row', alignItems: 'center' },
  subInfo: { flex: 1 },
  subMerchant: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  subCost: { fontSize: FontSize.sm, color: Colors.expense, marginTop: 2 },
  subMonths: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  subIgnoreBtn: {
    backgroundColor: Colors.expense + '15',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  subUnignoreBtn: { backgroundColor: Colors.success + '15' },
  subIgnoreBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.expense },
  subUnignoreBtnText: { color: Colors.success },
  savingsSummary: {},
  savingsStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md },
  savingsStat: { alignItems: 'center' },
  savingsStatLabel: { fontSize: FontSize.xs, color: Colors.textLight, textTransform: 'uppercase', marginBottom: 4 },
  savingsStatValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  savingsDisclaimer: { fontSize: FontSize.xs, color: Colors.textLight, lineHeight: 18, fontStyle: 'italic' },
  scenarioCard: {},
  scenarioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  scenarioLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  scenarioAmt: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.success },
  scenarioDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 20 },
  scenarioTip: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4, lineHeight: 20 },
  noticeCard: { backgroundColor: Colors.warningLight, marginBottom: Spacing.md },
  noticeText: { fontSize: FontSize.xs, color: Colors.warning, lineHeight: 18, fontStyle: 'italic' },
  bottomPad: { height: Spacing.xxxl },
});
