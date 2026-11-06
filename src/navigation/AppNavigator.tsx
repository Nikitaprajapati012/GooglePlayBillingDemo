import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { ImageGalleryScreen } from '../screens/ImageGalleryScreen';
import { StoreScreen } from '../screens/StoreScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { useUser } from '../context/UserContext';

type TabName = 'home' | 'gallery' | 'store' | 'history';

export const AppNavigator: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabName>('home');
  const { credits, isLifetimePremium, activeSubscription } = useUser();

  const renderScreen = () => {
    switch (currentTab) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToStore={() => setCurrentTab('store')}
            onNavigateToHistory={() => setCurrentTab('history')}
            onNavigateToGallery={() => setCurrentTab('gallery')}
          />
        );
      case 'gallery':
        return <ImageGalleryScreen onNavigateToStore={() => setCurrentTab('store')} />;
      case 'store':
        return <StoreScreen />;
      case 'history':
        return <HistoryScreen />;
      default:
        return (
          <HomeScreen
            onNavigateToStore={() => setCurrentTab('store')}
            onNavigateToHistory={() => setCurrentTab('history')}
            onNavigateToGallery={() => setCurrentTab('gallery')}
          />
        );
    }
  };

  const hasPremium = isLifetimePremium || activeSubscription?.isActive;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>Play Billing</Text>
          <Text style={styles.topBarSubtitle}>Android Sandbox</Text>
        </View>

        <View style={styles.topBarPills}>
          {hasPremium && (
            <View style={styles.premiumPill}>
              <Text style={styles.premiumPillText}>PRO</Text>
            </View>
          )}
          <View style={styles.creditPill}>
            <Text style={styles.creditPillText}>{credits} pts</Text>
          </View>
        </View>
      </View>

      {/* Screen Body */}
      <View style={styles.body}>{renderScreen()}</View>

      {/* Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navItem, currentTab === 'home' && styles.navItemActive]}
          onPress={() => setCurrentTab('home')}>
          <Text style={[styles.navIcon, currentTab === 'home' && styles.navTextActive]}>
            🏠
          </Text>
          <Text style={[styles.navText, currentTab === 'home' && styles.navTextActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentTab === 'gallery' && styles.navItemActive]}
          onPress={() => setCurrentTab('gallery')}>
          <Text style={[styles.navIcon, currentTab === 'gallery' && styles.navTextActive]}>
            🖼️
          </Text>
          <Text style={[styles.navText, currentTab === 'gallery' && styles.navTextActive]}>
            Gallery
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentTab === 'store' && styles.navItemActive]}
          onPress={() => setCurrentTab('store')}>
          <Text style={[styles.navIcon, currentTab === 'store' && styles.navTextActive]}>
            🛍️
          </Text>
          <Text style={[styles.navText, currentTab === 'store' && styles.navTextActive]}>
            Store
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentTab === 'history' && styles.navItemActive]}
          onPress={() => setCurrentTab('history')}>
          <Text style={[styles.navIcon, currentTab === 'history' && styles.navTextActive]}>
            📋
          </Text>
          <Text style={[styles.navText, currentTab === 'history' && styles.navTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  topBarSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  topBarPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  premiumPillText: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 11,
  },
  creditPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  creditPillText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 12,
  },
  body: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#EFF6FF',
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  navText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  navTextActive: {
    color: '#0B57D0',
    fontWeight: '700',
  },
});
