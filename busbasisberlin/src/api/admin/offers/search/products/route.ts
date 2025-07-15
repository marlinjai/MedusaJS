/**
 * API endpoint for searching products for offer creation
 * Returns all variants for each product, including price and inventory info
 * Uses Medusa V2 Query system for correct pricing and inventory
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, getVariantAvailability } from '@medusajs/framework/utils';

interface SearchProductsQuery {
  q?: string;
  limit?: string;
  category_id?: string;
  collection_id?: string;
  status?: string;
  region_id?: string;
  currency_code?: string;
  // sales_channel_id is now hardcoded for this customer's use case
}

export async function GET(req: MedusaRequest<SearchProductsQuery>, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  try {
    const {
      q = '',
      limit = '10',
      category_id = '',
      collection_id = '',
      status = 'published',
      region_id = '',
      currency_code = 'eur',
    } = req.query as Record<string, string>;

    // Hardcoded sales channel ID for this customer's use case
    const sales_channel_id = 'sc_01JZJSF2HKJ7N6NBWBXG9YVYE8';
    const take = parseInt(limit);

    // Get the query module
    const query = req.scope.resolve('query');

    // Build search filters
    const filters: any = {};
    if (q && q.trim()) filters.q = q.trim();
    if (category_id) filters.category_id = category_id;
    if (collection_id) filters.collection_id = collection_id;
    if (status) filters.status = status;

    // Query products with variants and prices
    const useCalculatedPrice = Boolean(region_id && region_id.trim() && currency_code && currency_code.trim());

    // Build fields array conditionally
    const fields = ['*', 'variants.*', 'variants.prices.*', 'categories.*', 'options.*'];

    // Only include calculated_price if we have proper context
    if (useCalculatedPrice) {
      fields.push('variants.calculated_price.*');
    }

    const { data: products } = await query.graph({
      entity: 'product',
      fields,
      filters: filters,
      pagination: { take, skip: 0 },
      context: useCalculatedPrice
        ? {
            variants: {
              calculated_price: {
                region_id,
                currency_code,
              },
            },
          }
        : undefined,
    });

    logger.info(`[DEBUG] Found ${products.length} products for query "${q}"`);

    // Get inventory data using Medusa V2 getVariantAvailability utility
    const allVariantIds = products.flatMap((p: any) => (p.variants ? p.variants.map((v: any) => v.id) : []));
    let inventoryMap: Record<string, number> = {};

    if (allVariantIds.length > 0) {
      logger.info(
        `[DEBUG] Looking up inventory for ${allVariantIds.length} variants with hardcoded sales_channel_id: ${sales_channel_id}`,
      );

      try {
        const availability = await getVariantAvailability(query, {
          variant_ids: allVariantIds,
          sales_channel_id,
        });

        // Map variant IDs to available quantities
        inventoryMap = Object.fromEntries(
          Object.entries(availability).map(([variantId, data]: [string, any]) => [variantId, data.availability || 0]),
        );

        logger.info(`[DEBUG] Inventory map: ${JSON.stringify(inventoryMap)}`);
      } catch (error) {
        logger.error(`[DEBUG] Error getting variant availability: ${error.message}`);
        // Fallback: set all variants to 0 inventory
        allVariantIds.forEach(variantId => {
          inventoryMap[variantId] = 0;
        });
      }
    } else {
      logger.warn(`[DEBUG] No variants found. Setting inventory to 0.`);
      // Set all variants to 0 inventory when no variants found
      allVariantIds.forEach(variantId => {
        inventoryMap[variantId] = 0;
      });
    }

    // Format results for the frontend
    const formattedProducts = products.map((product: any) => {
      const variants = (product.variants || []).map((variant: any) => {
        // Prefer calculated price if available, else fallback to first price
        let price: { amount: number; currency_code: string } | null = null;
        if (variant.calculated_price && typeof variant.calculated_price.calculated_amount === 'number') {
          price = {
            amount: Math.round(variant.calculated_price.calculated_amount * 100), // Convert euros to cents
            currency_code: variant.calculated_price.currency_code,
          };
        } else if (variant.prices && variant.prices.length > 0) {
          price = {
            amount: Math.round(variant.prices[0].amount * 100), // Convert euros to cents
            currency_code: variant.prices[0].currency_code,
          };
        }
        // Log the price for debugging
        logger.info(
          `[PRICE-TRACE] Product: ${product.title} | Variant: ${variant.title} | Price amount: ${price?.amount}`,
        );
        return {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          price,
          inventory_quantity: inventoryMap[variant.id] ?? 0,
          weight: variant.weight,
          allow_backorder: variant.allow_backorder,
          manage_inventory: variant.manage_inventory,
        };
      });
      return {
        id: product.id,
        title: product.title,
        name: product.title, // For compatibility
        description: product.description,
        category: product.categories?.[0]?.name,
        handle: product.handle,
        status: product.status,
        thumbnail: product.thumbnail,
        options: product.options,
        variants,
        variants_count: variants.length,
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
