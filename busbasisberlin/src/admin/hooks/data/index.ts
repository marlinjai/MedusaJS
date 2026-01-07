/**
 * index.ts
 * Central export for all data fetching hooks
 * These hooks wrap API calls with React Query for consistent data management
 */

// Supplier hooks
export {
	useSuppliers,
	useSupplier,
	useCreateSupplier,
	useUpdateSupplier,
	useDeleteSupplier,
} from './useSuppliers';

// Service hooks
export {
	useServices,
	useService,
	useCreateService,
	useUpdateService,
	useDeleteService,
} from './useServices';

// Offer hooks
export {
	useOffers,
	useOffer,
	useCreateOffer,
	useUpdateOffer,
	useDeleteOffer,
} from './useOffers';

// Manual Customer hooks
export {
	useManualCustomers,
	useManualCustomer,
	useCreateManualCustomer,
	useUpdateManualCustomer,
	useDeleteManualCustomer,
} from './useManualCustomers';

