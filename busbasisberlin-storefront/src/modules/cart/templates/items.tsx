import repeat from '@lib/util/repeat';
import { HttpTypes } from '@medusajs/types';
import { Heading, Table } from '@medusajs/ui';

import Item from '@modules/cart/components/item';
import SkeletonLineItem from '@modules/skeletons/components/skeleton-line-item';
import { useTranslations } from 'next-intl';

type ItemsTemplateProps = {
	cart?: HttpTypes.StoreCart;
};

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
	const t = useTranslations('cart');
	const items = cart?.items;
	return (
		<div className="bg-stone-950 rounded-xl p-6">
			<div className="pb-5 flex items-center">
				<Heading className="text-3xl font-bold text-gray-100">
					{t('title')}
				</Heading>
			</div>
			<Table>
				<Table.Header className="border-t-0 border-b border-gray-700">
					<Table.Row className="text-gray-400 txt-medium-plus">
						<Table.HeaderCell className="pl-6 py-5 text-gray-300 font-semibold">
							{t('tableHeaders.item')}
						</Table.HeaderCell>
						<Table.HeaderCell className="px-6"></Table.HeaderCell>
						<Table.HeaderCell className="py-5 px-6 text-gray-300 font-semibold">
							{t('tableHeaders.quantity')}
						</Table.HeaderCell>
						<Table.HeaderCell className="hidden small:table-cell py-5 px-6 text-gray-300 font-semibold">
							{t('tableHeaders.price')}
						</Table.HeaderCell>
						<Table.HeaderCell className="pr-6 py-5 pl-6 text-right text-gray-300 font-semibold">
							{t('tableHeaders.total')}
						</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{items
						? items
								.sort((a, b) => {
									return (a.created_at ?? '') > (b.created_at ?? '') ? -1 : 1;
								})
								.map(item => {
									return (
										<Item
											key={item.id}
											item={item}
											currencyCode={cart?.currency_code}
										/>
									);
								})
						: repeat(5).map(i => {
								return <SkeletonLineItem key={i} />;
						  })}
				</Table.Body>
			</Table>
		</div>
	);
};

export default ItemsTemplate;
