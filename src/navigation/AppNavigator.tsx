import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppState, AppStateStatus } from 'react-native';
import { getSettings } from '../storage/storage';
import { TabNavigator } from './TabNavigator';
import { LockScreen } from '../components/LockScreen';

export function AppNavigator() {
  const [locked, setLocked] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [lockOnBackground, setLockOnBackground] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    getSettings().then(s => {
      if (s.appLock.enabled && s.appLock.lockOnOpen) {
        setLocked(true);
      }
      setLockOnBackground(s.appLock.enabled && s.appLock.lockOnBackground);
      setSettingsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!lockOnBackground) return;

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appState.current === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        setLocked(true);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [lockOnBackground]);

  if (!settingsLoaded) return null;

  if (locked) {
    return <LockScreen onUnlock={() => setLocked(false)} />;
  }

  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}
