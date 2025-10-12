// src/modules/store/components/filter-wrapper/index.tsx
import SimpleFilters from '../simple-filters';

type FilterWrapperProps = {
	sortBy: string;
	countryCode: string;
	searchQuery?: string;
	stockFilter?: string;
};

// Step 1: Just get basic filtering working - no categories yet
export default function FilterWrapper({
	sortBy,
	countryCode,
	searchQuery,
	stockFilter,
}: FilterWrapperProps) {
	return <SimpleFilters sortBy={sortBy} countryCode={countryCode} />;
}
