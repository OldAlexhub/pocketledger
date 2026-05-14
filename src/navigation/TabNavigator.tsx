import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { FontSize } from '../constants/theme';

// Screens
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { TransactionsScreen } from '../screens/Transactions/TransactionsScreen';
import { ImportScreen } from '../screens/Import/ImportScreen';
import { ImportReviewScreen } from '../screens/Import/ImportReviewScreen';
import { PasteImportScreen } from '../screens/Import/PasteImportScreen';
import { InsightsScreen } from '../screens/Insights/InsightsScreen';
import { ReportsScreen } from '../screens/Reports/ReportsScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { BudgetScreen } from '../screens/Budget/BudgetScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  AddTransaction: { transaction?: any } | undefined;
  ImportReview: { statementId: string; fileName: string; pending: any[] };
  PasteImport: undefined;
  Budget: undefined;
  Reports: undefined;
};

export type TabParamList = {
  Home: undefined;
  Transactions: undefined;
  Import: undefined;
  Insights: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.55 }}>
      {emoji}
    </Text>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={DashboardScreen} />
    </Stack.Navigator>
  );
}

function TransactionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TransactionsScreen} />
    </Stack.Navigator>
  );
}

function ImportStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={ImportScreen} />
      <Stack.Screen name="ImportReview" component={ImportReviewScreen} />
      <Stack.Screen name="PasteImport" component={PasteImportScreen} />
    </Stack.Navigator>
  );
}

function InsightsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={InsightsScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={SettingsScreen} />
      <Stack.Screen name="Budget" component={BudgetScreen} />
    </Stack.Navigator>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.tabBarActive,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsStack}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Import"
        component={ImportStack}
        options={{
          tabBarLabel: 'Import',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsStack}
        options={{
          tabBarLabel: 'Insights',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💡" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 60,
    paddingBottom: 8,
    paddingTop: 6,
    elevation: 8,
  },
  tabLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '500',
    marginTop: 2,
  },
});
