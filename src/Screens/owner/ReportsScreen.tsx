import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Share,
  Linking,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/common/Header';
import { ReportsExportDialog } from '../../components/ReportsExportDialog';
import { ReportsPagination } from '../../components/ReportsPagination';
import {
  reportsService,
  ReportType,
  DateFilterType,
  DateFilterParams,
  OverviewReportData,
  SalesReportData,
  CollectionsReportData,
  OutstandingReportData,
  ProductsReportData,
  CustomersReportData,
  DeliveriesReportData,
  DiscountsReportData,
  ProfitLossReportData,
} from '../../services/reports.service';
import pdfService from '../../services/pdf.service';

const REPORT_TABS: Array<{ id: ReportType; label: string; icon: string }> = [
  { id: 'overview', label: 'Overview', icon: 'stats-chart-outline' },
  { id: 'sales', label: 'Sales', icon: 'cart-outline' },
  { id: 'collections', label: 'Collections', icon: 'cash-outline' },
  { id: 'outstanding', label: 'Outstanding', icon: 'time-outline' },
  { id: 'products', label: 'Products', icon: 'cube-outline' },
  { id: 'customers', label: 'Customers', icon: 'people-outline' },
  { id: 'deliveries', label: 'Deliveries', icon: 'bicycle-outline' },
  { id: 'discounts', label: 'Discounts', icon: 'pricetag-outline' },
  { id: 'profit-loss', label: 'Profit & Loss', icon: 'trending-up-outline' },
];

const FILTER_PILLS: Array<{ id: DateFilterType; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom Date Range' },
];

