'use client';

import Back from '@modules/common/icons/back';
import FastDelivery from '@modules/common/icons/fast-delivery';
import Refresh from '@modules/common/icons/refresh';

import { HttpTypes } from '@medusajs/types';
import Accordion from './accordion';

type ProductTabsProps = {
	product: HttpTypes.StoreProduct;
};

const ProductTabs = ({ product }: ProductTabsProps) => {
	const tabs = [
		{
			label: 'Produktinformationen',
			component: <ProductInfoTab product={product} />,
		},
		{
			label: 'Versand & Rückgabe',
			component: <ShippingInfoTab />,
		},
	];

	return (
		<div className="w-full">
			<Accordion type="multiple">
				{tabs.map((tab, i) => (
					<Accordion.Item
						key={i}
						title={tab.label}
						headingSize="medium"
						value={tab.label}
					>
						{tab.component}
					</Accordion.Item>
				))}
			</Accordion>
		</div>
	);
};

const ProductInfoTab = ({ product }: ProductTabsProps) => {
	return (
		<div className="text-small-regular py-8">
			<div className="grid grid-cols-2 gap-x-8">
				<div className="flex flex-col gap-y-4">
					<div>
						<span className="font-semibold">Material</span>
						<p>
							{product.material
								? typeof product.material === 'string'
									? product.material
									: JSON.stringify(product.material)
								: '-'}
						</p>
					</div>
					<div>
						<span className="font-semibold">Herkunftsland</span>
						<p>{product.origin_country ? product.origin_country : '-'}</p>
					</div>
					<div>
						<span className="font-semibold">Typ</span>
						<p>
							{product.type
								? typeof product.type === 'string'
									? product.type
									: product.type.value
								: '-'}
						</p>
					</div>
				</div>
				<div className="flex flex-col gap-y-4">
					<div>
						<span className="font-semibold">Gewicht</span>
						<p>{product.weight ? `${product.weight} g` : '-'}</p>
					</div>
					<div>
						<span className="font-semibold">Abmessungen</span>
						<p>
							{product.length && product.width && product.height
								? `${product.length}L x ${product.width}B x ${product.height}H`
								: '-'}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

const ShippingInfoTab = () => {
	return (
		<div className="text-small-regular py-8">
			<div className="grid grid-cols-1 gap-y-8">
				<div className="flex items-start gap-x-2">
					<FastDelivery />
					<div>
						<span className="font-semibold">Schnelle Lieferung</span>
						<p className="max-w-sm">
							Ihr Paket kommt in 3-5 Werktagen an Ihrer Abholstelle oder bequem
							zu Ihnen nach Hause an.
						</p>
					</div>
				</div>
				<div className="flex items-start gap-x-2">
					<Refresh />
					<div>
						<span className="font-semibold">Einfacher Umtausch</span>
						<p className="max-w-sm">
							Passt die Größe nicht ganz? Kein Problem - wir tauschen Ihr
							Produkt gegen ein neues um.
						</p>
					</div>
				</div>
				<div className="flex items-start gap-x-2">
					<Back />
					<div>
						<span className="font-semibold">Einfache Rückgabe</span>
						<p className="max-w-sm">
							Senden Sie Ihr Produkt einfach zurück und wir erstatten Ihnen das
							Geld. Keine Fragen gestellt – wir geben unser Bestes, um Ihre
							Rückgabe problemlos zu gestalten.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProductTabs;
