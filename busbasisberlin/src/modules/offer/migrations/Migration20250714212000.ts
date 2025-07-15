/**
 * Migration20250714212000.ts
 * Fix offer_status_history table - add notification_sent column and remove communication_sent
 * This migration corrects the column name mismatch between model and database
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20250714212000 extends Migration {
  async up(): Promise<void> {
    // Add the correct notification_sent column
    this.addSql(
      `ALTER TABLE "offer_status_history" ADD COLUMN IF NOT EXISTS "notification_sent" boolean NOT NULL DEFAULT false;`,
    );

    // Add the notification_method column that's also in the model
    this.addSql(`ALTER TABLE "offer_status_history" ADD COLUMN IF NOT EXISTS "notification_method" text NULL;`);

    // Add the metadata column that's also in the model
    this.addSql(`ALTER TABLE "offer_status_history" ADD COLUMN IF NOT EXISTS "metadata" text NULL;`);

    // Add the financial_impact column that's also in the model
    this.addSql(`ALTER TABLE "offer_status_history" ADD COLUMN IF NOT EXISTS "financial_impact" text NULL;`);

    // Remove the incorrect communication_sent column (optional - comment out if you want to keep it)
    this.addSql(`ALTER TABLE "offer_status_history" DROP COLUMN IF EXISTS "communication_sent";`);
  }

  async down(): Promise<void> {
    // Re-add the communication_sent column
    this.addSql(
      `ALTER TABLE "offer_status_history" ADD COLUMN IF NOT EXISTS "communication_sent" boolean NOT NULL DEFAULT false;`,
    );

    // Remove the columns we added
    this.addSql(`ALTER TABLE "offer_status_history" DROP COLUMN IF EXISTS "notification_sent";`);
    this.addSql(`ALTER TABLE "offer_status_history" DROP COLUMN IF EXISTS "notification_method";`);
    this.addSql(`ALTER TABLE "offer_status_history" DROP COLUMN IF EXISTS "metadata";`);
    this.addSql(`ALTER TABLE "offer_status_history" DROP COLUMN IF EXISTS "financial_impact";`);
  }
}
