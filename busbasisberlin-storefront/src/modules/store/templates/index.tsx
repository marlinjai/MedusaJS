import StoreSearch from '@modules/store/components/store-search';

const StoreTemplate = ({
	sortBy,
	page,
	searchQuery,
	countryCode,
}: {
	sortBy?: string;
	page?: string;
	searchQuery?: string;
	countryCode: string;
}) => {
	return <StoreSearch />;
};

export default StoreTemplate;
