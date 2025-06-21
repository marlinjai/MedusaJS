/**
 * route.ts
 * Admin API routes for managing product-supplier relationships
 * Handles GET (list suppliers for product) and POST (link supplier to product)
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SUPPLIER_MODULE } from '../../../../../modules/supplier';
import { ProductSupplier } from '../../../../../modules/supplier/models/product-supplier';
import SupplierModuleService from '../../../../../modules/supplier/service';

// GET /admin/products/[id]/suppliers - Get suppliers for a specific product
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);
  const { id: productId } = req.params;

  try {
    // Get all product-supplier relationships for this product
    const relationships = await supplierService.getSuppliersForProduct(productId);

    // For each relationship, get the supplier details
    const suppliersWithData = await Promise.all(
      relationships.map(async relationship => {
        const supplier = await supplierService.retrieveSupplier(relationship.supplier_id);
        return {
          ...relationship,
          supplier,
        };
      }),
    );

    res.json({
      relationships: suppliersWithData,
      count: suppliersWithData.length,
    });
  } catch (error) {
    console.error('Error fetching product suppliers:', error);
    res.status(500).json({
      error: 'Failed to fetch product suppliers',
      message: error.message,
    });
  }
};

// POST /admin/products/[id]/suppliers - Link a supplier to a product
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);
  const { id: productId } = req.params;

  try {
    const requestBody = req.body as { supplier_id: string } & Partial<ProductSupplier>;
    const { supplier_id, ...relationshipData } = requestBody;

    if (!supplier_id) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Supplier ID is required',
      });
    }

    // Check if supplier exists
    try {
      await supplierService.retrieveSupplier(supplier_id);
    } catch (error) {
      return res.status(404).json({
        error: 'Supplier not found',
        message: `Supplier with ID ${supplier_id} does not exist`,
      });
    }

    // Check if relationship already exists
    const existingRelationships = await supplierService.listProductSuppliers({
      product_id: productId,
      supplier_id: supplier_id,
    });

    if (existingRelationships.length > 0) {
      return res.status(409).json({
        error: 'Relationship already exists',
        message: 'This product is already linked to this supplier',
      });
    }

    // Create the relationship
    const relationship = await supplierService.linkProductToSupplier(productId, supplier_id, relationshipData);

    // Get the supplier details for the response
    const supplier = await supplierService.retrieveSupplier(supplier_id);

    res.status(201).json({
      relationship: {
        ...relationship,
        supplier,
      },
    });
  } catch (error) {
    console.error('Error linking supplier to product:', error);
    res.status(500).json({
      error: 'Failed to link supplier to product',
      message: error.message,
    });
  }
};
