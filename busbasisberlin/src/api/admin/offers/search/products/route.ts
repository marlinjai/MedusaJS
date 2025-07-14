/**
 * search/products/route.ts
 * API endpoint for searching products for offer creation
 * Uses Medusa's product service to get products with basic variant info
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

interface SearchProductsQuery {
  q?: string;
  limit?: string;
  category_id?: string;
  collection_id?: string;
  status?: string;
}

export async function GET(req: MedusaRequest<SearchProductsQuery>, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    const { q = '', limit = '10', category_id, collection_id, status = 'published' } = req.query;
    const limitNum = parseInt(limit as string);

    // Get the product service using the correct Modules enum
    const productService = req.scope.resolve(Modules.PRODUCT);

    // Build search filters
    const filters: any = {};
    if (q && typeof q === 'string' && q.trim()) {
      filters.q = q.trim();
    }
    if (category_id) {
      filters.category_id = category_id;
    }
    if (collection_id) {
      filters.collection_id = collection_id;
    }
    if (status) {
      filters.status = status;
    }

    // Search products using the service
    const products = await productService.listProducts(filters, {
      take: limitNum,
      skip: 0,
    });

    // Format results for the frontend
    const formattedProducts = products.map(product => {
      const variant = product.variants?.[0];

      return {
        id: product.id,
        title: product.title,
        name: product.title, // For compatibility
        description: product.description,
        sku: variant?.sku || '',
        unit_price: 0, // Will be populated when pricing integration is ready
        currency_code: 'EUR',
        category: product.categories?.[0]?.name,
        inventory_quantity: 0, // Will be populated when inventory integration is ready
        variant_id: variant?.id,
        variant_title: variant?.title,
        // Additional product info
        handle: product.handle,
        status: product.status,
        thumbnail: product.thumbnail,
        images: product.images,
        options: product.options,
        variants_count: product.variants?.length || 0,
      };
    });

    logger.info(`Product search completed: ${formattedProducts.length} results for query "${q}"`);

    res.json({
      products: formattedProducts,
      count: formattedProducts.length,
      total: products.length,
    });
  } catch (error) {
    logger.error('Product search error:', error);
    res.status(500).json({
      error: 'Failed to search products',
      message: error.message,
    });
  }
}
