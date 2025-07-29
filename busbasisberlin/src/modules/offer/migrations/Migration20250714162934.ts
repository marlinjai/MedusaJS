import { Migration } from '@mikro-orm/migrations';

export class Migration20250714162934 extends Migration {
	override async up(): Promise<void> {
		this.addSql(
			`alter table if exists "offer" drop constraint if exists "offer_offer_number_seq_unique";`,
		);
		this.addSql(`alter table if exists "offer" drop column if exists "title";`);

		this.addSql(
			`alter table if exists "offer" add column if not exists "offer_number_seq" serial;`,
		);
		this.addSql(
			`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_offer_offer_number_seq_unique" ON "offer" (offer_number_seq) WHERE deleted_at IS NULL;`,
		);
	}

	override async down(): Promise<void> {
		this.addSql(`drop index if exists "IDX_offer_offer_number_seq_unique";`);
		this.addSql(
			`alter table if exists "offer" drop column if exists "offer_number_seq";`,
		);

		this.addSql(
			`alter table if exists "offer" add column if not exists "title" text not null;`,
		);
	}
}
