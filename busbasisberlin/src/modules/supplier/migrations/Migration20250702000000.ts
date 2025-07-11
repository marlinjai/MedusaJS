import { Migration } from '@mikro-orm/migrations';

export class Migration20250702000000 extends Migration {
  override async up(): Promise<void> {
    // Add separate netto and brutto price fields for better pricing accuracy
    this.addSql(
      `alter table if exists "product_supplier" add column if not exists "supplier_price_netto" integer null`,
    );
    this.addSql(
      `alter table if exists "product_supplier" add column if not exists "supplier_price_brutto" integer null`,
    );

    // Add index for better performance when querying by pricing
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_supplier_price_netto" ON "product_supplier" ("supplier_price_netto");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_supplier_price_brutto" ON "product_supplier" ("supplier_price_brutto");`,
    );
  }

  override async down(): Promise<void> {
    // Remove the new fields
    this.addSql(`alter table if exists "product_supplier" drop column if exists "supplier_price_netto"`);
    this.addSql(`alter table if exists "product_supplier" drop column if exists "supplier_price_brutto"`);

    // Remove indexes
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_supplier_price_netto";`);
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_supplier_price_brutto";`);
  }
}
