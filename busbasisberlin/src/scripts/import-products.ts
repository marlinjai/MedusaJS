/**
 * import-products.ts
 * Comprehensive script to import products from CSV with proper hierarchical categories
 * Run with: npx medusa exec ./src/scripts/import-products.ts
 */
import { ExecArgs } from '@medusajs/framework/types';
import {
	ContainerRegistrationKeys,
	Modules,
	ProductStatus,
} from '@medusajs/framework/utils';
import {
	createInventoryLevelsWorkflow,
	createProductCategoriesWorkflow,
	createProductsWorkflow,
} from '@medusajs/medusa/core-flows';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

interface ImageMapping {
	[filename: string]: {
		url: string;
		uploaded_at: string;
		size: number;
		original_path: string;
	};
}

interface ProductImageMapping {
	[artikelnummer: string]: string[];
}

// Updated interface to match actual CSV structure
interface ArticleData {
	Artikelnummer: string;
	'Interner Schlüssel': string;
	'EAN/Barcode': string;
	HAN: string;
	Artikelname: string;
	'Druck Kurzbeschreibung': string; // This is the subtitle
	'Druck Beschreibung': string; // This is the description
	Anmerkung: string;
	'Std. VK Brutto': string;
	'Std. VK Netto': string;
	'EK Netto (für GLD)': string;
	UVP: string;
	'Steuersatz in %': string;
	'Lagerbestand Gesamt': string;
	'In Aufträgen': string;
	Verfügbar: string;
	Fehlbestand: string;
	Mindestabnahme: string;
	Abnahmeintervall: string;
	Mindestlagerbestand: string;
	'Beschaffungszeit manuell ermitteln (Tage)': string;
	'Artikelgewicht in KG': string;
	Versandgewicht: string;
	Versandklasse: string;
	Breite: string;
	Höhe: string;
	Länge: string;
	Verkaufseinheit: string;
	'Inhalt/Menge': string;
	Mengeneinheit: string;
	Aktiv: string;
	Preisliste: string;
	'Top Artikel': string;
	Hersteller: string;
	Warengruppe: string;
	Sortiernummer: string;
	'UN-Nummer': string;
	Einkaufsliste: string;
	ImZulauf: string;
	'letzter Bearbeitungszeitpunkt': string;
	'Kategorie Level 1': string;
	'Kategorie Level 2': string;
	'Kategorie Level 3': string;
	'Kategorie Level 4': string;
	'Lagerbestand Standardlager': string;
	Lieferant: string;
	'Lieferanten-Art.Nr.': string;
	'Lieferanten Artikelname': string;
	'USt. in %': string;
	'EK Brutto': string;
	'EK Netto': string;
	Währung: string;
	'Lieferanten Lieferzeit': string;
	Lieferfrist: string;
	'Mindestabnahme Lieferant': string;
	'Lieferant Abnahmeintervall': string;
	Lieferantenbestand: string;
	Kommentar: string;
	'Lagerbestand zusammenführen': string;
	IstDropshippingartikel: string;
	'Lieferzeit vom Lieferanten beziehen': string;
	'Ist Standardlieferant': string;
}

interface ImageData {
	Artikelnummer: string;
	'Bild 1': string;
	'Bild 2': string;
	'Bild 3': string;
	'Bild 4': string;
	'Bild 5': string;
	'Bild 6': string;
	'Bild 7': string;
	'Bild 8': string;
	'Bild 9': string;
	'Bild 10': string;
}

// Category tree structure for hierarchical creation
interface CategoryNode {
	name: string;
	handle: string;
	level: number;
	parent?: CategoryNode;
	children: Map<string, CategoryNode>;
	id?: string; // Will be set after creation
}

// Helper function to safely get field value
const safe = (row: any, key: string) =>
	row[key] && row[key].trim() !== '' ? row[key].trim() : null;

