/**
 * index.ts
 * Module definition for the supplier module
 */
import { Module } from '@medusajs/framework/utils';

import SupplierService from './service';

// Export the module name as a constant for easier reference
export const SUPPLIER_MODULE = 'supplier';

// Define and export the module
export default Module(SUPPLIER_MODULE, {
  service: SupplierService,
});
