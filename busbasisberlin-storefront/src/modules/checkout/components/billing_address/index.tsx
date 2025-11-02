import { HttpTypes } from '@medusajs/types';
import Input from '@modules/common/components/input';
import { useTranslations } from 'next-intl';
import React, { useState, useCallback, useEffect } from 'react';
import CountrySelect from '../country-select';
import { updateCart } from '@lib/data/cart';

const BillingAddress = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
	const t = useTranslations('checkout.addresses');
	const [formData, setFormData] = useState<any>({
		'billing_address.first_name': cart?.billing_address?.first_name || '',
		'billing_address.last_name': cart?.billing_address?.last_name || '',
		'billing_address.address_1': cart?.billing_address?.address_1 || '',
		'billing_address.company': cart?.billing_address?.company || '',
		'billing_address.postal_code': cart?.billing_address?.postal_code || '',
		'billing_address.city': cart?.billing_address?.city || '',
		'billing_address.country_code': cart?.billing_address?.country_code || '',
		'billing_address.province': cart?.billing_address?.province || '',
		'billing_address.phone': cart?.billing_address?.phone || '',
	});

	// Debounced save to cart - auto-saves 800ms after user stops typing
	const saveBillingToCart = useCallback(async (data: Record<string, any>) => {
		try {
			const updateData: any = {
				billing_address: {
					first_name: data['billing_address.first_name'],
					last_name: data['billing_address.last_name'],
					address_1: data['billing_address.address_1'],
					company: data['billing_address.company'],
					postal_code: data['billing_address.postal_code'],
					city: data['billing_address.city'],
					country_code: data['billing_address.country_code'],
					province: data['billing_address.province'],
					phone: data['billing_address.phone'],
				},
			};

			await updateCart(updateData);
		} catch (error) {
			console.error('Failed to save billing address:', error);
		}
	}, []);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			// @ts-ignore
			if (typeof window !== 'undefined' && window.billingAddressSaveTimeout) {
				// @ts-ignore
				clearTimeout(window.billingAddressSaveTimeout);
			}
		};
	}, []);

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLInputElement | HTMLSelectElement
		>,
	) => {
		const newFormData = {
			...formData,
			[e.target.name]: e.target.value,
		};
		setFormData(newFormData);

		// Debounce the save - only save 800ms after user stops typing
		if (typeof window !== 'undefined') {
			// @ts-ignore
			if (window.billingAddressSaveTimeout)
				// @ts-ignore
				clearTimeout(window.billingAddressSaveTimeout);
			// @ts-ignore
			window.billingAddressSaveTimeout = setTimeout(() => {
				saveBillingToCart(newFormData);
			}, 800);
		}
	};

	return (
		<>
			<div className="grid grid-cols-2 gap-4">
				<Input
					label={t('firstName')}
					name="billing_address.first_name"
					autoComplete="given-name"
					value={formData['billing_address.first_name']}
					onChange={handleChange}
					required
					data-testid="billing-first-name-input"
				/>
				<Input
					label={t('lastName')}
					name="billing_address.last_name"
					autoComplete="family-name"
					value={formData['billing_address.last_name']}
					onChange={handleChange}
					required
					data-testid="billing-last-name-input"
				/>
				<Input
					label={t('address')}
					name="billing_address.address_1"
					autoComplete="address-line1"
					value={formData['billing_address.address_1']}
					onChange={handleChange}
					required
					data-testid="billing-address-input"
				/>
				<Input
					label={t('company')}
					name="billing_address.company"
					value={formData['billing_address.company']}
					onChange={handleChange}
					autoComplete="organization"
					data-testid="billing-company-input"
				/>
				<Input
					label={t('postalCode')}
					name="billing_address.postal_code"
					autoComplete="postal-code"
					value={formData['billing_address.postal_code']}
					onChange={handleChange}
					required
					data-testid="billing-postal-input"
				/>
				<Input
					label={t('city')}
					name="billing_address.city"
					autoComplete="address-level2"
					value={formData['billing_address.city']}
					onChange={handleChange}
					required
					data-testid="billing-city-input"
				/>
				<CountrySelect
					name="billing_address.country_code"
					autoComplete="country"
					region={cart?.region}
					value={formData['billing_address.country_code']}
					onChange={handleChange}
					required
					data-testid="billing-country-select"
				/>
				<Input
					label={t('province')}
					name="billing_address.province"
					autoComplete="address-level1"
					value={formData['billing_address.province']}
					onChange={handleChange}
					data-testid="billing-province-input"
				/>
				<Input
					label={t('phone')}
					name="billing_address.phone"
					autoComplete="tel"
					value={formData['billing_address.phone']}
					onChange={handleChange}
					data-testid="billing-phone-input"
				/>
			</div>
		</>
	);
};

export default BillingAddress;
