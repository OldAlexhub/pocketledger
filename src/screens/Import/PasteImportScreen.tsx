import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { getCategoryCorrections, getStatements } from '../../storage/storage';
import { parseStatementText } from '../../utils/statementParser';
import { uuid } from '../../utils/dateUtils';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight, Spacing } from '../../constants/theme';

const EXAMPLE_TEXT = `01/03/2025  WALMART SUPERCENTER    -$87.45
01/05/2025  NETFLIX.COM             -$15.99
01/07/2025  SHELL OIL               -$52.00
01/10/2025  MCDONALD'S              -$14.32
01/15/2025  DIRECT DEPOSIT PAYROLL  +$4200.00`;

export function PasteImportScreen() {
  const navigation = useNavigation<any>();
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) {
      Alert.alert('Empty', 'Please paste your statement text first.');
      return;
    }

    const stmts = await getStatements();
    if (stmts.length >= 3) {
      Alert.alert('Limit Reached', 'You can import up to 3 statements. Delete one first.');
      return;
    }

    setParsing(true);
    const corrections = await getCategoryCorrections();
    const pending = parseStatementText(text, corrections);

    if (pending.length === 0) {
      Alert.alert(
        'No Transactions Found',
        'Could not find any transaction data in the pasted text. Make sure the text includes dates, amounts, and merchant names.',
      );
      setParsing(false);
      return;
    }

    const statementId = uuid();
    navigation.navigate('ImportReview', {
      statementId,
      fileName: 'Pasted Statement',
      pending,
    });
    setParsing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Paste Statement Text</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>How to use</Text>
          <Text style={styles.instructionText}>
            1. Open your bank's website or app{'\n'}
            2. Navigate to your transaction history{'\n'}
            3. Select and copy the transaction text{'\n'}
            4. Paste it below and tap Parse
          </Text>
          <Text style={styles.privacyNote}>
            🔒 All processing happens locally on your device. Nothing is sent anywhere.
          </Text>
        </View>

        {/* Text Input */}
        <View style={styles.textAreaContainer}>
          <Text style={styles.label}>Pasted Statement Text</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={text}
            onChangeText={setText}
            placeholder={`Paste your statement text here...\n\nExample:\n${EXAMPLE_TEXT}`}
            placeholderTextColor={Colors.textMuted}
            textAlignVertical="top"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {text.trim().length > 0 && (
          <Text style={styles.charCount}>{text.length} characters pasted</Text>
        )}

        <View style={styles.btnContainer}>
          <Button
            label={parsing ? 'Parsing...' : 'Parse Transactions'}
            onPress={handleParse}
            loading={parsing}
            fullWidth
            size="lg"
          />
          {text.trim().length === 0 && (
            <Button
              label="Use Sample Data"
              onPress={() => setText(EXAMPLE_TEXT)}
              variant="outline"
              fullWidth
              style={styles.sampleBtn}
            />
          )}
          {text.trim().length > 0 && (
            <Button
              label="Clear"
              onPress={() => setText('')}
              variant="ghost"
              fullWidth
              style={styles.sampleBtn}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  title: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  content: { padding: Spacing.lg },
  instructionCard: {
    backgroundColor: Colors.primary + '0D',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  instructionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.primary, marginBottom: Spacing.sm },
  instructionText: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },
  privacyNote: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: Spacing.md, lineHeight: 18 },
  textAreaContainer: { marginBottom: Spacing.sm },
  label: { fontSize: FontSize.xs, color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, fontWeight: FontWeight.medium },
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 240,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  charCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', marginBottom: Spacing.md },
  btnContainer: { gap: Spacing.sm },
  sampleBtn: { marginTop: Spacing.xs },
});
