import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251206215822 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "offer_item" add column if not exists "display_order" integer not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "offer_item" drop column if exists "display_order";`);
  }

}
