/**
 * Migration20250917171000.ts
 * Fix remaining supplier_price_gross column to numeric type
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20250917171000 extends Migration {
	override async up(): Promise<void> {
		// Change the remaining price column to numeric
		this.addSql(`
			ALTER TABLE "product_supplier"
			ALTER COLUMN "supplier_price_gross" TYPE NUMERIC(10,2);
		`);
	}

	override async down(): Promise<void> {
		// Revert back to integer
		this.addSql(`
			ALTER TABLE "product_supplier"
			ALTER COLUMN "supplier_price_gross" TYPE INTEGER;
		`);
	}
}
