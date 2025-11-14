// busbasisberlin/src/admin/routes/products/by-category/utils/variant-generation.ts
// Helper functions for generating variants from product options

import type { ProductOption, Variant } from '../components/ProductEditorModal';

/**
 * Calculate the cartesian product of multiple arrays
 * Example: [[1,2], [3,4]] => [[1,3], [1,4], [2,3], [2,4]]
 */
export function calculateCartesianProduct(arrays: string[][]): string[][] {
	if (arrays.length === 0) return [[]];
	if (arrays.length === 1) return arrays[0].map(item => [item]);

	const [first, ...rest] = arrays;
	const restProduct = calculateCartesianProduct(rest);

	const result: string[][] = [];
	for (const item of first) {
		for (const combination of restProduct) {
			result.push([item, ...combination]);
		}
	}

	return result;
}

/**
 * Generate variant title from option values
 * Example: ["rot", "m"] => "rot / m"
 */
export function generateVariantTitle(optionValues: string[]): string {
	return optionValues.join(' / ');
}

/**
 * Generate variants from product options using cartesian product
 */
export function generateVariantsFromOptions(
	options: ProductOption[],
): Variant[] {
	if (!options || options.length === 0) {
		return [];
	}

	// Filter out options with no values
	const validOptions = options.filter(
		option => option.values && option.values.length > 0,
	);

	if (validOptions.length === 0) {
		return [];
	}

	// Get all option value arrays
	const optionValueArrays = validOptions.map(option =>
		option.values.map(v => v.trim()).filter(v => v.length > 0),
	);

	// Calculate cartesian product
	const combinations = calculateCartesianProduct(optionValueArrays);

	// Generate variants from combinations
	const variants: Variant[] = combinations.map(combination => {
		const title = generateVariantTitle(combination);
		return {
			title,
			sku: '',
			manage_inventory: false,
			allow_backorder: false,
			price_eur: 0,
			price_europe: 0,
			enabled: true, // Default to enabled
			option_values: combination,
		};
	});

	return variants;
}
