import { Migration } from '@mikro-orm/migrations';

export class Migration20250628101405 extends Migration {
	override async up(): Promise<void> {
		this.addSql(
			`alter table if exists "supplier_address" alter column "street" type text using ("street"::text);`,
		);
		this.addSql(
			`alter table if exists "supplier_address" alter column "street" drop not null;`,
		);
		this.addSql(
			`alter table if exists "supplier_address" alter column "postal_code" type text using ("postal_code"::text);`,
		);
		this.addSql(
			`alter table if exists "supplier_address" alter column "postal_code" drop not null;`,
		);
		this.addSql(
			`alter table if exists "supplier_address" alter column "city" type text using ("city"::text);`,
		);
		this.addSql(
			`alter table if exists "supplier_address" alter column "city" drop not null;`,
		);
	}

	override async down(): Promise<void> {
		this.addSql(
			`alter table if exists "supplier_address" alter column "street" type text using ("street"::text);`,
		);
		this.addSql(
			`alter table if exists "supplier_address" alter column "street" set not null;`,
		);
		this.addSql(
			`alter table if exists "supplier_address" alter column "postal_code" type text using ("postal_code"::text);`,
		);
		this.addSql(
			`alter table if exists "supplier_address" alter column "postal_code" set not null;`,
		);
		this.addSql(
			`alter table if exists "supplier_address" alter column "city" type text using ("city"::text);`,
		);
		this.addSql(
			`alter table if exists "supplier_address" alter column "city" set not null;`,
		);
	}
}
