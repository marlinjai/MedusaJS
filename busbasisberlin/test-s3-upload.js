/**
 * Test S3 upload functionality
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// S3 configuration from .env
const s3Config = {
	region: 'eu-central-1',
	endpoint: 'https://vnlpncljwdhvvftrecuk.supabase.co/storage/v1/s3',
	credentials: {
		accessKeyId: '8c1b0dd0fafad92e095da63f07d2f8f2',
		secretAccessKey:
			'41147a21e3c3ee852e1986ee7efce2d7f1212fe23a6ef3c233d07a2842194242',
	},
	forcePathStyle: true,
};

const s3Client = new S3Client(s3Config);

async function testS3Upload() {
	try {
		console.log('Testing S3 upload...');

		const testContent = 'This is a test file content';
		const testBuffer = Buffer.from(testContent);

		const command = new PutObjectCommand({
			Bucket: 'busbasisberlin',
			Key: 'test-file.txt',
			Body: testBuffer,
			ContentType: 'text/plain',
		});

		const result = await s3Client.send(command);
		console.log('S3 upload successful:', result);

		// Test the public URL
		const publicUrl =
			'https://vnlpncljwdhvvftrecuk.supabase.co/storage/v1/object/public/busbasisberlin/test-file.txt';
		console.log('Public URL:', publicUrl);

		// Try to fetch the file
		const response = await fetch(publicUrl);
		if (response.ok) {
			const content = await response.text();
			console.log('File accessible via public URL:', content);
		} else {
			console.log(
				'File not accessible via public URL, status:',
				response.status,
			);
		}
	} catch (error) {
		console.error('S3 upload failed:', error);
		console.error('Error details:', {
			message: error.message,
			code: error.Code,
			name: error.name,
		});
	}
}

testS3Upload();
