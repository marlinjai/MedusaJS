import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Migration to normalize all SKUs to lowercase
 * SKUs should always be lowercase since they're used as URL handles
 */
export class Migration20260114000000 extends Migration {

  override async up(): Promise<void> {
    // Normalize SKUs in offer_item table
    this.addSql(`
      UPDATE offer_item
      SET sku = LOWER(sku)
      WHERE sku IS NOT NULL AND sku != LOWER(sku);
    `);

    // Normalize SKUs in product_variant table (core Medusa table)
    this.addSql(`
      UPDATE product_variant
      SET sku = LOWER(sku)
      WHERE sku IS NOT NULL AND sku != LOWER(sku);
    `);

    // Normalize SKUs in inventory_item table (core Medusa table)
    this.addSql(`
      UPDATE inventory_item
      SET sku = LOWER(sku)
      WHERE sku IS NOT NULL AND sku != LOWER(sku);
    `);
  }

  override async down(): Promise<void> {
    // This is a one-way migration - we cannot restore the original casing
    // SKUs should be lowercase going forward, so no rollback is needed
  }

}
