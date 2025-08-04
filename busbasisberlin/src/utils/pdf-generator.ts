/**
 * pdf-generator.ts
 * Centralized PDF generation utility for offers
 * German DIN 5008 compliant business document formatting
 */

import * as handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';

/**
 * Generate PDF buffer from offer data using German business standards
 */
export async function generateOfferPdfBuffer(offer: any): Promise<Uint8Array> {
	console.log(
		'[PDF-GENERATOR] Starting PDF generation for offer:',
		offer?.offer_number,
	);
	console.log(
		'[PDF-GENERATOR] Offer data structure:',
		JSON.stringify(offer, null, 2),
	);

	let browser;
	try {
		console.log('[PDF-GENERATOR] Launching Puppeteer browser...');
		browser = await puppeteer.launch({
			headless: true, // Use headless mode
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
		console.log('[PDF-GENERATOR] Browser launched successfully');
	} catch (error) {
		console.error('[PDF-GENERATOR] Failed to launch browser:', error);
		throw new Error(`Failed to launch Puppeteer browser: ${error.message}`);
	}

	try {
		const page = await browser.newPage();

		// Set page format for German A4 standard
		await page.setViewport({ width: 794, height: 1123 }); // A4 at 96 DPI

		// Prepare data for template
		console.log('[PDF-GENERATOR] Preparing template data...');
		const templateData = {
			// Company information from environment variables
			company: {
				name: process.env.COMPANY_NAME || 'Your Company Name',
				address: process.env.COMPANY_ADDRESS || 'Your Company Address',
				postalCode: process.env.COMPANY_POSTAL_CODE || '12345',
				city: process.env.COMPANY_CITY || 'Your City',
				email: process.env.COMPANY_EMAIL || 'info@yourcompany.com',
			},

			// Offer information
			offer: {
				number: offer.offer_number,
				date: new Date(offer.created_at).toLocaleDateString('de-DE'),
				validUntil: offer.valid_until
					? new Date(offer.valid_until).toLocaleDateString('de-DE')
					: null,
				status: getStatusText(offer.status),
				description: offer.description || 'Angebot',
			},

			// Customer information
			customer: {
				name: offer.customer_name,
				email: offer.customer_email,
				phone: offer.customer_phone,
				address: offer.customer_address,
			},

			// Items with German formatting
			items: (offer.items || []).map((item: any, index: number) => ({
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

			// Totals with German tax calculation
			totals: calculateOfferTotals(offer || { items: [] }),

			// Additional information
			notes: {
				internal: offer.internal_notes,
				customer: offer.customer_notes,
			},

			// Generation metadata
			generatedAt: new Date().toLocaleString('de-DE'),
		};

		// Generate HTML from template
		console.log('[PDF-GENERATOR] Generating HTML template...');
		console.log(
			'[PDF-GENERATOR] Template data:',
			JSON.stringify(templateData, null, 2),
		);
		const html = getHTMLTemplate(templateData);
		console.log(
			'[PDF-GENERATOR] HTML template generated, length:',
			html.length,
		);

		// Set content and wait for fonts/images to load
		console.log('[PDF-GENERATOR] Setting page content...');
		await page.setContent(html, { waitUntil: 'networkidle0' });
		console.log('[PDF-GENERATOR] Page content set successfully');

		// Generate PDF with German business standards
		console.log('[PDF-GENERATOR] Generating PDF...');
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
		console.log(
			'[PDF-GENERATOR] PDF generated successfully, size:',
			pdfBuffer.length,
			'bytes',
		);

		return pdfBuffer;
	} catch (error) {
		console.error('[PDF-GENERATOR] Error during PDF generation:', error);
		throw error;
	} finally {
		if (browser) {
			console.log('[PDF-GENERATOR] Closing browser...');
			await browser.close();
		}
	}
}

/**
 * German-compliant HTML template for offers
 * Follows DIN 5008 standards for business correspondence
 */
function getHTMLTemplate(data: any): string {
	const template = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Angebot {{offer.number}}</title>
      <style>
        /* German Business Document Styles - DIN 5008 Compliant */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #333;
          background: white;
        }

        .document {
          max-width: 210mm;
          margin: 0 auto;
          padding: 0;
        }

        /* Header with company information */
        .header {
          margin-bottom: 30mm;
          position: relative;
        }

        .logo-section {
          margin-bottom: 20mm;
        }

        .logo {
          width: 150px;
          height: auto;
          margin-bottom: 10mm;
        }

        .company-info {
          font-size: 10pt;
          line-height: 1.3;
        }

        .company-name {
          font-weight: bold;
          font-size: 14pt;
          margin-bottom: 2mm;
        }

        /* Customer address block - DIN 5008 position */
        .address-block {
          position: absolute;
          right: 0;
          top: 0;
          width: 85mm;
          min-height: 40mm;
          border: 1px solid #ddd;
          padding: 5mm;
        }

        .address-window {
          font-size: 9pt;
          line-height: 1.2;
        }

        .return-address {
          font-size: 8pt;
          color: #666;
          border-bottom: 1px solid #ddd;
          padding-bottom: 2mm;
          margin-bottom: 3mm;
        }

        .customer-address {
          font-weight: bold;
        }

        /* Document metadata */
        .document-info {
          margin-bottom: 15mm;
          display: flex;
          justify-content: space-between;
        }

        .info-left, .info-right {
          flex: 1;
        }

        .info-right {
          text-align: right;
        }

        .document-title {
          font-size: 18pt;
          font-weight: bold;
          margin-bottom: 10mm;
          color: #2c5aa0;
        }

        /* Items table */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15mm;
          font-size: 10pt;
        }

        .items-table th {
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          padding: 3mm;
          text-align: left;
          font-weight: bold;
        }

        .items-table td {
          border: 1px solid #ddd;
          padding: 3mm;
          vertical-align: top;
        }

         .items-table .text-right {
           text-align: right;
         }

         .items-table .text-center {
           text-align: center;
         }

         .item-description {
           font-size: 9pt;
           color: #666;
           line-height: 1.3;
           margin-top: 1mm;
         }

        /* Totals section - German tax display */
        .totals-section {
          float: right;
          width: 60mm;
          margin-bottom: 15mm;
        }

        .totals-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
        }

        .totals-table td {
          padding: 2mm 3mm;
          border-bottom: 1px solid #eee;
        }

        .totals-table .label {
          text-align: left;
        }

        .totals-table .amount {
          text-align: right;
          font-weight: bold;
        }

        .total-final {
          border-top: 2px solid #333;
          font-weight: bold;
          font-size: 11pt;
        }

        /* Notes section */
        .notes {
          clear: both;
          margin-top: 15mm;
          font-size: 10pt;
        }

        .note-section {
          margin-bottom: 10mm;
        }

        .note-title {
          font-weight: bold;
          margin-bottom: 2mm;
        }

        /* Footer */
        .footer {
          margin-top: 20mm;
          font-size: 9pt;
          color: #666;
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 5mm;
        }

        /* German formatting helpers */
        .currency {
          font-family: 'Courier New', monospace;
        }

        .status-badge {
          background-color: #e1f5fe;
          color: #0277bd;
          padding: 1mm 3mm;
          border-radius: 2mm;
          font-size: 9pt;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="document">
        <!-- Header Section -->
        <div class="header">
          <div class="logo-section">
            <!-- Placeholder logo - replace with actual logo -->
            <div style="width: 150px; height: 60px; background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; border: 2px dashed #ccc; font-size: 10pt; color: #666;">
              LOGO HIER
            </div>

            <div class="company-info">
              <div class="company-name">{{company.name}}</div>
              <div>{{company.address}}</div>
              <div>{{company.postalCode}} {{company.city}}</div>
              <div>{{company.email}}</div>
            </div>
          </div>

          <!-- Customer Address Block -->
          <div class="address-block">
            <div class="address-window">
              <div class="return-address">
                {{company.name}}, {{company.address}}, {{company.postalCode}} {{company.city}}
              </div>
              <div class="customer-address">
                {{customer.name}}<br>
                {{#if customer.email}}{{customer.email}}<br>{{/if}}
                {{#if customer.phone}}{{customer.phone}}<br>{{/if}}
                {{#if customer.address}}{{customer.address}}{{/if}}
              </div>
            </div>
          </div>
        </div>

        <!-- Document Information -->
        <div class="document-info">
          <div class="info-left">
            <strong>Angebotsnummer:</strong> {{offer.number}}<br>
            <strong>Datum:</strong> {{offer.date}}<br>
            {{#if offer.validUntil}}<strong>Gültig bis:</strong> {{offer.validUntil}}<br>{{/if}}
          </div>
          <div class="info-right">
            <span class="status-badge">{{offer.status}}</span>
          </div>
        </div>

        <h1 class="document-title">{{offer.description}}</h1>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 6%;">Pos.</th>
              <th style="width: 48%;">Artikel/Leistung</th>
              <th style="width: 7%;">Menge</th>
              <th style="width: 7%;">Einheit</th>
              <th style="width: 12%;">Einzelpreis</th>
              <th style="width: 6%;">Rabatt</th>
              <th style="width: 14%;">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {{#each items}}
            <tr>
              <td class="text-center">{{position}}</td>
              <td>
                <strong>{{title}}</strong>
                {{#if description}}<div class="item-description">{{description}}</div>{{/if}}
              </td>
              <td class="text-right">{{quantity}}</td>
              <td class="text-center">{{unit}}</td>
              <td class="text-right currency">{{unitPrice}}</td>
              <td class="text-right">{{#if discount}}{{discount}}%{{else}}-{{/if}}</td>
              <td class="text-right currency">{{totalPrice}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td class="label">Nettobetrag:</td>
              <td class="amount currency">{{totals.subtotal}}</td>
            </tr>
            <tr>
              <td class="label">MwSt. ({{totals.taxRate}}%):</td>
              <td class="amount currency">{{totals.taxAmount}}</td>
            </tr>
            <tr class="total-final">
              <td class="label">Gesamtbetrag:</td>
              <td class="amount currency">{{totals.total}}</td>
            </tr>
          </table>
        </div>

        <!-- Notes Section -->
        {{#if notes.customer}}
        <div class="notes">
          <div class="note-section">
            <div class="note-title">Kundenhinweise:</div>
            <div>{{notes.customer}}</div>
          </div>
        </div>
        {{/if}}

        <!-- Footer -->
        <div class="footer">
          <div>{{company.name}} | {{company.address}} | {{company.postalCode}} {{company.city}} | {{company.email}}</div>
          <div style="margin-top: 2mm;">Erstellt am {{generatedAt}}</div>
        </div>
      </div>
    </body>
    </html>
  `;

	// Compile and render template
	const compiledTemplate = handlebars.compile(template);
	return compiledTemplate(data);
}

/**
 * Helper functions for German formatting
 */

function getStatusText(status: string): string {
	const statusMap: { [key: string]: string } = {
		draft: 'Entwurf',
		active: 'Aktiv',
		accepted: 'Angenommen',
		completed: 'Abgeschlossen',
		cancelled: 'Storniert',
	};
	return statusMap[status] || status;
}

function formatCurrency(amountInCents: number): string {
	const euros = amountInCents / 100;
	return new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currency: 'EUR',
	}).format(euros);
}

function calculateItemTotal(item: any): number {
	const subtotal = item.unit_price * item.quantity;
	const discount = subtotal * ((item.discount_percentage || 0) / 100);
	return subtotal - discount;
}

function calculateOfferTotals(offer: any): any {
	const subtotal = offer.items.reduce(
		(sum: number, item: any) => sum + calculateItemTotal(item),
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
