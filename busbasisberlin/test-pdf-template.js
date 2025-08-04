/**
 * Test the actual HTML template from our PDF generator
 */

const puppeteer = require('puppeteer');

// Copy the helper functions from pdf-generator.ts
function getStatusText(status) {
	const statusMap = {
		draft: 'Entwurf',
		active: 'Aktiv',
		accepted: 'Angenommen',
		cancelled: 'Storniert',
		completed: 'Abgeschlossen',
	};
	return statusMap[status] || status;
}

function formatCurrency(amountInCents) {
	return new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currency: 'EUR',
	}).format(amountInCents / 100);
}

function calculateItemTotal(item) {
	const unitPrice = item.unit_price || 0;
	const quantity = item.quantity || 1;
	const discount = item.discount_percentage || 0;

	const subtotal = unitPrice * quantity;
	const discountAmount = (subtotal * discount) / 100;
	return subtotal - discountAmount;
}

function calculateOfferTotals(offer) {
	const items = offer.items || [];

	const subtotal = items.reduce(
		(sum, item) => sum + calculateItemTotal(item),
		0,
	);
	const taxRate = 19; // German VAT
	const taxAmount = (subtotal * taxRate) / 100;
	const total = subtotal + taxAmount;

	return {
		subtotal: formatCurrency(subtotal),
		taxRate: `${taxRate}%`,
		taxAmount: formatCurrency(taxAmount),
		total: formatCurrency(total),
	};
}

