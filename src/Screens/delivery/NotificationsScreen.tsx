import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import { useApp, NotificationItem } from '../../context/AppContext';

interface SwipeableDeliveryNotificationProps {
  item: NotificationItem;
  onDelete: (id: string) => void;
}

function SwipeableDeliveryNotification({
  item,
  onDelete,
}: SwipeableDeliveryNotificationProps) {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 15;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          pan.x.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          Animated.timing(pan.x, {
            toValue: -500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDelete(item.id));
        } else {
          Animated.spring(pan.x, {
            toValue: 0,
            friction: 6,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={styles.cardWrapper}>
      {/* Swipe delete background */}
      <View style={styles.swipeDeleteBack}>
        <View style={styles.swipeDeleteContent}>
          <Ionicons name="trash" size={20} color="#FFFFFF" />
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </View>
      </View>

      {/* Foreground card */}
      <Animated.View
        style={[
          styles.card,
          !item.isRead && styles.unreadCard,
          { transform: [{ translateX: pan.x }] },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="notifications" size={20} color="#059669" />
        </View>

        <View style={styles.contentWrapper}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
          <Text style={styles.cardMessage}>{item.message}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onDelete(item.id)}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function NotificationsScreen() {
  const {
    notifications,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useApp();

  const [toastMessage, setToastMessage] = useState('');

  const handleDeleteOne = (id: string) => {
    deleteNotification(id);
    setToastMessage('Notification deleted');
    setTimeout(() => setToastMessage(''), 2000);
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setToastMessage('All notifications cleared');
    setTimeout(() => setToastMessage(''), 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <DeliveryHeader title="Partner Notifications" showBack={true} />

      {/* Toast Alert */}
      {toastMessage !== '' && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Action Bar */}
      <View style={styles.topRow}>
        <Text style={styles.countText}>{notifications.length} Notifications</Text>

        <View style={styles.actionBtnsGroup}>
          {notifications.length > 0 && (
            <>
              <TouchableOpacity
                onPress={markAllNotificationsAsRead}
                style={styles.markReadBtn}
              >
                <Text style={styles.markReadText}>Mark read</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClearAll}
                style={styles.clearAllBtn}
              >
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Ionicons
                name="notifications-off-outline"
                size={40}
                color="#059669"
              />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>
              You have no active notifications. Delivery assignments and updates
              will appear here.
            </Text>
          </View>
        ) : (
          notifications.map(item => (
            <SwipeableDeliveryNotification
              key={item.id}
              item={item}
              onDelete={handleDeleteOne}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#059669',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE8',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  actionBtnsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markReadBtn: {
    marginRight: 10,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },
  cardWrapper: {
    position: 'relative',
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  swipeDeleteBack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 16,
  },
  swipeDeleteContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  unreadCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentWrapper: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
  },
  cardMessage: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
    lineHeight: 18,
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
