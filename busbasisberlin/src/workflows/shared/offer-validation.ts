/**
 * shared/offer-validation.ts
 * Common validation logic shared across offer inventory workflows
 */

import type { Logger } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { resolveOfferService } from '../../types/services';

// Helper: Safe logger resolution
export const getLogger = (container: any): Logger => {
	try {
		return container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;
	} catch {
		return console as any;
	}
};

// Shared validation step for all offer inventory workflows
export const validateOfferStep = createStep(
	'validate-offer-for-inventory',
	async (input: { offer_id: string; operation: string }, { container }) => {
		const logger = getLogger(container);
		const offerService = resolveOfferService(container);

		// Get offer with full details
		const offer = await offerService.getOfferWithDetails(input.offer_id);
		if (!offer) {
			throw new Error(`Offer ${input.offer_id} not found`);
		}

		// Filter to only product items that have inventory requirements
		let productItems = offer.items.filter(
			item => item.item_type === 'product' && item.variant_id && item.sku,
		);

		// ✅ Filter out manual products (variants with manage_inventory: false)
		const variantIds = productItems
			.map(item => item.variant_id)
			.filter((variantId): variantId is string => Boolean(variantId));

		if (variantIds.length > 0) {
			try {
				const query = container.resolve('query');
				// Fetch variant data to check manage_inventory property
				const { data: variants } = await query.graph({
					entity: 'product_variant',
					fields: ['id', 'manage_inventory'],
					filters: { id: variantIds },
				});

				// Only include variants that manage inventory
				const inventoryManagedVariantIds = new Set(
					variants
						.filter((v: any) => v.manage_inventory !== false)
						.map((v: any) => v.id),
				);

				// Filter product items to only those with inventory-managed variants
				productItems = productItems.filter(item =>
					inventoryManagedVariantIds.has(item.variant_id!),
				);

				logger.info(
					`[OFFER-INVENTORY] ${input.operation}: Filtered ${variantIds.length} variants to ${inventoryManagedVariantIds.size} inventory-managed variants for offer ${offer.offer_number}`,
				);
			} catch (error) {
				logger.warn(
					`[OFFER-INVENTORY] Could not fetch variant data to check manage_inventory, checking all variants: ${error.message}`,
				);
				// Fallback: check all variants if we can't fetch variant data
			}
		}

		logger.info(
			`[OFFER-INVENTORY] ${input.operation}: Validated offer ${offer.offer_number} with ${productItems.length} inventory-managed product items`,
		);

		return new StepResponse({
			offer,
			productItems,
			offerNumber: offer.offer_number,
		});
	},
);
