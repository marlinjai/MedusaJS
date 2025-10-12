// src/app/api/categories/route.ts
import { getCategoriesWithProducts } from '@lib/data/categories';
import { NextResponse } from 'next/server';

export async function GET() {
	try {
		// Only return categories that actually have products
		const categories = await getCategoriesWithProducts();

		return NextResponse.json({
			categories: categories.slice(0, 50), // Limit to 50 categories for performance
		});
	} catch (error) {
		console.error('Error fetching categories:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch categories', categories: [] },
			{ status: 500 },
		);
	}
}
