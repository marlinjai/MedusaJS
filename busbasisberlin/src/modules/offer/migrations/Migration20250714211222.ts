import { Migration } from '@mikro-orm/migrations';

export class Migration20250714211222 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "offer_item" drop column if exists "internal_notes";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "offer_item" add column if not exists "internal_notes" text null;`);
  }

}
