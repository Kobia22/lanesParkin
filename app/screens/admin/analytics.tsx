// app/screens/admin/AnalyticsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { fetchAnalytics, fetchRecentBookings } from '../../../src/firebase/admin';
import { getAllParkingLots as fetchParkingLots } from '../../../src/api/parkingService';
import { colors, spacing, fontSizes } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Analytics, Booking, ParkingLot } from '../../../src/firebase/types';

// Mock chart component (in a real app, you would use a charting library)
const MockBarChart = ({ data, title }: { data: number[], title: string }) => (
  <View style={mockChartStyles.container}>
    <Text style={mockChartStyles.title}>{title}</Text>
    <View style={mockChartStyles.chartContainer}>
      {data.map((value, index) => (
        <View key={index} style={mockChartStyles.barContainer}>
          <View 
            style={[
              mockChartStyles.bar, 
              { height: Math.max(value, 5) }
            ]} 
          />
          <Text style={mockChartStyles.label}>
            {String.fromCharCode(65 + index)}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

const mockChartStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  chartContainer: {
    height: 200,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  barContainer: {
    alignItems: 'center',
  },
  bar: {
    width: 30,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
});

// Mock pie chart component
const MockPieChart = ({ data, title }: { data: { value: number, label: string, color: string }[], title: string }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const percentages = data.map(item => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0
  }));

  return (
    <View style={mockPieStyles.container}>
      <Text style={mockPieStyles.title}>{title}</Text>
      <View style={mockPieStyles.chartContainer}>
        <View style={mockPieStyles.chartPlaceholder}>
          <Ionicons name="pie-chart" size={80} color={colors.primary} />
        </View>
        <View style={mockPieStyles.legendContainer}>
          {percentages.map((item, index) => (
            <View key={index} style={mockPieStyles.legendItem}>
              <View style={[mockPieStyles.legendColor, { backgroundColor: item.color }]} />
              <Text style={mockPieStyles.legendLabel}>{item.label}</Text>
              <Text style={mockPieStyles.legendValue}>{item.percentage.toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const mockPieStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  chartContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.md,
  },
  chartPlaceholder: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.xs,
  },
  legendLabel: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  legendValue: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.text,
  },
});

export default function AnalyticsScreen() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch analytics data
      console.log('Fetching analytics data...');
      const analyticsData = await fetchAnalytics();
      console.log('Analytics data fetched:', analyticsData);
      setAnalytics(analyticsData);

      // Fetch recent bookings for charts
      console.log('Fetching recent bookings...');
      const bookings = await fetchRecentBookings(20);
      console.log(`Fetched ${bookings.length} recent bookings`);
      setRecentBookings(bookings);

      // Fetch all parking lots from API
      console.log('Fetching parking lots for analytics...');
      const parkingLots = await fetchParkingLots();
      console.log(`Fetched ${parkingLots.length} parking lots for analytics`);
      setLots(parkingLots);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Generate sample data for the charts based on the fetched data
  const generateBarChartData = () => {
    if (lots.length === 0) {
      return Array(5).fill(50); // Default mock data
    }

    // Get occupancy data from the top 5 lots
    return lots.slice(0, 5).map(lot => lot.occupiedSpaces);
  };

  const generatePieChartData = () => {
    if (!analytics) {
      return [
        { value: 70, label: 'Available', color: '#22c55e' },
        { value: 30, label: 'Occupied', color: '#06b6d4' },
      ];
    }

    return [
      { value: 100 - analytics.occupancyRate, label: 'Available', color: '#22c55e' },
      { value: analytics.occupancyRate, label: 'Occupied', color: '#06b6d4' },
    ];
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.timeframeSelector}>
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              timeframe === 'daily' && styles.selectedTimeframe,
            ]}
            onPress={() => setTimeframe('daily')}
          >
            <Text
              style={[
                styles.timeframeText,
                timeframe === 'daily' && styles.selectedTimeframeText,
              ]}
            >
              Daily
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              timeframe === 'weekly' && styles.selectedTimeframe,
            ]}
            onPress={() => setTimeframe('weekly')}
          >
            <Text
              style={[
                styles.timeframeText,
                timeframe === 'weekly' && styles.selectedTimeframeText,
              ]}
            >
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              timeframe === 'monthly' && styles.selectedTimeframe,
            ]}
            onPress={() => setTimeframe('monthly')}
          >
            <Text
              style={[
                styles.timeframeText,
                timeframe === 'monthly' && styles.selectedTimeframeText,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.revenueCard}>
          <Text style={styles.revenueTitle}>Revenue</Text>
          <Text style={styles.revenueAmount}>
            {formatCurrency(
              timeframe === 'daily'
                ? analytics?.dailyRevenue || 0
                : timeframe === 'weekly'
                ? analytics?.weeklyRevenue || 0
                : (analytics?.weeklyRevenue || 0) * 4
            )}
          </Text>
          <Text style={styles.revenuePeriod}>
            {timeframe === 'daily'
              ? 'Today'
              : timeframe === 'weekly'
              ? 'This Week'
              : 'This Month'}
          </Text>
        </View>

        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconContainer}>
              <Ionicons name="car" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.metricValue}>{analytics?.occupancyRate || 0}%</Text>
            <Text style={styles.metricLabel}>Occupancy Rate</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.metricValue}>{analytics?.abandonedCount || 0}</Text>
            <Text style={styles.metricLabel}>Abandoned</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#10B981' }]}>
              <Ionicons name="cash" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.metricValue}>
              {formatCurrency(
                timeframe === 'daily'
                  ? (analytics?.dailyRevenue || 0) / (recentBookings.length || 1)
                  : timeframe === 'weekly'
                  ? (analytics?.weeklyRevenue || 0) / (recentBookings.length || 1)
                  : ((analytics?.weeklyRevenue || 0) * 4) / (recentBookings.length || 1)
              )}
            </Text>
            <Text style={styles.metricLabel}>Avg. per Booking</Text>
          </View>
        </View>

        <View style={styles.chartSection}>
          <MockPieChart
            data={generatePieChartData()}
            title="Parking Space Utilization"
          />
          
          <MockBarChart
            data={generateBarChartData()}
            title="Occupancy by Parking Lot"
          />
        </View>

        <View style={styles.bookingsSection}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          
          {recentBookings.length > 0 ? (
            recentBookings.slice(0, 5).map((booking, index) => (
              <View key={index} style={styles.bookingItem}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingId}>ID: {booking.id.substring(0, 8)}...</Text>
                  <Text style={styles.bookingDetails}>
                    {new Date(booking.startTime).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.bookingStatus}>
                  <View style={[
                    styles.statusBadge,
                    booking.status === 'pending' && styles.pendingBadge,
                    booking.status === 'occupied' && styles.activeBadge,
                    booking.status === 'completed' && styles.completedBadge,
                    booking.status === 'cancelled' && styles.cancelledBadge,
                    booking.status === 'expired' && styles.abandonedBadge,
                  ]}>
                    <Text style={[
                      styles.statusText,
                      booking.status === 'pending' && styles.pendingText,
                      booking.status === 'occupied' && styles.activeText,
                      booking.status === 'completed' && styles.completedText,
                      booking.status === 'cancelled' && styles.cancelledText,
                      booking.status === 'expired' && styles.abandonedText,
                    ]}>
                      {booking.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.bookingAmount}>
                    {formatCurrency(booking.paymentAmount || 0)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No booking data available</Text>
          )}
          
          {recentBookings.length > 5 && (
            <TouchableOpacity style={styles.viewMoreButton}>
              <Text style={styles.viewMoreText}>
                View All {recentBookings.length} Bookings
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textLight,
  },
  errorContainer: {
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  selectedTimeframe: {
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  timeframeText: {
    color: colors.textLight,
    fontWeight: '500',
  },
  selectedTimeframeText: {
    color: '#FFFFFF',
  },
  revenueCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  revenueTitle: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  revenueAmount: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  revenuePeriod: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metricCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: spacing.md,
    flex: 1,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    textAlign: 'center',
  },
  chartSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  bookingsSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: spacing.md,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingId: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bookingDetails: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  bookingStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.xs,
  },
  pendingBadge: {
    backgroundColor: '#E0F2FE',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  completedBadge: {
    backgroundColor: '#E0F2FE',
  },
  cancelledBadge: {
    backgroundColor: '#FEE2E2',
  },
  abandonedBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  pendingText: {
    color: '#0284C7',
  },
  activeText: {
    color: '#16A34A',
  },
  completedText: {
    color: '#0284C7',
  },
  cancelledText: {
    color: '#DC2626',
  },
  abandonedText: {
    color: '#D97706',
  },
  bookingAmount: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.text,
  },
  viewMoreButton: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  viewMoreText: {
    color: colors.primary,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textLight,
    padding: spacing.md,
  },
});