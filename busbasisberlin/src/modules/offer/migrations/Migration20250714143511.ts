import { Migration } from '@mikro-orm/migrations';

export class Migration20250714143511 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "offer" ("id" text not null, "offer_number" text not null, "title" text not null, "description" text null, "status" text not null default 'draft', "customer_name" text null, "customer_email" text null, "customer_phone" text null, "customer_address" text null, "subtotal" integer not null default 0, "tax_amount" integer not null default 0, "discount_amount" integer not null default 0, "total_amount" integer not null default 0, "currency_code" text not null default 'EUR', "valid_until" timestamptz null, "accepted_at" timestamptz null, "completed_at" timestamptz null, "cancelled_at" timestamptz null, "internal_notes" text null, "customer_notes" text null, "pdf_url" text null, "created_by" text null, "assigned_to" text null, "requires_approval" boolean not null default false, "is_template" boolean not null default false, "template_name" text null, "has_reservations" boolean not null default false, "reservation_expires_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "offer_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_deleted_at" ON "offer" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "offer_item" ("id" text not null, "offer_id" text not null, "product_id" text null, "service_id" text null, "variant_id" text null, "item_type" text not null, "sku" text null, "title" text not null, "description" text null, "quantity" integer not null default 1, "unit" text not null default 'STK', "unit_price" integer not null, "total_price" integer not null, "discount_percentage" integer not null default 0, "discount_amount" integer not null default 0, "tax_rate" integer not null default 0, "tax_amount" integer not null default 0, "variant_title" text null, "supplier_info" text null, "lead_time" integer null, "available_quantity" integer null, "reserved_quantity" integer not null default 0, "is_reservable" boolean not null default true, "custom_specifications" text null, "delivery_notes" text null, "internal_notes" text null, "sort_order" integer not null default 0, "item_group" text null, "is_active" boolean not null default true, "requires_approval" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "offer_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_item_deleted_at" ON "offer_item" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "offer_status_history" ("id" text not null, "offer_id" text not null, "previous_status" text null, "new_status" text not null, "event_type" text not null, "event_description" text not null, "changed_by" text null, "changed_by_name" text null, "system_change" boolean not null default false, "metadata" text null, "notes" text null, "inventory_impact" text null, "financial_impact" text null, "notification_sent" boolean not null default false, "notification_method" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "offer_status_history_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_status_history_deleted_at" ON "offer_status_history" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "offer" cascade;`);

    this.addSql(`drop table if exists "offer_item" cascade;`);

    this.addSql(`drop table if exists "offer_status_history" cascade;`);
  }

}
