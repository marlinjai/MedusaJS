/**
 * shared/offer-validation.ts
 * Common validation logic shared across offer inventory workflows
 */

import type { Logger } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { OFFER_MODULE } from '../../modules/offer';

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
		const offerService = container.resolve(OFFER_MODULE);

		// Get offer with full details
		const offer = await offerService.getOfferWithDetails(input.offer_id);
		if (!offer) {
			throw new Error(`Offer ${input.offer_id} not found`);
		}

		// Filter to only product items that have inventory requirements
		const productItems = offer.items.filter(
			item => item.item_type === 'product' && item.variant_id && item.sku,
		);

		logger.info(
			`[OFFER-INVENTORY] ${input.operation}: Validated offer ${offer.offer_number} with ${productItems.length} product items`,
		);

		return new StepResponse({
			offer,
			productItems,
			offerNumber: offer.offer_number,
		});
	},
);
