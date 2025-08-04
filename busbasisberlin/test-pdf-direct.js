/**
 * Direct PDF generation test
 */

const puppeteer = require('puppeteer');
const handlebars = require('handlebars');

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

// Helper functions
function getStatusText(status) {
	const statusMap = {
		draft: 'Entwurf',
		active: 'Aktiv',
		accepted: 'Angenommen',
		completed: 'Abgeschlossen',
		cancelled: 'Storniert',
	};
	return statusMap[status] || status;
}

function formatCurrency(amountInCents) {
	const euros = amountInCents / 100;
	return new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currency: 'EUR',
	}).format(euros);
}

function calculateItemTotal(item) {
	const subtotal = item.unit_price * item.quantity;
	const discount = subtotal * ((item.discount_percentage || 0) / 100);
	return subtotal - discount;
}

function calculateOfferTotals(offer) {
	const subtotal = offer.items.reduce(
		(sum, item) => sum + calculateItemTotal(item),
		0,
	);

	// Calculate tax (German standard: gross total / 1.19 for net, then tax = gross - net)
	const grossTotal = subtotal;
	const netTotal = grossTotal / 1.19;
	const taxAmount = grossTotal - netTotal;

	return {
		subtotal: formatCurrency(netTotal),
		taxAmount: formatCurrency(taxAmount),
		total: formatCurrency(grossTotal),
		taxRate: 19,
	};
}

// Simple HTML template
function getHTMLTemplate(data) {
	const template = `
	<!DOCTYPE html>
	<html lang="de">
	<head>
		<meta charset="UTF-8">
		<title>Test PDF - {{offer.number}}</title>
		<style>
			body { font-family: Arial, sans-serif; margin: 20px; }
			.header { text-align: center; margin-bottom: 30px; }
			.company { font-weight: bold; font-size: 18px; }
			.offer-info { margin-bottom: 20px; }
			.items { margin-bottom: 20px; }
			.totals { text-align: right; }
		</style>
	</head>
	<body>
		<div class="header">
			<div class="company">{{company.name}}</div>
			<div>{{company.address}}</div>
			<div>{{company.postalCode}} {{company.city}}</div>
		</div>

		<div class="offer-info">
			<h1>{{offer.description}}</h1>
			<p><strong>Angebotsnummer:</strong> {{offer.number}}</p>
			<p><strong>Datum:</strong> {{offer.date}}</p>
			<p><strong>Status:</strong> {{offer.status}}</p>
		</div>

		<div class="customer">
			<h2>Kunde</h2>
			<p>{{customer.name}}</p>
			<p>{{customer.email}}</p>
			<p>{{customer.address}}</p>
		</div>

		<div class="items">
			<h2>Artikel</h2>
			{{#each items}}
			<div>
				<strong>{{title}}</strong> - {{quantity}} {{unit}} x {{unitPrice}} = {{totalPrice}}
			</div>
			{{/each}}
		</div>

		<div class="totals">
			<p><strong>Gesamtbetrag:</strong> {{totals.total}}</p>
		</div>
	</body>
	</html>
	`;

	const compiledTemplate = handlebars.compile(template);
	return compiledTemplate(data);
}

async function generatePDF(offer) {
	console.log('Starting PDF generation...');

	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});

	try {
		const page = await browser.newPage();
		await page.setViewport({ width: 794, height: 1123 });

		// Prepare template data
		const templateData = {
			company: {
				name: 'Basis Camp Berlin GmbH',
				address: 'Hauptstrasse 51',
				postalCode: '16547',
				city: 'Birkenwerder',
				email: 'info@basiscampberlin.de',
			},
			offer: {
				number: offer.offer_number,
				date: new Date(offer.created_at).toLocaleDateString('de-DE'),
				validUntil: offer.valid_until
					? new Date(offer.valid_until).toLocaleDateString('de-DE')
					: null,
				status: getStatusText(offer.status),
				description: offer.description || 'Angebot',
			},
			customer: {
				name: offer.customer_name,
				email: offer.customer_email,
				phone: offer.customer_phone,
				address: offer.customer_address,
			},
			items: offer.items.map((item, index) => ({
				position: index + 1,
				title: item.title,
				description: item.description,
				quantity: item.quantity,
				unit: item.unit || 'STK',
				unitPrice: formatCurrency(item.unit_price),
				discount: item.discount_percentage || 0,
				totalPrice: formatCurrency(calculateItemTotal(item)),
				taxRate: item.tax_rate || 19,
			})),
			totals: calculateOfferTotals(offer),
		};

		console.log('Template data prepared');

		// Generate HTML
		const html = getHTMLTemplate(templateData);
		console.log('HTML generated, length:', html.length);

		// Set content
		await page.setContent(html, { waitUntil: 'networkidle0' });
		console.log('Page content set');

		// Generate PDF
		const pdfBuffer = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: {
				top: '20mm',
				right: '20mm',
				bottom: '20mm',
				left: '20mm',
			},
		});

		console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
		return pdfBuffer;
	} finally {
		await browser.close();
	}
}

async function testPDFGeneration() {
	try {
		console.log('Testing PDF generation...');
		const pdfBuffer = await generatePDF(mockOffer);

		// Save to file
		const fs = require('fs');
		fs.writeFileSync('test-direct.pdf', pdfBuffer);
		console.log('PDF saved as test-direct.pdf');

		// Test S3 upload
		console.log('Testing S3 upload of PDF...');
		const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

		const s3Client = new S3Client({
			region: 'eu-central-1',
			endpoint: 'https://vnlpncljwdhvvftrecuk.supabase.co/storage/v1/s3',
			credentials: {
				accessKeyId: '8c1b0dd0fafad92e095da63f07d2f8f2',
				secretAccessKey:
					'41147a21e3c3ee852e1986ee7efce2d7f1212fe23a6ef3c233d07a2842194242',
			},
			forcePathStyle: true,
		});

		const uploadCommand = new PutObjectCommand({
			Bucket: 'busbasisberlin',
			Key: 'test-pdf-direct.pdf',
			Body: pdfBuffer,
			ContentType: 'application/pdf',
		});

		const uploadResult = await s3Client.send(uploadCommand);
		console.log('PDF uploaded to S3:', uploadResult);

		const publicUrl =
			'https://vnlpncljwdhvvftrecuk.supabase.co/storage/v1/object/public/busbasisberlin/test-pdf-direct.pdf';
		console.log('Public URL:', publicUrl);
	} catch (error) {
		console.error('PDF generation failed:', error);
		console.error('Error details:', {
			message: error.message,
			stack: error.stack,
			name: error.name,
		});
	}
}

testPDFGeneration();
