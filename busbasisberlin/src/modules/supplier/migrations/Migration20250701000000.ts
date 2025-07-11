import { Migration } from '@mikro-orm/migrations';

export class Migration20250701000000 extends Migration {
  override async up(): Promise<void> {
    // Add new fields to product_supplier table for multiple entries per supplier
    this.addSql(`alter table if exists "product_supplier" add column if not exists "variant_name" text null`);
    this.addSql(`alter table if exists "product_supplier" add column if not exists "variant_description" text null`);
    this.addSql(
      `alter table if exists "product_supplier" add column if not exists "sort_order" integer not null default 0`,
    );
    this.addSql(
      `alter table if exists "product_supplier" add column if not exists "is_favorite" boolean not null default false`,
    );

    // Add index for better performance when querying by supplier and product
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_supplier_product_supplier" ON "product_supplier" ("product_id", "supplier_id");`,
    );
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_supplier_sort_order" ON "product_supplier" ("sort_order");`);
  }

  override async down(): Promise<void> {
    // Remove the new fields
    this.addSql(`alter table if exists "product_supplier" drop column if exists "variant_name"`);
    this.addSql(`alter table if exists "product_supplier" drop column if exists "variant_description"`);
    this.addSql(`alter table if exists "product_supplier" drop column if exists "sort_order"`);
    this.addSql(`alter table if exists "product_supplier" drop column if exists "is_favorite"`);

    // Remove indexes
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_supplier_product_supplier";`);
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_supplier_sort_order";`);
  }
}
