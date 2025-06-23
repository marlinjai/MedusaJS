import { ExecArgs } from '@medusajs/framework/types';
import * as fs from 'fs';
import { resolve } from 'path';
import * as stream from 'stream';

interface SimpleFileService {
  upload(data: { name: string; mimeType: string; content: stream.PassThrough }): Promise<{ url: string }>;
}

export default async function uploadImages({ container }: ExecArgs) {
  const logger = container.resolve('logger');
  const fileService: SimpleFileService = container.resolve('fileService');

  const imageDirectory = resolve(__dirname, '..', '..', '..', 'data', 'artikelbilder');
  logger.info(`Reading images from: ${imageDirectory}`);

  let files;
  try {
    files = fs.readdirSync(imageDirectory).filter(file => file.endsWith('.jpg'));
  } catch (error) {
    logger.error(`Error reading image directory: ${error.message}`);
    return;
  }

  logger.info(`Found ${files.length} images to upload.`);

  for (const file of files) {
    const filePath = resolve(imageDirectory, file);
    const fileStream = fs.createReadStream(filePath);
    const passThrough = new stream.PassThrough();
    fileStream.pipe(passThrough);

    try {
      const { url } = await fileService.upload({
        name: file,
        mimeType: 'image/jpeg',
        content: passThrough,
      });
      logger.info(`Successfully uploaded ${file}. URL: ${url}`);
    } catch (error) {
      logger.error(`Failed to upload ${file}. Error: ${error.message}`);
    }
  }

  logger.info('Image upload finished.');
}
