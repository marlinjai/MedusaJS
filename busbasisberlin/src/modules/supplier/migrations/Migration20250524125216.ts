import { Migration } from '@mikro-orm/migrations';

export class Migration20250524125216 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "supplier" ("id" text not null, "supplier_number" text null, "customer_number" text null, "internal_key" text null, "salutation" text null, "first_name" text null, "last_name" text null, "company" text null, "company_addition" text null, "contact" text null, "street" text null, "postal_code" text null, "city" text null, "country" text null, "phone" text null, "phone_direct" text null, "fax" text null, "email" text null, "website" text null, "note" text null, "vat_id" text null, "status" text null default 'active', "active" boolean null default true, "language" text null default 'de', "delivery_time" integer null default 0, "contact_salutation" text null, "contact_first_name" text null, "contact_last_name" text null, "contact_phone" text null, "contact_mobile" text null, "contact_fax" text null, "contact_email" text null, "contact_department" text null, "bank_name" text null, "bank_code" text null, "account_number" text null, "account_holder" text null, "iban" text null, "bic" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_deleted_at" ON "supplier" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "supplier" cascade;`);
  }

}
