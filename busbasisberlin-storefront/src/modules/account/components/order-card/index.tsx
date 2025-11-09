import { Button } from '@medusajs/ui';
import { useMemo } from 'react';

import { convertToLocale } from '@lib/util/money';
import { HttpTypes } from '@medusajs/types';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import Thumbnail from '@modules/products/components/thumbnail';
import { useTranslations } from 'next-intl';

type OrderCardProps = {
	order: HttpTypes.StoreOrder;
};

const OrderCard = ({ order }: OrderCardProps) => {
	const t = useTranslations('account.orders');
	const numberOfLines = useMemo(() => {
		return (
			order.items?.reduce((acc, item) => {
				return acc + item.quantity;
			}, 0) ?? 0
		);
	}, [order]);

	const numberOfProducts = useMemo(() => {
		return order.items?.length ?? 0;
	}, [order]);

	return (
		<div className="bg-card flex flex-col md:flex-row gap-4 p-4 rounded-lg border border-neutral-700" data-testid="order-card">
			{/* Product Images - Left Side */}
			<div className="flex gap-2 md:w-48 shrink-0">
				{order.items?.slice(0, 1).map(i => (
					<div key={i.id} className="w-full aspect-square" data-testid="order-item">
						<Thumbnail thumbnail={i.thumbnail} images={[]} size="full" />
					</div>
				))}
			</div>

			{/* Order Info - Right Side */}
			<div className="flex flex-col flex-1 gap-3">
				{/* Order Number & Date */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
					<div className="uppercase text-large-semi">
						#<span data-testid="order-display-id">{order.display_id}</span>
					</div>
					<span className="text-small-regular text-ui-fg-subtle" data-testid="order-created-at">
						{new Date(order.created_at).toLocaleDateString('de-DE', {
							day: '2-digit',
							month: 'short',
							year: 'numeric'
						})}
					</span>
				</div>

				{/* Order Details */}
				<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small-regular text-ui-fg-base">
					<span className="font-semibold" data-testid="order-amount">
						{convertToLocale({
							amount: order.total,
							currency_code: order.currency_code,
						})}
					</span>
					<span className="text-ui-fg-subtle">•</span>
					<span className="text-ui-fg-subtle">{`${numberOfLines} ${
						numberOfLines > 1 ? 'items' : 'item'
					}`}</span>
				</div>

				{/* Action Button */}
				<div className="flex justify-end mt-auto">
					<LocalizedClientLink href={`/account/orders/details/${order.id}`}>
						<Button data-testid="order-details-link" variant="secondary" size="small">
							{t('seeDetails')}
						</Button>
					</LocalizedClientLink>
				</div>
			</div>
		</div>
	);
};

export default OrderCard;
