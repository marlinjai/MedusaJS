/**
 * offer-status-changed.ts
 * Subscriber for offer status change events
 */
import type { SubscriberConfig } from '@medusajs/framework';
import { handleOfferStatusChanged } from './offer-events';

// Re-export the handler function
export default handleOfferStatusChanged;

export const config: SubscriberConfig = {
	event: 'offer.status_changed',
};
