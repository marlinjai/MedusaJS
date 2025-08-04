/**
 * Test database update functionality
 */

// Mock the offer service update
async function testOfferUpdate() {
	try {
		console.log('Testing offer update simulation...');

		// Simulate the update that should happen
		const mockUpdateData = {
			id: '01K1TDCP191J684Q0TWADKKYCT',
			pdf_url:
				'https://vnlpncljwdhvvftrecuk.supabase.co/storage/v1/object/public/busbasisberlin/test-pdf-direct.pdf',
		};

		console.log('Update data:', mockUpdateData);

		// Simulate what the offer service update should return
		const mockUpdateResult = {
			id: mockUpdateData.id,
			pdf_url: mockUpdateData.pdf_url,
			updated_at: new Date().toISOString(),
		};

		console.log('Mock update result:', mockUpdateResult);

		// Test the URL
		const testUrl = mockUpdateData.pdf_url;
		console.log('Testing URL:', testUrl);

		const response = await fetch(testUrl);
		if (response.ok) {
			console.log('✅ URL is accessible, status:', response.status);
			console.log('Content-Length:', response.headers.get('content-length'));
		} else {
			console.log('❌ URL not accessible, status:', response.status);
		}
	} catch (error) {
		console.error('Database update test failed:', error);
	}
}

testOfferUpdate();
