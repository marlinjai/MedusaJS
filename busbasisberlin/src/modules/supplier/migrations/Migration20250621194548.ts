import { Migration } from '@mikro-orm/migrations';

export class Migration20250621194548 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_supplier" drop column if exists "lead_time", drop column if exists "minimum_order_quantity", drop column if exists "maximum_order_quantity", drop column if exists "stock_quantity";`);

    this.addSql(`alter table if exists "product_supplier" add column if not exists "supplier_product_name" text null, add column if not exists "supplier_vat_rate" integer null, add column if not exists "supplier_price_gross" integer null, add column if not exists "supplier_currency" text null default 'EUR', add column if not exists "supplier_lead_time" integer null, add column if not exists "supplier_delivery_time" integer null, add column if not exists "supplier_min_order_qty" integer null, add column if not exists "supplier_order_interval" integer null, add column if not exists "supplier_stock" integer null, add column if not exists "supplier_comment" text null, add column if not exists "supplier_merge_stock" boolean not null default false, add column if not exists "is_dropshipping" boolean not null default false, add column if not exists "use_supplier_lead_time" boolean not null default false;`);

    this.addSql(`alter table if exists "supplier" add column if not exists "salutation" text null, add column if not exists "first_name" text null, add column if not exists "last_name" text null, add column if not exists "contact" text null, add column if not exists "fax" text null, add column if not exists "is_active" boolean not null default true, add column if not exists "language" text null default 'Deutsch', add column if not exists "lead_time" integer null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_supplier" drop column if exists "supplier_product_name", drop column if exists "supplier_vat_rate", drop column if exists "supplier_price_gross", drop column if exists "supplier_currency", drop column if exists "supplier_lead_time", drop column if exists "supplier_delivery_time", drop column if exists "supplier_min_order_qty", drop column if exists "supplier_order_interval", drop column if exists "supplier_stock", drop column if exists "supplier_comment", drop column if exists "supplier_merge_stock", drop column if exists "is_dropshipping", drop column if exists "use_supplier_lead_time";`);

    this.addSql(`alter table if exists "product_supplier" add column if not exists "lead_time" integer null, add column if not exists "minimum_order_quantity" integer null, add column if not exists "maximum_order_quantity" integer null, add column if not exists "stock_quantity" integer null;`);

    this.addSql(`alter table if exists "supplier" drop column if exists "salutation", drop column if exists "first_name", drop column if exists "last_name", drop column if exists "contact", drop column if exists "fax", drop column if exists "is_active", drop column if exists "language", drop column if exists "lead_time";`);
  }

}
