import authService from './auth.service';
import customerService from './customer.service';
import productService from './product.service';
import deliveryService from './delivery.service';
import orderService from './order.service';
import paymentService from './payment.service';
import scheduleService from './schedule.service';
import profileService from './profile.service';
import notificationService from './notification.service';
import billingService from './billing.service';
import companyService from './company.service';
import apiClient from './api';

export {
  apiClient,
  authService,
  customerService,
  productService,
  deliveryService,
  orderService,
  paymentService,
  scheduleService,
  profileService,
  notificationService,
  billingService,
  companyService,
};

export default {
  api: apiClient,
  auth: authService,
  customer: customerService,
  product: productService,
  delivery: deliveryService,
  order: orderService,
  payment: paymentService,
  schedule: scheduleService,
  profile: profileService,
  notification: notificationService,
  billing: billingService,
  company: companyService,
};
