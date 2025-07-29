import { Migration } from '@mikro-orm/migrations';

export class Migration20250714211655 extends Migration {
	override async up(): Promise<void> {
		this.addSql(
			`alter table if exists "offer_item" drop column if exists "is_active", drop column if exists "sort_order", drop column if exists "item_group";`,
		);
	}

	override async down(): Promise<void> {
		this.addSql(
			`alter table if exists "offer_item" add column if not exists "is_active" boolean not null default true, add column if not exists "sort_order" integer not null default 0, add column if not exists "item_group" text null;`,
		);
	}
}
