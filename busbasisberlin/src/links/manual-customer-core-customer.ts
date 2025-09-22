/**
 * manual-customer-core-customer.ts
 * Module link between manual customer and core customer
 * TEMPORARILY DISABLED - causes interactive migration prompt in production
 */

// Temporarily disabled - causes containers to hang waiting for user input
// TODO: Create missing link table or fix linkable definition
/*
import { defineLink } from '@medusajs/framework/utils';
import CustomerModule from '@medusajs/medusa/customer';
import ManualCustomerModule from '../modules/manual-customer';

export default defineLink(
	ManualCustomerModule.linkable.manualCustomer,
	CustomerModule.linkable.customer,
);
*/
