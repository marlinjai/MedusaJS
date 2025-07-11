/**
 * list-database-tables.ts
 * Script to list all tables in the Medusa database
 * Run with: npx medusa exec ./src/scripts/list-database-tables.ts
 */
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export default async function listDatabaseTables({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  logger.info('🔍 Listing all database tables...');

  try {
    // Get the database connection from the container
    const dbConnection = container.resolve('manager').connection;

    // Use the database connection to query table names
    const tables = await dbConnection.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    logger.info(`📋 Found ${tables.length} tables in the database:`);
    logger.info('');

    // Group tables by category for better organization
    const tableCategories = {
      'Product Related': [] as string[],
      'Order Related': [] as string[],
      'Customer Related': [] as string[],
      'Inventory Related': [] as string[],
      'Shipping Related': [] as string[],
      'Payment Related': [] as string[],
      'Discount Related': [] as string[],
      'Custom Modules': [] as string[],
      'System Tables': [] as string[],
      Other: [] as string[],
    };

    tables.forEach((table: any) => {
      const tableName = table.table_name;

      // Categorize tables based on their names
      if (
        tableName.includes('product') ||
        tableName.includes('variant') ||
        tableName.includes('category') ||
        tableName.includes('collection') ||
        tableName.includes('tag')
      ) {
        tableCategories['Product Related'].push(tableName);
      } else if (
        tableName.includes('order') ||
        tableName.includes('line_item') ||
        tableName.includes('fulfillment') ||
        tableName.includes('return')
      ) {
        tableCategories['Order Related'].push(tableName);
      } else if (tableName.includes('customer') || tableName.includes('user')) {
        tableCategories['Customer Related'].push(tableName);
      } else if (tableName.includes('inventory') || tableName.includes('stock')) {
        tableCategories['Inventory Related'].push(tableName);
      } else if (
        tableName.includes('shipping') ||
        tableName.includes('region') ||
        tableName.includes('country') ||
        tableName.includes('zone')
      ) {
        tableCategories['Shipping Related'].push(tableName);
      } else if (tableName.includes('payment') || tableName.includes('transaction')) {
        tableCategories['Payment Related'].push(tableName);
      } else if (tableName.includes('discount') || tableName.includes('promotion')) {
        tableCategories['Discount Related'].push(tableName);
      } else if (
        tableName.includes('supplier') ||
        tableName.includes('service') ||
        tableName.includes('blog') ||
        tableName.includes('post')
      ) {
        tableCategories['Custom Modules'].push(tableName);
      } else if (
        tableName.includes('migration') ||
        tableName.includes('typeorm') ||
        tableName.includes('session') ||
        tableName.includes('cache')
      ) {
        tableCategories['System Tables'].push(tableName);
      } else {
        tableCategories['Other'].push(tableName);
      }
    });

    // Display tables by category
    Object.entries(tableCategories).forEach(([category, tableList]) => {
      if (tableList.length > 0) {
        logger.info(`📂 ${category} (${tableList.length} tables):`);
        tableList.forEach(tableName => {
          logger.info(`   - ${tableName}`);
        });
        logger.info('');
      }
    });

    // Also show a simple numbered list for easy reference
    logger.info('📝 Complete table list (numbered):');
    tables.forEach((table: any, index: number) => {
      logger.info(`${index + 1}. ${table.table_name}`);
    });

    logger.info('');
    logger.info('💡 Next steps:');
    logger.info('   1. Review the tables above');
    logger.info('   2. Tell me which tables you want to truncate');
    logger.info('   3. I will create a cleanup script for those specific tables');
  } catch (error) {
    logger.error(`❌ Failed to list database tables: ${error.message}`);
    throw error;
  }
}
