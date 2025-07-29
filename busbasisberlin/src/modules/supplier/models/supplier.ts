/**
 * supplier.ts
 * Defines the supplier model using Medusa's data modeling language (DML)
 * Updated to match JTL VAP system export structure
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const supplier = model.define('supplier', {
	id: model.id().primaryKey(),

	// Basic identification
	supplier_number: model.text().nullable(), // Lieferantennummer
	customer_number: model.text().nullable(), // Eigene Kd-Nr
	internal_key: model.text().nullable(), // Interner Schlüssel

	// Company details
	company: model.text(), // Firma
	company_addition: model.text().nullable(), // Firmenzusatz

	// Business details
	vat_id: model.text().nullable(), // UstID
	status: model.text().default('active').nullable(), // Status
	is_active: model.boolean().default(true), // Aktiv
	language: model.text().default('Deutsch').nullable(), // Sprache
	lead_time: model.number().nullable(), // Lieferzeit (in days)

	// Web & notes
	website: model.text().nullable(), // WWW
	note: model.text().nullable(), // Anmerkung

	// Bank details
	bank_name: model.text().nullable(), // BankName
	bank_code: model.text().nullable(), // BLZ
	account_number: model.text().nullable(), // KontoNr
	account_holder: model.text().nullable(), // Inhaber
	iban: model.text().nullable(), // IBAN
	bic: model.text().nullable(), // BIC
});

export type Supplier = InferTypeOf<typeof supplier>;

export default supplier;
