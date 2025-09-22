/**
 * manual-customer-core-customer.ts
 * Module link between manual customer and core customer
 * TEMPORARILY DISABLED - database relation missing after import
 */
import { defineLink } from '@medusajs/framework/utils';
import CustomerModule from '@medusajs/medusa/customer';
import ManualCustomerModule from '../modules/manual-customer';

// Temporarily disabled - missing link table after database import
// TODO: Create missing link table or fix linkable definition
/*
export default defineLink(
	ManualCustomerModule.linkable.manualCustomer,
	CustomerModule.linkable.customer,
);
*/
