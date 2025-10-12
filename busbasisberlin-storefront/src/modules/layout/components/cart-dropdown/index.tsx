// src/modules/layout/components/cart-dropdown/index.tsx
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
import { usePathname } from 'next/navigation';
import { Fragment, useEffect, useRef, useState } from 'react';
import { BsCart3, BsTrash } from 'react-icons/bs';

const CartDropdown = ({
	cart: cartState,
}: {
	cart?: HttpTypes.StoreCart | null;
}) => {
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
		if (itemRef.current !== totalItems && !pathname.includes('/cart')) {
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
				<PopoverButton className="h-full">
					<div className="flex items-center gap-x-2 hover:text-white/80 transition-all duration-200 relative">
						<BsCart3 className="w-5 h-5" />
						{totalItems > 0 && (
							<span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium animate-pulse">
								{totalItems}
							</span>
						)}
						<span className="hidden md:inline">Warenkorb</span>
					</div>
				</PopoverButton>
				<Transition
					show={cartDropdownOpen}
					as={Fragment}
					enter="transition ease-out duration-300"
					enterFrom="opacity-0 translate-y-2 scale-95"
					enterTo="opacity-100 translate-y-0 scale-100"
					leave="transition ease-in duration-200"
					leaveFrom="opacity-100 translate-y-0 scale-100"
					leaveTo="opacity-0 translate-y-2 scale-95"
				>
					<PopoverPanel
						static
						className="hidden small:block absolute top-[calc(100%+8px)] right-0 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl backdrop-blur-sm w-[440px] text-white overflow-hidden"
						data-testid="nav-cart-dropdown"
					>
						<div className="p-6 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-neutral-900">
							<h3 className="text-xl font-semibold text-white flex items-center gap-2">
								<BsCart3 className="w-5 h-5 text-blue-400" />
								Warenkorb
								{totalItems > 0 && (
									<span className="bg-blue-500 text-white text-sm px-2 py-1 rounded-full">
										{totalItems}
									</span>
								)}
							</h3>
						</div>
						{cartState && cartState.items?.length ? (
							<>
								<div className="overflow-y-auto max-h-[400px] px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
									{cartState.items
										.sort((a, b) => {
											return (a.created_at ?? '') > (b.created_at ?? '')
												? -1
												: 1;
										})
										.map(item => (
											<div
												className="flex gap-4 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/50 hover:border-neutral-600 transition-all duration-200 group"
												key={item.id}
												data-testid="cart-item"
											>
												<LocalizedClientLink
													href={`/products/${item.product_handle}`}
													className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-neutral-700 hover:scale-105 transition-transform duration-200"
												>
													<Thumbnail
														thumbnail={item.thumbnail}
														images={item.variant?.product?.images}
														size="square"
													/>
												</LocalizedClientLink>
												<div className="flex-1 min-w-0">
													<div className="flex justify-between items-start mb-2">
														<div className="min-w-0 flex-1 mr-3">
															<h3 className="text-white font-medium text-sm truncate group-hover:text-blue-300 transition-colors">
																<LocalizedClientLink
																	href={`/products/${item.product_handle}`}
																	data-testid="product-link"
																>
																	{item.title}
																</LocalizedClientLink>
															</h3>
															<LineItemOptions
																variant={item.variant}
																data-testid="cart-item-variant"
																data-value={item.variant}
															/>
															<div className="flex items-center gap-2 mt-1">
																<span className="text-neutral-400 text-xs">
																	Menge: {item.quantity}
																</span>
															</div>
														</div>
														<div className="text-right">
															<LineItemPrice
																item={item}
																style="tight"
																currencyCode={cartState.currency_code}
															/>
														</div>
													</div>
													<div className="flex justify-between items-center">
														<DeleteButton
															id={item.id}
															className="text-neutral-400 hover:text-red-400 transition-colors text-xs flex items-center gap-1"
															data-testid="cart-item-remove-button"
														>
															<BsTrash className="w-3 h-3" />
															Entfernen
														</DeleteButton>
													</div>
												</div>
											</div>
										))}
								</div>
								<div className="p-6 border-t border-neutral-700 bg-gradient-to-r from-neutral-800 to-neutral-900 space-y-4">
									<div className="flex items-center justify-between">
										<span className="text-white font-semibold">
											Zwischensumme{' '}
											<span className="font-normal text-neutral-400 text-sm">
												(exkl. MwSt.)
											</span>
										</span>
										<span
											className="text-xl font-bold text-blue-400"
											data-testid="cart-subtotal"
											data-value={subtotal}
										>
											{convertToLocale({
												amount: subtotal,
												currency_code: cartState.currency_code,
											})}
										</span>
									</div>
									<LocalizedClientLink href="/cart" passHref>
										<Button
											className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
											size="large"
											data-testid="go-to-cart-button"
										>
											Zum Warenkorb
										</Button>
									</LocalizedClientLink>
								</div>
							</>
						) : (
							<div className="py-16 px-6">
								<div className="flex flex-col gap-6 items-center justify-center text-center">
									<div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center border border-neutral-700">
										<BsCart3 className="w-8 h-8 text-neutral-500" />
									</div>
									<div className="space-y-2">
										<h4 className="text-white font-medium">
											Ihr Warenkorb ist leer
										</h4>
										<p className="text-neutral-400 text-sm">
											Entdecken Sie unser Sortiment an Mercedes-Teilen
										</p>
									</div>
									<LocalizedClientLink href="/store">
										<Button
											onClick={close}
											className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
										>
											Produkte entdecken
										</Button>
									</LocalizedClientLink>
								</div>
							</div>
						)}
					</PopoverPanel>
				</Transition>
			</Popover>
		</div>
	);
};

export default CartDropdown;
