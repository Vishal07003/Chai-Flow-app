/**
 * Validation Utility Module
 * ChaiFlow / ClientManageApp
 * 
 * Comprehensive validation helpers for form fields,
 * mobile numbers, email addresses, OTP, GSTIN, PIN codes, and amounts.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validation = {
  /**
   * Validate Indian 10-digit phone number
   */
  isValidPhone(phone: string): boolean {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
  },

  /**
   * Validate 4 to 6 digit numeric OTP
   */
  isValidOtp(otp: string, length: number = 4): boolean {
    if (!otp) return false;
    const regex = new RegExp(`^\\d{${length}}$`);
    return regex.test(otp.trim());
  },

  /**
   * Validate standard email address format
   */
  isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  },

  /**
   * Validate non-empty text string
   */
  isNotEmpty(text: string): boolean {
    return typeof text === 'string' && text.trim().length > 0;
  },

  /**
   * Validate Indian GSTIN format (15 alphanumeric characters)
   * Example: 22AAAAA0000A1Z5
   */
  isValidGST(gstin: string): boolean {
    if (!gstin) return true; // Optional field in most forms
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gstin.trim().toUpperCase());
  },

  /**
   * Validate Indian 6-digit PIN code
   */
  isValidPincode(pincode: string): boolean {
    if (!pincode) return true; // Optional field
    return /^[1-9][0-9]{5}$/.test(pincode.trim());
  },

  /**
   * Validate positive currency amount
   */
  isValidAmount(amount: number | string): boolean {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    return !isNaN(num) && num > 0;
  },

  /**
   * Validate customer creation form fields
   */
  validateCustomerForm(data: {
    name: string;
    phone: string;
    email?: string;
    gstin?: string;
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!this.isNotEmpty(data.name)) {
      errors.name = 'Customer name is required.';
    }

    if (!this.isValidPhone(data.phone)) {
      errors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (data.gstin && !this.isValidGST(data.gstin)) {
      errors.gstin = 'Please enter a valid 15-digit GSTIN.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Validate delivery partner form fields
   */
  validateDeliveryPartnerForm(data: {
    name: string;
    phone: string;
    licenseNumber?: string;
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!this.isNotEmpty(data.name)) {
      errors.name = 'Partner name is required.';
    }

    if (!this.isValidPhone(data.phone)) {
      errors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },
};

export default validation;
