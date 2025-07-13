// busbasisberlin/src/api/admin/manual-customers/[id]/link/route.ts
// API endpoints for linking manual customers to core customers

import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import ManualCustomerService from '../../../../../modules/manual-customer/service';

interface LinkCustomerRequest {
  core_customer_id: string;
  linking_method: 'email-match' | 'manual-link' | 'phone-match' | 'name-match';
}

// Link manual customer to core customer
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const { core_customer_id, linking_method } = req.body as LinkCustomerRequest;

    if (!core_customer_id) {
      return res.status(400).json({
        message: 'core_customer_id is required',
      });
    }

    if (!linking_method) {
      return res.status(400).json({
        message: 'linking_method is required',
      });
    }

    const validLinkingMethods = ['email-match', 'manual-link', 'phone-match', 'name-match'];
    if (!validLinkingMethods.includes(linking_method)) {
      return res.status(400).json({
        message: `linking_method must be one of: ${validLinkingMethods.join(', ')}`,
      });
    }

    const manualCustomerService = req.scope.resolve('manualCustomerService') as ManualCustomerService;

    const linkedCustomer = await manualCustomerService.linkToCustomer(id, core_customer_id, linking_method);

    res.json({
      customer: linkedCustomer,
      message: 'Customer successfully linked',
    });
  } catch (error) {
    console.error('Error linking customer:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to link customer',
    });
  }
}

// Unlink manual customer from core customer
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;

    const manualCustomerService = req.scope.resolve('manualCustomerService') as ManualCustomerService;

    const unlinkedCustomer = await manualCustomerService.unlinkFromCustomer(id);

    res.json({
      customer: unlinkedCustomer,
      message: 'Customer successfully unlinked',
    });
  } catch (error) {
    console.error('Error unlinking customer:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to unlink customer',
    });
  }
}
