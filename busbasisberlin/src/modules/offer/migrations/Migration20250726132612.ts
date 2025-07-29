import { Migration } from '@mikro-orm/migrations';

export class Migration20250726132612 extends Migration {
	override async up(): Promise<void> {
		this.addSql(
			`alter table if exists "offer_item" drop column if exists "available_quantity";`,
		);

		this.addSql(
			`alter table if exists "offer_item" add column if not exists "item_group" text null;`,
		);
		// Note: reserved_quantity was already removed by our manual migration
		// So we just need to add sort_order if it doesn't exist
		this.addSql(
			`alter table if exists "offer_item" add column if not exists "sort_order" integer default 0;`,
		);
	}

	override async down(): Promise<void> {
		this.addSql(
			`alter table if exists "offer_item" drop column if exists "item_group";`,
		);
		this.addSql(
			`alter table if exists "offer_item" drop column if exists "sort_order";`,
		);

		this.addSql(
			`alter table if exists "offer_item" add column if not exists "available_quantity" integer null;`,
		);
		this.addSql(
			`alter table if exists "offer_item" add column if not exists "reserved_quantity" integer default 0;`,
		);
	}
}
