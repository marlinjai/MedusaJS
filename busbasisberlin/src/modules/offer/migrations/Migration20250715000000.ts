/**
 * Migration20250715000000.ts
 * Remove inventory fields from offer_item table
 *
 * This migration removes available_quantity and reserved_quantity fields
 * from the offer_item table since we now query inventory data live
 * instead of storing snapshots in the offer items.
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20250715000000 extends Migration {
	override async up(): Promise<void> {
		// Remove inventory fields from offer_item table
		this.addSql(
			`ALTER TABLE IF EXISTS "offer_item" DROP COLUMN IF EXISTS "available_quantity";`,
		);
		this.addSql(
			`ALTER TABLE IF EXISTS "offer_item" DROP COLUMN IF EXISTS "reserved_quantity";`,
		);

		// Add proper foreign key constraint for offer_id if it doesn't exist
		this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'offer_item_offer_id_fkey'
          AND table_name = 'offer_item'
        ) THEN
          ALTER TABLE "offer_item"
          ADD CONSTRAINT "offer_item_offer_id_fkey"
          FOREIGN KEY ("offer_id") REFERENCES "offer" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
	}

	override async down(): Promise<void> {
		// Add back the inventory fields (for rollback)
		this.addSql(
			`ALTER TABLE IF EXISTS "offer_item" ADD COLUMN IF NOT EXISTS "available_quantity" integer;`,
		);
		this.addSql(
			`ALTER TABLE IF EXISTS "offer_item" ADD COLUMN IF NOT EXISTS "reserved_quantity" integer DEFAULT 0;`,
		);

		// Remove the foreign key constraint
		this.addSql(
			`ALTER TABLE IF EXISTS "offer_item" DROP CONSTRAINT IF EXISTS "offer_item_offer_id_fkey";`,
		);
	}
}
