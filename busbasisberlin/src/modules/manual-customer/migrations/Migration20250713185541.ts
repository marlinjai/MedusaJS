import { Migration } from '@mikro-orm/migrations';

export class Migration20250713185541 extends Migration {
	override async up(): Promise<void> {
		this.addSql(
			`alter table if exists "manual_customer" add column if not exists "core_customer_id" text null, add column if not exists "is_linked" boolean not null default false, add column if not exists "linked_at" timestamptz null, add column if not exists "linking_method" text null;`,
		);
	}

	override async down(): Promise<void> {
		this.addSql(
			`alter table if exists "manual_customer" drop column if exists "core_customer_id", drop column if exists "is_linked", drop column if exists "linked_at", drop column if exists "linking_method";`,
		);
	}
}
