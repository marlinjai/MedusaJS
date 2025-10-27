'use client';

import { useCallback } from 'react';
import SortProducts, { SortOptions } from './sort-products';

type RefinementListProps = {
	sortBy: SortOptions;
	'data-testid'?: string;
};

const RefinementList = ({
	sortBy,
	'data-testid': dataTestId,
}: RefinementListProps) => {
	const setQueryParams = useCallback((name: string, value: SortOptions) => {
		const url = new URL(window.location.href);
		url.searchParams.set(name, value);
		window.location.href = url.toString();
	}, []);

	return (
		<SortProducts
			sortBy={sortBy}
			setQueryParams={setQueryParams}
			data-testid={dataTestId}
		/>
	);
};

export default RefinementList;
