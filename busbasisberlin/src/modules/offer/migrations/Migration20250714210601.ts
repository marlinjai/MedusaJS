import { Migration } from '@mikro-orm/migrations';

export class Migration20250714210601 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "offer_item" drop column if exists "is_reservable";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "offer_item" add column if not exists "is_reservable" boolean not null default true;`);
  }

}
