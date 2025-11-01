// addresses/index.tsx

'use client';

import { setAddresses } from '@lib/data/cart';
import compareAddresses from '@lib/util/compare-addresses';
import { HttpTypes } from '@medusajs/types';
import { clx, Heading, Text, useToggleState } from '@medusajs/ui';
import Spinner from '@modules/common/icons/spinner';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import BillingAddress from '../billing_address';
import ErrorMessage from '../error-message';
import ShippingAddress from '../shipping-address';
import { SubmitButton } from '../submit-button';

const Addresses = ({
	cart,
	customer,
}: {
	cart: HttpTypes.StoreCart | null;
	customer: HttpTypes.StoreCustomer | null;
}) => {
	const t = useTranslations('checkout.addresses');
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	// Allow toggling address step anytime
	const isOpen =
		searchParams.get('step') === 'address' || !searchParams.get('step');

	const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
		cart?.shipping_address && cart?.billing_address
			? compareAddresses(cart?.shipping_address, cart?.billing_address)
			: true,
	);

	const handleEdit = () => {
		router.push(pathname + '?step=address');
	};

	const [message, formAction] = useActionState(setAddresses, null);

	const addressCompleted = !!(
		cart?.shipping_address &&
		cart?.billing_address &&
		cart?.email
	);

	return (
		<>
			<div
				className={clx('bg-card border rounded-lg', {
					'border-blue-500': isOpen,
					'border-green-600': !isOpen && addressCompleted,
					'border-neutral-700': !isOpen && !addressCompleted,
				})}
			>
				<button
					type="button"
					onClick={handleEdit}
					className="w-full p-6 flex items-center gap-3 text-left hover:bg-neutral-800/50 transition-colors rounded-t-lg"
				>
					<span
						className={clx(
							'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
							{
								'bg-green-600 text-white': addressCompleted,
								'bg-blue-600 text-white': !addressCompleted,
							},
						)}
					>
						{addressCompleted ? '✓' : '1'}
					</span>
					<Heading level="h2" className="text-2xl font-bold flex-1">
						{t('title')}
					</Heading>
					<span className="text-sm text-neutral-400">{isOpen ? '▼' : '▶'}</span>
				</button>
				{isOpen ? (
					<div className="px-6 pb-6">
						<form action={formAction}>
							<div className="pb-8">
								<ShippingAddress
									customer={customer}
									checked={sameAsBilling}
									onChange={toggleSameAsBilling}
									cart={cart}
								/>

								{!sameAsBilling && (
									<div>
										<Heading
											level="h2"
											className="text-3xl-regular gap-x-4 pb-6 pt-8"
										>
											{t('billingAddress')}
										</Heading>

										<BillingAddress cart={cart} />
									</div>
								)}
								<SubmitButton
									className="mt-6"
									data-testid="submit-address-button"
								>
									{t('continueToDelivery')}
								</SubmitButton>
								<ErrorMessage
									error={message}
									data-testid="address-error-message"
								/>
							</div>
						</form>
					</div>
				) : (
					<div className="px-6 pb-6">
						<div className="text-small-regular">
							{cart && cart.shipping_address ? (
								<div className="flex items-start gap-x-8">
									<div className="flex items-start gap-x-1 w-full">
										<div
											className="flex flex-col w-1/3"
											data-testid="shipping-address-summary"
										>
											<Text className="txt-medium-plus text-ui-fg-base mb-1">
												{t('shippingAddress')}
											</Text>
											<Text className="txt-medium text-ui-fg-subtle">
												{cart.shipping_address.first_name}{' '}
												{cart.shipping_address.last_name}
											</Text>
											<Text className="txt-medium text-ui-fg-subtle">
												{cart.shipping_address.address_1}{' '}
												{cart.shipping_address.address_2}
											</Text>
											<Text className="txt-medium text-ui-fg-subtle">
												{cart.shipping_address.postal_code},{' '}
												{cart.shipping_address.city}
											</Text>
											<Text className="txt-medium text-ui-fg-subtle">
												{cart.shipping_address.country_code?.toUpperCase()}
											</Text>
										</div>

										<div
											className="flex flex-col w-1/3 "
											data-testid="shipping-contact-summary"
										>
											<Text className="txt-medium-plus text-ui-fg-base mb-1">
												{t('contact')}
											</Text>
											<Text className="txt-medium text-ui-fg-subtle">
												{cart.shipping_address.phone}
											</Text>
											<Text className="txt-medium text-ui-fg-subtle">
												{cart.email}
											</Text>
										</div>

										<div
											className="flex flex-col w-1/3"
											data-testid="billing-address-summary"
										>
											<Text className="txt-medium-plus text-ui-fg-base mb-1">
												{t('billingAddress')}
											</Text>

											{sameAsBilling ? (
												<Text className="txt-medium text-ui-fg-subtle">
													{t('billingAddressSame')}
												</Text>
											) : (
												<>
													<Text className="txt-medium text-ui-fg-subtle">
														{cart.billing_address?.first_name}{' '}
														{cart.billing_address?.last_name}
													</Text>
													<Text className="txt-medium text-ui-fg-subtle">
														{cart.billing_address?.address_1}{' '}
														{cart.billing_address?.address_2}
													</Text>
													<Text className="txt-medium text-ui-fg-subtle">
														{cart.billing_address?.postal_code},{' '}
														{cart.billing_address?.city}
													</Text>
													<Text className="txt-medium text-ui-fg-subtle">
														{cart.billing_address?.country_code?.toUpperCase()}
													</Text>
												</>
											)}
										</div>
									</div>
								</div>
							) : (
								<div>
									<Spinner />
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</>
	);
};

export default Addresses;
