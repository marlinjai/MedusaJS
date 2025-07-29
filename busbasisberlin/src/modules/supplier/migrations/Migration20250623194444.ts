import { Migration } from '@mikro-orm/migrations';

export class Migration20250623194444 extends Migration {
	override async up(): Promise<void> {
		this.addSql(`drop table if exists "contact" cascade;`);

		this.addSql(`drop table if exists "product_supplier" cascade;`);

		this.addSql(`drop table if exists "supplier" cascade;`);

		this.addSql(`drop table if exists "supplier_address" cascade;`);
	}

	override async down(): Promise<void> {
		this.addSql(
			`create table if not exists "contact" ("id" text not null, "supplier_id" text not null, "salutation" text null, "first_name" text null, "last_name" text null, "department" text null, "is_main_contact" boolean not null default false, "contact_type" text not null default 'additional', "label" text null, "phones" jsonb null, "emails" jsonb null, "fax" text null, "website" text null, "is_active" boolean not null default true, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "contact_pkey" primary key ("id"));`,
		);
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_contact_deleted_at" ON "contact" (deleted_at) WHERE deleted_at IS NULL;`,
		);

		this.addSql(
			`create table if not exists "product_supplier" ("id" text not null, "product_id" text not null, "supplier_id" text not null, "is_primary" boolean not null default false, "supplier_price" integer null, "supplier_sku" text null, "supplier_product_name" text null, "supplier_vat_rate" integer null, "supplier_price_gross" integer null, "supplier_currency" text null default 'EUR', "supplier_lead_time" integer null, "supplier_delivery_time" integer null, "supplier_min_order_qty" integer null, "supplier_order_interval" integer null, "supplier_stock" integer null, "supplier_comment" text null, "supplier_merge_stock" boolean not null default false, "is_dropshipping" boolean not null default false, "use_supplier_lead_time" boolean not null default false, "notes" text null, "last_order_date" timestamptz null, "supplier_rating" integer null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_supplier_pkey" primary key ("id"));`,
		);
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_product_supplier_deleted_at" ON "product_supplier" (deleted_at) WHERE deleted_at IS NULL;`,
		);

		this.addSql(
			`create table if not exists "supplier" ("id" text not null, "supplier_number" text null, "customer_number" text null, "internal_key" text null, "salutation" text null, "first_name" text null, "last_name" text null, "company" text not null, "company_addition" text null, "contact" text null, "street" text null, "postal_code" text null, "city" text null, "country" text null, "phone" text null, "phone_direct" text null, "fax" text null, "email" text null, "website" text null, "note" text null, "vat_id" text null, "status" text null default 'active', "is_active" boolean not null default true, "language" text null default 'Deutsch', "lead_time" integer null, "contact_salutation" text null, "contact_first_name" text null, "contact_last_name" text null, "contact_phone" text null, "contact_mobile" text null, "contact_fax" text null, "contact_email" text null, "contact_department" text null, "bank_name" text null, "bank_code" text null, "account_number" text null, "account_holder" text null, "iban" text null, "bic" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_pkey" primary key ("id"));`,
		);
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_supplier_deleted_at" ON "supplier" (deleted_at) WHERE deleted_at IS NULL;`,
		);

		this.addSql(
			`create table if not exists "supplier_address" ("id" text not null, "supplier_id" text not null, "address_type" text not null, "label" text null, "is_default" boolean not null default false, "street" text not null, "street_number" text null, "postal_code" text not null, "city" text not null, "country" text not null, "country_name" text null, "state" text null, "region" text null, "phone" text null, "fax" text null, "email" text null, "business_hours" jsonb null, "is_warehouse" boolean not null default false, "is_office" boolean not null default false, "is_active" boolean not null default true, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_address_pkey" primary key ("id"));`,
		);
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_supplier_address_deleted_at" ON "supplier_address" (deleted_at) WHERE deleted_at IS NULL;`,
		);
	}
}
