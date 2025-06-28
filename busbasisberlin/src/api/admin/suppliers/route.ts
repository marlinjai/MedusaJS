/**
 * route.ts
 * Admin API routes for supplier management
 * Updated to work with the new relational structure (ContactPhone, ContactEmail models)
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SUPPLIER_MODULE } from '../../../modules/supplier';
import { Contact } from '../../../modules/supplier/models/contact';
import { SupplierAddress } from '../../../modules/supplier/models/supplier-address';
import SupplierModuleService from '../../../modules/supplier/service';

interface ContactData extends Partial<Contact> {
  phones?: Array<{ number?: string; label?: string }>;
  emails?: Array<{ email?: string; label?: string }>;
}

interface CreateSupplierData {
  // Core supplier fields
  company: string;
  company_addition?: string;
  supplier_number?: string;
  customer_number?: string;
  internal_key?: string;
  website?: string;
  vat_id?: string;
  status?: string;
  is_active?: boolean;
  language?: string;
  lead_time?: number;
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  account_holder?: string;
  iban?: string;
  bic?: string;
  note?: string;

  // Related data
  contacts?: ContactData[];
  addresses?: Partial<SupplierAddress>[];
}

// GET /admin/suppliers - List all suppliers
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);

  try {
    const suppliers = await supplierService.listSuppliers();

    res.json({
      suppliers,
      count: suppliers.length,
      offset: 0,
      limit: suppliers.length,
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      error: 'Failed to fetch suppliers',
      message: error.message,
    });
  }
};

// POST /admin/suppliers - Create a new supplier with full relational structure
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);

  try {
    const data = req.body as CreateSupplierData;
    console.log('Received supplier data:', JSON.stringify(data, null, 2));

    // Validate required fields
    if (!data.company) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Company name is required',
      });
    }

    // Extract supplier data (remove contacts/addresses)
    const { contacts, addresses, ...supplierData } = data;
    console.log('Supplier data to create:', JSON.stringify(supplierData, null, 2));

    // Create the supplier first
    const createdSuppliers = await supplierService.createSuppliers([supplierData]);
    console.log('Created suppliers:', createdSuppliers);

    if (!createdSuppliers || createdSuppliers.length === 0) {
      return res.status(500).json({ error: 'Supplier creation failed' });
    }

    const createdSupplier = createdSuppliers[0];
    console.log('Created supplier ID:', createdSupplier.id);

    // Create contacts and their related phones/emails
    if (contacts && contacts.length > 0) {
      for (const contactData of contacts) {
        const { phones, emails, ...contactFields } = contactData;

        // Create the contact
        const createdContacts = await supplierService.createContacts([
          {
            ...contactFields,
            supplier_id: createdSupplier.id,
          },
        ]);

        if (createdContacts && createdContacts.length > 0) {
          const createdContact = createdContacts[0];

          // Create phone numbers for this contact
          if (phones && phones.length > 0) {
            for (const phone of phones) {
              if (phone.number) {
                await supplierService.createContactPhones([
                  {
                    contact_id: createdContact.id,
                    number: phone.number,
                    label: phone.label || undefined,
                  },
                ]);
              }
            }
          }

          // Create email addresses for this contact
          if (emails && emails.length > 0) {
            for (const email of emails) {
              if (email.email) {
                await supplierService.createContactEmails([
                  {
                    contact_id: createdContact.id,
                    email: email.email,
                    label: email.label || undefined,
                  },
                ]);
              }
            }
          }
        }
      }
    }

    // Create addresses
    if (addresses && addresses.length > 0) {
      for (const addressData of addresses) {
        await supplierService.createSupplierAddresses([
          {
            ...addressData,
            supplier_id: createdSupplier.id,
          },
        ]);
      }
    }

    // Get the complete supplier with details
    const supplierWithDetails = await supplierService.getSupplierWithDetails(createdSupplier.id);

    res.status(201).json({
      supplier: supplierWithDetails,
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      error: 'Failed to create supplier',
      message: error.message,
    });
  }
};
