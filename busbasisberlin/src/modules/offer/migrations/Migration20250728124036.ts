import { Migration } from '@mikro-orm/migrations';

export class Migration20250728124036 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "offer_item" add column if not exists "reservation_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "offer_item" drop column if exists "reservation_id";`);
  }

}
