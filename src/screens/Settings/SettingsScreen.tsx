import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { getSettings, saveSettings, resetAllData } from '../../storage/storage';
import { AppSettings } from '../../models/types';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight, Radius, Spacing } from '../../constants/theme';

const APP_VERSION = '1.0.0';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const load = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateSetting = async (updater: (s: AppSettings) => AppSettings) => {
    if (!settings) return;
    const updated = updater(settings);
    setSettings(updated);
    await saveSettings(updated);
  };

  const updateLock = async (key: keyof AppSettings['appLock'], value: boolean) => {
    await updateSetting(s => ({
      ...s,
      appLock: { ...s.appLock, [key]: value },
    }));
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all transactions, statements, budgets, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            Alert.alert('Done', 'All data has been cleared.');
            load();
          },
        },
      ],
    );
  };

  if (!settings) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Budget & Planning */}
        <Text style={styles.sectionTitle}>Budget & Planning</Text>
        <Card noPadding>
          <SettingRow
            label="Budget Settings"
            description="Set income, savings goal, and fixed bills"
            onPress={() => navigation.navigate('Budget')}
            showArrow
          />
        </Card>

        {/* App Lock */}
        <Text style={styles.sectionTitle}>App Lock</Text>
        <Card noPadding>
          <SettingSwitch
            label="Enable App Lock"
            description="Require biometric or PIN to open the app"
            value={settings.appLock.enabled}
            onToggle={v => updateLock('enabled', v)}
            first
          />
          {settings.appLock.enabled && (
            <>
              <SettingSwitch
                label="Lock on Open"
                description="Require unlock each time the app opens"
                value={settings.appLock.lockOnOpen}
                onToggle={v => updateLock('lockOnOpen', v)}
              />
              <SettingSwitch
                label="Lock in Background"
                description="Lock when app goes to background"
                value={settings.appLock.lockOnBackground}
                onToggle={v => updateLock('lockOnBackground', v)}
              />
              <SettingSwitch
                label="Lock Before Imports"
                description="Require unlock before viewing imports"
                value={settings.appLock.requireUnlockForImports}
                onToggle={v => updateLock('requireUnlockForImports', v)}
              />
              <SettingSwitch
                label="Lock Before Exports"
                description="Require unlock before exporting reports"
                value={settings.appLock.requireUnlockForExports}
                onToggle={v => updateLock('requireUnlockForExports', v)}
                last
              />
            </>
          )}
        </Card>
        {settings.appLock.enabled && (
          <Text style={styles.lockNote}>
            🔒 PocketLedger does not collect, store, or transmit biometric data. Authentication is handled locally by your Android device.
          </Text>
        )}

        {/* Currency */}
        <Text style={styles.sectionTitle}>Display</Text>
        <Card noPadding>
          <SettingRow
            label="Currency Symbol"
            value="$"
            description="US Dollar"
            first
            last
          />
        </Card>

        {/* Data */}
        <Text style={styles.sectionTitle}>Data</Text>
        <Card noPadding>
          <SettingRow
            label="Privacy Policy"
            onPress={() => navigation.navigate('Budget')}
            showArrow
            first
          />
          <SettingRow
            label="Reset All Data"
            onPress={handleResetData}
            destructive
            last
          />
        </Card>

        {/* Disclaimer */}
        <Card style={styles.disclaimerCard} elevation="none">
          <Text style={styles.disclaimerTitle}>Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            PocketLedger is a personal budget organization tool. It does not provide financial, tax, credit, loan, investment, or accounting advice. All calculations are estimates based on the information you enter or import.
          </Text>
        </Card>

        {/* Privacy */}
        <Card style={styles.privacyCard} elevation="none">
          <Text style={styles.privacyTitle}>Privacy</Text>
          <Text style={styles.privacyText}>
            PocketLedger does not require an account, does not collect personal data, and does not send financial data to any server. All data stays locally on your device.
          </Text>
        </Card>

        {/* Version */}
        <Text style={styles.version}>PocketLedger v{APP_VERSION} · com.oldalexhub.pocketledger</Text>
        <Text style={styles.versionSub}>Local-only · No backend · No account required</Text>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  destructive?: boolean;
  first?: boolean;
  last?: boolean;
}

function SettingRow({ label, description, value, onPress, showArrow, destructive, first, last }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, first && styles.settingRowFirst, last && styles.settingRowLast]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.settingLeft}>
        <Text style={[styles.settingLabel, destructive && styles.settingLabelDestructive]}>
          {label}
        </Text>
        {description && <Text style={styles.settingDesc}>{description}</Text>}
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {showArrow && <Text style={styles.settingArrow}>›</Text>}
      </View>
    </TouchableOpacity>
  );
}

interface SettingSwitchProps {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  first?: boolean;
  last?: boolean;
}

function SettingSwitch({ label, description, value, onToggle, first, last }: SettingSwitchProps) {
  return (
    <View style={[styles.settingRow, first && styles.settingRowFirst, last && styles.settingRowLast]}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDesc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={value ? '#fff' : '#fff'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textLight,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.xs,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider,
  },
  settingRowFirst: { borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  settingRowLast: { borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg, borderBottomWidth: 0 },
  settingLeft: { flex: 1 },
  settingLabel: { fontSize: FontSize.base, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  settingLabelDestructive: { color: Colors.danger },
  settingDesc: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2, lineHeight: 16 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  settingValue: { fontSize: FontSize.base, color: Colors.textLight },
  settingArrow: { fontSize: 22, color: Colors.textMuted },
  lockNote: {
    fontSize: FontSize.xs, color: Colors.textLight,
    marginHorizontal: Spacing.lg, marginTop: Spacing.xs,
    lineHeight: 18, fontStyle: 'italic',
  },
  disclaimerCard: { backgroundColor: Colors.warningLight, marginTop: Spacing.xl },
  disclaimerTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.warning, marginBottom: Spacing.sm },
  disclaimerText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  privacyCard: { backgroundColor: Colors.primary + '0D', borderWidth: 1, borderColor: Colors.primary + '25' },
  privacyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.primary, marginBottom: Spacing.sm },
  privacyText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  version: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xl },
  versionSub: { textAlign: 'center', fontSize: FontSize.xxs, color: Colors.textMuted, marginTop: 2, marginBottom: Spacing.md },
  bottomPad: { height: Spacing.xxxl },
});
