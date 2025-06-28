import { Migration } from '@mikro-orm/migrations';

export class Migration20250623174044 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "contact" ("id" text not null, "supplier_id" text not null, "salutation" text null, "first_name" text null, "last_name" text null, "department" text null, "is_main_contact" boolean not null default false, "contact_type" text not null default 'additional', "label" text null, "phones" jsonb null, "emails" jsonb null, "fax" text null, "website" text null, "is_active" boolean not null default true, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "contact_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_contact_deleted_at" ON "contact" (deleted_at) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "supplier_address" ("id" text not null, "supplier_id" text not null, "address_type" text not null, "label" text null, "is_default" boolean not null default false, "street" text not null, "street_number" text null, "postal_code" text not null, "city" text not null, "country" text not null, "country_name" text null, "state" text null, "region" text null, "phone" text null, "fax" text null, "email" text null, "business_hours" jsonb null, "is_warehouse" boolean not null default false, "is_office" boolean not null default false, "is_active" boolean not null default true, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_address_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_supplier_address_deleted_at" ON "supplier_address" (deleted_at) WHERE deleted_at IS NULL;`,
    );

    this.addSql(`ALTER TABLE "supplier"
      DROP COLUMN IF EXISTS "salutation",
      DROP COLUMN IF EXISTS "first_name",
      DROP COLUMN IF EXISTS "last_name",
      DROP COLUMN IF EXISTS "contact",
      DROP COLUMN IF EXISTS "street",
      DROP COLUMN IF EXISTS "postal_code",
      DROP COLUMN IF EXISTS "city",
      DROP COLUMN IF EXISTS "country",
      DROP COLUMN IF EXISTS "phone",
      DROP COLUMN IF EXISTS "phone_direct",
      DROP COLUMN IF EXISTS "fax",
      DROP COLUMN IF EXISTS "email",
      DROP COLUMN IF EXISTS "contact_salutation",
      DROP COLUMN IF EXISTS "contact_first_name",
      DROP COLUMN IF EXISTS "contact_last_name",
      DROP COLUMN IF EXISTS "contact_phone",
      DROP COLUMN IF EXISTS "contact_mobile",
      DROP COLUMN IF EXISTS "contact_fax",
      DROP COLUMN IF EXISTS "contact_email",
      DROP COLUMN IF EXISTS "contact_department";
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "contact" cascade;`);

    this.addSql(`drop table if exists "supplier_address" cascade;`);
  }
}
