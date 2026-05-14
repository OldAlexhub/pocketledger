import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { CategoryBadge } from '../../components/CategoryBadge';
import { AmountText } from '../../components/AmountText';
import {
  addTransactions,
  addStatement,
  getCategoryCorrections,
  saveCategoryCorrection,
} from '../../storage/storage';
import { Transaction, PendingTransaction } from '../../models/types';
import { CATEGORIES, CATEGORY_ICONS } from '../../constants/categories';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight, Radius, Spacing } from '../../constants/theme';
import { formatShortDate, getMonthLabel, uuid, today } from '../../utils/dateUtils';

type RouteParams = {
  ImportReview: {
    statementId: string;
    fileName: string;
    pending: PendingTransaction[];
  };
};

export function ImportReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ImportReview'>>();
  const { statementId, fileName, pending: initialPending } = route.params;

  const [pending, setPending] = useState<PendingTransaction[]>(initialPending);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [showCatPicker, setShowCatPicker] = useState(false);

  const confirmed = pending.filter(p => !p.ignored);
  const ignored = pending.filter(p => p.ignored).length;

  const toggleIgnore = (idx: number) => {
    setPending(prev => prev.map((p, i) => i === idx ? { ...p, ignored: !p.ignored } : p));
  };

  const updateCategory = (idx: number, cat: string) => {
    setPending(prev => prev.map((p, i) => i === idx ? { ...p, category: cat as any } : p));
  };

  const handleConfirmAll = async () => {
    if (confirmed.length === 0) {
      Alert.alert('Nothing to import', 'All transactions are ignored. Toggle some to include them.');
      return;
    }

    setSaving(true);

    // Save category corrections for user learning
    const corrections = await getCategoryCorrections();
    for (const p of confirmed) {
      if (!corrections[p.merchant.toLowerCase()]) {
        await saveCategoryCorrection(p.merchant, p.category as any);
      }
    }

    const txns: Transaction[] = confirmed.map(p => ({
      id: uuid(),
      type: p.type,
      amount: p.amount,
      date: p.date,
      merchant: p.merchant,
      description: p.description,
      category: p.category,
      source: 'import',
      statementId,
      confirmed: true,
    }));

    await addTransactions(txns);

    // Determine month label
    const dates = confirmed.map(p => p.date);
    const firstDate = dates.sort()[0] || today();
    const monthLabel = getMonthLabel(firstDate);

    await addStatement({
      id: statementId,
      fileName,
      importedAt: new Date().toISOString(),
      monthLabel,
      transactionCount: txns.length,
      status: 'imported',
    });

    setSaving(false);
    Alert.alert(
      'Import Complete',
      `${txns.length} transaction${txns.length !== 1 ? 's' : ''} imported from "${fileName}".`,
      [{ text: 'Done', onPress: () => navigation.popToTop() }],
    );
  };

  const confidenceColor = (c: string) => {
    if (c === 'high') return Colors.success;
    if (c === 'medium') return Colors.warning;
    return Colors.danger;
  };

  const renderItem = ({ item, index }: { item: PendingTransaction; index: number }) => (
    <TouchableOpacity
      style={[styles.item, item.ignored && styles.itemIgnored]}
      onPress={() => toggleIgnore(index)}
      activeOpacity={0.85}>
      <View style={styles.itemLeft}>
        <View style={styles.itemCheck}>
          <Text style={styles.itemCheckIcon}>{item.ignored ? '○' : '✓'}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemMerchant, item.ignored && styles.itemTextIgnored]} numberOfLines={1}>
            {item.merchant}
          </Text>
          <View style={styles.itemMeta}>
            <Text style={styles.itemDate}>{formatShortDate(item.date)}</Text>
            <View style={styles.dot} />
            <TouchableOpacity
              onPress={() => { setEditIdx(index); setShowCatPicker(true); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <CategoryBadge category={item.category} size="sm" showIcon={false} />
            </TouchableOpacity>
            <View style={styles.dot} />
            <Text style={[styles.confidenceDot, { color: confidenceColor(item.confidence) }]}>
              ● {item.confidence}
            </Text>
          </View>
        </View>
      </View>
      <AmountText
        amount={item.amount}
        type={item.type}
        size="sm"
        showSign={item.type === 'income'}
        style={item.ignored ? styles.itemTextIgnored : undefined}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtn}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review Transactions</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{confirmed.length}</Text>
          <Text style={styles.summaryLabel}>To Import</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{ignored}</Text>
          <Text style={styles.summaryLabel}>Ignored</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{pending.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      <Text style={styles.tapHint}>Tap to toggle · Tap category to edit</Text>

      <FlatList
        data={pending}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <View style={styles.footer}>
        <Button
          label={saving ? 'Importing...' : `Import ${confirmed.length} Transactions`}
          onPress={handleConfirmAll}
          loading={saving}
          fullWidth
          size="lg"
          disabled={confirmed.length === 0}
        />
      </View>

      {/* Category Picker Modal */}
      <Modal visible={showCatPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.catModal} edges={['top', 'bottom']}>
          <View style={styles.catHeader}>
            <Text style={styles.catTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCatPicker(false)}>
              <Text style={styles.catClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={CATEGORIES}
            keyExtractor={c => c}
            renderItem={({ item: cat }) => (
              <TouchableOpacity
                style={[styles.catItem, editIdx !== null && pending[editIdx]?.category === cat && styles.catItemActive]}
                onPress={async () => {
                  if (editIdx !== null) {
                    updateCategory(editIdx, cat);
                    await saveCategoryCorrection(
                      pending[editIdx].merchant,
                      cat as any,
                    );
                  }
                  setShowCatPicker(false);
                }}>
                <Text style={styles.catItemIcon}>{CATEGORY_ICONS[cat] || '📦'}</Text>
                <Text style={styles.catItemText}>{cat}</Text>
                {editIdx !== null && pending[editIdx]?.category === cat && (
                  <Text style={styles.catCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  cancelBtn: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.medium },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  summaryBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary },
  summaryLabel: { fontSize: FontSize.xxs, color: Colors.textLight, textTransform: 'uppercase' },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  tapHint: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xs, backgroundColor: Colors.surfaceAlt },
  list: { paddingBottom: 100 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  itemIgnored: { opacity: 0.45 },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: Spacing.sm },
  itemCheck: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.accent + '20',
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  itemCheckIcon: { fontSize: 14, color: Colors.accent, fontWeight: FontWeight.bold },
  itemInfo: { flex: 1 },
  itemMerchant: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  itemTextIgnored: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap', gap: 4 },
  itemDate: { fontSize: FontSize.xs, color: Colors.textLight },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textMuted },
  confidenceDot: { fontSize: FontSize.xxs, fontWeight: FontWeight.medium },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.divider, marginLeft: 60 },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  catModal: { flex: 1, backgroundColor: Colors.background },
  catHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  catTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  catClose: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.semibold },
  catItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider,
  },
  catItemActive: { backgroundColor: Colors.primary + '10' },
  catItemIcon: { fontSize: 20, marginRight: Spacing.md, width: 28 },
  catItemText: { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary },
  catCheckmark: { fontSize: FontSize.md, color: Colors.primary, fontWeight: FontWeight.bold },
});
