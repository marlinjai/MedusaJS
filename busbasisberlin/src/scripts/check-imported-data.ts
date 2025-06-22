/**
 * check-imported-data.ts
 * Script to verify what data was imported from VAP system
 */
import { ExecArgs } from '@medusajs/framework/types';
import SupplierService from '../modules/supplier/service';

export default async function checkImportedData({ container }: ExecArgs) {
  console.log('🔍 Checking imported data...\n');

  const supplierService = container.resolve('supplier') as SupplierService;

  try {
    // Check suppliers
    console.log('📋 Checking suppliers...');
    const suppliers = await supplierService.listSuppliers();
    console.log(`✅ Found ${suppliers.length} suppliers`);

    if (suppliers.length > 0) {
      console.log('📝 Sample supplier data:');
      console.log(JSON.stringify(suppliers[0], null, 2));
    }

    // Check product-supplier relationships
    console.log('\n🔗 Checking product-supplier relationships...');
    const relationships = await supplierService.listProductSuppliers();
    console.log(`✅ Found ${relationships.length} product-supplier relationships`);

    if (relationships.length > 0) {
      console.log('📝 Sample relationship data:');
      console.log(JSON.stringify(relationships[0], null, 2));
    }

    // Check specific product relationships
    if (relationships.length > 0) {
      const sampleProductId = relationships[0].product_id;
      console.log(`\n🔍 Checking relationships for product ${sampleProductId}...`);
      const productRelationships = await supplierService.getSuppliersForProduct(sampleProductId);
      console.log(`✅ Found ${productRelationships.length} suppliers for this product`);
    }
  } catch (error) {
    console.error('❌ Error checking data:', error);
  }

  console.log('\n✅ Data check completed!');
}
