import { NativeModules, Platform, PermissionsAndroid, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { API_BASE_URL } from '../constants/api.config';
import apiClient from './api';

const { NativePdfModule } = NativeModules;

export interface InvoicePdfDownloadResult {
  filePath: string;
  filename: string;
}

export const pdfService = {
  /**
   * Constructs the authenticated PDF download URL for a given invoice ID.
   */
  getPdfUrl(invoiceId: number | string): string {
    return `${API_BASE_URL}/billing/invoices/${invoiceId}/pdf/`;
  },

  /**
   * Downloads the authenticated PDF from Django backend into local device storage.
   * Cleans up or avoids repeated downloading if cached.
   */
  async downloadInvoicePdf(
    invoiceId: number | string,
    invoiceNumber?: string,
  ): Promise<InvoicePdfDownloadResult> {
    const token = await apiClient.getAccessToken();
    const cleanNum = (invoiceNumber || `INV-${invoiceId}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `ChaiFlow_${cleanNum}.pdf`;

    // Save in DocumentDirectoryPath for persistent accessible storage
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
      // Clean up failed file if exists
      if (await RNFS.exists(filePath)) {
        await RNFS.unlink(filePath).catch(() => {});
      }
      throw new Error(`Failed to download invoice PDF (Status ${downloadResult.statusCode})`);
    }

    return { filePath, filename };
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
};

export default pdfService;

