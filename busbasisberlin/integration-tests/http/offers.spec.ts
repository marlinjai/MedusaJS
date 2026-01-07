/**
 * offers.spec.ts
 * Integration tests for offers API endpoints
 * Tests CRUD operations, validation, filtering, and status workflows
 */
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
	testSuite: ({ api }) => {
		describe('Offers API', () => {
			let offerId: string;
			let customerId: string;

			beforeAll(async () => {
				// Create a test customer for offers
				const customerResponse = await api.post('/admin/customers', {
					email: 'offer-test@example.com',
					first_name: 'Test',
					last_name: 'Customer',
				});
				customerId = customerResponse.data.customer.id;
			});

			describe('GET /admin/offers', () => {
				it('should list offers with pagination', async () => {
					const response = await api.get('/admin/offers?limit=10&offset=0');

					expect(response.status).toBe(200);
					expect(response.data.offers).toBeDefined();
					expect(response.data.offers).toBeInstanceOf(Array);
					expect(response.data.limit).toBe(10);
					expect(response.data.offset).toBe(0);
					expect(response.data.total).toBeDefined();
				});

				it('should filter by status', async () => {
					const response = await api.get('/admin/offers?status=draft');

					expect(response.status).toBe(200);
					expect(response.data.offers).toBeDefined();
				});

				it('should validate limit parameter', async () => {
					try {
						await api.get('/admin/offers?limit=500'); // Exceeds max
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
						expect(error.response.data.error).toBe('Validation error');
					}
				});
			});

			describe('POST /admin/offers', () => {
				it('should create an offer with valid data', async () => {
					const response = await api.post('/admin/offers', {
						customer_id: customerId,
						items: [
							{
								type: 'product',
								product_id: 'prod_test',
								variant_id: 'variant_test',
								quantity: 2,
								unit_price: 1000,
							},
						],
						currency_code: 'EUR',
					});

					expect(response.status).toBe(201);
					expect(response.data.offer).toBeDefined();
					expect(response.data.offer.offer_number).toMatch(/ANG-\d{5}/);
					expect(response.data.offer.status).toBe('draft');

					offerId = response.data.offer.id;
				});

				it('should reject offer without items', async () => {
					try {
						await api.post('/admin/offers', {
							customer_id: customerId,
							items: [], // Empty items array
						});
						fail('Should have thrown validation error');
					} catch (error) {
						expect(error.response.status).toBe(400);
					}
				});
			});

			describe('GET /admin/offers/:id', () => {
				it('should retrieve an offer by ID', async () => {
					const response = await api.get(`/admin/offers/${offerId}`);

					expect(response.status).toBe(200);
					expect(response.data.offer).toBeDefined();
					expect(response.data.offer.id).toBe(offerId);
					expect(response.data.offer.offer_number).toMatch(/ANG-\d{5}/);
				});

				it('should return 404 for non-existent offer', async () => {
					try {
						await api.get('/admin/offers/offer_nonexistent');
						fail('Should have thrown 404 error');
					} catch (error) {
						expect(error.response.status).toBe(404);
					}
				});
			});

			describe('PUT /admin/offers/:id', () => {
				it('should update an offer', async () => {
					const response = await api.put(`/admin/offers/${offerId}`, {
						customer_notes: 'Updated notes via integration test',
					});

					expect(response.status).toBe(200);
					expect(response.data.offer).toBeDefined();
					expect(response.data.offer.customer_notes).toBe(
						'Updated notes via integration test',
					);
				});
			});

			describe('DELETE /admin/offers/:id', () => {
				it('should delete an offer', async () => {
					const response = await api.delete(`/admin/offers/${offerId}`);

					expect(response.status).toBe(200);
				});

				it('should return 404 when deleting non-existent offer', async () => {
					try {
						await api.delete(`/admin/offers/${offerId}`); // Already deleted
						fail('Should have thrown 404 error');
					} catch (error) {
						expect(error.response.status).toBe(404);
					}
				});
			});
		});
	},
});

