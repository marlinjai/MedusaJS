/**
 * manual-customer-core-customer.ts
 * Module link between manual customer and core customer
 */
import { defineLink } from '@medusajs/framework/utils';
import CustomerModule from '@medusajs/medusa/customer';
import ManualCustomerModule from '../modules/manual-customer';

export default defineLink(ManualCustomerModule.linkable.manualCustomer, CustomerModule.linkable.customer);
