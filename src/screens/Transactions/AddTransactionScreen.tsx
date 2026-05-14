import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import {
  addTransactions,
  updateTransaction,
  getSettings,
} from '../../storage/storage';
import { Transaction } from '../../models/types';
import { CATEGORIES } from '../../constants/categories';
import { CATEGORY_ICONS } from '../../constants/categories';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight, Radius, Spacing } from '../../constants/theme';
import { today, uuid } from '../../utils/dateUtils';

interface AddTransactionScreenProps {
  existing?: Transaction;
  onClose: () => void;
}

export function AddTransactionScreen({ existing, onClose }: AddTransactionScreenProps) {
  const [type, setType] = useState<'income' | 'expense'>(existing?.type || 'expense');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [merchant, setMerchant] = useState(existing?.merchant || '');
  const [category, setCategory] = useState(existing?.category || 'Other');
  const [date, setDate] = useState(existing?.date || today());
  const [notes, setNotes] = useState(existing?.notes || '');
  const [saving, setSaving] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  const handleSave = async () => {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!merchant.trim()) {
      Alert.alert('Required', 'Please enter a merchant or source.');
      return;
    }
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert('Required', 'Please enter a valid amount.');
      return;
    }
    setSaving(true);
    const txn: Transaction = {
      id: existing?.id || uuid(),
      type,
      amount: amt,
      date,
      merchant: merchant.trim(),
      description: merchant.trim(),
      category: category as any,
      source: 'manual',
      notes: notes.trim(),
      confirmed: true,
      statementId: existing?.statementId,
    };
    try {
      if (existing) {
        await updateTransaction(txn);
      } else {
        await addTransactions([txn]);
      }
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save transaction.');
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancelBtn}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{existing ? 'Edit Transaction' : 'Add Transaction'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type Toggle */}
        <View style={styles.typeRow}>
          <TypeBtn
            label="Expense"
            icon="💸"
            active={type === 'expense'}
            color={Colors.expense}
            onPress={() => { setType('expense'); if (category === 'Income') setCategory('Other'); }}
          />
          <TypeBtn
            label="Income"
            icon="💰"
            active={type === 'income'}
            color={Colors.income}
            onPress={() => { setType('income'); setCategory('Income'); }}
          />
        </View>

        <Card>
          {/* Amount */}
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountSym}>$</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <View style={styles.divider} />

          {/* Merchant */}
          <Text style={styles.label}>Merchant / Source</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Walmart, Payroll"
            placeholderTextColor={Colors.textMuted}
            value={merchant}
            onChangeText={setMerchant}
          />

          <View style={styles.divider} />

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity style={styles.categoryPicker} onPress={() => setShowCatPicker(true)}>
            <Text style={styles.categoryPickerIcon}>{CATEGORY_ICONS[category] || '📦'}</Text>
            <Text style={styles.categoryPickerText}>{category}</Text>
            <Text style={styles.categoryPickerArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Date */}
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
            value={date}
            onChangeText={setDate}
          />

          <View style={styles.divider} />

          {/* Notes */}
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Any additional notes..."
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Card>

        <View style={styles.saveContainer}>
          <Button
            label={saving ? 'Saving...' : existing ? 'Save Changes' : 'Save Transaction'}
            onPress={handleSave}
            loading={saving}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal visible={showCatPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.catModal} edges={['top', 'bottom']}>
          <View style={styles.catHeader}>
            <Text style={styles.catTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCatPicker(false)}>
              <Text style={styles.catClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {CATEGORIES
              .filter(c => type === 'income' ? c === 'Income' : c !== 'Income')
              .map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catItem, category === cat && styles.catItemActive]}
                  onPress={() => { setCategory(cat); setShowCatPicker(false); }}>
                  <Text style={styles.catItemIcon}>{CATEGORY_ICONS[cat] || '📦'}</Text>
                  <Text style={[styles.catItemText, category === cat && styles.catItemTextActive]}>
                    {cat}
                  </Text>
                  {category === cat && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function TypeBtn({ label, icon, active, color, onPress }: {
  label: string; icon: string; active: boolean; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.typeBtn, active && { backgroundColor: color, borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}>
      <Text style={styles.typeBtnIcon}>{icon}</Text>
      <Text style={[styles.typeBtnLabel, active && styles.typeBtnLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelBtn: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.medium },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  content: { padding: Spacing.lg },
  typeRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  typeBtnIcon: { fontSize: 20 },
  typeBtnLabel: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  typeBtnLabelActive: { color: '#fff' },
  label: { fontSize: FontSize.xs, color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs, fontWeight: FontWeight.medium },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  amountSym: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginRight: 4 },
  amountInput: { flex: 1, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, padding: 0 },
  input: { fontSize: FontSize.base, color: Colors.textPrimary, paddingVertical: 4 },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.divider, marginVertical: Spacing.md },
  categoryPicker: { flexDirection: 'row', alignItems: 'center' },
  categoryPickerIcon: { fontSize: 20, marginRight: Spacing.sm },
  categoryPickerText: { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary },
  categoryPickerArrow: { fontSize: 20, color: Colors.textMuted },
  saveContainer: { marginTop: Spacing.md },
  catModal: { flex: 1, backgroundColor: Colors.background },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  catTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  catClose: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.semibold },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  catItemActive: { backgroundColor: Colors.primary + '10' },
  catItemIcon: { fontSize: 20, marginRight: Spacing.md, width: 28 },
  catItemText: { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary },
  catItemTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  checkmark: { fontSize: FontSize.md, color: Colors.primary, fontWeight: FontWeight.bold },
});
