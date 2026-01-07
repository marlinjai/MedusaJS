/**
 * manual-customers.spec.ts
 * Integration tests for manual customers API endpoints
 * Tests CRUD operations, validation, search, and filtering
 */
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
	testSuite: ({ api }) => {
		describe('Manual Customers API', () => {
			let customerId: string;

			describe('GET /admin/manual-customers', () => {
				it('should list manual customers with pagination', async () => {
					const response = await api.get(
						'/admin/manual-customers?limit=10&offset=0',
					);

					expect(response.status).toBe(200);
					expect(response.data.customers).toBeDefined();
					expect(response.data.customers).toBeInstanceOf(Array);
					expect(response.data.limit).toBe(10);
					expect(response.data.offset).toBe(0);
					expect(response.data.total).toBeDefined();
				});

				it('should filter by customer_type', async () => {
					const response = await api.get(
						'/admin/manual-customers?customer_type=business',
					);

					expect(response.status).toBe(200);
					expect(response.data.customers).toBeDefined();
				});

				it('should filter by status', async () => {
					const response = await api.get('/admin/manual-customers?status=active');

					expect(response.status).toBe(200);
					expect(response.data.customers).toBeDefined();
				});

				it('should search customers', async () => {
					const response = await api.get(
						'/admin/manual-customers?search=test',
					);

					expect(response.status).toBe(200);
					expect(response.data.customers).toBeDefined();
				});

				it('should validate pagination parameters', async () => {
					try {
						await api.get('/admin/manual-customers?limit=500'); // Exceeds max
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
						expect(error.response.data.error).toBe('Validation error');
					}
				});
			});

			describe('POST /admin/manual-customers', () => {
				it('should create a manual customer with valid data', async () => {
					const response = await api.post('/admin/manual-customers', {
						first_name: 'Test',
						last_name: 'Customer',
						email: 'test-manual@example.com',
						customer_type: 'individual',
						status: 'active',
					});

					expect(response.status).toBe(201);
					expect(response.data.customer).toBeDefined();
					expect(response.data.customer.first_name).toBe('Test');
					expect(response.data.customer.email).toBe('test-manual@example.com');
					expect(response.data.customer.customer_number).toBeDefined();

					customerId = response.data.customer.id;
				});

				it('should validate email format', async () => {
					try {
						await api.post('/admin/manual-customers', {
							first_name: 'Test',
							email: 'invalid-email',
						});
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
						expect(error.response.data.error).toBe('Validation error');
					}
				});

				it('should validate website URL format', async () => {
					try {
						await api.post('/admin/manual-customers', {
							first_name: 'Test',
							website: 'not-a-url',
						});
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
					}
				});
			});

			describe('GET /admin/manual-customers/:id', () => {
				it('should retrieve a manual customer by ID', async () => {
					const response = await api.get(`/admin/manual-customers/${customerId}`);

					expect(response.status).toBe(200);
					expect(response.data.customer).toBeDefined();
					expect(response.data.customer.id).toBe(customerId);
				});

				it('should return 404 for non-existent customer', async () => {
					try {
						await api.get('/admin/manual-customers/mcust_nonexistent');
						fail('Should have thrown 404 error');
					} catch (error) {
						expect(error.response.status).toBe(404);
					}
				});
			});

			describe('PUT /admin/manual-customers/:id', () => {
				it('should update a manual customer', async () => {
					const response = await api.put(`/admin/manual-customers/${customerId}`, {
						last_name: 'Updated Last Name',
						phone: '+49 30 12345678',
					});

					expect(response.status).toBe(200);
					expect(response.data.customer).toBeDefined();
					expect(response.data.customer.last_name).toBe('Updated Last Name');
				});
			});

			describe('DELETE /admin/manual-customers/:id', () => {
				it('should delete a manual customer', async () => {
					const response = await api.delete(
						`/admin/manual-customers/${customerId}`,
					);

					expect(response.status).toBe(200);
				});

				it('should return 404 when deleting non-existent customer', async () => {
					try {
						await api.delete(`/admin/manual-customers/${customerId}`); // Already deleted
						fail('Should have thrown 404 error');
					} catch (error) {
						expect(error.response.status).toBe(404);
					}
				});
			});
		});
	},
});

