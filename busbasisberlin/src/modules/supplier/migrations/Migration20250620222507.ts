import { Migration } from '@mikro-orm/migrations';

export class Migration20250620222507 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_supplier" ("id" text not null, "product_id" text not null, "supplier_id" text not null, "is_primary" boolean not null default false, "supplier_price" integer null, "supplier_sku" text null, "lead_time" integer null, "minimum_order_quantity" integer null, "maximum_order_quantity" integer null, "stock_quantity" integer null, "notes" text null, "last_order_date" timestamptz null, "supplier_rating" integer null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_supplier_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_supplier_deleted_at" ON "product_supplier" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "supplier" drop column if exists "salutation", drop column if exists "first_name", drop column if exists "last_name", drop column if exists "contact", drop column if exists "fax", drop column if exists "active", drop column if exists "language", drop column if exists "delivery_time";`);

    this.addSql(`alter table if exists "supplier" alter column "company" type text using ("company"::text);`);
    this.addSql(`alter table if exists "supplier" alter column "company" set not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_supplier" cascade;`);

    this.addSql(`alter table if exists "supplier" add column if not exists "salutation" text null, add column if not exists "first_name" text null, add column if not exists "last_name" text null, add column if not exists "contact" text null, add column if not exists "fax" text null, add column if not exists "active" boolean null default true, add column if not exists "language" text null default 'de', add column if not exists "delivery_time" integer null default 0;`);
    this.addSql(`alter table if exists "supplier" alter column "company" type text using ("company"::text);`);
    this.addSql(`alter table if exists "supplier" alter column "company" drop not null;`);
  }

}
