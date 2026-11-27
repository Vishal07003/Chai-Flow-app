import React, { useState, useRef, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import { useApp, NotificationItem } from '../../context/AppContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AppToast } from '../../utils/toast';
import { colors, typography, radius, spacing, shadows } from '../../theme';

interface SwipeableDeliveryNotificationProps {
  item: NotificationItem;
  onRequestDelete: (id: string) => void;
  onPressItem: (item: NotificationItem) => void;
  isSwipeOpen: boolean;
  onSwipeOpen: (id: string) => void;
  onSwipeClose: () => void;
}

function SwipeableDeliveryNotification({
  item,
  onRequestDelete,
  onPressItem,
  isSwipeOpen,
  onSwipeOpen,
  onSwipeClose,
}: SwipeableDeliveryNotificationProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const DELETE_WIDTH = -90;

  // React to external close
  useEffect(() => {
    if (!isSwipeOpen) {
      Animated.spring(pan.x, {
        toValue: 0,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(pan.x, {
        toValue: DELETE_WIDTH,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [isSwipeOpen]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 15;
      },
      onPanResponderMove: (_, gestureState) => {
        const currentBase = isSwipeOpen ? DELETE_WIDTH : 0;
        const targetX = currentBase + gestureState.dx;
        if (targetX <= 0 && targetX >= -140) {
          pan.x.setValue(targetX);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -35 || (isSwipeOpen && gestureState.dx <= 0)) {
          Animated.spring(pan.x, {
            toValue: DELETE_WIDTH,
            friction: 7,
            useNativeDriver: true,
          }).start();
          onSwipeOpen(item.id);
        } else {
          Animated.spring(pan.x, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }).start();
          onSwipeClose();
        }
      },
    }),
  ).current;

  return (
    <View style={styles.cardWrapper}>
      {/* Swipe delete background */}
      <View style={styles.swipeDeleteBack}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.swipeDeleteContent}
          onPress={() => onRequestDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </TouchableOpacity>
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
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.cardInnerTouch}
          onPress={() => {
            if (isSwipeOpen) {
              onSwipeClose();
            } else {
              onPressItem(item);
            }
          }}
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
            onPress={() => onRequestDelete(item.id)}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const {
    notifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useApp();

  const handleNotificationPress = (item: NotificationItem) => {
    if (!item.isRead) {
      markNotificationAsRead(item.id);
    }
    const orderId = item.data?.order_id || (item.data?.type === 'delivery_assigned' ? item.data?.order_id : null);
    const deliveryId = item.data?.delivery_id;
    if (orderId || deliveryId) {
      navigation.navigate('OrderDetails', {
        deliveryId: deliveryId || orderId,
        orderId: orderId,
        order: { id: orderId, delivery_id: deliveryId },
      });
    }
  };

  const [openCardId, setOpenCardId] = useState<string | null>(null);

  // Confirmation Dialog State
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const onRequestDelete = (id: string) => {
    setTargetDeleteId(id);
    setConfirmDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetDeleteId) return;
    try {
      setIsDeleting(true);
      await deleteNotification(targetDeleteId);
      AppToast.success('Notification Deleted', 'The notification has been removed.');
      setConfirmDialogVisible(false);
      setTargetDeleteId(null);
      setOpenCardId(null);
    } catch (err: any) {
      console.log('Error deleting delivery notification:', err);
      AppToast.error('Delete Failed', 'Could not delete notification. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDialogVisible(false);
    setTargetDeleteId(null);
    setOpenCardId(null);
  };

  const handleClearAll = () => {
    clearAllNotifications();
    AppToast.info('Notifications Cleared', 'All notifications have been cleared.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <DeliveryHeader title="Partner Notifications" showBack={true} />

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
        keyboardShouldPersistTaps="handled"
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
              onRequestDelete={onRequestDelete}
              onPressItem={handleNotificationPress}
              isSwipeOpen={openCardId === item.id}
              onSwipeOpen={id => setOpenCardId(id)}
              onSwipeClose={() => setOpenCardId(null)}
            />
          ))
        )}
      </ScrollView>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        visible={confirmDialogVisible}
        title="Delete Notification?"
        description="Are you sure you want to delete this notification?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        type="danger"
        icon="trash-outline"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF2',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#253247',
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
    color: '#8C331A',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
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
    borderRadius: 14,
    overflow: 'hidden',
  },
  swipeDeleteBack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderRadius: 14,
  },
  swipeDeleteContent: {
    width: 90,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    ...shadows.sm,
  },
  cardInnerTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  unreadCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EDF2',
    borderLeftWidth: 4,
    borderLeftColor: '#8C331A',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E8EDF2',
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
    color: '#253247',
  },
  timeText: {
    fontSize: 11,
    color: '#718096',
  },
  cardMessage: {
    fontSize: 13,
    color: '#718096',
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
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E8EDF2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#253247',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 18,
  },
});
