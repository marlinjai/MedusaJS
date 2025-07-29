import { Migration } from '@mikro-orm/migrations';

export class Migration20250714185541 extends Migration {
	override async up(): Promise<void> {
		// Remove the 'title' column
		this.addSql('ALTER TABLE "offer" DROP COLUMN IF EXISTS "title";');
		// Add the auto-incrementing offer_number_seq column
		this.addSql(
			'ALTER TABLE "offer" ADD COLUMN IF NOT EXISTS "offer_number_seq" SERIAL UNIQUE NOT NULL;',
		);
	}

	override async down(): Promise<void> {
		// Re-add the 'title' column (as text, nullable for rollback safety)
		this.addSql(
			'ALTER TABLE "offer" ADD COLUMN IF NOT EXISTS "title" text NULL;',
		);
		// Remove the offer_number_seq column
		this.addSql(
			'ALTER TABLE "offer" DROP COLUMN IF EXISTS "offer_number_seq";',
		);
	}
}
