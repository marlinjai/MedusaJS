import { Migration } from '@mikro-orm/migrations';

export class Migration20250714205959 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "offer" drop column if exists "is_template", drop column if exists "template_name";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "offer" add column if not exists "is_template" boolean not null default false, add column if not exists "template_name" text null;`);
  }

}
