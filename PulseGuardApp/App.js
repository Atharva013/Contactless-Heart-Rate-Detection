import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import FingerScreen from './src/screens/FingerScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import { colors } from './src/theme/colors';
import { getSessionUser, onAuthStateChange, signOut } from './src/services/auth';

const Stack = createNativeStackNavigator();

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    getSessionUser()
      .then(currentUser => {
        if (mounted) setUser(currentUser);
      })
      .finally(() => {
        if (mounted) setBooting(false);
      });

    const subscription = onAuthStateChange(nextUser => setUser(nextUser));
    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gradientStart }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#eef7ee' },
          headerTintColor: '#1b1b2f',
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Home" options={{ headerShown: false }}>
          {props => <HomeScreen {...props} user={user} onSignOut={handleSignOut} />}
        </Stack.Screen>
        <Stack.Screen name="Camera" component={CameraScreen}
          options={({ route }) => ({
            title: route.params?.forceVisual ? 'Visual Assessment' : 'Face Scan',
          })} />
        <Stack.Screen name="Finger" component={FingerScreen}
          options={{ title: 'Finger Pulse' }} />
        <Stack.Screen name="Results" options={{ title: 'Results', headerBackVisible: false }}>
          {props => <ResultsScreen {...props} user={user} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
