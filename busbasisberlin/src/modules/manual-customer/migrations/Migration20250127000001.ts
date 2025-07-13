/**
 * Migration20250127000001.ts
 * Migration for manual customer module
 * Creates the manual_customer table with flexible fields
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20250127000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE TABLE IF NOT EXISTS "manual_customer" (
        "id" text PRIMARY KEY NOT NULL,
        "customer_number" text,
        "internal_key" text,
        "salutation" text,
        "title" text,
        "first_name" text,
        "last_name" text,
        "company" text,
        "company_addition" text,
        "email" text,
        "phone" text,
        "fax" text,
        "mobile" text,
        "website" text,
        "street" text,
        "address_addition" text,
        "street_number" text,
        "postal_code" text,
        "city" text,
        "country" text,
        "state" text,
        "vat_id" text,
        "tax_number" text,
        "customer_type" text NOT NULL DEFAULT 'walk-in',
        "customer_group" text,
        "status" text NOT NULL DEFAULT 'active',
        "source" text,
        "import_reference" text,
        "notes" text,
        "additional_info" text,
        "birthday" timestamptz,
        "ebay_name" text,
        "language" text NOT NULL DEFAULT 'de',
        "preferred_contact_method" text,
        "total_purchases" integer NOT NULL DEFAULT 0,
        "total_spent" integer NOT NULL DEFAULT 0,
        "last_purchase_date" timestamptz,
        "legacy_customer_id" text,
        "legacy_system_reference" text,
        "first_contact_date" timestamptz,
        "last_contact_date" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );`,
    );

    // Create indexes for better performance
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_deleted_at" ON "manual_customer" (deleted_at) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_number" ON "manual_customer" (customer_number) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_email" ON "manual_customer" (email) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_phone" ON "manual_customer" (phone) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_type_status" ON "manual_customer" (customer_type, status) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_source" ON "manual_customer" (source) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_legacy_id" ON "manual_customer" (legacy_customer_id) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_name" ON "manual_customer" (first_name, last_name) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_company" ON "manual_customer" (company) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_internal_key" ON "manual_customer" (internal_key) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_customer_group" ON "manual_customer" (customer_group) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_fax" ON "manual_customer" (fax) WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_manual_customer_ebay_name" ON "manual_customer" (ebay_name) WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "manual_customer" CASCADE;`);
  }
}
