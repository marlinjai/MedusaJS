/**
 * index.ts
 * Service module configuration
 */

import { Module } from '@medusajs/framework/utils';

import ServiceService from './service';

export const SERVICE_MODULE = 'service';

// Define and export the module
export default Module(SERVICE_MODULE, {
	service: ServiceService,
});
