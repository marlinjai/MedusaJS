import { Migration } from '@mikro-orm/migrations';

export class Migration20250713170220 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "manual_customer" ("id" text not null, "customer_number" text null, "internal_key" text null, "salutation" text null, "title" text null, "first_name" text null, "last_name" text null, "company" text null, "company_addition" text null, "email" text null, "phone" text null, "fax" text null, "mobile" text null, "website" text null, "street" text null, "address_addition" text null, "street_number" text null, "postal_code" text null, "city" text null, "country" text null, "state" text null, "vat_id" text null, "tax_number" text null, "customer_type" text not null default 'walk-in', "customer_group" text null, "status" text not null default 'active', "source" text null, "import_reference" text null, "notes" text null, "additional_info" text null, "birthday" timestamptz null, "ebay_name" text null, "language" text not null default 'de', "preferred_contact_method" text null, "total_purchases" integer not null default 0, "total_spent" integer not null default 0, "last_purchase_date" timestamptz null, "legacy_customer_id" text null, "legacy_system_reference" text null, "first_contact_date" timestamptz null, "last_contact_date" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "manual_customer_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_manual_customer_deleted_at" ON "manual_customer" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "manual_customer" cascade;`);
  }

}
