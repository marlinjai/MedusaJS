import { Migration } from '@mikro-orm/migrations';

/**
 * Migration20250108000000.ts
 * Add full-text search indexes to manual_customer table for better search performance
 * Optimizes search across name, company, email, phone fields
 */
export class Migration20250108000000 extends Migration {
	override async up(): Promise<void> {
		// Add GIN indexes for text search using pg_trgm extension (trigram similarity)
		// This enables fast ILIKE queries and fuzzy matching

		// Ensure pg_trgm extension is enabled
		this.addSql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

		// Create GIN index for company name (most searched field for businesses)
		this.addSql(`
			CREATE INDEX IF NOT EXISTS "IDX_manual_customer_company_trgm"
			ON "manual_customer" USING gin (company gin_trgm_ops)
			WHERE deleted_at IS NULL;
		`);

		// Create GIN index for first_name + last_name combined search
		this.addSql(`
			CREATE INDEX IF NOT EXISTS "IDX_manual_customer_fullname_trgm"
			ON "manual_customer" USING gin (
				(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) gin_trgm_ops
			)
			WHERE deleted_at IS NULL;
		`);

		// Create GIN index for email search
		this.addSql(`
			CREATE INDEX IF NOT EXISTS "IDX_manual_customer_email_trgm"
			ON "manual_customer" USING gin (email gin_trgm_ops)
			WHERE deleted_at IS NULL;
		`);

		// Create GIN index for phone search
		this.addSql(`
			CREATE INDEX IF NOT EXISTS "IDX_manual_customer_phone_trgm"
			ON "manual_customer" USING gin (phone gin_trgm_ops)
			WHERE deleted_at IS NULL;
		`);

		// Create GIN index for mobile search
		this.addSql(`
			CREATE INDEX IF NOT EXISTS "IDX_manual_customer_mobile_trgm"
			ON "manual_customer" USING gin (mobile gin_trgm_ops)
			WHERE deleted_at IS NULL;
		`);

		// Create GIN index for city search
		this.addSql(`
			CREATE INDEX IF NOT EXISTS "IDX_manual_customer_city_trgm"
			ON "manual_customer" USING gin (city gin_trgm_ops)
			WHERE deleted_at IS NULL;
		`);

		// Create composite index for status + type (commonly filtered together)
		// This already exists but ensuring it's optimal
		this.addSql(`
			CREATE INDEX IF NOT EXISTS "IDX_manual_customer_status_type_active"
			ON "manual_customer" (status, customer_type)
			WHERE deleted_at IS NULL AND status = 'active';
		`);
	}

	override async down(): Promise<void> {
		// Drop the trigram indexes
		this.addSql(`DROP INDEX IF EXISTS "IDX_manual_customer_company_trgm";`);
		this.addSql(`DROP INDEX IF EXISTS "IDX_manual_customer_fullname_trgm";`);
		this.addSql(`DROP INDEX IF EXISTS "IDX_manual_customer_email_trgm";`);
		this.addSql(`DROP INDEX IF EXISTS "IDX_manual_customer_phone_trgm";`);
		this.addSql(`DROP INDEX IF EXISTS "IDX_manual_customer_mobile_trgm";`);
		this.addSql(`DROP INDEX IF EXISTS "IDX_manual_customer_city_trgm";`);
		this.addSql(
			`DROP INDEX IF EXISTS "IDX_manual_customer_status_type_active";`,
		);
	}
}

