// busbasisberlin/src/modules/resend/index.ts

import { Module } from '@medusajs/framework/utils';
import ResendNotificationProviderService from './service';

export const RESEND_MODULE = 'resend';

export default Module(RESEND_MODULE, {
	service: ResendNotificationProviderService,
});

export * from './service';
