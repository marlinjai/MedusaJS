/**
 * index.ts
 * Offer module index - exports all models and service for MedusaJS integration
 */
import { Module } from '@medusajs/framework/utils';

import OfferService from './service';

export const OFFER_MODULE = 'offer';

export default Module(OFFER_MODULE, {
	service: OfferService,
});
