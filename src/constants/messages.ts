/**
 * Centralized Application Messages & Text Constants
 * ChaiFlow / ClientManageApp
 */

export const AUTH_MESSAGES = {
  LOGIN_SUCCESS: 'Logged in successfully!',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  OTP_SENT: 'OTP sent to your mobile number.',
  INVALID_PHONE: 'Please enter a valid 10-digit mobile number.',
  INVALID_OTP: 'Invalid OTP code. Please check and try again.',
  SESSION_EXPIRED: 'Session expired. Please log in again.',
} as const;

export const CUSTOMER_MESSAGES = {
  ADD_SUCCESS: 'Customer added successfully!',
  UPDATE_SUCCESS: 'Customer details updated.',
  DELETE_SUCCESS: 'Customer removed successfully.',
  DELETE_CONFIRM: 'Are you sure you want to delete this customer?',
  NAME_REQUIRED: 'Customer name is required.',
  PHONE_REQUIRED: 'Customer phone number is required.',
  INVALID_GST: 'Please enter a valid 15-digit GSTIN.',
} as const;

export const DELIVERY_MESSAGES = {
  PARTNER_ADDED: 'Delivery partner added to fleet!',
  PARTNER_UPDATED: 'Delivery partner details updated.',
  PARTNER_REMOVED: 'Delivery partner removed from fleet.',
  ORDER_DELIVERED: 'Order marked as DELIVERED!',
  PAYMENT_COLLECTED: (amount: number, method: string, name: string) =>
    `Collected ₹${amount} via ${method} for ${name}!`,
  DIALING_PHONE: (phone: string) => `Dialing ${phone}...`,
  OPENING_MAPS: (address: string) => `Opening directions for: ${address}`,
  ORDER_ASSIGNED: (name: string) => `Order assigned to ${name}!`,
} as const;

export const INVOICE_MESSAGES = {
  CREATE_SUCCESS: 'Invoice created successfully!',
  UPDATE_SUCCESS: 'Invoice updated.',
  DELETE_SUCCESS: 'Invoice deleted successfully.',
  PAYMENT_RECORDED: 'Payment recorded successfully.',
  PDF_GENERATED: 'Invoice PDF generated and ready to share.',
} as const;

export const NOTIFICATION_MESSAGES = {
  CLEAR_ALL: 'All notifications cleared.',
  DELETE_SELECTED: (count: number) => `Deleted ${count} notification(s).`,
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid 10-digit mobile number.',
  INVALID_PINCODE: 'Please enter a valid 6-digit PIN code.',
  INVALID_AMOUNT: 'Please enter a valid positive amount.',
  MIN_LENGTH: (field: string, min: number) =>
    `${field} must be at least ${min} characters.`,
} as const;

export const COMMON_MESSAGES = {
  SUCCESS: 'Action completed successfully!',
  ERROR_GENERIC: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Network issue detected. Please check your connection.',
  SAVED: 'Saved successfully.',
  SUPPORT_CALLBACK: 'Support ticket logged! Agent will call in 15 mins.',
} as const;

export default {
  AUTH: AUTH_MESSAGES,
  CUSTOMER: CUSTOMER_MESSAGES,
  DELIVERY: DELIVERY_MESSAGES,
  INVOICE: INVOICE_MESSAGES,
  NOTIFICATION: NOTIFICATION_MESSAGES,
  VALIDATION: VALIDATION_MESSAGES,
  COMMON: COMMON_MESSAGES,
};
