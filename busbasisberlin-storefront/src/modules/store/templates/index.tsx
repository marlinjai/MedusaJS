import StoreSearch from '@modules/store/components/store-search';
import SkeletonStoreLayout from '@modules/store/components/store-search/skeleton-store-layout';

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
	return (
		<>
			{/* Server-side skeleton that renders immediately in HTML */}
			<div id="store-skeleton" className="store-skeleton-wrapper">
				<SkeletonStoreLayout />
			</div>
			{/* Client component that will replace skeleton after hydration */}
			<div id="store-content" className="store-content-wrapper" style={{ display: 'none' }}>
				<StoreSearch />
			</div>
		</>
	);
};

export default StoreTemplate;
