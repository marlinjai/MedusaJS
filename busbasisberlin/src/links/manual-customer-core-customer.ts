/**
 * manual-customer-core-customer.ts
 * Module link between manual customer and core customer
 * TEMPORARILY DISABLED - causing deployment issues
 */
import { defineLink } from '@medusajs/framework/utils';
import CustomerModule from '@medusajs/medusa/customer';
import ManualCustomerModule from '../modules/manual-customer';

// Temporarily disabled to fix deployment
// TODO: Fix linkable definition and re-enable
/*
export default defineLink(
	ManualCustomerModule.linkable.manualCustomer,
	CustomerModule.linkable.customer,
);
*/
