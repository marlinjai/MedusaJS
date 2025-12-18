import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251206215547 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "service" ("id" text not null, "title" text not null, "description" text null, "short_description" text null, "service_code" text null, "category" text null, "category_level_1" text null, "category_level_2" text null, "category_level_3" text null, "category_level_4" text null, "service_type" text null, "base_price" integer null, "hourly_rate" integer null, "currency_code" text not null default 'EUR', "estimated_duration" integer null, "is_active" boolean not null default true, "is_featured" boolean not null default false, "requires_vehicle" boolean not null default false, "requires_diagnosis" boolean not null default false, "requires_approval" boolean not null default false, "requirements" text null, "notes" text null, "status" text not null default 'active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "service_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_deleted_at" ON "service" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "service" cascade;`);
  }

}
