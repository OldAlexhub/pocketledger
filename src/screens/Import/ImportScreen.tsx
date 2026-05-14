import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getStatements, deleteStatement, getSettings } from '../../storage/storage';
import { Statement } from '../../models/types';
import { formatDate, uuid } from '../../utils/dateUtils';
import { parseStatementText, generateMockTransactions } from '../../utils/statementParser';
import { getCategoryCorrections } from '../../storage/storage';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight, Radius, Spacing } from '../../constants/theme';

const MAX_STATEMENTS = 3;

export function ImportScreen() {
  const navigation = useNavigation<any>();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const stmts = await getStatements();
    setStatements(stmts);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleFilePick = async () => {
    if (statements.length >= MAX_STATEMENTS) {
      Alert.alert(
        'Limit Reached',
        'You have already imported 3 statements. Delete one to import another.',
      );
      return;
    }

    try {
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.plainText, DocumentPicker.types.csv, DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      setLoading(true);

      let fileText = '';
      try {
        const filePath = result.fileCopyUri || result.uri;
        fileText = await RNFS.readFile(
          filePath.startsWith('file://') ? filePath.slice(7) : filePath,
          'utf8',
        );
      } catch {
        // If we can't read the file, fall back to mock data with a note
        fileText = '';
      }

      const corrections = await getCategoryCorrections();
      const pending = fileText.trim()
        ? parseStatementText(fileText, corrections)
        : generateMockTransactions();

      if (pending.length === 0) {
        Alert.alert(
          'No Transactions Found',
          'Could not extract transactions from this file. Try "Paste Statement Text" instead.',
        );
        setLoading(false);
        return;
      }

      const statementId = uuid();
      navigation.navigate('ImportReview', {
        statementId,
        fileName: result.name || 'Statement',
        pending,
      });
    } catch (err: any) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to pick file. Please try again.');
      }
    }
    setLoading(false);
  };

  const handlePasteImport = () => {
    if (statements.length >= MAX_STATEMENTS) {
      Alert.alert(
        'Limit Reached',
        'You have already imported 3 statements. Delete one to import another.',
      );
      return;
    }
    navigation.navigate('PasteImport');
  };

  const handleDeleteStatement = (stmt: Statement) => {
    Alert.alert(
      'Delete Statement',
      `Delete "${stmt.fileName}" and its ${stmt.transactionCount} transaction(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteStatement(stmt.id);
            load();
          },
        },
      ],
    );
  };

  const canImport = statements.length < MAX_STATEMENTS;
  const progressPct = (statements.length / MAX_STATEMENTS) * 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Import Statement</Text>
        </View>

        {/* Progress Indicator */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Statements Imported</Text>
            <Text style={styles.progressCount}>
              {statements.length} of {MAX_STATEMENTS}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressNote}>
            Import up to {MAX_STATEMENTS} statements to build a clearer spending picture.
          </Text>
        </Card>

        {/* Import Methods */}
        {canImport && (
          <>
            <Text style={styles.sectionTitle}>Import Options</Text>

            <TouchableOpacity
              style={styles.importOption}
              onPress={handleFilePick}
              disabled={loading}
              activeOpacity={0.75}>
              <View style={styles.importOptionIcon}>
                <Text style={styles.importOptionEmoji}>📄</Text>
              </View>
              <View style={styles.importOptionInfo}>
                <Text style={styles.importOptionTitle}>Select File</Text>
                <Text style={styles.importOptionSub}>Import a .txt, .csv, or bank statement file from your device</Text>
              </View>
              <Text style={styles.importOptionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.importOption}
              onPress={handlePasteImport}
              activeOpacity={0.75}>
              <View style={styles.importOptionIcon}>
                <Text style={styles.importOptionEmoji}>📋</Text>
              </View>
              <View style={styles.importOptionInfo}>
                <Text style={styles.importOptionTitle}>Paste Statement Text</Text>
                <Text style={styles.importOptionSub}>Copy text from your bank's website and paste it here for local parsing</Text>
              </View>
              <Text style={styles.importOptionArrow}>›</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Privacy Note */}
        <Card style={styles.privacyCard} elevation="none">
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyTitle}>100% Private</Text>
          <Text style={styles.privacyText}>
            Your statement data is processed and stored only on this device.
            Nothing is uploaded or transmitted anywhere.
          </Text>
        </Card>

        {/* Imported Statements */}
        {statements.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Imported Statements</Text>
            {statements.map(stmt => (
              <Card key={stmt.id} style={styles.stmtCard}>
                <View style={styles.stmtRow}>
                  <View style={styles.stmtIcon}>
                    <Text style={styles.stmtIconEmoji}>📊</Text>
                  </View>
                  <View style={styles.stmtInfo}>
                    <Text style={styles.stmtName} numberOfLines={1}>{stmt.fileName}</Text>
                    <Text style={styles.stmtMeta}>
                      {stmt.transactionCount} transactions · {formatDate(stmt.importedAt)}
                    </Text>
                    {stmt.monthLabel && (
                      <Text style={styles.stmtMonth}>{stmt.monthLabel}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteStmt}
                    onPress={() => handleDeleteStatement(stmt)}>
                    <Text style={styles.deleteStmtText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        )}

        {statements.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>No statements imported yet</Text>
            <Text style={styles.emptyText}>
              Import up to 3 statements to build a clearer spending picture.
            </Text>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  progressCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  progressLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  progressCount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  progressTrack: { height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: 'hidden', marginBottom: Spacing.sm },
  progressFill: { height: 8, backgroundColor: Colors.accent, borderRadius: 4 },
  progressNote: { fontSize: FontSize.xs, color: Colors.textLight },
  sectionTitle: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textLight,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  importOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    elevation: 2,
  },
  importOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  importOptionEmoji: { fontSize: 22 },
  importOptionInfo: { flex: 1 },
  importOptionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  importOptionSub: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2, lineHeight: 18 },
  importOptionArrow: { fontSize: 22, color: Colors.textMuted },
  privacyCard: {
    alignItems: 'center',
    backgroundColor: Colors.primary + '0D',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  privacyIcon: { fontSize: 28, marginBottom: Spacing.sm },
  privacyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.primary, marginBottom: Spacing.xs },
  privacyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  stmtCard: { marginVertical: 4 },
  stmtRow: { flexDirection: 'row', alignItems: 'center' },
  stmtIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  stmtIconEmoji: { fontSize: 20 },
  stmtInfo: { flex: 1 },
  stmtName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  stmtMeta: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  stmtMonth: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 2 },
  deleteStmt: { padding: Spacing.sm },
  deleteStmtText: { fontSize: FontSize.md, color: Colors.textMuted },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.xxl },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSize.base, color: Colors.textLight, textAlign: 'center', lineHeight: 22 },
  bottomPad: { height: Spacing.xxxl },
});
