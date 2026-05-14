import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight, Spacing } from '../constants/theme';

interface LockScreenProps {
  onUnlock: () => void;
}

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [biometryType, setBiometryType] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    rnBiometrics.isSensorAvailable().then(result => {
      setBiometryType(result.biometryType || null);
    }).catch(() => setBiometryType(null));
  }, []);

  const handleUnlock = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Unlock PocketLedger',
        cancelButtonText: 'Cancel',
      });
      if (success) {
        onUnlock();
      }
    } catch {
      Alert.alert(
        'Authentication Failed',
        'Could not authenticate. Please try again.',
        [{ text: 'Try Again', onPress: () => setChecking(false) }],
      );
      return;
    }
    setChecking(false);
  };

  const getIcon = () => {
    if (biometryType === BiometryTypes.FaceID) return '👤';
    if (biometryType === BiometryTypes.TouchID) return '👆';
    return '🔒';
  };

  const getLabel = () => {
    if (biometryType === BiometryTypes.FaceID) return 'Use Face Unlock';
    if (biometryType === BiometryTypes.TouchID) return 'Use Fingerprint';
    return 'Unlock with Device PIN';
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Unlock PocketLedger</Text>
        <Text style={styles.subtitle}>Your budget data stays private on this device.</Text>

        <TouchableOpacity
          style={styles.unlockButton}
          onPress={handleUnlock}
          disabled={checking}
          activeOpacity={0.8}>
          <Text style={styles.unlockIcon}>{getIcon()}</Text>
          <Text style={styles.unlockLabel}>{checking ? 'Authenticating...' : getLabel()}</Text>
        </TouchableOpacity>

        <Text style={styles.privacyNote}>
          PocketLedger does not collect, store, or transmit biometric data.
          Authentication is handled locally by Android.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    width: '100%',
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxxl,
  },
  unlockButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  unlockIcon: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  unlockLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
  },
  privacyNote: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.xxl,
  },
});
