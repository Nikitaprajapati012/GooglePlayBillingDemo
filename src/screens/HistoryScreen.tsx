import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { TransactionRecord } from '../types/billing';

export const HistoryScreen: React.FC = () => {
  const { transactions } = useUser();

  const getStatusBadgeStyle = (status: TransactionRecord['status']) => {
    switch (status) {
      case 'COMPLETED':
        return { bg: '#DCFCE7', text: '#166534' };
      case 'PENDING':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'REFUNDED':
        return { bg: '#FEE2E2', text: '#991B1B' };
      default:
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  const getCategoryLabel = (category: TransactionRecord['category']) => {
    switch (category) {
      case 'consumable':
        return 'Consumable Credits';
      case 'non_consumable':
        return 'Lifetime Unlock';
      case 'subscription':
        return 'Recurring Plan';
      default:
        return category;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Purchase History</Text>
        <Text style={styles.headerSubtitle}>
          Audit log of all processed, pending, and restored transactions.
        </Text>
      </View>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Purchases Yet</Text>
          <Text style={styles.emptySubtitle}>
            Transactions made in the Store or restored from Google Play will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {transactions.map(item => {
            const badge = getStatusBadgeStyle(item.status);
            return (
              <View key={item.id} style={styles.txCard}>
                <View style={styles.txHeader}>
                  <View>
                    <Text style={styles.productName}>{item.productName}</Text>
                    <Text style={styles.categoryLabel}>{getCategoryLabel(item.category)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.txDetailsGrid}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Order ID:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {item.orderId}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Date & Time:</Text>
                    <Text style={styles.detailValue}>{item.purchaseDate}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Amount:</Text>
                    <Text style={[styles.detailValue, styles.amountValue]}>
                      {item.price}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Token Preview:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {item.purchaseToken ? `${item.purchaseToken.slice(0, 18)}...` : 'N/A'}
                    </Text>
                  </View>

                  {item.subscriptionStatus && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Sub Status:</Text>
                      <Text style={[styles.detailValue, { color: '#059669', fontWeight: '700' }]}>
                        {item.subscriptionStatus}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    gap: 12,
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  txDetailsGrid: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailKey: {
    fontSize: 12,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    maxWidth: 200,
  },
  amountValue: {
    color: '#0B57D0',
    fontWeight: '700',
  },
});
