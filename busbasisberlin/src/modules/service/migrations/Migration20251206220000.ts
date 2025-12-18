import { Migration } from '@mikro-orm/migrations';

/**
 * Migration20251206220000.ts
 * Add category hierarchy and service_code fields to existing service table
 */
export class Migration20251206220000 extends Migration {
	override async up(): Promise<void> {
		// Add new columns to existing service table
		this.addSql(`
			ALTER TABLE "service"
			ADD COLUMN IF NOT EXISTS "service_code" text null,
			ADD COLUMN IF NOT EXISTS "category_level_1" text null,
			ADD COLUMN IF NOT EXISTS "category_level_2" text null,
			ADD COLUMN IF NOT EXISTS "category_level_3" text null,
			ADD COLUMN IF NOT EXISTS "category_level_4" text null;
		`);

		// Add indexes for category fields
		this.addSql(`
			CREATE INDEX IF NOT EXISTS "IDX_service_category_level_1"
			ON "service" ("category_level_1")
			WHERE deleted_at IS NULL;
		`);

		this.addSql(`
			CREATE INDEX IF NOT EXISTS "IDX_service_category_level_2"
			ON "service" ("category_level_2")
			WHERE deleted_at IS NULL;
		`);
	}

	override async down(): Promise<void> {
		// Drop indexes
		this.addSql(`DROP INDEX IF EXISTS "IDX_service_category_level_2";`);
		this.addSql(`DROP INDEX IF EXISTS "IDX_service_category_level_1";`);

		// Drop columns
		this.addSql(`
			ALTER TABLE "service"
			DROP COLUMN IF EXISTS "service_code",
			DROP COLUMN IF EXISTS "category_level_1",
			DROP COLUMN IF EXISTS "category_level_2",
			DROP COLUMN IF EXISTS "category_level_3",
			DROP COLUMN IF EXISTS "category_level_4";
		`);
	}
}


