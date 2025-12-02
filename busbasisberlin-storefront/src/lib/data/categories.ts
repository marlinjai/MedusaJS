import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const listCategories = async (query?: Record<string, any>) => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "*category_children, *products, *parent_category, *parent_category.parent_category",
          limit,
          ...query,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
  }

  // Fetch the main category
  const category = await sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products",
          handle,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories[0])

  // If category has children, fetch ALL active, non-internal subcategories separately
  // This bypasses Medusa's built-in sales channel filtering on category_children
  if (category && category.id) {
    const allSubcategories = await sdk.client
      .fetch<HttpTypes.StoreProductCategoryListResponse>(
        `/store/product-categories`,
        {
          query: {
            fields: "id,name,handle,is_active,is_internal,parent_category_id",
            parent_category_id: category.id,
            is_active: true,
            is_internal: false,
            limit: 100,
          },
          next,
          cache: "force-cache",
        }
      )
      .then(({ product_categories }) => product_categories)

    // Replace the category_children with ALL active, non-internal subcategories
    if (allSubcategories && allSubcategories.length > 0) {
      category.category_children = allSubcategories
    }
  }

  return category
}