// Copy the HTML template function
function getHTMLTemplate(data) {
	return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Angebot ${data.offer.number}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20mm;
                font-size: 12pt;
                line-height: 1.4;
                color: #333;
            }
            .header {
                border-bottom: 2px solid #333;
                padding-bottom: 10px;
                margin-bottom: 20px;
            }
            .company-info {
                float: left;
                width: 50%;
            }
            .offer-info {
                float: right;
                width: 40%;
                text-align: right;
            }
            .clear {
                clear: both;
            }
            .customer-section {
                margin: 20px 0;
                padding: 15px;
                background-color: #f9f9f9;
                border-left: 4px solid #333;
            }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }
            .items-table th,
            .items-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            .items-table th {
                background-color: #f2f2f2;
                font-weight: bold;
            }
            .totals-section {
                margin-top: 20px;
                text-align: right;
            }
            .total-row {
                font-weight: bold;
                font-size: 14pt;
            }
            .notes-section {
                margin-top: 30px;
                padding: 15px;
                background-color: #f9f9f9;
            }
            .footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #ddd;
                font-size: 10pt;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-info">
                <h1>${data.company.name}</h1>
                <p>${data.company.address}<br>
                ${data.company.postalCode} ${data.company.city}<br>
                Email: ${data.company.email}</p>
            </div>
            <div class="offer-info">
                <h2>Angebot</h2>
                <p><strong>Angebotsnummer:</strong> ${data.offer.number}<br>
                <strong>Datum:</strong> ${data.offer.date}<br>
                <strong>Status:</strong> ${data.offer.status}</p>
                ${data.offer.validUntil ? `<p><strong>Gültig bis:</strong> ${data.offer.validUntil}</p>` : ''}
            </div>
            <div class="clear"></div>
        </div>

        <div class="customer-section">
            <h3>Kunde</h3>
            <p><strong>Name:</strong> ${data.customer.name}<br>
            <strong>Email:</strong> ${data.customer.email}<br>
            ${data.customer.phone ? `<strong>Telefon:</strong> ${data.customer.phone}<br>` : ''}
            ${data.customer.address ? `<strong>Adresse:</strong> ${data.customer.address}` : ''}</p>
        </div>

        <h3>Angebotspositionen</h3>
        <table class="items-table">
            <thead>
                <tr>
                    <th>Pos.</th>
                    <th>Bezeichnung</th>
                    <th>Beschreibung</th>
                    <th>Menge</th>
                    <th>Einheit</th>
                    <th>Einzelpreis</th>
                    <th>Rabatt</th>
                    <th>Gesamtpreis</th>
                </tr>
            </thead>
            <tbody>
                ${data.items
									.map(
										item => `
                    <tr>
                        <td>${item.position}</td>
                        <td>${item.title}</td>
                        <td>${item.description || ''}</td>
                        <td>${item.quantity}</td>
                        <td>${item.unit}</td>
                        <td>${item.unitPrice}</td>
                        <td>${item.discount}%</td>
                        <td>${item.totalPrice}</td>
                    </tr>
                `,
									)
									.join('')}
            </tbody>
        </table>

        <div class="totals-section">
            <p><strong>Zwischensumme:</strong> ${data.totals.subtotal}</p>
            <p><strong>MwSt. (${data.totals.taxRate}):</strong> ${data.totals.taxAmount}</p>
            <p class="total-row"><strong>Gesamtbetrag:</strong> ${data.totals.total}</p>
        </div>

        ${
					data.notes.internal || data.notes.customer
						? `
        <div class="notes-section">
            <h3>Anmerkungen</h3>
            ${data.notes.internal ? `<p><strong>Interne Notizen:</strong> ${data.notes.internal}</p>` : ''}
            ${data.notes.customer ? `<p><strong>Kundennotizen:</strong> ${data.notes.customer}</p>` : ''}
        </div>
        `
						: ''
				}

        <div class="footer">
            <p>Generiert am: ${data.generatedAt}</p>
        </div>
    </body>
    </html>
    `;
}

async function testPdfTemplate() {
	console.log('Testing PDF template generation...');

	// Create mock offer data
	const mockOffer = {
		offer_number: 'TEST-001',
		created_at: new Date().toISOString(),
		valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
		status: 'active',
		description: 'Test Angebot',
		customer_name: 'Test Kunde',
		customer_email: 'test@example.com',
		customer_phone: '+49 123 456789',
		customer_address: 'Teststraße 123, 12345 Berlin',
		items: [
			{
				title: 'Test Produkt 1',
				description: 'Beschreibung für Test Produkt 1',
				quantity: 2,
				unit: 'STK',
				unit_price: 5000, // 50.00 EUR
				discount_percentage: 10,
				tax_rate: 19,
			},
			{
				title: 'Test Produkt 2',
				description: 'Beschreibung für Test Produkt 2',
				quantity: 1,
				unit: 'STK',
				unit_price: 7500, // 75.00 EUR
				discount_percentage: 0,
				tax_rate: 19,
			},
		],
		internal_notes: 'Interne Test Notizen',
		customer_notes: 'Kunden Test Notizen',
	};

	// Prepare template data
	const templateData = {
		company: {
			name: process.env.COMPANY_NAME || 'Basis Camp Berlin GmbH',
			address: process.env.COMPANY_ADDRESS || 'Hauptstrasse 51',
			postalCode: process.env.COMPANY_POSTAL_CODE || '16547',
			city: process.env.COMPANY_CITY || 'Birkenwerder',
			email: process.env.COMPANY_EMAIL || 'info@basiscampberlin.de',
		},
		offer: {
			number: mockOffer.offer_number,
			date: new Date(mockOffer.created_at).toLocaleDateString('de-DE'),
			validUntil: mockOffer.valid_until
				? new Date(mockOffer.valid_until).toLocaleDateString('de-DE')
				: null,
			status: getStatusText(mockOffer.status),
			description: mockOffer.description || 'Angebot',
		},
		customer: {
			name: mockOffer.customer_name,
			email: mockOffer.customer_email,
			phone: mockOffer.customer_phone,
			address: mockOffer.customer_address,
		},
		items: mockOffer.items.map((item, index) => ({
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
		totals: calculateOfferTotals(mockOffer),
		notes: {
			internal: mockOffer.internal_notes,
			customer: mockOffer.customer_notes,
		},
		generatedAt: new Date().toLocaleString('de-DE'),
	};

	console.log('Template data prepared');

	// Generate HTML
	const html = getHTMLTemplate(templateData);
	console.log('HTML generated, length:', html.length);

	// Test with Puppeteer
	let browser;
	try {
		console.log('Launching browser...');
		browser = await puppeteer.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--no-first-run',
				'--no-zygote',
				'--single-process',
				'--disable-web-security',
				'--disable-features=VizDisplayCompositor',
			],
			ignoreDefaultArgs: ['--disable-extensions'],
		});
		console.log('Browser launched successfully');

		const page = await browser.newPage();
		console.log('Page created');

		console.log('Setting HTML content...');
		await page.setContent(html, { waitUntil: 'networkidle0' });
		console.log('Content set successfully');

		console.log('Generating PDF...');
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
		console.log('PDF generated, size:', pdfBuffer.length, 'bytes');

		// Save to file
		const fs = require('fs');
		fs.writeFileSync('test-pdf-template.pdf', pdfBuffer);
		console.log('PDF saved as test-pdf-template.pdf');

		console.log('✅ PDF template test successful!');
	} catch (error) {
		console.error('❌ PDF template test failed:', error);
		console.error('Error details:', {
			message: error.message,
			stack: error.stack,
			name: error.name,
		});
	} finally {
		if (browser) {
			await browser.close();
			console.log('Browser closed');
		}
	}
}

testPdfTemplate();
