import { Migration } from '@mikro-orm/migrations';

export class Migration20250917170927 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_supplier" add column if not exists "raw_supplier_price_netto" jsonb null, add column if not exists "raw_supplier_price_brutto" jsonb null, add column if not exists "raw_supplier_price" jsonb null;`);
    this.addSql(`alter table if exists "product_supplier" alter column "supplier_price_netto" type numeric using ("supplier_price_netto"::numeric);`);
    this.addSql(`alter table if exists "product_supplier" alter column "supplier_price_brutto" type numeric using ("supplier_price_brutto"::numeric);`);
    this.addSql(`alter table if exists "product_supplier" alter column "supplier_price" type numeric using ("supplier_price"::numeric);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_supplier" drop column if exists "raw_supplier_price_netto", drop column if exists "raw_supplier_price_brutto", drop column if exists "raw_supplier_price";`);

    this.addSql(`alter table if exists "product_supplier" alter column "supplier_price_netto" type integer using ("supplier_price_netto"::integer);`);
    this.addSql(`alter table if exists "product_supplier" alter column "supplier_price_brutto" type integer using ("supplier_price_brutto"::integer);`);
    this.addSql(`alter table if exists "product_supplier" alter column "supplier_price" type integer using ("supplier_price"::integer);`);
  }

}
