/**
 * Migration20250704000000.ts
 * Add missing deleted_at columns for soft delete functionality
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20250704000000 extends Migration {
	async up(): Promise<void> {
		// Add deleted_at columns to all offer tables
		this.addSql(
			`ALTER TABLE "offer" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz NULL;`,
		);
		this.addSql(
			`ALTER TABLE "offer_item" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz NULL;`,
		);
		this.addSql(
			`ALTER TABLE "offer_status_history" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz NULL;`,
		);

		// Add indexes for soft delete performance
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_offer_deleted_at" ON "offer" (deleted_at) WHERE deleted_at IS NULL;`,
		);
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_offer_item_deleted_at" ON "offer_item" (deleted_at) WHERE deleted_at IS NULL;`,
		);
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_offer_status_history_deleted_at" ON "offer_status_history" (deleted_at) WHERE deleted_at IS NULL;`,
		);
	}

	async down(): Promise<void> {
		// Remove the indexes first
		this.addSql(`DROP INDEX IF EXISTS "IDX_offer_deleted_at";`);
		this.addSql(`DROP INDEX IF EXISTS "IDX_offer_item_deleted_at";`);
		this.addSql(`DROP INDEX IF EXISTS "IDX_offer_status_history_deleted_at";`);

		// Remove the deleted_at columns
		this.addSql(`ALTER TABLE "offer" DROP COLUMN IF EXISTS "deleted_at";`);
		this.addSql(`ALTER TABLE "offer_item" DROP COLUMN IF EXISTS "deleted_at";`);
		this.addSql(
			`ALTER TABLE "offer_status_history" DROP COLUMN IF EXISTS "deleted_at";`,
		);
	}
}
