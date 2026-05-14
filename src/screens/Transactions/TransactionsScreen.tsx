import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryBadge } from '../../components/CategoryBadge';
import { AmountText } from '../../components/AmountText';
import { EmptyState } from '../../components/EmptyState';
import { getTransactions, deleteTransaction } from '../../storage/storage';
import { Transaction } from '../../models/types';
import { formatShortDate, getMonthKey, getMonthsFromTransactions, monthKeyToLabel } from '../../utils/dateUtils';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight, Radius, Spacing } from '../../constants/theme';
import { AddTransactionScreen } from './AddTransactionScreen';

export function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState<string | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | undefined>();
  const currencySymbol = '$';

  const load = useCallback(async () => {
    const txns = await getTransactions();
    setTransactions(txns.sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  useFocusEffect(
    useCallback(() => { load(); }, [load]),
  );

  const months = useMemo(
    () => getMonthsFromTransactions(transactions.map(t => t.date)),
    [transactions],
  );

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterMonth !== 'all' && getMonthKey(t.date) !== filterMonth) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.merchant.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [transactions, filterMonth, filterType, search]);

  const handleLongPress = (txn: Transaction) => {
    Alert.alert(txn.merchant, `${txn.type === 'income' ? '+' : '-'}${currencySymbol}${txn.amount.toFixed(2)}`, [
      { text: 'Edit', onPress: () => { setEditTxn(txn); setShowAddModal(true); } },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteTransaction(txn.id);
          load();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.txnItem}
      onLongPress={() => handleLongPress(item)}
      activeOpacity={0.75}>
      <View style={styles.txnLeft}>
        <View style={styles.txnIconContainer}>
          <Text style={styles.txnIcon}>{item.type === 'income' ? '💰' : '💸'}</Text>
        </View>
        <View style={styles.txnInfo}>
          <Text style={styles.txnMerchant} numberOfLines={1}>{item.merchant}</Text>
          <View style={styles.txnMeta}>
            <Text style={styles.txnDate}>{formatShortDate(item.date)}</Text>
            <View style={styles.txnDot} />
            <CategoryBadge category={item.category} size="sm" showIcon={false} />
          </View>
        </View>
      </View>
      <View style={styles.txnRight}>
        <AmountText
          amount={item.amount}
          type={item.type}
          size="md"
          symbol={currencySymbol}
          showSign={item.type === 'income'}
        />
        {item.source === 'import' && (
          <Text style={styles.txnSourceBadge}>Imported</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setEditTxn(undefined); setShowAddModal(true); }}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search merchant or description..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <FilterChip
          label={filterType === 'all' ? 'All Types' : filterType === 'income' ? 'Income' : 'Expenses'}
          onPress={() => {
            setFilterType(prev => prev === 'all' ? 'income' : prev === 'income' ? 'expense' : 'all');
          }}
          active={filterType !== 'all'}
        />
        <FilterChip
          label={filterMonth === 'all' ? 'All Months' : monthKeyToLabel(filterMonth).split(' ')[0]}
          onPress={() => {
            const idx = filterMonth === 'all' ? 0 : months.indexOf(filterMonth);
            setFilterMonth(months.length === 0 ? 'all' : months[(idx + 1) % (months.length + 1)] || 'all');
          }}
          active={filterMonth !== 'all'}
        />
      </View>

      {/* Count */}
      <Text style={styles.countLabel}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</Text>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="No transactions yet"
            message="Add a transaction or import a statement to get started."
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <AddTransactionScreen
          existing={editTxn}
          onClose={() => { setShowAddModal(false); setEditTxn(undefined); load(); }}
        />
      </Modal>
    </SafeAreaView>
  );
}

function FilterChip({ label, onPress, active }: { label: string; onPress: () => void; active: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
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
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
  },
  addBtnText: { color: '#fff', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  searchContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filters: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
  chip: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  chipTextActive: { color: '#fff' },
  countLabel: { fontSize: FontSize.xs, color: Colors.textMuted, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  listContent: { paddingBottom: Spacing.xxxl },
  emptyContainer: { flex: 1 },
  txnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  txnLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: Spacing.md },
  txnIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  txnIcon: { fontSize: 18 },
  txnInfo: { flex: 1 },
  txnMerchant: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  txnMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  txnDate: { fontSize: FontSize.xs, color: Colors.textLight },
  txnDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textMuted, marginHorizontal: 6 },
  txnRight: { alignItems: 'flex-end' },
  txnSourceBadge: {
    fontSize: FontSize.xxs,
    color: Colors.textMuted,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 3,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.divider, marginLeft: 72 },
});
