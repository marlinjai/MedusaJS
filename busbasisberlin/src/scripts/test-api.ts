/**
 * test-api.ts
 * Test script to verify the suppliers API endpoint
 */
import { ExecArgs } from '@medusajs/framework/types';
import SupplierService from '../modules/supplier/service';

export default async function testApi({ container }: ExecArgs) {
  console.log('🧪 Testing suppliers API...\n');

  const supplierService = container.resolve('supplier') as SupplierService;

  try {
    // Test direct service call
    console.log('📋 Testing direct service call...');
    const suppliers = await supplierService.listSuppliers();
    console.log(`✅ Direct service call: Found ${suppliers.length} suppliers`);

    if (suppliers.length > 0) {
      console.log('📝 First supplier:');
      console.log(`   ID: ${suppliers[0].id}`);
      console.log(`   Company: ${suppliers[0].company}`);
      console.log(`   Email: ${suppliers[0].email}`);
    }

    // Test product-supplier relationships
    console.log('\n🔗 Testing product-supplier relationships...');
    const relationships = await supplierService.listProductSuppliers();
    console.log(`✅ Found ${relationships.length} product-supplier relationships`);

    if (relationships.length > 0) {
      console.log('📝 First relationship:');
      console.log(`   Product ID: ${relationships[0].product_id}`);
      console.log(`   Supplier ID: ${relationships[0].supplier_id}`);
      console.log(`   Is Primary: ${relationships[0].is_primary}`);
      console.log(`   Supplier Price: ${relationships[0].supplier_price}`);
    }

    console.log('\n✅ API test completed successfully!');
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}