export default function ReportsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ReportType>('overview');
  const [filterType, setFilterType] = useState<DateFilterType>('this_month');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customModalVisible, setCustomModalVisible] = useState(false);

  // Data states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  // Export dialog states
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [exportStatus, setExportStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [exportTitle, setExportTitle] = useState<string | undefined>(undefined);
  const [exportSubtitle, setExportSubtitle] = useState<string | undefined>(undefined);
  const [exportFilename, setExportFilename] = useState('');
  const [exportFilePath, setExportFilePath] = useState('');
  const [exportFileSize, setExportFileSize] = useState<number | undefined>(undefined);
  const [exportErrorMsg, setExportErrorMsg] = useState('');
  const [downloadingToPublic, setDownloadingToPublic] = useState(false);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<any | null>(null);

  const [overviewData, setOverviewData] = useState<OverviewReportData | null>(null);
  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [collectionsData, setCollectionsData] = useState<CollectionsReportData | null>(null);
  const [outstandingData, setOutstandingData] = useState<OutstandingReportData | null>(null);
  const [productsData, setProductsData] = useState<ProductsReportData | null>(null);
  const [customersData, setCustomersData] = useState<CustomersReportData | null>(null);
  const [deliveriesData, setDeliveriesData] = useState<DeliveriesReportData | null>(null);
  const [discountsData, setDiscountsData] = useState<DiscountsReportData | null>(null);
  const [pnlData, setPnlData] = useState<ProfitLossReportData | null>(null);

  // Search query within active sub-list
  const [subSearchQuery, setSubSearchQuery] = useState('');

  // Pagination states (per report section, with selectable rows per page: 10, 15, 30, 50)
  const [pageSize, setPageSize] = useState<number>(10);
  const [salesPage, setSalesPage] = useState(1);
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [outstandingPage, setOutstandingPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [deliveriesPartnersPage, setDeliveriesPartnersPage] = useState(1);
  const [deliveriesDiscrepanciesPage, setDeliveriesDiscrepanciesPage] = useState(1);
  const [discountsPage, setDiscountsPage] = useState(1);
  const [pnlExpensesPage, setPnlExpensesPage] = useState(1);

  const resetAllPages = useCallback(() => {
    setSalesPage(1);
    setCollectionsPage(1);
    setOutstandingPage(1);
    setProductsPage(1);
    setCustomersPage(1);
    setDeliveriesPartnersPage(1);
    setDeliveriesDiscrepanciesPage(1);
    setDiscountsPage(1);
    setPnlExpensesPage(1);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    resetAllPages();
  }, [resetAllPages]);

  const currentParams: DateFilterParams = useMemo(() => {
    return {
      filter_type: filterType,
      from_date: filterType === 'custom' ? customFrom : undefined,
      to_date: filterType === 'custom' ? customTo : undefined,
    };
  }, [filterType, customFrom, customTo]);

  const loadActiveReport = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'overview') {
        const res = await reportsService.getOverview(currentParams);
        setOverviewData(res);
      } else if (activeTab === 'sales') {
        const res = await reportsService.getSales(currentParams);
        setSalesData(res);
      } else if (activeTab === 'collections') {
        const res = await reportsService.getCollections(currentParams);
        setCollectionsData(res);
      } else if (activeTab === 'outstanding') {
        const res = await reportsService.getOutstanding(currentParams);
        setOutstandingData(res);
      } else if (activeTab === 'products') {
        const res = await reportsService.getProducts(currentParams);
        setProductsData(res);
      } else if (activeTab === 'customers') {
        const res = await reportsService.getCustomers(currentParams);
        setCustomersData(res);
      } else if (activeTab === 'deliveries') {
        const res = await reportsService.getDeliveries(currentParams);
        setDeliveriesData(res);
      } else if (activeTab === 'discounts') {
        const res = await reportsService.getDiscounts(currentParams);
        setDiscountsData(res);
      } else if (activeTab === 'profit-loss') {
        const res = await reportsService.getProfitLoss(currentParams);
        setPnlData(res);
      }
    } catch (err: any) {
      console.warn('[ReportsScreen] Fetch error:', err);
      setErrorMsg(err?.message || 'Failed to fetch report data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentParams]);

  useEffect(() => {
    resetAllPages();
    loadActiveReport();
  }, [loadActiveReport, resetAllPages]);

  // Reset pagination on search query change
  useEffect(() => {
    resetAllPages();
  }, [subSearchQuery, resetAllPages]);

  // Refocus trigger
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadActiveReport();
    });
    return unsubscribe;
  }, [navigation, loadActiveReport]);

  // Handle Export with custom reports dialog
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (exporting) return;
    setExporting(format);
    setExportFormat(format);
    setExportTitle(undefined);
    setExportSubtitle(undefined);
    setActiveReceiptPayment(null);
    setExportStatus('loading');
    setExportErrorMsg('');
    setExportFilename('');
    setExportFilePath('');
    setExportFileSize(undefined);
    setExportDialogVisible(true);

    try {
      const res = await reportsService.exportReport(format, activeTab, currentParams);
      setExportFilename(res.filename);
      setExportFilePath(res.filePath);
      setExportFileSize(res.size);
      setExportStatus('success');
    } catch (err: any) {
      console.warn('[ReportsScreen] Export error:', err);
      setExportStatus('error');
      setExportErrorMsg(err?.message || `Failed to download ${format.toUpperCase()} report.`);
    } finally {
      setExporting(null);
    }
  };

  // Action: Save to Public Downloads folder (Android MediaStore)
  const handleSaveToPublicDownloads = async () => {
    if (!exportFilePath || !exportFilename || downloadingToPublic) return;
    setDownloadingToPublic(true);
    try {
      const publicPath = await reportsService.saveToPublicDownloads(exportFilePath, exportFilename);
      Alert.alert(
        'Downloaded Successfully',
        `File saved to public Downloads:\n${exportFilename}\n\nYou can access it anytime from your device File Manager.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      console.warn('[ReportsScreen] Save to public downloads error:', err);
      Alert.alert(
        'Download Failed',
        err?.message || 'Could not save file to public Downloads.'
      );
    } finally {
      setDownloadingToPublic(false);
    }
  };

  // Action: Open / Preview PDF directly
  const handleOpenReceiptPdf = async () => {
    if (!exportFilePath) return;
    try {
      await pdfService.openPdfFile(exportFilePath, exportTitle || 'Payment Receipt');
    } catch (err: any) {
      console.warn('[ReportsScreen] Open PDF error:', err);
      Alert.alert('Preview Failed', err?.message || 'Could not open PDF viewer.');
    }
  };

  // Professional branded Payment Receipt PDF generator & sharing
  const handleGenerateReceiptPdf = async (p: any) => {
    if (exporting) return;
    setExporting('pdf');
    setExportFormat('pdf');
    setActiveReceiptPayment(p);
    setExportTitle('Payment Receipt');
    setExportSubtitle(`Generating official receipt for ${p.customer_name} (₹${p.amount})...`);
    setExportStatus('loading');
    setExportErrorMsg('');
    setExportFilename('');
    setExportFilePath('');
    setExportFileSize(undefined);
    setExportDialogVisible(true);

    try {
      const res = await pdfService.downloadPaymentReceiptPdf(p.id, p.received_at);
      setExportFilename(res.filename);
      setExportFilePath(res.filePath);
      setExportFileSize(res.size);
      setExportStatus('success');
    } catch (err: any) {
      console.warn('[ReportsScreen] Receipt PDF error:', err);
      setExportStatus('error');
      setExportErrorMsg(err?.message || 'Failed to generate payment receipt PDF.');
    } finally {
      setExporting(null);
    }
  };

  // Action: Native File Sharing (Android Share Sheet with real attachment)
  const handleShareFile = async () => {
    if (!exportFilePath || !exportFilename) return;
    try {
      if (exportFormat === 'pdf') {
        await pdfService.sharePdfFile(exportFilePath, exportTitle || `Report: ${exportFilename}`);
      } else {
        await reportsService.shareExcelFile(exportFilePath, exportFilename);
      }
    } catch (err: any) {
      console.warn('[ReportsScreen] Share error:', err);
      Alert.alert(
        'Share Failed',
        err?.message || `Could not share ${exportFormat.toUpperCase()} file.`
      );
    }
  };

  // Preserved payment receipt sharing fallback
  const handleSharePayment = (p: any) => {
    handleGenerateReceiptPdf(p);
  };

  // Preserved reminder sending for overdue
  const handleSendReminder = (item: any) => {
    const msg = `Hello ${item.customer_name}, your ChaiFlow balance of ₹${item.pending_amount || item.total_pending} is overdue. Please clear this at your earliest convenience. Thank you!`;
    const encoded = encodeURIComponent(msg);
    Linking.openURL(`whatsapp://send?text=${encoded}`).catch(() => {
      Linking.openURL(`sms:?body=${encoded}`);
    });
  };

  // ---------------- Render Sub-Sections ---------------- //

  const renderOverview = () => {
    if (!overviewData) return null;
    const isCostPartial = overviewData.cost_coverage_status !== 'complete';

    return (
      <View style={styles.tabContent}>
        {/* Cost Coverage Notice */}
        {isCostPartial && (
          <View style={styles.coverageNotice}>
            <Ionicons name="information-circle-outline" size={18} color="#D97706" style={{ marginRight: 8 }} />
            <Text style={styles.coverageNoticeText}>
              Historical cost coverage is <Text style={{ fontWeight: '800' }}>{overviewData.cost_coverage_status.toUpperCase()}</Text>. Profit figures reflect captured snapshots only.
            </Text>
          </View>
        )}

        {/* Executive Overview Deck */}
        <View style={styles.deckGrid}>
          <View style={[styles.deckCard, styles.bgBrandLight]}>
            <Text style={styles.deckCardLabel}>NET SALES</Text>
            <Text style={styles.deckCardValue}>₹{Number(overviewData.net_sales).toLocaleString()}</Text>
            <Text style={styles.deckCardSub}>{overviewData.invoices_count} Finalized Invoices</Text>
          </View>

          <View style={[styles.deckCard, styles.bgGreenLight]}>
            <Text style={styles.deckCardLabel}>TOTAL COLLECTIONS</Text>
            <Text style={[styles.deckCardValue, { color: '#059669' }]}>
              ₹{Number(overviewData.total_collections).toLocaleString()}
            </Text>
            <Text style={styles.deckCardSub}>Actual funds received</Text>
          </View>

          <View style={[styles.deckCard, styles.bgOrangeLight]}>
            <Text style={styles.deckCardLabel}>PORTFOLIO OUTSTANDING</Text>
            <Text style={[styles.deckCardValue, { color: '#D97706' }]}>
              ₹{Number(overviewData.total_outstanding).toLocaleString()}
            </Text>
            <Text style={styles.deckCardSub}>
              Overdue: ₹{Number(overviewData.overdue_outstanding).toLocaleString()} ({overviewData.defaulters_count} bills)
            </Text>
          </View>

          <View style={[styles.deckCard, styles.bgBlueLight]}>
            <Text style={styles.deckCardLabel}>GROSS PROFIT</Text>
            <Text style={[styles.deckCardValue, { color: '#2563EB' }]}>
              ₹{Number(overviewData.gross_profit).toLocaleString()}
            </Text>
            <Text style={styles.deckCardSub}>COGS: ₹{Number(overviewData.gross_profit ? Number(overviewData.net_sales) - Number(overviewData.gross_profit) : 0).toLocaleString()}</Text>
          </View>

          <View style={[styles.deckCard, styles.bgGrayLight]}>
            <Text style={styles.deckCardLabel}>OPERATING EXPENSES</Text>
            <Text style={[styles.deckCardValue, { color: '#4B5563' }]}>
              ₹{Number(overviewData.operating_expenses).toLocaleString()}
            </Text>
            <Text style={styles.deckCardSub}>Excludes COGS</Text>
          </View>

          <View style={[styles.deckCard, styles.bgGreenLight]}>
            <Text style={styles.deckCardLabel}>NET PROFIT</Text>
            <Text style={[styles.deckCardValue, { color: '#059669' }]}>
              ₹{Number(overviewData.net_profit).toLocaleString()}
            </Text>
            <Text style={styles.deckCardSub}>Margin: {overviewData.profit_margin_pct}%</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSales = () => {
    if (!salesData) return null;
    const { summary, invoices } = salesData;
    const filtered = invoices.filter(
      i =>
        i.invoice_number.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
        i.customer_name.toLowerCase().includes(subSearchQuery.toLowerCase())
    );

    const paginatedInvoices = filtered.slice((salesPage - 1) * pageSize, salesPage * pageSize);

    return (
      <View style={styles.tabContent}>
        {/* Source Breakdown */}
        <View style={styles.metricsBox}>
          <Text style={styles.boxTitle}>SALES BY BILLING SOURCE</Text>
          <View style={styles.sourceRow}>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceVal}>₹{Number(summary.quick_billing.sales).toLocaleString()}</Text>
              <Text style={styles.sourceLbl}>Quick Billing ({summary.quick_billing.count})</Text>
            </View>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceVal}>₹{Number(summary.single_order.sales).toLocaleString()}</Text>
              <Text style={styles.sourceLbl}>Single Order ({summary.single_order.count})</Text>
            </View>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceVal}>₹{Number(summary.consolidated.sales).toLocaleString()}</Text>
              <Text style={styles.sourceLbl}>Consolidated ({summary.consolidated.count})</Text>
            </View>
          </View>
        </View>

        {/* Invoice list */}
        <View style={styles.subListHeader}>
          <Text style={styles.boxTitle}>FINALIZED INVOICES ({filtered.length})</Text>
        </View>
        {paginatedInvoices.map(item => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemCardLeft}>
              <Text style={styles.itemTitle}>{item.customer_name}</Text>
              <Text style={styles.itemSub}>{item.invoice_number} • {item.source}</Text>
              <Text style={styles.itemDate}>{item.created_at}</Text>
            </View>
            <View style={styles.itemCardRight}>
              <Text style={styles.itemAmount}>₹{Number(item.grand_total).toLocaleString()}</Text>
              <View style={[styles.badge, item.status === 'paid' ? styles.bgGreenBadge : styles.bgOrangeBadge]}>
                <Text style={item.status === 'paid' ? styles.textGreen : styles.textOrange}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <ReportsPagination
          currentPage={salesPage}
          totalRecords={filtered.length}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={setSalesPage}
        />
      </View>
    );
  };

  const renderCollections = () => {
    if (!collectionsData) return null;
    const { summary, payments } = collectionsData;
    const filtered = payments.filter(
      p =>
        p.customer_name.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
        p.method.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
        p.reference_number.toLowerCase().includes(subSearchQuery.toLowerCase())
    );

    const paginatedPayments = filtered.slice((collectionsPage - 1) * pageSize, collectionsPage * pageSize);

    return (
      <View style={styles.tabContent}>
        {/* Method Breakdown */}
        <View style={styles.metricsBox}>
          <Text style={styles.boxTitle}>COLLECTIONS BY METHOD</Text>
          <View style={styles.sourceRow}>
            {Object.entries(summary.methods).map(([meth, info]) => (
              <View key={meth} style={styles.sourceItem}>
                <Text style={styles.sourceVal}>₹{Number(info.total).toLocaleString()}</Text>
                <Text style={styles.sourceLbl}>{meth.toUpperCase()} ({info.count})</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payments List */}
        <View style={styles.subListHeader}>
          <Text style={styles.boxTitle}>PAID TRANSACTIONS ({filtered.length})</Text>
        </View>
        {paginatedPayments.map(p => (
          <View key={p.id} style={styles.itemCard}>
            <View style={styles.itemCardLeft}>
              <Text style={styles.itemTitle}>{p.customer_name}</Text>
              <Text style={styles.itemSub}>{p.method} • Ref: {p.reference_number || 'N/A'}</Text>
              <Text style={styles.itemDate}>{p.received_at}</Text>
              {p.is_advance && (
                <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700', marginTop: 2 }}>
                  Advance Balance: ₹{p.unallocated_advance}
                </Text>
              )}
            </View>
            <View style={styles.itemCardRight}>
              <Text style={[styles.itemAmount, { color: '#059669' }]}>+₹{Number(p.amount).toLocaleString()}</Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleSharePayment(p)}
              >
                <Ionicons name="share-social-outline" size={13} color="#8C331A" />
                <Text style={styles.actionBtnText}>Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <ReportsPagination
          currentPage={collectionsPage}
          totalRecords={filtered.length}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={setCollectionsPage}
        />
      </View>
    );
  };

  const renderOutstanding = () => {
    if (!outstandingData) return null;
    const { summary, customer_dues, invoices } = outstandingData;

    const filteredDues = customer_dues.filter(
      c =>
        c.customer_name.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
        c.customer_phone.toLowerCase().includes(subSearchQuery.toLowerCase())
    );

    const paginatedDues = filteredDues.slice((outstandingPage - 1) * pageSize, outstandingPage * pageSize);

    return (
      <View style={styles.tabContent}>
        {/* Ageing Buckets */}
        <View style={styles.metricsBox}>
          <Text style={styles.boxTitle}>AGEING BUCKETS</Text>
          <View style={styles.sourceRow}>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceVal}>₹{Number(summary.ageing_buckets['0_15_days']).toLocaleString()}</Text>
              <Text style={styles.sourceLbl}>0–15 Days</Text>
            </View>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceVal}>₹{Number(summary.ageing_buckets['16_30_days']).toLocaleString()}</Text>
              <Text style={styles.sourceLbl}>16–30 Days</Text>
            </View>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceVal}>₹{Number(summary.ageing_buckets['31_60_days']).toLocaleString()}</Text>
              <Text style={styles.sourceLbl}>31–60 Days</Text>
            </View>
            <View style={styles.sourceItem}>
              <Text style={[styles.sourceVal, { color: '#DC2626' }]}>
                ₹{Number(summary.ageing_buckets['60_plus_days']).toLocaleString()}
              </Text>
              <Text style={styles.sourceLbl}>60+ Days</Text>
            </View>
          </View>
        </View>

        {/* Customer Dues */}
        <View style={styles.subListHeader}>
          <Text style={styles.boxTitle}>CUSTOMER OUTSTANDING ({filteredDues.length})</Text>
        </View>
        {paginatedDues.map(c => (
          <View key={c.customer_name} style={styles.itemCard}>
            <View style={styles.itemCardLeft}>
              <Text style={styles.itemTitle}>{c.customer_name}</Text>
              <Text style={styles.itemSub}>{c.invoices_count} Unpaid Invoices • {c.customer_phone}</Text>
              {Number(c.overdue_pending) > 0 && (
                <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700', marginTop: 2 }}>
                  Overdue: ₹{Number(c.overdue_pending).toLocaleString()}
                </Text>
              )}
            </View>
            <View style={styles.itemCardRight}>
              <Text style={[styles.itemAmount, { color: '#D97706' }]}>
                ₹{Number(c.total_pending).toLocaleString()}
              </Text>
              {Number(c.overdue_pending) > 0 && (
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: '#DC2626' }]}
                  onPress={() => handleSendReminder(c)}
                >
                  <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                  <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Remind</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <ReportsPagination
          currentPage={outstandingPage}
          totalRecords={filteredDues.length}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={setOutstandingPage}
        />
      </View>
    );
  };

  const renderProducts = () => {
    if (!productsData) return null;

    const filteredProducts = productsData.products.filter(p =>
      p.product_name.toLowerCase().includes(subSearchQuery.toLowerCase())
    );

    const paginatedProducts = filteredProducts.slice((productsPage - 1) * pageSize, productsPage * pageSize);

    return (
      <View style={styles.tabContent}>
        <View style={styles.subListHeader}>
          <Text style={styles.boxTitle}>PRODUCT VELOCITY & SALES ({filteredProducts.length})</Text>
        </View>
        {paginatedProducts.map(p => (
          <View key={p.product_name} style={styles.itemCard}>
            <View style={styles.itemCardLeft}>
              <Text style={styles.itemTitle}>{p.product_name}</Text>
              <Text style={styles.itemSub}>{p.units_sold} Units Sold</Text>
              {p.cost_available ? (
                <Text style={{ fontSize: 11, color: '#6B5E55', marginTop: 2 }}>
                  Cost: ₹{p.cost_value} • Margin: ₹{p.gross_margin} ({p.margin_pct}%)
                </Text>
              ) : (
                <Text style={{ fontSize: 11, color: '#A09489', marginTop: 2 }}>Cost Snapshot Unavailable</Text>
              )}
            </View>
            <View style={styles.itemCardRight}>
              <Text style={styles.itemAmount}>₹{Number(p.sales_value).toLocaleString()}</Text>
              <View style={[styles.badge, p.cost_available ? styles.bgGreenBadge : styles.bgGrayBadge]}>
                <Text style={p.cost_available ? styles.textGreen : styles.textGray}>
                  {p.cost_available ? 'COST CAPTURED' : 'NO COST'}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <ReportsPagination
          currentPage={productsPage}
          totalRecords={filteredProducts.length}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={setProductsPage}
        />
      </View>
    );
  };

  const renderCustomers = () => {
    if (!customersData) return null;

    const filteredCustomers = customersData.customers.filter(
      c =>
        c.customer_name.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
        c.customer_phone.toLowerCase().includes(subSearchQuery.toLowerCase())
    );

    const paginatedCustomers = filteredCustomers.slice((customersPage - 1) * pageSize, customersPage * pageSize);

    return (
      <View style={styles.tabContent}>
        <View style={styles.subListHeader}>
          <Text style={styles.boxTitle}>CUSTOMER RANKING ({filteredCustomers.length})</Text>
        </View>
        {paginatedCustomers.map(c => (
          <View key={c.customer_id} style={styles.itemCard}>
            <View style={styles.itemCardLeft}>
              <Text style={styles.itemTitle}>{c.customer_name}</Text>
              <Text style={styles.itemSub}>{c.period_invoices_count} Billed • {c.customer_phone}</Text>
              <Text style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>
                Collected: ₹{Number(c.period_collections).toLocaleString()} • Due: ₹{Number(c.current_outstanding).toLocaleString()}
              </Text>
            </View>
            <View style={styles.itemCardRight}>
              <Text style={styles.itemAmount}>₹{Number(c.period_sales).toLocaleString()}</Text>
              <Text style={styles.itemDate}>Sales in Period</Text>
            </View>
          </View>
        ))}

        <ReportsPagination
          currentPage={customersPage}
          totalRecords={filteredCustomers.length}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={setCustomersPage}
        />
      </View>
    );
  };

  const renderDeliveries = () => {
    if (!deliveriesData) return null;
    const { summary, partners, discrepancies } = deliveriesData;

    const filteredPartners = partners.filter(prt =>
      prt.partner_name.toLowerCase().includes(subSearchQuery.toLowerCase())
    );

    const filteredDiscrepancies = discrepancies.filter(
      d =>
        d.product_name.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
        d.partner_name.toLowerCase().includes(subSearchQuery.toLowerCase())
    );

    const paginatedPartners = filteredPartners.slice(
      (deliveriesPartnersPage - 1) * pageSize,
      deliveriesPartnersPage * pageSize
    );
    const paginatedDiscrepancies = filteredDiscrepancies.slice(
      (deliveriesDiscrepanciesPage - 1) * pageSize,
      deliveriesDiscrepanciesPage * pageSize
    );

    return (
      <View style={styles.tabContent}>
        {/* Fulfillment Summary */}
        <View style={styles.metricsBox}>
          <Text style={styles.boxTitle}>FULFILLMENT OVERVIEW</Text>
          <View style={styles.sourceRow}>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceVal}>{summary.total_deliveries}</Text>
              <Text style={styles.sourceLbl}>Total Runs</Text>
            </View>
            <View style={styles.sourceItem}>
              <Text style={[styles.sourceVal, { color: '#059669' }]}>{summary.delivered}</Text>
              <Text style={styles.sourceLbl}>Delivered ({summary.completion_rate_pct}%)</Text>
            </View>
            <View style={styles.sourceItem}>
              <Text style={[styles.sourceVal, { color: '#DC2626' }]}>{summary.failed}</Text>
              <Text style={styles.sourceLbl}>Failed</Text>
            </View>
          </View>
        </View>

        {/* Partner Roster */}
        <View style={styles.subListHeader}>
          <Text style={styles.boxTitle}>PARTNER PERFORMANCE ({filteredPartners.length})</Text>
        </View>
        {paginatedPartners.map(prt => (
          <View key={prt.partner_name} style={styles.itemCard}>
            <View style={styles.itemCardLeft}>
              <Text style={styles.itemTitle}>{prt.partner_name}</Text>
              <Text style={styles.itemSub}>{prt.total_assigned} Assigned • {prt.failed} Failed</Text>
            </View>
            <View style={styles.itemCardRight}>
              <Text style={[styles.itemAmount, { color: '#059669' }]}>{prt.delivered} Done</Text>
            </View>
          </View>
        ))}

        <ReportsPagination
          currentPage={deliveriesPartnersPage}
          totalRecords={filteredPartners.length}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={setDeliveriesPartnersPage}
        />

        {/* Discrepancies */}
        {filteredDiscrepancies.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.boxTitle, { color: '#DC2626', marginBottom: 8 }]}>
              DELIVERY DISCREPANCIES ({filteredDiscrepancies.length})
            </Text>
            {paginatedDiscrepancies.map(d => (
              <View key={`${d.delivery_id}_${d.product_name}`} style={[styles.itemCard, { borderColor: '#FCA5A5' }]}>
                <View style={styles.itemCardLeft}>
                  <Text style={styles.itemTitle}>{d.product_name}</Text>
                  <Text style={styles.itemSub}>{d.partner_name} • Order #{d.order_id}</Text>
                  {d.notes !== '' && <Text style={{ fontSize: 11, color: '#6B5E55' }}>Note: {d.notes}</Text>}
                </View>
                <View style={styles.itemCardRight}>
                  <Text style={[styles.itemAmount, { color: '#DC2626' }]}>
                    {d.delivered_qty} / {d.ordered_qty}
                  </Text>
                  <Text style={styles.itemDate}>Delivered/Ordered</Text>
                </View>
              </View>
            ))}

            <ReportsPagination
              currentPage={deliveriesDiscrepanciesPage}
              totalRecords={filteredDiscrepancies.length}
              pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
              onPageChange={setDeliveriesDiscrepanciesPage}
            />
          </View>
        )}
      </View>
    );
  };

  const renderDiscounts = () => {
    if (!discountsData) return null;

    const filteredInvoices = discountsData.invoices.filter(
      item =>
        item.customer_name.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
        item.invoice_number.toLowerCase().includes(subSearchQuery.toLowerCase())
    );

    const paginatedInvoices = filteredInvoices.slice((discountsPage - 1) * pageSize, discountsPage * pageSize);

    return (
      <View style={styles.tabContent}>
        <View style={styles.metricsBox}>
          <Text style={styles.boxTitle}>DISCOUNT SUMMARY</Text>
          <View style={styles.sourceRow}>
            <View style={styles.sourceItem}>
              <Text style={[styles.sourceVal, { color: '#8C331A' }]}>
                ₹{Number(discountsData.summary.total_discount_amount).toLocaleString()}
              </Text>
              <Text style={styles.sourceLbl}>Total Discounts</Text>
            </View>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceVal}>{discountsData.summary.discounted_invoices_count}</Text>
              <Text style={styles.sourceLbl}>Discounted Invoices</Text>
            </View>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceVal}>{discountsData.summary.average_discount_pct}%</Text>
              <Text style={styles.sourceLbl}>Avg Discount %</Text>
            </View>
          </View>
        </View>

        <View style={styles.subListHeader}>
          <Text style={styles.boxTitle}>DISCOUNTED INVOICES ({filteredInvoices.length})</Text>
        </View>
        {paginatedInvoices.map(item => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemCardLeft}>
              <Text style={styles.itemTitle}>{item.customer_name}</Text>
              <Text style={styles.itemSub}>{item.invoice_number}</Text>
              <Text style={styles.itemDate}>Subtotal: ₹{item.subtotal} • Grand: ₹{item.grand_total}</Text>
            </View>
            <View style={styles.itemCardRight}>
              <Text style={[styles.itemAmount, { color: '#8C331A' }]}>-₹{Number(item.discount_amount).toLocaleString()}</Text>
              <Text style={styles.itemDate}>({item.discount_pct}% Off)</Text>
            </View>
          </View>
        ))}

        <ReportsPagination
          currentPage={discountsPage}
          totalRecords={filteredInvoices.length}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={setDiscountsPage}
        />
      </View>
    );
  };

  const renderProfitLoss = () => {
    if (!pnlData) return null;
    const { summary, expense_categories } = pnlData;
    const isCostPartial = summary.cost_coverage_status !== 'complete';

    const paginatedExpenses = expense_categories.slice(
      (pnlExpensesPage - 1) * pageSize,
      pnlExpensesPage * pageSize
    );

    return (
      <View style={styles.tabContent}>
        {isCostPartial && (
          <View style={styles.coverageNotice}>
            <Ionicons name="alert-circle-outline" size={18} color="#D97706" style={{ marginRight: 8 }} />
            <Text style={styles.coverageNoticeText}>
              Cost coverage is {summary.cost_coverage_status.toUpperCase()} ({summary.items_with_cost_count} of {summary.total_items_count} items with snapshots). Unrecorded items are not treated as zero cost.
            </Text>
          </View>
        )}

        <View style={styles.pnlStatementCard}>
          <View style={styles.pnlRow}>
            <Text style={styles.pnlLabel}>Net Sales</Text>
            <Text style={styles.pnlVal}>₹{Number(summary.net_sales).toLocaleString()}</Text>
          </View>
          <View style={styles.pnlRow}>
            <Text style={styles.pnlLabel}>Less: Cost of Goods Sold (COGS)</Text>
            <Text style={[styles.pnlVal, { color: '#DC2626' }]}>-₹{Number(summary.cogs).toLocaleString()}</Text>
          </View>
          <View style={[styles.pnlRow, styles.pnlDivider]}>
            <Text style={[styles.pnlLabel, { fontWeight: '800' }]}>Gross Profit</Text>
            <Text style={[styles.pnlVal, { fontWeight: '800', color: '#2563EB' }]}>
              ₹{Number(summary.gross_profit).toLocaleString()}
            </Text>
          </View>
          <View style={styles.pnlRow}>
            <Text style={styles.pnlLabel}>Less: Operating Expenses</Text>
            <Text style={[styles.pnlVal, { color: '#DC2626' }]}>
              -₹{Number(summary.operating_expenses).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.pnlRow, styles.pnlTotalDivider]}>
            <Text style={[styles.pnlLabel, { fontWeight: '800', fontSize: 16 }]}>Net Profit</Text>
            <Text style={[styles.pnlVal, { fontWeight: '800', fontSize: 16, color: '#059669' }]}>
              ₹{Number(summary.net_profit).toLocaleString()} ({summary.profit_margin_pct}%)
            </Text>
          </View>
        </View>

        {/* Operating Expenses Breakdown */}
        <View style={styles.subListHeader}>
          <Text style={styles.boxTitle}>OPERATING EXPENSES BREAKDOWN ({expense_categories.length})</Text>
        </View>
        {paginatedExpenses.map(cat => (
          <View key={cat.category} style={styles.itemCard}>
            <View style={styles.itemCardLeft}>
              <Text style={styles.itemTitle}>{cat.category_display}</Text>
              <Text style={styles.itemSub}>{cat.count} recorded entries</Text>
            </View>
            <View style={styles.itemCardRight}>
              <Text style={styles.itemAmount}>₹{Number(cat.total).toLocaleString()}</Text>
            </View>
          </View>
        ))}

        <ReportsPagination
          currentPage={pnlExpensesPage}
          totalRecords={expense_categories.length}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={setPnlExpensesPage}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header with Back and Refresh */}
      <Header
        title="Business Reports Dashboard"
        showBack={true}
        showNotification={false}
      />

      {/* Dropdown Selectors: Date Range & Report Section with Floating Overlay */}
      <View style={styles.dropdownsContainer}>
        {/* Date Range Dropdown Column */}
        <View style={styles.dropdownColumn}>
          <Text style={styles.dropdownLabel}>Date Range</Text>
          <TouchableOpacity
            style={[
              styles.dropdownSelector,
              dateDropdownOpen && styles.dropdownSelectorActive,
            ]}
            onPress={() => {
              setDateDropdownOpen(prev => !prev);
              setReportDropdownOpen(false);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownSelectorInner}>
              <Ionicons name="calendar-outline" size={15} color="#8C331A" style={{ marginRight: 6 }} />
              <Text style={styles.dropdownSelectorText} numberOfLines={1}>
                {FILTER_PILLS.find(p => p.id === filterType)?.label || 'Select Date Range'}
              </Text>
            </View>
            <Ionicons
              name={dateDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#8A7E75"
            />
          </TouchableOpacity>

          {/* Floating Overlay Date Range Options */}
          {dateDropdownOpen && (
            <View style={styles.overlayDropdownList}>
              <ScrollView
                style={styles.overlayDropdownScroll}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                bounces={false}
              >
                {FILTER_PILLS.map(p => {
                  const isSelected = filterType === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.overlayDropdownItem, isSelected && styles.overlayDropdownItemActive]}
                      onPress={() => {
                        setDateDropdownOpen(false);
                        if (p.id === 'custom') {
                          setCustomModalVisible(true);
                        } else {
                          setFilterType(p.id);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.overlayDropdownItemText, isSelected && styles.overlayDropdownItemTextActive]}>
                        {p.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#8C331A" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Report Section Dropdown Column */}
        <View style={styles.dropdownColumn}>
          <Text style={styles.dropdownLabel}>Report Section</Text>
          <TouchableOpacity
            style={[
              styles.dropdownSelector,
              reportDropdownOpen && styles.dropdownSelectorActive,
            ]}
            onPress={() => {
              setReportDropdownOpen(prev => !prev);
              setDateDropdownOpen(false);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownSelectorInner}>
              <Ionicons
                name={REPORT_TABS.find(t => t.id === activeTab)?.icon || 'document-text-outline'}
                size={15}
                color="#8C331A"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.dropdownSelectorText} numberOfLines={1}>
                {REPORT_TABS.find(t => t.id === activeTab)?.label || 'Select Section'}
              </Text>
            </View>
            <Ionicons
              name={reportDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#8A7E75"
            />
          </TouchableOpacity>

          {/* Floating Overlay Report Section Options */}
          {reportDropdownOpen && (
            <View style={[styles.overlayDropdownList, styles.overlayDropdownListSection]}>
              <ScrollView
                style={styles.overlayDropdownScroll}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                bounces={false}
              >
                {REPORT_TABS.map(t => {
                  const isSelected = activeTab === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.overlayDropdownItem, isSelected && styles.overlayDropdownItemActive]}
                      onPress={() => {
                        setActiveTab(t.id);
                        setSubSearchQuery('');
                        setReportDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.overlayItemLeft}>
                        <Ionicons
                          name={t.icon}
                          size={15}
                          color={isSelected ? '#8C331A' : '#6B5E55'}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.overlayDropdownItemText, isSelected && styles.overlayDropdownItemTextActive]}>
                          {t.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#8C331A" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Invisible backdrop to dismiss open dropdown on outside tap */}
      {(dateDropdownOpen || reportDropdownOpen) && (
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => {
            setDateDropdownOpen(false);
            setReportDropdownOpen(false);
          }}
        />
      )}

      {/* Search Input for items within sub-report */}
      {activeTab !== 'overview' && activeTab !== 'profit-loss' && (
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#8A7E75" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search in ${activeTab}...`}
            placeholderTextColor="#A09489"
            value={subSearchQuery}
            onChangeText={setSubSearchQuery}
          />
          {subSearchQuery !== '' && (
            <TouchableOpacity onPress={() => setSubSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#8A7E75" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main Body */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8C331A" />
          <Text style={styles.loadingText}>Computing {activeTab} analytics...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={44} color="#DC2626" />
          <Text style={styles.errorTitle}>Report Error</Text>
          <Text style={styles.errorSub}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadActiveReport}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'sales' && renderSales()}
          {activeTab === 'collections' && renderCollections()}
          {activeTab === 'outstanding' && renderOutstanding()}
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'deliveries' && renderDeliveries()}
          {activeTab === 'discounts' && renderDiscounts()}
          {activeTab === 'profit-loss' && renderProfitLoss()}
        </ScrollView>
      )}

      {/* Bottom Export Bar */}
      <View style={[styles.exportBar, { paddingBottom: Math.max(insets.bottom, 10), height: 60 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.exportBtn, styles.exportBtnPdf]}
          onPress={() => handleExport('pdf')}
          disabled={exporting !== null}
          activeOpacity={0.8}
        >
          {exporting === 'pdf' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.exportBtnText}>Export PDF</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportBtn, styles.exportBtnExcel]}
          onPress={() => handleExport('excel')}
          disabled={exporting !== null}
          activeOpacity={0.8}
        >
          {exporting === 'excel' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="grid-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.exportBtnText}>Export Excel</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Custom Date Modal */}
      <Modal visible={customModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom Date Range</Text>
            <Text style={styles.modalSub}>Enter date boundaries in YYYY-MM-DD format</Text>

            <Text style={styles.inputLabel}>From Date</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="e.g. 2026-11-01"
              value={customFrom}
              onChangeText={setCustomFrom}
            />

            <Text style={styles.inputLabel}>To Date</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="e.g. 2026-11-21"
              value={customTo}
              onChangeText={setCustomTo}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => {
                  if (!customFrom) {
                    Alert.alert('Required', 'From Date is required.');
                    return;
                  }
                  setFilterType('custom');
                  setCustomModalVisible(false);
                }}
              >
                <Text style={styles.modalApplyText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Reports Export & Receipt Dialog */}
      <ReportsExportDialog
        visible={exportDialogVisible}
        format={exportFormat}
        status={exportStatus}
        title={exportTitle}
        subtitle={exportSubtitle}
        filename={exportFilename}
        fileSize={exportFileSize}
        errorMessage={exportErrorMsg}
        downloadingToPublic={downloadingToPublic}
        onClose={() => setExportDialogVisible(false)}
        onOpen={activeReceiptPayment ? handleOpenReceiptPdf : undefined}
        onDownload={handleSaveToPublicDownloads}
        onShare={handleShareFile}
        onRetry={() => {
          if (activeReceiptPayment) {
            handleGenerateReceiptPdf(activeReceiptPayment);
          } else {
            handleExport(exportFormat);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  dropdownsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
    zIndex: 100,
    elevation: 6,
  },
  dropdownColumn: {
    flex: 1,
    position: 'relative',
    zIndex: 100,
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5E55',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E1D9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 40,
  },
  dropdownSelectorActive: {
    borderColor: '#8C331A',
  },
  dropdownSelectorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 4,
  },
  dropdownSelectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C201A',
    flexShrink: 1,
  },
  overlayDropdownList: {
    position: 'absolute',
    top: 60, // Sits directly beneath the label and 40px selector input
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E1D9',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  overlayDropdownListSection: {
    maxHeight: 380, // Accommodates all 9 report sections cleanly on Android
  },
  overlayDropdownScroll: {
    maxHeight: 380,
  },
  overlayDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    minHeight: 44,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F3EF',
  },
  overlayDropdownItemActive: {
    backgroundColor: '#FAF0E6',
  },
  overlayItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  overlayDropdownItemText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B3E36',
  },
  overlayDropdownItemTextActive: {
    fontWeight: '800',
    color: '#8C331A',
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E1D9',
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#2C201A',
    paddingVertical: 0,
  },
  tabContent: {
    padding: 14,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#8C331A',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 10,
  },
  errorSub: {
    fontSize: 12,
    color: '#6B5E55',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  coverageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  coverageNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  deckGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  deckCard: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  bgBrandLight: { backgroundColor: '#FDF7F4' },
  bgGreenLight: { backgroundColor: '#F0FDF4' },
  bgOrangeLight: { backgroundColor: '#FFFBEB' },
  bgBlueLight: { backgroundColor: '#EFF6FF' },
  bgGrayLight: { backgroundColor: '#F9FAFB' },
  deckCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.5,
  },
  deckCardValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#8C331A',
    marginTop: 4,
  },
  deckCardSub: {
    fontSize: 10.5,
    color: '#6B5E55',
    marginTop: 2,
  },
  metricsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    padding: 12,
    marginBottom: 14,
  },
  boxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceItem: {
    flex: 1,
    minWidth: '28%',
  },
  sourceVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2C201A',
  },
  sourceLbl: {
    fontSize: 10,
    color: '#8E8278',
    marginTop: 1,
  },
  subListHeader: {
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    padding: 12,
    marginBottom: 8,
  },
  itemCardLeft: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C201A',
  },
  itemSub: {
    fontSize: 11,
    color: '#6B5E55',
    marginTop: 2,
  },
  itemDate: {
    fontSize: 10,
    color: '#8E8278',
    marginTop: 2,
  },
  itemCardRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2C201A',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  bgGreenBadge: { backgroundColor: '#DEF7EC' },
  bgOrangeBadge: { backgroundColor: '#FEF3C7' },
  bgGrayBadge: { backgroundColor: '#F3F4F6' },
  textGreen: { fontSize: 9.5, fontWeight: '800', color: '#059669' },
  textOrange: { fontSize: 9.5, fontWeight: '800', color: '#D97706' },
  textGray: { fontSize: 9.5, fontWeight: '800', color: '#6B7280' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8C331A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  actionBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 4,
  },
  pnlStatementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    padding: 14,
    marginBottom: 14,
  },
  pnlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  pnlDivider: {
    borderTopWidth: 1,
    borderTopColor: '#EFEAE4',
    marginTop: 4,
    paddingTop: 8,
  },
  pnlTotalDivider: {
    borderTopWidth: 2,
    borderTopColor: '#2C201A',
    marginTop: 6,
    paddingTop: 10,
  },
  pnlLabel: {
    fontSize: 13,
    color: '#2C201A',
  },
  pnlVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C201A',
  },
  exportBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#FAF8F5',
    borderTopWidth: 1,
    borderTopColor: '#EFEAE4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
  exportBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportBtnPdf: {
    backgroundColor: '#8C331A',
  },
  exportBtnExcel: {
    backgroundColor: '#059669',
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C201A',
  },
  modalSub: {
    fontSize: 11.5,
    color: '#6B5E55',
    marginTop: 2,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E8E1D9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#2C201A',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalCancelText: {
    color: '#6B5E55',
    fontWeight: '600',
  },
  modalApplyBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalApplyText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
