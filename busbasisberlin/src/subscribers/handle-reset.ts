// src/subscribers/handle-reset.ts
import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';

export default async function resetPasswordTokenHandler({
	event: {
		data: { entity_id: email, token, actor_type },
	},
	container,
}: SubscriberArgs<{ entity_id: string; token: string; actor_type: string }>) {
	const notificationModuleService = container.resolve(Modules.NOTIFICATION);

	// Bestimme die korrekte Frontend-URL basierend auf dem Actor-Type
	const urlPrefix =
		actor_type === 'customer'
			? process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000'
			: process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';

	// Für Customer verwenden wir die deutsche Storefront URL
	// Für Admin verwenden wir die öffentliche API-Route (nicht durch Admin-Middleware geschützt)
	const resetUrl =
		actor_type === 'customer'
			? `${urlPrefix}/de/reset-password?token=${token}&email=${encodeURIComponent(email)}`
			: `${urlPrefix}/admin-password-reset?token=${token}&email=${encodeURIComponent(email)}`;

	// Verwende unterschiedliche Templates für Admin und Customer
	const template =
		actor_type === 'customer' ? 'password-reset' : 'admin-password-reset';

	await notificationModuleService.createNotifications({
		to: email,
		channel: 'email',
		template: template,
		data: {
			url: resetUrl,
			email: email,
		},
	});
}

export const config: SubscriberConfig = {
	event: 'auth.password_reset',
};
