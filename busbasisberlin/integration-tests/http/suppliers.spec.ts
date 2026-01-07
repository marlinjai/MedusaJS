/**
 * suppliers.spec.ts
 * Integration tests for suppliers API endpoints
 * Tests CRUD operations, validation, pagination, and error handling
 */
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
	testSuite: ({ api }) => {
		describe('Suppliers API', () => {
			let supplierId: string;

			describe('GET /admin/suppliers', () => {
				it('should list suppliers with pagination', async () => {
					const response = await api.get('/admin/suppliers?limit=10&offset=0');

					expect(response.status).toBe(200);
					expect(response.data.suppliers).toBeDefined();
					expect(response.data.suppliers).toBeInstanceOf(Array);
					expect(response.data.count).toBeDefined();
					expect(response.data.limit).toBe(10);
					expect(response.data.offset).toBe(0);
				});

				it('should fetch suppliers with details', async () => {
					const response = await api.get(
						'/admin/suppliers?withDetails=true&limit=5',
					);

					expect(response.status).toBe(200);
					expect(response.data.suppliers).toBeDefined();
					expect(response.data.stats).toBeDefined();
					expect(response.data.stats.total).toBeGreaterThanOrEqual(0);
					expect(response.data.stats.active).toBeGreaterThanOrEqual(0);
				});

				it('should validate pagination parameters', async () => {
					try {
						await api.get('/admin/suppliers?limit=1000'); // Exceeds max
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
						expect(error.response.data.error).toBe('Validation error');
					}
				});

				it('should handle negative offset', async () => {
					try {
						await api.get('/admin/suppliers?offset=-1');
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
						expect(error.response.data.error).toBe('Validation error');
					}
				});
			});

			describe('POST /admin/suppliers', () => {
				it('should create a supplier with valid data', async () => {
					const response = await api.post('/admin/suppliers', {
						company: 'Test Supplier Integration',
						email: 'test@integration.com',
						is_active: true,
					});

					expect(response.status).toBe(201);
					expect(response.data.supplier).toBeDefined();
					expect(response.data.supplier.company).toBe('Test Supplier Integration');
					expect(response.data.supplier.id).toBeDefined();

					supplierId = response.data.supplier.id;
				});

				it('should reject supplier without company name', async () => {
					try {
						await api.post('/admin/suppliers', {
							email: 'test@fail.com',
							// Missing required company field
						});
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
						expect(error.response.data.error).toBe('Validation error');
						expect(error.response.data.details).toBeDefined();
					}
				});

				it('should validate email format', async () => {
					try {
						await api.post('/admin/suppliers', {
							company: 'Test Company',
							contacts: [{ emails: [{ email: 'invalid-email' }] }],
						});
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
						expect(error.response.data.error).toBe('Validation error');
					}
				});

				it('should validate website URL format', async () => {
					try {
						await api.post('/admin/suppliers', {
							company: 'Test Company',
							website: 'not-a-valid-url',
						});
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
					}
				});
			});

			describe('GET /admin/suppliers/:id', () => {
				it('should retrieve a supplier by ID', async () => {
					const response = await api.get(`/admin/suppliers/${supplierId}`);

					expect(response.status).toBe(200);
					expect(response.data.supplier).toBeDefined();
					expect(response.data.supplier.id).toBe(supplierId);
					expect(response.data.supplier.company).toBe('Test Supplier Integration');
				});

				it('should return 404 for non-existent supplier', async () => {
					try {
						await api.get('/admin/suppliers/supp_nonexistent');
						fail('Should have thrown 404 error');
					} catch (error) {
						expect(error.response.status).toBe(404);
					}
				});
			});

			describe('PUT /admin/suppliers/:id', () => {
				it('should update a supplier', async () => {
					const response = await api.put(`/admin/suppliers/${supplierId}`, {
						company: 'Updated Supplier Name',
						note: 'Updated via integration test',
					});

					expect(response.status).toBe(200);
					expect(response.data.supplier).toBeDefined();
					expect(response.data.supplier.company).toBe('Updated Supplier Name');
					expect(response.data.supplier.note).toBe('Updated via integration test');
				});

				it('should validate update data', async () => {
					try {
						await api.put(`/admin/suppliers/${supplierId}`, {
							website: 'invalid-url',
						});
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
					}
				});
			});

			describe('DELETE /admin/suppliers/:id', () => {
				it('should delete a supplier', async () => {
					const response = await api.delete(`/admin/suppliers/${supplierId}`);

					expect(response.status).toBe(200);
				});

				it('should return 404 when deleting non-existent supplier', async () => {
					try {
						await api.delete(`/admin/suppliers/${supplierId}`); // Already deleted
						fail('Should have thrown 404 error');
					} catch (error) {
						expect(error.response.status).toBe(404);
					}
				});
			});
		});
	},
});

