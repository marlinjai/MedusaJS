'use client';

import {
	Popover,
	PopoverButton,
	PopoverPanel,
	Transition,
} from '@headlessui/react';
import { convertToLocale } from '@lib/util/money';
import { HttpTypes } from '@medusajs/types';
import { Button } from '@medusajs/ui';
import DeleteButton from '@modules/common/components/delete-button';
import LineItemOptions from '@modules/common/components/line-item-options';
import LineItemPrice from '@modules/common/components/line-item-price';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import Thumbnail from '@modules/products/components/thumbnail';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Fragment, useEffect, useRef, useState } from 'react';
import { BsCart3 } from 'react-icons/bs';

const CartDropdown = ({
	cart: cartState,
}: {
	cart?: HttpTypes.StoreCart | null;
}) => {
	const t = useTranslations('cart');
	const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
		undefined,
	);
	const [cartDropdownOpen, setCartDropdownOpen] = useState(false);

	const open = () => setCartDropdownOpen(true);
	const close = () => setCartDropdownOpen(false);

	const totalItems =
		cartState?.items?.reduce((acc, item) => {
			return acc + item.quantity;
		}, 0) || 0;

	const subtotal = cartState?.subtotal ?? 0;
	const itemRef = useRef<number>(totalItems || 0);

	const timedOpen = () => {
		open();

		const timer = setTimeout(close, 5000);

		setActiveTimer(timer);
	};

	const openAndCancel = () => {
		if (activeTimer) {
			clearTimeout(activeTimer);
		}

		open();
	};

	// Clean up the timer when the component unmounts
	useEffect(() => {
		return () => {
			if (activeTimer) {
				clearTimeout(activeTimer);
			}
		};
	}, [activeTimer]);

	const pathname = usePathname();

	// open cart dropdown when modifying the cart items, but only if we're not on the cart page
	useEffect(() => {
		if (itemRef.current !== totalItems && !pathname?.includes('/cart')) {
			timedOpen();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [totalItems, itemRef.current]);

	return (
		<div
			className="h-full z-50"
			onMouseEnter={openAndCancel}
			onMouseLeave={close}
		>
			<Popover className="relative h-full">
				<PopoverButton className="h-full focus:outline-none focus-visible:outline-none">
					<div className="flex items-center gap-x-2 hover:text-white/80">
						<BsCart3 className="w-5 h-5" />
						<span>{totalItems}</span>
					</div>
				</PopoverButton>
				<Transition
					show={cartDropdownOpen}
					as={Fragment}
					enter="transition ease-out duration-200"
					enterFrom="opacity-0 translate-y-1"
					enterTo="opacity-100 translate-y-0"
					leave="transition ease-in duration-150"
					leaveFrom="opacity-100 translate-y-0"
					leaveTo="opacity-0 translate-y-1"
				>
					<PopoverPanel
						static
						className="hidden small:block absolute top-[calc(100%+8px)] right-0  rounded-lg  w-[40vw] text-white  pt-8"
						data-testid="nav-cart-dropdown"
					>
						<div className="border border-neutral-800 bg-neutral-900 rounded-lg">
							<div className="p-6 border-b border-neutral-800	 bg-neutral-900 border	">
								<h3 className="text-xl font-semibold">{t('dropdown.title')}</h3>
							</div>
							{cartState && cartState.items?.length ? (
								<>
									<div className="overflow-y-scroll max-h-[400px] p-6 grid grid-cols-1 gap-y-6 no-scrollbar">
										{cartState.items
											.sort((a, b) => {
												return (a.created_at ?? '') > (b.created_at ?? '')
													? -1
													: 1;
											})
											.map(item => (
												<div
													className="bg-neutral-800/50 rounded-lg p-4 hover:bg-neutral-800 transition-colors duration-200"
													key={item.id}
													data-testid="cart-item"
												>
													<div className="flex gap-4">
														<LocalizedClientLink
															href={`/products/${item.product_handle}`}
															className="flex-shrink-0"
														>
															<div className="w-20 h-20 rounded-md overflow-hidden bg-neutral-700">
																<Thumbnail
																	thumbnail={item.thumbnail}
																	images={item.variant?.product?.images}
																	size="square"
																/>
															</div>
														</LocalizedClientLink>
														<div className="flex flex-col justify-between flex-1 min-w-0">
															<div className="flex flex-col">
																<div className="flex items-start justify-between gap-2">
																	<div className="flex flex-col min-w-0 flex-1">
																		<h3 className="text-sm font-medium text-white truncate">
																			<LocalizedClientLink
																				href={`/products/${item.product_handle}`}
																				data-testid="product-link"
																				className="hover:text-blue-400 transition-colors"
																			>
																				{item.title}
																			</LocalizedClientLink>
																		</h3>
																		<div className="text-xs text-neutral-400 mt-1">
																			<LineItemOptions
																				variant={item.variant}
																				data-testid="cart-item-variant"
																				data-value={item.variant}
																			/>
																		</div>
																	</div>
																	<div className="flex-shrink-0 text-right">
																		<LineItemPrice
																			item={item}
																			style="tight"
																			currencyCode={cartState.currency_code}
																		/>
																	</div>
																</div>
																<div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-700">
																	<span
																		className="text-xs text-neutral-400"
																		data-testid="cart-item-quantity"
																		data-value={item.quantity}
																	>
																		{t('dropdown.quantity')}: {item.quantity}
																	</span>
																	<DeleteButton
																		id={item.id}
																		className="text-xs text-red-400 hover:text-red-300 transition-colors"
																		data-testid="cart-item-remove-button"
																	>
																		{t('dropdown.remove')}
																	</DeleteButton>
																</div>
															</div>
														</div>
													</div>
												</div>
											))}
									</div>
									<div className="p-6 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
										<div className="space-y-2 mb-4">
											{/* Subtotal */}
											<div className="flex items-center justify-between">
												<span className="text-neutral-400 text-sm">
													{t('dropdown.subtotal')}
												</span>
												<span
													className="text-base font-medium text-white"
													data-testid="cart-subtotal"
													data-value={subtotal}
												>
													{convertToLocale({
														amount: subtotal,
														currency_code: cartState.currency_code,
													})}
												</span>
											</div>

											{/* Shipping */}
											<div className="flex items-center justify-between">
												<span className="text-neutral-400 text-sm">
													Versand
												</span>
												<span className="text-base font-medium text-white">
													{cartState.shipping_methods &&
													cartState.shipping_methods.length > 0
														? convertToLocale({
																amount: cartState.shipping_total ?? 0,
																currency_code: cartState.currency_code,
														  })
														: 'Im Checkout berechnet'}
												</span>
											</div>

											{/* Tax inclusive note */}
											<div className="flex items-center justify-end pt-1">
												<span className="text-xs text-neutral-500 italic">
													Preise inkl. MwSt.
												</span>
											</div>

											{/* Total */}
											<div className="flex items-center justify-between pt-2 border-t border-neutral-700">
												<span className="text-white font-semibold">Gesamt</span>
												<span className="text-xl font-bold text-white">
													{convertToLocale({
														amount: cartState.total ?? subtotal,
														currency_code: cartState.currency_code,
													})}
												</span>
											</div>
										</div>
										
										{/* Action buttons row */}
										<div className="grid grid-cols-2 gap-3">
											<LocalizedClientLink href="/cart" passHref>
												<Button
													className="w-full bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-lg transition-colors h-12"
													size="large"
													data-testid="go-to-cart-button"
												>
													{t('dropdown.goToCart')}
												</Button>
											</LocalizedClientLink>
											
											<LocalizedClientLink href="/checkout" passHref>
												<Button
													className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors h-12"
													size="large"
													data-testid="go-to-checkout-button"
												>
													{t('dropdown.goToCheckout')}
												</Button>
											</LocalizedClientLink>
										</div>
									</div>
								</>
							) : (
								<div className="p-12">
									<div className="flex flex-col gap-y-6 items-center justify-center text-center">
										<div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
											<BsCart3 className="w-8 h-8 text-neutral-500" />
										</div>
										<div>
											<p className="text-white font-medium mb-2">
												{t('dropdown.empty.title')}
											</p>
											<p className="text-neutral-400 text-sm">
												{t('dropdown.empty.subtitle')}
											</p>
										</div>
										<LocalizedClientLink href="/store" className="w-full">
											<Button
												onClick={close}
												className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors h-12"
											>
												{t('dropdown.empty.button')}
											</Button>
										</LocalizedClientLink>
									</div>
								</div>
							)}
						</div>
					</PopoverPanel>
				</Transition>
			</Popover>
		</div>
	);
};

export default CartDropdown;
