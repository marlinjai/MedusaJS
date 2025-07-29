// busbasisberlin/src/workflows/steps/send-notification.ts

import { INotificationModuleService } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

type SendNotificationStepInput = {
	to: string;
	channel: string;
	template: string;
	data?: Record<string, any>;
}[];

export const sendNotificationStep = createStep(
	'send-notification-step',
	async (input: SendNotificationStepInput, { container }) => {
		const notificationService: INotificationModuleService = container.resolve(
			Modules.NOTIFICATION,
		);

		const response = await notificationService.createNotifications(input);

		return new StepResponse(response);
	},
);
