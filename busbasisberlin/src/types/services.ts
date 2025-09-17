/**
 * services.ts
 * TypeScript type declarations for custom Medusa services
 * This ensures proper typing when resolving services from the dependency injection container
 */

import OfferService from '../modules/offer/service';
import ServiceService from '../modules/service/service';
import SupplierService from '../modules/supplier/service';

// Export service types for use in API routes, workflows, and scripts
export type ResolvedOfferService = OfferService;
export type ResolvedSupplierService = SupplierService;
export type ResolvedServiceService = ServiceService;

// Service module keys - these match the module names used in req.scope.resolve()
export const SERVICE_MODULES = {
	OFFER: 'offer',
	SUPPLIER: 'supplier',
	SERVICE: 'service',
} as const;

// Helper type for service resolution
export interface ServiceContainer {
	resolve<T = unknown>(key: string): T;
}

// Typed service resolver helpers
export function resolveOfferService(
	container: ServiceContainer,
): ResolvedOfferService {
	return container.resolve<ResolvedOfferService>(SERVICE_MODULES.OFFER);
}

export function resolveSupplierService(
	container: ServiceContainer,
): ResolvedSupplierService {
	return container.resolve<ResolvedSupplierService>(SERVICE_MODULES.SUPPLIER);
}

export function resolveServiceService(
	container: ServiceContainer,
): ResolvedServiceService {
	return container.resolve<ResolvedServiceService>(SERVICE_MODULES.SERVICE);
}
