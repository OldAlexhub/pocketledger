import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getBudget, saveBudget, getBills, saveBills } from '../../storage/storage';
import { Budget, Bill } from '../../models/types';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight, Radius, Spacing } from '../../constants/theme';
import { uuid } from '../../utils/dateUtils';

export function BudgetScreen() {
  const navigation = useNavigation();
  const [budget, setBudget] = useState<Budget>({
    monthlyIncome: 0,
    savingsGoal: 0,
    categoryBudgets: [],
    fixedBills: 0,
    monthStartDay: 1,
    currency: 'USD',
  });
  const [bills, setBillsState] = useState<Bill[]>([]);
  const [saving, setSaving] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDay, setBillDueDay] = useState('1');

  useFocusEffect(
    useCallback(() => {
      Promise.all([getBudget(), getBills()]).then(([b, bls]) => {
        setBudget(b);
        setBillsState(bls);
      });
    }, []),
  );

  const handleSave = async () => {
    if (budget.monthlyIncome < 0) {
      Alert.alert('Invalid', 'Income cannot be negative.');
      return;
    }
    setSaving(true);
    await saveBudget(budget);
    setSaving(false);
    Alert.alert('Saved', 'Budget settings saved successfully.');
  };

  const handleAddBill = async () => {
    const amt = parseFloat(billAmount);
    if (!billName.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid', 'Please enter a bill name and valid amount.');
      return;
    }
    const newBill: Bill = {
      id: uuid(),
      name: billName.trim(),
      amount: amt,
      dueDay: parseInt(billDueDay, 10) || 1,
      category: 'Utilities',
      recurring: true,
      paidThisMonth: false,
    };
    const updated = [...bills, newBill];
    setBillsState(updated);
    await saveBills(updated);
    const totalFixed = updated.reduce((s, b) => s + b.amount, 0);
    const updatedBudget = { ...budget, fixedBills: totalFixed };
    setBudget(updatedBudget);
    await saveBudget(updatedBudget);
    setBillName('');
    setBillAmount('');
    setBillDueDay('1');
    setShowBillModal(false);
  };

  const handleDeleteBill = async (id: string) => {
    const updated = bills.filter(b => b.id !== id);
    setBillsState(updated);
    await saveBills(updated);
    const totalFixed = updated.reduce((s, b) => s + b.amount, 0);
    const updatedBudget = { ...budget, fixedBills: totalFixed };
    setBudget(updatedBudget);
    await saveBudget(updatedBudget);
  };

  const available =
    budget.monthlyIncome - (budget.fixedBills || 0) - budget.savingsGoal;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Budget</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Clarity Preview */}
        <Card style={styles.clarityCard}>
          <Text style={styles.clarityTitle}>Budget Clarity</Text>
          <ClarityRow label="Income" value={budget.monthlyIncome} sym="$" />
          <ClarityRow label="Fixed Bills" value={-(budget.fixedBills || 0)} sym="$" color={Colors.expense} />
          <ClarityRow label="Savings Goal" value={-budget.savingsGoal} sym="$" color={Colors.warning} />
          <View style={styles.divider} />
          <ClarityRow label="Available to Spend" value={available} sym="$" bold color={available >= 0 ? Colors.success : Colors.danger} />
        </Card>

        {/* Monthly Income */}
        <Card>
          <Text style={styles.sectionLabel}>MONTHLY INCOME</Text>
          <View style={styles.inputRow}>
            <Text style={styles.sym}>$</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={budget.monthlyIncome > 0 ? String(budget.monthlyIncome) : ''}
              onChangeText={v => setBudget(b => ({ ...b, monthlyIncome: parseFloat(v) || 0 }))}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </Card>

        {/* Savings Goal */}
        <Card>
          <Text style={styles.sectionLabel}>MONTHLY SAVINGS GOAL</Text>
          <View style={styles.inputRow}>
            <Text style={styles.sym}>$</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={budget.savingsGoal > 0 ? String(budget.savingsGoal) : ''}
              onChangeText={v => setBudget(b => ({ ...b, savingsGoal: parseFloat(v) || 0 }))}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </Card>

        {/* Month Start Day */}
        <Card>
          <Text style={styles.sectionLabel}>MONTH STARTS ON DAY</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.dayInput]}
              keyboardType="number-pad"
              value={String(budget.monthStartDay)}
              onChangeText={v => {
                const d = parseInt(v, 10) || 1;
                setBudget(b => ({ ...b, monthStartDay: Math.min(28, Math.max(1, d)) }));
              }}
              maxLength={2}
            />
            <Text style={styles.dayLabel}>of each month</Text>
          </View>
        </Card>

        {/* Fixed Bills */}
        <View style={styles.billsHeader}>
          <Text style={styles.sectionTitle}>Fixed Bills</Text>
          <TouchableOpacity style={styles.addBillBtn} onPress={() => setShowBillModal(true)}>
            <Text style={styles.addBillBtnText}>+ Add Bill</Text>
          </TouchableOpacity>
        </View>

        {bills.length === 0 ? (
          <Card>
            <Text style={styles.emptyBills}>No fixed bills added yet. Add recurring bills like rent, phone, and utilities.</Text>
          </Card>
        ) : (
          bills.map(bill => (
            <Card key={bill.id} style={styles.billItem}>
              <View style={styles.billRow}>
                <View>
                  <Text style={styles.billName}>{bill.name}</Text>
                  <Text style={styles.billDue}>Due day {bill.dueDay}</Text>
                </View>
                <View style={styles.billRight}>
                  <Text style={styles.billAmount}>${bill.amount.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => handleDeleteBill(bill.id)}>
                    <Text style={styles.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))
        )}

        <View style={styles.saveContainer}>
          <Button label={saving ? 'Saving...' : 'Save Budget'} onPress={handleSave} loading={saving} fullWidth size="lg" />
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Add Bill Modal */}
      <Modal visible={showBillModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBillModal(false)}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Fixed Bill</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.label}>Bill Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Rent, Phone, Netflix"
              placeholderTextColor={Colors.textMuted}
              value={billName}
              onChangeText={setBillName}
            />
            <Text style={[styles.label, { marginTop: Spacing.md }]}>Monthly Amount</Text>
            <View style={styles.inputRow}>
              <Text style={styles.sym}>$</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                value={billAmount}
                onChangeText={setBillAmount}
              />
            </View>
            <Text style={[styles.label, { marginTop: Spacing.md }]}>Due Day</Text>
            <TextInput
              style={[styles.modalInput, styles.dayInput]}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={Colors.textMuted}
              value={billDueDay}
              onChangeText={setBillDueDay}
              maxLength={2}
            />
            <Button label="Add Bill" onPress={handleAddBill} fullWidth style={{ marginTop: Spacing.xl }} size="lg" />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ClarityRow({ label, value, sym, color, bold }: {
  label: string; value: number; sym: string; color?: string; bold?: boolean;
}) {
  const isNeg = value < 0;
  const display = `${isNeg ? '-' : ''}${sym}${Math.abs(value).toFixed(2)}`;
  return (
    <View style={styles.clarityRow}>
      <Text style={[styles.clarityLabel, bold && styles.clarityLabelBold]}>{label}</Text>
      <Text style={[styles.clarityValue, bold && styles.clarityValueBold, color ? { color } : {}]}>
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: { fontSize: FontSize.md, color: Colors.primary, fontWeight: FontWeight.medium },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  content: { padding: Spacing.lg },
  clarityCard: { backgroundColor: Colors.primary, marginBottom: Spacing.md },
  clarityTitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: Spacing.sm, fontWeight: FontWeight.medium },
  clarityRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  clarityLabel: { fontSize: FontSize.base, color: 'rgba(255,255,255,0.8)' },
  clarityLabelBold: { fontWeight: FontWeight.semibold, color: '#fff' },
  clarityValue: { fontSize: FontSize.base, color: 'rgba(255,255,255,0.8)' },
  clarityValueBold: { fontWeight: FontWeight.bold, color: '#fff', fontSize: FontSize.md },
  sectionLabel: { fontSize: FontSize.xs, color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, fontWeight: FontWeight.medium },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  sym: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginRight: 4 },
  input: { flex: 1, fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  dayInput: { width: 60, flex: 0, textAlign: 'center' },
  dayLabel: { fontSize: FontSize.base, color: Colors.textSecondary, marginLeft: Spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: Spacing.sm },
  billsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  addBillBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md },
  addBillBtnText: { color: '#fff', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  emptyBills: { fontSize: FontSize.base, color: Colors.textLight, textAlign: 'center', lineHeight: 22 },
  billItem: { marginVertical: 4 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billName: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  billDue: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  billRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  billAmount: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.expense },
  deleteBtn: { fontSize: FontSize.md, color: Colors.textMuted, padding: 4 },
  saveContainer: { marginTop: Spacing.lg },
  bottomPad: { height: Spacing.xxxl },
  modalArea: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelBtn: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.medium },
  modalTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modalContent: { padding: Spacing.lg },
  label: { fontSize: FontSize.xs, color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs, fontWeight: FontWeight.medium },
  modalInput: { fontSize: FontSize.lg, color: Colors.textPrimary, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: Spacing.sm },
});
