import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SUPPLIER_MODULE } from '../modules/supplier';
import { Supplier } from '../modules/supplier/models/supplier';
import SupplierModuleService from '../modules/supplier/service';

type CreateSupplierWorkflowInput = {
  company: string;
};

const createSupplierStep = createStep(
  'create-supplier',
  async ({ company }: CreateSupplierWorkflowInput, { container }) => {
    const SupplierModuleService: SupplierModuleService = container.resolve(SUPPLIER_MODULE);

    const supplier = await SupplierModuleService.createSuppliers({
      company,
    });

    return new StepResponse(supplier, supplier);
  },
  async (supplier: Supplier, { container }) => {
    const SupplierModuleService: SupplierModuleService = container.resolve(SUPPLIER_MODULE);

    await SupplierModuleService.deleteSuppliers(supplier!.id);
  },
);

export const createSupplierWorkflow = createWorkflow(
  'create-supplier',
  (supplierInput: CreateSupplierWorkflowInput) => {
    const supplier = createSupplierStep(supplierInput);

    return new WorkflowResponse(supplier);
  },
);
