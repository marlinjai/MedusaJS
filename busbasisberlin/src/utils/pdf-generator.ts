/**
 * pdf-generator.ts
 * Centralized PDF generation utility for offers
 * German DIN 5008 compliant business document formatting
 */

import * as handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';

/**
 * Get terms and conditions URL - dynamically generated from STOREFRONT_URL
 * Falls back to PDF_TERMS_CONDITIONS env var if set, otherwise uses STOREFRONT_URL/terms
 */
function getTermsUrl(): string {
	const explicitUrl = process.env.PDF_TERMS_CONDITIONS;
	if (explicitUrl) {
		return explicitUrl;
	}
	const storefrontUrl =
		process.env.STOREFRONT_URL ||
		process.env.NEXT_PUBLIC_STOREFRONT_URL ||
		'https://www.basiscampberlin.de';
	// Ensure URL ends without trailing slash, then add /terms
	return `${storefrontUrl.replace(/\/$/, '')}/terms`;
}

/**
 * Get privacy policy URL - dynamically generated from STOREFRONT_URL
 * Falls back to PDF_PRIVACY_POLICY env var if set, otherwise uses STOREFRONT_URL/privacy
 */
function getPrivacyUrl(): string {
	const explicitUrl = process.env.PDF_PRIVACY_POLICY;
	if (explicitUrl) {
		return explicitUrl;
	}
	const storefrontUrl =
		process.env.STOREFRONT_URL ||
		process.env.NEXT_PUBLIC_STOREFRONT_URL ||
		'https://www.basiscampberlin.de';
	// Ensure URL ends without trailing slash, then add /privacy
	return `${storefrontUrl.replace(/\/$/, '')}/privacy`;
}

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
	let page;
	try {
		console.log('[PDF-GENERATOR] Launching Puppeteer browser...');

		// Determine Chromium executable path
		// Only set executablePath if explicitly configured (for Docker/production)
		// In local development, let Puppeteer use its default (bundled Chromium or system Chrome)
		const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

		if (executablePath) {
			console.log(
				`[PDF-GENERATOR] Using Chromium executable: ${executablePath}`,
			);
		} else {
			console.log(
				'[PDF-GENERATOR] Using default Puppeteer browser (no explicit executable path)',
			);
		}

		const launchOptions: any = {
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage', // Critical for Docker (uses /tmp instead of /dev/shm)
				'--disable-gpu',
				'--disable-software-rasterizer',
				'--disable-background-timer-throttling',
				'--disable-backgrounding-occluded-windows',
				'--disable-renderer-backgrounding',
				'--disable-features=TranslateUI',
				'--disable-features=VizDisplayCompositor',
				'--no-first-run',
				'--disable-web-security',
				'--disable-extensions',
				'--disable-default-apps',
				'--disable-sync',
			],
			ignoreDefaultArgs: ['--disable-extensions'],
			timeout: 30000, // 30 second timeout for browser launch
		};

		// Only set executablePath if explicitly configured (Docker/production)
		// On local macOS/Windows, let Puppeteer use its default browser
		if (executablePath) {
			launchOptions.executablePath = executablePath;
			// Only use --single-process in Docker/production (with explicit executable path)
			launchOptions.args.push('--single-process');
		}

		browser = await puppeteer.launch(launchOptions);

		// Small delay to ensure browser is fully initialized
		await new Promise(resolve => setTimeout(resolve, 500));
		console.log('[PDF-GENERATOR] Browser launched successfully');
	} catch (error) {
		console.error('[PDF-GENERATOR] Failed to launch browser:', error);
		console.error('[PDF-GENERATOR] Error details:', {
			message: error.message,
			stack: error.stack,
			executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'using default',
		});
		throw new Error(`Failed to launch Puppeteer browser: ${error.message}`);
	}

	try {
		// Check if browser is still connected before proceeding
		if (!browser.isConnected()) {
			throw new Error('Browser disconnected before page creation');
		}

		// Listen for browser disconnection
		browser.on('disconnected', () => {
			console.error('[PDF-GENERATOR] Browser disconnected unexpectedly');
		});

		page = await browser.newPage();

		// Set page format for German A4 standard
		// Use a larger viewport to ensure content fits
		await page.setViewport({ width: 1200, height: 1697 }); // A4 at 144 DPI for better rendering

		// Emulate print media to ensure print styles are applied
		await page.emulateMediaType('print');

		// Prepare data for template
		console.log('[PDF-GENERATOR] Preparing template data...');
		const templateData = {
			// Company information from environment variables
			company: {
				name: process.env.COMPANY_NAME || 'BasisCampBerlin GmbH',
				address: process.env.COMPANY_ADDRESS || 'Hauptstraße 51',
				postalCode: process.env.COMPANY_POSTAL_CODE || '16547',
				city: process.env.COMPANY_CITY || 'Birkenwerder',
				email: process.env.COMPANY_EMAIL || 'info@basiscampberlin.de',
				logoUrl:
					process.env.COMPANY_LOGO_URL || 'https://basiscampberlin.de/logo.png',
				phone: process.env.COMPANY_PHONE || '+49 3303 5365540',
				website:
					process.env.STOREFRONT_URL ||
					process.env.NEXT_PUBLIC_STOREFRONT_URL ||
					'https://www.basiscampberlin.de',
				supportEmail:
					process.env.COMPANY_SUPPORT_EMAIL || 'info@basiscampberlin.de',
				primaryColor: process.env.BRAND_PRIMARY_COLOR || '#2c5aa0',
				secondaryColor: process.env.BRAND_SECONDARY_COLOR || '#1e40af',
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

			// Items with German formatting (description removed for cleaner layout)
			items: (offer.items || []).map((item: any, index: number) => ({
				position: index + 1,
				title: item.title,
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

		// Verify HTML contains actual content (not just Handlebars placeholders)
		if (html.includes('{{') && !html.includes('Basis Camp Berlin')) {
			console.warn(
				'[PDF-GENERATOR] Warning: HTML may contain unrendered Handlebars placeholders',
			);
			// Log a sample of the HTML for debugging
			console.log(
				'[PDF-GENERATOR] HTML sample (first 500 chars):',
				html.substring(0, 500),
			);
		}

		// Set content and wait for DOM to be ready
		// Using 'load' to ensure all styles are applied
		console.log('[PDF-GENERATOR] Setting page content...');
		await page.setContent(html, {
			waitUntil: 'load',
			timeout: 30000,
		});
		console.log('[PDF-GENERATOR] Page content set successfully');

		// Wait for the document element to be present
		await page.waitForSelector('.document', { timeout: 10000 });
		console.log('[PDF-GENERATOR] Document element found');

		// Additional wait for styles to apply
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Wait for fonts to be loaded (critical for PDF rendering)
		await page.evaluateHandle(() => document.fonts.ready);
		console.log('[PDF-GENERATOR] Fonts loaded');

		// Wait for content to be fully rendered and CSS applied
		// This ensures all styles are calculated and content is visible
		try {
			await page.waitForFunction(
				() => {
					const doc = document.querySelector('.document');
					if (!doc) return false;
					const computedStyle = window.getComputedStyle(doc);
					// Check that element is visible and has content
					return (
						doc.textContent &&
						doc.textContent.trim().length > 0 &&
						computedStyle.display !== 'none' &&
						computedStyle.visibility !== 'hidden' &&
						computedStyle.opacity !== '0'
					);
				},
				{ timeout: 10000 }, // Increased timeout to 10 seconds
			);
			console.log('[PDF-GENERATOR] Content rendering verified');
		} catch (waitError) {
			console.warn(
				'[PDF-GENERATOR] Content wait timeout, proceeding anyway:',
				waitError.message,
			);
			// Continue anyway - sometimes the content is already rendered
		}

		// Additional wait to ensure all rendering is complete
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Ensure content is painted before PDF generation
		// This is critical - PDF generation needs the content to be visually rendered
		await page.evaluate(() => {
			return new Promise(resolve => {
				// Force a repaint by reading layout properties
				const doc = document.querySelector('.document');
				if (doc) {
					// Trigger layout calculation
					const htmlElement = doc as HTMLElement;
					void htmlElement.offsetHeight;
					void htmlElement.offsetWidth;
					// Force style recalculation
					void window.getComputedStyle(doc).height;
				}
				// Wait for multiple paint cycles to ensure everything is rendered
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						requestAnimationFrame(() => {
							resolve(undefined);
						});
					});
				});
			});
		});
		console.log('[PDF-GENERATOR] Content painting completed');

		// Verify content is actually rendered (check for main document element)
		const contentCheck = await page.evaluate(() => {
			const doc = document.querySelector('.document');
			if (!doc) {
				return { found: false, textLength: 0, computedStyle: null };
			}
			const computedStyle = window.getComputedStyle(doc);
			const textContent = doc.textContent?.trim() || '';
			return {
				found: true,
				textLength: textContent.length,
				preview: textContent.substring(0, 100),
				display: computedStyle.display,
				visibility: computedStyle.visibility,
				opacity: computedStyle.opacity,
				color: computedStyle.color,
				backgroundColor: computedStyle.backgroundColor,
			};
		});
		console.log('[PDF-GENERATOR] Content check:', JSON.stringify(contentCheck));

		if (!contentCheck.found || contentCheck.textLength === 0) {
			throw new Error(
				`PDF content appears to be empty after rendering. Found: ${contentCheck.found}, Text length: ${contentCheck.textLength}`,
			);
		}

		// Verify content is visible (not hidden by CSS)
		if (
			contentCheck.display === 'none' ||
			contentCheck.visibility === 'hidden' ||
			contentCheck.opacity === '0'
		) {
			console.warn(
				'[PDF-GENERATOR] Warning: Content may be hidden by CSS:',
				contentCheck,
			);
		}

		// Additional debug: Check if content is actually visible in viewport
		const viewportCheck = await page.evaluate(() => {
			const doc = document.querySelector('.document');
			if (!doc) return { visible: false, reason: 'Element not found' };

			const rect = doc.getBoundingClientRect();
			const style = window.getComputedStyle(doc);

			return {
				visible: rect.width > 0 && rect.height > 0,
				width: rect.width,
				height: rect.height,
				top: rect.top,
				left: rect.left,
				display: style.display,
				position: style.position,
				overflow: style.overflow,
			};
		});
		console.log(
			'[PDF-GENERATOR] Viewport check:',
			JSON.stringify(viewportCheck),
		);

		if (!viewportCheck.visible) {
			console.error(
				'[PDF-GENERATOR] Content has zero dimensions in viewport!',
				viewportCheck,
			);
		}

		// Debug: Capture screenshot to verify rendering (optional, can be disabled in production)
		if (process.env.NODE_ENV !== 'production') {
			try {
				const screenshot = await page.screenshot({
					type: 'png',
					fullPage: true,
				});
				console.log(
					'[PDF-GENERATOR] Screenshot captured, size:',
					screenshot.length,
					'bytes',
				);
			} catch (screenshotError) {
				console.warn(
					'[PDF-GENERATOR] Screenshot capture failed (non-critical):',
					screenshotError.message,
				);
			}
		}

		// Generate PDF with German business standards
		console.log('[PDF-GENERATOR] Generating PDF...');

		// Ensure page is fully loaded and scrolled to top
		await page.evaluate(() => {
			window.scrollTo(0, 0);
			document.body.offsetHeight;
		});

		// Final wait before PDF generation
		await new Promise(resolve => setTimeout(resolve, 500));

		const pdfBuffer = await page.pdf({
			format: 'A4',
			printBackground: true,
			preferCSSPageSize: false, // Use format instead of CSS page size
			displayHeaderFooter: false,
			margin: {
				top: '15mm', // Reduced from 20mm for more content space
				right: '15mm', // Reduced from 20mm for more content space
				bottom: '15mm', // Reduced from 20mm for more content space
				left: '15mm', // Reduced from 20mm for more content space
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
		// Clean up resources in correct order: page first, then browser
		try {
			if (page) {
				console.log('[PDF-GENERATOR] Closing page...');
				await page.close();
			}
		} catch (pageCloseError) {
			console.error('[PDF-GENERATOR] Error closing page:', pageCloseError);
		}

		try {
			if (browser) {
				console.log('[PDF-GENERATOR] Closing browser...');
				await browser.close();
			}
		} catch (browserCloseError) {
			console.error(
				'[PDF-GENERATOR] Error closing browser:',
				browserCloseError,
			);
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

        html {
          width: 100%;
          height: 100%;
        }

        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #333;
          background: white;
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
        }

        .document {
          width: 100%;
          max-width: 180mm; /* Increased from 210mm to use more page width (210mm - 30mm margins) */
          margin: 0 auto;
          padding: 0; /* Removed padding - margins are handled by @page */
          min-height: 100vh; /* Ensure document has minimum height */
          background: white; /* Explicit white background */
          color: #333; /* Explicit text color */
          display: block;
        }

        @page {
          size: A4;
          margin: 15mm; /* Reduced from 20mm for more content space */
        }

        @media print {
          .items-table {
            page-break-inside: auto;
          }

          .items-table thead {
            display: table-header-group;
          }

          .items-table tbody tr {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: auto;
          }

          .items-table tbody tr td {
            page-break-inside: auto;
          }
        }

        /* Header with company information */
        .header {
          margin-bottom: 20mm; /* Reduced from 30mm for more compact layout */
          position: relative;
        }

        .logo-section {
          margin-bottom: 15mm; /* Reduced from 20mm for more compact layout */
        }

        .logo {
          max-width: 150px;
          max-height: 60px;
          height: auto;
          width: auto;
          margin-bottom: 10mm;
          object-fit: contain;
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
          width: 90mm; /* Increased from 85mm to use more space */
          min-height: 35mm; /* Reduced from 40mm for more compact layout */
          border: 1px solid #ddd;
          padding: 4mm; /* Reduced from 5mm */
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
          margin-bottom: 10mm; /* Reduced from 15mm for more compact layout */
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
          margin-bottom: 8mm; /* Reduced from 10mm for more compact layout */
          color: #2c5aa0;
        }

        /* Items table */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10mm; /* Reduced from 15mm for more compact layout */
          font-size: 10pt;
          page-break-inside: auto;
        }

        .items-table thead {
          display: table-header-group;
        }

        .items-table tbody {
          display: table-row-group;
        }

        .items-table th {
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          padding: 3mm;
          text-align: left;
          font-weight: bold;
        }

        .items-table tr {
          page-break-inside: avoid;
          break-inside: avoid;
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

         .item-title {
           font-weight: bold;
           display: block;
         }

         .item-cell {
           width: 100%;
           overflow: visible;
         }

        /* Totals section - German tax display */
        .totals-section {
          float: right;
          width: 70mm; /* Increased from 60mm to use more space */
          margin-bottom: 10mm; /* Reduced from 15mm for more compact layout */
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
          margin-top: 10mm; /* Reduced from 15mm for more compact layout */
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
          margin-top: 15mm; /* Reduced from 20mm for more compact layout */
          font-size: 9pt;
          color: #666;
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 4mm; /* Reduced from 5mm */
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
            {{#if company.logoUrl}}
            <img src="{{company.logoUrl}}" alt="{{company.name}}" class="logo" />
            {{else}}
            <!-- Placeholder logo - set COMPANY_LOGO_URL environment variable to embed logo -->
            <div style="width: 150px; height: 60px; background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; border: 2px dashed #ccc; font-size: 10pt; color: #666;">
              LOGO HIER
            </div>
            {{/if}}

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
              <th style="width: 5%;">Pos.</th>
              <th style="width: 58%;">Artikel/Leistung</th>
              <th style="width: 6%;">Menge</th>
              <th style="width: 6%;">Einheit</th>
              <th style="width: 10%;">Einzelpreis</th>
              <th style="width: 5%;">Rabatt</th>
              <th style="width: 10%;">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {{#each items}}
            <tr>
              <td class="text-center">{{position}}</td>
              <td class="item-cell">
                <span class="item-title">{{title}}</span>
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