// Helper function to create URL-safe handle with length limit
const createHandle = (name: string): string => {
	const handle = name
		.toLowerCase()
		.replace(
			/[äöüß]/g,
			char => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[char] || char,
		)
		.replace(/[^a-z0-9]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

	// Limit handle length to prevent database issues and improve readability
	// Keep first 50 characters and add hash of full string if longer
	if (handle.length > 50) {
		const hash = Math.abs(
			name.split('').reduce((a, b) => {
				a = (a << 5) - a + b.charCodeAt(0);
				return a & a;
			}, 0),
		).toString(36);
		return handle.substring(0, 45) + '-' + hash;
	}

	return handle;
};

// Build category tree from CSV data
const buildCategoryTree = (articles: any[]): CategoryNode => {
	const root = {
		name: 'root',
		handle: 'root',
		level: 0,
		children: new Map<string, CategoryNode>(),
	} as CategoryNode;

	articles.forEach(article => {
		const levels = [
			safe(article, 'Kategorie Level 1'),
			safe(article, 'Kategorie Level 2'),
			safe(article, 'Kategorie Level 3'),
			safe(article, 'Kategorie Level 4'),
		].filter(Boolean);

		let currentNode = root;
		let pathSoFar: string[] = [];

		levels.forEach((levelName, index) => {
			if (!levelName) return;

			pathSoFar.push(levelName);

			// Create handle based on full path to ensure uniqueness
			// e.g., "mercedes-motor-kuehlung" vs "bmw-motor-kuehlung"
			const handle = createHandle(pathSoFar.join('-'));

			if (!currentNode.children.has(handle)) {
				const newNode: CategoryNode = {
					name: levelName,
					handle,
					level: index + 1,
					parent: currentNode,
					children: new Map<string, CategoryNode>(),
				};
				currentNode.children.set(handle, newNode);
			}

			currentNode = currentNode.children.get(handle)!;
		});
	});

	return root;
};

// Flatten category tree for creation (breadth-first to ensure parents are created first)
const flattenCategoryTree = (root: CategoryNode): CategoryNode[] => {
	const categories: CategoryNode[] = [];
	const queue: CategoryNode[] = [];

	// Start with level 1 categories (root's children)
	root.children.forEach(child => queue.push(child));

	while (queue.length > 0) {
		const current = queue.shift()!;
		categories.push(current);

		// Add children to queue for next level
		current.children.forEach(child => queue.push(child));
	}

	return categories;
};

export default async function importProducts({ container }: ExecArgs) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
	const query = container.resolve(ContainerRegistrationKeys.QUERY);
	const productService = container.resolve(Modules.PRODUCT);
	const supplierService = container.resolve('supplier');
	const stockLocationService = container.resolve(Modules.STOCK_LOCATION);
	const salesChannelService = container.resolve(Modules.SALES_CHANNEL);

	logger.info(
		'🚀 Starting comprehensive product import with hierarchical categories...',
	);

	// Get default sales channel for product association
	let defaultSalesChannel: any = null;
	try {
		const salesChannels = await salesChannelService.listSalesChannels();
		if (salesChannels.length > 0) {
			defaultSalesChannel = salesChannels[0];
			logger.info(
				`🏪 Using sales channel: ${defaultSalesChannel.name} (${defaultSalesChannel.id})`,
			);
		} else {
			logger.error(
				'❌ No sales channels found! Products will not be visible in storefront.',
			);
			logger.info(
				'💡 Create a sales channel in the admin panel to enable product visibility.',
			);
			return;
		}
	} catch (error) {
		logger.error(`❌ Failed to fetch sales channels: ${error.message}`);
		return;
	}

	// Get first available stock location for inventory levels
	let stockLocation: any = null;
	try {
		const stockLocations = await stockLocationService.listStockLocations(
			{},
			{},
		);
		if (stockLocations.length > 0) {
			stockLocation = stockLocations[0];
			logger.info(
				`📍 Using stock location for inventory: ${stockLocation.name} (${stockLocation.id})`,
			);
		} else {
			logger.warn(
				'⚠️  No stock locations found. Products will not be linked to inventory locations.',
			);
			logger.info(
				'💡 Create a stock location in the admin panel to enable inventory tracking.',
			);
		}
	} catch (error) {
		logger.warn(`⚠️  Failed to fetch stock locations: ${error.message}`);
	}

	// File paths
	const articleCsvPath = path.resolve(
		__dirname,
		'..',
		'..',
		'..',
		'data',
		'artikeldaten started cleanup.csv',
	);
	const imageCsvPath = path.resolve(
		__dirname,
		'..',
		'..',
		'..',
		'data',
		'JTL-Wawi-Bildexport-02052025.csv',
	);
	const imageMappingPath = path.resolve(
		__dirname,
		'..',
		'..',
		'..',
		'data',
		'image-url-mapping.json',
	);

	// Check if files exist
	if (!fs.existsSync(articleCsvPath)) {
		logger.error(`❌ Article CSV not found: ${articleCsvPath}`);
		return;
	}

	if (!fs.existsSync(imageCsvPath)) {
		logger.error(`❌ Image CSV not found: ${imageCsvPath}`);
		return;
	}

	if (!fs.existsSync(imageMappingPath)) {
		logger.error(`❌ Image mapping not found: ${imageMappingPath}`);
		return;
	}

	// Load image URL mapping
	let imageMapping: ImageMapping = {};
	try {
		const mappingContent = fs.readFileSync(imageMappingPath, 'utf8');
		imageMapping = JSON.parse(mappingContent);
		logger.info(
			`📋 Loaded image mapping with ${Object.keys(imageMapping).length} entries`,
		);
	} catch (error) {
		logger.error(`❌ Failed to load image mapping: ${error.message}`);
		return;
	}

	// Parse image CSV to create product-image mapping
	logger.info('📸 Parsing image CSV...');
	const productImageMapping: ProductImageMapping = {};

	try {
		const imageCsvContent = fs.readFileSync(imageCsvPath, 'utf-8');
		const imageRecords = parse(imageCsvContent, {
			columns: true,
			delimiter: ';',
			skip_empty_lines: true,
		});

		for (const row of imageRecords) {
			const artikelnummer = safe(row, 'Artikelnummer');
			if (!artikelnummer) continue;

			const images: string[] = [];
			for (let i = 1; i <= 10; i++) {
				const imageName = safe(row, `Bild ${i}`);
				if (imageName && imageMapping[imageName]) {
					images.push(imageMapping[imageName].url);
				}
			}

			if (images.length > 0) {
				productImageMapping[artikelnummer] = images;
			}
		}

		logger.info(
			`📸 Created image mapping for ${Object.keys(productImageMapping).length} products`,
		);
	} catch (error) {
		logger.error(`❌ Failed to parse image CSV: ${error.message}`);
		return;
	}

	// Get all suppliers for mapping
	logger.info('🏢 Loading suppliers...');
	try {
		const suppliers = await supplierService.listSuppliers();
		const supplierMap = new Map();
		suppliers.forEach(supplier => {
			if (supplier.company) {
				supplierMap.set(supplier.company.toLowerCase().trim(), supplier);
			}
		});
		logger.info(`🏢 Loaded ${suppliers.length} suppliers`);

		// PHASE 1: Parse CSV and build category tree
		logger.info('📂 Phase 1: Building category tree from CSV data...');

		const articleCsvContent = fs.readFileSync(articleCsvPath, 'utf-8');
		const articles = parse(articleCsvContent, {
			columns: true,
			delimiter: ';',
			skip_empty_lines: true,
		});

		const categoryTree = buildCategoryTree(articles);
		const flatCategories = flattenCategoryTree(categoryTree);

		logger.info(
			`📂 Built category tree with ${flatCategories.length} categories across 4 levels`,
		);

		// Log category structure for verification
		const levelCounts = [0, 0, 0, 0];
		flatCategories.forEach(cat => {
			if (cat.level <= 4) levelCounts[cat.level - 1]++;
		});
		logger.info(
			`📂 Category distribution: Level 1: ${levelCounts[0]}, Level 2: ${levelCounts[1]}, Level 3: ${levelCounts[2]}, Level 4: ${levelCounts[3]}`,
		);

		// PHASE 2: Get existing categories and create hierarchy
		logger.info('📂 Phase 2: Creating hierarchical categories...');

		const existingCategories = await productService.listProductCategories();
		const existingCategoryMap = new Map();
		const existingHandleMap = new Map();

		existingCategories.forEach(category => {
			if (category.name) {
				existingCategoryMap.set(category.name.toLowerCase().trim(), category);
			}
			if (category.handle) {
				existingHandleMap.set(category.handle.toLowerCase().trim(), category);
			}
		});

		logger.info(`📂 Found ${existingCategories.length} existing categories`);

		// Create categories level by level to ensure parent-child relationships
		const categoryIdMap = new Map<string, string>(); // handle -> id mapping

		// First, map all existing categories to the ID map
		existingCategories.forEach(category => {
			if (category.handle && category.id) {
				categoryIdMap.set(category.handle, category.id);
			}
		});

		// Group categories by level for ordered creation
		const categoriesByLevel = [1, 2, 3, 4].map(level =>
			flatCategories.filter(cat => cat.level === level),
		);

		for (let level = 1; level <= 4; level++) {
			const levelCategories = categoriesByLevel[level - 1];
			if (levelCategories.length === 0) continue;

			logger.info(
				`📂 Creating Level ${level} categories (${levelCategories.length} categories)...`,
			);

			// Filter out categories that already exist (check by both handle and name)
			const newCategories = levelCategories.filter(cat => {
				const handleExists = existingHandleMap.has(cat.handle.toLowerCase());

				// For existing detection, also check if a similar category exists
				// This helps with categories that might have been created with slightly different handles
				let similarExists = false;
				if (!handleExists) {
					// Check if any existing category has the same name and parent structure
					for (const [existingHandle, existingCategory] of existingHandleMap) {
						if (existingCategory.name === cat.name) {
							// Check if parent matches (for non-root categories)
							if (cat.parent && cat.parent.level > 0) {
								const expectedParentId = categoryIdMap.get(cat.parent.handle);
								if (existingCategory.parent_category_id === expectedParentId) {
									similarExists = true;
									// Map this category to the existing one
									categoryIdMap.set(cat.handle, existingCategory.id);
									cat.id = existingCategory.id;
									break;
								}
							} else if (!existingCategory.parent_category_id) {
								// Both are root level categories with same name
								similarExists = true;
								categoryIdMap.set(cat.handle, existingCategory.id);
								cat.id = existingCategory.id;
								break;
							}
						}
					}
				}

				return !handleExists && !similarExists;
			});

			if (newCategories.length === 0) {
				logger.info(
					`📂 All Level ${level} categories already exist, skipping creation`,
				);
				// Map remaining existing categories
				levelCategories.forEach(cat => {
					if (!cat.id) {
						const existingByHandle = existingHandleMap.get(
							cat.handle.toLowerCase(),
						);
						if (existingByHandle && existingByHandle.id) {
							categoryIdMap.set(cat.handle, existingByHandle.id);
							cat.id = existingByHandle.id;
						}
					}
				});
				continue;
			}

			logger.info(
				`📂 Creating ${newCategories.length} new Level ${level} categories (${levelCategories.length - newCategories.length} already exist)...`,
			);

			// Create categories in smaller batches to avoid conflicts
			const CATEGORY_BATCH_SIZE = 10;
			for (let i = 0; i < newCategories.length; i += CATEGORY_BATCH_SIZE) {
				const batch = newCategories.slice(i, i + CATEGORY_BATCH_SIZE);

				// Prepare category data for creation
				const categoryData = batch.map(cat => ({
					name: cat.name,
					handle: cat.handle,
					is_active: true,
					parent_category_id:
						cat.parent && cat.parent.level > 0
							? categoryIdMap.get(cat.parent.handle)
							: undefined,
				}));

				try {
					// Create categories using Medusa workflow
					const categoryWorkflow = createProductCategoriesWorkflow(container);
					const { result: createdCategories } = await categoryWorkflow.run({
						input: {
							product_categories: categoryData,
						},
					});

					logger.info(
						`✅ Created batch of ${createdCategories.length} Level ${level} categories`,
					);

					// Map created category IDs
					createdCategories.forEach((created, index) => {
						const categoryNode = batch[index];
						categoryIdMap.set(categoryNode.handle, created.id);
						categoryNode.id = created.id;
					});
				} catch (error) {
					logger.error(`❌ Failed to create category batch: ${error.message}`);
					// Try to create categories individually to identify the problematic one
					for (const cat of batch) {
						try {
							const categoryWorkflow =
								createProductCategoriesWorkflow(container);
							const { result: createdCategories } = await categoryWorkflow.run({
								input: {
									product_categories: [
										{
											name: cat.name,
											handle: cat.handle,
											is_active: true,
											parent_category_id:
												cat.parent && cat.parent.level > 0
													? categoryIdMap.get(cat.parent.handle)
													: undefined,
										},
									],
								},
							});

							const created = createdCategories[0];
							categoryIdMap.set(cat.handle, created.id);
							cat.id = created.id;
							logger.info(
								`✅ Created individual category: ${cat.name} (${cat.handle})`,
							);
						} catch (individualError) {
							logger.warn(
								`⚠️  Skipped problematic category: ${cat.name} (${cat.handle}) - ${individualError.message}`,
							);
							// Check if it exists now and map it
							const refreshedCategories =
								await productService.listProductCategories();
							const found = refreshedCategories.find(
								existing =>
									existing.handle === cat.handle || existing.name === cat.name,
							);
							if (found) {
								categoryIdMap.set(cat.handle, found.id);
								cat.id = found.id;
								logger.info(
									`✅ Mapped to existing category: ${cat.name} (${found.handle})`,
								);
							}
						}
					}
				}
			}

			// Map any remaining existing categories for this level
			levelCategories.forEach(cat => {
				if (!cat.id) {
					const existingByHandle = existingHandleMap.get(
						cat.handle.toLowerCase(),
					);
					if (existingByHandle && existingByHandle.id) {
						categoryIdMap.set(cat.handle, existingByHandle.id);
						cat.id = existingByHandle.id;
					}
				}
			});
		}

		logger.info(
			`✅ Category hierarchy creation complete! Created/mapped ${categoryIdMap.size} categories`,
		);

		// After categoryIdMap is populated (after category creation, before product import)
		console.log('All category handles in categoryIdMap:');
		for (const [handle, id] of categoryIdMap.entries()) {
			console.log(`Handle: "${handle}" => ID: ${id}`);
		}

		// Show first 10 entries for debugging
		const first10Handles = Array.from(categoryIdMap.entries()).slice(0, 10);
		console.log('First 10 category handles:');
		first10Handles.forEach(([handle, id]) => {
			console.log(`  "${handle}" => ${id}`);
		});

		// PHASE 3: Product import with proper category assignment
		logger.info('📦 Phase 3: Importing products with category assignments...');
		logger.info(`📦 Parsed ${articles.length} articles from CSV`);

		// DIAGNOSTIC: Check for SKU duplicates in CSV data
		const skuCounts = new Map<string, number>();
		const skuSuppliers = new Map<string, Set<string>>();

		articles.forEach(article => {
			const sku = safe(article, 'Artikelnummer');
			const supplier = safe(article, 'Lieferant');

			if (sku) {
				skuCounts.set(sku, (skuCounts.get(sku) || 0) + 1);

				if (!skuSuppliers.has(sku)) {
					skuSuppliers.set(sku, new Set());
				}
				if (supplier) {
					skuSuppliers.get(sku)!.add(supplier);
				}
			}
		});

		const duplicateSKUs = Array.from(skuCounts.entries()).filter(
			([sku, count]) => count > 1,
		);

		if (duplicateSKUs.length > 0) {
			logger.warn(`⚠️  DUPLICATE SKU DETECTION:`);
			logger.warn(
				`⚠️  Found ${duplicateSKUs.length} SKUs with multiple CSV rows - this WILL cause "already exists" errors!`,
			);

			// Show first 5 examples
			duplicateSKUs.slice(0, 5).forEach(([sku, count]) => {
				const suppliers = Array.from(skuSuppliers.get(sku) || []);
				logger.warn(
					`⚠️  SKU "${sku}" appears ${count} times with suppliers: ${suppliers.join(', ')}`,
				);
			});

			logger.warn(
				`⚠️  Solution: We need to GROUP these rows by SKU and create ONE product with MULTIPLE supplier relationships`,
			);
		} else {
			logger.info(`✅ No duplicate SKUs detected - all products are unique`);
		}

		// GROUP ARTICLES BY SKU to handle multiple suppliers per product
		logger.info('🔀 Grouping articles by SKU to handle multiple suppliers...');
		const productGroups = new Map<string, any[]>();

		articles.forEach(article => {
			const sku = safe(article, 'Artikelnummer');
			if (!sku) {
				logger.warn(
					`⚠️  Skipping article without SKU: ${JSON.stringify(article).substring(0, 100)}...`,
				);
				return;
			}

			if (!productGroups.has(sku)) {
				productGroups.set(sku, []);
			}
			productGroups.get(sku)!.push(article);
		});

		logger.info(
			`📦 Grouped ${articles.length} CSV rows into ${productGroups.size} unique products`,
		);

		// Show grouping stats
		const multiSupplierProducts = Array.from(productGroups.entries()).filter(
			([sku, rows]) => rows.length > 1,
		);
		logger.info(
			`🔀 ${multiSupplierProducts.length} products have multiple suppliers`,
		);

		// Show examples of multi-supplier products
		multiSupplierProducts.slice(0, 5).forEach(([sku, rows]) => {
			const suppliers = rows.map(row => safe(row, 'Lieferant')).filter(Boolean);
			const uniqueSuppliers = Array.from(new Set(suppliers));
			logger.info(
				`🔀 Product "${sku}" (${safe(rows[0], 'Artikelname')}) has ${uniqueSuppliers.length} suppliers: ${uniqueSuppliers.join(', ')}`,
			);
		});

		// Convert to array for batch processing
		const productSkus = Array.from(productGroups.keys());

		// Process products in smaller batches to prevent database connection issues
		const BATCH_SIZE = 5; // Reduced from 25 to prevent connection pool exhaustion
		let successCount = 0;
		let errorCount = 0;
		let skippedCount = 0;

		for (let i = 0; i < productSkus.length; i += BATCH_SIZE) {
			const batch = productSkus.slice(i, i + BATCH_SIZE);
			const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
			const totalBatches = Math.ceil(productSkus.length / BATCH_SIZE);

			logger.info(
				`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)`,
			);

			// Process products sequentially within batch to avoid overwhelming the database
			for (const sku of batch) {
				try {
					// Validate required fields
					const productRows = productGroups.get(sku);
					if (!productRows || productRows.length === 0) {
						logger.warn(
							`⚠️  Skipping product with missing required fields: ${sku}`,
						);
						skippedCount++;
						continue;
					}

					// Use first row as base for product data
					const baseArticle = productRows[0];
					const artikelname = safe(baseArticle, 'Artikelname');

					if (!sku || !artikelname) {
						logger.warn(
							`⚠️  Skipping product with missing required fields: ${sku}`,
						);
						skippedCount++;
						continue;
					}

					// Check if product already exists
					let existingProduct: any = null;
					try {
						const [existingProducts] = await productService.listProducts({
							sku: sku,
						});
						if (
							existingProducts &&
							existingProducts.length &&
							existingProducts.length > 0
						) {
							existingProduct = existingProducts[0];
							logger.info(
								`🔄 Found existing product: ${sku} - will update with missing data`,
							);
						}
					} catch (error) {
						// Continue if check fails
					}

					// Parse pricing - handle German number format (comma as decimal separator)
					// Note: All prices should be stored in cents for consistency with Medusa
					const parsePrice = (
						priceStr: string,
						forSupplier: boolean = false,
					): number => {
						if (!priceStr) return 0;

						// Remove all non-numeric characters except comma and dot
						let cleaned = priceStr.replace(/[^\d,.-]/g, '');

						// Handle German number format: comma as decimal separator
						// Examples: "49,95" -> 49.95, "1.234,56" -> 1234.56
						if (cleaned.includes(',')) {
							// If there's both comma and dot, assume dot is thousands separator
							if (cleaned.includes('.')) {
								// Format like "1.234,56" - remove dots (thousands), replace comma with dot
								cleaned = cleaned.replace(/\./g, '').replace(',', '.');
							} else {
								// Format like "49,95" -> replace comma with dot
								cleaned = cleaned.replace(',', '.');
							}
						}

						const parsed = parseFloat(cleaned);
						if (isNaN(parsed)) return 0;

						// Always convert to cents for consistency with Medusa
						const result = Math.round(parsed * 100);

						// Debug log to verify price parsing
						console.log(
							`Price parsing: "${priceStr}" -> "${cleaned}" -> ${parsed} -> ${result} cents (${(result / 100).toFixed(2)}€)`,
						);

						return result;
					};

					// Updated field mappings to match actual CSV structure
					const nettoPrice = parsePrice(
						safe(baseArticle, 'Std. VK Netto') || '0',
						false,
					); // Customer selling price (cents)
					const bruttoPrice = parsePrice(
						safe(baseArticle, 'Std. VK Brutto') || '0',
						false,
					); // Customer selling price (cents)
					const supplierPrice = parsePrice(
						safe(baseArticle, 'EK Netto (für GLD)') || '0',
						true,
					); // Supplier purchase price (cents)

					// Parse dimensions and weight
					const parseNumber = (value: string): number => {
						const num = parseFloat(value.replace(',', '.'));
						return isNaN(num) ? 0 : num;
					};

					// Fixed: Keep weight in kilograms (don't multiply by 1000) and format to 3 decimal places
					const weightInKg = parseNumber(
						safe(baseArticle, 'Artikelgewicht in KG') || '0',
					);
					const weight = weightInKg > 0 ? parseFloat(weightInKg.toFixed(3)) : 0; // 3 decimal places for kg
					const length = parseNumber(safe(baseArticle, 'Länge') || '0');
					const width = parseNumber(safe(baseArticle, 'Breite') || '0');
					const height = parseNumber(safe(baseArticle, 'Höhe') || '0');

					// Parse stock
					const stock =
						parseInt(safe(baseArticle, 'Lagerbestand Gesamt') || '0') || 0;

					// PHASE 3A: Find the deepest available category for this product
					const categoryLevels = [
						safe(baseArticle, 'Kategorie Level 1'),
						safe(baseArticle, 'Kategorie Level 2'),
						safe(baseArticle, 'Kategorie Level 3'),
						safe(baseArticle, 'Kategorie Level 4'),
					].filter(Boolean);

					let categoryId: string | undefined = undefined;
					let categoryPath: string | null = null;

					if (categoryLevels.length > 0) {
						// Try to find the deepest category first
						for (let depth = categoryLevels.length; depth > 0; depth--) {
							const path = categoryLevels.slice(0, depth).join(' > ');
							// Create the handle that matches what was used during category creation
							// Note: buildCategoryTree uses pathSoFar.join('-') for handle creation
							const handle = createHandle(
								categoryLevels.slice(0, depth).join('-'),
							);

							if (categoryIdMap.has(handle)) {
								categoryId = categoryIdMap.get(handle);
								categoryPath = path;
								break;
							}
						}
					}

					// Get product images
					const images = productImageMapping[sku] || [];

					// Log pricing information for debugging
					logger.info(
						`💰 Product ${sku}: Selling Price (Brutto): €${(bruttoPrice / 100).toFixed(2)}, Selling Price (Netto): €${(nettoPrice / 100).toFixed(2)}, Supplier Price: €${(supplierPrice / 100).toFixed(2)}, Stock: ${stock}`,
					);

					// Log supplier information
					const supplierName = safe(baseArticle, 'Lieferant');
					const manufacturerName = safe(baseArticle, 'Hersteller');
					if (supplierName) {
						logger.info(
							`🏢 Product ${sku}: Supplier: "${supplierName}", Manufacturer: "${manufacturerName || 'N/A'}"`,
						);
					}

					// Before creating each product (inside the product import loop, before productToCreate is used)
					console.log(
						`Product: ${sku}, categoryPath: "${categoryPath}", categoryId: ${categoryId}`,
					);

					// Debug category mapping for first few products
					if (successCount < 5) {
						console.log(`🔍 Category mapping debug for ${sku}:`);
						console.log(`   Category levels: [${categoryLevels.join(', ')}]`);
						if (categoryLevels.length > 0) {
							for (let depth = categoryLevels.length; depth > 0; depth--) {
								const path = categoryLevels.slice(0, depth).join(' > ');
								const handle = createHandle(
									categoryLevels.slice(0, depth).join('-'),
								);
								const hasHandle = categoryIdMap.has(handle);
								console.log(
									`   Depth ${depth}: Path="${path}", Handle="${handle}", Found=${hasHandle}`,
								);
							}
						}
					}

					// Create product data with correct field mappings and category assignment
					const productToCreate = {
						title: safe(baseArticle, 'Artikelname'),
						subtitle: safe(baseArticle, 'Druck Kurzbeschreibung') || undefined,
						description: safe(baseArticle, 'Druck Beschreibung') || undefined,
						handle: sku
							.toLowerCase()
							.replace(/[^a-z0-9]/g, '-')
							.replace(/-+/g, '-')
							.replace(/^-|-$/g, ''),
						is_giftcard: false,
						discountable: true,
						status:
							safe(baseArticle, 'Aktiv') === 'Y'
								? ProductStatus.PUBLISHED
								: ProductStatus.DRAFT,
						thumbnail: images[0] || undefined,
						weight: weight > 0 ? weight : undefined,
						length: length > 0 ? length : undefined,
						width: width > 0 ? width : undefined,
						height: height > 0 ? height : undefined,
						material: undefined,
						mid_code: undefined,
						hs_code: undefined,
						origin_country: undefined,
						category_ids: categoryId ? [categoryId] : [],
						type_id: undefined,
						collection_id: undefined,
						tags: [],
						images: images.map((imagePath: string) => ({ url: imagePath })),
						sales_channels: [
							{
								id: defaultSalesChannel.id,
							},
						],
						options: [
							{
								title: 'Standard',
								values: [safe(baseArticle, 'Artikelname')], // Use product name as the option value
							},
						],
						variants: [
							{
								title: safe(baseArticle, 'Artikelname'),
								sku: sku, // Use the main product SKU for the single variant
								ean: safe(baseArticle, 'EAN/Barcode') || undefined,
								barcode: safe(baseArticle, 'EAN/Barcode') || undefined,
								inventory_quantity: stock,
								allow_backorder: false,
								manage_inventory: true,
								weight: weight > 0 ? weight : undefined,
								length: length > 0 ? length : undefined,
								width: width > 0 ? width : undefined,
								height: height > 0 ? height : undefined,
								material: undefined,
								metadata: {
									purchase_price: supplierPrice,
									supplier_sku: safe(baseArticle, 'Lieferanten-Art.Nr.'),
									manufacturer: safe(baseArticle, 'Hersteller'),
									internal_key: safe(baseArticle, 'Interner Schlüssel'),
									lead_time:
										parseInt(
											safe(
												baseArticle,
												'Beschaffungszeit manuell ermitteln (Tage)',
											) || '0',
										) || undefined,
									min_quantity:
										parseInt(safe(baseArticle, 'Mindestabnahme') || '1') || 1,
									unit: safe(baseArticle, 'Verkaufseinheit'),
									package_unit: safe(baseArticle, 'Mengeneinheit'),
									tax_rate: safe(baseArticle, 'Steuersatz in %'),
									category_path: categoryPath, // Store full category path
									category_level_1: safe(baseArticle, 'Kategorie Level 1'),
									category_level_2: safe(baseArticle, 'Kategorie Level 2'),
									category_level_3: safe(baseArticle, 'Kategorie Level 3'),
									category_level_4: safe(baseArticle, 'Kategorie Level 4'),
									supplier_article_name: safe(
										baseArticle,
										'Lieferanten Artikelname',
									),
									notes: safe(baseArticle, 'Anmerkung'),
									last_modified: safe(
										baseArticle,
										'letzter Bearbeitungszeitpunkt',
									),
								},
								prices: [
									{
										currency_code: 'eur', // Fixed: lowercase currency code
										amount: bruttoPrice, // Use Brutto price for customer selling price
										min_quantity: 1,
									},
								],
								options: {
									Standard: safe(baseArticle, 'Artikelname'), // Use product name as the option value
								},
							},
						],
						metadata: {
							supplier_name: supplierName,
							category_path: categoryPath, // Store full category path
							category_level_1: safe(baseArticle, 'Kategorie Level 1'),
							category_level_2: safe(baseArticle, 'Kategorie Level 2'),
							category_level_3: safe(baseArticle, 'Kategorie Level 3'),
							category_level_4: safe(baseArticle, 'Kategorie Level 4'),
							gross_price: bruttoPrice,
							net_price: nettoPrice,
							purchase_price: supplierPrice,
							min_stock:
								parseInt(safe(baseArticle, 'Mindestlagerbestand') || '0') || 0,
							original_sku: sku,
							internal_key: safe(baseArticle, 'Interner Schlüssel'),
							supplier_article_name: safe(
								baseArticle,
								'Lieferanten Artikelname',
							),
							notes: safe(baseArticle, 'Anmerkung'),
							last_modified: safe(baseArticle, 'letzter Bearbeitungszeitpunkt'),
						},
					};

					// Create or update the product
					if (existingProduct) {
						// Update existing product with missing data
						try {
							await productService.updateProducts(existingProduct.id, {
								subtitle: existingProduct.subtitle || productToCreate.subtitle,
								description:
									existingProduct.description || productToCreate.description,
								weight: existingProduct.weight || productToCreate.weight,
								length: existingProduct.length || productToCreate.length,
								width: existingProduct.width || productToCreate.width,
								height: existingProduct.height || productToCreate.height,
								category_ids: existingProduct.category_ids?.length
									? existingProduct.category_ids
									: productToCreate.category_ids,
								metadata: {
									...existingProduct.metadata,
									supplier_name:
										existingProduct.metadata?.supplier_name ||
										productToCreate.metadata?.supplier_name,
									category_path:
										existingProduct.metadata?.category_path ||
										productToCreate.metadata?.category_path,
									category_level_1:
										existingProduct.metadata?.category_level_1 ||
										productToCreate.metadata?.category_level_1,
									category_level_2:
										existingProduct.metadata?.category_level_2 ||
										productToCreate.metadata?.category_level_2,
									category_level_3:
										existingProduct.metadata?.category_level_3 ||
										productToCreate.metadata?.category_level_3,
									category_level_4:
										existingProduct.metadata?.category_level_4 ||
										productToCreate.metadata?.category_level_4,
									internal_key:
										existingProduct.metadata?.internal_key ||
										productToCreate.metadata?.internal_key,
									supplier_article_name:
										existingProduct.metadata?.supplier_article_name ||
										productToCreate.metadata?.supplier_article_name,
									notes:
										existingProduct.metadata?.notes ||
										productToCreate.metadata?.notes,
									last_modified:
										existingProduct.metadata?.last_modified ||
										productToCreate.metadata?.last_modified,
								},
							});

							logger.info(
								`✅ Updated existing product: ${sku} - ${safe(baseArticle, 'Artikelname')} (Category: ${categoryPath || 'None'})`,
							);

							// Sales channel association is handled during product creation

							// Create enhanced supplier relationships for ALL suppliers mentioned in the grouped rows
							for (const article of productRows) {
								const rowSupplierName = safe(article, 'Lieferant');
								const rowManufacturerName = safe(article, 'Hersteller');

								if (
									rowSupplierName &&
									supplierMap.has(rowSupplierName.toLowerCase())
								) {
									const supplier = supplierMap.get(
										rowSupplierName.toLowerCase(),
									);
									try {
										// Create meaningful variant name based on manufacturer and product details
										let variantName: string | null = null;
										const verkaufseinheit = safe(article, 'Verkaufseinheit');
										const supplierProductName = safe(
											article,
											'Lieferanten Artikelname',
										);

										if (
											supplierProductName &&
											supplierProductName !== safe(article, 'Artikelname')
										) {
											// Use supplier's product name if different from main product name
											variantName = supplierProductName;
										} else if (
											rowManufacturerName &&
											rowManufacturerName !== 'N/A'
										) {
											// Use manufacturer name as variant
											variantName = rowManufacturerName;
										} else if (verkaufseinheit && verkaufseinheit !== 'STK') {
											// Use sales unit if it's not standard "piece"
											variantName = verkaufseinheit;
										}

										// Parse supplier pricing with enhanced fields
										const supplierNettoPrice = parsePrice(
											safe(article, 'EK Netto') || '0',
											true,
										); // Supplier netto price (cents)
										const supplierBruttoPrice = parsePrice(
											safe(article, 'EK Brutto') || '0',
											true,
										); // Supplier brutto price (cents)
										const supplierVatRate =
											parseFloat(safe(article, 'USt. in %') || '0') || null; // Supplier VAT rate

										await supplierService.linkProductToSupplier(
											existingProduct.id,
											supplier.id,
											{
												variant_name: variantName,
												variant_description: safe(
													article,
													'Lieferanten Artikelname',
												),
												supplier_sku: safe(article, 'Lieferanten-Art.Nr.'),
												supplier_product_name: safe(
													article,
													'Lieferanten Artikelname',
												),

												// Enhanced pricing with separate netto/brutto
												supplier_price_netto: supplierNettoPrice,
												supplier_price_brutto: supplierBruttoPrice,
												supplier_vat_rate: supplierVatRate,

												supplier_lead_time:
													parseInt(
														safe(article, 'Lieferanten Lieferzeit') || '0',
													) || null,
												supplier_delivery_time:
													parseInt(safe(article, 'Lieferfrist') || '0') || null,
												supplier_min_order_qty:
													parseInt(
														safe(article, 'Mindestabnahme Lieferant') || '1',
													) || 1,
												supplier_order_interval:
													parseInt(
														safe(article, 'Lieferant Abnahmeintervall') || '0',
													) || null,
												supplier_stock:
													parseInt(
														safe(article, 'Lieferantenbestand') || '0',
													) || null,
												supplier_comment: safe(article, 'Kommentar'),
												supplier_merge_stock:
													safe(article, 'Lagerbestand zusammenführen') === 'Y',
												is_dropshipping:
													safe(article, 'IstDropshippingartikel') === 'Y',
												use_supplier_lead_time:
													safe(
														article,
														'Lieferzeit vom Lieferanten beziehen',
													) === 'Y',
												is_primary:
													safe(article, 'Ist Standardlieferant') === 'Y',
												is_active: true,
												sort_order: 0,
												notes: `Imported from CSV - Manufacturer: ${rowManufacturerName || 'Unknown'}`,
											},
										);
										logger.info(
											`🔗 Created enhanced supplier relationship: ${sku} -> ${rowSupplierName} (${variantName || 'Standard'})`,
										);
									} catch (supplierError) {
										logger.warn(
											`⚠️  Failed to create supplier relationship for ${sku}: ${supplierError.message}`,
										);
									}
								}
							}

							// Create inventory levels to link product to stock location if available
							if (stockLocation && stock > 0) {
								try {
									const productToQuery = existingProduct;

									// Get inventory items for this specific product
									const { data: productInventoryItems } = await query.graph({
										entity: 'inventory_item',
										fields: ['id', 'sku'],
									});

									// Filter to find inventory items that belong to this product's variants
									const productVariantSkus = [sku]; // Since we only create one variant per product with the main SKU
									const relevantInventoryItems = productInventoryItems.filter(
										(item: any) => productVariantSkus.includes(item.sku),
									);

									if (relevantInventoryItems.length > 0) {
										// Create inventory levels for each inventory item
										const inventoryLevels = relevantInventoryItems.map(
											(item: any) => ({
												location_id: stockLocation.id,
												stocked_quantity: stock,
												inventory_item_id: item.id,
											}),
										);

										// Use the workflow to create inventory levels
										await createInventoryLevelsWorkflow(container).run({
											input: {
												inventory_levels: inventoryLevels,
											},
										});

										logger.info(
											`📦 Created inventory level for ${sku}: ${stock} units at ${stockLocation.name}`,
										);
									} else {
										logger.warn(
											`⚠️  No inventory items found for product ${sku}`,
										);
									}
								} catch (inventoryError) {
									logger.warn(
										`⚠️  Failed to create inventory level for ${sku}: ${inventoryError.message}`,
									);
								}
							}
						} catch (updateError) {
							logger.error(
								`❌ Failed to update existing product ${sku}: ${updateError.message}`,
							);
							errorCount++;
							continue;
						}
					} else {
						// Create new product
						const workflow = createProductsWorkflow(container);
						const result = await workflow.run({
							input: {
								products: [productToCreate],
							},
						});

						const createdProduct = result.result[0];
						logger.info(
							`✅ Created new product: ${sku} - ${safe(baseArticle, 'Artikelname')} (Category: ${categoryPath || 'None'})`,
						);

						// Sales channel association is handled during product creation

						// Create enhanced supplier relationships for ALL suppliers mentioned in the grouped rows
						for (const article of productRows) {
							const rowSupplierName = safe(article, 'Lieferant');
							const rowManufacturerName = safe(article, 'Hersteller');

							if (
								rowSupplierName &&
								supplierMap.has(rowSupplierName.toLowerCase())
							) {
								const supplier = supplierMap.get(rowSupplierName.toLowerCase());
								try {
									// Create meaningful variant name based on manufacturer and product details
									let variantName: string | null = null;
									const verkaufseinheit = safe(article, 'Verkaufseinheit');
									const supplierProductName = safe(
										article,
										'Lieferanten Artikelname',
									);

									if (
										supplierProductName &&
										supplierProductName !== safe(article, 'Artikelname')
									) {
										// Use supplier's product name if different from main product name
										variantName = supplierProductName;
									} else if (
										rowManufacturerName &&
										rowManufacturerName !== 'N/A'
									) {
										// Use manufacturer name as variant
										variantName = rowManufacturerName;
									} else if (verkaufseinheit && verkaufseinheit !== 'STK') {
										// Use sales unit if it's not standard "piece"
										variantName = verkaufseinheit;
									}

									// Parse supplier pricing with enhanced fields
									const supplierNettoPrice = parsePrice(
										safe(article, 'EK Netto') || '0',
										true,
									); // Supplier netto price (cents)
									const supplierBruttoPrice = parsePrice(
										safe(article, 'EK Brutto') || '0',
										true,
									); // Supplier brutto price (cents)
									const supplierVatRate =
										parseFloat(safe(article, 'USt. in %') || '0') || null; // Supplier VAT rate

									await supplierService.linkProductToSupplier(
										createdProduct.id,
										supplier.id,
										{
											variant_name: variantName,
											variant_description: safe(
												article,
												'Lieferanten Artikelname',
											),
											supplier_sku: safe(article, 'Lieferanten-Art.Nr.'),
											supplier_product_name: safe(
												article,
												'Lieferanten Artikelname',
											),

											// Enhanced pricing with separate netto/brutto
											supplier_price_netto: supplierNettoPrice,
											supplier_price_brutto: supplierBruttoPrice,
											supplier_vat_rate: supplierVatRate,

											supplier_lead_time:
												parseInt(
													safe(article, 'Lieferanten Lieferzeit') || '0',
												) || null,
											supplier_delivery_time:
												parseInt(safe(article, 'Lieferfrist') || '0') || null,
											supplier_min_order_qty:
												parseInt(
													safe(article, 'Mindestabnahme Lieferant') || '1',
												) || 1,
											supplier_order_interval:
												parseInt(
													safe(article, 'Lieferant Abnahmeintervall') || '0',
												) || null,
											supplier_stock:
												parseInt(safe(article, 'Lieferantenbestand') || '0') ||
												null,
											supplier_comment: safe(article, 'Kommentar'),
											supplier_merge_stock:
												safe(article, 'Lagerbestand zusammenführen') === 'Y',
											is_dropshipping:
												safe(article, 'IstDropshippingartikel') === 'Y',
											use_supplier_lead_time:
												safe(article, 'Lieferzeit vom Lieferanten beziehen') ===
												'Y',
											is_primary:
												safe(article, 'Ist Standardlieferant') === 'Y',
											is_active: true,
											sort_order: 0,
											notes: `Imported from CSV - Manufacturer: ${rowManufacturerName || 'Unknown'}`,
										},
									);
									logger.info(
										`🔗 Created enhanced supplier relationship: ${sku} -> ${rowSupplierName} (${variantName || 'Standard'})`,
									);
								} catch (supplierError) {
									logger.warn(
										`⚠️  Failed to create supplier relationship for ${sku}: ${supplierError.message}`,
									);
								}
							}
						}

						// Create inventory levels to link product to stock location if available
						if (stockLocation && stock > 0) {
							try {
								const productToQuery = createdProduct;

								// Get inventory items for this specific product
								const { data: productInventoryItems } = await query.graph({
									entity: 'inventory_item',
									fields: ['id', 'sku'],
								});

								// Filter to find inventory items that belong to this product's variants
								const productVariantSkus = [sku]; // Since we only create one variant per product with the main SKU
								const relevantInventoryItems = productInventoryItems.filter(
									(item: any) => productVariantSkus.includes(item.sku),
								);

								if (relevantInventoryItems.length > 0) {
									// Create inventory levels for each inventory item
									const inventoryLevels = relevantInventoryItems.map(
										(item: any) => ({
											location_id: stockLocation.id,
											stocked_quantity: stock,
											inventory_item_id: item.id,
										}),
									);

									// Use the workflow to create inventory levels
									await createInventoryLevelsWorkflow(container).run({
										input: {
											inventory_levels: inventoryLevels,
										},
									});

									logger.info(
										`📦 Created inventory level for ${sku}: ${stock} units at ${stockLocation.name}`,
									);
								} else {
									logger.warn(
										`⚠️  No inventory items found for product ${sku}`,
									);
								}
							} catch (inventoryError) {
								logger.warn(
									`⚠️  Failed to create inventory level for ${sku}: ${inventoryError.message}`,
								);
							}
						}
					}

					successCount++;
				} catch (error) {
					logger.error(`❌ Failed to process product ${sku}: ${error.message}`);
					errorCount++;
				}

				// Small delay between individual products to prevent overwhelming the database
				await new Promise(resolve => setTimeout(resolve, 100));
			}

			// Progress report
			const processed = Math.min(i + BATCH_SIZE, productSkus.length);
			const percentage = Math.round((processed / productSkus.length) * 100);
			logger.info(
				`📈 Progress: ${processed}/${productSkus.length} (${percentage}%) - ✅ ${successCount} success, ⏭️  ${skippedCount} skipped, ❌ ${errorCount} errors`,
			);

			// Longer delay between batches to allow database to recover
			if (i + BATCH_SIZE < productSkus.length) {
				await new Promise(resolve => setTimeout(resolve, 2000)); // Increased from 500ms to 2s
			}
		}

		// PHASE 4: Final validation and reporting
		logger.info('🎉 Product import process completed!');
		logger.info(`📊 Final stats:`);
		logger.info(`   ✅ Successfully processed: ${successCount}`);
		logger.info(`   ⏭️  Skipped (existing/invalid): ${skippedCount}`);
		logger.info(`   ❌ Failed imports: ${errorCount}`);
		logger.info(`   📦 Total processed: ${productSkus.length}`);
		logger.info(`   📂 Categories created: ${categoryIdMap.size}`);

		if (successCount > 0) {
			logger.info(
				`🎯 Successfully imported ${successCount} products with proper hierarchical categories!`,
			);
			logger.info(
				`🔗 Check the Medusa admin at /app/categories to see the category hierarchy`,
			);
		}
	} catch (error) {
		logger.error(`❌ Import process failed: ${error.message}`);
		throw error;
	}
}
