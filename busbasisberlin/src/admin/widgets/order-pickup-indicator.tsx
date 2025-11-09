// busbasisberlin/src/admin/widgets/order-pickup-indicator.tsx
// Widget to display visual indicators for pickup orders with manual payment

import { Badge, Container } from '@medusajs/ui';
import {
	defineWidgetConfig
} from '@medusajs/admin-sdk';
import { PackageCheck, Banknote, AlertCircle } from 'lucide-react';

// Widget shown on order detail pages
const OrderPickupIndicatorWidget = ({
	data: order
}: {
	data: any
}) => {
	if (!order) return null;

	// Check if this is a pickup order
	const shippingMethod = order.shipping_methods?.[0];
	const isPickupOrder = shippingMethod?.shipping_option?.name?.toLowerCase().includes('abholung') ||
		shippingMethod?.shipping_option?.name?.toLowerCase().includes('pickup');

	// Check if manual payment is used
	const payment = order.payment_collections?.[0]?.payments?.[0];
	const isManualPayment = payment?.provider_id === 'pp_system' ||
		payment?.provider_id === 'pp_system_default';

	// Only show widget if it's a pickup order with manual payment
	if (!isPickupOrder || !isManualPayment) return null;

	// Check payment status
	const paymentStatus = order.payment_status;
	const isAwaitingPayment = paymentStatus === 'awaiting' || paymentStatus === 'not_paid';

	return (
		<Container className="mb-4">
			<div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
				<div className="flex items-start gap-4">
					{/* Icon */}
					<div className="flex-shrink-0">
						<div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
							<PackageCheck className="w-6 h-6 text-orange-600" />
						</div>
					</div>

					{/* Content */}
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<h3 className="text-lg font-semibold text-gray-900">
								Lagerabholung mit Barzahlung
							</h3>
							{isAwaitingPayment && (
								<Badge color="red" size="small">
									<AlertCircle className="w-3 h-3 mr-1" />
									Zahlung ausstehend
								</Badge>
							)}
						</div>

						<div className="space-y-2 text-sm text-gray-700">
							<div className="flex items-center gap-2">
								<PackageCheck className="w-4 h-4 text-orange-600" />
								<span>
									<strong>Versandart:</strong> Abholung am Lager
								</span>
							</div>
							<div className="flex items-center gap-2">
								<Banknote className="w-4 h-4 text-orange-600" />
								<span>
									<strong>Zahlungsart:</strong> Barzahlung bei Abholung
								</span>
							</div>
						</div>

						{isAwaitingPayment && (
							<div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
								<p className="text-sm text-yellow-800">
									<strong>⚠️ Wichtig:</strong> Zahlung muss bei Abholung bar entgegen genommen werden.
									Bitte Zahlung im System erfassen nach erfolgreicher Abholung.
								</p>
							</div>
						)}
					</div>

					{/* Badges */}
					<div className="flex-shrink-0 flex flex-col gap-2">
						<Badge color="orange" size="small">
							<PackageCheck className="w-3 h-3 mr-1" />
							Abholung
						</Badge>
						<Badge color="purple" size="small">
							<Banknote className="w-3 h-3 mr-1" />
							Bar
						</Badge>
					</div>
				</div>
			</div>
		</Container>
	);
};

// Configure widget to show on order detail pages
export const config = defineWidgetConfig({
	zone: 'order.details.before',
});

export default OrderPickupIndicatorWidget;

