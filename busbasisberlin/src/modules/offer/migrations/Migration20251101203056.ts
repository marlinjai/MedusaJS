import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251101203056 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "offer" add column if not exists "email_notifications" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "offer" drop column if exists "email_notifications";`);
  }

}
