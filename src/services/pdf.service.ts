import { NativeModules, Platform, PermissionsAndroid, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { API_BASE_URL } from '../constants/api.config';
import apiClient from './api';

const { NativePdfModule } = NativeModules;

export interface InvoicePdfDownloadResult {
  filePath: string;
  filename: string;
  publicPath?: string;
  size?: number;
}

export interface PaymentReceiptPdfDownloadResult {
  filePath: string;
  filename: string;
  publicPath?: string;
  size: number;
}

export const pdfService = {
  /**
   * Constructs the authenticated PDF download URL for a given invoice ID.
   */
  getPdfUrl(invoiceId: number | string): string {
    return `${API_BASE_URL}/billing/invoices/${invoiceId}/pdf/`;
  },

  /**
   * Downloads the authenticated PDF from Django backend into local device storage,
   * validates non-zero byte size, and copies into public Downloads folder on Android.
   */
  async downloadInvoicePdf(
    invoiceId: number | string,
    invoiceNumber?: string,
  ): Promise<InvoicePdfDownloadResult> {
    const token = await apiClient.getAccessToken();
    const cleanNum = (invoiceNumber || `Invoice_${invoiceId}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `ChaiFlow_${cleanNum}.pdf`;

    // Save in DocumentDirectoryPath for persistent accessible app storage
    const targetDir = RNFS.DocumentDirectoryPath;
    const filePath = `${targetDir}/${filename}`;

    const headers: Record<string, string> = {
      Accept: 'application/pdf',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const downloadUrl = this.getPdfUrl(invoiceId);

    // Download the PDF
    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: filePath,
      headers,
    }).promise;

    if (downloadResult.statusCode !== 200) {
      if (await RNFS.exists(filePath)) {
        await RNFS.unlink(filePath).catch(() => {});
      }
      throw new Error(`Failed to download invoice PDF (Status ${downloadResult.statusCode})`);
    }

    // Verify file actually exists and has non-zero size
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      throw new Error('Downloaded invoice PDF file was not found on device storage.');
    }

    const stat = await RNFS.stat(filePath);
    if (stat.size <= 0) {
      await RNFS.unlink(filePath).catch(() => {});
      throw new Error('Downloaded invoice PDF is empty (0 bytes).');
    }

    // On Android, copy file into public Android Downloads using MediaStore
    let publicPath = filePath;
    if (Platform.OS === 'android' && NativePdfModule?.saveToPublicDownloads) {
      try {
        publicPath = await NativePdfModule.saveToPublicDownloads(filePath, filename);
      } catch (err) {
        console.warn('[PDF Download] MediaStore save warning:', err);
      }
    }

    return { filePath, filename, publicPath };
  },

  /**
   * Directly opens the invoice PDF in the device's default PDF viewer (e.g. Google Drive PDF, Adobe).
   */
  async openInvoicePdf(
    invoiceId: number | string,
    invoiceNumber?: string,
  ): Promise<boolean> {
    const { filePath, filename } = await this.downloadInvoicePdf(invoiceId, invoiceNumber);
    return await this.openPdfFile(filePath, `Invoice ${filename}`);
  },

  /**
   * Opens an already downloaded PDF file on device using NativePdfModule.
   */
  async openPdfFile(filePath: string, title: string = 'View PDF'): Promise<boolean> {
    if (Platform.OS === 'android' && NativePdfModule?.viewPdf) {
      return await NativePdfModule.viewPdf(filePath, title);
    }
    throw new Error('Native PDF viewer is not available on this platform.');
  },

  /**
   * Shares an already downloaded PDF file via Android Share Sheet as a real attachment.
   */
  async sharePdfFile(filePath: string, title: string = 'Share Report'): Promise<boolean> {
    if (Platform.OS === 'android' && NativePdfModule?.sharePdf) {
      return await NativePdfModule.sharePdf(filePath, title);
    }
    throw new Error('Native PDF sharing is not available on this platform.');
  },

  /**
   * Copies a downloaded PDF file into public Android Downloads using MediaStore.
   */
  async saveToPublicDownloads(filePath: string, filename: string): Promise<string> {
    if (Platform.OS === 'android' && NativePdfModule?.saveToPublicDownloads) {
      return await NativePdfModule.saveToPublicDownloads(filePath, filename);
    }
    return filePath;
  },

  /**
   * Opens Android native share sheet allowing WhatsApp and all installed apps
   * to receive the actual A4 PDF attachment.
   */
  async shareInvoicePdf(
    invoiceId: number | string,
    invoiceNumber?: string,
  ): Promise<boolean> {
    const { filePath, filename } = await this.downloadInvoicePdf(invoiceId, invoiceNumber);

    if (Platform.OS === 'android' && NativePdfModule?.sharePdf) {
      return await NativePdfModule.sharePdf(filePath, `Invoice ${filename}`);
    }

    throw new Error('Native PDF sharing is not available on this platform.');
  },

  /**
   * Constructs the authenticated Payment Receipt PDF download URL for a given payment ID.
   */
  getPaymentReceiptUrl(paymentId: number | string): string {
    return `${API_BASE_URL}/billing/payments/${paymentId}/receipt/`;
  },

  /**
   * Downloads and validates an individual branded Payment Receipt PDF from Django backend.
   * Validates non-zero byte size and %PDF signature.
   */
  async downloadPaymentReceiptPdf(
    paymentId: number | string,
    receivedDate?: string,
  ): Promise<PaymentReceiptPdfDownloadResult> {
    const token = await apiClient.getAccessToken();
    const dateStr = (receivedDate ? receivedDate.slice(0, 10) : new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, '');
    const filename = `ChaiFlow_Receipt_${paymentId}_${dateStr}.pdf`;

    const targetDir = RNFS.DocumentDirectoryPath;
    const filePath = `${targetDir}/${filename}`;

    const headers: Record<string, string> = {
      Accept: 'application/pdf',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const downloadUrl = this.getPaymentReceiptUrl(paymentId);

    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: filePath,
      headers,
    }).promise;

    if (downloadResult.statusCode !== 200) {
      if (await RNFS.exists(filePath)) {
        await RNFS.unlink(filePath).catch(() => {});
      }
      throw new Error(`Failed to download payment receipt (Status ${downloadResult.statusCode})`);
    }

    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      throw new Error('Downloaded receipt PDF file was not found on device storage.');
    }

    const stat = await RNFS.stat(filePath);
    if (stat.size <= 0) {
      await RNFS.unlink(filePath).catch(() => {});
      throw new Error('Downloaded receipt PDF is empty (0 bytes).');
    }

    // Verify %PDF header signature in file
    try {
      const headerChunk = await RNFS.read(filePath, 5, 0, 'utf8');
      if (!headerChunk.startsWith('%PDF')) {
        await RNFS.unlink(filePath).catch(() => {});
        throw new Error('Downloaded file is not a valid PDF document.');
      }
    } catch (err: any) {
      if (err.message?.includes('valid PDF document')) {
        throw err;
      }
    }

    return { filePath, filename, size: stat.size };
  },

  /**
   * Opens Android native print interface for direct printer selection
   * or Save as PDF system service.
   */
  async printInvoicePdf(
    invoiceId: number | string,
    invoiceNumber?: string,
  ): Promise<boolean> {
    const { filePath, filename } = await this.downloadInvoicePdf(invoiceId, invoiceNumber);

    if (Platform.OS === 'android' && NativePdfModule?.printPdf) {
      return await NativePdfModule.printPdf(filePath, `Print_${filename}`);
    }

    throw new Error('Native PDF printing is not available on this platform.');
  },

  /**
   * Downloads and saves monthly invoice Excel (.xlsx) file to device storage & public Downloads.
   */
  async downloadInvoiceExcel(
    invoiceId: number | string,
    invoiceNumber?: string,
  ): Promise<{ filePath: string; filename: string; publicPath?: string }> {
    const token = await apiClient.getAccessToken();
    const cleanNum = (invoiceNumber || `Invoice_${invoiceId}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `ChaiFlow_Monthly_${cleanNum}.xlsx`;

    const targetDir = RNFS.DocumentDirectoryPath;
    const filePath = `${targetDir}/${filename}`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const downloadUrl = `${API_BASE_URL}/billing/invoices/${invoiceId}/excel/`;

    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: filePath,
      headers,
    }).promise;

    if (downloadResult.statusCode !== 200) {
      if (await RNFS.exists(filePath)) {
        await RNFS.unlink(filePath).catch(() => {});
      }
      throw new Error(`Failed to download invoice Excel (Status ${downloadResult.statusCode})`);
    }

    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      throw new Error('Downloaded invoice Excel file was not found on device storage.');
    }

    const stat = await RNFS.stat(filePath);
    if (stat.size <= 0) {
      await RNFS.unlink(filePath).catch(() => {});
      throw new Error('Downloaded invoice Excel is empty (0 bytes).');
    }

    let publicPath = filePath;
    if (Platform.OS === 'android' && NativePdfModule?.saveToPublicDownloads) {
      try {
        publicPath = await NativePdfModule.saveToPublicDownloads(filePath, filename);
      } catch (err) {
        console.warn('[Excel Download] MediaStore save warning:', err);
      }
    }

    return { filePath, filename, publicPath };
  },
};

export default pdfService;

