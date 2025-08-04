/**
 * Migration20250804163000.ts
 * Add pdf_url column to offer table
 */

import { Migration } from '@mikro-orm/migrations';

export class Migration20250804163000 extends Migration {
	async up(): Promise<void> {
		// Add pdf_url column to offer table
		this.addSql(`
			ALTER TABLE "offer"
			ADD COLUMN "pdf_url" TEXT;
		`);
	}

	async down(): Promise<void> {
		// Remove pdf_url column from offer table
		this.addSql(`
			ALTER TABLE "offer"
			DROP COLUMN "pdf_url";
		`);
	}
}
