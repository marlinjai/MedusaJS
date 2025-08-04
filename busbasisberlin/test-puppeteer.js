/**
 * Simple Puppeteer test to verify it's working
 */

const puppeteer = require('puppeteer');

async function testPuppeteer() {
	console.log('Testing Puppeteer...');
	
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
				'--disable-features=VizDisplayCompositor'
			],
			ignoreDefaultArgs: ['--disable-extensions'],
		});
		console.log('Browser launched successfully');
		
		const page = await browser.newPage();
		console.log('Page created');
		
		await page.setContent('<html><body><h1>Test PDF</h1><p>This is a test.</p></body></html>');
		console.log('Content set');
		
		const pdfBuffer = await page.pdf({
			format: 'A4',
			printBackground: true,
		});
		console.log('PDF generated, size:', pdfBuffer.length, 'bytes');
		
		// Save to file
		const fs = require('fs');
		fs.writeFileSync('test-puppeteer.pdf', pdfBuffer);
		console.log('PDF saved as test-puppeteer.pdf');
		
		console.log('✅ Puppeteer test successful!');
		
	} catch (error) {
		console.error('❌ Puppeteer test failed:', error);
		console.error('Error details:', {
			message: error.message,
			stack: error.stack,
			name: error.name
		});
	} finally {
		if (browser) {
			await browser.close();
			console.log('Browser closed');
		}
	}
}

testPuppeteer(); 