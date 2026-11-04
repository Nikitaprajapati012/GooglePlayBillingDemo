import React from 'react';
import { StatusBar } from 'react-native';
import { UserProvider } from './src/context/UserContext';
import { BillingProvider } from './src/context/BillingContext';
import { AppNavigator } from './src/navigation/AppNavigator';

const App: React.FC = () => {
  return (
    <UserProvider>
      <BillingProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <AppNavigator />
      </BillingProvider>
    </UserProvider>
  );
};

export default App;
