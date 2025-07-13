/**
 * index.ts
 * Manual Customer module definition
 */
import { Module } from '@medusajs/framework/utils';

import ManualCustomerService from './service';

export const MANUAL_CUSTOMER_MODULE = 'manual-customer';

export default Module(MANUAL_CUSTOMER_MODULE, {
  service: ManualCustomerService,
});
