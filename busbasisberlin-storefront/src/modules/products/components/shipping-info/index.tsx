// shipping-info/index.tsx
// Displays shipping time information based on shipping profile and stock status

'use client';

import { FiTruck } from 'react-icons/fi';

type ShippingInfoProps = {
	shippingProfile?: any;
	isBackorder?: boolean;
};

export default function ShippingInfo({
	shippingProfile,
	isBackorder = false,
}: ShippingInfoProps) {
	const profileName = shippingProfile?.name?.toLowerCase() || '';

	// Check for "on request" products - handled by OnRequestProduct component
	const isOnRequest =
		profileName.includes('artikel auf anfrage') ||
		profileName.includes('auf anfrage') ||
		profileName.includes('on request') ||
		shippingProfile?.id === 'artikel-auf-anfrage';

	// Check for oversized/special shipping (Sperrgut) - handled by QuoteRequest component
	const isOversized =
		profileName.includes('sperrgut') ||
		profileName.includes('speergut') ||
		shippingProfile?.type === 'oversized';

	// Don't show shipping info for on-request or oversized items
	if (isOnRequest || isOversized) {
		return null;
	}

	// Check for extended delivery time
	const hasExtendedShipping =
		profileName.includes('längere lieferzeit') ||
		profileName.includes('langere lieferzeit') ||
		isBackorder;

	const deliveryDays = hasExtendedShipping ? '3-9' : '2-6';
	const deliveryMessage = hasExtendedShipping
		? 'Lieferzeit: 3-9 Werktag3e'
		: 'Lieferzeit: 2-6 Werktage';

	return (
		<div className="border-t border-border pt-4 mt-4">
			<div className="flex items-center gap-2 text-sm">
				<FiTruck
					className={`w-5 h-5 ${
						hasExtendedShipping ? 'text-orange-600' : 'text-green-600'
					}`}
				/>
				<span className="font-medium text-foreground">Versand:</span>
				<span
					className={`font-semibold ${
						hasExtendedShipping ? 'text-orange-600' : 'text-green-600'
					}`}
				>
					{deliveryMessage}
				</span>
			</div>
			{hasExtendedShipping && (
				<p className="text-xs text-muted-foreground mt-2 ml-7">
					Längere Lieferzeit aufgrund von Sonderbestellung oder begrenzter
					Verfügbarkeit
				</p>
			)}
		</div>
	);
}
