import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header } from '../../components/common';
import { InvoiceCard } from '../../components/owner';
import { useApp } from '../../context/AppContext';
import { billingService } from '../../services';
import type { DashboardStats } from '../../services/billing.service';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { invoices } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const [liveStats, setLiveStats] = useState<DashboardStats | null>(null);

  const fetchLiveStats = async () => {
    try {
      const stats = await billingService.getDashboardStats();
      if (stats) {
        setLiveStats(stats);
      }
    } catch (err) {
      console.log('Error fetching dashboard stats:', err);
    }
  };

  useEffect(() => {
    fetchLiveStats();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchLiveStats();
    setRefreshing(false);
  }, []);

  // Financial figures strictly matching requirements:
  // Today's Sales = invoices created today
  // Total Received = cash + online received today
  // Total Pending = actual outstanding balance across invoices
  const todaySalesNum = liveStats?.total_sales
    ? parseFloat(liveStats.total_sales)
    : 0;

  const todayReceivedNum = liveStats?.total_received
    ? parseFloat(liveStats.total_received)
    : liveStats?.cash_received && liveStats?.online_received
    ? parseFloat(liveStats.cash_received) + parseFloat(liveStats.online_received)
    : 0;

  const totalPendingNum = liveStats?.total_pending
    ? parseFloat(liveStats.total_pending)
    : invoices.reduce((sum, item) => {
        if (item.status !== 'PAID') {
          return sum + (item.numericAmount || 0);
        }
        return sum;
      }, 0);

  // Recent 5 invoices sorted by id descending
  const recentInvoices = [...invoices].slice(0, 5);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <Header title="Chai Flow" showNotification={true} />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8C331A"
            colors={['#8C331A']}
          />
        }
      >
        {/* 1. FINANCIAL KPI SUMMARY BANNER */}
        <View style={styles.kpiHeroCard}>
          <View style={styles.kpiTopRow}>
            <View>
              <Text style={styles.kpiLabel}>TODAY'S SALES</Text>
              <Text style={styles.kpiMainValue}>
                ₹{todaySalesNum.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.reportsPill}
              onPress={() => navigation.navigate('Reports')}
            >
              <Text style={styles.reportsPillText}>Reports</Text>
              <Ionicons name="arrow-forward" size={14} color="#F7D3C6" />
            </TouchableOpacity>
          </View>

          <View style={styles.kpiDivider} />

          <View style={styles.kpiBottomRow}>
            <View style={styles.kpiSubCol}>
              <View style={styles.dotLabelRow}>
                <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.kpiSubLabel}>TODAY RECEIVED</Text>
              </View>
              <Text style={styles.kpiSubValueGreen}>
                ₹{todayReceivedNum.toLocaleString()}
              </Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.kpiSubCol}>
              <View style={styles.dotLabelRow}>
                <View style={[styles.dot, { backgroundColor: '#F87171' }]} />
                <Text style={styles.kpiSubLabel}>PENDING DUE</Text>
              </View>
              <Text style={styles.kpiSubValueRed}>
                ₹{totalPendingNum.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. PRIMARY ACTION: QUICK BILLING / NEW COUNTER BILL */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.primaryActionCard}
          onPress={() => navigation.navigate('QuickBilling')}
        >
          <View style={styles.primaryActionLeft}>
            <View style={styles.primaryActionIconBox}>
              <Ionicons name="flash" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.primaryActionTextCol}>
              <Text style={styles.primaryActionTitle}>New Counter Bill</Text>
              <Text style={styles.primaryActionSubtitle}>
                Instant product selection & checkout
              </Text>
            </View>
          </View>
          <View style={styles.primaryActionBtnPill}>
            <Text style={styles.primaryActionBtnText}>Open</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* 3. CORE MODULE SHORTCUTS 4-GRID */}
        <Text style={styles.sectionHeader}>QUICK SHORTCUTS</Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.gridCard}
            onPress={() => navigation.navigate('Products')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="cube-outline" size={20} color="#2563EB" />
            </View>
            <Text style={styles.gridTitle}>Products</Text>
            <Text style={styles.gridSubtitle}>Catalog & prices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.gridCard}
            onPress={() => navigation.navigate('Invoices')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#FDEBE4' }]}>
              <Ionicons name="receipt-outline" size={20} color="#8C331A" />
            </View>
            <Text style={styles.gridTitle}>Invoices</Text>
            <Text style={styles.gridSubtitle}>A4 PDF & bills</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.gridCard}
            onPress={() => navigation.navigate('Customers')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="people-outline" size={20} color="#059669" />
            </View>
            <Text style={styles.gridTitle}>Customers</Text>
            <Text style={styles.gridSubtitle}>Ledger & balances</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.gridCard}
            onPress={() => navigation.navigate('Reports')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="bar-chart-outline" size={20} color="#D97706" />
            </View>
            <Text style={styles.gridTitle}>Reports</Text>
            <Text style={styles.gridSubtitle}>Sales audit & MTD</Text>
          </TouchableOpacity>
        </View>

        {/* 4. RECENT INVOICES SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>RECENT INVOICES</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Invoices')}
          >
            <Text style={styles.viewAllText}>
              View All ({invoices.length})
            </Text>
          </TouchableOpacity>
        </View>

        {recentInvoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color="#D1C7BD" />
            <Text style={styles.emptyText}>No invoices recorded yet</Text>
          </View>
        ) : (
          recentInvoices.map(inv => (
            <InvoiceCard
              key={inv.id}
              name={inv.name}
              invoiceNo={inv.invoiceNo}
              amount={inv.amount}
              due={inv.due}
              isOverdue={inv.isOverdue}
              status={inv.status}
              onPress={() => navigation.navigate('InvoiceDetail', { invoice: inv })}
            />
          ))
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },

  /* 1. KPI Hero Card */
  kpiHeroCard: {
    backgroundColor: '#7A2E19',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#7A2E19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F7D3C6',
    letterSpacing: 0.8,
  },
  kpiMainValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  reportsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  reportsPillText: {
    color: '#F7D3C6',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  kpiDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    marginVertical: 14,
  },
  kpiBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiSubCol: {
    flex: 1,
  },
  dotLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  kpiSubLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F7D3C6',
    letterSpacing: 0.6,
  },
  kpiSubValueGreen: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D1FAE5',
  },
  kpiSubValueRed: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FECACA',
  },
  verticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    marginHorizontal: 16,
  },

  /* 2. Primary Action: New Counter Bill */
  primaryActionCard: {
    backgroundColor: '#8C331A',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
  primaryActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  primaryActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  primaryActionTextCol: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryActionSubtitle: {
    fontSize: 11,
    color: '#F7D3C6',
    marginTop: 2,
  },
  primaryActionBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },

  /* 3. Shortcuts 4-Grid */
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7E75',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  gridIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F1511',
  },
  gridSubtitle: {
    fontSize: 11,
    color: '#8A7E75',
    marginTop: 1,
  },

  /* 4. Recent Invoices */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  emptyText: {
    fontSize: 13,
    color: '#8A7E75',
    marginTop: 8,
    fontWeight: '600',
  },
});
