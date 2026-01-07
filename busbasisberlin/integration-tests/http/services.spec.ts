/**
 * services.spec.ts
 * Integration tests for services API endpoints
 * Tests CRUD operations, validation, filtering, and error handling
 */
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
	testSuite: ({ api }) => {
		describe('Services API', () => {
			let serviceId: string;

			describe('GET /admin/services', () => {
				it('should list services with pagination', async () => {
					const response = await api.get('/admin/services?limit=10&offset=0');

					expect(response.status).toBe(200);
					expect(response.data.services).toBeDefined();
					expect(response.data.services).toBeInstanceOf(Array);
					expect(response.data.count).toBeDefined();
					expect(response.data.limit).toBe(10);
					expect(response.data.offset).toBe(0);
				});

				it('should filter by category', async () => {
					const response = await api.get(
						'/admin/services?category=Wartung',
					);

					expect(response.status).toBe(200);
					expect(response.data.services).toBeDefined();
				});

				it('should filter by is_active', async () => {
					const response = await api.get('/admin/services?is_active=true');

					expect(response.status).toBe(200);
					expect(response.data.services).toBeDefined();
				});

				it('should validate limit parameter', async () => {
					try {
						await api.get('/admin/services?limit=1000'); // Exceeds max
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
						expect(error.response.data.error).toBe('Validation error');
					}
				});
			});

			describe('POST /admin/services', () => {
				it('should create a service with valid data', async () => {
					const response = await api.post('/admin/services', {
						title: 'Test Service Integration',
						description: 'Integration test service',
						category: 'Wartung',
						service_type: 'Stunden',
						hourly_rate: 5000, // €50.00
						currency_code: 'EUR',
						is_active: true,
					});

					expect(response.status).toBe(201);
					expect(response.data.service).toBeDefined();
					expect(response.data.service.title).toBe('Test Service Integration');
					expect(response.data.service.id).toBeDefined();

					serviceId = response.data.service.id;
				});

				it('should reject service without title', async () => {
					try {
						await api.post('/admin/services', {
							description: 'Missing title',
						});
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
						expect(error.response.data.error).toBe('Validation error');
					}
				});

				it('should validate price as non-negative', async () => {
					try {
						await api.post('/admin/services', {
							title: 'Test Service',
							base_price: -100, // Negative price
						});
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
					}
				});

				it('should default currency_code to EUR', async () => {
					const response = await api.post('/admin/services', {
						title: 'Service Without Currency',
					});

					expect(response.status).toBe(201);
					expect(response.data.service.currency_code).toBe('EUR');
				});
			});

			describe('GET /admin/services/:id', () => {
				it('should retrieve a service by ID', async () => {
					const response = await api.get(`/admin/services/${serviceId}`);

					expect(response.status).toBe(200);
					expect(response.data.service).toBeDefined();
					expect(response.data.service.id).toBe(serviceId);
				});

				it('should return 404 for non-existent service', async () => {
					try {
						await api.get('/admin/services/serv_nonexistent');
						fail('Should have thrown 404 error');
					} catch (error) {
						expect(error.response.status).toBe(404);
					}
				});
			});

			describe('PUT /admin/services/:id', () => {
				it('should update a service', async () => {
					const response = await api.put(`/admin/services/${serviceId}`, {
						title: 'Updated Service Title',
						is_featured: true,
					});

					expect(response.status).toBe(200);
					expect(response.data.service).toBeDefined();
					expect(response.data.service.title).toBe('Updated Service Title');
					expect(response.data.service.is_featured).toBe(true);
				});
			});

			describe('DELETE /admin/services/:id', () => {
				it('should delete a service', async () => {
					const response = await api.delete(`/admin/services/${serviceId}`);

					expect(response.status).toBe(200);
				});

				it('should return 404 when deleting non-existent service', async () => {
					try {
						await api.delete(`/admin/services/${serviceId}`); // Already deleted
						fail('Should have thrown 404 error');
					} catch (error) {
						expect(error.response.status).toBe(404);
					}
				});
			});
		});
	},
});

