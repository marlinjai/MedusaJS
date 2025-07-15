import { Migration } from '@mikro-orm/migrations';

export class Migration20250714171752 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "offer" drop column if exists "discount_amount", drop column if exists "requires_approval";`);

    this.addSql(`alter table if exists "offer" alter column "offer_number_seq" type integer using ("offer_number_seq"::integer);`);
    this.addSql(`alter table if exists "offer" alter column "offer_number_seq" drop default;`);

    this.addSql(`alter table if exists "offer_item" drop column if exists "requires_approval";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "offer" add column if not exists "discount_amount" integer not null default 0, add column if not exists "requires_approval" boolean not null default false;`);
    this.addSql(`alter table if exists "offer" alter column "offer_number_seq" type int using ("offer_number_seq"::int);`);
    this.addSql(`create sequence if not exists "offer_offer_number_seq_seq";`);
    this.addSql(`select setval('offer_offer_number_seq_seq', (select max("offer_number_seq") from "offer"));`);
    this.addSql(`alter table if exists "offer" alter column "offer_number_seq" set default nextval('offer_offer_number_seq_seq');`);

    this.addSql(`alter table if exists "offer_item" add column if not exists "requires_approval" boolean not null default false;`);
  }

}
