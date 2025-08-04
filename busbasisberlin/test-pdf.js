/**
 * Simple test script to debug PDF generation
 */

const { generateOfferPdfBuffer } = require('./src/utils/pdf-generator.ts');

// Mock offer data
const mockOffer = {
	offer_number: 'TEST-001',
	created_at: new Date().toISOString(),
	valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
	status: 'active',
	description: 'Test Angebot',
	customer_name: 'Test Customer',
	customer_email: 'test@example.com',
	customer_phone: '+49 123 456789',
	customer_address: 'Test Street 123, 12345 Test City',
	internal_notes: 'Test internal notes',
	customer_notes: 'Test customer notes',
	items: [
		{
			title: 'Test Product',
			description: 'Test product description',
			quantity: 2,
			unit: 'STK',
			unit_price: 5000, // 50.00 EUR in cents
			discount_percentage: 10,
			tax_rate: 19,
		},
		{
			title: 'Test Service',
			description: 'Test service description',
			quantity: 1,
			unit: 'h',
			unit_price: 8000, // 80.00 EUR in cents
			discount_percentage: 0,
			tax_rate: 19,
		},
	],
};

async function testPdfGeneration() {
	try {
		console.log('Starting PDF generation test...');
		const pdfBuffer = await generateOfferPdfBuffer(mockOffer);
		console.log('PDF generated successfully!');
		console.log('PDF buffer size:', pdfBuffer.length, 'bytes');

		// Save to file for inspection
		const fs = require('fs');
		fs.writeFileSync('test-output.pdf', pdfBuffer);
		console.log('PDF saved as test-output.pdf');
	} catch (error) {
		console.error('PDF generation failed:', error);
		console.error('Stack trace:', error.stack);
	}
}

testPdfGeneration();
