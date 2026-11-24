import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import deliveryService, { DeliveryPartnerProfile } from '../../services/delivery.service';
import { useApp } from '../../context/AppContext';
import { validation } from '../../utils/validation';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export interface DeliveryPartnerDropdownProps {
  selectedPartnerId: number | null;
  onSelectPartner: (partnerId: number | null, partner?: DeliveryPartnerProfile | null) => void;
  label?: string;
  placeholder?: string;
  optional?: boolean;
  containerStyle?: any;
}

export default function DeliveryPartnerDropdown({
  selectedPartnerId,
  onSelectPartner,
  label = 'ASSIGN DELIVERY PARTNER',
  placeholder = 'Select Delivery Partner (Optional)',
  optional = true,
  containerStyle,
}: DeliveryPartnerDropdownProps) {
  const { addDeliveryBoy } = useApp();

  const [partners, setPartners] = useState<DeliveryPartnerProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Partner sub-form modal inside dropdown
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [newPartnerName, setNewPartnerName] = useState<string>('');
  const [newPartnerPhone, setNewPartnerPhone] = useState<string>('');
  const [newPartnerVehicle, setNewPartnerVehicle] = useState<'Scooter' | 'E-Bike' | 'Auto Cargo' | 'Mini Van'>('Scooter');
  const [savingPartner, setSavingPartner] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await deliveryService.getDeliveryPartners();
      setPartners(res || []);
    } catch (err) {
      console.log('Error fetching delivery partners:', err);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  // Current selected partner object
  const selectedPartner = useMemo(() => {
    if (selectedPartnerId === null) return null;
    return partners.find(p => p.id === selectedPartnerId) || null;
  }, [partners, selectedPartnerId]);

  // Filtered partners by name or phone
  const filteredPartners = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return partners;
    return partners.filter(p => {
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchPhone = (p.phone || '').includes(q);
      return matchName || matchPhone;
    });
  }, [partners, searchQuery]);

  // Open Add Partner modal
  const handleOpenAddPartner = () => {
    setNewPartnerName('');
    setNewPartnerPhone('');
    setNewPartnerVehicle('Scooter');
    setFormError('');
    setAddModalVisible(true);
  };

  // Save new partner using existing AppContext / deliveryService backend pipeline
  const handleSaveNewPartner = async () => {
    Keyboard.dismiss();
    setFormError('');

    const trimmedName = newPartnerName.trim();
    if (!validation.isNotEmpty(trimmedName)) {
      setFormError('Please enter partner full name.');
      return;
    }

    const trimmedPhone = newPartnerPhone.trim();
    if (!validation.isValidPhone(trimmedPhone)) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const cleanMobile = trimmedPhone.replace(/\D/g, '').slice(-10);

    try {
      setSavingPartner(true);
      const created = await addDeliveryBoy({
        name: trimmedName,
        phone: cleanMobile,
        vehicleType: newPartnerVehicle,
        status: 'READY',
        location: 'Assigned to Fleet',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          trimmedName,
        )}&background=8C331A&color=FFF`,
      });

      // Refresh partner list
      const updatedList: DeliveryPartnerProfile[] = await deliveryService.getDeliveryPartners().catch(() => []);
      setPartners(updatedList || []);

      // Auto-select newly created partner
      const newlyCreatedId = (created as any)?.id ? Number((created as any).id) : null;
      if (newlyCreatedId) {
        const found = updatedList?.find((p: DeliveryPartnerProfile) => p.id === newlyCreatedId) || null;
        onSelectPartner(newlyCreatedId, found);
      }

      setAddModalVisible(false);
      setModalVisible(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.phone ||
        err?.response?.data?.name ||
        err?.message ||
        'Failed to register partner. Mobile number may already exist.';
      setFormError(Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setSavingPartner(false);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {optional && <Text style={styles.optionalBadge}>OPTIONAL</Text>}
        </View>
      ) : null}

      {/* Main Collapsed Dropdown Input */}
      <TouchableOpacity
        style={[
          styles.dropdownTrigger,
          selectedPartner && styles.dropdownTriggerActive,
        ]}
        onPress={() => {
          setSearchQuery('');
          setModalVisible(true);
          fetchPartners();
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Select Delivery Partner"
      >
        <View style={styles.triggerContent}>
          <Ionicons
            name={selectedPartner ? 'bicycle' : 'bicycle-outline'}
            size={18}
            color={selectedPartner ? '#8C331A' : '#8E8278'}
            style={{ marginRight: 8 }}
          />

          <View style={{ flex: 1 }}>
            {selectedPartner ? (
              <View>
                <Text style={styles.selectedNameText}>{selectedPartner.name}</Text>
                <Text style={styles.selectedPhoneText}>
                  {selectedPartner.phone ? `📱 ${selectedPartner.phone} • ` : ''}
                  <Text style={{ color: selectedPartner.status === 'READY' ? '#059669' : '#D97706' }}>
                    {selectedPartner.status || 'READY'}
                  </Text>
                </Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>
                {placeholder}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.triggerRight}>
          {selectedPartner && (
            <TouchableOpacity
              onPress={() => onSelectPartner(null, null)}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Clear selection"
            >
              <Ionicons name="close-circle" size={17} color="#A89F97" />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-down" size={18} color="#8E8278" />
        </View>
      </TouchableOpacity>

      {/* Searchable Modal Selection Sheet */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Select Delivery Partner</Text>
                <Text style={styles.modalSubTitle}>Assign driver to fulfill order</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color="#554A42" />
              </TouchableOpacity>
            </View>

            {/* Search Input by Name or Mobile Number */}
            <View style={styles.searchBarBox}>
              <Ionicons name="search-outline" size={17} color="#8E8278" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by partner name or mobile..."
                placeholderTextColor="#A0958D"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#8E8278" />
                </TouchableOpacity>
              )}
            </View>

            {/* + Add Delivery Partner Quick Option */}
            <TouchableOpacity
              style={styles.addPartnerBannerBtn}
              onPress={handleOpenAddPartner}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={16} color="#8C331A" style={{ marginRight: 8 }} />
              <Text style={styles.addPartnerBannerText}>+ Add Delivery Partner</Text>
            </TouchableOpacity>

            {/* Partner Options List */}
            <ScrollView
              style={styles.listContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator color="#8C331A" size="small" />
                  <Text style={styles.loadingText}>Loading fleet partners...</Text>
                </View>
              ) : (
                <>
                  {/* Explicit Unassigned Option */}
                  {optional && (
                    <TouchableOpacity
                      style={[
                        styles.partnerRowItem,
                        selectedPartnerId === null && styles.partnerRowItemSelected,
                      ]}
                      onPress={() => {
                        onSelectPartner(null, null);
                        setModalVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.partnerAvatarCircleUnassigned}>
                        <Ionicons name="person-outline" size={16} color="#6B5E55" />
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.partnerItemName}>Unassigned</Text>
                        <Text style={styles.partnerItemPhone}>Kitchen queue / Order self-pickup</Text>
                      </View>

                      {selectedPartnerId === null && (
                        <Ionicons name="checkmark-circle" size={20} color="#8C331A" />
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Filtered Partner Rows */}
                  {filteredPartners.length === 0 ? (
                    <View style={styles.emptyResultsBox}>
                      <Ionicons name="bicycle-outline" size={32} color="#D1C7BD" />
                      <Text style={styles.emptyResultsText}>No delivery partners found</Text>
                      <Text style={styles.emptyResultsSub}>Try a different name or mobile number</Text>
                    </View>
                  ) : (
                    filteredPartners.map(p => {
                      const isSelected = selectedPartnerId === p.id;
                      const isReady = p.status === 'READY';
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[
                            styles.partnerRowItem,
                            isSelected && styles.partnerRowItemSelected,
                          ]}
                          onPress={() => {
                            onSelectPartner(p.id, p);
                            setModalVisible(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.partnerAvatarCircle,
                              isSelected && styles.partnerAvatarCircleSelected,
                            ]}
                          >
                            <Ionicons
                              name="bicycle"
                              size={16}
                              color={isSelected ? '#8C331A' : '#554A42'}
                            />
                          </View>

                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.partnerItemName}>{p.name}</Text>
                            <Text style={styles.partnerItemPhone}>
                              {p.phone ? `📱 ${p.phone}  •  ` : ''}
                              <Text style={{ color: isReady ? '#059669' : '#D97706', fontWeight: '600' }}>
                                {p.status || 'READY'}
                              </Text>
                            </Text>
                          </View>

                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={20} color="#8C331A" />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Embedded Add Delivery Partner Form Modal */}
      <Modal
        visible={addModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.addPartnerCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Add Delivery Partner</Text>
                <Text style={styles.modalSubTitle}>Register new fleet member</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#554A42" />
              </TouchableOpacity>
            </View>

            {formError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            ) : null}

            <Text style={styles.subInputLabel}>FULL NAME *</Text>
            <TextInput
              style={styles.subInput}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#A0958D"
              value={newPartnerName}
              onChangeText={setNewPartnerName}
              autoCapitalize="words"
            />

            <Text style={styles.subInputLabel}>MOBILE NUMBER (10 DIGITS) *</Text>
            <TextInput
              style={styles.subInput}
              placeholder="e.g. 9876543210"
              placeholderTextColor="#A0958D"
              keyboardType="phone-pad"
              maxLength={10}
              value={newPartnerPhone}
              onChangeText={setNewPartnerPhone}
            />

            <Text style={styles.subInputLabel}>VEHICLE TYPE</Text>
            <View style={styles.vehicleRow}>
              {(['Scooter', 'E-Bike', 'Auto Cargo', 'Mini Van'] as const).map(v => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.vehiclePill,
                    newPartnerVehicle === v && styles.vehiclePillActive,
                  ]}
                  onPress={() => setNewPartnerVehicle(v)}
                >
                  <Text
                    style={[
                      styles.vehiclePillText,
                      newPartnerVehicle === v && styles.vehiclePillTextActive,
                    ]}
                  >
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.savePartnerBtn, savingPartner && styles.savePartnerBtnDisabled]}
              onPress={handleSaveNewPartner}
              disabled={savingPartner}
              activeOpacity={0.8}
            >
              {savingPartner ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.savePartnerBtnText}>Save & Assign Partner</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.5,
  },
  optionalBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A0958D',
    letterSpacing: 0.5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  dropdownTriggerActive: {
    borderColor: '#8C331A',
    backgroundColor: '#FEFDFC',
  },
  triggerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: '#8E8278',
  },
  selectedNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  selectedPhoneText: {
    fontSize: 11,
    color: '#6B5E55',
    marginTop: 1,
  },
  triggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
  },
  modalSubTitle: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#2A2421',
    paddingVertical: 0,
  },
  addPartnerBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF9F6',
    borderWidth: 1,
    borderColor: '#F3DDD2',
    borderRadius: 8,
    paddingVertical: 9,
    marginBottom: 10,
  },
  addPartnerBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  listContainer: {
    maxHeight: 280,
  },
  centerLoading: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#8E8278',
    marginTop: 6,
  },
  partnerRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFEA',
  },
  partnerRowItemSelected: {
    backgroundColor: '#FEF9F6',
  },
  partnerAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5EBE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerAvatarCircleSelected: {
    backgroundColor: '#F7DDD2',
  },
  partnerAvatarCircleUnassigned: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFECE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  partnerItemPhone: {
    fontSize: 11,
    color: '#6B5E55',
    marginTop: 1,
  },
  emptyResultsBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B5E55',
    marginTop: 6,
  },
  emptyResultsSub: {
    fontSize: 11,
    color: '#A0958D',
    marginTop: 2,
  },
  addPartnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  subInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  subInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#2A2421',
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
  },
  vehiclePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 8,
  },
  vehiclePillActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  vehiclePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5E55',
  },
  vehiclePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  savePartnerBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    borderRadius: 10,
    height: 46,
    marginTop: 4,
  },
  savePartnerBtnDisabled: {
    backgroundColor: '#B5AAA2',
  },
  savePartnerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
});
