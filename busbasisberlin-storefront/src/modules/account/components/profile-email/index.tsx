// src/modules/account/components/profile-email/index.tsx
'use client';

import React, { useActionState, useEffect } from 'react';

import Input from '@modules/common/components/input';

import { HttpTypes } from '@medusajs/types';
import AccountInfo from '../account-info';
// import { updateCustomer } from "@lib/data/customer"

type MyInformationProps = {
	customer: HttpTypes.StoreCustomer;
};

const ProfileEmail: React.FC<MyInformationProps> = ({ customer }) => {
	const [successState, setSuccessState] = React.useState(false);

	// TODO: It seems we don't support updating emails now?
	const updateCustomerEmail = (
		_currentState: Record<string, unknown>,
		formData: FormData,
	) => {
		const customer = {
			email: formData.get('email') as string,
		};

		try {
			// await updateCustomer(customer)
			return { success: true, error: null };
		} catch (error: any) {
			return { success: false, error: error.toString() };
		}
	};

	const [state, formAction] = useActionState(updateCustomerEmail, {
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
				label="E-Mail"
				currentInfo={`${customer.email}`}
				isSuccess={successState}
				isError={!!state.error}
				errorMessage={state.error}
				clearState={clearState}
				data-testid="account-email-editor"
			>
				<div className="space-y-4">
					<Input
						label="E-Mail-Adresse"
						name="email"
						type="email"
						autoComplete="email"
						required
						defaultValue={customer.email}
						data-testid="email-input"
						className="bg-neutral-900 border-neutral-600 text-white placeholder-neutral-400 focus:border-blue-500"
					/>
					<p className="text-sm text-neutral-400">
						Hinweis: E-Mail-Änderungen sind derzeit nicht verfügbar.
					</p>
				</div>
			</AccountInfo>
		</form>
	);
};

export default ProfileEmail;
