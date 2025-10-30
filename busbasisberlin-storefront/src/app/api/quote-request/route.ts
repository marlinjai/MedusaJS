// api/quote-request/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { product, customer } = body;

		// TODO: Integrate with your email service (Resend, SendGrid, etc.)
		// For now, we'll log the quote request
		console.log('Quote Request Received:', {
			product: {
				id: product.id,
				title: product.title,
				handle: product.handle,
				variantId: product.variantId,
			},
			customer: {
				name: customer.name,
				email: customer.email,
				phone: customer.phone,
				address: `${customer.address}, ${customer.postalCode} ${customer.city}`,
				message: customer.message,
			},
			timestamp: new Date().toISOString(),
		});

		// TODO: Send email notification to admin
		// Example using Resend (you have this module in your backend):
		// await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/admin/resend/quote-request`, {
		//   method: 'POST',
		//   headers: {
		//     'Content-Type': 'application/json',
		//   },
		//   body: JSON.stringify({ product, customer }),
		// });

		// TODO: Optionally create a draft order or save to database

		return NextResponse.json(
			{
				success: true,
				message: 'Quote request received successfully',
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Quote request error:', error);
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to process quote request',
			},
			{ status: 500 }
		);
	}
}

