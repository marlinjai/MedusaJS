/**
 * Migration20251011132930.ts
 * Add missing variant_id column to offer_item table
 *
 * This migration adds the variant_id column that was missing from the original
 * offer_item table creation. This column is essential for inventory lookups.
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20251011132930 extends Migration {
	override async up(): Promise<void> {
		// Add variant_id column if it doesn't exist
		this.addSql(`
			ALTER TABLE IF EXISTS "offer_item"
			ADD COLUMN IF NOT EXISTS "variant_id" text NULL;
		`);

		// Add index for better performance on variant_id lookups
		this.addSql(`
			CREATE INDEX IF NOT EXISTS "IDX_offer_item_variant_id"
			ON "offer_item" ("variant_id")
			WHERE "variant_id" IS NOT NULL;
		`);
	}

	override async down(): Promise<void> {
		// Remove the index
		this.addSql(`
			DROP INDEX IF EXISTS "IDX_offer_item_variant_id";
		`);

		// Remove the variant_id column
		this.addSql(`
			ALTER TABLE IF EXISTS "offer_item"
			DROP COLUMN IF EXISTS "variant_id";
		`);
	}
}
