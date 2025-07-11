/**
 * create-product-tags.ts
 * Script to create product tags from CSV categories
 * Run with: medusa exec ./src/scripts/create-product-tags.ts
 */
import { ExecArgs } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

export default async function createProductTags({ container }: ExecArgs) {
  const logger = container.resolve('logger');
  const productService = container.resolve(Modules.PRODUCT);

  logger.info('🏷️ Starting product tag creation from CSV categories...');

  // File paths
  const articleCsvPath = path.resolve(__dirname, '..', '..', '..', 'data', 'artikeldaten started cleanup.csv');

  try {
    // Parse article CSV to extract categories
    const articleCsvContent = fs.readFileSync(articleCsvPath, 'utf-8');
    const articles = parse(articleCsvContent, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
    });

    logger.info(`📦 Parsed ${articles.length} articles from CSV`);

    // Extract all unique categories
    const categorySet = new Set<string>();

    articles.forEach((article: any) => {
      // Extract categories from the CSV - adjust field names as needed
      const category1 = article['Kategorie Level 1']?.trim();
      const category2 = article['Kategorie Level 2']?.trim();
      const category3 = article['Kategorie Level 3']?.trim();
      const category4 = article['Kategorie Level 4']?.trim();

      if (category1) categorySet.add(category1);
      if (category2) categorySet.add(category2);
      if (category3) categorySet.add(category3);
      if (category4) categorySet.add(category4);
    });

    const uniqueCategories = Array.from(categorySet).filter(cat => cat && cat.length > 0);

    logger.info(`🏷️ Found ${uniqueCategories.length} unique categories`);

    if (uniqueCategories.length === 0) {
      logger.warn('⚠️ No categories found in CSV. Check the field names.');
      return;
    }

    // Create tags using the product service
    logger.info('🔄 Creating product tags...');

    let totalCreated = 0;

    for (const category of uniqueCategories) {
      try {
        // Create tag using the product service
        await productService.createProductTags([
          {
            value: category,
          },
        ]);

        totalCreated++;
        logger.info(`✅ Created tag: ${category}`);
      } catch (error) {
        // If tag already exists, that's fine
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          logger.info(`⏭️ Tag already exists: ${category}`);
        } else {
          logger.error(`❌ Error creating tag ${category}:`, error.message);
        }
      }
    }

    logger.info(`🎉 Successfully processed ${totalCreated} product tags!`);

    // Save the category mapping for use in product import
    const categoryMapping = {};
    uniqueCategories.forEach(category => {
      categoryMapping[category] = category; // Tag value = category name
    });

    const mappingPath = path.resolve(__dirname, '..', '..', '..', 'data', 'category-tag-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(categoryMapping, null, 2));

    logger.info(`💾 Category mapping saved to: ${mappingPath}`);
  } catch (error) {
    logger.error('❌ Error creating product tags:', error);
    throw error;
  }
}
