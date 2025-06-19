// busbasisberlin/src/scripts/cleanup-s3-files.ts
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ExecArgs } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Script to clean up orphaned S3 files in Supabase Storage that are no longer referenced by products.
 * Run with: medusa exec ./src/scripts/cleanup-s3-files.ts
 */
export default async function cleanupS3Files({ container }: ExecArgs) {
  const logger = container.resolve('logger');
  logger.info('Starting Supabase Storage cleanup...');

  try {
    // Resolve product service to get all product images
    const productService = container.resolve(Modules.PRODUCT);

    // Get Supabase Storage configuration from environment variables
    const supabaseConfig = {
      endpoint: process.env.S3_ENDPOINT, // Supabase Storage endpoint
      region: process.env.S3_REGION || 'us-east-1', // Region (usually doesn't matter for Supabase)
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: true, // Required for Supabase S3-compatible API
    };

    const bucketName = process.env.S3_BUCKET || '';

    if (!bucketName) {
      logger.error('S3_BUCKET environment variable is not set');

      return;
    }

    if (!supabaseConfig.credentials.accessKeyId || !supabaseConfig.credentials.secretAccessKey) {
      logger.error('Supabase Storage credentials are not properly configured');

      return;
    }

    // Create S3 client for Supabase
    logger.info(`Connecting to Supabase Storage with endpoint: ${supabaseConfig.endpoint}`);
    const s3Client = new S3Client(supabaseConfig);

    // First, get all product images to see which files are being used
    logger.info('Retrieving all products...');
    const [products] = await productService.listAndCountProducts(
      {},
      {
        relations: ['images'],
      },
    );

    // Extract all image URLs and extract the keys from them
    const imageUrls = new Set<string>();
    const imageKeys = new Set<string>();

    for (const product of products) {
      if (product.images && Array.isArray(product.images)) {
        for (const image of product.images) {
          if (image && image.url) {
            // Store the full URL for broader matching
            imageUrls.add(image.url);

            // Extract the file key from the URL (Supabase specific path handling)
            try {
              const url = new URL(image.url);

              // For Supabase Storage, the path format might be different
              // Example Supabase URL: https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<filename>
              const pathParts = url.pathname.split('/');

              // The key could be the full path after "public/<bucket>/"
              // or just the filename depending on your configuration
              const fileKey = pathParts[pathParts.length - 1];

              if (fileKey) {
                imageKeys.add(fileKey);

                // Also try to add variations of the key for more robust matching
                if (pathParts.length > 4 && pathParts[3] === bucketName) {
                  // This might be the full path after the bucket name
                  const fullPath = pathParts.slice(4).join('/');

                  if (fullPath) {
                    imageKeys.add(fullPath);
                  }
                }
              }
            } catch (error) {
              logger.warn(`Could not parse URL: ${image.url}`);
            }
          }
        }
      }
    }

    logger.info(`Found ${imageUrls.size} image URLs and ${imageKeys.size} distinct file keys in use by products`);

    // List all objects in the Supabase Storage bucket
    logger.info(`Listing all files in Supabase Storage bucket: ${bucketName}`);

    let isTruncated = true;
    let continuationToken: string | undefined;
    let allS3Objects: any[] = [];

    // Paginate through all objects in the bucket
    while (isTruncated) {
      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
        }),
      );

      if (response.Contents) {
        allS3Objects = [...allS3Objects, ...response.Contents];
      }

      isTruncated = response.IsTruncated || false;
      continuationToken = response.NextContinuationToken;
    }

    logger.info(`Found ${allS3Objects.length} total files in Supabase Storage bucket`);

    // Find orphaned files (files in storage not referenced by any product)
    const orphanedFiles = allS3Objects.filter(obj => {
      const key = obj.Key;

      if (!key) return false;

      // Try multiple methods to match since Supabase URLs can be structured differently

      // 1. Extract filename for simple comparison
      const keyParts = key.split('/');
      const fileName = keyParts[keyParts.length - 1];

      // 2. Check if the key appears in any product image URL
      const isInImageUrl = Array.from(imageUrls).some(url => url.includes(key) || url.includes(fileName));

      // 3. Check if key or filename is in our extracted keys
      const isInKeys = imageKeys.has(key) || imageKeys.has(fileName);

      return !isInImageUrl && !isInKeys;
    });

    logger.info(`Found ${orphanedFiles.length} orphaned files in Supabase Storage`);

    // Delete orphaned files
    let deletedCount = 0;

    for (const file of orphanedFiles) {
      const key = file.Key;

      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          }),
        );
        logger.info(`Deleted orphaned file: ${key}`);
        deletedCount++;
      } catch (deleteError) {
        logger.error(`Failed to delete file ${key}: ${deleteError.message}`);
      }
    }

    logger.info(`Supabase Storage cleanup completed. Deleted ${deletedCount} orphaned files.`);
  } catch (error) {
    logger.error(`Supabase Storage cleanup error: ${error.message}`);

    if (error.stack) {
      logger.error(error.stack);
    }
  }
}
