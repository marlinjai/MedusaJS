/**
 * sales-channel-helper.ts
 * Helper utility to get the correct sales channel ID dynamically
 * instead of using hardcoded values that may not exist
 */

/**
 * Get the first available sales channel ID from the system
 * This replaces hardcoded sales channel IDs with dynamic lookup
 * @param container - Medusa container for service resolution
 * @returns Promise<string> - The sales channel ID to use
 */
export async function getDefaultSalesChannelId(
	container: any,
): Promise<string> {
	try {
		const salesChannelService = container.resolve('salesChannelService');
		const salesChannels = await salesChannelService.listSalesChannels();

		if (salesChannels.length === 0) {
			throw new Error('No sales channels found in the system');
		}

		// Prefer 'Default Sales Channel' or 'Public Store' if they exist
		const preferredChannel = salesChannels.find(
			(sc: any) =>
				sc.name === 'Default Sales Channel' || sc.name === 'Public Store',
		);

		if (preferredChannel) {
			return preferredChannel.id;
		}

		// Otherwise, return the first available sales channel
		return salesChannels[0].id;
	} catch (error) {
		console.error('Error getting default sales channel:', error);
		// Fallback to the hardcoded ID as last resort
		return 'sc_01JZJSF2HKJ7N6NBWBXG9YVYE8';
	}
}

/**
 * Get the default sales channel ID using the query module
 * This is for use in API routes where we have access to the query service
 * @param query - Medusa query service
 * @returns Promise<string> - The sales channel ID to use
 */
export async function getDefaultSalesChannelIdFromQuery(
	query: any,
): Promise<string> {
	try {
		const { data: salesChannels } = await query.graph({
			entity: 'sales_channel',
			fields: ['id', 'name'],
			pagination: { take: 10, skip: 0 },
		});

		if (salesChannels.length === 0) {
			throw new Error('No sales channels found in the system');
		}

		// Prefer 'Default Sales Channel' or 'Public Store' if they exist
		const preferredChannel = salesChannels.find(
			(sc: any) =>
				sc.name === 'Default Sales Channel' || sc.name === 'Public Store',
		);

		if (preferredChannel) {
			return preferredChannel.id;
		}

		// Otherwise, return the first available sales channel
		return salesChannels[0].id;
	} catch (error) {
		console.error('Error getting default sales channel from query:', error);
		// Fallback to the hardcoded ID as last resort
		return 'sc_01JZJSF2HKJ7N6NBWBXG9YVYE8';
	}
}

/**
 * Get the internal operations sales channel ID using the query module
 * @param query - Medusa query service
 * @returns Promise<string | null> - The internal operations sales channel ID, or null if not found
 */
export async function getInternalOperationsSalesChannelId(
	query: any,
): Promise<string | null> {
	try {
		const { data: salesChannels } = await query.graph({
			entity: 'sales_channel',
			fields: ['id', 'name'],
			pagination: { take: 20, skip: 0 },
		});

		// Look for sales channel with "internal" in the name
		const internalChannel = salesChannels.find(
			(sc: any) =>
				sc.name.toLowerCase().includes('internal') ||
				sc.name.toLowerCase().includes('operation'),
		);

		return internalChannel ? internalChannel.id : null;
	} catch (error) {
		console.error('Error getting internal operations sales channel:', error);
		return null;
	}
}
