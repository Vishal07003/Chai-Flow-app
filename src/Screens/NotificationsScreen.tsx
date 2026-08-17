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

interface SwipeableNotificationCardProps {
  item: NotificationItem;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function SwipeableNotificationCard({
  item,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onDelete,
}: SwipeableNotificationCardProps) {
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
      {/* Background Action for Swipe */}
      <View style={styles.swipeDeleteBack}>
        <View style={styles.swipeDeleteContent}>
          <Ionicons name="trash" size={22} color="#FFFFFF" />
          <Text style={styles.swipeDeleteText}>Swipe to Delete</Text>
        </View>
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
              onPress={() => onDelete(item.id)}
              style={styles.singleDeleteBtn}
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
  const [toastMessage, setToastMessage] = useState('');

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

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    deleteSelectedNotifications(selectedIds);
    setToastMessage(`Deleted ${selectedIds.length} notification(s)`);
    setSelectedIds([]);
    setIsSelectionMode(false);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setSelectedIds([]);
    setIsSelectionMode(false);
    setToastMessage('All notifications cleared');
    setTimeout(() => setToastMessage(''), 2500);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <Header title="Notifications" showBack={true} />

      {/* Toast Alert */}
      {toastMessage !== '' && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

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

      {/* Selection Action Header Bar */}
      {isSelectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSelectAll}
            style={styles.selectAllBtn}
          >
            <Ionicons
              name={
                selectedIds.length === notifications.length
                  ? 'checkbox'
                  : 'square-outline'
              }
              size={18}
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
            onPress={handleDeleteSelected}
            style={[
              styles.deleteSelectedBtn,
              selectedIds.length === 0 && styles.deleteSelectedDisabled,
            ]}
            disabled={selectedIds.length === 0}
          >
            <Ionicons name="trash" size={15} color="#FFFFFF" />
            <Text style={styles.deleteSelectedText}>
              Delete Selected ({selectedIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Swipe Hint */}
      {notifications.length > 0 && !isSelectionMode && (
        <View style={styles.swipeHintBar}>
          <Ionicons name="swap-horizontal" size={14} color="#8A7E75" />
          <Text style={styles.swipeHintText}>
            Tip: Swipe left on any card to quickly delete it
          </Text>
        </View>
      )}

      {/* Main Notifications List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Ionicons
                name="notifications-off-outline"
                size={42}
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
              onDelete={id => {
                deleteNotification(id);
                setToastMessage('Notification removed');
                setTimeout(() => setToastMessage(''), 2000);
              }}
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
    backgroundColor: '#2C201A',
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
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE9',
  },
  countBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C201A',
    marginLeft: 6,
  },
  topBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EAE4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
  },
  controlBtnActive: {
    backgroundColor: '#8C331A',
  },
  controlBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 4,
  },
  controlBtnTextActive: {
    color: '#FFFFFF',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  clearBtnText: {
    fontSize: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5DCD3',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 6,
  },
  deleteSelectedBtn: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteSelectedDisabled: {
    backgroundColor: '#FDA4AF',
  },
  deleteSelectedText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    fontSize: 11,
    color: '#8A7E75',
    fontWeight: '600',
    marginLeft: 4,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  /* Empty state */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDEBE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8A7E75',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Card */
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
    backgroundColor: '#E11D48',
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8C331A',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
    marginRight: 12,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  cardMessage: {
    fontSize: 12,
    color: '#6E6259',
    marginTop: 2,
    lineHeight: 16,
  },
  singleDeleteBtn: {
    padding: 6,
    marginLeft: 6,
  },
});
