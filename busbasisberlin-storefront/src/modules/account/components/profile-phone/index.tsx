// src/modules/account/components/profile-phone/index.tsx
'use client';

import React, { useActionState, useEffect } from 'react';

import Input from '@modules/common/components/input';

import { updateCustomer } from '@lib/data/customer';
import { HttpTypes } from '@medusajs/types';
import AccountInfo from '../account-info';

type MyInformationProps = {
	customer: HttpTypes.StoreCustomer;
};

const ProfilePhone: React.FC<MyInformationProps> = ({ customer }) => {
	const [successState, setSuccessState] = React.useState(false);

	const updateCustomerPhone = async (
		_currentState: Record<string, unknown>,
		formData: FormData,
	) => {
		const customer = {
			phone: formData.get('phone') as string,
		};

		try {
			await updateCustomer(customer);
			return { success: true, error: null };
		} catch (error: any) {
			return { success: false, error: error.toString() };
		}
	};

	const [state, formAction] = useActionState(updateCustomerPhone, {
		error: false,
		success: false,
	});

	const clearState = () => {
		setSuccessState(false);
	};

	useEffect(() => {
		setSuccessState(state.success);
	}, [state]);

	return (
		<form action={formAction} className="w-full">
			<AccountInfo
				label="Telefon"
				currentInfo={customer.phone || 'Nicht angegeben'}
				isSuccess={successState}
				isError={!!state.error}
				errorMessage={state.error}
				clearState={clearState}
				data-testid="account-phone-editor"
			>
				<div className="space-y-4">
					<Input
						label="Telefonnummer"
						name="phone"
						type="tel"
						autoComplete="tel"
						placeholder="+49 123 456789"
						defaultValue={customer.phone ?? ''}
						data-testid="phone-input"
						className="bg-neutral-900 border-neutral-600 text-white placeholder-neutral-400 focus:border-blue-500"
					/>
					<p className="text-sm text-neutral-400">
						Ihre Telefonnummer wird für Lieferbenachrichtigungen verwendet.
					</p>
				</div>
			</AccountInfo>
		</form>
	);
};

export default ProfilePhone;
