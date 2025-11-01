import { HttpTypes } from '@medusajs/types';
import Divider from '@modules/common/components/divider';
import EmptyCartMessage from '../components/empty-cart-message';
import SignInPrompt from '../components/sign-in-prompt';
import ItemsTemplate from './items';
import Summary from './summary';

const CartTemplate = ({
	cart,
	customer,
}: {
	cart: HttpTypes.StoreCart | null;
	customer: HttpTypes.StoreCustomer | null;
}) => {
	return (
		<div className="py-12 min-h-[60vh]">
			<div className="content-container" data-testid="cart-container">
				{cart?.items?.length ? (
					<div className="grid grid-cols-1 small:grid-cols-[1fr_400px] gap-8">
						<div className="flex flex-col bg-stone-950 rounded-xl p-6 gap-y-6">
							{!customer && (
								<>
									<SignInPrompt />
									<Divider />
								</>
							)}
							<ItemsTemplate cart={cart} />
						</div>
						<div className="relative">
							<div className="flex flex-col gap-y-6 sticky top-24">
								{cart && cart.region && (
									<div className="bg-stone-950 rounded-xl p-6">
										<Summary cart={cart as any} />
									</div>
								)}
							</div>
						</div>
					</div>
				) : (
					<div className="min-h-[60vh]">
						<EmptyCartMessage />
					</div>
				)}
			</div>
		</div>
	);
};

export default CartTemplate;
