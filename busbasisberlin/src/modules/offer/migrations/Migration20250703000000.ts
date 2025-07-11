/**
 * Migration20250703000000.ts
 * Initial migration for offer module - creates offer, offer_item, and offer_status_history tables
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20250703000000 extends Migration {
  async up(): Promise<void> {
    // Create offer table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "offer" (
        "id" text PRIMARY KEY NOT NULL,
        "offer_number" text NOT NULL UNIQUE,
        "title" text NOT NULL,
        "description" text,
        "status" text NOT NULL DEFAULT 'draft',
        "customer_name" text,
        "customer_email" text,
        "customer_phone" text,
        "customer_address" text,
        "subtotal" integer NOT NULL DEFAULT 0,
        "tax_amount" integer NOT NULL DEFAULT 0,
        "total_amount" integer NOT NULL DEFAULT 0,
        "currency_code" text NOT NULL DEFAULT 'EUR',
        "valid_until" timestamptz,
        "internal_notes" text,
        "customer_notes" text,
        "created_by" text,
        "assigned_to" text,
        "has_reservations" boolean DEFAULT false,
        "reservation_expires_at" timestamptz,
        "accepted_at" timestamptz,
        "completed_at" timestamptz,
        "cancelled_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create offer_item table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "offer_item" (
        "id" text PRIMARY KEY NOT NULL,
        "offer_id" text NOT NULL,
        "product_id" text,
        "service_id" text,
        "item_type" text NOT NULL,
        "sku" text,
        "title" text NOT NULL,
        "description" text,
        "quantity" integer NOT NULL DEFAULT 1,
        "unit" text,
        "unit_price" integer NOT NULL DEFAULT 0,
        "discount_percentage" real,
        "discount_amount" integer,
        "tax_rate" real,
        "tax_amount" integer NOT NULL DEFAULT 0,
        "total_price" integer NOT NULL DEFAULT 0,
        "variant_title" text,
        "supplier_info" text,
        "lead_time" integer,
        "custom_specifications" text,
        "delivery_notes" text,
        "item_group" text,
        "sort_order" integer DEFAULT 0,
        "available_quantity" integer,
        "reserved_quantity" integer DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY ("offer_id") REFERENCES "offer" ("id") ON DELETE CASCADE
      );
    `);

    // Create offer_status_history table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "offer_status_history" (
        "id" text PRIMARY KEY NOT NULL,
        "offer_id" text NOT NULL,
        "previous_status" text,
        "new_status" text NOT NULL,
        "event_type" text NOT NULL,
        "event_description" text,
        "changed_by" text,
        "changed_by_name" text,
        "notes" text,
        "system_change" boolean DEFAULT false,
        "inventory_impact" text,
        "communication_sent" boolean DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY ("offer_id") REFERENCES "offer" ("id") ON DELETE CASCADE
      );
    `);

    // Create indexes for performance
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_offer_status" ON "offer" ("status");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_offer_offer_number" ON "offer" ("offer_number");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_offer_customer_email" ON "offer" ("customer_email");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_offer_created_at" ON "offer" ("created_at");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_offer_valid_until" ON "offer" ("valid_until");`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_offer_item_offer_id" ON "offer_item" ("offer_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_offer_item_product_id" ON "offer_item" ("product_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_offer_item_service_id" ON "offer_item" ("service_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_offer_item_type" ON "offer_item" ("item_type");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_offer_item_sort_order" ON "offer_item" ("sort_order");`);

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "idx_offer_status_history_offer_id" ON "offer_status_history" ("offer_id");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "idx_offer_status_history_event_type" ON "offer_status_history" ("event_type");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "idx_offer_status_history_created_at" ON "offer_status_history" ("created_at");`,
    );
  }

  async down(): Promise<void> {
    // Drop tables in reverse order (child tables first)
    this.addSql(`DROP TABLE IF EXISTS "offer_status_history";`);
    this.addSql(`DROP TABLE IF EXISTS "offer_item";`);
    this.addSql(`DROP TABLE IF EXISTS "offer";`);
  }
}
