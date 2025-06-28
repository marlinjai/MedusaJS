/**
 * import-product-images.ts
 * Enhanced script to upload all product images to S3 and create mapping file
 * Run with: medusa exec ./src/scripts/import-product-images.ts
 */
import { ExecArgs } from '@medusajs/framework/types';
import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';

interface SimpleFileService {
  upload(data: { name: string; mimeType: string; content: stream.PassThrough }): Promise<{ url: string }>;
}

interface ImageMapping {
  [filename: string]: {
    url: string;
    uploaded_at: string;
    size: number;
    original_path: string;
  };
}

export default async function importProductImages({ container }: ExecArgs) {
  const logger = container.resolve('logger');
  const fileService: SimpleFileService = container.resolve('fileService');

  const imageDirectory = path.resolve(__dirname, '..', '..', '..', 'data', 'artikelbilder');
  const mappingFile = path.resolve(__dirname, '..', '..', '..', 'data', 'image-url-mapping.json');

  logger.info('🚀 Starting product image upload process...');
  logger.info(`📁 Reading images from: ${imageDirectory}`);

  // Check if directory exists
  if (!fs.existsSync(imageDirectory)) {
    logger.error(`❌ Image directory not found: ${imageDirectory}`);
    return;
  }

  // Get all image files
  let files: string[];
  try {
    files = fs
      .readdirSync(imageDirectory)
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .sort(); // Sort for consistent processing order
  } catch (error) {
    logger.error(`❌ Error reading image directory: ${error.message}`);
    return;
  }

  logger.info(`📊 Found ${files.length} images to upload`);

  // Load existing mapping if it exists
  let existingMapping: ImageMapping = {};
  if (fs.existsSync(mappingFile)) {
    try {
      const mappingContent = fs.readFileSync(mappingFile, 'utf8');
      existingMapping = JSON.parse(mappingContent);
      logger.info(`📋 Loaded existing mapping with ${Object.keys(existingMapping).length} entries`);
    } catch (error) {
      logger.warn(`⚠️  Could not load existing mapping: ${error.message}`);
    }
  }

  // Filter out already uploaded files
  const filesToUpload = files.filter(file => !existingMapping[file]);
  logger.info(
    `📤 ${filesToUpload.length} new images to upload (${files.length - filesToUpload.length} already uploaded)`,
  );

  if (filesToUpload.length === 0) {
    logger.info('✅ All images already uploaded!');
    return;
  }

  // Upload configuration
  const BATCH_SIZE = 10; // Upload 10 images at a time
  const RETRY_ATTEMPTS = 3;
  const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay

  let successCount = 0;
  let errorCount = 0;
  const newMapping: ImageMapping = { ...existingMapping };

  // Process in batches
  for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
    const batch = filesToUpload.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(filesToUpload.length / BATCH_SIZE);

    logger.info(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)`);

    // Upload batch in parallel
    const batchPromises = batch.map(async file => {
      const filePath = path.join(imageDirectory, file);

      for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
          // Get file stats
          const stats = fs.statSync(filePath);

          // Create file stream
          const fileStream = fs.createReadStream(filePath);
          const passThrough = new stream.PassThrough();
          fileStream.pipe(passThrough);

          // Determine MIME type
          const ext = path.extname(file).toLowerCase();
          const mimeType =
            {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.webp': 'image/webp',
            }[ext] || 'image/jpeg';

          // Upload to S3
          const { url } = await fileService.upload({
            name: file,
            mimeType,
            content: passThrough,
          });

          // Store mapping
          newMapping[file] = {
            url,
            uploaded_at: new Date().toISOString(),
            size: stats.size,
            original_path: filePath,
          };

          logger.info(`✅ ${file} → ${url}`);
          successCount++;
          return;
        } catch (error) {
          if (attempt === RETRY_ATTEMPTS) {
            logger.error(`❌ Failed to upload ${file} after ${RETRY_ATTEMPTS} attempts: ${error.message}`);
            errorCount++;
          } else {
            logger.warn(`⚠️  Attempt ${attempt}/${RETRY_ATTEMPTS} failed for ${file}: ${error.message}`);
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    });

    // Wait for batch to complete
    await Promise.all(batchPromises);

    // Save mapping after each batch
    try {
      fs.writeFileSync(mappingFile, JSON.stringify(newMapping, null, 2));
      logger.info(`💾 Saved mapping file with ${Object.keys(newMapping).length} entries`);
    } catch (error) {
      logger.error(`❌ Failed to save mapping file: ${error.message}`);
    }

    // Progress report
    const processed = Math.min(i + BATCH_SIZE, filesToUpload.length);
    const percentage = Math.round((processed / filesToUpload.length) * 100);
    logger.info(
      `📈 Progress: ${processed}/${filesToUpload.length} (${percentage}%) - ✅ ${successCount} success, ❌ ${errorCount} errors`,
    );

    // Delay between batches (except for the last one)
    if (i + BATCH_SIZE < filesToUpload.length) {
      logger.info(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  // Final report
  logger.info('🎉 Image upload process completed!');
  logger.info(`📊 Final stats:`);
  logger.info(`   ✅ Successfully uploaded: ${successCount}`);
  logger.info(`   ❌ Failed uploads: ${errorCount}`);
  logger.info(`   📁 Total images in mapping: ${Object.keys(newMapping).length}`);
  logger.info(`   💾 Mapping file saved to: ${mappingFile}`);

  // Validate mapping file
  if (Object.keys(newMapping).length > 0) {
    logger.info('✅ Image upload mapping ready for product import!');
  } else {
    logger.warn('⚠️  No images in mapping - check upload process');
  }
}
