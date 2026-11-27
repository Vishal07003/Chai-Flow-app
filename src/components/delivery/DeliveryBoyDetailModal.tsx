import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Linking,
  Keyboard,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DeliveryBoyItem, useApp } from '../../context/AppContext';
import ConfirmDialog from '../ConfirmDialog';
import PaginationControl from '../common/PaginationControl';
import SearchBar from '../common/SearchBar';
import deliveryService, { BackendDelivery, PaginatedResponse } from '../../services/delivery.service';
import { colors, typography, radius, spacing, shadows } from '../../theme';

interface DeliveryBoyDetailModalProps {
  visible: boolean;
  boy: DeliveryBoyItem | null;
  onClose: () => void;
}

type TabType = 'PROFILE' | 'ASSIGNED' | 'HISTORY';
type StatusFilter = 'ALL' | 'PENDING' | 'PICKED_UP' | 'DELIVERED';

export default function DeliveryBoyDetailModal({
  visible,
  boy,
  onClose,
}: DeliveryBoyDetailModalProps) {
  const { updateDeliveryBoy, deleteDeliveryBoy } = useApp();
  const { height: windowHeight } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<TabType>('PROFILE');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /* Form state for editing */
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [status, setStatus] = useState<'READY' | 'BUSY' | 'OFFLINE'>('READY');

  /* Orders state */
  const [orders, setOrders] = useState<BackendDelivery[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  /* Pagination states */
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);

  /* Order status counts for this partner */
  const [counts, setCounts] = useState({
    pending: 0,
    pickedUp: 0,
    delivered: 0,
  });

  const boyNumericId = useMemo(() => {
    if (!boy?.id) return undefined;
    const num = Number(boy.id);
    return isNaN(num) ? undefined : num;
  }, [boy?.id]);

  useEffect(() => {
    if (boy) {
      setName(boy.name || '');
      setPhone(boy.phone || '');
      setEmergencyPhone(boy.emergencyContact || '');
      setStatus(boy.status || 'READY');
      setIsEditing(false);
      setActiveTab('PROFILE');
      setStatusFilter('ALL');
      setSearchQuery('');
      setCurrentPage(1);
    }
  }, [boy, visible]);

  // Load orders for this delivery partner
  const fetchPartnerOrders = useCallback(async () => {
    if (!boyNumericId) return;

    try {
      setLoadingOrders(true);
      // Fetch paginated deliveries for this driver
      const res = await deliveryService.getDeliveries({
        driver: boyNumericId,
        page: currentPage,
        page_size: pageSize,
      });

      let list: BackendDelivery[] = [];
      if (res && 'results' in res) {
        const paginated = res as PaginatedResponse<BackendDelivery>;
        list = paginated.results || [];
        setTotalRecords(paginated.count || 0);
      } else if (Array.isArray(res)) {
        list = res;
        setTotalRecords(res.length);
      }
      setOrders(list);

      // Compute counts from all fetched records
      let pCount = 0;
      let puCount = 0;
      let dCount = 0;
      list.forEach(item => {
        const s = item.status.toLowerCase();
        if (s === 'assigned' || s === 'pending' || s === 'accepted') pCount++;
        else if (s === 'picked_up' || s === 'on_the_way') puCount++;
        else if (s === 'delivered') dCount++;
      });
      setCounts({ pending: pCount, pickedUp: puCount, delivered: dCount });
    } catch (err) {
      console.log('Error fetching partner orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [boyNumericId, currentPage, pageSize]);

  useEffect(() => {
    if (visible && boyNumericId) {
      fetchPartnerOrders();
    }
  }, [visible, boyNumericId, fetchPartnerOrders]);

  if (!boy) return null;

  const handleSave = async () => {
    Keyboard.dismiss();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      await updateDeliveryBoy(boy.id, {
        name: trimmedName,
        phone: phone.trim(),
        emergencyContact: emergencyPhone.trim(),
        status,
      });
      setIsEditing(false);
    } catch (err: any) {
      console.log('Failed to update partner profile:', err);
    }
  };

  const handleDelete = () => {
    deleteDeliveryBoy(boy.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleDial = (tel?: string) => {
    if (!tel) return;
    Linking.openURL(`tel:${tel}`).catch(() => {});
  };

  // Filter orders according to tab (ASSIGNED vs HISTORY), status filter, and search
  const displayedOrders = useMemo(() => {
    return orders.filter(item => {
      const s = item.status.toLowerCase();
      const isComplete = s === 'delivered' || s === 'failed';

      // 1. Tab filter
      if (activeTab === 'ASSIGNED' && isComplete) return false;
      if (activeTab === 'HISTORY' && !isComplete) return false;

      // 2. Status filter
      if (statusFilter === 'PENDING' && !(s === 'assigned' || s === 'pending' || s === 'accepted')) return false;
      if (statusFilter === 'PICKED_UP' && !(s === 'picked_up' || s === 'on_the_way')) return false;
      if (statusFilter === 'DELIVERED' && s !== 'delivered') return false;

      // 3. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const oNum = String(item.order_details?.order_number || item.order).toLowerCase();
        const cName = (item.order_details?.customer_name || item.order_details?.company_name || '').toLowerCase();
        return oNum.includes(q) || cName.includes(q);
      }

      return true;
    });
  }, [orders, activeTab, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalCard, { maxHeight: windowHeight * 0.9 }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.headerInfo}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {boy.name}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {boy.vehicleType || 'Delivery Partner'} • {boy.phone || 'No phone'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Counts Bar: Pending, Picked Up, Delivered */}
              <View style={styles.countsBar}>
                <View style={[styles.countCard, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.countVal, { color: '#B45309' }]}>{counts.pending}</Text>
                  <Text style={[styles.countLbl, { color: '#92400E' }]}>Pending</Text>
                </View>

                <View style={[styles.countCard, { backgroundColor: '#FDEBE4' }]}>
                  <Text style={[styles.countVal, { color: '#8C331A' }]}>{counts.pickedUp}</Text>
                  <Text style={[styles.countLbl, { color: '#8C331A' }]}>Picked Up</Text>
                </View>

                <View style={[styles.countCard, { backgroundColor: '#FAF8F5', borderWidth: 1, borderColor: '#EFEAE4' }]}>
                  <Text style={[styles.countVal, { color: '#6B5E55' }]}>{counts.delivered}</Text>
                  <Text style={[styles.countLbl, { color: '#6B5E55' }]}>Delivered</Text>
                </View>
              </View>

              {/* Tabs: Profile / Assigned Orders / Order History */}
              <View style={styles.tabsRow}>
                {(
                  [
                    { key: 'PROFILE', label: 'Profile' },
                    { key: 'ASSIGNED', label: 'Assigned Orders' },
                    { key: 'HISTORY', label: 'Order History' },
                  ] as const
                ).map(t => {
                  const isActive = activeTab === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => {
                        setActiveTab(t.key);
                        setStatusFilter('ALL');
                        setCurrentPage(1);
                      }}
                      style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Tab 1: Profile Information */}
              {activeTab === 'PROFILE' && (
                <View style={styles.tabContent}>
                  {!isEditing ? (
                    <View>
                      <View style={styles.profileSection}>
                        <Text style={styles.sectionHeading}>Contact & Status</Text>

                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Duty Status:</Text>
                          <View
                            style={[
                              styles.dutyBadge,
                              boy.status === 'READY' && styles.dutyReady,
                              boy.status === 'BUSY' && styles.dutyBusy,
                              boy.status === 'OFFLINE' && styles.dutyOffline,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dutyBadgeText,
                                boy.status === 'READY' && styles.dutyTextReady,
                                boy.status === 'BUSY' && styles.dutyTextBusy,
                                boy.status === 'OFFLINE' && styles.dutyTextOffline,
                              ]}
                            >
                              {boy.status === 'READY' ? 'Available' : boy.status === 'BUSY' ? 'Busy' : 'Offline'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Phone:</Text>
                          <Text style={styles.infoValue}>{boy.phone || 'N/A'}</Text>
                        </View>

                        {boy.emergencyContact ? (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Emergency Contact:</Text>
                            <Text style={styles.infoValue}>{boy.emergencyContact}</Text>
                          </View>
                        ) : null}

                        {boy.vehicleType ? (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Vehicle:</Text>
                            <Text style={styles.infoValue}>
                              {boy.vehicleType} {boy.numberPlate ? `(${boy.numberPlate})` : ''}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Action buttons */}
                      <View style={styles.profileActionsRow}>
                        {boy.phone ? (
                          <TouchableOpacity
                            style={[styles.btnAction, { backgroundColor: '#059669' }]}
                            onPress={() => handleDial(boy.phone)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="call" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.btnActionText}>Call Partner</Text>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={[styles.btnAction, { backgroundColor: colors.primary }]}
                          onPress={() => setIsEditing(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="pencil" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.btnActionText}>Edit Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.btnAction, { backgroundColor: '#DC2626' }]}
                          onPress={() => setShowDeleteConfirm(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="trash-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.btnActionText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    /* Edit Form */
                    <View style={styles.editForm}>
                      <Text style={styles.fieldLabel}>FULL NAME</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={name}
                        onChangeText={setName}
                        placeholder="Partner full name"
                      />

                      <Text style={styles.fieldLabel}>MOBILE PHONE</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="10-digit number"
                        keyboardType="phone-pad"
                      />

                      <Text style={styles.fieldLabel}>EMERGENCY CONTACT</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={emergencyPhone}
                        onChangeText={setEmergencyPhone}
                        placeholder="Optional contact"
                        keyboardType="phone-pad"
                      />

                      <Text style={styles.fieldLabel}>DUTY STATUS</Text>
                      <View style={styles.dutyOptionRow}>
                        {(['READY', 'BUSY', 'OFFLINE'] as const).map(opt => {
                          const isSel = status === opt;
                          return (
                            <TouchableOpacity
                              key={opt}
                              style={[styles.dutyOption, isSel && styles.dutyOptionActive]}
                              onPress={() => setStatus(opt)}
                            >
                              <Text style={[styles.dutyOptionText, isSel && styles.dutyOptionTextActive]}>
                                {opt === 'READY' ? 'Available' : opt === 'BUSY' ? 'Busy' : 'Offline'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.formButtonRow}>
                        <TouchableOpacity
                          style={[styles.btnAction, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                          onPress={() => setIsEditing(false)}
                        >
                          <Text style={[styles.btnActionText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.btnAction, { backgroundColor: colors.primary }]}
                          onPress={handleSave}
                        >
                          <Text style={styles.btnActionText}>Save Changes</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Tab 2 & 3: Assigned Orders & Order History */}
              {(activeTab === 'ASSIGNED' || activeTab === 'HISTORY') && (
                <View style={styles.tabContentList}>
                  {/* Search and Filters */}
                  <View style={styles.listFilterBar}>
                    <SearchBar
                      value={searchQuery}
                      onChangeText={text => {
                        setSearchQuery(text);
                        setCurrentPage(1);
                      }}
                      placeholder="Search order #, customer..."
                      containerStyle={{ marginVertical: 0, marginBottom: 8 }}
                    />

                    <View style={styles.filterChipRow}>
                      {(['ALL', 'PENDING', 'PICKED_UP', 'DELIVERED'] as StatusFilter[]).map(st => {
                        const isSel = statusFilter === st;
                        return (
                          <TouchableOpacity
                            key={st}
                            onPress={() => {
                              setStatusFilter(st);
                              setCurrentPage(1);
                            }}
                            style={[styles.filterChip, isSel && styles.filterChipActive]}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                              {st === 'ALL' ? 'All' : st === 'PENDING' ? 'Pending' : st === 'PICKED_UP' ? 'Picked Up' : 'Delivered'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* List / Empty State */}
                  {loadingOrders ? (
                    <View style={styles.centerBox}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.centerText}>Loading orders...</Text>
                    </View>
                  ) : displayedOrders.length === 0 ? (
                    <View style={styles.centerBox}>
                      <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
                      <Text style={styles.emptyTitle}>
                        {activeTab === 'ASSIGNED' ? 'No Assigned Orders' : 'No Order History'}
                      </Text>
                      <Text style={styles.emptySubtitle}>
                        {searchQuery ? 'No orders matched your search.' : 'No orders found for this partner.'}
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={displayedOrders}
                      keyExtractor={item => String(item.id)}
                      renderItem={({ item }) => {
                        const oNum = item.order_details?.order_number || `ORD-${item.order}`;
                        const cName = item.order_details?.customer_name || item.order_details?.company_name || 'Customer';
                        const total = item.order_details?.total_amount ? `₹${item.order_details.total_amount}` : '';
                        const dateStr = item.order_details?.created_at
                          ? new Date(item.order_details.created_at).toLocaleDateString('en-IN')
                          : '';

                        const st = item.status.toLowerCase();
                        const isPending = st === 'assigned' || st === 'pending' || st === 'accepted';
                        const isPickedUp = st === 'picked_up' || st === 'on_the_way';
                        const isDelivered = st === 'delivered';

                        return (
                          <View style={styles.orderItemCard}>
                            <View style={styles.orderCardHeader}>
                              <Text style={styles.orderNumberText}>{oNum}</Text>
                              <View
                                style={[
                                  styles.orderStatusPill,
                                  isPending && styles.pillPending,
                                  isPickedUp && styles.pillPickedUp,
                                  isDelivered && styles.pillDelivered,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.orderStatusText,
                                    isPending && styles.pillTextPending,
                                    isPickedUp && styles.pillTextPickedUp,
                                    isDelivered && styles.pillTextDelivered,
                                  ]}
                                >
                                  {isPending ? 'Pending' : isPickedUp ? 'Picked Up' : 'Delivered'}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.customerText}>{cName}</Text>

                            <View style={styles.orderCardFooter}>
                              <Text style={styles.dateText}>{dateStr}</Text>
                              {total ? <Text style={styles.totalText}>{total}</Text> : null}
                            </View>
                          </View>
                        );
                      }}
                      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                      ListFooterComponent={
                        <PaginationControl
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalRecords={totalRecords}
                          pageSize={pageSize}
                          pageSizeOptions={[10, 20, 30]}
                          onPageChange={setCurrentPage}
                          onPageSizeChange={size => {
                            setPageSize(size);
                            setCurrentPage(1);
                          }}
                          isLoading={loadingOrders}
                        />
                      }
                    />
                  )}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Delete Confirmation */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Remove Delivery Partner"
        description={`Are you sure you want to remove ${boy.name} from the active delivery team?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  countsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface,
  },
  countCard: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  countLbl: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabContent: {
    padding: 16,
  },
  tabContentList: {
    flex: 1,
    minHeight: 280,
  },
  profileSection: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dutyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  dutyReady: { backgroundColor: '#D1FAE5' },
  dutyBusy: { backgroundColor: '#FEF3C7' },
  dutyOffline: { backgroundColor: '#F3F4F6' },
  dutyBadgeText: { fontSize: 11, fontWeight: '700' },
  dutyTextReady: { color: '#047857' },
  dutyTextBusy: { color: '#B45309' },
  dutyTextOffline: { color: '#4B5563' },
  profileActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  btnActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  editForm: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 6,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  dutyOptionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  dutyOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  dutyOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dutyOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dutyOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  listFilterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  orderItemCard: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  orderStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  pillPending: { backgroundColor: '#FEF3C7' },
  pillPickedUp: { backgroundColor: '#FDEBE4', borderColor: '#F5C6B8' },
  pillDelivered: { backgroundColor: '#FAF8F5', borderColor: '#EFEAE4' },
  orderStatusText: { fontSize: 10, fontWeight: '700' },
  pillTextPending: { color: '#B45309' },
  pillTextPickedUp: { color: '#8C331A' },
  pillTextDelivered: { color: '#6B5E55' },
  customerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  totalText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
