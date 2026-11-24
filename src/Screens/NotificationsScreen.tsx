import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../components/common/Header';
import { useApp, NotificationItem } from '../context/AppContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AppToast } from '../utils/toast';
import { colors, typography, spacing, radius, shadows } from '../theme';

interface SwipeableNotificationCardProps {
  item: NotificationItem;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRequestDelete: (id: string) => void;
  isSwipeOpen: boolean;
  onSwipeOpen: (id: string) => void;
  onSwipeClose: () => void;
}

function SwipeableNotificationCard({
  item,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onRequestDelete,
  isSwipeOpen,
  onSwipeOpen,
  onSwipeClose,
}: SwipeableNotificationCardProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const DELETE_WIDTH = -90;

  // React to external close (e.g. user swiped another card or cancelled)
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
        if (isSelectionMode) return;
        const currentBase = isSwipeOpen ? DELETE_WIDTH : 0;
        const targetX = currentBase + gestureState.dx;
        // Don't swipe right past 0 or left beyond -140
        if (targetX <= 0 && targetX >= -140) {
          pan.x.setValue(targetX);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isSelectionMode) return;
        if (gestureState.dx < -35 || (isSwipeOpen && gestureState.dx <= 0)) {
          // Open swipe delete action
          Animated.spring(pan.x, {
            toValue: DELETE_WIDTH,
            friction: 7,
            useNativeDriver: true,
          }).start();
          onSwipeOpen(item.id);
        } else {
          // Snap back to closed position
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

  let iconName = 'notifications';
  let iconBg = '#F3F4F6';
  let iconColor = '#4B5563';

  if (item.type === 'payment') {
    iconName = 'cash';
    iconBg = '#D1FAE5';
    iconColor = '#059669';
  } else if (item.type === 'overdue') {
    iconName = 'alert-circle';
    iconBg = '#FFE4E6';
    iconColor = '#E11D48';
  } else if (item.type === 'order') {
    iconName = 'bicycle';
    iconBg = '#DBEAFE';
    iconColor = '#2563EB';
  } else if (item.type === 'system') {
    iconName = 'cube';
    iconBg = '#FEF3C7';
    iconColor = '#D97706';
  }

  return (
    <View style={styles.cardWrapper}>
      {/* Revealed Swipe Action Button */}
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

      {/* Foreground Animated Card */}
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
          onPress={() => {
            if (isSwipeOpen) {
              onSwipeClose();
              return;
            }
            if (isSelectionMode) {
              onToggleSelect(item.id);
            }
          }}
          style={styles.cardInner}
        >
          {/* Checkbox for Selection Mode */}
          {isSelectionMode && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onToggleSelect(item.id)}
              style={styles.checkboxTouch}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isSelected ? '#8C331A' : '#A09489'}
              />
            </TouchableOpacity>
          )}

          {/* Type Icon */}
          <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={20} color={iconColor} />
          </View>

          {/* Details */}
          <View style={styles.cardContent}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
            <Text style={styles.cardMessage}>{item.message}</Text>
          </View>

          {/* 1-Tap Trash Button when not in selection mode */}
          {!isSelectionMode && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onRequestDelete(item.id)}
              style={styles.singleDeleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function NotificationsScreen() {
  const {
    notifications,
    unreadNotificationsCount,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteSelectedNotifications,
    clearAllNotifications,
  } = useApp();

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  // Confirmation Dialog State
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mark all as read when opening screen
  useEffect(() => {
    if (unreadNotificationsCount > 0) {
      markAllNotificationsAsRead();
    }
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
  };

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
      console.log('Error deleting notification:', err);
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

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    deleteSelectedNotifications(selectedIds);
    AppToast.success('Notifications Deleted', `Deleted ${selectedIds.length} notification(s).`);
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setSelectedIds([]);
    setIsSelectionMode(false);
    AppToast.info('Notifications Cleared', 'All notifications have been cleared.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <Header title="Notifications" showBack={true} />

      {/* Top Action Controls Bar */}
      <View style={styles.controlsBar}>
        <View style={styles.countBadgeRow}>
          <Ionicons name="notifications" size={16} color="#8C331A" />
          <Text style={styles.countTitle}>
            {notifications.length} Total Notifications
          </Text>
        </View>

        <View style={styles.topBtnsRow}>
          {notifications.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.controlBtn,
                isSelectionMode && styles.controlBtnActive,
              ]}
              onPress={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedIds([]);
                setOpenCardId(null);
              }}
            >
              <Ionicons
                name={
                  isSelectionMode ? 'close' : 'checkmark-done-circle-outline'
                }
                size={15}
                color={isSelectionMode ? '#FFFFFF' : '#8C331A'}
              />
              <Text
                style={[
                  styles.controlBtnText,
                  isSelectionMode && styles.controlBtnTextActive,
                ]}
              >
                {isSelectionMode ? 'Cancel' : 'Select'}
              </Text>
            </TouchableOpacity>
          )}

          {notifications.length > 0 && !isSelectionMode && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.clearBtn}
              onPress={handleClearAll}
            >
              <Ionicons name="trash-outline" size={15} color="#E11D48" />
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Multi-Select Action Bar */}
      {isSelectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.selectAllBtn}
            onPress={handleSelectAll}
          >
            <Ionicons
              name={
                selectedIds.length === notifications.length &&
                notifications.length > 0
                  ? 'checkbox'
                  : 'square-outline'
              }
              size={20}
              color="#8C331A"
            />
            <Text style={styles.selectAllText}>
              {selectedIds.length === notifications.length
                ? 'Deselect All'
                : 'Select All'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.deleteSelectedBtn,
              selectedIds.length === 0 && styles.deleteSelectedDisabled,
            ]}
            onPress={handleDeleteSelected}
            disabled={selectedIds.length === 0}
          >
            <Ionicons name="trash" size={16} color="#FFFFFF" />
            <Text style={styles.deleteSelectedText}>
              Delete ({selectedIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Swipe Hint Banner */}
      {notifications.length > 0 && !isSelectionMode && (
        <View style={styles.swipeHintBar}>
          <Ionicons name="swap-horizontal" size={14} color="#8A7E75" />
          <Text style={styles.swipeHintText}>
            Swipe left on any notification to reveal Delete
          </Text>
        </View>
      )}

      {/* Notifications List */}
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
                color="#8C331A"
              />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>
              You are all caught up! Updates regarding payments, invoices, and
              deliveries will appear here.
            </Text>
          </View>
        ) : (
          notifications.map(item => (
            <SwipeableNotificationCard
              key={item.id}
              item={item}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.includes(item.id)}
              onToggleSelect={handleToggleSelect}
              onRequestDelete={onRequestDelete}
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
    backgroundColor: colors.background,
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  countBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countTitle: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  topBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EAE4',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    marginRight: 6,
  },
  controlBtnActive: {
    backgroundColor: colors.primary,
  },
  controlBtnText: {
    ...typography.caption,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
  controlBtnTextActive: {
    color: colors.white,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  clearBtnText: {
    ...typography.caption,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#E11D48',
    marginLeft: 4,
  },

  /* Selection bar */
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FDEBE4',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F5DCD3',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  deleteSelectedBtn: {
    backgroundColor: '#E11D48',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteSelectedDisabled: {
    backgroundColor: '#FDA4AF',
  },
  deleteSelectedText: {
    color: colors.white,
    ...typography.caption,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    marginLeft: 4,
  },

  /* Swipe Hint */
  swipeHintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: '#F5EFEA',
  },
  swipeHintText: {
    ...typography.caption,
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 4,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },

  /* Empty state */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDEBE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.heading1,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Card */
  cardWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  swipeDeleteBack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E11D48',
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderRadius: radius.lg,
  },
  swipeDeleteContent: {
    width: 90,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  swipeDeleteText: {
    color: colors.white,
    ...typography.caption,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    marginTop: 3,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  checkboxTouch: {
    paddingRight: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    ...typography.heading2,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeText: {
    ...typography.caption,
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  cardMessage: {
    ...typography.body,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  singleDeleteBtn: {
    padding: 6,
    marginLeft: 6,
  },
});
